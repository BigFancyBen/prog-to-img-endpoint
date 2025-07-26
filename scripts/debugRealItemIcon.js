import WikiLookupService from '../services/wikiLookupService.js'

async function debugRealItemIconExtraction() {
  const wikiService = new WikiLookupService()
  
  console.log('🔍 Testing real item icon extraction...')
  
  try {
    // Test with a simple item name that should exist
    const testName = 'Strength potion'
    console.log(`\n🧪 Looking up: ${testName}`)
    
    // Call the actual lookup method but add debugging
    const result = await wikiService.lookupItemByName(testName)
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
}

debugRealItemIconExtraction()
