import SmartWikiItemIDFetcher from './smartWikiItemIDFetcher.js'

// Extended test version that processes the first 100 missing items
class ExtendedTestWikiItemIDFetcher extends SmartWikiItemIDFetcher {
  async findMissingItems(wikiItems, existingIDs) {
    console.log('🔍 Identifying missing items...')
    
    const missingItems = wikiItems.filter(item => !existingIDs.has(item.id))
    
    console.log(`🎯 Found ${missingItems.length} missing items out of ${wikiItems.length} total wiki items`)
    console.log(`📈 Current database coverage: ${((existingIDs.size / wikiItems.length) * 100).toFixed(1)}%`)
    
    // Sort by ID for logical processing
    missingItems.sort((a, b) => a.id - b.id)
    
    // EXTENDED TEST: Return first 100 items
    const testItems = missingItems.slice(0, 100)
    console.log(`🧪 EXTENDED TEST: Processing first ${testItems.length} missing items`)
    
    return testItems
  }
}

// Run extended test
console.log('🧪 Starting EXTENDED TEST WikiItemIDFetcher (first 100 items)...')
const fetcher = new ExtendedTestWikiItemIDFetcher()
fetcher.run().catch(error => {
  console.error('💥 Fatal error:', error)
  process.exit(1)
})
