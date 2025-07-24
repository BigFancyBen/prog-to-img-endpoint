#!/usr/bin/env node

import OSRSWikiScraperOptimized from './wikiScraperOptimized.js'

async function main() {
  console.log('🎮 OSRS Data Fetcher (Test Mode)')
  console.log('=================================')
  console.log('')
  console.log('Running in test mode - processing first 5 pages only')
  console.log('')
  
  try {
    const scraper = new OSRSWikiScraperOptimized({
      concurrency: 3,     // Lower concurrency for testing
      batchSize: 5,       // Smaller batch size
      testMode: true      // Enable test mode
    })
    
    // Override the scrapeItemsOptimized to limit pages for testing
    const originalMethod = scraper.scrapeItemsOptimized
    scraper.scrapeItemsOptimized = async function() {
      console.log('🧪 TEST MODE: Processing only first 5 item pages')
      
      await this.initDirectories()
      await this.loadCheckpoint()
      
      // Get just a few pages for testing
      const pageTitles = ['Abyssal whip', 'Dragon scimitar', 'Rune platebody', 'Fire rune', 'Lobster']
      console.log(`📝 Testing with ${pageTitles.length} sample pages`)
      
      for (const pageTitle of pageTitles) {
        console.log(`🔄 Processing: ${pageTitle}`)
        try {
          const result = await this.processItemPage(pageTitle)
          if (result) {
            await this.appendToStream(result, 'items')
            this.stats.itemsProcessed++
            console.log(`✅ Processed: ${result.name} (ID: ${result.id})`)
          } else {
            console.log(`⚠️  No data extracted for: ${pageTitle}`)
          }
        } catch (error) {
          console.error(`❌ Error processing ${pageTitle}:`, error.message)
        }
      }
      
      console.log(`✅ Test completed: ${this.stats.itemsProcessed} items processed`)
    }
    
    await scraper.run()
    
    console.log('')
    console.log('🎉 Test completed successfully!')
    console.log('📁 Check data/streaming/ for test results')
    
  } catch (error) {
    console.error('')
    console.error('❌ Test failed:', error.message)
    console.error('Full error:', error)
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('❌ Unhandled error in test:')
  console.error(error)
  process.exit(1)
})
