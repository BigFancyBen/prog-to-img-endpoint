#!/usr/bin/env node

import WikiLookupService from './services/wikiLookupService.js'
import databaseService from './services/databaseService.js'

async function testVariantItems() {
  console.log('🧪 Testing variant item handling...')
  
  try {
    await databaseService.init()
    const wikiService = new WikiLookupService()
    
    const testItems = [
      { id: 2327, name: 'Meat pie' },
      { id: 2331, name: 'Half a meat pie' },
      { id: 2323, name: 'Apple pie' },
      { id: 2335, name: 'Half an apple pie' },
      { id: 2289, name: 'Plain pizza' },
      { id: 2291, name: '1/2 plain pizza' }
    ]
    
    for (const item of testItems) {
      console.log(`\n🔍 Testing: ${item.name} (ID: ${item.id})`)
      
      const alternates = wikiService.getAlternateNames(item.name)
      console.log(`  📝 Alternate names: ${alternates.join(', ')}`)
      
      const success = await wikiService.downloadIcon(item.id, item.name)
      if (success) {
        console.log(`  ✅ Successfully found icon for: ${item.name}`)
      } else {
        console.log(`  ❌ Could not find icon for: ${item.name}`)
      }
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await databaseService.close()
  }
}

testVariantItems()
