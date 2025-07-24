import { readFile, writeFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import WikiLookupService from '../services/wikiLookupService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function updateCacheWithIcons() {
  console.log('🔄 Updating existing cache with icon URLs...')
  
  const itemsFile = join(__dirname, '../data/processed/items.json')
  const wikiLookup = new WikiLookupService()
  
  try {
    // Load existing items
    const itemsData = await readFile(itemsFile, 'utf8')
    const items = JSON.parse(itemsData)
    
    console.log(`📦 Found ${Object.keys(items).length} items in cache`)
    
    let updated = 0
    let skipped = 0
    let errors = 0
    
    for (const [itemId, item] of Object.entries(items)) {
      // Skip if item already has an icon URL
      if (item.icon) {
        skipped++
        continue
      }
      
      try {
        console.log(`🔍 Looking up icon for: ${item.name} (ID: ${itemId})`)
        
        // Look up the item to get its icon
        const wikiItem = await wikiLookup.lookupItemByName(item.name)
        
        if (wikiItem && wikiItem.icon) {
          items[itemId].icon = wikiItem.icon
          updated++
          console.log(`✅ Updated icon for ${item.name}: ${wikiItem.icon}`)
        } else {
          console.log(`❌ No icon found for ${item.name}`)
          errors++
        }
        
        // Small delay to be respectful to the wiki
        await new Promise(resolve => setTimeout(resolve, 500))
        
      } catch (error) {
        console.error(`❌ Error updating ${item.name}:`, error.message)
        errors++
      }
    }
    
    // Save updated items
    await writeFile(itemsFile, JSON.stringify(items, null, 2))
    
    console.log('\n🎉 Cache update completed!')
    console.log(`✅ Updated: ${updated} items`)
    console.log(`⏭️  Skipped: ${skipped} items (already had icons)`)
    console.log(`❌ Errors: ${errors} items`)
    
  } catch (error) {
    console.error('❌ Error updating cache:', error.message)
  }
}

updateCacheWithIcons().catch(console.error)
