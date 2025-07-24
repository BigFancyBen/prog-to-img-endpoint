#!/usr/bin/env node

import WikiLookupService from '../services/wikiLookupService.js'

/**
 * Test script to verify icon downloading with item ID naming
 */
async function testSingleItemIcon() {
  console.log('🧪 Testing single item icon download...')
  
  const wikiLookup = new WikiLookupService()
  
  try {
    // Test with a well-known item (Lobster)
    console.log('Testing with Lobster (ID: 379)...')
    const lobster = await wikiLookup.lookupItemById(379)
    
    if (lobster) {
      console.log('✅ Item found:', {
        id: lobster.id,
        name: lobster.name,
        icon: lobster.icon
      })
      
      if (lobster.icon) {
        console.log(`📥 Icon downloaded and cached as: ${lobster.icon}`)
      } else {
        console.log('❌ No icon downloaded')
      }
    } else {
      console.log('❌ Item not found')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

// Run the test
testSingleItemIcon().catch(console.error)
