import { generateCollectionLogSVG, collectionLogSvgToPng } from './services/svgGenerationService.js'
import FileService from './services/fileService.js'
import fs from 'fs'
import sharp from 'sharp'

async function debugCompositing() {
  try {
    // Generate the SVG
    const svgString = await generateCollectionLogSVG({
      userName: "DebugUser",
      itemName: "Toolkit"
    })
    
    console.log('Generated SVG length:', svgString.length)
    fs.writeFileSync('debug-original.svg', svgString)
    
    // Get the background image
    const bgImageBase64 = await FileService.getCollectionLogBackground()
    const base64Data = bgImageBase64.replace(/^data:image\/[a-z]+;base64,/, '')
    const backgroundBuffer = Buffer.from(base64Data, 'base64')
    
    console.log('Background buffer size:', backgroundBuffer.length)
    fs.writeFileSync('debug-background.png', backgroundBuffer)
    
    // Test the regex replacement
    const svgWithoutBackground = svgString.replace(/<image href="data:image\/png;base64,[^"]*"[^>]*\/>/g, '')
    console.log('SVG without background length:', svgWithoutBackground.length)
    fs.writeFileSync('debug-without-bg.svg', svgWithoutBackground)
    
    // Convert SVG without background to PNG
    const overlayBuffer = await sharp(Buffer.from(svgWithoutBackground))
      .png({ 
        quality: 100,
        compressionLevel: 0,
        adaptiveFiltering: false,
        force: true
      })
      .toBuffer()
    
    console.log('Overlay buffer size:', overlayBuffer.length)
    fs.writeFileSync('debug-overlay.png', overlayBuffer)
    
    // Test compositing
    const result = await sharp(backgroundBuffer)
      .composite([{ input: overlayBuffer, top: 0, left: 0 }])
      .png({ 
        quality: 100,
        compressionLevel: 0,
        adaptiveFiltering: false,
        force: true
      })
      .toBuffer()
    
    console.log('Final composite size:', result.length)
    fs.writeFileSync('debug-composite.png', result)
    
  } catch (error) {
    console.error('Debug error:', error)
  }
}

debugCompositing()
