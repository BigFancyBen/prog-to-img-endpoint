import { WikiApiClient } from '../scripts/wiki/wikiApiClient.js'
import { WikitextParser } from '../scripts/wiki/wikitextParser.js'
import { InfoboxCleaner } from '../scripts/wiki/infoboxCleaner.js'
import databaseService from './databaseService.js'
import https from 'https'

/**
 * Service for looking up missing items/monsters on OSRS Wiki
 */
class WikiLookupService {
  constructor() {
    this.wikiClient = new WikiApiClient()
    this.databaseService = databaseService
  }

  /**
   * Ensure database is initialized
   */
  async ensureDatabase() {
    if (!this.databaseService.db) {
      await this.databaseService.init()
    }
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
        const itemVersions = await this.extractAllVersionsFromPage(pageTitle)
        
        // Look for the specific ID we want
        const itemData = itemVersions.find(item => item.id === parseInt(itemId))
        
        if (itemData) {
          console.log(`✅ Found item: ${itemData.name} (ID: ${itemId})`)
          
          // Save all versions to the database
          for (const version of itemVersions) {
            await this.addItemToDatabase(version)
          }
          
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
      
      // Try different variations of the name to handle special characters
      const searchVariations = [
        itemName,
        itemName.replace(/'/g, "'"), // Try straight apostrophe
        itemName.replace(/'/g, ""), // Remove apostrophes
        itemName.replace(/'/g, "%27"), // URL encoded apostrophe
        itemName.replace(/'/g, "_"), // Replace apostrophe with underscore (wiki format)
        itemName.replace(/ /g, "_"), // Replace spaces with underscores (wiki format)
        itemName.replace(/'/g, "_").replace(/ /g, "_"), // Both replacements
      ]
      
      for (const searchName of searchVariations) {
        console.log(`🔍 Trying search variation: "${searchName}"`)
        
        // Try direct page lookup first
        const itemVersions = await this.extractAllVersionsFromPage(searchName)
        if (itemVersions.length > 0) {
          // Find a version that matches the search name
          let bestMatch = itemVersions.find(item => 
            item.name.toLowerCase() === itemName.toLowerCase()
          )
          
          if (!bestMatch) {
            // If no exact match, find any version that contains the search term
            bestMatch = itemVersions.find(item => 
              item.name.toLowerCase().includes(itemName.toLowerCase())
            )
          }
          
          if (!bestMatch && itemVersions.length > 0) {
            // If still no match, use the first version
            bestMatch = itemVersions[0]
          }
          
          if (bestMatch) {
            console.log(`✅ Found item: ${bestMatch.name} (ID: ${bestMatch.id}) with ${itemVersions.length} versions`)
            
            // Save all versions to the database
            for (const version of itemVersions) {
              await this.addItemToDatabase(version)
            }
            
            return bestMatch
          }
        }

        // If direct lookup fails, try search
        const searchResults = await this.searchForItemName(searchName)
        
        for (const pageTitle of searchResults) {
          const itemVersions = await this.extractAllVersionsFromPage(pageTitle)
          
          for (const itemData of itemVersions) {
            if (itemData.name.toLowerCase().includes(itemName.toLowerCase())) {
              console.log(`✅ Found item: ${itemData.name} (ID: ${itemData.id}) with ${itemVersions.length} versions`)
              
              // Save all versions to the database
              for (const version of itemVersions) {
                await this.addItemToDatabase(version)
              }
              
              return itemData
            }
          }
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
          // Download and cache the icon in database using item ID as filename
          const iconFileName = `${id}.png`
          localIconPath = await this.downloadIcon(iconUrl, iconFileName, id)
        }
      }

      const itemData = {
        id: id,
        name: InfoboxCleaner.clean(parser.extractValue('name'), 'string') || pageTitle,
        examine: InfoboxCleaner.clean(parser.extractValue('examine'), 'examine'),
        wiki_name: pageTitle,
        wiki_url: `https://oldschool.runescape.wiki/w/${encodeURIComponent(pageTitle)}`,
        icon_path: localIconPath || null,
        icon_url: null,
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
   * Extract all versions from a versioned item page
   */
  async extractAllVersionsFromPage(pageTitle) {
    try {
      const wikitext = await this.wikiClient.getPageWikitext(pageTitle)
      if (!wikitext) return []

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

      if (!hasInfobox || !parser.template) return []

      // Check if it's versioned
      parser.determineVersioning()
      
      if (!parser.isVersioned) {
        // Single version item
        const id = parser.extractId()
        if (!id) return []
        
        const itemData = await this.extractSingleItemData(parser, pageTitle, id, null)
        return itemData ? [itemData] : []
      }

      // Extract all versions
      const versions = []
      const template = parser.template
      
      // Find all version numbers
      const versionNumbers = new Set()
      for (const key in template) {
        const match = key.match(/^(id|name|version)(\d+)$/i)
        if (match) {
          versionNumbers.add(parseInt(match[2]))
        }
      }
      
      console.log(`🔍 Found ${versionNumbers.size} versions for ${pageTitle}`)
      
      // Extract data for each version
      for (const versionNum of Array.from(versionNumbers).sort()) {
        const id = this.extractVersionedValue(template, 'id', versionNum)
        if (id) {
          const itemData = await this.extractSingleItemData(parser, pageTitle, id, versionNum)
          if (itemData) {
            versions.push(itemData)
          }
        }
      }
      
      return versions
    } catch (error) {
      console.error(`Error extracting versions from ${pageTitle}:`, error.message)
      return []
    }
  }

  /**
   * Extract value for a specific version (e.g., name1, name2)
   */
  extractVersionedValue(template, field, versionNum) {
    const versionedKey = `${field}${versionNum}`
    let value = null
    
    if (template[versionedKey]) {
      value = this.cleanValue(template[versionedKey])
    } else if (template[field]) {
      // Try without version number as fallback
      value = this.cleanValue(template[field])
    }
    
    // Special handling for image fields - clean the wiki markup
    if (value && field === 'image') {
      // If it's a File: link in wiki markup, extract just the filename
      const fileMatch = value.match(/\[\[File:([^\]]+)\]\]/)
      if (fileMatch) {
        // Extract filename and remove .png extension
        const filename = fileMatch[1].replace(/\.png$/i, '')
        return filename
      }
    }
    
    return value
  }

  /**
   * Clean value (same as WikitextParser cleanValue)
   */
  cleanValue(value) {
    if (!value) return ''
    
    // If it's a wtf_wikipedia object, try to get text
    if (value && typeof value === 'object') {
      if (value.text && typeof value.text === 'function') {
        return value.text().trim()
      } else if (value.toString) {
        return value.toString().trim()
      }
      return String(value).trim()
    }
    
    // Clean string values
    return String(value)
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Extract item data for a single version
   */
  async extractSingleItemData(parser, pageTitle, id, versionNum) {
    try {
      const template = parser.template
      
      // For versioned items, try to get version-specific values first
      const getName = (field) => {
        if (versionNum) {
          const versionedValue = this.extractVersionedValue(template, field, versionNum)
          if (versionedValue) return versionedValue
        }
        return parser.extractValue(field)
      }
      
      // Extract item data
      const iconFilename = versionNum ? 
        this.extractVersionedValue(template, 'image', versionNum) || parser.extractIcon() :
        parser.extractIcon()
      
      let localIconPath = null
      
      if (iconFilename) {
        const iconUrl = parser.getIconUrl(iconFilename)
        if (iconUrl) {
          // Download and cache the icon in database using item ID as filename
          const iconFileName = `${id}.png`
          localIconPath = await this.downloadIcon(iconUrl, iconFileName, id)
        }
      }

      const itemData = {
        id: parseInt(id),
        name: InfoboxCleaner.clean(getName('name'), 'string') || 
              (versionNum ? `${pageTitle} ${versionNum}` : pageTitle),
        examine: InfoboxCleaner.clean(getName('examine'), 'examine'),
        wiki_name: pageTitle,
        wiki_url: `https://oldschool.runescape.wiki/w/${encodeURIComponent(pageTitle)}`,
        icon_path: localIconPath || null,
        icon_url: null,
        members: InfoboxCleaner.clean(getName('members'), 'boolean'),
        tradeable: InfoboxCleaner.clean(getName('tradeable'), 'boolean'),
        tradeable_on_ge: InfoboxCleaner.clean(getName('exchangeable'), 'boolean'),
        stackable: InfoboxCleaner.clean(getName('stackable'), 'boolean'),
        noted: InfoboxCleaner.clean(getName('noted'), 'boolean'),
        noteable: InfoboxCleaner.clean(getName('noteable'), 'boolean'),
        weight: InfoboxCleaner.clean(getName('weight'), 'number'),
        buy_limit: InfoboxCleaner.clean(getName('buylimit'), 'number'),
        quest_item: InfoboxCleaner.clean(getName('quest'), 'boolean'),
        release_date: InfoboxCleaner.clean(getName('release'), 'date'),
        duplicate: false,
        equipable: false,
        equipable_by_player: false,
        equipable_weapon: false,
        cost: InfoboxCleaner.clean(getName('cost'), 'number'),
        lowalch: InfoboxCleaner.clean(getName('low'), 'number'),
        highalch: InfoboxCleaner.clean(getName('high'), 'number'),
        destruction: InfoboxCleaner.clean(getName('destroy'), 'string'),
        last_updated: new Date().toISOString(),
        _source: 'wiki_lookup',
        _version: versionNum || 1
      }

      // Check if item is equipable
      const slot = InfoboxCleaner.clean(getName('slot'), 'string')
      if (slot) {
        itemData.equipable = true
        itemData.equipable_by_player = true
        itemData.equipment = {
          attack_stab: InfoboxCleaner.clean(getName('astab'), 'stats'),
          attack_slash: InfoboxCleaner.clean(getName('aslash'), 'stats'),
          attack_crush: InfoboxCleaner.clean(getName('acrush'), 'stats'),
          attack_magic: InfoboxCleaner.clean(getName('amagic'), 'stats'),
          attack_ranged: InfoboxCleaner.clean(getName('arange'), 'stats'),
          defence_stab: InfoboxCleaner.clean(getName('dstab'), 'stats'),
          defence_slash: InfoboxCleaner.clean(getName('dslash'), 'stats'),
          defence_crush: InfoboxCleaner.clean(getName('dcrush'), 'stats'),
          defence_magic: InfoboxCleaner.clean(getName('dmagic'), 'stats'),
          defence_ranged: InfoboxCleaner.clean(getName('drange'), 'stats'),
          melee_strength: InfoboxCleaner.clean(getName('str'), 'stats'),
          ranged_strength: InfoboxCleaner.clean(getName('rstr'), 'stats'),
          magic_damage: InfoboxCleaner.clean(getName('mdmg'), 'stats'),
          prayer: InfoboxCleaner.clean(getName('prayer'), 'stats'),
          slot: slot,
          requirements: InfoboxCleaner.clean(getName('reqs'), 'requirements')
        }
        
        // Check if it's a weapon
        const attackSpeed = getName('aspeed')
        if (attackSpeed) {
          itemData.equipable_weapon = true
          itemData.weapon = {
            attack_speed: InfoboxCleaner.clean(attackSpeed, 'number'),
            weapon_type: InfoboxCleaner.clean(getName('wtype'), 'string'),
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
      console.error(`Error extracting single item data:`, error.message)
      return null
    }
  }

  /**
   * Download icon for a newly found item
   */
  /**
   * Download and cache an icon file in database with MediaWiki URL format handling
   */
  async downloadIcon(iconUrl, fileName, itemId) {
    if (!iconUrl || !fileName || !itemId) return null
    
    try {
      // Check if icon already exists in database
      if (await this.databaseService.hasIconData(itemId)) {
        return fileName // Icon already exists in database
      }
      
      console.log(`📥 Downloading icon: ${fileName} for item ${itemId}`)
      
      // Extract base name from iconUrl for MediaWiki format variations
      let urlBaseName = iconUrl.includes('/images/') ? 
        iconUrl.split('/images/')[1].replace(/\.(png|gif|jpg|jpeg)$/i, '') : 
        fileName.replace(/\.(png|gif|jpg|jpeg)$/i, '')
      
      // Decode URL encoding to get clean filename
      urlBaseName = decodeURIComponent(urlBaseName)
      
      // Try multiple MediaWiki naming conventions
      const urlVariations = [
        `https://oldschool.runescape.wiki/images/${urlBaseName.replace(/ /g, '_')}.png`, // Underscores first (OSRS Wiki standard)
        iconUrl, // Original URL
        `https://oldschool.runescape.wiki/images/${urlBaseName}.png`,
        `https://oldschool.runescape.wiki/images/${urlBaseName.replace(/ /g, '%20')}.png`,
        `https://oldschool.runescape.wiki/images/${encodeURIComponent(urlBaseName)}.png`
      ]
      
      // Remove duplicates while preserving order
      const uniqueUrls = [...new Set(urlVariations)]
      
      for (let i = 0; i < uniqueUrls.length; i++) {
        const tryUrl = uniqueUrls[i]
        console.log(`  Trying URL ${i + 1}/${uniqueUrls.length}: ${tryUrl}`)
        
        const iconBuffer = await this.downloadIconFromUrl(tryUrl)
        if (iconBuffer) {
          console.log(`  ✅ Success with URL format: ${tryUrl}`)
          
          // Store icon in database
          const success = await this.databaseService.storeIconData(itemId, iconBuffer)
          if (success) {
            console.log(`  ✅ Icon stored in database for item ${itemId}`)
            return fileName
          } else {
            console.warn(`  ⚠️  Failed to store icon in database for item ${itemId}`)
          }
        }
        
        // Small delay between attempts
        if (i < uniqueUrls.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
      
      console.log(`  ❌ All URL formats failed for: ${fileName}`)
      return null // All download attempts failed
    } catch (error) {
      console.warn(`⚠️  Error downloading icon ${fileName}:`, error.message)
      return null
    }
  }

  /**
   * Download icon from URL and return buffer
   */
  async downloadIconFromUrl(url) {
    return new Promise((resolve) => {
      // Parse URL to get proper headers
      const urlObj = new URL(url)
      const options = {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'image',
          'Sec-Fetch-Mode': 'no-cors',
          'Sec-Fetch-Site': 'cross-site',
          'Referer': 'https://oldschool.runescape.wiki/'
        }
      }
      
      const request = https.get(options, (response) => {
        if (response.statusCode === 200) {
          const chunks = []
          
          response.on('data', (chunk) => {
            chunks.push(chunk)
          })
          
          response.on('end', () => {
            const buffer = Buffer.concat(chunks)
            console.log(`✅ Successfully downloaded icon: ${url} (${buffer.length} bytes)`)
            resolve(buffer)
          })
        } else if (response.statusCode === 404) {
          console.warn(`⚠️  Icon not found (404): ${url}`)
          resolve(null)
        } else {
          console.warn(`⚠️  Failed to download icon: ${response.statusCode} - ${url}`)
          resolve(null)
        }
      })
      
      request.on('error', (error) => {
        console.warn(`⚠️  Error downloading icon from ${url}:`, error.message)
        resolve(null)
      })
      
      request.setTimeout(15000, () => {
        request.destroy()
        console.warn(`⚠️  Timeout downloading icon from ${url}`)
        resolve(null)
      })
    })
  }

  /**
   * Add a newly found item to the database
   */
  async addItemToDatabase(itemData) {
    try {
      await this.ensureDatabase()
      
      // Convert item data to match database format
      const dbItemData = {
        id: itemData.id,
        name: itemData.name,
        examine: itemData.examine,
        wiki_name: itemData.wiki_name,
        wiki_url: itemData.wiki_url,
        icon_path: itemData.icon_path,
        icon_url: itemData.icon_url,
        members: itemData.members,
        tradeable: itemData.tradeable,
        tradeable_on_ge: itemData.tradeable_on_ge,
        stackable: itemData.stackable,
        noted: itemData.noted,
        noteable: itemData.noteable,
        weight: itemData.weight || 0,
        buy_limit: itemData.buy_limit || 0,
        quest_item: itemData.quest_item,
        release_date: itemData.release_date,
        duplicate: itemData.duplicate || false,
        equipable: itemData.equipable || false,
        equipable_by_player: itemData.equipable_by_player || false,
        equipable_weapon: itemData.equipable_weapon || false,
        cost: itemData.cost || 0,
        lowalch: itemData.lowalch || 0,
        highalch: itemData.highalch || 0,
        destruction: itemData.destruction,
        last_updated: new Date().toISOString()
      }
      
      // Insert the item into the database
      this.databaseService.insertItem(dbItemData)
      
      console.log(`💾 Added item ${itemData.name} (ID: ${itemData.id}) to database`)
      
      return true
    } catch (error) {
      console.error(`❌ Error adding item to database:`, error.message)
      return false
    }
  }
}

export default WikiLookupService
