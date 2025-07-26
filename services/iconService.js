import databaseService from './databaseService.js'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { readFile } from 'fs/promises'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Enhanced file service that retrieves icons from database first, then falls back to filesystem
 */
class IconService {
  /**
   * Get item icon as base64 data URL, prioritizing database storage
   */
  static async getItemIcon(itemId) {
    try {
      // First, try to get from database
      const iconBuffer = databaseService.getIconData(itemId)
      if (iconBuffer) {
        const base64Data = iconBuffer.toString('base64')
        return `data:image/png;base64,${base64Data}`
      }
      
      // Fall back to filesystem (for backward compatibility during migration)
      try {
        const iconPath = join(__dirname, '../icons/items', `${itemId}.png`)
        const iconBuffer = await readFile(iconPath)
        const base64Data = iconBuffer.toString('base64')
        return `data:image/png;base64,${base64Data}`
      } catch (fsError) {
        console.warn(`Icon not found for item ${itemId} in database or filesystem`)
        return null
      }
      
    } catch (error) {
      console.error(`Error getting icon for item ${itemId}:`, error)
      return null
    }
  }
  
  /**
   * Get item icon as raw buffer from database or filesystem
   */
  static async getItemIconBuffer(itemId) {
    try {
      // First, try to get from database
      const iconBuffer = databaseService.getIconData(itemId)
      if (iconBuffer) {
        return iconBuffer
      }
      
      // Fall back to filesystem
      try {
        const iconPath = join(__dirname, '../icons/items', `${itemId}.png`)
        return await readFile(iconPath)
      } catch (fsError) {
        console.warn(`Icon not found for item ${itemId} in database or filesystem`)
        return null
      }
      
    } catch (error) {
      console.error(`Error getting icon buffer for item ${itemId}:`, error)
      return null
    }
  }
  
  /**
   * Check if item has an icon (in database or filesystem)
   */
  static async hasItemIcon(itemId) {
    try {
      // Check database first
      if (databaseService.hasIconData(itemId)) {
        return true
      }
      
      // Check filesystem
      try {
        const iconPath = join(__dirname, '../icons/items', `${itemId}.png`)
        await readFile(iconPath)
        return true
      } catch {
        return false
      }
      
    } catch (error) {
      console.error(`Error checking icon for item ${itemId}:`, error)
      return false
    }
  }
  
  /**
   * Get skill icon (these remain on filesystem)
   */
  static async getSkillIcon(skillName) {
    try {
      const iconPath = join(__dirname, '../icons', `${skillName}.png`)
      const imageBuffer = await readFile(iconPath)
      return `data:image/png;base64,${imageBuffer.toString('base64')}`
    } catch (error) {
      console.error(`Error loading skill icon ${skillName}:`, error)
      return null
    }
  }
  
  /**
   * Get collection log background icon
   */
  static async getCollectionLogIcon() {
    try {
      // Use process.cwd() which is more reliable in server context
      const iconPath = join(process.cwd(), 'icons/collection-log.png')
      const imageBuffer = await readFile(iconPath)
      return `data:image/png;base64,${imageBuffer.toString('base64')}`
    } catch (error) {
      console.error('Error loading collection log icon:', error)
      return null
    }
  }
  
  /**
   * Get icon statistics
   */
  static getIconStats() {
    return databaseService.getStats()
  }
}

export default IconService
