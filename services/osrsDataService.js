import databaseService from './databaseService.js'
import { readFile, access } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ICONS_DIR = join(__dirname, '../icons/items')

/**
 * Database-backed data service for OSRS items
 */
class OSRSDataService {
  /**
   * Get item data by ID
   */
  static async getItemById(itemId, enableWikiLookup = true) {
    try {
      // Ensure database is initialized
      if (!databaseService.db) {
        await databaseService.init()
      }

      // Try to get from database first
      let itemData = databaseService.getItemById(itemId)
      
      if (!itemData && enableWikiLookup) {
        console.log(`🔍 Item ${itemId} not found in database, attempting wiki lookup...`)
        
        try {
          // Use WikiLookupService for dynamic lookup
          const { default: WikiLookupService } = await import('./wikiLookupService.js')
          const foundItem = await WikiLookupService.lookupItemById(itemId)
          
          if (foundItem) {
            // Convert to database format and save
            const dbItemData = {
              ...foundItem,
              icon_path: foundItem.icon,
              icon_url: foundItem.icon_url || null
            }
            
            databaseService.insertItem(dbItemData)
            itemData = databaseService.getItemById(itemId)
            
            if (itemData) {
              console.log(`✅ Found item ${itemId} via wiki lookup and added to database`)
            }
          }
        } catch (error) {
          console.error(`❌ Wiki lookup failed for item ${itemId}:`, error.message)
        }
      }
      
      if (!itemData) {
        console.warn(`⚠️  Item ${itemId} not found in database or wiki`)
        return this.createPlaceholderItem(itemId)
      }
      
      return itemData
    } catch (error) {
      console.error(`Error fetching item ${itemId}:`, error)
      return this.createPlaceholderItem(itemId)
    }
  }

  /**
   * Search items by name
   */
  static async searchItemsByName(query, limit = 10) {
    try {
      // Ensure database is initialized
      if (!databaseService.db) {
        await databaseService.init()
      }

      const items = databaseService.searchItems(query, limit)
      
      if (items.length === 0) {
        console.log(`🔍 No items found for "${query}" in database, attempting wiki lookup...`)
        
        try {
          // Use WikiLookupService for dynamic lookup
          const { default: WikiLookupService } = await import('./wikiLookupService.js')
          const foundItem = await WikiLookupService.lookupItemByName(query)
          
          if (foundItem) {
            // Convert to database format and save
            const dbItemData = {
              ...foundItem,
              icon_path: foundItem.icon,
              icon_url: foundItem.icon_url || null
            }
            
            databaseService.insertItem(dbItemData)
            return [databaseService.getItemById(foundItem.id)]
          }
        } catch (error) {
          console.error(`❌ Wiki lookup failed for "${query}":`, error.message)
        }
      }
      
      return items
    } catch (error) {
      console.error(`Error searching items for "${query}":`, error)
      return []
    }
  }

  /**
   * Get all items with pagination
   */
  static async getAllItems(page = 1, maxResults = 25) {
    try {
      // Ensure database is initialized
      if (!databaseService.db) {
        await databaseService.init()
      }

      // Calculate offset for pagination
      const offset = (page - 1) * maxResults

      // Get total count
      const countStmt = databaseService.db.prepare('SELECT COUNT(*) as count FROM items')
      const totalItems = countStmt.get().count

      // Get paginated results
      const stmt = databaseService.db.prepare(`
        SELECT i.*, 
               e.attack_stab, e.attack_slash, e.attack_crush, e.attack_magic, e.attack_ranged,
               e.defence_stab, e.defence_slash, e.defence_crush, e.defence_magic, e.defence_ranged,
               e.melee_strength, e.ranged_strength, e.magic_damage, e.prayer as equipment_prayer,
               e.slot, e.requirements,
               w.attack_speed, w.weapon_type, w.stab as weapon_stab, w.slash as weapon_slash,
               w.crush as weapon_crush, w.magic as weapon_magic, w.ranged as weapon_ranged
        FROM items i
        LEFT JOIN equipment_stats e ON i.id = e.item_id
        LEFT JOIN weapon_stats w ON i.id = w.item_id
        ORDER BY i.id
        LIMIT ? OFFSET ?
      `)

      const rows = stmt.all(maxResults, offset)
      const items = rows.map(row => databaseService.formatItemFromRow(row))
      
      return {
        items: items,
        pagination: {
          page: page,
          maxResults: maxResults,
          total: totalItems,
          totalPages: Math.ceil(totalItems / maxResults)
        }
      }
    } catch (error) {
      console.error('Error getting all items:', error)
      return {
        items: [],
        pagination: {
          page: page,
          maxResults: maxResults,
          total: 0,
          totalPages: 0
        }
      }
    }
  }

  /**
   * Get item icon as base64
   */
  static async getItemIconUrl(itemId) {
    try {
      // Get item data first to check if we have an icon path
      const itemData = await this.getItemById(itemId, false)
      
      if (itemData && itemData.icon_path) {
        try {
          // Try to read the icon file
          const iconBuffer = await readFile(itemData.icon_path)
          const base64Icon = iconBuffer.toString('base64')
          return `data:image/png;base64,${base64Icon}`
        } catch (iconError) {
          // Icon file doesn't exist, try default naming convention
        }
      }
      
      // Try default icon path
      const iconPath = join(ICONS_DIR, `${itemId}.png`)
      try {
        const iconBuffer = await readFile(iconPath)
        const base64Icon = iconBuffer.toString('base64')
        return `data:image/png;base64,${base64Icon}`
      } catch (iconError) {
        console.warn(`⚠️  No icon found for item ${itemId}`)
      }
      
      // Return placeholder icon
      const placeholderIcon = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      return `data:image/png;base64,${placeholderIcon}`
      
    } catch (error) {
      console.error(`Error getting item icon for ${itemId}:`, error)
      const placeholderIcon = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      return `data:image/png;base64,${placeholderIcon}`
    }
  }

  /**
   * Get database statistics
   */
  static async getStats() {
    try {
      if (!databaseService.db) {
        await databaseService.init()
      }
      return databaseService.getStats()
    } catch (error) {
      console.error('Error getting database stats:', error)
      return { items: 0, equipment: 0, weapons: 0, monsters: 0, prayers: 0 }
    }
  }

  /**
   * Create placeholder item for missing items
   */
  static createPlaceholderItem(itemId) {
    return {
      id: itemId,
      name: `Unknown Item (${itemId})`,
      examine: 'This item is not yet available in our database.',
      wiki_name: null,
      wiki_url: null,
      icon_path: null,
      icon_url: null,
      members: false,
      tradeable: false,
      tradeable_on_ge: false,
      stackable: false,
      noted: false,
      noteable: false,
      weight: 0,
      buy_limit: 0,
      quest_item: false,
      release_date: null,
      duplicate: false,
      equipable: false,
      equipable_by_player: false,
      equipable_weapon: false,
      cost: 0,
      lowalch: 0,
      highalch: 0,
      destruction: null,
      _missing: true, // Flag to indicate this is a placeholder
      last_updated: new Date().toISOString()
    }
  }

  /**
   * Get equipment item by ID (only items that are equipable)
   */
  static async getEquipmentById(itemId, enableWikiLookup = true) {
    try {
      const item = await this.getItemById(itemId, enableWikiLookup)
      
      if (!item) {
        throw new Error(`Equipment item ${itemId} not found`)
      }
      
      if (!item.equipable) {
        throw new Error(`Item ${itemId} is not equipable`)
      }
      
      return item
    } catch (error) {
      console.error(`Error fetching equipment ${itemId}:`, error)
      throw error
    }
  }

  /**
   * Get weapon item by ID (only items that are weapons)
   */
  static async getWeaponById(itemId, enableWikiLookup = true) {
    try {
      const item = await this.getItemById(itemId, enableWikiLookup)
      
      if (!item) {
        throw new Error(`Weapon item ${itemId} not found`)
      }
      
      if (!item.equipable_weapon) {
        throw new Error(`Item ${itemId} is not a weapon`)
      }
      
      return item
    } catch (error) {
      console.error(`Error fetching weapon ${itemId}:`, error)
      throw error
    }
  }

  /**
   * Get all equipable items
   */
  static async getAllEquipment() {
    try {
      // Ensure database is initialized
      if (!databaseService.db) {
        await databaseService.init()
      }

      const stmt = databaseService.db.prepare(`
        SELECT i.*, 
               e.attack_stab, e.attack_slash, e.attack_crush, e.attack_magic, e.attack_ranged,
               e.defence_stab, e.defence_slash, e.defence_crush, e.defence_magic, e.defence_ranged,
               e.melee_strength, e.ranged_strength, e.magic_damage, e.prayer as equipment_prayer,
               e.slot, e.requirements,
               w.attack_speed, w.weapon_type, w.stab as weapon_stab, w.slash as weapon_slash,
               w.crush as weapon_crush, w.magic as weapon_magic, w.ranged as weapon_ranged
        FROM items i
        LEFT JOIN equipment_stats e ON i.id = e.item_id
        LEFT JOIN weapon_stats w ON i.id = w.item_id
        WHERE i.equipable = 1
        ORDER BY i.name
      `)

      const rows = stmt.all()
      return rows.map(row => databaseService.formatItemFromRow(row))
    } catch (error) {
      console.error('Error fetching all equipment:', error)
      return []
    }
  }

  /**
   * Get all weapon items
   */
  static async getAllWeapons() {
    try {
      // Ensure database is initialized
      if (!databaseService.db) {
        await databaseService.init()
      }

      const stmt = databaseService.db.prepare(`
        SELECT i.*, 
               e.attack_stab, e.attack_slash, e.attack_crush, e.attack_magic, e.attack_ranged,
               e.defence_stab, e.defence_slash, e.defence_crush, e.defence_magic, e.defence_ranged,
               e.melee_strength, e.ranged_strength, e.magic_damage, e.prayer as equipment_prayer,
               e.slot, e.requirements,
               w.attack_speed, w.weapon_type, w.stab as weapon_stab, w.slash as weapon_slash,
               w.crush as weapon_crush, w.magic as weapon_magic, w.ranged as weapon_ranged
        FROM items i
        LEFT JOIN equipment_stats e ON i.id = e.item_id
        LEFT JOIN weapon_stats w ON i.id = w.item_id
        WHERE i.equipable_weapon = 1
        ORDER BY i.name
      `)

      const rows = stmt.all()
      return rows.map(row => databaseService.formatItemFromRow(row))
    } catch (error) {
      console.error('Error fetching all weapons:', error)
      return []
    }
  }

  /**
   * Get monster by ID
   * @param {number} monsterId - Monster ID
   * @returns {Promise<Object>} Monster data
   */
  static async getMonsterById(monsterId) {
    try {
      await databaseService.init()
      
      const stmt = databaseService.db.prepare(`
        SELECT * FROM monsters WHERE id = ?
      `)
      
      const monster = stmt.get(monsterId)
      if (!monster) {
        throw new Error(`Monster with ID ${monsterId} not found`)
      }
      
      return monster
    } catch (error) {
      console.error(`Error fetching monster ${monsterId}:`, error)
      throw error
    }
  }

  /**
   * Get all monsters with pagination
   * @param {number} page - Page number (1-based)
   * @param {number} limit - Number of monsters per page
   * @returns {Promise<Object>} Paginated monsters data
   */
  static async getAllMonsters(page = 1, limit = 25) {
    try {
      await databaseService.init()
      
      const offset = (page - 1) * limit
      
      // Get total count
      const countStmt = databaseService.db.prepare('SELECT COUNT(*) as count FROM monsters')
      const { count: total } = countStmt.get()
      
      // Get paginated results
      const stmt = databaseService.db.prepare(`
        SELECT * FROM monsters
        ORDER BY name
        LIMIT ? OFFSET ?
      `)
      
      const monsters = stmt.all(limit, offset)
      
      return {
        results: monsters,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    } catch (error) {
      console.error('Error fetching all monsters:', error)
      throw error
    }
  }

  /**
   * Get prayer by ID
   * @param {number} prayerId - Prayer ID
   * @returns {Promise<Object>} Prayer data
   */
  static async getPrayerById(prayerId) {
    try {
      await databaseService.init()
      
      const stmt = databaseService.db.prepare(`
        SELECT * FROM prayers WHERE id = ?
      `)
      
      const prayer = stmt.get(prayerId)
      if (!prayer) {
        throw new Error(`Prayer with ID ${prayerId} not found`)
      }
      
      return prayer
    } catch (error) {
      console.error(`Error fetching prayer ${prayerId}:`, error)
      throw error
    }
  }

  /**
   * Get all prayers with pagination
   * @param {number} page - Page number (1-based)
   * @param {number} limit - Number of prayers per page
   * @returns {Promise<Object>} Paginated prayers data
   */
  static async getAllPrayers(page = 1, limit = 25) {
    try {
      await databaseService.init()
      
      const offset = (page - 1) * limit
      
      // Get total count
      const countStmt = databaseService.db.prepare('SELECT COUNT(*) as count FROM prayers')
      const { count: total } = countStmt.get()
      
      // Get paginated results
      const stmt = databaseService.db.prepare(`
        SELECT * FROM prayers
        ORDER BY level_required, name
        LIMIT ? OFFSET ?
      `)
      
      const prayers = stmt.all(limit, offset)
      
      return {
        results: prayers,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    } catch (error) {
      console.error('Error fetching all prayers:', error)
      throw error
    }
  }

  /**
   * Get database summary including items, monsters, and prayers
   * @returns {Promise<Object>} Database summary
   */
  static async getDataSummary() {
    try {
      await databaseService.init()
      
      // Get counts from all tables
      const itemsCount = databaseService.db.prepare('SELECT COUNT(*) as count FROM items').get().count
      const monstersCount = databaseService.db.prepare('SELECT COUNT(*) as count FROM monsters').get().count
      const prayersCount = databaseService.db.prepare('SELECT COUNT(*) as count FROM prayers').get().count
      
      return {
        items: itemsCount,
        monsters: monstersCount,
        prayers: prayersCount,
        total: itemsCount + monstersCount + prayersCount
      }
    } catch (error) {
      console.error('Error getting data summary:', error)
      throw error
    }
  }
}

export default OSRSDataService
