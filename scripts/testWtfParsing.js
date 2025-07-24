#!/usr/bin/env node

import wtf from 'wtf_wikipedia'

// Sample wikitext with multiple images like we see in Dragonstone bolts
const sampleWikitext = `
{{Infobox Item
|name = Dragonstone bolts (e)
|image = [[File:Dragonstone bolts (e) 1.png]] [[File:Dragonstone bolts (e) 2.png]] [[File:Dragonstone bolts (e) 3.png]] [[File:Dragonstone bolts (e) 4.png]] [[File:Dragonstone bolts (e) 5.png]]
|tradeable = Yes
|members = Yes
}}
`

console.log('🧪 Testing wtf_wikipedia parsing of multiple images...')

const doc = wtf(sampleWikitext)
const infoboxes = doc.infoboxes()

if (infoboxes.length > 0) {
  const infobox = infoboxes[0]
  const data = infobox.data || {}
  
  console.log('📋 All infobox data:')
  for (const [key, value] of Object.entries(data)) {
    console.log(`  ${key}: ${typeof value} = ${JSON.stringify(value)}`)
    
    if (key === 'image') {
      console.log(`\n🔍 Detailed image analysis:`)
      console.log(`  Type: ${typeof value}`)
      console.log(`  Is Array: ${Array.isArray(value)}`)
      console.log(`  String representation: ${String(value)}`)
      
      // Try different wtf_wikipedia methods
      if (value && typeof value === 'object') {
        console.log(`  Object keys: ${Object.keys(value)}`)
        
        if (value.text && typeof value.text === 'function') {
          console.log(`  .text(): ${value.text()}`)
        }
        
        if (value.toString && typeof value.toString === 'function') {
          console.log(`  .toString(): ${value.toString()}`)
        }
        
        if (value.json && typeof value.json === 'function') {
          console.log(`  .json(): ${JSON.stringify(value.json())}`)
        }
      }
    }
  }
  
  console.log('\n🔍 Alternative access methods:')
  
  // Try accessing the image field directly
  const imageField = infobox.get('image')
  console.log(`Direct get('image'): ${typeof imageField} = ${JSON.stringify(imageField)}`)
  
  // Try the template approach
  const template = infobox.template()
  console.log(`Template approach: ${typeof template} = ${JSON.stringify(template)}`)
  
} else {
  console.log('❌ No infoboxes found')
}

console.log('\n✅ Test complete')
