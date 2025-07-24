#!/usr/bin/env node

import { WikiApiClient } from '../scripts/wiki/wikiApiClient.js'
import { WikitextParser } from '../scripts/wiki/wikitextParser.js'

async function testIconLogic() {
  console.log('🔍 Testing improved icon selection logic...')
  
  const client = new WikiApiClient()
  
  // Test items that have detail.png versions available
  const testItems = [
    'Dragonstone_bolts_(e)', // Should prefer detail over numbered
    'Rune_arrow',             // Should prefer detail over numbered  
    'Bronze_arrow',           // Should prefer detail over numbered
    'Fire_rune',              // Simple item
    'Lobster'                 // Simple item
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
        // Show all available image options
        const templateData = parser.getTemplateData()
        const imageFields = Object.keys(templateData).filter(key => 
          key.toLowerCase().includes('image') || key.toLowerCase().includes('icon')
        )
        
        if (imageFields.length > 0) {
          console.log('📸 Available image fields:')
          imageFields.forEach(field => {
            const value = templateData[field]
            console.log(`  ${field}: ${typeof value} = ${JSON.stringify(value)}`)
            
            // Check if wtf_wikipedia parsed it as an array
            if (Array.isArray(value)) {
              console.log(`    📋 IS AN ARRAY with ${value.length} items:`, value)
            } else if (value && value.includes('File:')) {
              // Manual parsing of concatenated string
              const fileMatches = value.match(/\[\[File:([^\]]+)\]\]/g)
              if (fileMatches) {
                console.log(`    📋 Parsed ${fileMatches.length} files from string:`)
                const filenames = fileMatches.map(match => {
                  const filename = match.match(/File:([^\]]+)/)[1]
                  return parser.cleanIconFilename(filename)
                })
                console.log(`      ${filenames.join(', ')}`)
              }
            }
          })
        }
        
        // Also check the raw template data structure
        console.log('\n🔍 Raw template structure inspection:')
        const rawImageValue = parser.extractValue('image')
        console.log(`Raw image value type: ${typeof rawImageValue}`)
        console.log(`Raw image value: ${JSON.stringify(rawImageValue)}`)
        
        const extractedIcon = parser.extractIcon()
        console.log(`🎯 Selected icon: ${extractedIcon}`)
        
        // Check if there's a detail version available that wasn't selected
        const allFilenames = []
        imageFields.forEach(field => {
          const value = templateData[field]
          if (value && value.includes('File:')) {
            const fileMatches = value.match(/\[\[File:([^\]]+)\]\]/g)
            if (fileMatches) {
              fileMatches.forEach(match => {
                const filename = match.match(/File:([^\]]+)/)[1]
                allFilenames.push(parser.cleanIconFilename(filename))
              })
            }
          }
        })
        
        const detailVersions = allFilenames.filter(name => 
          name.toLowerCase().includes('detail')
        )
        
        if (detailVersions.length > 0) {
          console.log(`📋 Available detail versions: ${detailVersions.join(', ')}`)
          if (!extractedIcon || !extractedIcon.toLowerCase().includes('detail')) {
            console.log(`⚠️  Detail version available but not selected!`)
          }
        }
        
      } else {
        console.log(`❌ Could not extract infobox for ${itemName}`)
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${itemName}:`, error.message)
    }
  }
  
  console.log('\n✅ Improved icon selection test complete')
}

testIconLogic().catch(console.error)
