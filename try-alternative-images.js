import databaseService from './services/databaseService.js'

/**
 * Try different image names for the remaining items
 */
async function tryAlternativeImages() {
  await databaseService.init()
  console.log('🔍 Trying alternative image names...')

  const itemsToTry = [
    // Magic carpet alternatives
    { id: 5614, name: "Magic carpet (animation item)", images: [
      "Magic_carpet.gif",
      "Magic_carpet_item.png", 
      "Carpet.png",
      "Flying_carpet.png"
    ]},
    
    // ??? mixture alternatives - these were shown as working URLs in the user's message
    { id: 5589, name: "??? mixture (hot)", images: [
      "Question_mark_mixture_(hot).png",
      "Poison_(hot).png",
      "Unknown_mixture_(hot).png",
      "Mystery_mixture_(hot).png"
    ]},
    { id: 5590, name: "??? mixture (warm)", images: [
      "Question_mark_mixture_(warm).png", 
      "Poison_(warm).png",
      "Unknown_mixture_(warm).png",
      "Mystery_mixture_(warm).png"
    ]},
    { id: 5591, name: "??? mixture (horrible)", images: [
      "Question_mark_mixture_(horrible).png",
      "Poison_(horrible).png", 
      "Unknown_mixture_(horrible).png",
      "Mystery_mixture_(horrible).png"
    ]}
  ]

  let totalSuccess = 0
  
  for (const item of itemsToTry) {
    console.log(`\n📥 Trying alternatives for ${item.name} (ID: ${item.id})`)
    let success = false
    
    for (const imageName of item.images) {
      if (success) break
      
      try {
        const imageUrl = `https://oldschool.runescape.wiki/images/${encodeURIComponent(imageName)}`
        console.log(`    📥 Trying: ${imageUrl}`)
        
        const response = await fetch(imageUrl)
        if (!response.ok) {
          console.log(`    ❌ Failed to download: ${response.status}`)
          continue
        }
        
        const buffer = await response.arrayBuffer()
        const iconBuffer = Buffer.from(buffer)
        
        // For GIF files, just check if it's not empty and starts with GIF header
        const isGIF = iconBuffer[0] === 0x47 && iconBuffer[1] === 0x49 && iconBuffer[2] === 0x46
        const isPNG = iconBuffer[0] === 0x89 && iconBuffer[1] === 0x50 && iconBuffer[2] === 0x4E && iconBuffer[3] === 0x47
        const isWebP = iconBuffer[0] === 0x52 && iconBuffer[1] === 0x49 && iconBuffer[2] === 0x46 && iconBuffer[3] === 0x46
        
        if (!isPNG && !isWebP && !isGIF) {
          console.log(`    ❌ Not a valid image format`)
          continue
        }
        
        // Store in database
        databaseService.db.prepare(`
          UPDATE items SET icon_data = ? WHERE id = ?
        `).run(iconBuffer, item.id)
        
        console.log(`    ✅ Successfully downloaded and stored ${iconBuffer.length} bytes (${isGIF ? 'GIF' : isPNG ? 'PNG' : 'WebP'})`)
        success = true
        totalSuccess++
        
      } catch (error) {
        console.log(`    ❌ Error downloading: ${error.message}`)
      }
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 300))
    }
    
    if (!success) {
      console.log(`    ❌ No working images found for ${item.name}`)
    }
  }

  console.log(`\n📊 Alternative search results:`)
  console.log(`   ✅ Successfully fixed: ${totalSuccess}`)
  console.log(`   ❌ Still missing: ${itemsToTry.length - totalSuccess}`)
}

tryAlternativeImages().catch(console.error)
