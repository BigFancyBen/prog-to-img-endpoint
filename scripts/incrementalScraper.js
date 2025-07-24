import { WikiApiClient } from './wiki/wikiApiClient.js'
import { WikitextParser } from './wiki/wikitextParser.js'
import { InfoboxCleaner } from './wiki/infoboxCleaner.js'
import { readFile, writeFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const DATA_DIR = join(__dirname, '../data')
const PROCESSED_DIR = join(DATA_DIR, 'processed')

/**
 * Incremental scraper for detecting and adding new items/monsters
 * This is much faster than a full scrape and can be run frequently
 */
class IncrementalScraper {
  constructor() {
    this.wikiClient = new WikiApiClient()
  }

  /**
   * Check for new items since last update
   */
  async checkForNewItems() {
    console.log('🔍 Checking for new items...')
    
    try {
      // Load existing items data
      const existingItems = await this.loadExistingItems()
      const existingIds = new Set(Object.keys(existingItems).map(id => parseInt(id)))
      const maxExistingId = Math.max(...existingIds)
      
      console.log(`📊 Found ${existingIds.size} existing items (max ID: ${maxExistingId})`)
      
      // Get recent changes from Items category
      const recentChanges = await this.getRecentChanges(['Items', 'Pets'])
      
      let newItemsFound = 0
      const newItems = {}
      
      for (const pageTitle of recentChanges) {
        try {
          const wikitext = await this.wikiClient.extractPageWikitext(pageTitle)
          
          if (wikitext) {
            const parser = new WikitextParser(wikitext)
            
            if (parser.extractInfobox('infobox item') || parser.extractInfobox('infobox pet')) {
              const itemData = this.extractItemData(parser, pageTitle)
              
              if (itemData && itemData.id && !existingIds.has(itemData.id)) {
                newItems[itemData.id] = itemData
                newItemsFound++
                console.log(`✨ Found new item: ${itemData.name} (ID: ${itemData.id})`)
              }
            }
          }
        } catch (error) {
          console.error(`❌ Error checking ${pageTitle}:`, error.message)
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200))
      }
      
      if (newItemsFound > 0) {
        // Merge with existing items
        const updatedItems = { ...existingItems, ...newItems }
        
        // Save updated items
        await writeFile(
          join(PROCESSED_DIR, 'items.json'),
          JSON.stringify(updatedItems, null, 2)
        )
        
        console.log(`✅ Added ${newItemsFound} new items to the database`)
        return newItems
      } else {
        console.log('✅ No new items found')
        return {}
      }
      
    } catch (error) {
      console.error('❌ Error checking for new items:', error.message)
      throw error
    }
  }

  /**
   * Check for new monsters since last update
   */
  async checkForNewMonsters() {
    console.log('🔍 Checking for new monsters...')
    
    try {
      // Load existing monsters data
      const existingMonsters = await this.loadExistingMonsters()
      const existingIds = new Set(Object.keys(existingMonsters).map(id => parseInt(id)))
      const maxExistingId = Math.max(...existingIds)
      
      console.log(`📊 Found ${existingIds.size} existing monsters (max ID: ${maxExistingId})`)
      
      // Get recent changes from Monsters category
      const recentChanges = await this.getRecentChanges(['Monsters'])
      
      let newMonstersFound = 0
      const newMonsters = {}
      
      for (const pageTitle of recentChanges) {
        try {
          const wikitext = await this.wikiClient.extractPageWikitext(pageTitle)
          
          if (wikitext) {
            const parser = new WikitextParser(wikitext)
            
            if (parser.extractInfobox('infobox monster')) {
              const monsterData = this.extractMonsterData(parser, pageTitle)
              
              if (monsterData && monsterData.id && !existingIds.has(monsterData.id)) {
                newMonsters[monsterData.id] = monsterData
                newMonstersFound++
                console.log(`✨ Found new monster: ${monsterData.name} (ID: ${monsterData.id})`)
              }
            }
          }
        } catch (error) {
          console.error(`❌ Error checking ${pageTitle}:`, error.message)
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200))
      }
      
      if (newMonstersFound > 0) {
        // Merge with existing monsters
        const updatedMonsters = { ...existingMonsters, ...newMonsters }
        
        // Save updated monsters
        await writeFile(
          join(PROCESSED_DIR, 'monsters.json'),
          JSON.stringify(updatedMonsters, null, 2)
        )
        
        console.log(`✅ Added ${newMonstersFound} new monsters to the database`)
        return newMonsters
      } else {
        console.log('✅ No new monsters found')
        return {}
      }
      
    } catch (error) {
      console.error('❌ Error checking for new monsters:', error.message)
      throw error
    }
  }

  /**
   * Get recent changes for specific categories
   */
  async getRecentChanges(categories, daysBack = 7) {
    const recentPages = new Set()
    
    for (const category of categories) {
      try {
        // Get all pages in category first
        const pageTitles = await this.wikiClient.extractPageTitles([category])
        
        // Check revision dates for pages modified in the last X days
        await this.wikiClient.extractRevisionTimestamps(pageTitles)
        
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - daysBack)
        
        for (const [pageTitle, revisionDate] of Object.entries(pageTitles)) {
          if (revisionDate) {
            const pageDate = new Date(revisionDate)
            if (pageDate > cutoffDate) {
              recentPages.add(pageTitle)
            }
          }
        }
      } catch (error) {
        console.error(`❌ Error getting recent changes for ${category}:`, error.message)
      }
    }
    
    return Array.from(recentPages)
  }

  /**
   * Load existing items data
   */
  async loadExistingItems() {
    try {
      const data = await readFile(join(PROCESSED_DIR, 'items.json'), 'utf8')
      return JSON.parse(data)
    } catch (error) {
      console.log('📝 No existing items data found, starting fresh')
      return {}
    }
  }

  /**
   * Load existing monsters data
   */
  async loadExistingMonsters() {
    try {
      const data = await readFile(join(PROCESSED_DIR, 'monsters.json'), 'utf8')
      return JSON.parse(data)
    } catch (error) {
      console.log('📝 No existing monsters data found, starting fresh')
      return {}
    }
  }

  /**
   * Extract item data (reused from main scraper)
   */
  extractItemData(parser, pageTitle) {
    const id = parser.extractId()
    if (!id) return null

    const itemData = {
      id: id,
      name: InfoboxCleaner.clean(parser.extractValue('name'), 'string') || pageTitle,
      examine: InfoboxCleaner.clean(parser.extractValue('examine'), 'examine'),
      wiki_name: pageTitle,
      wiki_url: `https://oldschool.runescape.wiki/w/${encodeURIComponent(pageTitle)}`,
      
      // Basic properties
      members: InfoboxCleaner.clean(parser.extractValue('members'), 'boolean'),
      tradeable: InfoboxCleaner.clean(parser.extractValue('tradeable'), 'tradeable'),
      tradeable_on_ge: InfoboxCleaner.clean(parser.extractValue('exchange'), 'boolean'),
      stackable: InfoboxCleaner.clean(parser.extractValue('stackable'), 'boolean'),
      noted: InfoboxCleaner.clean(parser.extractValue('noted'), 'boolean'),
      noteable: InfoboxCleaner.clean(parser.extractValue('noteable'), 'boolean'),
      
      // Value properties
      cost: InfoboxCleaner.clean(parser.extractValue('store'), 'number'),
      lowalch: InfoboxCleaner.clean(parser.extractValue('lowalch'), 'number'),
      highalch: InfoboxCleaner.clean(parser.extractValue('highalch'), 'number'),
      weight: InfoboxCleaner.clean(parser.extractValue('weight'), 'weight'),
      
      // Quest and release info
      quest_item: InfoboxCleaner.clean(parser.extractValue('quest'), 'quest'),
      release_date: InfoboxCleaner.clean(parser.extractValue('release'), 'release_date'),
      
      // Equipment properties
      equipable: false,
      equipable_by_player: false,
      equipable_weapon: false,
      equipment: null,
      weapon: null,
      
      // Metadata
      last_updated: new Date().toISOString().split('T')[0],
      incomplete: false
    }

    // Check if item is equipable and extract equipment data
    this.processEquipmentData(parser, itemData)
    
    return itemData
  }

  /**
   * Extract monster data (reused from main scraper)
   */
  extractMonsterData(parser, pageTitle) {
    const id = parser.extractId()
    if (!id) return null

    const monsterData = {
      id: id,
      name: InfoboxCleaner.clean(parser.extractValue('name'), 'string') || pageTitle,
      examine: InfoboxCleaner.clean(parser.extractValue('examine'), 'examine'),
      wiki_name: pageTitle,
      wiki_url: `https://oldschool.runescape.wiki/w/${encodeURIComponent(pageTitle)}`,
      
      // Basic properties
      members: InfoboxCleaner.clean(parser.extractValue('members'), 'boolean'),
      release_date: InfoboxCleaner.clean(parser.extractValue('release'), 'release_date'),
      combat_level: InfoboxCleaner.clean(parser.extractValue('combat'), 'number'),
      hitpoints: InfoboxCleaner.clean(parser.extractValue('hitpoints'), 'number'),
      max_hit: InfoboxCleaner.clean(parser.extractValue('max hit'), 'number'),
      
      // Combat properties
      attack_type: InfoboxCleaner.clean(parser.extractValue('attack style'), 'attack_types'),
      attack_speed: InfoboxCleaner.clean(parser.extractValue('attack speed'), 'number'),
      aggressive: InfoboxCleaner.clean(parser.extractValue('aggressive'), 'boolean'),
      poisonous: InfoboxCleaner.clean(parser.extractValue('poisonous'), 'boolean'),
      venomous: InfoboxCleaner.clean(parser.extractValue('venomous'), 'boolean'),
      
      // Immunities
      immune_poison: InfoboxCleaner.clean(parser.extractValue('immunepoison'), 'boolean'),
      immune_venom: InfoboxCleaner.clean(parser.extractValue('immunevenom'), 'boolean'),
      
      // Categories and attributes
      attributes: InfoboxCleaner.clean(parser.extractValue('attributes'), 'categories'),
      category: InfoboxCleaner.clean(parser.extractValue('cat'), 'categories'),
      
      // Slayer properties
      slayer_monster: false,
      slayer_level: InfoboxCleaner.clean(parser.extractValue('slaylvl'), 'number'),
      slayer_xp: InfoboxCleaner.clean(parser.extractValue('slayxp'), 'number'),
      slayer_masters: InfoboxCleaner.clean(parser.extractValue('assignedby'), 'slayer_masters'),
      
      // Combat stats
      attack_level: InfoboxCleaner.clean(parser.extractValue('att'), 'stats'),
      strength_level: InfoboxCleaner.clean(parser.extractValue('str'), 'stats'),
      defence_level: InfoboxCleaner.clean(parser.extractValue('def'), 'stats'),
      magic_level: InfoboxCleaner.clean(parser.extractValue('mage'), 'stats'),
      ranged_level: InfoboxCleaner.clean(parser.extractValue('range'), 'stats'),
      
      // Combat bonuses
      attack_bonus: InfoboxCleaner.clean(parser.extractValue('attbns'), 'stats'),
      strength_bonus: InfoboxCleaner.clean(parser.extractValue('strbns'), 'stats'),
      attack_magic: InfoboxCleaner.clean(parser.extractValue('amagic'), 'stats'),
      magic_bonus: InfoboxCleaner.clean(parser.extractValue('mbns'), 'stats'),
      attack_ranged: InfoboxCleaner.clean(parser.extractValue('arange'), 'stats'),
      ranged_bonus: InfoboxCleaner.clean(parser.extractValue('rngbns'), 'stats'),
      defence_stab: InfoboxCleaner.clean(parser.extractValue('dstab'), 'stats'),
      defence_slash: InfoboxCleaner.clean(parser.extractValue('dslash'), 'stats'),
      defence_crush: InfoboxCleaner.clean(parser.extractValue('dcrush'), 'stats'),
      defence_magic: InfoboxCleaner.clean(parser.extractValue('dmagic'), 'stats'),
      defence_ranged: InfoboxCleaner.clean(parser.extractValue('drange'), 'stats'),
      
      // Will be populated later with drop data
      drops: [],
      
      // Metadata
      last_updated: new Date().toISOString().split('T')[0],
      incomplete: false
    }

    // Set slayer monster status
    if (monsterData.slayer_xp > 0) {
      monsterData.slayer_monster = true
    }
    
    return monsterData
  }

  /**
   * Process equipment data (reused from main scraper)
   */
  processEquipmentData(parser, itemData) {
    const slot = InfoboxCleaner.clean(parser.extractValue('slot'), 'slot')
    
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
  }

  /**
   * Run incremental update check
   */
  async run() {
    console.log('🔄 OSRS Incremental Data Update')
    console.log('==============================')
    console.log('Checking for new items and monsters since last update')
    console.log('')

    try {
      const newItems = await this.checkForNewItems()
      const newMonsters = await this.checkForNewMonsters()
      
      const totalNew = Object.keys(newItems).length + Object.keys(newMonsters).length
      
      if (totalNew > 0) {
        console.log('')
        console.log(`🎉 Found ${totalNew} new entries!`)
        console.log(`   - New items: ${Object.keys(newItems).length}`)
        console.log(`   - New monsters: ${Object.keys(newMonsters).length}`)
        
        // Update summary file
        await this.updateSummary()
        
        return { newItems, newMonsters }
      } else {
        console.log('')
        console.log('✅ Database is up to date, no new entries found')
        return { newItems: {}, newMonsters: {} }
      }
      
    } catch (error) {
      console.error('❌ Incremental update failed:', error.message)
      throw error
    }
  }

  /**
   * Update summary file with new counts
   */
  async updateSummary() {
    try {
      const items = await this.loadExistingItems()
      const monsters = await this.loadExistingMonsters()
      
      const equipment = Object.values(items).filter(item => item.equipable_by_player)
      const weapons = Object.values(items).filter(item => item.equipable_weapon)
      
      const summary = {
        items: Object.keys(items).length,
        equipment: equipment.length,
        weapons: weapons.length,
        monsters: Object.keys(monsters).length,
        last_updated: new Date().toISOString(),
        source: 'OSRS Wiki',
        data_version: '1.0'
      }
      
      await writeFile(
        join(PROCESSED_DIR, 'summary.json'),
        JSON.stringify(summary, null, 2)
      )
      
    } catch (error) {
      console.error('❌ Error updating summary:', error.message)
    }
  }
}

export default IncrementalScraper
