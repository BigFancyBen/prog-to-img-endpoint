import WikiLookupService from '../services/wikiLookupService.js'

async function testManualUrls() {
  const wikiService = new WikiLookupService()
  
  console.log('🔍 Testing manual MediaWiki URL variations...')
  
  // Test various naming conventions for Strength potion
  const testUrls = [
    'https://oldschool.runescape.wiki/images/Strength_potion(1).png',
    'https://oldschool.runescape.wiki/images/Strength_potion_1.png', 
    'https://oldschool.runescape.wiki/images/Strength_potion_(1).png',
    'https://oldschool.runescape.wiki/images/Strength_potion.png',
    'https://oldschool.runescape.wiki/images/Strength_potion_detail.png',
    'https://oldschool.runescape.wiki/images/3/3e/Strength_potion(1).png', // MediaWiki hash format
    'https://oldschool.runescape.wiki/images/3/3e/Strength_potion_(1).png' // Hash with spaces fixed
  ]
  
  for (let i = 0; i < testUrls.length; i++) {
    const url = testUrls[i]
    console.log(`\n🧪 Testing ${i + 1}/${testUrls.length}: ${url}`)
    
    try {
      const result = await wikiService.downloadIconFromUrl(url, `test-manual-${i + 1}.png`)
      if (result) {
        console.log(`✅ SUCCESS! Working URL: ${url}`)
        break // Found working URL
      } else {
        console.log(`❌ Failed`)
      }
    } catch (error) {
      console.error(`💥 Error: ${error.message}`)
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  console.log('\n🏁 Manual URL testing complete!')
}

testManualUrls()
