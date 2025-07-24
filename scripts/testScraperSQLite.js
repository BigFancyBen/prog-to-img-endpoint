#!/usr/bin/env node

import OSRSWikiScraperOptimized from './wikiScraperOptimized.js'
import databaseService from '../services/databaseService.js'

async function testScraper() {
  try {
    console.log('🧪 Testing SQLite-based scraper with a few items...')
    
    // Initialize database
    await databaseService.init()
    
    // Create scraper instance
    const scraper = new OSRSWikiScraperOptimized({
      concurrency: 1,
      batchSize: 5
    })
    
    // Test with just a few specific items
    console.log('📥 Testing item extraction and icon download...')
    
    // Test with Lobster (ID 379)
    const testPages = ['Lobster', 'Fire rune', 'Abyssal whip']
    
    for (const pageTitle of testPages) {
      console.log(`\n🔍 Processing: ${pageTitle}`)
      try {
        const itemData = await scraper.processItemPage(pageTitle)
        if (itemData) {
          // Save to database
          const dbItemData = {
            ...itemData,
            icon_path: itemData.icon,
            icon_url: itemData.icon_url || null
          }
          
          databaseService.insertItem(dbItemData)
          console.log(`✅ Saved ${itemData.name} (ID: ${itemData.id}) to database`)
          
          if (itemData.icon) {
            console.log(`📁 Icon cached: ${itemData.icon}`)
          }
        } else {
          console.log(`❌ No data extracted for ${pageTitle}`)
        }
      } catch (error) {
        console.error(`❌ Error processing ${pageTitle}:`, error.message)
      }
    }
    
    // Show final stats
    const stats = databaseService.getStats()
    console.log('\n📊 Final database stats:', stats)
    
    // Test retrieval
    console.log('\n📖 Testing data retrieval...')
    const items = databaseService.getAllItems()
    for (const item of items) {
      console.log(`- ${item.name} (ID: ${item.id}) - Icon: ${item.icon_path ? '✅' : '❌'}`)
    }
    
    databaseService.close()
    console.log('\n✅ Scraper test completed!')
    
  } catch (error) {
    console.error('❌ Scraper test failed:', error)
    process.exit(1)
  }
}

testScraper()
