import databaseService from '../services/databaseService.js'

async function generateDatabaseReport() {
  console.log('📊 Generating comprehensive database report...')
  
  try {
    await databaseService.init()
    const db = databaseService.db
    
    // Total items
    const totalCount = db.prepare('SELECT COUNT(*) as count FROM items').get()
    console.log(`\n🎯 TOTAL ITEMS: ${totalCount.count}`)
    
    // Coverage compared to wiki
    const wikicoverage = (totalCount.count / 14615 * 100).toFixed(1)
    console.log(`📈 Wiki Coverage: ${wikicoverage}% (${totalCount.count}/14,615 from Item IDs page)`)
    
    // ID range analysis
    const minMax = db.prepare('SELECT MIN(id) as min, MAX(id) as max FROM items').get()
    console.log(`📏 ID Range: ${minMax.min} - ${minMax.max}`)
    
    // Items with icons
    const withIcons = db.prepare('SELECT COUNT(*) as count FROM items WHERE icon_path IS NOT NULL AND icon_path != \'\'').get()
    console.log(`🖼️  Items with icons: ${withIcons.count} (${(withIcons.count/totalCount.count*100).toFixed(1)}%)`)
    
    // Recent additions (from our new system)
    const recentItems = db.prepare(`
      SELECT id, name, icon_path 
      FROM items 
      WHERE id IN (2, 4, 6, 8, 10, 12, 21, 22, 26, 27)
      ORDER BY id
    `).all()
    
    console.log(`\n🆕 RECENT ADDITIONS FROM SMART FETCHER:`)
    recentItems.forEach(item => {
      console.log(`  - ${item.id}: ${item.name} ${item.icon_path ? '🖼️' : '❌'}`)
    })
    
    // Barrows status
    const barrowsCount = db.prepare(`
      SELECT COUNT(*) as count FROM items 
      WHERE name LIKE '%Ahrim%' 
      OR name LIKE '%Torag%' 
      OR name LIKE '%Karil%' 
      OR name LIKE '%Guthan%' 
      OR name LIKE '%Dharok%'
      OR name LIKE '%Verac%'
    `).get()
    console.log(`\n⚔️  BARROWS ITEMS: ${barrowsCount.count}`)
    
    // Categories by ID ranges
    console.log(`\n📊 ITEMS BY ID RANGES:`)
    const ranges = [
      { name: 'Very Early (1-100)', min: 1, max: 100 },
      { name: 'Early (101-1000)', min: 101, max: 1000 },
      { name: 'Classic (1001-5000)', min: 1001, max: 5000 },
      { name: 'Mid-game (5001-10000)', min: 5001, max: 10000 },
      { name: 'Late-game (10001-20000)', min: 10001, max: 20000 },
      { name: 'Modern (20000+)', min: 20001, max: 99999 }
    ]
    
    ranges.forEach(range => {
      const count = db.prepare('SELECT COUNT(*) as count FROM items WHERE id >= ? AND id <= ?').get(range.min, range.max)
      console.log(`  ${range.name}: ${count.count} items`)
    })
    
    // Items that need icons
    const needIcons = db.prepare('SELECT COUNT(*) as count FROM items WHERE icon_path IS NULL OR icon_path = \'\'').get()
    console.log(`\n🎨 ITEMS NEEDING ICONS: ${needIcons.count}`)
    
    console.log(`\n✅ Report complete!`)
    
  } catch (error) {
    console.error('❌ Error generating report:', error)
  } finally {
    await databaseService.close()
  }
}

generateDatabaseReport()
