import WikiLookupService from './services/wikiLookupService.js'

async function testWikiLookupService() {
  try {
    console.log('Testing WikiLookupService...')
    const service = new WikiLookupService()
    
    console.log('Looking up Verac\'s brassard...')
    const result = await service.lookupItemByName("Verac's brassard")
    
    if (result) {
      console.log('✅ Found item:', result.name, '(ID:', result.id, ')')
      console.log('Item data:', JSON.stringify(result, null, 2))
    } else {
      console.log('❌ Item not found')
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
}

testWikiLookupService()
