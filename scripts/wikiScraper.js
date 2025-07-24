import { WikiApiClient } from './wiki/wikiApiClient.js'
import { WikitextParser } from './wiki/wikitextParser.js'
import { InfoboxCleaner } from './wiki/infoboxCleaner.js'
import { readFile, writeFile, mkdir, access } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const DATA_DIR = join(__dirname, '../data')
const CACHE_DIR = join(DATA_DIR, 'cache')
const PROCESSED_DIR = join(DATA_DIR, 'processed')
const CHECKPOINT_FILE = join(DATA_DIR, 'wiki-checkpoint.json')

/**
 * Modern OSRS Wiki scraper that replaces osrsbox-db dependency
 * Uses the wiki as the single source of truth for all data
 */
class OSRSWikiScraper {
  constructor() {
    this.wikiClient = new WikiApiClient()
    this.stats = {
      itemsProcessed: 0,
      monstersProcessed: 0,
      prayersProcessed: 0,
      totalProcessed: 0,
      lastUpdated: new Date().toISOString()
    }
    this.checkpoint = null
  }

  async initDirectories() {
    const dirs = [DATA_DIR, CACHE_DIR, PROCESSED_DIR]
    for (const dir of dirs) {
      try {
        await access(dir)
      } catch {
        await mkdir(dir, { recursive: true })
        console.log(`📁 Created directory: ${dir}`)
      }
    }
  }

  async loadCheckpoint() {
    try {
      const checkpointData = await readFile(CHECKPOINT_FILE, 'utf8')
      this.checkpoint = JSON.parse(checkpointData)
      console.log(`📋 Loaded checkpoint from ${new Date(this.checkpoint.timestamp).toLocaleString()}`)
      return true
    } catch (error) {
      console.log('📋 No checkpoint found, starting fresh')
      this.checkpoint = {
        timestamp: new Date().toISOString(),
        completed: [],
        stats: this.stats
      }
      return false
    }
  }

  async saveCheckpoint() {
    this.checkpoint.timestamp = new Date().toISOString()
    this.checkpoint.stats = { ...this.stats }
    await writeFile(CHECKPOINT_FILE, JSON.stringify(this.checkpoint, null, 2))
  }

  /**
   * Scrape items data from the wiki
   */
  async scrapeItems() {
    console.log('\n📦 Scraping items data from OSRS Wiki...')
    
    if (this.checkpoint.completed.includes('items')) {
      console.log('✅ Items already scraped, loading from cache...')
      return await this.loadCachedData('items-wiki.json')
    }

    // Extract page titles from Items and Pets categories
    const pageTitles = await this.wikiClient.extractPageTitles(['Items', 'Pets'])
    
    // Extract revision timestamps
    await this.wikiClient.extractRevisionTimestamps(pageTitles)
    
    // Extract wikitext for all pages
    const wikitextData = await this.wikiClient.extractAllWikitext(pageTitles)
    
    // Process the wikitext to extract item data
    const itemsData = await this.processItemsWikitext(wikitextData)
    
    // Cache the raw data
    await writeFile(join(CACHE_DIR, 'items-wiki.json'), JSON.stringify(itemsData, null, 2))
    
    this.checkpoint.completed.push('items')
    await this.saveCheckpoint()
    
    return itemsData
  }

  /**
   * Process items wikitext to extract structured data
   */
  async processItemsWikitext(wikitextData) {
    const items = {}
    const totalPages = Object.keys(wikitextData).length
    let processedCount = 0
    
    console.log(`🔄 Processing ${totalPages} item pages...`)
    
    for (const [pageTitle, wikitext] of Object.entries(wikitextData)) {
      try {
        const parser = new WikitextParser(wikitext)
        
        // Try to extract item infobox
        if (parser.extractInfobox('infobox item') || parser.extractInfobox('infobox pet')) {
          const itemData = this.extractItemData(parser, pageTitle)
          
          if (itemData && itemData.id) {
            items[itemData.id] = itemData
            this.stats.itemsProcessed++
          }
        }
      } catch (error) {
        console.error(`❌ Error processing ${pageTitle}:`, error.message)
      }
      
      processedCount++
      if (processedCount % 100 === 0) {
        console.log(`   Progress: ${processedCount}/${totalPages} pages processed`)
      }
    }
    
    console.log(`✅ Processed ${this.stats.itemsProcessed} items from ${totalPages} pages`)
    return items
  }

  /**
   * Extract item data from a parsed infobox
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
      
      // Equipment properties (will be populated if equipable)
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
   * Process equipment data if the item is equipable
   */
  processEquipmentData(parser, itemData) {
    // Check for equipment slot to determine if equipable
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
   * Scrape monsters data from the wiki
   */
  async scrapeMonsters() {
    console.log('\n👹 Scraping monsters data from OSRS Wiki...')
    
    if (this.checkpoint.completed.includes('monsters')) {
      console.log('✅ Monsters already scraped, loading from cache...')
      return await this.loadCachedData('monsters-wiki.json')
    }

    // Extract page titles from Monsters category
    const pageTitles = await this.wikiClient.extractPageTitles(['Monsters'])
    
    // Extract revision timestamps
    await this.wikiClient.extractRevisionTimestamps(pageTitles)
    
    // Extract wikitext for all pages
    const wikitextData = await this.wikiClient.extractAllWikitext(pageTitles)
    
    // Process the wikitext to extract monster data
    const monstersData = await this.processMonstersWikitext(wikitextData)
    
    // Cache the raw data
    await writeFile(join(CACHE_DIR, 'monsters-wiki.json'), JSON.stringify(monstersData, null, 2))
    
    this.checkpoint.completed.push('monsters')
    await this.saveCheckpoint()
    
    return monstersData
  }

  /**
   * Process monsters wikitext to extract structured data
   */
  async processMonstersWikitext(wikitextData) {
    const monsters = {}
    const totalPages = Object.keys(wikitextData).length
    let processedCount = 0
    
    console.log(`🔄 Processing ${totalPages} monster pages...`)
    
    for (const [pageTitle, wikitext] of Object.entries(wikitextData)) {
      try {
        const parser = new WikitextParser(wikitext)
        
        // Try to extract monster infobox
        if (parser.extractInfobox('infobox monster')) {
          const monsterData = this.extractMonsterData(parser, pageTitle)
          
          if (monsterData && monsterData.id) {
            monsters[monsterData.id] = monsterData
            this.stats.monstersProcessed++
          }
        }
      } catch (error) {
        console.error(`❌ Error processing ${pageTitle}:`, error.message)
      }
      
      processedCount++
      if (processedCount % 50 === 0) {
        console.log(`   Progress: ${processedCount}/${totalPages} pages processed`)
      }
    }
    
    console.log(`✅ Processed ${this.stats.monstersProcessed} monsters from ${totalPages} pages`)
    return monsters
  }

  /**
   * Extract monster data from a parsed infobox
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
   * Load cached data
   */
  async loadCachedData(filename) {
    try {
      const data = await readFile(join(CACHE_DIR, filename), 'utf8')
      return JSON.parse(data)
    } catch (error) {
      console.error(`❌ Error loading cached data from ${filename}:`, error.message)
      return {}
    }
  }

  /**
   * Main scraping method
   */
  async run() {
    console.log('🎮 OSRS Wiki Data Scraper')
    console.log('========================')
    console.log('Scraping data directly from the OSRS Wiki')
    console.log('')

    this.startTime = Date.now()
    
    await this.initDirectories()
    await this.loadCheckpoint()
    
    try {
      // Scrape items data
      const itemsData = await this.scrapeItems()
      
      // Scrape monsters data
      const monstersData = await this.scrapeMonsters()
      
      // Process and save final data
      await this.processFinalData(itemsData, monstersData)
      
      // Update stats and save final checkpoint
      this.stats.totalProcessed = this.stats.itemsProcessed + this.stats.monstersProcessed
      this.stats.lastUpdated = new Date().toISOString()
      await this.saveCheckpoint()
      
      const elapsed = (Date.now() - this.startTime) / 1000
      console.log(`\n🎉 Scraping completed successfully!`)
      console.log(`📊 Stats:`)
      console.log(`   - Items processed: ${this.stats.itemsProcessed}`)
      console.log(`   - Monsters processed: ${this.stats.monstersProcessed}`)
      console.log(`   - Total processed: ${this.stats.totalProcessed}`)
      console.log(`   - Time elapsed: ${elapsed.toFixed(1)}s`)
      
    } catch (error) {
      console.error('❌ Scraping failed:', error.message)
      await this.saveCheckpoint()
      throw error
    }
  }

  /**
   * Process and save final data files
   */
  async processFinalData(itemsData, monstersData) {
    console.log('\n💾 Processing and saving final data files...')
    
    // Save processed items
    await writeFile(
      join(PROCESSED_DIR, 'items.json'),
      JSON.stringify(itemsData, null, 2)
    )
    
    // Create equipment subset
    const equipment = {}
    const weapons = {}
    
    for (const [id, item] of Object.entries(itemsData)) {
      if (item.equipable_by_player) {
        equipment[id] = item
        
        if (item.equipable_weapon) {
          weapons[id] = item
        }
      }
    }
    
    await writeFile(
      join(PROCESSED_DIR, 'equipment.json'),
      JSON.stringify(equipment, null, 2)
    )
    
    await writeFile(
      join(PROCESSED_DIR, 'weapons.json'),
      JSON.stringify(weapons, null, 2)
    )
    
    // Save processed monsters
    await writeFile(
      join(PROCESSED_DIR, 'monsters.json'),
      JSON.stringify(monstersData, null, 2)
    )
    
    // Create summary file
    const summary = {
      items: Object.keys(itemsData).length,
      equipment: Object.keys(equipment).length,
      weapons: Object.keys(weapons).length,
      monsters: Object.keys(monstersData).length,
      last_updated: new Date().toISOString(),
      source: 'OSRS Wiki',
      data_version: '1.0'
    }
    
    await writeFile(
      join(PROCESSED_DIR, 'summary.json'),
      JSON.stringify(summary, null, 2)
    )
    
    console.log('✅ Final data files saved successfully')
  }
}

export default OSRSWikiScraper
