#!/usr/bin/env node

import OSRSWikiScraperOptimized from './wikiScraperOptimized.js'

/**
 * Test script to verify icon downloading works with a small subset
 */
async function testIconDownload() {
  console.log('🧪 Testing icon download functionality...')
  
  const scraper = new OSRSWikiScraperOptimized({
    concurrency: 1 // Process one at a time for testing
  })
  
  try {
    await scraper.initDirectories()
    
    // Test with a direct page we know exists
    const testPage = 'Lobster'
    console.log(`Testing with page: ${testPage}`)
    
    const result = await scraper.processItemPage(testPage)
    
    if (result) {
      console.log('✅ Item processed:', {
        id: result.id,
        name: result.name,
        icon: result.icon
      })
      
      if (result.icon) {
        console.log(`📥 Icon should be cached as: ${result.icon}`)
      } else {
        console.log('❌ No icon processed')
      }
    } else {
      console.log('❌ Item processing failed')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

// Run the test
testIconDownload().catch(console.error)
