import SmartItemFetcher from './smartItemFetcher.js'

// Run without prompts for testing
const fetcher = new SmartItemFetcher()

// Override the run method to skip prompts
const originalRun = fetcher.run.bind(fetcher)
fetcher.run = async function() {
  console.log('🔍 Gap-Filling Item Fetcher (Test Mode)')
  console.log('======================================')
  console.log('This scans for missing IDs between your lowest and highest existing items')
  console.log('')

  await fetcher.constructor.prototype.run.call(this)
}

await fetcher.run()
