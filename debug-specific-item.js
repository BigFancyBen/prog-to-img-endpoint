import databaseService from './services/databaseService.js'
import fs from 'fs'

/**
 * Debug specific item to see what's happening with its icon
 */
async function debugSpecificItem() {
  try {
    console.log('🔄 Initializing database...')
    await databaseService.init()
    
    const itemId = 139 // Prayer potion(3)
    
    console.log(`🔍 Investigating item ID ${itemId}:`)
    
    // Get item data
    const item = databaseService.getItemById(itemId)
    if (item) {
      console.log(`   Name: "${item.name}"`)
      console.log(`   Icon path: ${item.icon_path || 'null'}`)
      console.log(`   Icon URL: ${item.icon_url || 'null'}`)
    } else {
      console.log(`   ❌ Item not found`)
      return
    }
    
    // Check raw icon data
    const iconBuffer = databaseService.getIconData(itemId)
    if (iconBuffer) {
      console.log(`   Icon buffer length: ${iconBuffer.length} bytes`)
      
      // Check the first few bytes in detail
      console.log(`   First 10 bytes: [${Array.from(iconBuffer.slice(0, 10)).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(', ')}]`)
      
      // Standard PNG header should be: 89 50 4E 47 0D 0A 1A 0A
      const pngHeader = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]
      const actualHeader = Array.from(iconBuffer.slice(0, 8))
      
      console.log(`   Expected PNG header: [${pngHeader.map(b => `0x${b.toString(16).padStart(2, '0')}`).join(', ')}]`)
      console.log(`   Actual header:       [${actualHeader.map(b => `0x${b.toString(16).padStart(2, '0')}`).join(', ')}]`)
      
      // Check if it's a PNG (more lenient check)
      const isPNG = iconBuffer[0] === 0x89 && iconBuffer[1] === 0x50 && iconBuffer[2] === 0x4E && iconBuffer[3] === 0x47
      const hasFullPNGHeader = pngHeader.every((byte, index) => iconBuffer[index] === byte)
      
      console.log(`   Simple PNG check (first 4 bytes): ${isPNG}`)
      console.log(`   Full PNG header check: ${hasFullPNGHeader}`)
      
      // Try to save it as a file to see if it's actually valid
      const base64 = iconBuffer.toString('base64')
      console.log(`   Base64 length: ${base64.length} chars`)
      console.log(`   Base64 starts with: ${base64.substring(0, 50)}...`)
      
      // Save the raw buffer as a PNG file for inspection
      fs.writeFileSync(`debug-item-${itemId}.png`, iconBuffer)
      console.log(`   💾 Raw icon data saved as debug-item-${itemId}.png`)
      
      // Also save as base64 data URL for testing
      const dataUrl = `data:image/png;base64,${base64}`
      const htmlTest = `
        <!DOCTYPE html>
        <html>
        <head><title>Icon Test - ${item.name}</title></head>
        <body style="padding: 20px; font-family: Arial;">
          <h2>Icon Test for: ${item.name} (ID: ${itemId})</h2>
          <p>Icon size: ${iconBuffer.length} bytes</p>
          <p>Display test:</p>
          <img src="${dataUrl}" alt="${item.name}" style="border: 1px solid #ccc; max-width: 200px;">
          <p>If you can see the icon above, it's valid!</p>
        </body>
        </html>
      `
      fs.writeFileSync(`debug-item-${itemId}-test.html`, htmlTest)
      console.log(`   🌐 HTML test file saved as debug-item-${itemId}-test.html`)
      
    } else {
      console.log(`   ❌ No icon data found`)
    }
    
  } catch (error) {
    console.error('❌ Error debugging item:', error)
  }
}

// Run the debug
debugSpecificItem().catch(console.error)
