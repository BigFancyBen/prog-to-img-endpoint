import databaseService from './services/databaseService.js'
import WikiLookupService from './services/wikiLookupService.js'
import { readdir, stat } from 'fs/promises'
import { join } from 'path'

async function backfillMissingImages() {
  console.log('🔍 Finding items with missing or corrupted images...')
  
  await databaseService.init()
  const db = databaseService.db
  
  // Get all items from database
  const allItems = db.prepare('SELECT id, name, icon_path FROM items WHERE icon_path IS NOT NULL').all()
  console.log(`📊 Found ${allItems.length} items with icon_path in database`)
  
  // Get list of existing icon files (non-zero size)
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
        } else {
          console.log(`⚠️  Found 0-byte file: ${file}`)
        }
      } catch (error) {
        console.warn(`Error checking ${file}:`, error.message)
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
  
  // Show first 10 items missing icons
  console.log('Items missing icons:')
  itemsMissingIcons.slice(0, 10).forEach(item => {
    console.log(`  - ${item.id}: ${item.name}`)
  })
  if (itemsMissingIcons.length > 10) {
    console.log(`  ... and ${itemsMissingIcons.length - 10} more`)
  }
  
  // Download missing icons
  const wikiLookup = new WikiLookupService()
  let successCount = 0
  let errorCount = 0
  
  // Process in batches to avoid overwhelming the wiki
  const batchSize = 20
  const itemsToProcess = itemsMissingIcons.slice(0, batchSize)
  console.log(`\n📥 Processing ${itemsToProcess.length} items...`)
  
  for (const item of itemsToProcess) {
    try {
      console.log(`\n📥 [${successCount + errorCount + 1}/${itemsToProcess.length}] Downloading icon for ${item.id}: ${item.name}`)
      
      // Try multiple icon URL formats
      const iconUrls = [
        `https://oldschool.runescape.wiki/images/${item.name.replace(/'/g, '%27').replace(/ /g, '_')}.png`,
        `https://oldschool.runescape.wiki/images/${item.name.replace(/'/g, '').replace(/ /g, '_')}.png`,
        `https://oldschool.runescape.wiki/images/${item.name.replace(/ /g, '_')}.png`,
        `https://oldschool.runescape.wiki/images/${item.icon_path}` // Try the stored icon_path
      ]
      
      let downloadSuccess = false
      for (const iconUrl of iconUrls) {
        console.log(`  Trying: ${iconUrl}`)
        const result = await wikiLookup.downloadIcon(iconUrl, `${item.id}.png`)
        if (result) {
          console.log(`✅ Downloaded icon from: ${iconUrl}`)
          downloadSuccess = true
          break
        }
      }
      
      if (downloadSuccess) {
        successCount++
      } else {
        console.warn(`⚠️  Failed to download icon for ${item.id}: ${item.name}`)
        errorCount++
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${item.id}: ${item.name}`, error.message)
      errorCount++
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  
  console.log(`\n🎉 Backfill complete:`)
  console.log(`  - Successfully downloaded: ${successCount} icons`)
  console.log(`  - Errors: ${errorCount} icons`)
  console.log(`  - Remaining items needing icons: ${itemsMissingIcons.length - itemsToProcess.length}`)
  
  if (itemsMissingIcons.length > itemsToProcess.length) {
    console.log(`\n💡 Run the script again to process more items`)
  }
  
  await databaseService.close()
}

backfillMissingImages()
