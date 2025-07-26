import WikiLookupService from '../services/wikiLookupService.js'

async function debugDownloadIconMethod() {
  const wikiService = new WikiLookupService()
  
  console.log('🔍 Testing downloadIcon method directly...')
  
  // Test with the exact iconUrl that would be generated
  const iconUrl = 'https://oldschool.runescape.wiki/images/Defence%20potion(1).png'
  const fileName = 'debug-defence-1.png'
  
  console.log(`📥 Testing downloadIcon with:`)
  console.log(`  iconUrl: ${iconUrl}`)
  console.log(`  fileName: ${fileName}`)
  
  try {
    const result = await wikiService.downloadIcon(iconUrl, fileName)
    console.log(`📊 Result: ${result}`)
    
    // Check file size
    const fs = await import('fs/promises')
    try {
      const stats = await fs.stat(`icons/items/${fileName}`)
      console.log(`📏 File size: ${stats.size} bytes`)
    } catch (e) {
      console.log(`❌ File not found`)
    }
    
  } catch (error) {
    console.error(`💥 Error: ${error.message}`)
  }
}

debugDownloadIconMethod()
