import SmartItemFetcher from './smartItemFetcher.js'

console.log('🧪 Testing Smart Item Fetcher')
console.log('=============================')

const fetcher = new SmartItemFetcher()
await fetcher.run()

console.log('✅ Test complete')
