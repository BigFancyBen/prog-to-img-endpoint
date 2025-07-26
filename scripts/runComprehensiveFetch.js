#!/usr/bin/env node

import ComprehensiveItemFetcher from './comprehensiveItemFetcher.js'

async function main() {
  console.log('🔍 OSRS Comprehensive Item Scanner')
  console.log('==================================')
  console.log('')
  console.log('This script scans for missing items by ID range (1-30,000+)')
  console.log('Use this to fill gaps after running the main fetch-data script.')
  console.log('')
  console.log('Features:')
  console.log('✅ ID range scanning (comprehensive coverage)')
  console.log('✅ Skips existing items (efficient)')
  console.log('✅ Batch processing with rate limiting')
  console.log('✅ Progress tracking and statistics')
  console.log('✅ Icon downloading and caching')
  console.log('')
  console.log('Estimated time: 10-20 minutes for full scan')
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
      rl.question('Do you want to continue with comprehensive scanning? (y/N): ', resolve)
    })
  } catch (error) {
    console.log('⚠️  Unable to read input, assuming "no"')
    answer = 'n'
  }
  
  rl.close()
  
  if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
    console.log('❌ Comprehensive scanning cancelled.')
    process.exit(0)
  }
  
  console.log('')
  console.log('🚀 Starting comprehensive item scanning...')
  console.log('')
  
  try {
    const fetcher = new ComprehensiveItemFetcher()
    await fetcher.run()
    
    console.log('')
    console.log('🎉 Comprehensive scanning completed successfully!')
    console.log('📊 Database now has maximum item coverage')
    console.log('💾 Data stored in SQLite database: data/osrs.db')
    console.log('📁 Icons cached in: icons/items/')
    
  } catch (error) {
    console.error('')
    console.error('❌ Comprehensive scanning failed:', error.message)
    console.error('')
    console.error('You can run this script again to retry.')
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
  console.log('💾 You can resume by running the script again')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('')
  console.log('⚠️  Process terminated')
  console.log('💾 You can resume by running the script again')
  process.exit(0)
})

main().catch((error) => {
  console.error('❌ Unhandled error in main:')
  console.error(error)
  process.exit(1)
})
