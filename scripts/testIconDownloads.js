import WikiLookupService from '../services/wikiLookupService.js'

async function testIconDownloads() {
  const wikiService = new WikiLookupService()
  
  console.log('🔍 Testing icon downloads for known items...')
  
  // Test direct icon downloads with known problematic URLs
  const testCases = [
    {
      name: 'Coins',
      iconUrl: 'https://oldschool.runescape.wiki/images/Coins 5.png',
      fileName: '995.png'
    },
    {
      name: 'Cannonball', 
      iconUrl: 'https://oldschool.runescape.wiki/images/Cannonball.png',
      fileName: '2.png'
    },
    {
      name: 'Ammo mould',
      iconUrl: 'https://oldschool.runescape.wiki/images/Ammo mould.png', 
      fileName: '4.png'
    }
  ]
  
  for (const testCase of testCases) {
    console.log(`\n🧪 Testing icon download: ${testCase.name}`)
    console.log(`📥 Original URL: ${testCase.iconUrl}`)
    console.log(`💾 Target file: ${testCase.fileName}`)
    
    try {
      const result = await wikiService.downloadIcon(testCase.iconUrl, testCase.fileName)
      if (result) {
        console.log(`✅ Download successful: ${result}`)
      } else {
        console.log(`❌ Download failed`)
      }
    } catch (error) {
      console.error(`💥 Error: ${error.message}`)
    }
    
    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, 3000))
  }
  
  console.log('\n🏁 Icon download testing complete!')
}

testIconDownloads()
