#!/usr/bin/env node

import ResilientOSRSDataFetcher from './fetchCompleteOSRSData.js'

async function main() {
  console.log('🎮 OSRS Data Fetcher')
  console.log('====================')
  console.log('')
  console.log('This script will download and process the complete OSRS dataset from osrsbox-db.')
  console.log('The process is resilient and can be safely interrupted and resumed.')
  console.log('')
  console.log('Features:')
  console.log('✅ Incremental downloads with progress tracking')
  console.log('✅ Checkpoint system for resuming interrupted downloads')
  console.log('✅ Fallback data for critical datasets')
  console.log('✅ Comprehensive search indexes')
  console.log('✅ Detailed statistics and reporting')
  console.log('')
  console.log('Estimated time: 5-15 minutes depending on your connection')
  console.log('Estimated data size: ~67MB total')
  console.log('')
  
  // Check if user wants to continue
  const readline = await import('readline')
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  
  const answer = await new Promise((resolve) => {
    rl.question('Do you want to continue? (y/N): ', resolve)
  })
  
  rl.close()
  
  if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
    console.log('❌ Data fetching cancelled.')
    process.exit(0)
  }
  
  console.log('')
  console.log('🚀 Starting data fetch...')
  console.log('')
  
  try {
    const fetcher = new ResilientOSRSDataFetcher()
    await fetcher.run()
    
    console.log('')
    console.log('🎉 Data fetching completed successfully!')
    console.log('🌐 You can now start your server with: npm run dev')
    
  } catch (error) {
    console.error('')
    console.error('❌ Data fetching failed:', error.message)
    console.error('')
    console.error('The process can be resumed by running this script again.')
    console.error('Checkpoint data has been saved.')
    process.exit(1)
  }
}

// Handle process interruption gracefully
process.on('SIGINT', () => {
  console.log('')
  console.log('⚠️  Process interrupted by user')
  console.log('💾 Checkpoint saved - you can resume by running the script again')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('')
  console.log('⚠️  Process terminated')
  console.log('💾 Checkpoint saved - you can resume by running the script again')
  process.exit(0)
})

main().catch(console.error) 