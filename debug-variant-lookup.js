#!/usr/bin/env node

import WikiLookupService from './services/wikiLookupService.js'

async function debugVariantLookup() {
  console.log('🔍 Debugging variant lookup process...')
  
  const lookupService = new WikiLookupService()
  await lookupService.ensureDatabase()
  
  const itemName = 'Plain pizza'
  console.log(`\n🔍 Looking up: ${itemName}`)
  
  try {
    // Call the lookup method and see what happens
    const result = await lookupService.lookupItemByName(itemName)
    
    if (result) {
      console.log('✅ Lookup successful:', result.name, 'Icon:', result.icon)
    } else {
      console.log('❌ Lookup failed')
    }
  } catch (error) {
    console.error('❌ Error during lookup:', error)
  }
}

debugVariantLookup()
