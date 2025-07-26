#!/usr/bin/env node

import OSRSWikiScraperOptimized from './wikiScraperOptimized.js'
import SmartItemFetcher from './smartItemFetcher.js'

async function main() {
  console.log('🎮 OSRS Data Fetcher (Complete Coverage)')
  console.log('========================================')
  console.log('')
  console.log('This script will download and process ALL OSRS data directly from the wiki.')
  console.log('The wiki is used as the single source of truth for all data.')
  console.log('')
  console.log('Features:')
  console.log('✅ Phase 1: Category-based scraping (existing items)')
  console.log('✅ Phase 2: Gap-filling scan (missing IDs between min/max)')
  console.log('✅ Rate limit handling with exponential backoff')
  console.log('✅ Streaming writes (no data loss on interruption)')
  console.log('✅ Real-time progress tracking')
  console.log('✅ Structured data extraction from infoboxes')
  console.log('✅ Icon downloading and caching')
  console.log('')
  console.log('Note: This process aggressively respects wiki rate limits.')
  console.log('Estimated time: 5-15 minutes for complete coverage')
  console.log('')
  
  // Check if user wants to continue
  const readline = await import('readline')
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false  // Handle non-TTY environments
  })
  
  let answer
  try {
    answer = await new Promise((resolve) => {
      rl.question('Do you want to continue? (y/N): ', resolve)
    })
  } catch (error) {
    console.log('⚠️  Unable to read input, assuming "no"')
    answer = 'n'
  }
  
  rl.close()
  
  if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
    console.log('❌ Data fetching cancelled.')
    process.exit(0)
  }
  
  console.log('')
  console.log('🚀 Starting comprehensive wiki data scraping...')
  console.log('')
  
  try {
    // Phase 1: Category-based scraping (fast, gets most items)
    console.log('📋 Phase 1: Category-based scraping')
    console.log('===================================')
    
    const scraper = new OSRSWikiScraperOptimized({
      concurrency: 2,     // Process 2 pages simultaneously (reduced for rate limits)
      batchSize: 25       // Save checkpoint every 25 items
    })
    
    await scraper.run()
    
    console.log('')
    console.log('✅ Phase 1 completed! Now starting gap-filling scan...')
    console.log('')
    
    // Phase 2: Gap-filling scan (efficient, fills missing IDs between min/max)
    console.log('🔍 Phase 2: Gap-filling scan')
    console.log('============================')
    
    const smartFetcher = new SmartItemFetcher()
    await smartFetcher.run()
    
    console.log('')
    console.log('🎉 Complete data scraping finished successfully!')
    console.log('📊 Database now has no gaps between lowest and highest IDs')
    console.log('💾 Data stored in SQLite database: data/osrs.db')
    console.log('📁 Icons cached in: icons/items/')
    console.log('🌐 You can now start your server with: npm run dev')
    
  } catch (error) {
    console.error('')
    console.error('❌ Data scraping failed:', error.message)
    console.error('')
    console.error('The process can be resumed by running this script again.')
    console.error('Progress has been saved to streaming files.')
    console.log('')
    console.error('Full error details:')
    console.error(error)
    process.exit(1)
  }
}

// Handle process interruption gracefully
process.on('SIGINT', () => {
  console.log('')
  console.log('⚠️  Process interrupted by user')
  console.log('💾 Progress saved to streaming files - you can resume by running the script again')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('')
  console.log('⚠️  Process terminated')
  console.log('💾 Progress saved to streaming files - you can resume by running the script again')
  process.exit(0)
})

main().catch((error) => {
  console.error('❌ Unhandled error in main:')
  console.error(error)
  process.exit(1)
})
