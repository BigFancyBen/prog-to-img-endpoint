import SmartWikiItemIDFetcher from './smartWikiItemIDFetcher.js'

// Test version that processes only a small sample of missing items
class TestSmartWikiItemIDFetcher extends SmartWikiItemIDFetcher {
  async findMissingItems(wikiItems, existingIDs) {
    console.log('🔍 Identifying missing items...')
    
    const missingItems = wikiItems.filter(item => !existingIDs.has(item.id))
    
    console.log(`🎯 Found ${missingItems.length} missing items out of ${wikiItems.length} total wiki items`)
    console.log(`📈 Current database coverage: ${((existingIDs.size / wikiItems.length) * 100).toFixed(1)}%`)
    
    // Sort by ID for logical processing
    missingItems.sort((a, b) => a.id - b.id)
    
    // TEST: Only return first 10 items
    const testItems = missingItems.slice(0, 10)
    console.log(`🧪 TEST MODE: Processing only first ${testItems.length} missing items`)
    console.log('Test items:', testItems.map(item => `${item.id}: ${item.name}`))
    
    return testItems
  }
}

// Run test
console.log('🧪 Starting TEST SmartWikiItemIDFetcher (first 10 items only)...')
const fetcher = new TestSmartWikiItemIDFetcher()
fetcher.run().catch(error => {
  console.error('💥 Fatal error:', error)
  process.exit(1)
})
