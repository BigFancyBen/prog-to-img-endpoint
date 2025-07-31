import WikiLookupService from './services/wikiLookupService.js'

const service = new WikiLookupService()

console.log('Testing WikiLookupService icon storage fix...')

try {
  const result = await service.lookupItemById(167)
  if (result) {
    console.log('✅ Test completed successfully:', result.name)
  } else {
    console.log('❌ Test failed - no result returned')
  }
} catch (error) {
  console.error('❌ Test error:', error.message)
}
