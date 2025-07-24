#!/usr/bin/env node

import FileService from '../services/fileService.js'

/**
 * Test script to verify icon loading works
 */
async function testIconLoading() {
  console.log('🧪 Testing icon loading functionality...')
  
  try {
    // Test with the lobster we just downloaded
    console.log('Testing icon loading for Lobster (ID: 379)...')
    const iconUrl = await FileService.getItemIconUrl(379, false) // Disable wiki lookup
    
    if (iconUrl && iconUrl.startsWith('data:image/png;base64,')) {
      console.log('✅ Icon loaded successfully as base64 data URL')
      console.log(`📊 Icon size: ${iconUrl.length} characters`)
    } else {
      console.log('❌ Icon loading failed')
      console.log('Result:', iconUrl)
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

// Run the test
testIconLoading().catch(console.error)
