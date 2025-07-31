#!/usr/bin/env node

import databaseService from './services/databaseService.js'
import WikiLookupService from './services/wikiLookupService.js'

console.log('🧪 Testing icon fixing approach...')

async function testIconFix() {
  try {
    // Initialize
    await databaseService.init()
    const wikiService = new WikiLookupService()
    
    console.log('✅ Services initialized')
    
    // Get a few items that need icons
    const db = databaseService.db
    const testItems = db.prepare(`
      SELECT id, name 
      FROM items 
      WHERE (icon_data IS NULL OR length(icon_data) = 0)
      LIMIT 5
    `).all()
    
    console.log(`🎯 Testing with ${testItems.length} items:`)
    testItems.forEach(item => {
      console.log(`  - ID ${item.id}: ${item.name}`)
    })
    
    console.log('\n🔍 Processing items...')
    
    for (const item of testItems) {
      try {
        console.log(`\n📝 Processing: ${item.name} (ID: ${item.id})`)
        
        const result = await wikiService.lookupItemByName(item.name)
        
        if (result && result.success) {
          console.log(`  ✅ Success: Found ${item.name}`)
          
          // Check if icon was stored
          const iconCheck = db.prepare('SELECT length(icon_data) as size FROM items WHERE id = ?').get(item.id)
          if (iconCheck && iconCheck.size > 0) {
            console.log(`  ✅ Icon stored: ${iconCheck.size} bytes`)
          } else {
            console.log(`  ⚠️  No icon data stored`)
          }
        } else {
          console.log(`  ❌ Failed: Could not find or wrong ID`)
        }
        
        // Small delay
        await new Promise(resolve => setTimeout(resolve, 2000))
        
      } catch (error) {
        console.log(`  💥 Error: ${error.message}`)
      }
    }
    
    console.log('\n✅ Test complete')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testIconFix()
