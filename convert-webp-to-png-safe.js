import databaseService from './services/databaseService.js'
import sharp from 'sharp'
import fs from 'fs'

// SAFETY FIRST: Create database backup before any changes
console.log('🛡️  SAFETY CHECK: Creating database backup...')

const backupPath = `./database-backup-${Date.now()}.db`
try {
  fs.copyFileSync('./database.db', backupPath)
  console.log(`✅ Database backed up to: ${backupPath}`)
} catch (error) {
  console.error('❌ CRITICAL: Could not create database backup!')
  console.error('Aborting operation for safety.')
  process.exit(1)
}

await databaseService.init()

// Helper function to detect image format
function detectImageFormat(buffer) {
  if (!buffer || buffer.length < 8) return 'unknown'
  
  const hex = buffer.slice(0, 8).toString('hex')
  
  if (hex.startsWith('89504e47')) return 'png'
  if (hex.startsWith('52494646')) return 'webp'  // RIFF (WebP)
  if (hex.startsWith('ffd8ff')) return 'jpeg'
  if (hex.startsWith('47494638')) return 'gif'
  
  return 'unknown'
}

// STEP 1: Analyze what we have (READ-ONLY)
console.log('\n🔍 STEP 1: Analyzing current icon formats (READ-ONLY)...')

const allItems = databaseService.db.prepare(`
  SELECT id, name, icon_data 
  FROM items 
  WHERE icon_data IS NOT NULL AND length(icon_data) > 0
  LIMIT 100
`).all()

let pngCount = 0
let webpCount = 0
let otherCount = 0
let webpItems = []

for (const item of allItems) {
  const format = detectImageFormat(item.icon_data)
  
  if (format === 'png') {
    pngCount++
  } else if (format === 'webp') {
    webpCount++
    webpItems.push({ id: item.id, name: item.name })
  } else {
    otherCount++
  }
}

console.log(`📊 Analysis results (first 100 items):`)
console.log(`  PNG: ${pngCount}`)
console.log(`  WebP: ${webpCount}`)
console.log(`  Other: ${otherCount}`)

if (webpCount === 0) {
  console.log('✅ No WebP images found in sample. Nothing to convert.')
  process.exit(0)
}

console.log(`\n🔍 Found ${webpCount} WebP images in sample:`)
webpItems.slice(0, 5).forEach(item => {
  console.log(`  - ${item.name} (ID: ${item.id})`)
})

if (webpItems.length > 5) {
  console.log(`  ... and ${webpItems.length - 5} more`)
}

// STEP 2: Test conversion on a single item (NO DATABASE CHANGES YET)
console.log('\n🧪 STEP 2: Testing WebP to PNG conversion on one item...')

const testItem = webpItems[0]
console.log(`Testing conversion on: ${testItem.name} (ID: ${testItem.id})`)

try {
  const originalData = databaseService.db.prepare('SELECT icon_data FROM items WHERE id = ?').get(testItem.id)
  
  if (!originalData || !originalData.icon_data) {
    throw new Error('Could not retrieve original icon data')
  }
  
  // Convert WebP to PNG using Sharp
  const pngBuffer = await sharp(originalData.icon_data).png().toBuffer()
  const pngBase64 = pngBuffer.toString('base64')
  
  // Validate the conversion worked
  const convertedFormat = detectImageFormat(pngBuffer)
  if (convertedFormat !== 'png') {
    throw new Error(`Conversion failed: result is ${convertedFormat}, not PNG`)
  }
  
  console.log(`✅ Test conversion successful:`)
  console.log(`  Original: WebP, ${originalData.icon_data.length} bytes`)
  console.log(`  Converted: PNG, ${pngBuffer.length} bytes`)
  console.log(`  Base64 length: ${pngBase64.length}`)
  
} catch (error) {
  console.error('❌ CRITICAL: Test conversion failed!')
  console.error('Error:', error.message)
  console.error('Aborting operation for safety.')
  process.exit(1)
}

// STEP 3: Ask for confirmation before proceeding
console.log('\n⚠️  READY TO PROCEED WITH CONVERSION')
console.log('This will convert all WebP images to PNG format in the database.')
console.log(`Backup created: ${backupPath}`)
console.log('\nTo proceed, run this script with --confirm flag:')
console.log(`node convert-webp-to-png-safe.js --confirm`)
console.log('\nOr to restore from backup if something goes wrong:')
console.log(`cp ${backupPath} database.db`)

if (!process.argv.includes('--confirm')) {
  console.log('\n🛑 Stopping here for safety. Use --confirm to proceed.')
  process.exit(0)
}

// STEP 4: Perform the actual conversion (ONLY if --confirm flag is present)
console.log('\n🔄 STEP 4: Converting all WebP images to PNG...')

// Get all WebP images
const webpImages = databaseService.db.prepare(`
  SELECT id, name, icon_data 
  FROM items 
  WHERE icon_data IS NOT NULL AND length(icon_data) > 0
`).all().filter(item => detectImageFormat(item.icon_data) === 'webp')

console.log(`Found ${webpImages.length} WebP images to convert`)

let convertedCount = 0
let errorCount = 0

const updateStmt = databaseService.db.prepare('UPDATE items SET icon_data = ? WHERE id = ?')

for (const item of webpImages) {
  try {
    // Convert WebP to PNG
    const pngBuffer = await sharp(item.icon_data).png().toBuffer()
    
    // Validate conversion
    if (detectImageFormat(pngBuffer) !== 'png') {
      throw new Error('Conversion validation failed')
    }
    
    // Update database
    updateStmt.run(pngBuffer, item.id)
    convertedCount++
    
    if (convertedCount % 100 === 0) {
      console.log(`  Converted ${convertedCount}/${webpImages.length} images...`)
    }
    
  } catch (error) {
    console.error(`❌ Failed to convert ${item.name} (ID: ${item.id}):`, error.message)
    errorCount++
  }
}

console.log(`\n✅ Conversion complete!`)
console.log(`  Successfully converted: ${convertedCount}`)
console.log(`  Errors: ${errorCount}`)

if (errorCount > 0) {
  console.log(`⚠️  ${errorCount} items failed to convert. Check logs above.`)
}

// STEP 5: Verify the conversion worked
console.log('\n🔍 STEP 5: Verifying conversion results...')

const verifyItems = databaseService.db.prepare(`
  SELECT id, name, icon_data 
  FROM items 
  WHERE icon_data IS NOT NULL AND length(icon_data) > 0
  LIMIT 100
`).all()

let finalPngCount = 0
let finalWebpCount = 0
let finalOtherCount = 0

for (const item of verifyItems) {
  const format = detectImageFormat(item.icon_data)
  
  if (format === 'png') {
    finalPngCount++
  } else if (format === 'webp') {
    finalWebpCount++
  } else {
    finalOtherCount++
  }
}

console.log(`📊 Final verification (sample of 100):`)
console.log(`  PNG: ${finalPngCount}`)
console.log(`  WebP: ${finalWebpCount}`)
console.log(`  Other: ${finalOtherCount}`)

if (finalWebpCount > 0) {
  console.log(`⚠️  Still found ${finalWebpCount} WebP images. Some conversions may have failed.`)
} else {
  console.log(`✅ All sampled images are now PNG format!`)
}

console.log(`\n🎉 Database conversion complete!`)
console.log(`Backup remains at: ${backupPath}`)
console.log(`You can delete the backup once you've verified everything works.`)

databaseService.close()
