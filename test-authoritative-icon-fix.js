#!/usr/bin/env node

import databaseService from './services/databaseService.js'
import WikiLookupService from './services/wikiLookupService.js'

console.log('🧪 Testing authoritative icon fixing with a few items...')

async function testIconFix() {
  try {
    await databaseService.init()
    const wikiService = new WikiLookupService()
    
    console.log('✅ Services initialized')
    
    // Get a few items that need icons and have wiki mappings
    const db = databaseService.db
    const testItems = db.prepare(`
      SELECT i.id, i.name, m.wiki_page, m.wiki_url
      FROM items i
      INNER JOIN item_wiki_mapping m ON i.id = m.id
      WHERE (i.icon_data IS NULL OR length(i.icon_data) = 0)
      ORDER BY i.id
      LIMIT 3
    `).all()
    
    console.log(`🎯 Testing with ${testItems.length} items:`)
    testItems.forEach(item => {
      console.log(`  - ID ${item.id}: ${item.name} → ${item.wiki_page}`)
    })
    
    console.log('\n🔍 Processing items...')
    
    for (const item of testItems) {
      try {
        console.log(`\n📝 Processing: ${item.name} (ID: ${item.id})`)
        console.log(`  📖 Wiki page: ${item.wiki_page}`)
        
        const result = await wikiService.lookupItemByWikiPage(item.wiki_page, item.id)
        
        if (result) {
          console.log(`  ✅ Success: Found ${result.name} (ID: ${result.id})`)
          
          // Check if icon was stored
          const iconCheck = db.prepare('SELECT length(icon_data) as size FROM items WHERE id = ?').get(item.id)
          if (iconCheck && iconCheck.size > 0) {
            console.log(`  ✅ Icon stored: ${iconCheck.size} bytes`)
          } else {
            console.log(`  ⚠️  No icon data stored`)
          }
        } else {
          console.log(`  ❌ Failed: Could not process`)
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
