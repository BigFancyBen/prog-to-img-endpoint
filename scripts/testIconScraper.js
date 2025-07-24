import OSRSWikiIconScraper from './wikiScraperWithIcons.js'

async function main() {
  try {
    console.log('🎮 Testing OSRS Wiki Icon Scraper')
    console.log('==================================')
    
    const scraper = new OSRSWikiIconScraper({ testMode: true })
    
    // Run in test mode with only 10 items to start
    await scraper.run()
    
    console.log('\n✅ Test completed successfully!')
    console.log('📁 Check icons/items/ for downloaded item icons')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    process.exit(1)
  }
}

main()
