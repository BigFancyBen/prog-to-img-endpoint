#!/usr/bin/env node

import { WikiApiClient } from './wiki/wikiApiClient.js'
import { WikitextParser } from './wiki/wikitextParser.js'

async function testBoltIcons() {
  console.log('🎯 Testing bolt icon selection...')
  
  const client = new WikiApiClient()
  
  // Test different bolt types
  const testItems = [
    'Dragonstone_bolts_(e)',
    'Diamond_bolts_(e)', 
    'Ruby_bolts_(e)',
    'Emerald_bolts_(e)'
  ]
  
  for (const itemName of testItems) {
    console.log(`\n🔹 Testing ${itemName}:`)
    
    try {
      const wikitext = await client.getPageWikitext(itemName)
      if (!wikitext) {
        console.log(`❌ No wikitext found for ${itemName}`)
        continue
      }
      
      const parser = new WikitextParser(wikitext)
      const success = parser.extractInfobox('Infobox Item')
      
      if (success) {
        const imageValue = parser.extractValue('image')
        console.log(`📸 Raw image field: ${imageValue}`)
        
        const extractedIcon = parser.extractIcon()
        console.log(`🖼️  Selected icon: ${extractedIcon}`)
        
        // Check what image info we can get from the API
        console.log('🔍 Checking available images via API...')
        const imageInfo = await client.getImageInfo(extractedIcon + '.png')
        if (imageInfo && imageInfo.url) {
          console.log(`✅ Found image URL: ${imageInfo.url}`)
        } else {
          console.log(`❌ No image info found for: ${extractedIcon}.png`)
        }
        
      } else {
        console.log(`❌ Could not extract infobox for ${itemName}`)
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${itemName}:`, error.message)
    }
    
    // Small delay to be respectful
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
}

testBoltIcons().catch(console.error)
