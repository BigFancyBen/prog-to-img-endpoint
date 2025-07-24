import { readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// List of item IDs that are causing errors
const missingItemIds = [203, 199, 213, 561, 211, 217, 201, 563, 1001, 985, 207, 215, 9142, 13471]

async function checkMissingItems() {
  try {
    // Load current items data
    const itemsPath = join(__dirname, '../data/processed/items.json')
    const itemsData = JSON.parse(await readFile(itemsPath, 'utf8'))
    
    console.log('🔍 Checking missing items...')
    console.log('============================')
    
    for (const itemId of missingItemIds) {
      const item = itemsData[itemId.toString()]
      if (item) {
        console.log(`✅ Item ${itemId}: ${item.name} (FOUND in cache)`)
      } else {
        console.log(`❌ Item ${itemId}: NOT FOUND in cache`)
      }
    }
    
    console.log('\n📊 Summary:')
    const found = missingItemIds.filter(id => itemsData[id.toString()])
    const missing = missingItemIds.filter(id => !itemsData[id.toString()])
    
    console.log(`Found: ${found.length}/${missingItemIds.length}`)
    console.log(`Missing: ${missing.length}/${missingItemIds.length}`)
    
    if (missing.length > 0) {
      console.log('\n🔍 Missing item IDs:', missing.join(', '))
      
      // Try to check if these are valid OSRS item IDs by searching for them manually
      console.log('\n💡 Suggestions:')
      console.log('1. Run the optimized scraper to get more items')
      console.log('2. These might be invalid/deprecated item IDs') 
      console.log('3. Check if the test data has incorrect item IDs')
    }
    
  } catch (error) {
    console.error('Error checking missing items:', error.message)
  }
}

checkMissingItems()
