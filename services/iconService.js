import databaseService from './databaseService.js'

/**
 * Detect image format from buffer
 */
function detectImageFormat(buffer) {
  if (!buffer || buffer.length < 8) return 'png'
  
  const hex = buffer.slice(0, 8).toString('hex')
  
  if (hex.startsWith('89504e47')) return 'png'
  if (hex.startsWith('52494646')) return 'webp'  // RIFF (WebP)
  if (hex.startsWith('ffd8ff')) return 'jpeg'
  if (hex.startsWith('47494638')) return 'gif'
  
  return 'png' // default fallback
}

/**
 * Database-only icon service - all icons must be stored in the database
 */
class IconService {
  /**
   * Get item icon as base64 data URL from database only
   */
  static async getItemIcon(itemId) {
    try {
      const iconBuffer = databaseService.getIconData(itemId)
      if (iconBuffer && iconBuffer.length > 0) {
        const format = detectImageFormat(iconBuffer)
        const base64Data = iconBuffer.toString('base64')
        return `data:image/${format};base64,${base64Data}`
      }
      
      console.warn(`No icon found in database for item ${itemId}`)
      return null
      
    } catch (error) {
      console.error(`Error getting icon for item ${itemId}:`, error)
      return null
    }
  }
  
  /**
   * Get item icon as raw buffer from database only
   */
  static async getItemIconBuffer(itemId) {
    try {
      const iconBuffer = databaseService.getIconData(itemId)
      if (iconBuffer && iconBuffer.length > 0) {
        return iconBuffer
      }
      
      console.warn(`No icon found in database for item ${itemId}`)
      return null
      
    } catch (error) {
      console.error(`Error getting icon buffer for item ${itemId}:`, error)
      return null
    }
  }

  /**
   * Check if an item has an icon in the database
   */
  static hasIcon(itemId) {
    try {
      const iconBuffer = databaseService.getIconData(itemId)
      return iconBuffer && iconBuffer.length > 0
    } catch (error) {
      return false
    }
  }

  /**
   * Get all items that have icons in the database
   */
  static getItemsWithIcons() {
    try {
      const db = databaseService.db
      const itemsWithIcons = db.prepare(`
        SELECT id, name, length(icon_data) as icon_size 
        FROM items 
        WHERE icon_data IS NOT NULL AND length(icon_data) > 0
        ORDER BY id
      `).all()
      
      return itemsWithIcons
    } catch (error) {
      console.error('Error getting items with icons:', error)
      return []
    }
  }

  /**
   * Get items without icons (for fixing purposes)
   */
  static getItemsWithoutIcons() {
    try {
      const db = databaseService.db
      const itemsWithoutIcons = db.prepare(`
        SELECT id, name 
        FROM items 
        WHERE icon_data IS NULL OR length(icon_data) = 0
        ORDER BY id
      `).all()
      
      return itemsWithoutIcons
    } catch (error) {
      console.error('Error getting items without icons:', error)
      return []
    }
  }

  /**
   * Get skill icon as base64 data URL from database only
   * Uses negative ID mapping for skill icons (-1 to -24)
   */
  static async getSkillIcon(skillName) {
    try {
      // Try new special_icons table first
      const specialIcon = await this.getSkillIconFromSpecialTable(skillName)
      if (specialIcon) {
        return specialIcon
      }
      
      // Fallback to old method with negative IDs
      const skillId = this.getSkillIconId(skillName)
      const iconBuffer = databaseService.getIconData(skillId)
      
      if (iconBuffer && iconBuffer.length > 0) {
        const format = detectImageFormat(iconBuffer)
        return `data:image/${format};base64,${iconBuffer.toString('base64')}`
      }
      
      console.warn(`No skill icon found in database for ${skillName} (ID: ${skillId})`)
      return null
      
    } catch (error) {
      console.error(`Error loading skill icon ${skillName}:`, error)
      return null
    }
  }

  /**
   * Get skill icon ID (negative IDs for skill icons)
   */
  static getSkillIconId(skillName) {
    const skillIds = {
      'attack': -1,
      'defence': -2, 
      'strength': -3,
      'hitpoints': -4,
      'ranged': -5,
      'prayer': -6,
      'magic': -7,
      'cooking': -8,
      'woodcutting': -9,
      'fletching': -10,
      'fishing': -11,
      'firemaking': -12,
      'crafting': -13,
      'smithing': -14,
      'mining': -15,
      'herblore': -16,
      'agility': -17,
      'thieving': -18,
      'slayer': -19,
      'farming': -20,
      'runecraft': -21,
      'hunter': -22,
      'construction': -23,
      'overall': -24
    }
    
    return skillIds[skillName.toLowerCase()] || -999
  }

  /**
   * Get collection log background icon from database
   * Should be stored with a special negative ID
   */
  static async getCollectionLogIcon() {
    try {
      // Try new special_icons table first
      const specialIcon = await this.getCollectionLogIconFromSpecialTable()
      if (specialIcon) {
        return specialIcon
      }
      
      // Fallback to old method with negative ID
      const iconBuffer = databaseService.getIconData(-100)
      if (iconBuffer && iconBuffer.length > 0) {
        const format = detectImageFormat(iconBuffer)
        return `data:image/${format};base64,${iconBuffer.toString('base64')}`
      }
      
      console.warn('No collection log icon found in database')
      return null
    } catch (error) {
      console.error('Error loading collection log icon:', error)
      return null
    }
  }

  /**
   * Get icon statistics
   */
  static getIconStats() {
    try {
      const db = databaseService.db
      
      const totalItems = db.prepare('SELECT COUNT(*) as count FROM items').get().count
      const itemsWithIcons = db.prepare('SELECT COUNT(*) as count FROM items WHERE icon_data IS NOT NULL AND length(icon_data) > 0').get().count
      const itemsWithoutIcons = totalItems - itemsWithIcons
      
      const averageIconSize = db.prepare('SELECT AVG(length(icon_data)) as avg_size FROM items WHERE icon_data IS NOT NULL AND length(icon_data) > 0').get().avg_size
      const totalIconSize = db.prepare('SELECT SUM(length(icon_data)) as total_size FROM items WHERE icon_data IS NOT NULL AND length(icon_data) > 0').get().total_size
      
      return {
        totalItems,
        itemsWithIcons,
        itemsWithoutIcons,
        coveragePercentage: ((itemsWithIcons / totalItems) * 100).toFixed(2),
        averageIconSize: Math.round(averageIconSize || 0),
        totalIconSize: totalIconSize || 0
      }
    } catch (error) {
      console.error('Error getting icon stats:', error)
      return null
    }
  }

  /**
   * Check if skill icon exists in database
   */
  static hasSkillIcon(skillName) {
    try {
      const skillId = this.getSkillIconId(skillName)
      const iconBuffer = databaseService.getIconData(skillId)
      return iconBuffer && iconBuffer.length > 0
    } catch (error) {
      return false
    }
  }

  /**
   * Get all skill icons that are missing from database
   */
  static getMissingSkillIcons() {
    const skills = [
      'attack', 'defence', 'strength', 'hitpoints', 'ranged', 'prayer', 'magic',
      'cooking', 'woodcutting', 'fletching', 'fishing', 'firemaking', 'crafting',
      'smithing', 'mining', 'herblore', 'agility', 'thieving', 'slayer', 'farming',
      'runecraft', 'hunter', 'construction', 'overall'
    ]
    
    return skills.filter(skill => !this.hasSkillIcon(skill))
  }

  /**
   * Get skill icon from the special_icons table (NEW METHOD)
   */
  static async getSkillIconFromSpecialTable(skillName) {
    try {
      const db = databaseService.db
      const skillIcon = db.prepare(`
        SELECT icon_data, icon_mime_type 
        FROM special_icons 
        WHERE name = ? AND type = 'skill'
      `).get(skillName.toLowerCase())
      
      if (skillIcon && skillIcon.icon_data) {
        const mimeType = skillIcon.icon_mime_type || 'image/png'
        return `data:${mimeType};base64,${skillIcon.icon_data}`
      }
      
      console.warn(`No skill icon found in special_icons table for ${skillName}`)
      return null
      
    } catch (error) {
      console.error(`Error loading skill icon ${skillName}:`, error)
      return null
    }
  }

  /**
   * Get collection log background from the special_icons table (NEW METHOD)
   */
  static async getCollectionLogIconFromSpecialTable() {
    try {
      const db = databaseService.db
      const bgIcon = db.prepare(`
        SELECT icon_data, icon_mime_type 
        FROM special_icons 
        WHERE type = 'background' AND name = 'collection-log-background'
      `).get()
      
      if (bgIcon && bgIcon.icon_data) {
        const mimeType = bgIcon.icon_mime_type || 'image/png'
        return `data:${mimeType};base64,${bgIcon.icon_data}`
      }
      
      console.warn('No collection log background found in special_icons table')
      return null
    } catch (error) {
      console.error('Error loading collection log background:', error)
      return null
    }
  }
}

export default IconService
