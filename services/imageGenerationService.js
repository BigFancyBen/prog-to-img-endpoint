import { generateProgressSVG, generateCollectionLogSVG, svgToPng } from './svgGenerationService.js'

export async function generateProgressImage(data) {
  try {
    // Generate SVG
    const svgString = await generateProgressSVG(data)
    
    // Convert to PNG
    const pngBuffer = await svgToPng(svgString)
    
    // Return in the expected format
    return {
      statusCode: 200,
      body: JSON.stringify(`data:image/png;base64,${pngBuffer.toString('base64')}`)
    }
  } catch (error) {
    console.error('Error generating progress image:', error)
    throw error
  }
}

export async function generateCollectionLogImage(data) {
  try {
    // Generate SVG
    const svgString = await generateCollectionLogSVG(data)
    
    // Convert to PNG
    const pngBuffer = await svgToPng(svgString)
    
    // Return in the expected format
    return {
      statusCode: 200,
      body: JSON.stringify(`data:image/png;base64,${pngBuffer.toString('base64')}`)
    }
  } catch (error) {
    console.error('Error generating collection log image:', error)
    throw error
  }
} 