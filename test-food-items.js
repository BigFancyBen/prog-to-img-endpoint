#!/usr/bin/env node

import databaseService from './services/databaseService.js'
import WikiLookupService from './services/wikiLookupService.js'

async function testFoodItemsFix() {
  console.log('🔍 Testing food items fix...')
  
  await databaseService.init()
  const wikiLookupService = new WikiLookupService()
  
  const testItems = [
    { id: 2327, name: 'Meat pie' },
    { id: 2331, name: 'Half a meat pie' },
    { id: 2323, name: 'Apple pie' },
    { id: 2335, name: 'Half an apple pie' },
    { id: 2289, name: 'Plain pizza' },
    { id: 2291, name: '1/2 plain pizza' }
  ]
  
  console.log('🗑️ Clearing existing data...')
  for (const item of testItems) {
    databaseService.db.exec(`DELETE FROM items WHERE id = ${item.id}`)
  }
  
  let successCount = 0
  let totalCount = testItems.length
  
  for (const testItem of testItems) {
    console.log(`\n🔍 Testing: ${testItem.name} (ID: ${testItem.id})`)
    
    try {
      const result = await wikiLookupService.lookupItemByName(testItem.name)
      
      if (result && result.id === testItem.id) {
        console.log(`✅ Success: Found ${result.name}`)
        successCount++
        
        // Check if icon was stored
        const dbItem = databaseService.db.prepare('SELECT id, name, icon_data FROM items WHERE id = ?').get(testItem.id)
        if (dbItem && dbItem.icon_data) {
          console.log(`✅ Icon stored: ${dbItem.icon_data.length} bytes`)
        } else {
          console.log(`⚠️ No icon data stored`)
        }
      } else {
        console.log(`❌ Failed: Could not find or wrong ID`)
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`)
    }
  }
  
  console.log(`\n📊 Summary: ${successCount}/${totalCount} items successful`)
}

testFoodItemsFix()
