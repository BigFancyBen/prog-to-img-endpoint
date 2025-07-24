#!/usr/bin/env node

import IncrementalScraper from './incrementalScraper.js'

async function main() {
  console.log('🔄 OSRS Incremental Update')
  console.log('=========================')
  console.log('')
  console.log('This script checks for new items and monsters added to the wiki')
  console.log('since the last update. It\'s much faster than a full scrape.')
  console.log('')
  console.log('This is ideal for:')
  console.log('✅ Checking for new game updates')
  console.log('✅ Weekly/monthly maintenance')
  console.log('✅ Automated scheduled updates')
  console.log('')
  console.log('Estimated time: 1-3 minutes')
  console.log('')
  
  try {
    const scraper = new IncrementalScraper()
    const results = await scraper.run()
    
    const totalNew = Object.keys(results.newItems).length + Object.keys(results.newMonsters).length
    
    if (totalNew > 0) {
      console.log('')
      console.log('🎉 Update completed successfully!')
      console.log('New data has been added to your local database.')
      
      if (Object.keys(results.newItems).length > 0) {
        console.log('')
        console.log('📦 New Items:')
        for (const item of Object.values(results.newItems)) {
          console.log(`   - ${item.name} (ID: ${item.id})`)
        }
      }
      
      if (Object.keys(results.newMonsters).length > 0) {
        console.log('')
        console.log('👹 New Monsters:')
        for (const monster of Object.values(results.newMonsters)) {
          console.log(`   - ${monster.name} (ID: ${monster.id})`)
        }
      }
    } else {
      console.log('')
      console.log('✅ No updates needed - your database is current!')
    }
    
  } catch (error) {
    console.error('')
    console.error('❌ Incremental update failed:', error.message)
    console.error('')
    console.error('You may need to run a full data fetch with: npm run fetch-data')
    process.exit(1)
  }
}

main().catch(console.error)
