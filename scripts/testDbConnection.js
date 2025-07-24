#!/usr/bin/env node

import db from '../services/databaseService.js'
import OSRSDataService from '../services/osrsDataService.js'

async function testDbConnection() {
  console.log('🔍 Testing database connection and API service...')

  try {
    await db.init()
    console.log('✅ Database initialized')
    
    // Test direct database query
    const directCount = db.db.prepare('SELECT COUNT(*) as count FROM items').get()
    console.log('📊 Direct DB query - Items count:', directCount.count)
    
    // Test via OSRSDataService
    const apiResult = await OSRSDataService.getAllItems(1, 5)
    console.log('📊 API service result:')
    console.log('  Items returned:', apiResult.items.length)
    console.log('  Total in pagination:', apiResult.pagination.total)
    
    if (apiResult.items.length > 0) {
      console.log('  First item:', apiResult.items[0].name)
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error.stack)
  }
}

testDbConnection().catch(console.error)
