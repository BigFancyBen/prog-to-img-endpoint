import databaseService from './services/databaseService.js'

/**
 * Try the exact URLs provided by the user
 */
async function tryExactURLs() {
  await databaseService.init()
  console.log('🎯 Trying exact URLs provided by user...')

  const exactUrls = [
    { id: 5589, name: "??? mixture (hot)", url: "https://oldschool.runescape.wiki/images/%3F%3F%3F_mixture_%28hot%29.png?549f2" },
    { id: 5590, name: "??? mixture (warm)", url: "https://oldschool.runescape.wiki/images/%3F%3F%3F_mixture_%28warm%29.png?6d362" },
    { id: 5591, name: "??? mixture (horrible)", url: "https://oldschool.runescape.wiki/images/%3F%3F%3F_mixture_%28horrible%29.png?6d362" }
  ]

  let successCount = 0

  for (const item of exactUrls) {
    console.log(`\n📥 Trying ${item.name} (ID: ${item.id})`)
    
    try {
      console.log(`    📥 Trying: ${item.url}`)
      
      const response = await fetch(item.url)
      if (!response.ok) {
        console.log(`    ❌ Failed to download: ${response.status}`)
        continue
      }
      
      const buffer = await response.arrayBuffer()
      const iconBuffer = Buffer.from(buffer)
      
      // Validate it's a real image
      const isPNG = iconBuffer[0] === 0x89 && iconBuffer[1] === 0x50 && iconBuffer[2] === 0x4E && iconBuffer[3] === 0x47
      const isWebP = iconBuffer[0] === 0x52 && iconBuffer[1] === 0x49 && iconBuffer[2] === 0x46 && iconBuffer[3] === 0x46
      
      if (!isPNG && !isWebP) {
        console.log(`    ❌ Not a valid image format`)
        continue
      }
      
      // Store in database
      databaseService.db.prepare(`
        UPDATE items SET icon_data = ? WHERE id = ?
      `).run(iconBuffer, item.id)
      
      console.log(`    ✅ Successfully downloaded and stored ${iconBuffer.length} bytes`)
      successCount++
      
    } catch (error) {
      console.log(`    ❌ Error downloading: ${error.message}`)
    }
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  console.log(`\n📊 Results from exact URLs:`)
  console.log(`   ✅ Successfully fixed: ${successCount}`)
  console.log(`   ❌ Still missing: ${exactUrls.length - successCount}`)
}

tryExactURLs().catch(console.error)
