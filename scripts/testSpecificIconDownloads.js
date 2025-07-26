import WikiLookupService from '../services/wikiLookupService.js'

async function testSpecificIconDownloads() {
  const wikiService = new WikiLookupService()
  
  console.log('🔍 Testing specific icon downloads that might have naming challenges...')
  
  // Test cases with potential naming issues
  const testCases = [
    {
      name: 'Items with spaces',
      iconUrl: 'https://oldschool.runescape.wiki/images/Bronze_sword.png',
      fileName: 'test-bronze-sword.png'
    },
    {
      name: 'Items with numbers and spaces',
      iconUrl: 'https://oldschool.runescape.wiki/images/Coins_10000.png',
      fileName: 'test-coins-10000.png'
    },
    {
      name: 'Simulated MediaWiki mismatch',
      iconUrl: 'https://oldschool.runescape.wiki/images/Made%20up%20name.png',
      fileName: 'test-made-up.png'
    }
  ]
  
  for (const testCase of testCases) {
    console.log(`\n🧪 Testing: ${testCase.name}`)
    console.log(`📥 URL: ${testCase.iconUrl}`)
    
    try {
      const result = await wikiService.downloadIcon(testCase.iconUrl, testCase.fileName)
      if (result) {
        console.log(`✅ Success: ${result}`)
      } else {
        console.log(`❌ Failed to download`)
      }
    } catch (error) {
      console.error(`💥 Error: ${error.message}`)
    }
    
    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  
  console.log('\n🏁 Specific icon download testing complete!')
}

testSpecificIconDownloads()
