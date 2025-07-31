#!/usr/bin/env node

import { WikitextParser } from './scripts/wiki/wikitextParser.js'
import https from 'https'
import fs from 'fs'

async function testMeatPieIconDownload() {
  console.log('🔍 Testing Meat pie icon download...')
  
  // Simulate what the parser found
  const iconFilename = 'Meat pie'
  
  const parser = new WikitextParser('')
  const iconUrl = parser.getIconUrl(iconFilename)
  
  console.log(`🔗 Constructed URL: ${iconUrl}`)
  
  // Test the URL
  try {
    const response = await fetch(iconUrl)
    console.log(`📡 Response status: ${response.status}`)
    console.log(`📡 Response headers:`, Object.fromEntries(response.headers.entries()))
    
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer()
      console.log(`✅ Successfully downloaded ${arrayBuffer.byteLength} bytes`)
      
      // Save it to test
      const buffer = Buffer.from(arrayBuffer)
      fs.writeFileSync('c:\\Users\\Tango\\Documents\\projects\\prog-to-img-endpoint\\test-meat-pie.png', buffer)
      console.log('✅ Saved test image')
    } else {
      console.log(`❌ Download failed with status ${response.status}`)
      const text = await response.text()
      console.log('Response text:', text.substring(0, 500))
    }
  } catch (error) {
    console.error('❌ Error testing download:', error)
  }
  
  // Also test the URL from our manual investigation
  const knownWorkingUrl = 'https://oldschool.runescape.wiki/images/Meat_pie.png?23ebf'
  console.log(`\n🔗 Testing known working URL: ${knownWorkingUrl}`)
  
  try {
    const response = await fetch(knownWorkingUrl)
    console.log(`📡 Response status: ${response.status}`)
    
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer()
      console.log(`✅ Successfully downloaded ${arrayBuffer.byteLength} bytes from known URL`)
    }
  } catch (error) {
    console.error('❌ Error testing known URL:', error)
  }
}

testMeatPieIconDownload()
