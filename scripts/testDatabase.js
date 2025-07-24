#!/usr/bin/env node

import databaseService from '../services/databaseService.js'

async function testDatabase() {
  try {
    console.log('🔧 Testing SQLite database...')
    
    // Initialize database
    await databaseService.init()
    console.log('✅ Database initialized successfully')
    
    // Get initial stats
    const stats = databaseService.getStats()
    console.log('📊 Initial database stats:', stats)
    
    // Test inserting a sample item
    const sampleItem = {
      id: 999999,
      name: 'Test Item',
      examine: 'This is a test item',
      wiki_name: 'Test Item',
      wiki_url: 'https://example.com',
      icon_path: '/path/to/icon.png',
      icon_url: 'https://example.com/icon.png',
      members: true,
      tradeable: true,
      tradeable_on_ge: false,
      stackable: false,
      noted: false,
      noteable: true,
      weight: 1.0,
      buy_limit: 100,
      quest_item: false,
      release_date: '2025-01-01',
      duplicate: false,
      equipable: false,
      equipable_by_player: false,
      equipable_weapon: false,
      cost: 1000,
      lowalch: 100,
      highalch: 150,
      destruction: 'Are you sure?'
    }
    
    console.log('💾 Inserting test item...')
    databaseService.insertItem(sampleItem)
    console.log('✅ Test item inserted')
    
    // Retrieve the item
    console.log('📖 Retrieving test item...')
    const retrievedItem = databaseService.getItemById(999999)
    console.log('✅ Retrieved item:', retrievedItem.name)
    
    // Search for items
    console.log('🔍 Searching for items...')
    const searchResults = databaseService.searchItems('test', 5)
    console.log(`✅ Found ${searchResults.length} items matching "test"`)
    
    // Get updated stats
    const newStats = databaseService.getStats()
    console.log('📊 Updated database stats:', newStats)
    
    // Clean up test data
    console.log('🧹 Cleaning up test data...')
    databaseService.db.prepare('DELETE FROM items WHERE id = ?').run(999999)
    console.log('✅ Test data cleaned up')
    
    databaseService.close()
    console.log('✅ Database test completed successfully!')
    
  } catch (error) {
    console.error('❌ Database test failed:', error)
    process.exit(1)
  }
}

testDatabase()
