import WikiLookupService from '../services/wikiLookupService.js'

async function simpleDownloadTest() {
  const wikiService = new WikiLookupService()
  
  console.log('🔍 Simple download test...')
  
  // Direct test with the working URL
  const workingUrl = 'https://oldschool.runescape.wiki/images/Strength_potion(1).png'
  const testFile = 'simple-test.png'
  
  console.log(`📥 Downloading from: ${workingUrl}`)
  console.log(`💾 Saving as: ${testFile}`)
  
  try {
    const result = await wikiService.downloadIconFromUrl(workingUrl, `icons/items/${testFile}`)
    console.log(`📊 Download result: ${result}`)
    
    // Check file size
    const fs = await import('fs/promises')
    try {
      const stats = await fs.stat(`icons/items/${testFile}`)
      console.log(`📏 File size: ${stats.size} bytes`)
    } catch (e) {
      console.log(`❌ File not found or error checking size`)
    }
    
  } catch (error) {
    console.error(`💥 Error: ${error.message}`)
  }
}

simpleDownloadTest()
