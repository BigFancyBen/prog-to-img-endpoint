import fs from 'fs'
import sharp from 'sharp'

async function testSimpleSvgToPng() {
  try {
    // Read the simple test SVG
    const svgContent = fs.readFileSync('test-simple-svg.svg', 'utf8')
    console.log('SVG content length:', svgContent.length)
    
    // Convert to PNG using same method as the app
    const pngBuffer = await sharp(Buffer.from(svgContent))
      .png({ 
        quality: 100,
        compressionLevel: 0,
        adaptiveFiltering: false,
        force: true
      })
      .toBuffer()
    
    // Save the PNG
    fs.writeFileSync('test-simple-output.png', pngBuffer)
    console.log('Created test-simple-output.png with size:', pngBuffer.length, 'bytes')
    
  } catch (error) {
    console.error('Error:', error)
  }
}

testSimpleSvgToPng()
