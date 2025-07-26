import WikiItemIDFetcher from './wikiItemIDFetcher.js'

// Test version that processes only the first 20 missing items
class TestWikiItemIDFetcher extends WikiItemIDFetcher {
  async findMissingItems(wikiItems, existingIDs) {
    console.log('🔍 Identifying missing items...')
    
    const missingItems = wikiItems.filter(item => !existingIDs.has(item.id))
    
    console.log(`🎯 Found ${missingItems.length} missing items out of ${wikiItems.length} total wiki items`)
    console.log(`📈 Current database coverage: ${((existingIDs.size / wikiItems.length) * 100).toFixed(1)}%`)
    
    // Sort by ID for logical processing
    missingItems.sort((a, b) => a.id - b.id)
    
    // TEST: Only return first 20 items
    const testItems = missingItems.slice(0, 20)
    console.log(`🧪 TEST MODE: Processing only first ${testItems.length} missing items`)
    
    return testItems
  }
}

// Run test
console.log('🧪 Starting TEST WikiItemIDFetcher (first 20 items only)...')
const fetcher = new TestWikiItemIDFetcher()
fetcher.run().catch(error => {
  console.error('💥 Fatal error:', error)
  process.exit(1)
})
