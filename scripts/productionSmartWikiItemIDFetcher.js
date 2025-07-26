import SmartWikiItemIDFetcher from './smartWikiItemIDFetcher.js'

// Production version that processes more items but not all at once
class ProductionSmartWikiItemIDFetcher extends SmartWikiItemIDFetcher {
  async findMissingItems(wikiItems, existingIDs) {
    console.log('🔍 Identifying missing items...')
    
    const missingItems = wikiItems.filter(item => !existingIDs.has(item.id))
    
    console.log(`🎯 Found ${missingItems.length} missing items out of ${wikiItems.length} total wiki items`)
    console.log(`📈 Current database coverage: ${((existingIDs.size / wikiItems.length) * 100).toFixed(1)}%`)
    
    // Sort by ID for logical processing
    missingItems.sort((a, b) => a.id - b.id)
    
    // PRODUCTION: Process first 500 items to make meaningful progress
    const productionItems = missingItems.slice(0, 500)
    console.log(`🏭 PRODUCTION MODE: Processing first ${productionItems.length} missing items`)
    console.log(`📊 This will improve coverage by ~${((productionItems.length / wikiItems.length) * 100).toFixed(1)}%`)
    
    return productionItems
  }
}

// Run production fetcher
console.log('🏭 Starting PRODUCTION SmartWikiItemIDFetcher (first 500 items)...')
const fetcher = new ProductionSmartWikiItemIDFetcher()
fetcher.run().catch(error => {
  console.error('💥 Fatal error:', error)
  process.exit(1)
})
