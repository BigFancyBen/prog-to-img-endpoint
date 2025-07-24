#!/usr/bin/env node

import { WikitextParser } from '../scripts/wiki/wikitextParser.js'

// Test with sample wikitext
const sampleWikitext = `
{{Infobox Item
|name = Dragonstone bolts (e)
|image = [[File:Dragonstone bolts (e) 1.png]] [[File:Dragonstone bolts (e) 2.png]] [[File:Dragonstone bolts (e) 3.png]] [[File:Dragonstone bolts (e) 4.png]] [[File:Dragonstone bolts (e) 5.png]]
|tradeable = Yes
|members = Yes
}}
`

console.log('🧪 Testing WikitextParser with multiple icons...')

const parser = new WikitextParser(sampleWikitext)
const success = parser.extractInfobox('Infobox Item')

if (success) {
  const templateData = parser.getTemplateData()
  console.log('\n📋 Template data:')
  
  for (const [key, value] of Object.entries(templateData)) {
    if (key.toLowerCase().includes('image')) {
      console.log(`${key}: ${typeof value} = "${value}"`)
    }
  }
  
  console.log('\n🎯 Icon extraction:')
  const extractedIcon = parser.extractIcon()
  console.log('Selected icon:', extractedIcon)
  
  // Let's also trace through the selectBestIcon method manually
  const imageValue = parser.extractValue('image')
  console.log('\nDebugging selectBestIcon:')
  console.log('Input imageValue:', imageValue)
  
  if (imageValue) {
    console.log('Calling selectBestIcon...')
    const selected = parser.selectBestIcon(imageValue)
    console.log('selectBestIcon result:', selected)
  }
  
} else {
  console.log('❌ Failed to extract infobox')
}

console.log('\n✅ Test complete')
