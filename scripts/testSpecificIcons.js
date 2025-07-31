#!/usr/bin/env node

import axios from 'axios'

async function testCommonFallbackIcons() {
  console.log('🔍 Testing common fallback icons...')
  
  const fallbackUrls = [
    // Sliding pieces
    'https://oldschool.runescape.wiki/images/Sliding_piece.png',
    'https://oldschool.runescape.wiki/images/Puzzle_piece.png',
    
    // Fishbowl
    'https://oldschool.runescape.wiki/images/Fishbowl.png',
    'https://oldschool.runescape.wiki/images/Pet_fishbowl.png',
    
    // Hellcat/Cat
    'https://oldschool.runescape.wiki/images/Cat.png',
    'https://oldschool.runescape.wiki/images/Hellcat.png',
    'https://oldschool.runescape.wiki/images/Pet_cat.png',
    
    // Pharaoh's sceptre
    'https://oldschool.runescape.wiki/images/Pharaoh\'s_sceptre.png',
    'https://oldschool.runescape.wiki/images/Pharaohs_sceptre.png',
    'https://oldschool.runescape.wiki/images/Sceptre.png',
    
    // Fractured crystal
    'https://oldschool.runescape.wiki/images/Crystal.png',
    'https://oldschool.runescape.wiki/images/Fractured_crystal.png',
    
    // Falconer's glove
    'https://oldschool.runescape.wiki/images/Glove.png',
    'https://oldschool.runescape.wiki/images/Falconers_glove.png',
    
    // Queen's secateurs
    'https://oldschool.runescape.wiki/images/Secateurs.png',
    'https://oldschool.runescape.wiki/images/Queens_secateurs.png',
  ]
  
  for (const url of fallbackUrls) {
    try {
      const response = await axios.get(url, { 
        responseType: 'arraybuffer',
        timeout: 5000,
        validateStatus: (status) => status === 200
      })
      
      if (response.data && response.data.byteLength > 100) {
        console.log(`✅ Found icon: ${url} (${response.data.byteLength} bytes)`)
      }
    } catch (error) {
      console.log(`❌ Not found: ${url}`)
    }
  }
}

testCommonFallbackIcons().catch(console.error)
