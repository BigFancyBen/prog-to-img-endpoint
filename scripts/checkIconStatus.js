#!/usr/bin/env node

import databaseService from '../services/databaseService.js'

async function checkIconStatus() {
  console.log('📊 Icon Status Report')
  console.log('====================')
  
  await databaseService.init()
  const db = databaseService.db
  
  // Overall stats
  const totalItems = db.prepare('SELECT COUNT(*) as count FROM items').get().count
  const itemsWithIcons = db.prepare('SELECT COUNT(*) as count FROM items WHERE icon_data IS NOT NULL').get().count
  const itemsMissingIcons = totalItems - itemsWithIcons
  
  console.log(`\n📈 Overall Status:`)
  console.log(`  Total items: ${totalItems.toLocaleString()}`)
  console.log(`  Items with icons: ${itemsWithIcons.toLocaleString()} (${((itemsWithIcons/totalItems)*100).toFixed(1)}%)`)
  console.log(`  Items missing icons: ${itemsMissingIcons.toLocaleString()} (${((itemsMissingIcons/totalItems)*100).toFixed(1)}%)`)
  
  // Barrows specific check
  const barrowsTotal = db.prepare(`
    SELECT COUNT(*) as count FROM items 
    WHERE name LIKE '%Ahrim%' OR name LIKE '%Dharok%' OR name LIKE '%Guthan%' 
       OR name LIKE '%Karil%' OR name LIKE '%Torag%' OR name LIKE '%Verac%'
  `).get().count
  
  const barrowsWithIcons = db.prepare(`
    SELECT COUNT(*) as count FROM items 
    WHERE (name LIKE '%Ahrim%' OR name LIKE '%Dharok%' OR name LIKE '%Guthan%' 
           OR name LIKE '%Karil%' OR name LIKE '%Torag%' OR name LIKE '%Verac%')
      AND icon_data IS NOT NULL
  `).get().count
  
  const barrowsMissing = barrowsTotal - barrowsWithIcons
  
  console.log(`\n🛡️ Barrows Equipment Status:`)
  console.log(`  Total Barrows items: ${barrowsTotal}`)
  console.log(`  Barrows with icons: ${barrowsWithIcons} (${((barrowsWithIcons/barrowsTotal)*100).toFixed(1)}%)`)
  console.log(`  Barrows missing icons: ${barrowsMissing} (${((barrowsMissing/barrowsTotal)*100).toFixed(1)}%)`)
  
  if (barrowsMissing > 0) {
    console.log('\n📋 Barrows items still missing icons:')
    const missingBarrows = db.prepare(`
      SELECT id, name FROM items 
      WHERE (name LIKE '%Ahrim%' OR name LIKE '%Dharok%' OR name LIKE '%Guthan%' 
             OR name LIKE '%Karil%' OR name LIKE '%Torag%' OR name LIKE '%Verac%')
        AND icon_data IS NULL
      ORDER BY name
      LIMIT 10
    `).all()
    
    missingBarrows.forEach(item => {
      console.log(`    ID ${item.id}: ${item.name}`)
    })
    
    if (barrowsMissing > 10) {
      console.log(`    ... and ${barrowsMissing - 10} more`)
    }
  }
  
  // Recent progress check
  const recentlyUpdated = db.prepare(`
    SELECT COUNT(*) as count FROM items 
    WHERE icon_data IS NOT NULL 
      AND datetime(last_updated) > datetime('now', '-1 hour')
  `).get().count
  
  console.log(`\n⏰ Recent Progress (last hour):`)
  console.log(`  Icons added in last hour: ${recentlyUpdated}`)
  
  console.log('\n✅ Status check complete!')
}

checkIconStatus().catch(console.error)
