import databaseService from './services/databaseService.js'
import { stat } from 'fs/promises'

async function checkBarrowsItems() {
  await databaseService.init()
  const db = databaseService.db
  
  // Search for Barrows items
  const barrowsItems = db.prepare(`
    SELECT id, name, icon_path 
    FROM items 
    WHERE name LIKE '%Ahrim%' 
    OR name LIKE '%Torag%' 
    OR name LIKE '%Karil%' 
    OR name LIKE '%Guthan%' 
    OR name LIKE '%Dharok%'
    OR name LIKE '%Verac%'
    ORDER BY name
  `).all()
  
  console.log(`🔍 Found ${barrowsItems.length} Barrows items in database`)
  
  // Group by set
  const sets = {}
  barrowsItems.forEach(item => {
    const setName = item.name.split("'s")[0] + "'s"
    if (!sets[setName]) sets[setName] = []
    sets[setName].push(item)
  })
  
  console.log(`\n📊 Barrows sets found: ${Object.keys(sets).length}`)
  
  for (const [setName, items] of Object.entries(sets)) {
    console.log(`\n${setName} (${items.length} items):`)
    
    let missingIcons = 0
    for (const item of items) {
      try {
        const stats = await stat(`icons/items/${item.id}.png`)
        const status = stats.size > 0 ? '✅' : '❌ (0 bytes)'
        console.log(`  - ${item.id}: ${item.name} ${status}`)
        if (stats.size === 0) missingIcons++
      } catch (error) {
        console.log(`  - ${item.id}: ${item.name} ❌ (missing file)`)
        missingIcons++
      }
    }
    
    if (missingIcons > 0) {
      console.log(`  ⚠️  ${missingIcons} items missing valid icons`)
    }
  }
  
  await databaseService.close()
}

checkBarrowsItems()
