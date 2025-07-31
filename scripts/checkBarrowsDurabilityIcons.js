#!/usr/bin/env node

import databaseService from '../services/databaseService.js'

async function checkBarrowsDurabilityIcons() {
  await databaseService.init()
  const db = databaseService.db
  
  console.log('🛡️ Checking Barrows durability-specific icons...')
  
  // Check specific durability variants to see if they have different icons
  const testItems = [
    "Ahrim's robetop (100)",
    "Ahrim's robetop (75)", 
    "Ahrim's robetop (50)",
    "Ahrim's robetop (25)",
    "Ahrim's robetop (broken)",
    "Ahrim's robetop (undamaged)"
  ]
  
  console.log('\n📋 Barrows durability icon analysis:')
  console.log('Item Name                           | ID   | Icon Size | Icon Path')
  console.log('------------------------------------|------|-----------|------------------')
  
  for (const itemName of testItems) {
    const item = db.prepare(`
      SELECT id, name, icon_data, icon_path, LENGTH(icon_data) as icon_size
      FROM items 
      WHERE name = ?
    `).get(itemName)
    
    if (item) {
      const nameStr = item.name.substring(0, 35).padEnd(35)
      const idStr = item.id.toString().padEnd(4)
      const sizeStr = item.icon_size ? `${item.icon_size} bytes`.padEnd(9) : 'No icon'.padEnd(9)
      const pathStr = item.icon_path ? item.icon_path.split('/').pop() : 'None'
      
      console.log(`${nameStr} | ${idStr} | ${sizeStr} | ${pathStr}`)
    }
  }
  
  // Check if different durability states have different icon sizes (indicating different images)
  const durabilityIcons = db.prepare(`
    SELECT 
      name,
      LENGTH(icon_data) as icon_size,
      icon_path
    FROM items 
    WHERE name LIKE 'Ahrim''s robetop (%'
      AND icon_data IS NOT NULL
    ORDER BY 
      CASE 
        WHEN name LIKE '%(undamaged)' THEN 100
        WHEN name LIKE '%(100)' THEN 100
        WHEN name LIKE '%(75)' THEN 75  
        WHEN name LIKE '%(50)' THEN 50
        WHEN name LIKE '%(25)' THEN 25
        WHEN name LIKE '%(broken)' THEN 0
        ELSE 50
      END DESC
  `).all()
  
  console.log('\n📊 Icon size analysis (different sizes = different images):')
  const uniqueSizes = [...new Set(durabilityIcons.map(item => item.icon_size))]
  
  if (uniqueSizes.length > 1) {
    console.log(`✅ Found ${uniqueSizes.length} different icon sizes - durability variants have unique images!`)
    console.log(`   Sizes: ${uniqueSizes.join(', ')} bytes`)
  } else {
    console.log(`ℹ️  All durability variants have the same icon size (${uniqueSizes[0]} bytes) - likely sharing the same base image`)
  }
}

checkBarrowsDurabilityIcons().catch(console.error)
