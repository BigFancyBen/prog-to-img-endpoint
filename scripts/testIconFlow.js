#!/usr/bin/env node

import FileService from '../services/fileService.js'

async function testIconFlow() {
  console.log('🧪 Testing FileService icon flow...')
  
  try {
    // Test item 17 (Grail bell)
    console.log('\n📋 Testing item 17 (Grail bell):')
    const icon17 = await FileService.getItemIconUrl(17)
    console.log('  Icon source:', icon17.substring(0, 50) + '...')
    console.log('  Icon type:', icon17.startsWith('data:image/png;base64,') ? 'Base64 PNG' : 'Other')
    
    // Test item 91 (Guam potion)
    console.log('\n📋 Testing item 91 (Guam potion):')
    const icon91 = await FileService.getItemIconUrl(91)
    console.log('  Icon source:', icon91.substring(0, 50) + '...')
    console.log('  Icon type:', icon91.startsWith('data:image/png;base64,') ? 'Base64 PNG' : 'Other')
    
    // Also test getting item data
    console.log('\n📋 Testing item data retrieval:')
    const itemData17 = await FileService.getItemData(17)
    console.log('  Item 17 name:', itemData17.name)
    console.log('  Item 17 source:', itemData17._missing ? 'Missing/Placeholder' : 'Database')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

testIconFlow().catch(console.error)
