import { generateProgressSVG, generateCollectionLogSVG, svgToPng } from './svgGenerationService.js'

// Performance cache for generated images
const IMAGE_CACHE = new Map()
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes

/**
 * Get cached image or generate new one
 */
function getCachedImage(cacheKey, data) {
  const cached = IMAGE_CACHE.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }
  return null
}

/**
 * Set cached image
 */
function setCachedImage(cacheKey, data) {
  IMAGE_CACHE.set(cacheKey, {
    data,
    timestamp: Date.now()
  })
  
  // Cleanup old entries if cache gets too large
  if (IMAGE_CACHE.size > 100) {
    const entries = Array.from(IMAGE_CACHE.entries())
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
    entries.slice(0, 20).forEach(([key]) => IMAGE_CACHE.delete(key))
  }
}

export async function generateProgressImage(data) {
  try {
    // Create cache key based on data content
    const cacheKey = `progress_${JSON.stringify(data)}`
    
    // Check cache first
    const cached = getCachedImage(cacheKey, data)
    if (cached) {
      return cached
    }
    
    // Generate SVG
    const svgString = await generateProgressSVG(data)
    
    // Convert to PNG
    const pngBuffer = await svgToPng(svgString)
    
    // Create result
    const result = {
      statusCode: 200,
      body: JSON.stringify(`data:image/png;base64,${pngBuffer.toString('base64')}`)
    }
    
    // Cache the result
    setCachedImage(cacheKey, result)
    
    return result
  } catch (error) {
    console.error('Error generating progress image:', error)
    throw error
  }
}

export async function generateCollectionLogImage(data) {
  try {
    // Create cache key based on data content
    const cacheKey = `collection_${JSON.stringify(data)}`
    
    // Check cache first
    const cached = getCachedImage(cacheKey, data)
    if (cached) {
      return cached
    }
    
    // Generate SVG
    const svgString = await generateCollectionLogSVG(data)
    
    // Convert to PNG using regular function (keep background in SVG)
    const pngBuffer = await svgToPng(svgString)
    
    // Create result
    const result = {
      statusCode: 200,
      body: JSON.stringify(`data:image/png;base64,${pngBuffer.toString('base64')}`)
    }
    
    // Cache the result
    setCachedImage(cacheKey, result)
    
    return result
  } catch (error) {
    console.error('Error generating collection log image:', error)
    throw error
  }
} 