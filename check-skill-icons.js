#!/usr/bin/env node

import databaseService from './services/databaseService.js'

console.log('🔍 Checking skill icons in database...')

try {
  await databaseService.init()
  const db = databaseService.db
  
  // Check for items with negative IDs (skill icons)
  const skillItems = db.prepare('SELECT id, name, length(icon_data) as icon_size FROM items WHERE id < 0 ORDER BY id').all()
  
  console.log(`📊 Found ${skillItems.length} skill items in database:`)
  skillItems.forEach(item => {
    console.log(`  ID ${item.id}: ${item.name} (${item.icon_size} bytes)`)
  })
  
  // Check for specific skill names
  const skillNames = ['attack', 'defence', 'strength', 'hitpoints', 'ranged', 'prayer', 'magic', 'cooking', 'woodcutting', 'fletching', 'fishing', 'firemaking', 'crafting', 'smithing', 'mining', 'herblore', 'agility', 'thieving', 'slayer', 'farming', 'runecraft', 'hunter', 'construction']
  
  console.log('\n🎯 Checking for skill icons by name:')
  for (const skill of skillNames) {
    const items = db.prepare(`
      SELECT id, name, length(icon_data) as icon_size 
      FROM items 
      WHERE name LIKE ? OR name LIKE ? OR name LIKE ?
      ORDER BY id
    `).all(`%${skill}%`, `${skill}%`, `%${skill} icon%`)
    
    if (items.length > 0) {
      console.log(`  ${skill}:`)
      items.forEach(item => {
        console.log(`    ID ${item.id}: ${item.name} (${item.icon_size} bytes)`)
      })
    } else {
      console.log(`  ${skill}: ❌ No icons found`)
    }
  }
  
} catch (error) {
  console.error('❌ Error:', error.message)
} finally {
  process.exit(0)
}
