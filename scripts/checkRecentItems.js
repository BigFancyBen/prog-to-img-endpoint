import databaseService from '../services/databaseService.js'

async function checkRecentItems() {
  try {
    await databaseService.init()
    const db = databaseService.db
    
    // Check total count
    const totalCount = db.prepare('SELECT COUNT(*) as count FROM items').get()
    console.log(`📊 Total items in database: ${totalCount.count}`)
    
    // Check specific items we know we added
    const testIds = [12, 21, 22, 26, 27, 30, 32, 33, 35, 36, 38, 39, 43, 47, 52, 87, 88, 89, 90, 103, 107, 109, 113, 115, 117, 119]
    
    console.log(`\n🔍 Checking for ${testIds.length} recently processed items:`)
    
    testIds.forEach(id => {
      const item = db.prepare('SELECT id, name, icon_path FROM items WHERE id = ?').get(id)
      if (item) {
        console.log(`  ✅ ${item.id}: ${item.name} [icon: ${item.icon_path || 'none'}]`)
      } else {
        console.log(`  ❌ ${id}: NOT FOUND`)
      }
    })
    
    // Check latest additions by looking at the highest IDs we just added
    const latestItems = db.prepare(`
      SELECT id, name, icon_path 
      FROM items 
      WHERE id IN (${testIds.join(',')})
      ORDER BY id
    `).all()
    
    console.log(`\n📈 Found ${latestItems.length} out of ${testIds.length} test items in database`)
    
  } catch (error) {
    console.error('❌ Error checking items:', error)
  } finally {
    await databaseService.close()
  }
}

checkRecentItems()
