import { readFile, writeFile, access } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Use absolute path to data directory
const DATA_DIR = join(process.cwd(), 'data/processed')

// Cache for loaded data
const dataCache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

class OSRSDataService {
  /**
   * Load data from file with caching
   */
  static async loadData(type) {
    const cacheKey = `${type}_data`
    
    // Check cache first
    if (dataCache.has(cacheKey)) {
      const cached = dataCache.get(cacheKey)
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data
      }
      dataCache.delete(cacheKey)
    }

    try {
      const filePath = join(DATA_DIR, `${type}.json`)
      console.log(`Loading data from: ${filePath}`)
      const rawData = await readFile(filePath, 'utf8')
      const data = JSON.parse(rawData)
      
      // Cache the result
      dataCache.set(cacheKey, {
        data,
        timestamp: Date.now()
      })
      
      return data
    } catch (error) {
      console.error(`Error loading ${type} data from ${join(DATA_DIR, `${type}.json`)}:`, error)
      throw new Error(`Failed to load ${type} data`)
    }
  }

  /**
   * Load search indexes
   */
  static async loadIndexes() {
    const cacheKey = 'search_indexes'
    
    if (dataCache.has(cacheKey)) {
      const cached = dataCache.get(cacheKey)
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data
      }
      dataCache.delete(cacheKey)
    }

    try {
      const filePath = join(DATA_DIR, 'indexes.json')
      const rawData = await readFile(filePath, 'utf8')
      const indexes = JSON.parse(rawData)
      
      dataCache.set(cacheKey, {
        data: indexes,
        timestamp: Date.now()
      })
      
      return indexes
    } catch (error) {
      console.error('Error loading search indexes:', error)
      return { items: {}, monsters: {}, prayers: {} }
    }
  }

  /**
   * Get all items with pagination
   */
  static async getAllItems(page = 1, limit = 25) {
    const items = await this.loadData('items')
    const itemsArray = Object.entries(items).map(([id, item]) => ({
      ...item,
      _id: id
    }))

    const total = itemsArray.length
    const totalPages = Math.ceil(total / limit)
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit

    const paginatedItems = itemsArray.slice(startIndex, endIndex)

    return {
      _items: paginatedItems,
      _meta: {
        page,
        max_results: limit,
        total
      },
      _links: {
        self: { href: `items?page=${page}` },
        parent: { href: '/' },
        ...(page > 1 && {
          prev: { href: `items?page=${page - 1}` }
        }),
        ...(page < totalPages && {
          next: { href: `items?page=${page + 1}` }
        }),
        last: { href: `items?page=${totalPages}` }
      }
    }
  }

  /**
   * Get item by ID
   */
  static async getItemById(id) {
    const items = await this.loadData('items')
    const item = items[id.toString()]
    
    if (!item) {
      throw new Error(`Item with ID ${id} not found`)
    }
    
    return { ...item, _id: id.toString() }
  }

  /**
   * Search items by criteria
   */
  static async searchItems(where = {}, page = 1, limit = 25) {
    const items = await this.loadData('items')
    const itemsArray = Object.entries(items).map(([id, item]) => ({
      ...item,
      _id: id
    }))

    // Apply filters
    let filteredItems = itemsArray.filter(item => {
      return Object.entries(where).every(([key, value]) => {
        if (typeof value === 'string') {
          return item[key] && item[key].toString().toLowerCase().includes(value.toLowerCase())
        }
        return item[key] === value
      })
    })

    // Pagination
    const total = filteredItems.length
    const totalPages = Math.ceil(total / limit)
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit

    const paginatedItems = filteredItems.slice(startIndex, endIndex)

    return {
      _items: paginatedItems,
      _meta: {
        page,
        max_results: limit,
        total
      },
      _links: {
        self: { href: `items?page=${page}` },
        parent: { href: '/' },
        ...(page > 1 && {
          prev: { href: `items?page=${page - 1}` }
        }),
        ...(page < totalPages && {
          next: { href: `items?page=${page + 1}` }
        }),
        last: { href: `items?page=${totalPages}` }
      }
    }
  }

  /**
   * Get all equipment with pagination
   */
  static async getAllEquipment(page = 1, limit = 25) {
    const equipment = await this.loadData('equipment')
    const equipmentArray = Object.entries(equipment).map(([id, item]) => ({
      ...item,
      _id: id
    }))

    const total = equipmentArray.length
    const totalPages = Math.ceil(total / limit)
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit

    const paginatedEquipment = equipmentArray.slice(startIndex, endIndex)

    return {
      _items: paginatedEquipment,
      _meta: {
        page,
        max_results: limit,
        total
      },
      _links: {
        self: { href: `equipment?page=${page}` },
        parent: { href: '/' },
        ...(page > 1 && {
          prev: { href: `equipment?page=${page - 1}` }
        }),
        ...(page < totalPages && {
          next: { href: `equipment?page=${page + 1}` }
        }),
        last: { href: `equipment?page=${totalPages}` }
      }
    }
  }

  /**
   * Get equipment by ID
   */
  static async getEquipmentById(id) {
    const equipment = await this.loadData('equipment')
    const item = equipment[id.toString()]
    
    if (!item) {
      throw new Error(`Equipment with ID ${id} not found`)
    }
    
    return { ...item, _id: id.toString() }
  }

  /**
   * Get all weapons with pagination
   */
  static async getAllWeapons(page = 1, limit = 25) {
    const weapons = await this.loadData('weapons')
    const weaponsArray = Object.entries(weapons).map(([id, item]) => ({
      ...item,
      _id: id
    }))

    const total = weaponsArray.length
    const totalPages = Math.ceil(total / limit)
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit

    const paginatedWeapons = weaponsArray.slice(startIndex, endIndex)

    return {
      _items: paginatedWeapons,
      _meta: {
        page,
        max_results: limit,
        total
      },
      _links: {
        self: { href: `weapons?page=${page}` },
        parent: { href: '/' },
        ...(page > 1 && {
          prev: { href: `weapons?page=${page - 1}` }
        }),
        ...(page < totalPages && {
          next: { href: `weapons?page=${page + 1}` }
        }),
        last: { href: `weapons?page=${totalPages}` }
      }
    }
  }

  /**
   * Get weapon by ID
   */
  static async getWeaponById(id) {
    const weapons = await this.loadData('weapons')
    const weapon = weapons[id.toString()]
    
    if (!weapon) {
      throw new Error(`Weapon with ID ${id} not found`)
    }
    
    return { ...weapon, _id: id.toString() }
  }

  /**
   * Get all monsters with pagination
   */
  static async getAllMonsters(page = 1, limit = 25) {
    const monsters = await this.loadData('monsters')
    const monstersArray = Object.entries(monsters).map(([id, monster]) => ({
      ...monster,
      _id: id
    }))

    const total = monstersArray.length
    const totalPages = Math.ceil(total / limit)
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit

    const paginatedMonsters = monstersArray.slice(startIndex, endIndex)

    return {
      _items: paginatedMonsters,
      _meta: {
        page,
        max_results: limit,
        total
      },
      _links: {
        self: { href: `monsters?page=${page}` },
        parent: { href: '/' },
        ...(page > 1 && {
          prev: { href: `monsters?page=${page - 1}` }
        }),
        ...(page < totalPages && {
          next: { href: `monsters?page=${page + 1}` }
        }),
        last: { href: `monsters?page=${totalPages}` }
      }
    }
  }

  /**
   * Get monster by ID
   */
  static async getMonsterById(id) {
    const monsters = await this.loadData('monsters')
    const monster = monsters[id.toString()]
    
    if (!monster) {
      throw new Error(`Monster with ID ${id} not found`)
    }
    
    return { ...monster, _id: id.toString() }
  }

  /**
   * Get all prayers with pagination
   */
  static async getAllPrayers(page = 1, limit = 25) {
    const prayers = await this.loadData('prayers')
    const prayersArray = Object.entries(prayers).map(([id, prayer]) => ({
      ...prayer,
      _id: id
    }))

    const total = prayersArray.length
    const totalPages = Math.ceil(total / limit)
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit

    const paginatedPrayers = prayersArray.slice(startIndex, endIndex)

    return {
      _items: paginatedPrayers,
      _meta: {
        page,
        max_results: limit,
        total
      },
      _links: {
        self: { href: `prayers?page=${page}` },
        parent: { href: '/' },
        ...(page > 1 && {
          prev: { href: `prayers?page=${page - 1}` }
        }),
        ...(page < totalPages && {
          next: { href: `prayers?page=${page + 1}` }
        }),
        last: { href: `prayers?page=${totalPages}` }
      }
    }
  }

  /**
   * Get prayer by ID
   */
  static async getPrayerById(id) {
    const prayers = await this.loadData('prayers')
    const prayer = prayers[id.toString()]
    
    if (!prayer) {
      throw new Error(`Prayer with ID ${id} not found`)
    }
    
    return { ...prayer, _id: id.toString() }
  }

  /**
   * Search by name across all data types
   */
  static async searchByName(query, type = 'items') {
    const indexes = await this.loadIndexes()
    const queryLower = query.toLowerCase()
    
    const typeIndex = indexes[type] || {}
    const matches = []
    
    // Direct name match
    if (typeIndex[queryLower]) {
      return typeIndex[queryLower]
    }
    
    // Partial matches
    for (const [name, ids] of Object.entries(typeIndex)) {
      if (name.includes(queryLower)) {
        matches.push(...ids)
      }
    }
    
    return matches
  }

  /**
   * Get data summary/statistics
   */
  static async getDataSummary() {
    try {
      const summaryPath = join(DATA_DIR, 'summary.json')
      const rawData = await readFile(summaryPath, 'utf8')
      return JSON.parse(rawData)
    } catch (error) {
      // Return basic summary if file doesn't exist
      const items = await this.loadData('items')
      const monsters = await this.loadData('monsters')
      const prayers = await this.loadData('prayers')
      
      return {
        lastUpdated: new Date().toISOString(),
        stats: {
          itemsProcessed: Object.keys(items).length,
          monstersProcessed: Object.keys(monsters).length,
          prayersProcessed: Object.keys(prayers).length
        }
      }
    }
  }

  /**
   * Clear all caches
   */
  static clearCache() {
    dataCache.clear()
  }
}

export default OSRSDataService 