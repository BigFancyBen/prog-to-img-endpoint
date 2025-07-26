import { readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import OSRSDataService from './osrsDataService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Cache for data to improve performance
const cache = new Map()
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

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
   * Get item icon as base64 from item data or downloaded icons
   * @param {number} itemId - Item ID
   * @param {boolean} enableWikiLookup - Enable automatic wiki lookup for missing items
   * @returns {Promise<string>} Base64 encoded image
   */
  static async getItemIconUrl(itemId, enableWikiLookup = true) {
    try {
      // First, check if we have a downloaded icon file by item ID (preferred format)
      const iconPath = join(__dirname, '../../icons/items', `${itemId}.png`)
      try {
        const iconBuffer = await readFile(iconPath)
        const base64Icon = iconBuffer.toString('base64')
        return `data:image/png;base64,${base64Icon}`
      } catch (iconError) {
        // Icon file doesn't exist, continue to item data lookup
      }
      
      // Get the item data which may contain local icon filename
      const itemData = await this.getItemData(itemId, enableWikiLookup)
      
      // If this is a missing/placeholder item, return placeholder icon immediately
      if (itemData._missing) {
        console.warn(`⚠️  Using placeholder icon for missing item ${itemId}`)
        const placeholderIcon = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
        return `data:image/png;base64,${placeholderIcon}`
      }
      
      // Check if item has a local icon filename (for backward compatibility)
      if (itemData.icon && typeof itemData.icon === 'string' && itemData.icon.endsWith('.png')) {
        try {
          const iconPath2 = join(__dirname, '../../icons/items', itemData.icon)
          const iconBuffer = await readFile(iconPath2)
          const base64Icon = iconBuffer.toString('base64')
          return `data:image/png;base64,${base64Icon}`
        } catch (iconError) {
          // Icon file doesn't exist with the filename from itemData
        }
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
      // Use database search functionality
      const searchResult = await OSRSDataService.searchItemsByName(itemName, 1)
      
      if (searchResult && searchResult.length > 0) {
        const item = searchResult[0]
        
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
        // Cache the result
        cache.set(cacheKey, {
          data: exactItem,
          timestamp: Date.now()
        })
        
        return exactItem
      }
      
      throw new Error(`Item not found: ${itemName}`)
    } catch (error) {
      console.error(`Error searching for item ${itemName}:`, error)
      throw new Error(`Failed to find item: ${itemName}`)
    }
  }

  /**
   * Get skill icon as base64 (still local as these don't change)
   * @param {string} skillName - Name of the skill
   * @returns {Promise<string>} Base64 encoded image
   */
  static async getSkillIcon(skillName) {
    try {
      const iconPath = join(__dirname, '../../icons', `${skillName}.png`)
      const imageBuffer = await readFile(iconPath)
      return `data:image/png;base64,${imageBuffer.toString('base64')}`
    } catch (error) {
      console.error(`Error reading skill icon for ${skillName}:`, error)
      // Return a placeholder or throw a more specific error
      throw new Error(`Failed to read skill icon: ${skillName}`)
    }
  }

  /**
   * Get collection log background (still local)
   * @returns {Promise<string>} Base64 encoded image
   */
  static async getCollectionLogBackground() {
    try {
      const iconPath = join(__dirname, '../../icons/collection-log.png')
      const imageBuffer = await readFile(iconPath)
      return `data:image/png;base64,${imageBuffer.toString('base64')}`
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