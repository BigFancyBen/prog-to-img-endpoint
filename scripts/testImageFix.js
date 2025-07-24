#!/usr/bin/env node

import { WikiApiClient } from '../scripts/wiki/wikiApiClient.js'

async function testImageFix() {
  console.log('🔍 Testing image lookup with .png extension fix...')
  
  const client = new WikiApiClient()
  
  // Test the exact filenames our improved logic selects
  const testCases = [
    { name: 'Dragonstone bolts (e) 5', shouldExist: true },
    { name: 'Dragonstone platebody', shouldExist: true },
    { name: 'Fire rune', shouldExist: true },
    { name: 'Lobster', shouldExist: true }
  ]
  
  for (const testCase of testCases) {
    console.log(`\n🖼️  Testing: ${testCase.name}`)
    
    try {
      // Test with .png extension (our fix)
      const filenameWithExt = testCase.name.endsWith('.png') ? testCase.name : testCase.name + '.png'
      
      const imageInfo = await client.getImageInfo(filenameWithExt)
      
      if (imageInfo && imageInfo.url) {
        console.log(`✅ SUCCESS: ${filenameWithExt}`)
        console.log(`   URL: ${imageInfo.url}`)
        console.log(`   Size: ${imageInfo.width}x${imageInfo.height}`)
      } else {
        console.log(`❌ NOT FOUND: ${filenameWithExt}`)
        
        // If stack-5 version doesn't exist, try stack-1 or basic version
        if (testCase.name.includes(' 5')) {
          const basicName = testCase.name.replace(' 5', '') + '.png'
          console.log(`🔄 Trying basic version: ${basicName}`)
          
          const basicInfo = await client.getImageInfo(basicName)
          if (basicInfo && basicInfo.url) {
            console.log(`✅ FOUND BASIC: ${basicName}`)
            console.log(`   URL: ${basicInfo.url}`)
          } else {
            console.log(`❌ BASIC NOT FOUND: ${basicName}`)
          }
        }
      }
      
    } catch (error) {
      console.error(`❌ Error testing ${testCase.name}:`, error.message)
    }
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  console.log('\n✅ Image fix test complete')
}

testImageFix().catch(console.error)
