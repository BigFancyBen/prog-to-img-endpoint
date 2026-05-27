import Database from 'better-sqlite3'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { mkdir } from 'fs/promises'
import { config } from '../config/environment.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Use configuration for database paths
const DB_DIR = join(process.cwd(), 'data')
const DB_PATH = config.database.path

// Performance optimizations with configuration
const CACHE_SIZE = config.database.cacheSize
const STATEMENT_CACHE = new Map() // Prepared statement cache
const QUERY_CACHE = new Map() // Query result cache
const CACHE_TTL = config.cache.ttl // 5 minutes TTL

/**
 * SQLite database service for OSRS data with performance optimizations
 */
class DatabaseService {
  constructor() {
    this.db = null
    this.initialized = false
    this.initPromise = null
  }

  /**
   * Initialize the database and create tables (singleton pattern)
   */
  async init() {
    // Return existing promise if already initializing
    if (this.initPromise) {
      return this.initPromise
    }

    // Return immediately if already initialized
    if (this.initialized && this.db) {
      return
    }

    this.initPromise = this._initDatabase()
    return this.initPromise
  }

  async _initDatabase() {
    try {
      // Ensure data directory exists
      await mkdir(DB_DIR, { recursive: true })
      
      // Check if database already exists and has data
      const { existsSync } = await import('fs')
      const dbExists = existsSync(DB_PATH)
      
      // Open database connection
      this.db = new Database(DB_PATH)
      
      // Enhanced performance optimizations with configuration
      this.db.pragma('journal_mode = WAL')
      this.db.pragma('synchronous = NORMAL')
      this.db.pragma(`cache_size = ${config.database.cacheSize}`)
      this.db.pragma('temp_store = memory')
      this.db.pragma(`mmap_size = ${config.database.mmapSize}`) // 256MB memory mapping
      this.db.pragma(`page_size = ${config.database.pageSize}`)
      this.db.pragma(`auto_vacuum = ${config.database.autoVacuum}`)
      
      // Check if database has items before creating tables
      let itemCount = 0
      try {
        itemCount = this.db.prepare('SELECT COUNT(*) as count FROM items').get().count
      } catch (error) {
        // Table doesn't exist, will create
      }
      
      // Create tables (this won't overwrite existing data)
      this.createTables()
      
      // Verify initialization
      try {
        itemCount = this.db.prepare('SELECT COUNT(*) as count FROM items').get().count
      } catch (error) {
        // New database
      }
      
      this.initialized = true
      this.initPromise = null
      
      console.log('Database initialized successfully', { 
        path: DB_PATH,
        cacheSize: config.database.cacheSize,
        mmapSize: config.database.mmapSize
      })
    } catch (error) {
      this.initPromise = null
      console.error('Failed to initialize database', { 
        error: error.message,
        path: DB_PATH
      })
      throw error
    }
  }

  /**
   * Create database tables
   */
  createTables() {
    // Items table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        examine TEXT,
        wiki_name TEXT,
        wiki_url TEXT,
        icon_path TEXT,
        icon_url TEXT,
        icon_data BLOB,
        members BOOLEAN,
        tradeable BOOLEAN,
        tradeable_on_ge BOOLEAN,
        stackable BOOLEAN,
        noted BOOLEAN,
        noteable BOOLEAN,
        weight REAL,
        buy_limit INTEGER,
        quest_item BOOLEAN,
        release_date TEXT,
        duplicate BOOLEAN DEFAULT FALSE,
        equipable BOOLEAN DEFAULT FALSE,
        equipable_by_player BOOLEAN DEFAULT FALSE,
        equipable_weapon BOOLEAN DEFAULT FALSE,
        cost INTEGER,
        lowalch INTEGER,
        highalch INTEGER,
        destruction TEXT,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Add icon_data column to existing tables if it doesn't exist
    try {
      this.db.exec(`ALTER TABLE items ADD COLUMN icon_data BLOB`)
    } catch (error) {
      // Column already exists, ignore error
    }

    // Equipment stats table (for equipable items)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS equipment_stats (
        item_id INTEGER PRIMARY KEY,
        attack_stab INTEGER DEFAULT 0,
        attack_slash INTEGER DEFAULT 0,
        attack_crush INTEGER DEFAULT 0,
        attack_magic INTEGER DEFAULT 0,
        attack_ranged INTEGER DEFAULT 0,
        defence_stab INTEGER DEFAULT 0,
        defence_slash INTEGER DEFAULT 0,
        defence_crush INTEGER DEFAULT 0,
        defence_magic INTEGER DEFAULT 0,
        defence_ranged INTEGER DEFAULT 0,
        melee_strength INTEGER DEFAULT 0,
        ranged_strength INTEGER DEFAULT 0,
        magic_damage INTEGER DEFAULT 0,
        prayer INTEGER DEFAULT 0,
        slot TEXT,
        requirements TEXT,
        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
      )
    `)

    // Weapon stats table (for weapons)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS weapon_stats (
        item_id INTEGER PRIMARY KEY,
        attack_speed INTEGER,
        weapon_type TEXT,
        stab INTEGER DEFAULT 0,
        slash INTEGER DEFAULT 0,
        crush INTEGER DEFAULT 0,
        magic INTEGER DEFAULT 0,
        ranged INTEGER DEFAULT 0,
        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
      )
    `)

    // Monsters table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS monsters (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        examine TEXT,
        wiki_name TEXT,
        wiki_url TEXT,
        icon_path TEXT,
        members BOOLEAN,
        release_date TEXT,
        combat_level INTEGER,
        hitpoints INTEGER,
        max_hit INTEGER,
        attack_type TEXT,
        attack_speed INTEGER,
        aggressive BOOLEAN,
        poisonous BOOLEAN,
        immune_poison BOOLEAN,
        immune_venom BOOLEAN,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Prayers table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS prayers (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        examine TEXT,
        wiki_name TEXT,
        wiki_url TEXT,
        icon_path TEXT,
        members BOOLEAN,
        level_required INTEGER,
        drain_rate REAL,
        book TEXT,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Special icons table for skill icons and collection log background
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS special_icons (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        icon_data BLOB,
        icon_type TEXT,
        type TEXT,
        icon_mime_type TEXT,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Add missing columns to existing special_icons table if they don't exist
    try {
      this.db.exec(`ALTER TABLE special_icons ADD COLUMN icon_mime_type TEXT`)
    } catch (error) {
      // Column already exists, ignore error
    }
    
    try {
      this.db.exec(`ALTER TABLE special_icons ADD COLUMN type TEXT`)
    } catch (error) {
      // Column already exists, ignore error
    }

    // Create indexes for better performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
      CREATE INDEX IF NOT EXISTS idx_items_members ON items(members);
      CREATE INDEX IF NOT EXISTS idx_items_tradeable ON items(tradeable);
      CREATE INDEX IF NOT EXISTS idx_items_equipable ON items(equipable);
      CREATE INDEX IF NOT EXISTS idx_monsters_name ON monsters(name);
      CREATE INDEX IF NOT EXISTS idx_monsters_combat_level ON monsters(combat_level);
      CREATE INDEX IF NOT EXISTS idx_prayers_name ON prayers(name);
      CREATE INDEX IF NOT EXISTS idx_prayers_level ON prayers(level_required);
    `)

    console.log('✅ Database tables created successfully')
  }

  /**
   * Insert or update an item
   */
  insertItem(itemData) {
    // Preserve existing icon_data when the new value is null
    const iconData = itemData.icon_data || null
    const iconPath = itemData.icon_path || null
    let resolvedIconData = iconData
    let resolvedIconPath = iconPath
    if (!iconData) {
      const existing = this.db.prepare('SELECT icon_data, icon_path FROM items WHERE id = ?').get(itemData.id)
      if (existing) {
        resolvedIconData = existing.icon_data || null
        resolvedIconPath = existing.icon_path || iconPath
      }
    }

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO items (
        id, name, examine, wiki_name, wiki_url, icon_path, icon_url, icon_data,
        members, tradeable, tradeable_on_ge, stackable, noted, noteable,
        weight, buy_limit, quest_item, release_date, duplicate,
        equipable, equipable_by_player, equipable_weapon,
        cost, lowalch, highalch, destruction, last_updated
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `)

    const result = stmt.run(
      itemData.id,
      itemData.name,
      itemData.examine,
      itemData.wiki_name,
      itemData.wiki_url,
      resolvedIconPath,
      itemData.icon_url || null,
      resolvedIconData,
      itemData.members ? 1 : 0,
      itemData.tradeable ? 1 : 0,
      itemData.tradeable_on_ge ? 1 : 0,
      itemData.stackable ? 1 : 0,
      itemData.noted ? 1 : 0,
      itemData.noteable ? 1 : 0,
      itemData.weight,
      itemData.buy_limit,
      itemData.quest_item ? 1 : 0,
      itemData.release_date,
      itemData.duplicate ? 1 : 0,
      itemData.equipable ? 1 : 0,
      itemData.equipable_by_player ? 1 : 0,
      itemData.equipable_weapon ? 1 : 0,
      itemData.cost,
      itemData.lowalch,
      itemData.highalch,
      itemData.destruction,
      new Date().toISOString()
    )

    // Insert equipment stats if item is equipable
    if (itemData.equipment) {
      this.insertEquipmentStats(itemData.id, itemData.equipment)
    }

    // Insert weapon stats if item is a weapon
    if (itemData.weapon) {
      this.insertWeaponStats(itemData.id, itemData.weapon)
    }

    return result
  }

  /**
   * Insert equipment stats
   */
  insertEquipmentStats(itemId, equipment) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO equipment_stats (
        item_id, attack_stab, attack_slash, attack_crush, attack_magic, attack_ranged,
        defence_stab, defence_slash, defence_crush, defence_magic, defence_ranged,
        melee_strength, ranged_strength, magic_damage, prayer, slot, requirements
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    return stmt.run(
      itemId,
      equipment.attack_stab || 0,
      equipment.attack_slash || 0,
      equipment.attack_crush || 0,
      equipment.attack_magic || 0,
      equipment.attack_ranged || 0,
      equipment.defence_stab || 0,
      equipment.defence_slash || 0,
      equipment.defence_crush || 0,
      equipment.defence_magic || 0,
      equipment.defence_ranged || 0,
      equipment.melee_strength || 0,
      equipment.ranged_strength || 0,
      equipment.magic_damage || 0,
      equipment.prayer || 0,
      equipment.slot,
      JSON.stringify(equipment.requirements)
    )
  }

  /**
   * Insert weapon stats
   */
  insertWeaponStats(itemId, weapon) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO weapon_stats (
        item_id, attack_speed, weapon_type, stab, slash, crush, magic, ranged
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    return stmt.run(
      itemId,
      weapon.attack_speed,
      weapon.weapon_type,
      weapon.stab || 0,
      weapon.slash || 0,
      weapon.crush || 0,
      weapon.magic || 0,
      weapon.ranged || 0
    )
  }

  /**
   * Get item by ID with caching
   */
  getItemById(itemId) {
    try {
      // Check cache first
      const cacheKey = `item_${itemId}`
      const cached = this.getCachedResult(cacheKey)
      if (cached) {
        console.log(`Database query: SELECT * FROM items WHERE id = ${itemId} (cached: true)`)
        return cached
      }

      const stmt = this.getPreparedStatement(`
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
        WHERE i.id = ?
      `)

      const row = stmt.get(itemId)
      if (!row) return null

      const result = this.formatItemFromRow(row)
      
      // Cache the result
      this.setCachedResult(cacheKey, result)
      
      console.log(`Database query: SELECT * FROM items WHERE id = ${itemId} (cached: false)`)
      return result
    } catch (error) {
      console.error(`Database error: SELECT * FROM items WHERE id = ${itemId}`, error)
      return null
    }
  }

  /**
   * Search items by name
   */
  searchItems(query, limit = 10) {
    const stmt = this.db.prepare(`
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
      WHERE i.name LIKE ? OR i.examine LIKE ?
      ORDER BY i.name
      LIMIT ?
    `)

    const searchPattern = `%${query}%`
    const rows = stmt.all(searchPattern, searchPattern, limit)
    
    return rows.map(row => this.formatItemFromRow(row))
  }

  /**
   * Search items by name only with caching
   */
  searchItemsByNameOnly(query, limit = 10) {
    if (!this.db) {
      throw new Error('Database not initialized')
    }
    
    // Clean the query to handle potential encoding issues
    const cleanQuery = query.trim()
    if (!cleanQuery) {
      return []
    }
    
    // Check cache first
    const cacheKey = `search_${cleanQuery}_${limit}`
    const cached = this.getCachedResult(cacheKey)
    if (cached) {
              console.log(`Database query: SELECT * FROM items WHERE name LIKE '%${cleanQuery}%' (cached: true, limit: ${limit})`)
      return cached
    }
    
    const stmt = this.db.prepare(`
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
      WHERE i.name LIKE ? COLLATE NOCASE
      ORDER BY 
        CASE WHEN LOWER(i.name) = LOWER(?) THEN 0 ELSE 1 END,
        i.name
      LIMIT ?
    `)

    const searchPattern = `%${cleanQuery}%`
    const rows = stmt.all(searchPattern, cleanQuery, limit)
    const result = rows.map(row => this.formatItemFromRow(row))
    
    // Cache the result
    this.setCachedResult(cacheKey, result)
    
            console.log(`Database query: SELECT * FROM items WHERE name LIKE '%${cleanQuery}%' (cached: false, limit: ${limit}, results: ${result.length})`)
    return result
  }

  /**
   * Get all items
   */
  getAllItems() {
    const stmt = this.db.prepare(`
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
    `)

    const rows = stmt.all()
    return rows.map(row => this.formatItemFromRow(row))
  }

  /**
   * Format item data from database row
   */
  formatItemFromRow(row) {
    const item = {
      id: row.id,
      name: row.name,
      examine: row.examine,
      wiki_name: row.wiki_name,
      wiki_url: row.wiki_url,
      icon_path: row.icon_path,
      icon_url: row.icon_url,
      members: Boolean(row.members),
      tradeable: Boolean(row.tradeable),
      tradeable_on_ge: Boolean(row.tradeable_on_ge),
      stackable: Boolean(row.stackable),
      noted: Boolean(row.noted),
      noteable: Boolean(row.noteable),
      weight: row.weight,
      buy_limit: row.buy_limit,
      quest_item: Boolean(row.quest_item),
      release_date: row.release_date,
      duplicate: Boolean(row.duplicate),
      equipable: Boolean(row.equipable),
      equipable_by_player: Boolean(row.equipable_by_player),
      equipable_weapon: Boolean(row.equipable_weapon),
      cost: row.cost,
      lowalch: row.lowalch,
      highalch: row.highalch,
      destruction: row.destruction,
      last_updated: row.last_updated
    }

    // Add equipment stats if available
    if (row.slot) {
      item.equipment = {
        attack_stab: row.attack_stab || 0,
        attack_slash: row.attack_slash || 0,
        attack_crush: row.attack_crush || 0,
        attack_magic: row.attack_magic || 0,
        attack_ranged: row.attack_ranged || 0,
        defence_stab: row.defence_stab || 0,
        defence_slash: row.defence_slash || 0,
        defence_crush: row.defence_crush || 0,
        defence_magic: row.defence_magic || 0,
        defence_ranged: row.defence_ranged || 0,
        melee_strength: row.melee_strength || 0,
        ranged_strength: row.ranged_strength || 0,
        magic_damage: row.magic_damage || 0,
        prayer: row.equipment_prayer || 0,
        slot: row.slot,
        requirements: row.requirements ? JSON.parse(row.requirements) : null
      }
    }

    // Add weapon stats if available
    if (row.attack_speed) {
      item.weapon = {
        attack_speed: row.attack_speed,
        weapon_type: row.weapon_type,
        stab: row.weapon_stab || 0,
        slash: row.weapon_slash || 0,
        crush: row.weapon_crush || 0,
        magic: row.weapon_magic || 0,
        ranged: row.weapon_ranged || 0
      }
    }

    return item
  }

  /**
   * Store icon data as BLOB in database
   */
  storeIconData(itemId, iconBuffer) {
    try {
      const stmt = this.db.prepare(`
        UPDATE items 
        SET icon_data = ? 
        WHERE id = ?
      `)
      const result = stmt.run(iconBuffer, itemId)
      return result.changes > 0
    } catch (error) {
      console.error(`Error storing icon data for item ${itemId}:`, error)
      return false
    }
  }

  /**
   * Get icon data from database
   */
  getIconData(itemId) {
    try {
      const stmt = this.db.prepare(`
        SELECT icon_data 
        FROM items 
        WHERE id = ? AND icon_data IS NOT NULL
      `)
      const row = stmt.get(itemId)
      return row ? row.icon_data : null
    } catch (error) {
      console.error(`Error getting icon data for item ${itemId}:`, error)
      return null
    }
  }

  /**
   * Check if item has icon data stored
   */
  hasIconData(itemId) {
    try {
      const stmt = this.db.prepare(`
        SELECT 1 
        FROM items 
        WHERE id = ? AND icon_data IS NOT NULL
      `)
      return stmt.get(itemId) !== undefined
    } catch (error) {
      console.error(`Error checking icon data for item ${itemId}:`, error)
      return false
    }
  }

  /**
   * Get all items with missing icon data
   */
  getItemsWithoutIcons() {
    try {
      const stmt = this.db.prepare(`
        SELECT id, name, icon_path, icon_url
        FROM items 
        WHERE icon_data IS NULL
        ORDER BY id
      `)
      return stmt.all()
    } catch (error) {
      console.error('Error getting items without icons:', error)
      return []
    }
  }

  /**
   * Get database statistics including icon data
   */
  getStats() {
    const itemCount = this.db.prepare('SELECT COUNT(*) as count FROM items').get().count
    const itemsWithIcons = this.db.prepare('SELECT COUNT(*) as count FROM items WHERE icon_data IS NOT NULL').get().count
    const equipmentCount = this.db.prepare('SELECT COUNT(*) as count FROM equipment_stats').get().count
    const weaponCount = this.db.prepare('SELECT COUNT(*) as count FROM weapon_stats').get().count
    const monsterCount = this.db.prepare('SELECT COUNT(*) as count FROM monsters').get().count
    const prayerCount = this.db.prepare('SELECT COUNT(*) as count FROM prayers').get().count

    return {
      items: itemCount,
      itemsWithIcons: itemsWithIcons,
      iconCoverage: itemCount > 0 ? ((itemsWithIcons / itemCount) * 100).toFixed(1) + '%' : '0%',
      equipment: equipmentCount,
      weapons: weaponCount,
      monsters: monsterCount,
      prayers: prayerCount
    }
  }

  /**
   * Get cached result or null if not found/expired
   */
  getCachedResult(key) {
    const cached = QUERY_CACHE.get(key)
    if (!cached) return null
    
    if (Date.now() - cached.timestamp > CACHE_TTL) {
      QUERY_CACHE.delete(key)
      return null
    }
    
    return cached.data
  }

  /**
   * Set cached result with timestamp
   */
  setCachedResult(key, data) {
    QUERY_CACHE.set(key, {
      data,
      timestamp: Date.now()
    })
    
    // Cleanup old entries if cache is too large
    if (QUERY_CACHE.size > config.cache.maxSize) {
      const entries = Array.from(QUERY_CACHE.entries())
      entries.slice(0, 100).forEach(([key]) => QUERY_CACHE.delete(key))
    }
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }

}

// Create singleton instance
const databaseService = new DatabaseService()

export default databaseService
