import databaseService from '../services/databaseService.js'

async function testDatabaseInit() {
  try {
    console.log('Testing database initialization...')
    await databaseService.init()
    console.log('✅ Database initialized successfully')
    
    // Test query
    const db = databaseService.db
    const count = db.prepare('SELECT COUNT(*) as count FROM items').get()
    console.log(`📊 Current database has ${count.count} items`)
    
    await databaseService.close()
    console.log('✅ Database closed successfully')
    
  } catch (error) {
    console.error('❌ Database test failed:', error)
  }
}

testDatabaseInit()
