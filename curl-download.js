import databaseService from './services/databaseService.js'
import { readdir, stat } from 'fs/promises'
import { join } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

async function downloadWithCurl() {
  console.log('🔍 Finding items missing icons...')
  
  await databaseService.init()
  const db = databaseService.db
  
  // Get all items from database
  const allItems = db.prepare('SELECT id, name FROM items WHERE icon_path IS NOT NULL').all()
  console.log(`📊 Found ${allItems.length} items in database`)
  
  // Get list of existing valid icon files
  const iconFiles = await readdir(join(process.cwd(), 'icons/items'))
  const validIconIds = new Set()
  
  for (const file of iconFiles) {
    if (file.endsWith('.png')) {
      const filePath = join(process.cwd(), 'icons/items', file)
      try {
        const stats = await stat(filePath)
        if (stats.size > 0) {
          const id = parseInt(file.replace('.png', ''))
          if (!isNaN(id)) {
            validIconIds.add(id)
          }
        }
      } catch (error) {
        // File doesn't exist or can't be read
      }
    }
  }
  
  console.log(`📁 Found ${validIconIds.size} valid icon files`)
  
  // Find items missing icons
  const itemsMissingIcons = allItems.filter(item => !validIconIds.has(item.id))
  console.log(`❌ Found ${itemsMissingIcons.length} items missing icons`)
  
  if (itemsMissingIcons.length === 0) {
    console.log('✅ All items have valid icons!')
    await databaseService.close()
    return
  }
  
  // Download using curl for the missing ones
  let successCount = 0
  let errorCount = 0
  
  console.log(`\n📥 Downloading icons using curl...`)
  
  for (const item of itemsMissingIcons.slice(0, 10)) { // Process first 10
    try {
      console.log(`\n📥 [${successCount + errorCount + 1}] Downloading icon for ${item.id}: ${item.name}`)
      
      // Try different URL formats
      const urls = [
        `https://oldschool.runescape.wiki/images/${item.name.replace(/'/g, '%27').replace(/ /g, '_')}.png`,
        `https://oldschool.runescape.wiki/images/${item.name.replace(/'/g, '').replace(/ /g, '_')}.png`,
        `https://oldschool.runescape.wiki/images/${item.name.replace(/ /g, '_')}.png`
      ]
      
      let downloaded = false
      for (const url of urls) {
        try {
          console.log(`  Trying: ${url}`)
          const { stdout, stderr } = await execAsync(`curl -f -s "${url}" -o "icons/items/${item.id}.png"`)
          
          // Check if file was downloaded and has content
          const stats = await stat(`icons/items/${item.id}.png`)
          if (stats.size > 0) {
            console.log(`✅ Downloaded ${stats.size} bytes for ${item.id}`)
            downloaded = true
            break
          } else {
            console.log(`⚠️  Downloaded 0 bytes, trying next URL...`)
          }
        } catch (error) {
          console.log(`⚠️  Failed: ${error.message.split('\n')[0]}`)
        }
      }
      
      if (downloaded) {
        successCount++
      } else {
        errorCount++
        console.warn(`❌ Failed to download icon for ${item.id}: ${item.name}`)
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${item.id}: ${item.name}`, error.message)
      errorCount++
    }
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  console.log(`\n🎉 Download complete:`)
  console.log(`  - Successfully downloaded: ${successCount} icons`)
  console.log(`  - Errors: ${errorCount} icons`)
  
  await databaseService.close()
}

downloadWithCurl()
