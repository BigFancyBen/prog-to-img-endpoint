import fs from 'fs'
import sharp from 'sharp'
import IconService from './services/iconService.js'

async function testCollectionLogSvgStructure() {
  try {
    // Get background
    const backgroundImage = await IconService.getCollectionLogIcon()
    
    // Create test SVG with same structure as actual
    const testSvg = `<svg width="396" height="221" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="rs-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="2" stdDeviation="0" flood-color="black" flood-opacity="1"/>
    </filter>
    <style>
      .runescape-font {
        font-family: 'RuneScape UF', 'Runescape', monospace;
        font-weight: normal;
        font-style: normal;
      }
      .orange-text { fill: #ff981f; }
      .white-text { fill: #ffffff; }
      .title-text { font-size: 25px; text-anchor: middle; }
      .date-text { font-size: 16px; text-anchor: middle; }
      .item-text { font-size: 22px; text-anchor: middle; }
    </style>
  </defs>
  
  <!-- Background should be first -->
  <image href="${backgroundImage}" x="0" y="0" width="396" height="221"/>
  
  <!-- Text elements -->
  <text x="198" y="45" class="runescape-font orange-text title-text" filter="url(#rs-shadow)">Test Collection Log</text>
  <text x="198" y="100" class="runescape-font orange-text date-text" filter="url(#rs-shadow)">Test Date</text>
  <text x="198" y="125" class="runescape-font white-text item-text" filter="url(#rs-shadow)">Test Item</text>
  
  <!-- Test rectangle to verify other elements render -->
  <rect x="50" y="50" width="100" height="50" fill="red" opacity="0.5"/>
</svg>`
    
    fs.writeFileSync('test-collection-log-structure.svg', testSvg)
    console.log('Created test collection log SVG')
    
    // Convert to PNG
    const pngBuffer = await sharp(Buffer.from(testSvg))
      .png({ 
        quality: 100,
        compressionLevel: 0,
        adaptiveFiltering: false,
        force: true
      })
      .toBuffer()
    
    fs.writeFileSync('test-collection-log-structure.png', pngBuffer)
    console.log('Created test-collection-log-structure.png with size:', pngBuffer.length, 'bytes')
    
  } catch (error) {
    console.error('Error:', error)
  }
}

testCollectionLogSvgStructure()
