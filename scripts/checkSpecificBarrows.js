#!/usr/bin/env node

import databaseService from '../services/databaseService.js'

async function checkSpecificBarrows() {
  await databaseService.init()
  const db = databaseService.db
  
  console.log('🔍 Checking robeskirt and robetop availability:')
  
  const robeskirtWithIcons = db.prepare(`
    SELECT id, name FROM items 
    WHERE name LIKE '%robeskirt%' AND icon_data IS NOT NULL
    ORDER BY name
  `).all()
  
  const robetopWithIcons = db.prepare(`
    SELECT id, name FROM items 
    WHERE name LIKE '%robetop%' AND icon_data IS NOT NULL
    ORDER BY name
  `).all()
  
  console.log(`\n✅ Robeskirt items WITH icons: ${robeskirtWithIcons.length}`)
  robeskirtWithIcons.forEach(item => {
    console.log(`  ID ${item.id}: ${item.name}`)
  })
  
  console.log(`\n✅ Robetop items WITH icons: ${robetopWithIcons.length}`)
  robetopWithIcons.forEach(item => {
    console.log(`  ID ${item.id}: ${item.name}`)
  })
  
  // Check what we're missing
  const robeskirtMissing = db.prepare(`
    SELECT id, name FROM items 
    WHERE name LIKE '%robeskirt%' AND icon_data IS NULL
    ORDER BY name
    LIMIT 5
  `).all()
  
  const robetopMissing = db.prepare(`
    SELECT id, name FROM items 
    WHERE name LIKE '%robetop%' AND icon_data IS NULL
    ORDER BY name
    LIMIT 5
  `).all()
  
  console.log(`\n❌ Robeskirt items WITHOUT icons: ${robeskirtMissing.length} shown`)
  robeskirtMissing.forEach(item => {
    console.log(`  ID ${item.id}: ${item.name}`)
  })
  
  console.log(`\n❌ Robetop items WITHOUT icons: ${robetopMissing.length} shown`)
  robetopMissing.forEach(item => {
    console.log(`  ID ${item.id}: ${item.name}`)
  })
}

checkSpecificBarrows().catch(console.error)
