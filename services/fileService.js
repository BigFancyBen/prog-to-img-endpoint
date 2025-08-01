import { readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import OSRSDataService from './osrsDataService.js'
import IconService from './iconService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Enhanced cache for data to improve performance
const cache = new Map()
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes (reduced for better performance)
const MAX_CACHE_SIZE = 500 // Limit cache size

class FileService {
  /**
   * Get item data from database by ID with automatic wiki lookup
   * @param {number} itemId - Item ID
   * @param {boolean} enableWikiLookup - Enable automatic wiki lookup for missing items
   * @returns {Promise<Object>} Item data
   */
  static async getItemData(itemId, enableWikiLookup = true) {
    const cacheKey = `item_${itemId}`
    
    // Check cache first
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey)
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data
      }
      cache.delete(cacheKey)
    }
    
    // Cleanup cache if it gets too large
    if (cache.size > MAX_CACHE_SIZE) {
      const entries = Array.from(cache.entries())
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
      entries.slice(0, 100).forEach(([key]) => cache.delete(key))
    }

    try {
      // Use the database-based OSRSDataService directly
      const itemData = await OSRSDataService.getItemById(itemId, enableWikiLookup)
      
      if (itemData && !itemData._missing) {
        // Cache the successful result
        cache.set(cacheKey, {
          data: itemData,
          timestamp: Date.now()
        })
        return itemData
      }

      if (!itemData) {
        // Log missing item for future reference but don't throw error
        console.warn(`⚠️  Item ${itemId} not found in cache or wiki - returning placeholder data`)
        
        // Return placeholder item data to prevent breaking image generation
        const placeholderData = {
          id: itemId,
          name: `Unknown Item ${itemId}`,
          examine: "Item data not available",
          icon: null,
          _missing: true
        }
        
        // Cache the placeholder to avoid repeated lookups
        cache.set(cacheKey, {
          data: placeholderData,
          timestamp: Date.now()
        })
        
        return placeholderData
      }
      
      // Cache the result
      cache.set(cacheKey, {
        data: itemData,
        timestamp: Date.now()
      })
      
      return itemData
    } catch (error) {
      console.error(`Error fetching item ${itemId}:`, error)
      throw new Error(`Failed to fetch item data for ID: ${itemId}`)
    }
  }

  /**
   * Get item icon as base64 from database or filesystem
   * @param {number} itemId - Item ID
   * @param {boolean} enableWikiLookup - Enable automatic wiki lookup for missing items
   * @returns {Promise<string>} Base64 encoded image
   */
  static async getItemIconUrl(itemId, enableWikiLookup = true) {
    try {
      // Use the new IconService to get icons from database first, then filesystem
      const iconDataUrl = await IconService.getItemIcon(itemId)
      if (iconDataUrl) {
        return iconDataUrl
      }
      
      // Get the item data which may contain additional icon info
      const itemData = await this.getItemData(itemId, enableWikiLookup)
      
      // If this is a missing/placeholder item, return placeholder icon immediately
      if (itemData._missing) {
        console.warn(`⚠️  Using placeholder icon for missing item ${itemId}`)
        const placeholderIcon = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
        return `data:image/png;base64,${placeholderIcon}`
      }
      
      // Legacy: check if icon is embedded as base64 in the item data
      if (itemData.icon && itemData.icon.startsWith('data:')) {
        return itemData.icon
      }
      
      // If no icon in item data, return a transparent placeholder
      const placeholderIcon = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      return `data:image/png;base64,${placeholderIcon}`
    } catch (error) {
      console.error(`Error getting item icon for ${itemId}:`, error)
      
      // Return a simple placeholder icon (1x1 transparent pixel)
      const placeholderIcon = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      return `data:image/png;base64,${placeholderIcon}`
    }
  }

  /**
   * Search for items by name using database
   * @param {string} itemName - Name of the item to search for
   * @returns {Promise<Object>} First matching item data
   */
  static async searchItemByName(itemName) {
    const cacheKey = `search_${itemName.toLowerCase()}`
    
    // Check cache first
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey)
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data
      }
      cache.delete(cacheKey)
    }

    try {
      console.log(`🔍 FileService searching for: "${itemName}"`)
      
      // Use database search functionality
      const searchResult = await OSRSDataService.searchItemsByName(itemName, 1)
      
      if (searchResult && searchResult.length > 0) {
        const item = searchResult[0]
        console.log(`✅ Found item: ${item.name} (ID: ${item.id})`)
        
        // Cache the result
        cache.set(cacheKey, {
          data: item,
          timestamp: Date.now()
        })
        
        return item
      }
      
      // If database search failed, try direct name lookup which includes WikiLookupService fallback
      console.log(`🔍 Database search failed for "${itemName}", trying exact name lookup...`)
      const exactItem = await OSRSDataService.getItemByName(itemName)
      
      if (exactItem) {
        console.log(`✅ Found item via exact lookup: ${exactItem.name} (ID: ${exactItem.id})`)
        
        // Cache the result
        cache.set(cacheKey, {
          data: exactItem,
          timestamp: Date.now()
        })
        
        return exactItem
      }
      
      // Try a broader search as a last resort
      console.log(`🔍 Exact lookup failed, trying broader search...`)
      const broaderResults = await OSRSDataService.searchItemsByName(itemName.split(' ')[0], 5)
      if (broaderResults && broaderResults.length > 0) {
        console.log(`🔍 Broader search found ${broaderResults.length} items:`)
        broaderResults.forEach(item => {
          console.log(`  - ${item.name} (ID: ${item.id})`)
        })
      }
      
      throw new Error(`Item not found: ${itemName}`)
    } catch (error) {
      console.error(`Error searching for item ${itemName}:`, error)
      throw new Error(`Failed to find item: ${itemName}`)
    }
  }

  /**
   * Get skill icon as base64 using IconService
   * @param {string} skillName - Name of the skill
   * @returns {Promise<string>} Base64 encoded image
   */
  static async getSkillIcon(skillName) {
    try {
      return await IconService.getSkillIcon(skillName)
    } catch (error) {
      console.error(`Error reading skill icon for ${skillName}:`, error)
      // Return a placeholder or throw a more specific error
      throw new Error(`Failed to read skill icon: ${skillName}`)
    }
  }

  /**
   * Get collection log background using IconService
   * @returns {Promise<string>} Base64 encoded image
   */
  static async getCollectionLogBackground() {
    try {
      return await IconService.getCollectionLogIcon()
    } catch (error) {
      console.error('Error reading collection log background:', error)
      throw new Error('Failed to read collection log background')
    }
  }

  /**
   * Read a local image file and return as buffer (fallback method)
   * @param {string} filePath - Path to the image file
   * @returns {Promise<Buffer>} Image buffer
   */
  static async getLocalImage(filePath) {
    try {
      return await readFile(filePath)
    } catch (error) {
      console.error(`Error reading image file: ${filePath}`, error)
      throw new Error(`Failed to read image: ${filePath}`)
    }
  }

  /**
   * Clear the cache (useful for testing or memory management)
   */
  static clearCache() {
    cache.clear()
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  static getCacheStats() {
    return {
      size: cache.size,
      entries: Array.from(cache.keys())
    }
  }
}

export default FileService
export const getItemData = FileService.getItemData
export const getItemIconUrl = FileService.getItemIconUrl  
export const searchItemByName = FileService.searchItemByName
export const getSkillIcon = FileService.getSkillIcon
export const getCollectionLogBackground = FileService.getCollectionLogBackground
export const getLocalImage = FileService.getLocalImage 