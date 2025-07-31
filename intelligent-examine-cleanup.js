import databaseService from './services/databaseService.js'

await databaseService.init()

console.log('🔧 Intelligent examine text cleanup...')

// OSRS examine texts are typically under 100 characters
// Anything over 120 characters is likely an error
const MAX_REASONABLE_LENGTH = 120

// Find items with suspiciously long examine texts
const longExamines = databaseService.db.prepare(`
  SELECT id, name, examine, LENGTH(examine) as examine_length 
  FROM items 
  WHERE examine IS NOT NULL 
    AND examine != '' 
    AND LENGTH(examine) > ?
  ORDER BY LENGTH(examine) DESC
`).all(MAX_REASONABLE_LENGTH)

console.log(`📊 Found ${longExamines.length} items with suspiciously long examine texts (>${MAX_REASONABLE_LENGTH} chars)`)

let fixedCount = 0
let backupCount = 0

// Create backup column if it doesn't exist
try {
  databaseService.db.exec('ALTER TABLE items ADD COLUMN examine_original TEXT')
  console.log('✅ Created examine_original backup column')
} catch (error) {
  // Column already exists
  console.log('📝 examine_original backup column already exists')
}

longExamines.forEach((item, index) => {
  console.log(`\n${index + 1}. "${item.name}" (${item.examine_length} chars)`)
  console.log(`Current: "${item.examine}"`)
  
  let fixedExamine = item.examine
  let wasFixed = false
  
  // Strategy 1: Text up to first period (most common fix)
  const firstPeriod = item.examine.indexOf('.')
  if (firstPeriod !== -1 && firstPeriod < MAX_REASONABLE_LENGTH) {
    const periodFix = item.examine.substring(0, firstPeriod + 1)
    console.log(`Strategy 1 (first period): "${periodFix}"`)
    fixedExamine = periodFix
    wasFixed = true
  }
  
  // Strategy 2: Remove common error patterns
  else {
    // Remove common error patterns like "[sic]", "Examine text omits", etc.
    let cleaned = item.examine
      .replace(/\s*Examine text [^.]*\.\s*/gi, '') // Remove "Examine text omits..." patterns
      .replace(/\s*\[sic\]\s*/gi, '') // Remove [sic] annotations
      .replace(/\s*The correct value [^.]*\.\s*/gi, '') // Remove correction notes
      .replace(/\s*Note:[^.]*\.\s*/gi, '') // Remove notes
      .trim()
    
    // If still too long, try to find first sentence
    if (cleaned.length > MAX_REASONABLE_LENGTH) {
      const sentences = cleaned.split(/[.!?]+/)
      if (sentences.length > 1 && sentences[0].length <= MAX_REASONABLE_LENGTH) {
        cleaned = sentences[0] + '.'
      }
    }
    
    if (cleaned.length < item.examine.length && cleaned.length <= MAX_REASONABLE_LENGTH) {
      console.log(`Strategy 2 (pattern removal): "${cleaned}"`)
      fixedExamine = cleaned
      wasFixed = true
    }
  }
  
  // Strategy 3: If still too long, truncate intelligently
  if (fixedExamine.length > MAX_REASONABLE_LENGTH) {
    // Try to truncate at word boundary before MAX_REASONABLE_LENGTH
    let truncated = fixedExamine.substring(0, MAX_REASONABLE_LENGTH)
    const lastSpace = truncated.lastIndexOf(' ')
    if (lastSpace > MAX_REASONABLE_LENGTH * 0.8) { // If we can truncate at a word boundary without losing too much
      truncated = truncated.substring(0, lastSpace).trim()
    }
    
    // Add period if it doesn't end with punctuation
    if (!/[.!?]$/.test(truncated)) {
      truncated += '.'
    }
    
    console.log(`Strategy 3 (intelligent truncation): "${truncated}"`)
    fixedExamine = truncated
    wasFixed = true
  }
  
  if (wasFixed) {
    // Backup original examine text
    const backupStmt = databaseService.db.prepare('UPDATE items SET examine_original = ? WHERE id = ? AND examine_original IS NULL')
    const backupResult = backupStmt.run(item.examine, item.id)
    if (backupResult.changes > 0) {
      backupCount++
    }
    
    // Update with fixed examine text
    const updateStmt = databaseService.db.prepare('UPDATE items SET examine = ? WHERE id = ?')
    const result = updateStmt.run(fixedExamine, item.id)
    
    if (result.changes > 0) {
      fixedCount++
      console.log(`✅ Fixed: ${item.examine.length} → ${fixedExamine.length} characters`)
    } else {
      console.log(`❌ Failed to update`)
    }
  } else {
    console.log(`⚠️ Could not auto-fix this item`)
  }
})

console.log(`\n🎉 Cleanup complete!`)
console.log(`📊 Items processed: ${longExamines.length}`)
console.log(`✅ Items fixed: ${fixedCount}`)
console.log(`💾 Items backed up: ${backupCount}`)

// Show new statistics
const newLongExamines = databaseService.db.prepare(`
  SELECT COUNT(*) as count 
  FROM items 
  WHERE examine IS NOT NULL 
    AND examine != '' 
    AND LENGTH(examine) > ?
`).get(MAX_REASONABLE_LENGTH)

console.log(`📈 Remaining long examines: ${newLongExamines.count}`)

if (newLongExamines.count > 0) {
  console.log(`\n🔍 Remaining problematic items:`)
  const remaining = databaseService.db.prepare(`
    SELECT id, name, examine, LENGTH(examine) as examine_length 
    FROM items 
    WHERE examine IS NOT NULL 
      AND examine != '' 
      AND LENGTH(examine) > ?
    ORDER BY LENGTH(examine) DESC
    LIMIT 5
  `).all(MAX_REASONABLE_LENGTH)
  
  remaining.forEach(item => {
    console.log(`  "${item.name}" (${item.examine_length} chars): "${item.examine.substring(0, 80)}..."`)
  })
}
