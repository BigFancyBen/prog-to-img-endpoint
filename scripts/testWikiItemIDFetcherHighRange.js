import WikiItemIDFetcher from './wikiItemIDFetcher.js'

// Test version that processes items from ID range 1000-1100
class TestWikiItemIDFetcherHighRange extends WikiItemIDFetcher {
  async findMissingItems(wikiItems, existingIDs) {
    console.log('🔍 Identifying missing items...')
    
    const missingItems = wikiItems.filter(item => !existingIDs.has(item.id))
    
    console.log(`🎯 Found ${missingItems.length} missing items out of ${wikiItems.length} total wiki items`)
    console.log(`📈 Current database coverage: ${((existingIDs.size / wikiItems.length) * 100).toFixed(1)}%`)
    
    // Sort by ID for logical processing
    missingItems.sort((a, b) => a.id - b.id)
    
    // TEST: Only return items in range 1000-1100
    const testItems = missingItems.filter(item => item.id >= 1000 && item.id <= 1100)
    console.log(`🧪 TEST MODE: Processing items in range 1000-1100 (${testItems.length} items)`)
    
    return testItems
  }
}

// Run test
console.log('🧪 Starting TEST WikiItemIDFetcher (ID range 1000-1100)...')
const fetcher = new TestWikiItemIDFetcherHighRange()
fetcher.run().catch(error => {
  console.error('💥 Fatal error:', error)
  process.exit(1)
})
