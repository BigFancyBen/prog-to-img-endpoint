#!/usr/bin/env node

import databaseService from '../services/databaseService.js'

async function checkBarrowsNames() {
  await databaseService.init()
  const db = databaseService.db
  
  console.log('🔍 Checking Barrows item names:')
  
  // Check items with icons
  console.log('\n✅ Barrows items WITH icons:')
  const withIcons = db.prepare(`
    SELECT id, name FROM items 
    WHERE (name LIKE '%Ahrim%' OR name LIKE '%Dharok%' OR name LIKE '%Guthan%' 
           OR name LIKE '%Karil%' OR name LIKE '%Torag%' OR name LIKE '%Verac%')
      AND icon_data IS NOT NULL
    ORDER BY name
    LIMIT 20
  `).all()
  
  withIcons.forEach(item => {
    console.log(`  ID ${item.id}: ${item.name}`)
  })
  
  // Check items without icons
  console.log('\n❌ Barrows items WITHOUT icons (sample):')
  const withoutIcons = db.prepare(`
    SELECT id, name FROM items 
    WHERE (name LIKE '%Ahrim%' OR name LIKE '%Dharok%' OR name LIKE '%Guthan%' 
           OR name LIKE '%Karil%' OR name LIKE '%Torag%' OR name LIKE '%Verac%')
      AND icon_data IS NULL
    ORDER BY name
    LIMIT 20
  `).all()
  
  withoutIcons.forEach(item => {
    console.log(`  ID ${item.id}: ${item.name}`)
  })
}

checkBarrowsNames().catch(console.error)
