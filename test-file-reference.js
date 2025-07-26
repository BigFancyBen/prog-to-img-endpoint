import fs from 'fs'
import sharp from 'sharp'
import IconService from './services/iconService.js'

async function testWithFileReference() {
  try {
    // Get background and save as file
    const backgroundImage = await IconService.getCollectionLogIcon()
    const base64Data = backgroundImage.replace(/^data:image\/[a-z]+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')
    fs.writeFileSync('collection-log-background.png', buffer)
    
    // Create SVG that references the file instead of data URL
    const testSvgWithFile = `<svg width="396" height="221" xmlns="http://www.w3.org/2000/svg">
  <image href="collection-log-background.png" x="0" y="0" width="396" height="221"/>
  <text x="198" y="110" fill="orange" font-size="24" text-anchor="middle">TEST WITH FILE REF</text>
</svg>`
    
    fs.writeFileSync('test-with-file-ref.svg', testSvgWithFile)
    
    // Try converting with Sharp
    const pngBuffer = await sharp(Buffer.from(testSvgWithFile))
      .png({ 
        quality: 100,
        compressionLevel: 0,
        adaptiveFiltering: false,
        force: true
      })
      .toBuffer()
    
    fs.writeFileSync('test-with-file-ref.png', pngBuffer)
    console.log('Created test with file reference, size:', pngBuffer.length, 'bytes')
    
  } catch (error) {
    console.error('Error with file reference test:', error)
  }
}

testWithFileReference()
