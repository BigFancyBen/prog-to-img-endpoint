import databaseService from '../services/databaseService.js'

async function checkDatabaseRange() {
  await databaseService.init()
  const db = databaseService.db
  
  // Get overall stats
  const stats = db.prepare('SELECT MIN(id) as min_id, MAX(id) as max_id, COUNT(*) as total FROM items').get()
  console.log('📊 Database stats:', stats)
  
  // Check if ID 1 exists
  const id1 = db.prepare('SELECT id, name FROM items WHERE id = 1').get()
  console.log('🔍 ID 1 exists?', id1 ? `Yes: ${id1.name}` : 'No')
  
  // Get lowest IDs
  console.log('\n📉 Lowest 10 IDs:')
  const lowItems = db.prepare('SELECT id, name FROM items WHERE id <= 20 ORDER BY id').all()
  lowItems.forEach(item => console.log(`  ${item.id}: ${item.name}`))
  
  // Get highest IDs  
  console.log('\n📈 Highest 10 IDs:')
  const highItems = db.prepare('SELECT id, name FROM items ORDER BY id DESC LIMIT 10').all()
  highItems.forEach(item => console.log(`  ${item.id}: ${item.name}`))
  
  // Check for gaps in low range
  console.log('\n🔍 Checking for gaps in range 1-100:')
  const existingLowIds = new Set(db.prepare('SELECT id FROM items WHERE id BETWEEN 1 AND 100').all().map(r => r.id))
  const missingLow = []
  for (let i = 1; i <= 100; i++) {
    if (!existingLowIds.has(i)) {
      missingLow.push(i)
    }
  }
  console.log(`Missing IDs 1-100: ${missingLow.slice(0, 20).join(', ')}${missingLow.length > 20 ? '...' : ''} (${missingLow.length} total)`)
  
  await databaseService.close()
}

checkDatabaseRange().catch(console.error)
