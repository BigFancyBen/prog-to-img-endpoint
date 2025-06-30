import { readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Cache for local data to improve performance
const cache = new Map()
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

// Load local data once
let itemsData = null
let itemsIndex = null

class FileService {
  /**
   * Load items data from local file
   * @returns {Promise<Object>} Items data
   */
  static async loadItemsData() {
    if (itemsData) return itemsData
    
    try {
      const dataPath = join(__dirname, '../../data/processed/items.json')
      const data = await readFile(dataPath, 'utf8')
      itemsData = JSON.parse(data)
      return itemsData
    } catch (error) {
      console.error('Error loading items data:', error)
      throw new Error('Failed to load local items data')
    }
  }

  /**
   * Load items index from local file
   * @returns {Promise<Object>} Items index
   */
  static async loadItemsIndex() {
    if (itemsIndex) return itemsIndex
    
    try {
      const indexPath = join(__dirname, '../../data/processed/indexes.json')
      const data = await readFile(indexPath, 'utf8')
      const indexes = JSON.parse(data)
      itemsIndex = indexes.items || {}
      return itemsIndex
    } catch (error) {
      console.error('Error loading items index:', error)
      throw new Error('Failed to load local items index')
    }
  }

  /**
   * Get item data from local file by ID
   * @param {number} itemId - Item ID
   * @returns {Promise<Object>} Item data
   */
  static async getItemData(itemId) {
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
      const items = await this.loadItemsData()
      const itemData = items[itemId.toString()]
      
      if (!itemData) {
        throw new Error(`Item ${itemId} not found in local data`)
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
   * Get item icon as base64 from item data
   * @param {number} itemId - Item ID
   * @returns {Promise<string>} Base64 encoded image
   */
  static async getItemIconUrl(itemId) {
    try {
      // Get the item data which contains the embedded icon
      const itemData = await this.getItemData(itemId)
      
      if (itemData.icon) {
        return `data:image/png;base64,${itemData.icon}`
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
   * Search for items by name using local data
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
      const itemsIndex = await this.loadItemsIndex()
      const items = await this.loadItemsData()
      const queryLower = itemName.toLowerCase()
      
      // First try exact match
      if (itemsIndex[queryLower]) {
        const itemId = itemsIndex[queryLower][0] // Get first match
        const itemData = items[itemId]
        
        if (itemData) {
          const result = { ...itemData, id: parseInt(itemId) }
          
          // Cache the result
          cache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
          })
          
          return result
        }
      }
      
      // Try partial matches
      for (const [name, ids] of Object.entries(itemsIndex)) {
        if (name.includes(queryLower)) {
          const itemId = ids[0] // Get first match
          const itemData = items[itemId]
          
          if (itemData) {
            const result = { ...itemData, id: parseInt(itemId) }
            
            // Cache the result
            cache.set(cacheKey, {
              data: result,
              timestamp: Date.now()
            })
            
            return result
          }
        }
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