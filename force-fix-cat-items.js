import databaseService from './services/databaseService.js'

/**
 * Force fix specific items that need icons
 */
async function forceFixSpecificItems() {
  await databaseService.init()
  console.log('🎯 Force fixing specific items...')

  // Items to force fix
  const itemsToFix = [
    // Cat family items
    { id: 1555, name: "Kitten (grey and black)", image: "Kitten_(grey_and_black).png" },
    { id: 1556, name: "Kitten (white)", image: "Kitten_(white).png" },
    { id: 1557, name: "Kitten (brown)", image: "Kitten_(brown).png" },
    { id: 1558, name: "Kitten (black)", image: "Kitten_(black).png" },
    { id: 1559, name: "Kitten (grey and brown)", image: "Kitten_(grey_and_brown).png" },
    { id: 1560, name: "Kitten (grey and blue)", image: "Kitten_(grey_and_blue).png" },
    { id: 1561, name: "Cat (grey and black)", image: "Cat_(grey_and_black).png" },
    { id: 1562, name: "Cat (white)", image: "Cat_(white).png" },
    { id: 1563, name: "Cat (brown)", image: "Cat_(brown).png" },
    { id: 1564, name: "Cat (black)", image: "Cat_(black).png" },
    { id: 1565, name: "Cat (grey and brown)", image: "Cat_(grey_and_brown).png" },
    { id: 1566, name: "Cat (grey and blue)", image: "Cat_(grey_and_blue).png" },
    { id: 1567, name: "Overgrown cat (grey and black)", image: "Overgrown_cat_(grey_and_black).png" },
    { id: 1568, name: "Overgrown cat (white)", image: "Overgrown_cat_(white).png" },
    { id: 1569, name: "Overgrown cat (brown)", image: "Overgrown_cat_(brown).png" },
    { id: 1570, name: "Overgrown cat (black)", image: "Overgrown_cat_(black).png" },
    { id: 1571, name: "Overgrown cat (grey and brown)", image: "Overgrown_cat_(grey_and_brown).png" },
    { id: 1572, name: "Overgrown cat (grey and blue)", image: "Overgrown_cat_(grey_and_blue).png" },
    
    // Other items mentioned
    { id: 5614, name: "Magic carpet (animation item)", image: "Magic_carpet.png" },
    { id: 8470, name: "Rune heraldic helm (Dragon)", image: "Rune_heraldic_helm_(Dragon).png" },
    
    // ??? mixture items with correct names
    { id: 5589, name: "??? mixture", image: "Question_mark_mixture_(hot).png" },
    { id: 5590, name: "??? mixture", image: "Question_mark_mixture_(warm).png" },
    { id: 5591, name: "??? mixture", image: "Question_mark_mixture_(horrible).png" }
  ]

  let successCount = 0
  let failedCount = 0

  for (const item of itemsToFix) {
    console.log(`\n📥 Fixing ${item.name} (ID: ${item.id})`)
    
    try {
      const imageUrl = `https://oldschool.runescape.wiki/images/${encodeURIComponent(item.image)}`
      console.log(`    📥 Trying: ${imageUrl}`)
      
      const response = await fetch(imageUrl)
      if (!response.ok) {
        console.log(`    ❌ Failed to download: ${response.status}`)
        failedCount++
        continue
      }
      
      const buffer = await response.arrayBuffer()
      const iconBuffer = Buffer.from(buffer)
      
      // Validate it's a real image
      const isPNG = iconBuffer[0] === 0x89 && iconBuffer[1] === 0x50 && iconBuffer[2] === 0x4E && iconBuffer[3] === 0x47
      const isWebP = iconBuffer[0] === 0x52 && iconBuffer[1] === 0x49 && iconBuffer[2] === 0x46 && iconBuffer[3] === 0x46
      
      if (!isPNG && !isWebP) {
        console.log(`    ❌ Not a valid image format`)
        failedCount++
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
      failedCount++
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  console.log(`\n📊 Results:`)
  console.log(`   ✅ Successfully fixed: ${successCount}`)
  console.log(`   ❌ Failed to fix: ${failedCount}`)
  console.log(`   📈 Success rate: ${(successCount / itemsToFix.length * 100).toFixed(1)}%`)
}

forceFixSpecificItems().catch(console.error)
