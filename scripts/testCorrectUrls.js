import WikiLookupService from '../services/wikiLookupService.js'

async function testCorrectUrls() {
  const wikiService = new WikiLookupService()
  
  console.log('🔍 Testing corrected icon URLs...')
  
  // Test the corrected URLs
  const testCases = [
    {
      name: 'Strength potion(1)',
      url: 'https://oldschool.runescape.wiki/images/Strength%20potion(1).png',
      filename: 'test-strength-1.png'
    },
    {
      name: 'Strength potion(4)',
      url: 'https://oldschool.runescape.wiki/images/Strength%20potion(4).png',
      filename: 'test-strength-4.png'
    }
  ]
  
  for (const testCase of testCases) {
    console.log(`\n🧪 Testing: ${testCase.name}`)
    console.log(`📥 URL: ${testCase.url}`)
    
    try {
      const result = await wikiService.downloadIcon(testCase.url, testCase.filename)
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
  
  console.log('\n🏁 URL testing complete!')
}

testCorrectUrls()
