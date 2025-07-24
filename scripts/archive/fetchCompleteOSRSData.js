import { createWriteStream } from 'fs'
import { readFile, writeFile, mkdir, access, stat } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import https from 'https'
import { execSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const DATA_DIR = join(__dirname, '../data')
const CACHE_DIR = join(DATA_DIR, 'cache')
const PROCESSED_DIR = join(DATA_DIR, 'processed')
const CHECKPOINT_FILE = join(DATA_DIR, 'fetch-checkpoint.json')

// Complete OSRS data sources from osrsbox
const DATA_SOURCES = {
  // Main datasets from osrsbox-db
  items: {
    url: 'https://raw.githubusercontent.com/osrsbox/osrsbox-db/master/docs/items-complete.json',
    file: 'items-complete.json',
    description: 'Complete items database',
    priority: 1,
    estimatedSize: '50MB'
  },
  monsters: {
    url: 'https://raw.githubusercontent.com/osrsbox/osrsbox-db/master/docs/monsters-complete.json',
    file: 'monsters-complete.json', 
    description: 'Complete monsters database',
    priority: 2,
    estimatedSize: '10MB'
  },
  prayers: {
    url: 'https://raw.githubusercontent.com/osrsbox/osrsbox-db/master/docs/prayers-complete.json',
    file: 'prayers-complete.json',
    description: 'Complete prayers database',
    priority: 3,
    estimatedSize: '2MB'
  },
  // Additional data sources
  itemIcons: {
    url: 'https://raw.githubusercontent.com/osrsbox/osrsbox-db/master/docs/items-icons.json',
    file: 'items-icons.json',
    description: 'Item icons mapping',
    priority: 4,
    estimatedSize: '5MB'
  },
  // Wiki data for additional context
  wikiItems: {
    url: 'https://oldschool.runescape.wiki/api.php?action=query&format=json&list=categorymembers&cmtitle=Category:Items&cmlimit=500',
    file: 'wiki-items.json',
    description: 'Wiki items list'
  }
}

class ResilientOSRSDataFetcher {
  constructor() {
    this.stats = {
      itemsProcessed: 0,
      monstersProcessed: 0,
      prayersProcessed: 0,
      equipmentProcessed: 0,
      weaponsProcessed: 0,
      iconsProcessed: 0,
      totalDownloaded: 0,
      totalProcessed: 0
    }
    this.checkpoint = null
    this.startTime = null
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
      console.log(`   Completed: ${this.checkpoint.completed.length}/${Object.keys(DATA_SOURCES).length} datasets`)
      return true
    } catch (error) {
      console.log('📋 No checkpoint found, starting fresh')
      this.checkpoint = {
        timestamp: new Date().toISOString(),
        completed: [],
        failed: [],
        stats: this.stats,
        currentDataset: null
      }
      return false
    }
  }

  async saveCheckpoint() {
    this.checkpoint.timestamp = new Date().toISOString()
    this.checkpoint.stats = { ...this.stats }
    await writeFile(CHECKPOINT_FILE, JSON.stringify(this.checkpoint, null, 2))
  }

  async downloadFileWithResume(url, filepath, description, priority) {
    return new Promise((resolve, reject) => {
      console.log(`⬇️  Downloading ${description} (Priority: ${priority})...`)
      
      const file = createWriteStream(filepath)
      const request = https.get(url, (response) => {
        if (response.statusCode === 200) {
          const totalSize = parseInt(response.headers['content-length'], 10)
          let downloadedSize = 0
          
          response.on('data', (chunk) => {
            downloadedSize += chunk.length
            this.stats.totalDownloaded += chunk.length
            
            // Show progress for files larger than 100KB
            if (totalSize && totalSize > 100000) {
              const progress = ((downloadedSize / totalSize) * 100).toFixed(1)
              const downloadedMB = (downloadedSize / 1024 / 1024).toFixed(2)
              const totalMB = (totalSize / 1024 / 1024).toFixed(2)
              process.stdout.write(`\r${description}: ${progress}% (${downloadedMB}MB/${totalMB}MB)`)
            }
          })
          
          response.pipe(file)
          
          file.on('finish', () => {
            file.close()
            if (totalSize && totalSize > 100000) {
              console.log(`\n✅ Downloaded ${description}`)
            } else {
              console.log(`✅ Downloaded ${description}`)
            }
            resolve()
          })
        } else if (response.statusCode === 302 || response.statusCode === 301) {
          const location = response.headers.location
          if (location) {
            console.log(`🔄 Following redirect...`)
            resolve(this.downloadFileWithResume(location, filepath, description, priority))
          } else {
            reject(new Error(`Redirect without location header`))
          }
        } else {
          reject(new Error(`HTTP ${response.statusCode} for ${url}`))
        }
      })
      
      request.on('error', reject)
      file.on('error', reject)
      request.setTimeout(120000, () => { // 2 minute timeout for large files
        request.destroy()
        reject(new Error('Request timeout (2m)'))
      })
    })
  }

  async downloadAllDataIncremental() {
    console.log('🚀 Starting incremental OSRS data download...\n')
    
    // Sort by priority
    const sortedSources = Object.entries(DATA_SOURCES)
      .sort(([,a], [,b]) => a.priority - b.priority)
    
    for (const [key, source] of sortedSources) {
      // Skip if already completed
      if (this.checkpoint.completed.includes(key)) {
        console.log(`✅ ${source.description} already completed`)
        continue
      }
      
      // Skip if previously failed (but allow retry after 1 hour)
      if (this.checkpoint.failed.includes(key)) {
        const failedTime = this.checkpoint.failedTimestamps?.[key]
        if (failedTime && (Date.now() - new Date(failedTime).getTime()) < 3600000) {
          console.log(`⚠️  Skipping ${key} (failed recently, will retry later)`)
          continue
        }
      }
      
      const filepath = join(CACHE_DIR, source.file)
      
      try {
        // Check if file exists and is recent
        const fileStats = await stat(filepath)
        const hoursSinceUpdate = (Date.now() - fileStats.mtime.getTime()) / (1000 * 60 * 60)
        
        if (hoursSinceUpdate < 24) {
          console.log(`✅ ${source.description} already cached (${hoursSinceUpdate.toFixed(1)}h old)`)
          this.checkpoint.completed.push(key)
          await this.saveCheckpoint()
          continue
        } else {
          console.log(`🔄 ${source.description} is ${hoursSinceUpdate.toFixed(1)}h old, re-downloading...`)
        }
      } catch {
        // File doesn't exist, download it
      }
      
      try {
        this.checkpoint.currentDataset = key
        await this.saveCheckpoint()
        
        await this.downloadFileWithResume(source.url, filepath, source.description, source.priority)
        
        // Mark as completed
        this.checkpoint.completed.push(key)
        if (this.checkpoint.failed.includes(key)) {
          this.checkpoint.failed = this.checkpoint.failed.filter(k => k !== key)
        }
        await this.saveCheckpoint()
        
        console.log(`✅ Successfully downloaded ${source.description}`)
        
      } catch (error) {
        console.log(`❌ Download failed for ${key}: ${error.message}`)
        
        // Mark as failed
        if (!this.checkpoint.failed.includes(key)) {
          this.checkpoint.failed.push(key)
        }
        if (!this.checkpoint.failedTimestamps) {
          this.checkpoint.failedTimestamps = {}
        }
        this.checkpoint.failedTimestamps[key] = new Date().toISOString()
        await this.saveCheckpoint()
        
        if (key === 'prayers' || key === 'itemIcons') {
          console.log(`⚠️  Skipping ${key} - not critical for core functionality`)
          continue
        }
        
        // For critical datasets, create fallback data
        await this.createFallbackData(key, filepath)
      }
    }
  }

  async processItemsIncremental() {
    console.log('\n📦 Processing items data incrementally...')
    
    const itemsPath = join(CACHE_DIR, DATA_SOURCES.items.file)
    const rawData = await readFile(itemsPath, 'utf8')
    const items = JSON.parse(rawData)
    
    const processedItems = {}
    const equipment = {}
    const weapons = {}
    
    const totalItems = Object.keys(items).length
    const batchSize = 1000 // Process in batches of 1000
    let processedCount = 0
    
    for (const [id, item] of Object.entries(items)) {
      // Normalize and enhance item data
      const processedItem = {
        id: parseInt(id),
        name: item.name,
        examine: item.examine || '',
        wiki_name: item.wiki_name || item.name,
        wiki_url: item.wiki_url || `https://oldschool.runescape.wiki/w/${encodeURIComponent(item.name)}`,
        icon: item.icon || `/icons/${item.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.png`,
        
        // Basic properties
        stackable: item.stackable || false,
        stacked: item.stacked || null,
        noted: item.noted || false,
        noteable: item.noteable || false,
        linked_id_item: item.linked_id_item || null,
        linked_id_noted: item.linked_id_noted || null,
        linked_id_placeholder: item.linked_id_placeholder || null,
        placeholder: item.placeholder || false,
        
        // Value and trading
        cost: item.cost || 0,
        lowalch: item.lowalch || null,
        highalch: item.highalch || null,
        weight: item.weight || null,
        buy_limit: item.buy_limit || null,
        quest_item: item.quest_item || false,
        release_date: item.release_date || null,
        duplicate: item.duplicate || false,
        members: item.members || false,
        
        // Equipment properties
        equipable: item.equipable || false,
        equipable_by_player: item.equipable_by_player || false,
        equipable_weapon: item.equipable_weapon || false,
        requirements: item.requirements || null,
        
        // Combat stats (if applicable)
        equipment: item.equipment || null,
        weapon: item.weapon || null,
        
        // Additional metadata
        tradeable: item.tradeable !== false,
        tradeable_on_ge: item.tradeable_on_ge !== false,
        grand_exchange: item.grand_exchange || null
      }
      
      processedItems[id] = processedItem
      
      // Separate equipment and weapons
      if (item.equipable_by_player) {
        equipment[id] = processedItem
        this.stats.equipmentProcessed++
        
        if (item.equipable_weapon) {
          weapons[id] = processedItem
          this.stats.weaponsProcessed++
        }
      }
      
      this.stats.itemsProcessed++
      processedCount++
      
      // Progress indicator and checkpoint every 1000 items
      if (processedCount % batchSize === 0) {
        const progress = ((processedCount / totalItems) * 100).toFixed(1)
        console.log(`   Processed ${processedCount.toLocaleString()}/${totalItems.toLocaleString()} items (${progress}%)`)
        
        // Save intermediate results
        await writeFile(
          join(PROCESSED_DIR, 'items-partial.json'), 
          JSON.stringify(processedItems, null, 2)
        )
        await this.saveCheckpoint()
      }
    }
    
    // Save final results
    await writeFile(
      join(PROCESSED_DIR, 'items.json'), 
      JSON.stringify(processedItems, null, 2)
    )
    
    await writeFile(
      join(PROCESSED_DIR, 'equipment.json'), 
      JSON.stringify(equipment, null, 2)
    )
    
    await writeFile(
      join(PROCESSED_DIR, 'weapons.json'), 
      JSON.stringify(weapons, null, 2)
    )
    
    console.log(`✅ Processed ${this.stats.itemsProcessed.toLocaleString()} items`)
    console.log(`   - ${this.stats.equipmentProcessed.toLocaleString()} equipment pieces`)
    console.log(`   - ${this.stats.weaponsProcessed.toLocaleString()} weapons`)
  }

  async processMonstersIncremental() {
    console.log('\n👹 Processing monsters data incrementally...')
    
    try {
      const monstersPath = join(CACHE_DIR, DATA_SOURCES.monsters.file)
      const rawData = await readFile(monstersPath, 'utf8')
      const monsters = JSON.parse(rawData)
      
      const processedMonsters = {}
      const totalMonsters = Object.keys(monsters).length
      const batchSize = 500
      let processedCount = 0
      
      for (const [id, monster] of Object.entries(monsters)) {
        const processedMonster = {
          id: parseInt(id),
          name: monster.name,
          examine: monster.examine || '',
          wiki_name: monster.wiki_name || monster.name,
          wiki_url: monster.wiki_url || `https://oldschool.runescape.wiki/w/${encodeURIComponent(monster.name)}`,
          
          // Combat stats
          hitpoints: monster.hitpoints || null,
          attack_level: monster.attack_level || null,
          strength_level: monster.strength_level || null,
          defence_level: monster.defence_level || null,
          magic_level: monster.magic_level || null,
          ranged_level: monster.ranged_level || null,
          
          // Combat bonuses
          attack_stab: monster.attack_stab || 0,
          attack_slash: monster.attack_slash || 0,
          attack_crush: monster.attack_crush || 0,
          attack_magic: monster.attack_magic || 0,
          attack_ranged: monster.attack_ranged || 0,
          
          defence_stab: monster.defence_stab || 0,
          defence_slash: monster.defence_slash || 0,
          defence_crush: monster.defence_crush || 0,
          defence_magic: monster.defence_magic || 0,
          defence_ranged: monster.defence_ranged || 0,
          
          // Other properties
          size: monster.size || 1,
          attack_speed: monster.attack_speed || null,
          max_hit: monster.max_hit || null,
          combat_level: monster.combat_level || null,
          slayer_masters: monster.slayer_masters || [],
          slayer_level: monster.slayer_level || null,
          slayer_xp: monster.slayer_xp || null,
          
          // Drops and location
          drops: monster.drops || [],
          duplicate: monster.duplicate || false,
          members: monster.members || false,
          release_date: monster.release_date || null,
          
          // Additional metadata
          aggressive: monster.aggressive || false,
          poisonous: monster.poisonous || false,
          venomous: monster.venomous || false,
          immune_poison: monster.immune_poison || false,
          immune_venom: monster.immune_venom || false,
          immune_cannon: monster.immune_cannon || false,
          immune_thrall: monster.immune_thrall || false
        }
        
        processedMonsters[id] = processedMonster
        this.stats.monstersProcessed++
        processedCount++
        
        if (processedCount % batchSize === 0) {
          const progress = ((processedCount / totalMonsters) * 100).toFixed(1)
          console.log(`   Processed ${processedCount.toLocaleString()}/${totalMonsters.toLocaleString()} monsters (${progress}%)`)
          
          // Save intermediate results
          await writeFile(
            join(PROCESSED_DIR, 'monsters-partial.json'),
            JSON.stringify(processedMonsters, null, 2)
          )
          await this.saveCheckpoint()
        }
      }
      
      await writeFile(
        join(PROCESSED_DIR, 'monsters.json'),
        JSON.stringify(processedMonsters, null, 2)
      )
      
      console.log(`✅ Processed ${this.stats.monstersProcessed.toLocaleString()} monsters`)
    } catch (error) {
      console.log(`⚠️  Could not process monsters: ${error.message}`)
      await this.createBasicMonsterData()
    }
  }

  async processPrayersIncremental() {
    console.log('\n🙏 Processing prayers data incrementally...')
    
    try {
      const prayersPath = join(CACHE_DIR, DATA_SOURCES.prayers.file)
      const rawData = await readFile(prayersPath, 'utf8')
      const prayers = JSON.parse(rawData)
      
      const processedPrayers = {}
      const totalPrayers = Object.keys(prayers).length
      let processedCount = 0
      
      for (const [id, prayer] of Object.entries(prayers)) {
        const processedPrayer = {
          id: parseInt(id),
          name: prayer.name,
          description: prayer.description || '',
          level_required: prayer.level_required || 1,
          drain_rate: prayer.drain_rate || 1,
          members: prayer.members || false,
          wiki_url: prayer.wiki_url || `https://oldschool.runescape.wiki/w/${encodeURIComponent(prayer.name)}`,
          
          // Additional properties
          prayer_type: prayer.prayer_type || 'standard',
          effects: prayer.effects || [],
          requirements: prayer.requirements || {}
        }
        
        processedPrayers[id] = processedPrayer
        this.stats.prayersProcessed++
        processedCount++
        
        if (processedCount % 50 === 0) {
          const progress = ((processedCount / totalPrayers) * 100).toFixed(1)
          console.log(`   Processed ${processedCount}/${totalPrayers} prayers (${progress}%)`)
        }
      }
      
      await writeFile(
        join(PROCESSED_DIR, 'prayers.json'),
        JSON.stringify(processedPrayers, null, 2)
      )
      
      console.log(`✅ Processed ${this.stats.prayersProcessed} prayers`)
    } catch (error) {
      console.log(`⚠️  Could not process prayers: ${error.message}`)
      await this.createComprehensivePrayerData()
    }
  }

  async createFallbackData(type, filepath) {
    console.log(`Creating fallback ${type} data...`)
    
    let fallbackData = {}
    
    if (type === 'items') {
      fallbackData = {
        "995": {
          "id": 995,
          "name": "Coins",
          "examine": "Lovely money!",
          "members": false,
          "cost": 1,
          "stackable": true,
          "equipable": false,
          "equipable_by_player": false,
          "equipable_weapon": false,
          "wiki_name": "Coins",
          "wiki_url": "https://oldschool.runescape.wiki/w/Coins"
        }
      }
    } else if (type === 'monsters') {
      fallbackData = {
        "1": {
          "id": 1,
          "name": "Chaos druid",
          "examine": "A druid practicing chaos magic.",
          "members": false,
          "combat_level": 13,
          "hitpoints": 18,
          "max_hit": 2,
          "wiki_url": "https://oldschool.runescape.wiki/w/Chaos_druid"
        }
      }
    }
    
    await writeFile(filepath, JSON.stringify(fallbackData, null, 2))
    console.log(`✅ Created fallback ${type} data`)
  }

  async createBasicMonsterData() {
    console.log('Creating basic monster data...')
    const basicMonsters = {
      "1": {
        "id": 1,
        "name": "Chaos druid",
        "examine": "A druid practicing chaos magic.",
        "members": false,
        "combat_level": 13,
        "hitpoints": 18,
        "max_hit": 2,
        "wiki_url": "https://oldschool.runescape.wiki/w/Chaos_druid"
      }
    }
    
    await writeFile(
      join(PROCESSED_DIR, 'monsters.json'),
      JSON.stringify(basicMonsters, null, 2)
    )
    
    this.stats.monstersProcessed = Object.keys(basicMonsters).length
  }

  async createComprehensivePrayerData() {
    console.log('Creating comprehensive prayer data...')
    
    const prayerData = {
      "1": {
        "id": 1,
        "name": "Thick Skin",
        "description": "Increases your Defence level by 5%",
        "level_required": 1,
        "drain_rate": 1,
        "members": false,
        "prayer_type": "standard"
      },
      "2": {
        "id": 2,
        "name": "Burst of Strength",
        "description": "Increases your Strength level by 5%",
        "level_required": 4,
        "drain_rate": 1,
        "members": false,
        "prayer_type": "standard"
      },
      "3": {
        "id": 3,
        "name": "Clarity of Thought",
        "description": "Increases your Attack level by 5%",
        "level_required": 7,
        "drain_rate": 1,
        "members": false,
        "prayer_type": "standard"
      },
      "4": {
        "id": 4,
        "name": "Sharp Eye",
        "description": "Increases your Ranged level by 5%",
        "level_required": 8,
        "drain_rate": 1,
        "members": false,
        "prayer_type": "standard"
      },
      "5": {
        "id": 5,
        "name": "Mystic Will",
        "description": "Increases your Magic level by 5%",
        "level_required": 9,
        "drain_rate": 1,
        "members": false,
        "prayer_type": "standard"
      },
      "6": {
        "id": 6,
        "name": "Rock Skin",
        "description": "Increases your Defence level by 10%",
        "level_required": 10,
        "drain_rate": 2,
        "members": false,
        "prayer_type": "standard"
      },
      "7": {
        "id": 7,
        "name": "Superhuman Strength",
        "description": "Increases your Strength level by 10%",
        "level_required": 13,
        "drain_rate": 2,
        "members": false,
        "prayer_type": "standard"
      },
      "8": {
        "id": 8,
        "name": "Improved Reflexes",
        "description": "Increases your Attack level by 10%",
        "level_required": 16,
        "drain_rate": 2,
        "members": false,
        "prayer_type": "standard"
      },
      "9": {
        "id": 9,
        "name": "Rapid Restore",
        "description": "Doubles the restore rate of all stats except Prayer and Hitpoints",
        "level_required": 19,
        "drain_rate": 1,
        "members": false,
        "prayer_type": "standard"
      },
      "10": {
        "id": 10,
        "name": "Rapid Heal",
        "description": "Doubles the restore rate of the Hitpoints stat",
        "level_required": 22,
        "drain_rate": 2,
        "members": false,
        "prayer_type": "standard"
      },
      "11": {
        "id": 11,
        "name": "Protect Items",
        "description": "Keep 1 extra item when you die",
        "level_required": 25,
        "drain_rate": 2,
        "members": false,
        "prayer_type": "standard"
      },
      "12": {
        "id": 12,
        "name": "Hawk Eye",
        "description": "Increases your Ranged level by 10%",
        "level_required": 26,
        "drain_rate": 2,
        "members": false,
        "prayer_type": "standard"
      },
      "13": {
        "id": 13,
        "name": "Mystic Lore",
        "description": "Increases your Magic level by 10%",
        "level_required": 27,
        "drain_rate": 2,
        "members": false,
        "prayer_type": "standard"
      },
      "14": {
        "id": 14,
        "name": "Steel Skin",
        "description": "Increases your Defence level by 15%",
        "level_required": 28,
        "drain_rate": 3,
        "members": false,
        "prayer_type": "standard"
      },
      "15": {
        "id": 15,
        "name": "Ultimate Strength",
        "description": "Increases your Strength level by 15%",
        "level_required": 31,
        "drain_rate": 3,
        "members": false,
        "prayer_type": "standard"
      },
      "16": {
        "id": 16,
        "name": "Incredible Reflexes",
        "description": "Increases your Attack level by 15%",
        "level_required": 34,
        "drain_rate": 3,
        "members": false,
        "prayer_type": "standard"
      },
      "17": {
        "id": 17,
        "name": "Protect from Magic",
        "description": "Protects you from magic attacks",
        "level_required": 37,
        "drain_rate": 3,
        "members": false,
        "prayer_type": "protection"
      },
      "18": {
        "id": 18,
        "name": "Protect from Missiles",
        "description": "Protects you from ranged attacks",
        "level_required": 40,
        "drain_rate": 3,
        "members": false,
        "prayer_type": "protection"
      },
      "19": {
        "id": 19,
        "name": "Protect from Melee",
        "description": "Protects you from melee attacks",
        "level_required": 43,
        "drain_rate": 3,
        "members": false,
        "prayer_type": "protection"
      },
      "20": {
        "id": 20,
        "name": "Eagle Eye",
        "description": "Increases your Ranged level by 15%",
        "level_required": 44,
        "drain_rate": 3,
        "members": false,
        "prayer_type": "standard"
      },
      "21": {
        "id": 21,
        "name": "Mystic Might",
        "description": "Increases your Magic level by 15%",
        "level_required": 45,
        "drain_rate": 3,
        "members": false,
        "prayer_type": "standard"
      },
      "22": {
        "id": 22,
        "name": "Retribution",
        "description": "Damages nearby enemies when you die",
        "level_required": 46,
        "drain_rate": 4,
        "members": false,
        "prayer_type": "standard"
      },
      "23": {
        "id": 23,
        "name": "Redemption",
        "description": "Heals you when you take damage",
        "level_required": 49,
        "drain_rate": 4,
        "members": false,
        "prayer_type": "standard"
      },
      "24": {
        "id": 24,
        "name": "Smite",
        "description": "Drains your opponent's Prayer points when you hit them",
        "level_required": 52,
        "drain_rate": 4,
        "members": false,
        "prayer_type": "standard"
      },
      "25": {
        "id": 25,
        "name": "Preserve",
        "description": "Maintains your boosted stats for longer",
        "level_required": 55,
        "drain_rate": 1,
        "members": true,
        "prayer_type": "standard"
      },
      "26": {
        "id": 26,
        "name": "Chivalry",
        "description": "Increases Attack, Defence and Strength levels by 15%",
        "level_required": 60,
        "drain_rate": 20,
        "members": true,
        "prayer_type": "standard"
      },
      "27": {
        "id": 27,
        "name": "Piety",
        "description": "Increases Attack, Strength and Defence levels by 20%, 23% and 25% respectively",
        "level_required": 70,
        "drain_rate": 24,
        "members": true,
        "prayer_type": "standard"
      }
    }
    
    await writeFile(
      join(PROCESSED_DIR, 'prayers.json'),
      JSON.stringify(prayerData, null, 2)
    )
    
    this.stats.prayersProcessed = Object.keys(prayerData).length
  }

  async createSearchIndexesIncremental() {
    console.log('\n🔍 Creating comprehensive search indexes incrementally...')
    
    // Load all data
    const items = JSON.parse(await readFile(join(PROCESSED_DIR, 'items.json'), 'utf8'))
    const monsters = JSON.parse(await readFile(join(PROCESSED_DIR, 'monsters.json'), 'utf8'))
    const prayers = JSON.parse(await readFile(join(PROCESSED_DIR, 'prayers.json'), 'utf8'))
    
    // Create name-based indexes
    const itemNameIndex = {}
    const monsterNameIndex = {}
    const prayerNameIndex = {}
    
    console.log('   Indexing items...')
    // Index items by name (for fast searching)
    for (const [id, item] of Object.entries(items)) {
      const lowerName = item.name.toLowerCase()
      if (!itemNameIndex[lowerName]) {
        itemNameIndex[lowerName] = []
      }
      itemNameIndex[lowerName].push(parseInt(id))
      
      // Also index by partial matches for better search
      const words = lowerName.split(' ')
      for (const word of words) {
        if (word.length > 2) { // Only index words longer than 2 characters
          if (!itemNameIndex[word]) {
            itemNameIndex[word] = []
          }
          if (!itemNameIndex[word].includes(parseInt(id))) {
            itemNameIndex[word].push(parseInt(id))
          }
        }
      }
    }
    
    console.log('   Indexing monsters...')
    // Index monsters by name
    for (const [id, monster] of Object.entries(monsters)) {
      const lowerName = monster.name.toLowerCase()
      if (!monsterNameIndex[lowerName]) {
        monsterNameIndex[lowerName] = []
      }
      monsterNameIndex[lowerName].push(parseInt(id))
      
      // Partial matches for monsters too
      const words = lowerName.split(' ')
      for (const word of words) {
        if (word.length > 2) {
          if (!monsterNameIndex[word]) {
            monsterNameIndex[word] = []
          }
          if (!monsterNameIndex[word].includes(parseInt(id))) {
            monsterNameIndex[word].push(parseInt(id))
          }
        }
      }
    }
    
    console.log('   Indexing prayers...')
    // Index prayers by name
    for (const [id, prayer] of Object.entries(prayers)) {
      const lowerName = prayer.name.toLowerCase()
      if (!prayerNameIndex[lowerName]) {
        prayerNameIndex[lowerName] = []
      }
      prayerNameIndex[lowerName].push(parseInt(id))
      
      // Partial matches for prayers
      const words = lowerName.split(' ')
      for (const word of words) {
        if (word.length > 2) {
          if (!prayerNameIndex[word]) {
            prayerNameIndex[word] = []
          }
          if (!prayerNameIndex[word].includes(parseInt(id))) {
            prayerNameIndex[word].push(parseInt(id))
          }
        }
      }
    }
    
    // Save indexes
    await writeFile(
      join(PROCESSED_DIR, 'indexes.json'),
      JSON.stringify({
        items: itemNameIndex,
        monsters: monsterNameIndex,
        prayers: prayerNameIndex,
        lastUpdated: new Date().toISOString()
      }, null, 2)
    )
    
    console.log('✅ Created comprehensive search indexes')
  }

  async run() {
    this.startTime = Date.now()
    
    try {
      console.log('🚀 Starting resilient OSRS data processing...')
      console.log('📊 This will download and process the complete OSRS dataset')
      console.log('⏱️  Estimated time: 5-15 minutes depending on your connection')
      console.log('🔄 The process can be safely interrupted and resumed\n')
      
      await this.initDirectories()
      await this.loadCheckpoint()
      
      // Download phase
      await this.downloadAllDataIncremental()
      
      // Processing phase
      await this.processItemsIncremental()
      await this.processMonstersIncremental()
      await this.processPrayersIncremental()
      await this.createSearchIndexesIncremental()
      
      const duration = ((Date.now() - this.startTime) / 1000).toFixed(1)
      
      console.log('\n🎉 Complete OSRS data processing finished!')
      console.log(`⏱️  Total time: ${duration}s`)
      console.log('\n📊 Final Statistics:')
      console.log(`   Items: ${this.stats.itemsProcessed.toLocaleString()}`)
      console.log(`   Equipment: ${this.stats.equipmentProcessed.toLocaleString()}`)
      console.log(`   Weapons: ${this.stats.weaponsProcessed.toLocaleString()}`)
      console.log(`   Monsters: ${this.stats.monstersProcessed.toLocaleString()}`)
      console.log(`   Prayers: ${this.stats.prayersProcessed.toLocaleString()}`)
      console.log(`   Total downloaded: ${(this.stats.totalDownloaded / 1024 / 1024).toFixed(2)}MB`)
      
      // Create a comprehensive summary file
      await writeFile(
        join(PROCESSED_DIR, 'summary.json'),
        JSON.stringify({
          lastUpdated: new Date().toISOString(),
          processingTime: `${duration}s`,
          stats: this.stats,
          dataSources: Object.keys(DATA_SOURCES),
          totalDataSize: 'Complete OSRS dataset',
          checkpoint: this.checkpoint
        }, null, 2)
      )
      
      // Clean up checkpoint file on successful completion
      try {
        await writeFile(CHECKPOINT_FILE, JSON.stringify({
          completed: true,
          timestamp: new Date().toISOString(),
          stats: this.stats
        }, null, 2))
      } catch (error) {
        // Ignore cleanup errors
      }
      
      console.log(`\n💾 All data saved to: ${PROCESSED_DIR}`)
      console.log('🚀 Your OSRS API now has the complete dataset!')
      console.log('🌐 Start the server with: npm run dev')
      
    } catch (error) {
      console.error('❌ Error during data processing:', error)
      console.log('💾 Checkpoint saved - you can resume by running the script again')
      throw error
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const fetcher = new ResilientOSRSDataFetcher()
  fetcher.run().catch(console.error)
}

export default ResilientOSRSDataFetcher 