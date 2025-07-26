import fs from 'fs'
import path from 'path'
import IconService from './services/iconService.js'

async function testBackgroundImage() {
  try {
    // Get collection log background
    const backgroundImage = await IconService.getCollectionLogIcon()
    console.log('Background image length:', backgroundImage.length)
    console.log('Background image starts with:', backgroundImage.substring(0, 50))
    
    // Extract just the base64 data
    const base64Data = backgroundImage.replace(/^data:image\/[a-z]+;base64,/, '')
    console.log('Base64 data length:', base64Data.length)
    
    // Convert to buffer and save as test file
    const buffer = Buffer.from(base64Data, 'base64')
    fs.writeFileSync('test-background.png', buffer)
    console.log('Saved background image as test-background.png')
    
    // Test a simple SVG with the background
    const simpleSvg = `<svg width="396" height="221" xmlns="http://www.w3.org/2000/svg">
  <image href="${backgroundImage}" x="0" y="0" width="396" height="221"/>
  <text x="198" y="110" fill="orange" font-size="24" text-anchor="middle">TEST TEXT</text>
</svg>`
    
    fs.writeFileSync('test-simple-svg.svg', simpleSvg)
    console.log('Created simple test SVG')
    
  } catch (error) {
    console.error('Error:', error)
  }
}

testBackgroundImage()
