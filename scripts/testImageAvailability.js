#!/usr/bin/env node

import { WikiApiClient } from '../scripts/wiki/wikiApiClient.js'

async function testImageAvailability() {
  console.log('🔍 Testing which image files actually exist on the wiki...')
  
  const client = new WikiApiClient()
  
  // Test the specific filenames that are being selected by our logic
  const testImages = [
    'Dragonstone bolts (e) 5',
    'Dragonstone bolts (e) 1', 
    'Dragonstone bolts (e)',
    'Dragonstone bolts (e) detail',
    'Dragonstone platebody',
    'Dragonstone platelegs',
    'Dragonstone ring',
    'Dramen staff',
    'Drake bones'
  ]
  
  for (const imageName of testImages) {
    console.log(`\n🖼️  Testing: ${imageName}`)
    
    try {
      // Test with .png extension
      const pngInfo = await client.getImageInfo(imageName + '.png')
      if (pngInfo && pngInfo.url) {
        console.log(`✅ FOUND ${imageName}.png: ${pngInfo.url}`)
        continue
      }
      
      // Test without extension
      const noExtInfo = await client.getImageInfo(imageName)
      if (noExtInfo && noExtInfo.url) {
        console.log(`✅ FOUND ${imageName}: ${noExtInfo.url}`)
        continue
      }
      
      console.log(`❌ NOT FOUND: ${imageName}`)
      
      // Try some variations
      const variations = [
        imageName.replace(/\s/g, '_'),
        imageName.replace(/\s/g, '_') + '.png',
        imageName.replace(/\(e\)/g, '(e)'),
        imageName + ' detail',
        imageName + ' detail.png'
      ]
      
      for (const variation of variations) {
        const varInfo = await client.getImageInfo(variation)
        if (varInfo && varInfo.url) {
          console.log(`✅ FOUND VARIATION ${variation}: ${varInfo.url}`)
          break
        }
      }
      
    } catch (error) {
      console.error(`❌ Error testing ${imageName}:`, error.message)
    }
    
    // Small delay to be respectful
    await new Promise(resolve => setTimeout(resolve, 300))
  }
  
  console.log('\n✅ Image availability test complete')
}

testImageAvailability().catch(console.error)
