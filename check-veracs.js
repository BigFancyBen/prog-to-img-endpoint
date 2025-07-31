import databaseService from './services/databaseService.js'

await databaseService.init()
const db = databaseService.db

console.log('🔍 Searching for Verac\'s brassard...')

// Search for exact name first
let item = db.prepare('SELECT id, name, length(icon_data) as icon_size FROM items WHERE name = ?').get("Verac's brassard")

if (!item) {
  // Try variations
  const variations = [
    "Verac's brassard",
    "Veracs brassard", 
    "Verac brassard",
    "Verac's Brassard"
  ]
  
  for (const variation of variations) {
    item = db.prepare('SELECT id, name, length(icon_data) as icon_size FROM items WHERE name = ?').get(variation)
    if (item) {
      console.log(`Found with variation: "${variation}"`)
      break
    }
  }
}

if (!item) {
  // Search with LIKE for partial matches
  const results = db.prepare('SELECT id, name, length(icon_data) as icon_size FROM items WHERE name LIKE ? ORDER BY name').all('%verac%brassard%')
  
  if (results.length === 0) {
    console.log('❌ No Verac\'s brassard found in database')
    
    // Search more broadly for verac items
    const veracItems = db.prepare('SELECT id, name, length(icon_data) as icon_size FROM items WHERE name LIKE ? ORDER BY name').all('%verac%')
    console.log(`Found ${veracItems.length} Verac items:`)
    veracItems.slice(0, 10).forEach(item => {
      const hasIcon = item.icon_size > 0 ? '✅' : '❌'
      console.log(`  ${hasIcon} ID ${item.id}: ${item.name} (${item.icon_size || 0} bytes)`)
    })
    if (veracItems.length > 10) {
      console.log(`  ... and ${veracItems.length - 10} more`)
    }
  } else {
    console.log('Found partial matches:')
    results.forEach(item => {
      const hasIcon = item.icon_size > 0 ? '✅' : '❌'
      console.log(`  ${hasIcon} ID ${item.id}: ${item.name} (${item.icon_size || 0} bytes)`)
    })
  }
} else {
  const hasIcon = item.icon_size > 0 ? '✅' : '❌'
  console.log(`${hasIcon} ID ${item.id}: ${item.name} (${item.icon_size || 0} bytes)`)
  
  if (item.icon_size === 0 || !item.icon_size) {
    console.log('🔧 This item needs its icon fixed!')
  }
}
