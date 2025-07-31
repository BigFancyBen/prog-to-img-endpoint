#!/usr/bin/env node

import databaseService from './services/databaseService.js'
import WikiLookupService from './services/wikiLookupService.js'

async function testSingleItemLookup() {
  console.log('🔍 Testing single item lookup...')
  
  // Initialize database
  await databaseService.init()
  
  const wikiLookupService = new WikiLookupService()
  
  try {
    // Clear any existing data for Plain pizza
    databaseService.db.exec('DELETE FROM items WHERE name LIKE \'%plain pizza%\'')
    
    // Look up Plain pizza specifically
    const result = await wikiLookupService.lookupItemByName('Plain pizza')
    
    if (result) {
      console.log('✅ Lookup successful:')
      console.log('  Name:', result.name)
      console.log('  ID:', result.id)
      console.log('  Icon:', result.icon)
      console.log('  Examine:', result.examine)
      
      // Check what was added to the database
      const dbItems = databaseService.db.prepare(
        'SELECT id, name, icon_filename FROM items WHERE name LIKE \'%plain pizza%\' ORDER BY id'
      ).all()
      
      console.log('\n📊 Items in database:')
      dbItems.forEach(item => {
        console.log(`  ID ${item.id}: ${item.name} - Icon: ${item.icon_filename || 'None'}`)
      })
      
    } else {
      console.log('❌ Lookup failed - no result returned')
    }
    
  } catch (error) {
    console.error('❌ Error during lookup:', error)
    console.error(error.stack)
  }
}

testSingleItemLookup()
