#!/usr/bin/env node

import databaseService from './services/databaseService.js'
import WikiLookupService from './services/wikiLookupService.js'

console.log('🧪 Testing specific problematic URLs...')

async function testProblematicUrls() {
  try {
    await databaseService.init()
    const wikiService = new WikiLookupService()

    // Test cases from the user
    const testCases = [
      {
        id: 2432,
        name: 'Prayer regeneration potion(4)', 
        wikiPage: 'Prayer_regeneration_potion#(4)',
        expected: 'Should work - regular characters'
      },
      {
        id: 5591,
        name: '??? mixture', 
        wikiPage: '%3F%3F%3F_mixture#Horrible',
        expected: 'URL encoding issue - special characters'
      }
    ]

    for (const testCase of testCases) {
      console.log(`\n🔍 Testing: ${testCase.name} (ID: ${testCase.id})`)
      console.log(`📄 Wiki Page: ${testCase.wikiPage}`)
      console.log(`🎯 Expected: ${testCase.expected}`)
      
      // Test URL decoding
      const decoded = decodeURIComponent(testCase.wikiPage)
      console.log(`🔗 Decoded URL: ${decoded}`)
      
      // Test the actual lookup
      try {
        const result = await wikiService.lookupItemByWikiPage(testCase.wikiPage, testCase.id)
        
        if (result) {
          console.log(`✅ SUCCESS: Found item "${result.name}" with icon data: ${result.icon_data ? result.icon_data.length + ' bytes' : 'NO ICON'}`)
          
          // Check database
          const db = databaseService.db
          const dbItem = db.prepare('SELECT id, name, length(icon_data) as icon_size FROM items WHERE id = ?').get(testCase.id)
          if (dbItem) {
            console.log(`📊 Database: ${dbItem.name} - Icon: ${dbItem.icon_size || 0} bytes`)
          }
        } else {
          console.log(`❌ FAILED: No result returned`)
        }
      } catch (error) {
        console.log(`💥 ERROR: ${error.message}`)
      }
      
      // Add delay between tests
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

  } catch (error) {
    console.error('❌ Test Error:', error.message)
  }
}

testProblematicUrls()
