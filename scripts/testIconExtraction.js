#!/usr/bin/env node

import { WikiApiClient } from './wiki/wikiApiClient.js'
import { WikitextParser } from './wiki/wikitextParser.js'

async function testIconExtractionLogic() {
  console.log('🔍 Testing icon extraction logic with specific items...')
  
  const client = new WikiApiClient()
  
  // Test a few items that are known to have multiple icons
  const testItems = [
    'Dragonstone_bolts_(e)',
    'Abyssal_whip',
    'Rune_arrow'
  ]
  
  for (const itemName of testItems) {
    console.log(`\n� Testing ${itemName}:`)
    
    try {
      const wikitext = await client.getPageWikitext(itemName)
      if (!wikitext) {
        console.log(`❌ No wikitext found for ${itemName}`)
        continue
      }
      
      const parser = new WikitextParser(wikitext)
      const success = parser.extractInfobox('Infobox Item')
      
      if (success) {
        const templateData = parser.getTemplateData()
        console.log('🎯 Template data keys:', Object.keys(templateData))
        
        // Look for all image-related fields
        const imageFields = ['image', 'icon', 'picture', 'file']
        for (const field of imageFields) {
          const value = parser.extractValue(field)
          if (value) {
            console.log(`📸 ${field}: ${value}`)
          }
        }
        
        const extractedIcon = parser.extractIcon()
        console.log(`🖼️  Extracted icon: ${extractedIcon}`)
        
        // Let's also look at what wtf_wikipedia found
        const debugInfo = parser.getDebugInfo()
        console.log('🔧 Debug info:', debugInfo)
        
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

testIconExtractionLogic().catch(console.error)
