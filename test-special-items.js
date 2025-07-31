#!/usr/bin/env node

import databaseService from './services/databaseService.js'
import WikiLookupService from './services/wikiLookupService.js'

async function testSpecialItems() {
  console.log('🔍 Testing special API cache items...')
  
  await databaseService.init()
  const wikiLookupService = new WikiLookupService()
  
  const testItems = [
    { name: 'Odd cocktail', expectedIds: [2094, 2096, 2098, 2100] },
    { name: 'Unfinished batta (fruit, historical)', expectedIds: [2261, 2263, 2265, 2267, 2269, 2271, 2273, 2275] }
  ]
  
  for (const testItem of testItems) {
    console.log(`\n🔍 Testing: ${testItem.name}`)
    console.log(`Expected IDs: ${testItem.expectedIds.join(', ')}`)
    
    // Clear any existing data
    for (const id of testItem.expectedIds) {
      databaseService.db.exec(`DELETE FROM items WHERE id = ${id}`)
    }
    
    try {
      const result = await wikiLookupService.lookupItemByName(testItem.name)
      
      if (result) {
        console.log(`✅ Lookup successful: ${result.name} (ID: ${result.id})`)
        
        // Check how many versions were added to database
        const addedItems = databaseService.db.prepare(
          `SELECT id, name FROM items WHERE id IN (${testItem.expectedIds.join(',')})`
        ).all()
        
        console.log(`📊 Added ${addedItems.length}/${testItem.expectedIds.length} versions to database:`)
        addedItems.forEach(item => {
          console.log(`  - ID ${item.id}: ${item.name}`)
        })
        
      } else {
        console.log(`❌ Lookup failed`)
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`)
    }
  }
}

testSpecialItems()
