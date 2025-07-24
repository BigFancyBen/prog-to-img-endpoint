#!/usr/bin/env node

import OSRSWikiScraperOptimized from './wikiScraperOptimized.js'
import databaseService from '../services/databaseService.js'

async function testRateLimiting() {
  try {
    console.log('🧪 Testing rate limiting behavior...')
    
    // Initialize database
    await databaseService.init()
    
    // Create scraper with aggressive settings to trigger rate limiting
    const scraper = new OSRSWikiScraperOptimized({
      concurrency: 5,     // Start high to potentially trigger rate limits
      maxConcurrency: 8,
      batchSize: 10
    })
    
    // Test with multiple items that should trigger some rate limiting
    const testPages = [
      'Dragon dagger', 'Dragon longsword', 'Dragon scimitar', 'Dragon battleaxe',
      'Rune dagger', 'Rune longsword', 'Rune scimitar', 'Rune battleaxe',
      'Iron dagger', 'Iron longsword', 'Steel dagger', 'Steel longsword',
      'Mithril dagger', 'Mithril longsword', 'Adamant dagger', 'Adamant longsword'
    ]
    
    console.log(`📥 Testing with ${testPages.length} items to trigger rate limiting...`)
    console.log(`🚀 Starting concurrency: ${scraper.concurrency}`)
    console.log(`📈 Max concurrency: ${scraper.maxConcurrency}`)
    console.log('')
    
    let processed = 0
    const startTime = Date.now()
    
    for (const pageTitle of testPages) {
      console.log(`\n🔍 Processing: ${pageTitle} (${processed + 1}/${testPages.length})`)
      console.log(`   Current concurrency: ${scraper.concurrency}, Delay: ${scraper.currentDelay}ms`)
      
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
          console.log(`✅ Saved ${itemData.name} (ID: ${itemData.id})`)
          
          if (itemData.icon) {
            console.log(`📁 Icon: ${itemData.icon}`)
          }
        } else {
          console.log(`❌ No data extracted for ${pageTitle}`)
        }
      } catch (error) {
        console.error(`❌ Error processing ${pageTitle}:`, error.message)
      }
      
      processed++
      
      // Show current stats
      console.log(`📊 Stats: Rate limits: ${scraper.stats.rateLimitHits}, Retries: ${scraper.stats.retries}, Errors: ${scraper.consecutiveErrors}`)
      
      // Small delay between items
      await scraper.delay(scraper.currentDelay)
    }
    
    const elapsed = (Date.now() - startTime) / 1000
    const stats = databaseService.getStats()
    
    console.log('\n📊 Final Results:')
    console.log(`⏱️  Total time: ${elapsed.toFixed(1)}s`)
    console.log(`📦 Items processed: ${processed}`)
    console.log(`💾 Items in database: ${stats.items}`)
    console.log(`⚠️  Rate limit hits: ${scraper.stats.rateLimitHits}`)
    console.log(`🔄 Total retries: ${scraper.stats.retries}`)
    console.log(`🎯 Final concurrency: ${scraper.concurrency}`)
    console.log(`⏰ Final delay: ${scraper.currentDelay}ms`)
    
    databaseService.close()
    console.log('\n✅ Rate limiting test completed!')
    
  } catch (error) {
    console.error('❌ Rate limiting test failed:', error)
    process.exit(1)
  }
}

testRateLimiting()
