#!/usr/bin/env node

import OSRSWikiScraperOptimized from '../scripts/wikiScraperOptimized.js'

async function testIconDownload() {
  console.log('🧪 Testing icon download with improved selection...')
  
  const scraper = new OSRSWikiScraperOptimized()
  await scraper.init()
  
  // Test a few specific items
  const testItems = [
    'Dragonstone_bolts_(e)',
    'Fire_rune',
    'Abyssal_whip'
  ]
  
  for (const itemName of testItems) {
    console.log(`\n📦 Testing ${itemName}:`)
    
    try {
      const itemData = await scraper.scrapeItemPage(itemName)
      
      if (itemData) {
        console.log(`✅ Scraped: ${itemData.name} (ID: ${itemData.id})`)
        console.log(`🖼️  Selected icon: ${itemData.icon_filename || 'NO ICON'}`)
        console.log(`📁 Local path: ${itemData.icon_path || 'NO LOCAL PATH'}`)
        
        // Check if file exists
        if (itemData.icon_path) {
          const fs = await import('fs')
          try {
            await fs.promises.access(itemData.icon_path)
            console.log(`✅ Icon file exists locally`)
          } catch {
            console.log(`❌ Icon file not found locally`)
          }
        }
      } else {
        console.log(`❌ Could not scrape ${itemName}`)
      }
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`)
    }
  }
  
  console.log('\n✅ Icon download test complete')
}

testIconDownload().catch(console.error)
