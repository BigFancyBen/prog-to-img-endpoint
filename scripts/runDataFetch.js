#!/usr/bin/env node

import OSRSWikiScraperOptimized from './wikiScraperOptimized.js'

async function main() {
  console.log('🎮 OSRS Data Fetcher (Optimized)')
  console.log('=================================')
  console.log('')
  console.log('This script will download and process OSRS data directly from the wiki.')
  console.log('The wiki is used as the single source of truth for all data.')
  console.log('')
  console.log('Features:')
  console.log('✅ Concurrent processing (2 pages at once)')
  console.log('✅ Streaming writes (no data loss on interruption)')
  console.log('✅ Resume capability (checkpoint system)')
  console.log('✅ Real-time progress tracking')
  console.log('✅ Structured data extraction from infoboxes')
  console.log('✅ Comprehensive item and monster databases')
  console.log('✅ Icon downloading and caching')
  console.log('')
  console.log('Note: This process respects wiki rate limits.')
  console.log('Estimated time: 5-15 minutes depending on your connection')
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
  console.log('🚀 Starting optimized wiki data scraping...')
  console.log('')
  
  try {
    const scraper = new OSRSWikiScraperOptimized({
      concurrency: 2,     // Process 2 pages simultaneously (reduced for rate limits)
      batchSize: 25       // Save checkpoint every 25 items
    })
    
    await scraper.run()
    
    console.log('')
    console.log('🎉 Data scraping completed successfully!')
    console.log('� Data stored in SQLite database: data/osrs.db')
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
