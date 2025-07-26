import WikiLookupService from '../services/wikiLookupService.js'

async function debugIconDownloads() {
  const wikiService = new WikiLookupService()
  
  console.log('🔍 Testing icon download for a few known items...')
  
  // Test a few simple items
  const testItems = [
    { id: 2, name: 'Cannonball' },
    { id: 4, name: 'Ammo mould' },
    { id: 995, name: 'Coins' } // This should definitely exist
  ]
  
  for (const testItem of testItems) {
    console.log(`\n🧪 Testing ${testItem.name} (ID: ${testItem.id})...`)
    
    try {
      const result = await wikiService.lookupItemByName(testItem.name)
      if (result) {
        console.log(`✅ Found item: ${result.name}`)
        console.log(`🔗 Icon path: ${result.icon_path || 'none'}`)
        console.log(`🌐 Wiki URL: ${result.wiki_url}`)
      } else {
        console.log(`❌ Item not found`)
      }
    } catch (error) {
      console.error(`💥 Error: ${error.message}`)
    }
    
    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
}

debugIconDownloads()
