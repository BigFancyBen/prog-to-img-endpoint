import { WikiApiClient } from '../scripts/wiki/wikiApiClient.js'
import { WikitextParser } from '../scripts/wiki/wikitextParser.js'
import { InfoboxCleaner } from '../scripts/wiki/infoboxCleaner.js'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createWriteStream, promises as fs } from 'fs'
import https from 'https'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ICONS_DIR = join(__dirname, '../icons/items')

/**
 * Service for looking up missing items/monsters on OSRS Wiki
 */
class WikiLookupService {
  constructor() {
    this.wikiClient = new WikiApiClient()
  }

  /**
   * Look up an item by ID on OSRS Wiki
   */
  async lookupItemById(itemId) {
    try {
      console.log(`🔍 Looking up item ID ${itemId} on OSRS Wiki...`)
      
      // Search for pages that might contain this item ID
      const searchResults = await this.searchForItemId(itemId)
      
      if (searchResults.length === 0) {
        console.log(`❌ No pages found containing item ID ${itemId}`)
        return null
      }

      // Try each search result until we find a valid item
      for (const pageTitle of searchResults) {
        const itemData = await this.extractItemDataFromPage(pageTitle, itemId)
        if (itemData) {
          console.log(`✅ Found item: ${itemData.name} (ID: ${itemId})`)
          return itemData
        }
      }

      console.log(`❌ Item ID ${itemId} not found in any search results`)
      return null
    } catch (error) {
      console.error(`❌ Error looking up item ID ${itemId}:`, error.message)
      return null
    }
  }

  /**
   * Look up an item by name on OSRS Wiki
   */
  async lookupItemByName(itemName) {
    try {
      console.log(`🔍 Looking up item "${itemName}" on OSRS Wiki...`)
      
      // Try direct page lookup first
      let itemData = await this.extractItemDataFromPage(itemName)
      if (itemData) {
        console.log(`✅ Found item: ${itemData.name} (ID: ${itemData.id})`)
        return itemData
      }

      // If direct lookup fails, try search
      const searchResults = await this.searchForItemName(itemName)
      
      for (const pageTitle of searchResults) {
        itemData = await this.extractItemDataFromPage(pageTitle)
        if (itemData && itemData.name.toLowerCase().includes(itemName.toLowerCase())) {
          console.log(`✅ Found item: ${itemData.name} (ID: ${itemData.id})`)
          return itemData
        }
      }

      console.log(`❌ Item "${itemName}" not found`)
      return null
    } catch (error) {
      console.error(`❌ Error looking up item "${itemName}":`, error.message)
      return null
    }
  }

  /**
   * Search for pages containing a specific item ID
   */
  async searchForItemId(itemId) {
    try {
      const response = await this.wikiClient.makeRequest({
        action: 'query',
        list: 'search',
        srsearch: `"${itemId}" infobox`,
        srnamespace: 0, // Main namespace only
        srlimit: 10
      })

      const results = response.query?.search || []
      return results.map(result => result.title)
    } catch (error) {
      console.error(`Error searching for item ID ${itemId}:`, error.message)
      return []
    }
  }

  /**
   * Search for pages containing a specific item name
   */
  async searchForItemName(itemName) {
    try {
      const response = await this.wikiClient.makeRequest({
        action: 'query',
        list: 'search',
        srsearch: `"${itemName}" infobox item`,
        srnamespace: 0,
        srlimit: 10
      })

      const results = response.query?.search || []
      return results.map(result => result.title)
    } catch (error) {
      console.error(`Error searching for item "${itemName}":`, error.message)
      return []
    }
  }

  /**
   * Extract item data from a wiki page
   */
  async extractItemDataFromPage(pageTitle, expectedId = null) {
    try {
      const wikitext = await this.wikiClient.getPageWikitext(pageTitle)
      if (!wikitext) return null

      const parser = new WikitextParser(wikitext)
      
      // Try to find any infobox with item-like properties
      let hasInfobox = false
      
      if (parser.extractInfobox('infobox item') || 
          parser.extractInfobox('infobox pet') ||
          parser.extractInfobox('item') ||
          parser.extractInfobox('pet')) {
        hasInfobox = true
      }
      
      // If no specific infobox found, try to find any infobox with item-like properties
      if (!hasInfobox) {
        const doc = parser.doc
        if (doc) {
          const infoboxes = doc.infoboxes()
          for (const infobox of infoboxes) {
            const data = infobox.data || {}
            if (data.id || data.name || data.examine || data.value) {
              parser.template = parser.processInfobox(infobox)
              hasInfobox = true
              break
            }
          }
        }
      }

      if (!hasInfobox) return null

      const id = parser.extractId()
      if (!id) return null

      // If we're looking for a specific ID, make sure it matches
      if (expectedId && id.toString() !== expectedId.toString()) {
        return null
      }

      // Extract item data
      const iconFilename = parser.extractIcon()
      let localIconPath = null
      
      if (iconFilename) {
        const iconUrl = parser.getIconUrl(iconFilename)
        if (iconUrl) {
          // Download and cache the icon locally using item ID as filename
          const iconFileName = `${id}.png`
          localIconPath = await this.downloadIcon(iconUrl, iconFileName)
        }
      }

      const itemData = {
        id: id,
        name: InfoboxCleaner.clean(parser.extractValue('name'), 'string') || pageTitle,
        examine: InfoboxCleaner.clean(parser.extractValue('examine'), 'examine'),
        wiki_name: pageTitle,
        wiki_url: `https://oldschool.runescape.wiki/w/${encodeURIComponent(pageTitle)}`,
        icon: localIconPath, // Store local filename instead of URL
        members: InfoboxCleaner.clean(parser.extractValue('members'), 'boolean'),
        tradeable: InfoboxCleaner.clean(parser.extractValue('tradeable'), 'boolean'),
        tradeable_on_ge: InfoboxCleaner.clean(parser.extractValue('exchangeable'), 'boolean'),
        stackable: InfoboxCleaner.clean(parser.extractValue('stackable'), 'boolean'),
        noted: InfoboxCleaner.clean(parser.extractValue('noted'), 'boolean'),
        noteable: InfoboxCleaner.clean(parser.extractValue('noteable'), 'boolean'),
        weight: InfoboxCleaner.clean(parser.extractValue('weight'), 'number'),
        buy_limit: InfoboxCleaner.clean(parser.extractValue('buylimit'), 'number'),
        quest_item: InfoboxCleaner.clean(parser.extractValue('quest'), 'boolean'),
        release_date: InfoboxCleaner.clean(parser.extractValue('release'), 'date'),
        duplicate: false,
        equipable: false,
        equipable_by_player: false,
        equipable_weapon: false,
        cost: InfoboxCleaner.clean(parser.extractValue('cost'), 'number'),
        lowalch: InfoboxCleaner.clean(parser.extractValue('low'), 'number'),
        highalch: InfoboxCleaner.clean(parser.extractValue('high'), 'number'),
        destruction: InfoboxCleaner.clean(parser.extractValue('destroy'), 'string'),
        last_updated: new Date().toISOString(),
        _source: 'wiki_lookup' // Mark this as dynamically fetched
      }

      // Check if item is equipable
      const slot = InfoboxCleaner.clean(parser.extractValue('slot'), 'string')
      if (slot) {
        itemData.equipable = true
        itemData.equipable_by_player = true
        itemData.equipment = {
          attack_stab: InfoboxCleaner.clean(parser.extractValue('astab'), 'stats'),
          attack_slash: InfoboxCleaner.clean(parser.extractValue('aslash'), 'stats'),
          attack_crush: InfoboxCleaner.clean(parser.extractValue('acrush'), 'stats'),
          attack_magic: InfoboxCleaner.clean(parser.extractValue('amagic'), 'stats'),
          attack_ranged: InfoboxCleaner.clean(parser.extractValue('arange'), 'stats'),
          defence_stab: InfoboxCleaner.clean(parser.extractValue('dstab'), 'stats'),
          defence_slash: InfoboxCleaner.clean(parser.extractValue('dslash'), 'stats'),
          defence_crush: InfoboxCleaner.clean(parser.extractValue('dcrush'), 'stats'),
          defence_magic: InfoboxCleaner.clean(parser.extractValue('dmagic'), 'stats'),
          defence_ranged: InfoboxCleaner.clean(parser.extractValue('drange'), 'stats'),
          melee_strength: InfoboxCleaner.clean(parser.extractValue('str'), 'stats'),
          ranged_strength: InfoboxCleaner.clean(parser.extractValue('rstr'), 'stats'),
          magic_damage: InfoboxCleaner.clean(parser.extractValue('mdmg'), 'stats'),
          prayer: InfoboxCleaner.clean(parser.extractValue('prayer'), 'stats'),
          slot: slot,
          requirements: InfoboxCleaner.clean(parser.extractValue('reqs'), 'requirements')
        }
        
        // Check if it's a weapon
        const attackSpeed = parser.extractValue('aspeed')
        if (attackSpeed) {
          itemData.equipable_weapon = true
          itemData.weapon = {
            attack_speed: InfoboxCleaner.clean(attackSpeed, 'number'),
            weapon_type: InfoboxCleaner.clean(parser.extractValue('wtype'), 'string'),
            stab: itemData.equipment.attack_stab,
            slash: itemData.equipment.attack_slash,
            crush: itemData.equipment.attack_crush,
            magic: itemData.equipment.attack_magic,
            ranged: itemData.equipment.attack_ranged
          }
        }
      }

      return itemData
    } catch (error) {
      console.error(`Error extracting item data from ${pageTitle}:`, error.message)
      return null
    }
  }

  /**
   * Download icon for a newly found item
   */
  /**
   * Download and cache an icon file locally
   */
  async downloadIcon(iconUrl, fileName) {
    if (!iconUrl || !fileName) return null
    
    try {
      // Ensure icons directory exists
      await fs.mkdir(ICONS_DIR, { recursive: true })
      
      const iconPath = join(ICONS_DIR, fileName)
      
      // Check if icon already exists
      try {
        await fs.access(iconPath)
        return fileName // Icon already exists, return local filename
      } catch {
        // Icon doesn't exist, download it
      }
      
      console.log(`📥 Downloading icon: ${fileName}`)
      
      const success = await this.downloadIconFromUrl(iconUrl, iconPath)
      if (success) {
        return fileName // Return local filename
      } else {
        // Try alternative formats
        const altFileName = fileName.replace(/\.png$/, '.png').replace(/ /g, '_')
        const altUrl = `https://oldschool.runescape.wiki/images/${altFileName}`
        const altSuccess = await this.downloadIconFromUrl(altUrl, iconPath)
        if (altSuccess) {
          return fileName
        }
      }
      
      return null // Download failed
    } catch (error) {
      console.warn(`⚠️  Error downloading icon ${fileName}:`, error.message)
      return null
    }
  }

  /**
   * Download icon from URL to local path
   */
  async downloadIconFromUrl(url, iconPath) {
    return new Promise((resolve) => {
      const file = createWriteStream(iconPath)
      
      const request = https.get(url, (response) => {
        if (response.statusCode === 200) {
          response.pipe(file)
          file.on('finish', () => {
            file.close()
            resolve(true)
          })
        } else if (response.statusCode === 404) {
          file.close()
          resolve(false)
        } else {
          file.close()
          console.warn(`⚠️  Failed to download icon: ${response.statusCode}`)
          resolve(false)
        }
      })
      
      request.on('error', (error) => {
        file.close()
        console.warn(`⚠️  Error downloading icon:`, error.message)
        resolve(false)
      })
      
      request.setTimeout(10000, () => {
        request.destroy()
        file.close()
        console.warn(`⚠️  Timeout downloading icon`)
        resolve(false)
      })
    })
  }

  /**
   * Add a newly found item to the cache
   */
  async addItemToCache(itemData) {
    try {
      const DATA_DIR = join(process.cwd(), 'data/processed')
      const itemsFile = join(DATA_DIR, 'items.json')
      
      // Load existing items
      let items = {}
      try {
        const rawData = await readFile(itemsFile, 'utf8')
        items = JSON.parse(rawData)
      } catch (error) {
        console.warn('Could not load existing items.json, starting fresh')
      }
      
      // Add the new item
      items[itemData.id.toString()] = itemData
      
      // Write back to file
      await writeFile(itemsFile, JSON.stringify(items, null, 2))
      console.log(`💾 Added item ${itemData.name} (ID: ${itemData.id}) to cache`)
      
      return true
    } catch (error) {
      console.error(`❌ Error adding item to cache:`, error.message)
      return false
    }
  }
}

export default WikiLookupService
