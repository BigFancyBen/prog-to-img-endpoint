#!/usr/bin/env node

import { WikitextParser } from './scripts/wiki/wikitextParser.js'

async function testPlainPizzaIconDownload() {
  console.log('🔍 Testing Plain pizza icon download...')
  
  // Test both versions
  const icons = [
    'Plain pizza',
    '1-2 plain pizza'
  ]
  
  const parser = new WikitextParser('')
  
  for (const iconFilename of icons) {
    const iconUrl = parser.getIconUrl(iconFilename)
    
    console.log(`\n🔗 Testing: ${iconFilename}`)
    console.log(`🔗 URL: ${iconUrl}`)
    
    try {
      const response = await fetch(iconUrl)
      console.log(`📡 Response status: ${response.status}`)
      
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer()
        console.log(`✅ Successfully downloaded ${arrayBuffer.byteLength} bytes`)
      } else {
        console.log(`❌ Download failed with status ${response.status}`)
      }
    } catch (error) {
      console.error('❌ Error testing download:', error.message)
    }
  }
}

testPlainPizzaIconDownload()
