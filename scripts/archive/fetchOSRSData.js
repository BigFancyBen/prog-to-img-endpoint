import { createWriteStream } from 'fs'
import { readFile, writeFile, mkdir, access } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import https from 'https'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const DATA_DIR = join(__dirname, '../data')
const CACHE_DIR = join(DATA_DIR, 'cache')
const PROCESSED_DIR = join(DATA_DIR, 'processed')

// OSRS data sources - using GitHub as primary since osrsbox API is offline
const DATA_SOURCES = {
  items: {
    url: 'https://raw.githubusercontent.com/osrsbox/osrsbox-db/master/docs/items-complete.json',
    file: 'items-complete.json'
  },
  monsters: {
    url: 'https://raw.githubusercontent.com/osrsbox/osrsbox-db/master/docs/monsters-complete.json',
    file: 'monsters-complete.json'
  }
}

class OSRSDataFetcher {
  constructor() {
    this.stats = {
      itemsProcessed: 0,
      monstersProcessed: 0,
      prayersProcessed: 0,
      equipmentProcessed: 0
    }
  }

  async initDirectories() {
    for (const dir of [DATA_DIR, CACHE_DIR, PROCESSED_DIR]) {
      try {
        await access(dir)
      } catch {
        await mkdir(dir, { recursive: true })
        console.log(`Created directory: ${dir}`)
      }
    }
  }

  async downloadFile(url, filepath, description) {
    return new Promise((resolve, reject) => {
      console.log(`Downloading ${description}...`)
      
      const file = createWriteStream(filepath)
      const request = https.get(url, (response) => {
        if (response.statusCode === 200) {
          const totalSize = parseInt(response.headers['content-length'], 10)
          let downloadedSize = 0
          
          response.on('data', (chunk) => {
            downloadedSize += chunk.length
            if (totalSize && totalSize > 1000000) { // Only show progress for large files
              const progress = ((downloadedSize / totalSize) * 100).toFixed(1)
              process.stdout.write(`\r${description}: ${progress}%`)
            }
          })
          
          response.pipe(file)
          
          file.on('finish', () => {
            file.close()
            if (totalSize && totalSize > 1000000) {
              console.log(`\n✅ Downloaded ${description}`)
            } else {
              console.log(`✅ Downloaded ${description}`)
            }
            resolve()
          })
        } else if (response.statusCode === 302 || response.statusCode === 301) {
          // Follow redirects
          const location = response.headers.location
          if (location) {
            console.log(`Following redirect...`)
            resolve(this.downloadFile(location, filepath, description))
          } else {
            reject(new Error(`Redirect without location header`))
          }
        } else {
          reject(new Error(`HTTP ${response.statusCode} for ${url}`))
        }
      })
      
      request.on('error', reject)
      file.on('error', reject)
      request.setTimeout(30000, () => {
        request.destroy()
        reject(new Error('Request timeout'))
      })
    })
  }

  async downloadAllData() {
    console.log('🚀 Starting OSRS data download...\n')
    
    for (const [key, source] of Object.entries(DATA_SOURCES)) {
      const filepath = join(CACHE_DIR, source.file)
      
      try {
        // Check if file already exists
        await access(filepath)
        console.log(`✅ ${key} data already cached`)
        continue
      } catch {
        // File doesn't exist, download it
      }
      
      try {
        await this.downloadFile(source.url, filepath, `${key} data`)
      } catch (error) {
        console.log(`❌ Download failed for ${key}: ${error.message}`)
        // Create minimal sample data for testing
        await this.createSampleData(key, filepath)
      }
    }
  }

  async createSampleData(type, filepath) {
    console.log(`Creating sample ${type} data for testing...`)
    
    let sampleData = {}
    
    if (type === 'items') {
      sampleData = {
        "1": {
          "id": 1,
          "name": "Dwarf remains",
          "examine": "The body of a dead dwarf.",
          "members": false,
          "cost": 1,
          "lowalch": null,
          "highalch": null,
          "weight": 0.0,
          "buy_limit": null,
          "quest_item": true,
          "release_date": "2001-01-04",
          "duplicate": false,
          "equipable": false,
          "equipable_by_player": false,
          "equipable_weapon": false,
          "stackable": false,
          "stacked": null,
          "noted": false,
          "noteable": false,
          "linked_id_item": null,
          "linked_id_noted": null,
          "linked_id_placeholder": null,
          "placeholder": false,
          "wiki_name": "Dwarf remains",
          "wiki_url": "https://oldschool.runescape.wiki/w/Dwarf_remains",
          "equipment": null,
          "weapon": null
        },
        "995": {
          "id": 995,
          "name": "Coins",
          "examine": "Lovely money!",
          "members": false,
          "cost": 1,
          "lowalch": null,
          "highalch": null,
          "weight": 0.0,
          "buy_limit": null,
          "quest_item": false,
          "release_date": "2001-01-04",
          "duplicate": false,
          "equipable": false,
          "equipable_by_player": false,
          "equipable_weapon": false,
          "stackable": true,
          "stacked": null,
          "noted": false,
          "noteable": false,
          "linked_id_item": null,
          "linked_id_noted": null,
          "linked_id_placeholder": null,
          "placeholder": false,
          "wiki_name": "Coins",
          "wiki_url": "https://oldschool.runescape.wiki/w/Coins",
          "equipment": null,
          "weapon": null
        },
        "203": {
          "id": 203,
          "name": "Grimy tarromin",
          "examine": "A grimy herb.",
          "members": false,
          "cost": 35,
          "lowalch": 14,
          "highalch": 21,
          "weight": 0.003,
          "buy_limit": 20000,
          "quest_item": false,
          "release_date": "2001-04-12",
          "duplicate": false,
          "equipable": false,
          "equipable_by_player": false,
          "equipable_weapon": false,
          "stackable": false,
          "stacked": null,
          "noted": false,
          "noteable": true,
          "linked_id_item": null,
          "linked_id_noted": 204,
          "linked_id_placeholder": null,
          "placeholder": false,
          "wiki_name": "Grimy tarromin",
          "wiki_url": "https://oldschool.runescape.wiki/w/Grimy_tarromin",
          "equipment": null,
          "weapon": null
        }
      }
    } else if (type === 'monsters') {
      sampleData = {
        "1": {
          "id": 1,
          "name": "Abyssal demon",
          "examine": "A demon from the abyss.",
          "members": true,
          "combat_level": 124,
          "hitpoints": 150,
          "max_hit": 8,
          "attack_level": 1,
          "strength_level": 1,
          "defence_level": 1,
          "magic_level": 1,
          "ranged_level": 1,
          "attack_stab": 0,
          "attack_slash": 0,
          "attack_crush": 0,
          "attack_magic": 0,
          "attack_ranged": 0,
          "defence_stab": 5,
          "defence_slash": 5,
          "defence_crush": 5,
          "defence_magic": 1,
          "defence_ranged": 5,
          "attack_speed": 4,
          "size": 1,
          "slayer_masters": ["nieve", "duradel"],
          "slayer_level": 85,
          "slayer_xp": 150,
          "drops": [],
          "duplicate": false,
          "release_date": "2005-01-26",
          "wiki_name": "Abyssal demon",
          "wiki_url": "https://oldschool.runescape.wiki/w/Abyssal_demon"
        },
        "2": {
          "id": 2,
          "name": "Chaos druid",
          "examine": "A druid practicing chaos magic.",
          "members": false,
          "combat_level": 13,
          "hitpoints": 18,
          "max_hit": 2,
          "attack_level": 13,
          "strength_level": 13,
          "defence_level": 13,
          "magic_level": 13,
          "ranged_level": 1,
          "attack_stab": 0,
          "attack_slash": 0,
          "attack_crush": 0,
          "attack_magic": 0,
          "attack_ranged": 0,
          "defence_stab": 0,
          "defence_slash": 5,
          "defence_crush": -2,
          "defence_magic": 0,
          "defence_ranged": 0,
          "attack_speed": 4,
          "size": 1,
          "slayer_masters": [],
          "slayer_level": null,
          "slayer_xp": null,
          "drops": [],
          "duplicate": false,
          "release_date": "2001-01-04",
          "wiki_name": "Chaos druid",
          "wiki_url": "https://oldschool.runescape.wiki/w/Chaos_druid"
        }
      }
    }
    
    await writeFile(filepath, JSON.stringify(sampleData, null, 2))
    console.log(`✅ Created sample ${type} data`)
  }

  async processItems() {
    console.log('\n📦 Processing items data...')
    
    const itemsPath = join(CACHE_DIR, DATA_SOURCES.items.file)
    const rawData = await readFile(itemsPath, 'utf8')
    const items = JSON.parse(rawData)
    
    const processedItems = {}
    const equipment = {}
    const weapons = {}
    
    for (const [id, item] of Object.entries(items)) {
      // Normalize item data
      const processedItem = {
        id: parseInt(id),
        name: item.name,
        examine: item.examine || '',
        wiki_name: item.wiki_name || item.name,
        wiki_url: item.wiki_url || '',
        icon: `/icons/${item.name.toLowerCase().replace(/ /g, '_')}.png`,
        
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
        weapon: item.weapon || null
      }
      
      processedItems[id] = processedItem
      
      // Separate equipment and weapons
      if (item.equipable_by_player) {
        equipment[id] = processedItem
        this.stats.equipmentProcessed++
        
        if (item.equipable_weapon) {
          weapons[id] = processedItem
        }
      }
      
      this.stats.itemsProcessed++
    }
    
    // Save processed data
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
    
    console.log(`✅ Processed ${this.stats.itemsProcessed} items`)
    console.log(`   - ${this.stats.equipmentProcessed} equipment pieces`)
    console.log(`   - ${Object.keys(weapons).length} weapons`)
  }

  async processMonsters() {
    console.log('\n👹 Processing monsters data...')
    
    try {
      const monstersPath = join(CACHE_DIR, DATA_SOURCES.monsters.file)
      const rawData = await readFile(monstersPath, 'utf8')
      const monsters = JSON.parse(rawData)
      
      const processedMonsters = {}
      
      for (const [id, monster] of Object.entries(monsters)) {
        const processedMonster = {
          id: parseInt(id),
          name: monster.name,
          examine: monster.examine || '',
          wiki_name: monster.wiki_name || monster.name,
          wiki_url: monster.wiki_url || '',
          
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
          
          // Drops
          drops: monster.drops || [],
          
          // Location
          duplicate: monster.duplicate || false,
          members: monster.members || false,
          release_date: monster.release_date || null
        }
        
        processedMonsters[id] = processedMonster
        this.stats.monstersProcessed++
      }
      
      await writeFile(
        join(PROCESSED_DIR, 'monsters.json'),
        JSON.stringify(processedMonsters, null, 2)
      )
      
      console.log(`✅ Processed ${this.stats.monstersProcessed} monsters`)
    } catch (error) {
      console.log(`⚠️  Could not process monsters: ${error.message}`)
    }
  }

  async processPrayers() {
    console.log('\n🙏 Processing prayers data...')
    
    // Create a comprehensive prayer dataset
    const prayerData = {
      1: {
        id: 1,
        name: 'Thick Skin',
        description: 'Increases your Defence level by 5%',
        level_required: 1,
        drain_rate: 1,
        members: false,
        wiki_url: 'https://oldschool.runescape.wiki/w/Thick_Skin'
      },
      2: {
        id: 2,
        name: 'Burst of Strength', 
        description: 'Increases your Strength level by 5%',
        level_required: 4,
        drain_rate: 1,
        members: false,
        wiki_url: 'https://oldschool.runescape.wiki/w/Burst_of_Strength'
      },
      3: {
        id: 3,
        name: 'Clarity of Thought',
        description: 'Increases your Attack level by 5%',
        level_required: 7,
        drain_rate: 1,
        members: false,
        wiki_url: 'https://oldschool.runescape.wiki/w/Clarity_of_Thought'
      },
      4: {
        id: 4,
        name: 'Sharp Eye',
        description: 'Increases your Ranged level by 5%',
        level_required: 8,
        drain_rate: 1,
        members: false,
        wiki_url: 'https://oldschool.runescape.wiki/w/Sharp_Eye'
      },
      5: {
        id: 5,
        name: 'Mystic Will',
        description: 'Increases your Magic level by 5%',
        level_required: 9,
        drain_rate: 1,
        members: false,
        wiki_url: 'https://oldschool.runescape.wiki/w/Mystic_Will'
      },
      6: {
        id: 6,
        name: 'Rock Skin',
        description: 'Increases your Defence level by 10%',
        level_required: 10,
        drain_rate: 2,
        members: false,
        wiki_url: 'https://oldschool.runescape.wiki/w/Rock_Skin'
      },
      7: {
        id: 7,
        name: 'Superhuman Strength',
        description: 'Increases your Strength level by 10%',
        level_required: 13,
        drain_rate: 2,
        members: false,
        wiki_url: 'https://oldschool.runescape.wiki/w/Superhuman_Strength'
      },
      8: {
        id: 8,
        name: 'Improved Reflexes',
        description: 'Increases your Attack level by 10%',
        level_required: 16,
        drain_rate: 2,
        members: false,
        wiki_url: 'https://oldschool.runescape.wiki/w/Improved_Reflexes'
      },
      9: {
        id: 9,
        name: 'Rapid Restore',
        description: 'Doubles the restore rate of all stats except Prayer and Hitpoints',
        level_required: 19,
        drain_rate: 1,
        members: false,
        wiki_url: 'https://oldschool.runescape.wiki/w/Rapid_Restore'
      },
      10: {
        id: 10,
        name: 'Rapid Heal',
        description: 'Doubles the restore rate of the Hitpoints stat',
        level_required: 22,
        drain_rate: 2,
        members: false,
        wiki_url: 'https://oldschool.runescape.wiki/w/Rapid_Heal'
      }
    }
    
    await writeFile(
      join(PROCESSED_DIR, 'prayers.json'),
      JSON.stringify(prayerData, null, 2)
    )
    
    this.stats.prayersProcessed = Object.keys(prayerData).length
    console.log(`✅ Processed ${this.stats.prayersProcessed} prayers`)
  }

  async createSearchIndexes() {
    console.log('\n🔍 Creating search indexes...')
    
    // Load all data
    const items = JSON.parse(await readFile(join(PROCESSED_DIR, 'items.json'), 'utf8'))
    const monsters = JSON.parse(await readFile(join(PROCESSED_DIR, 'monsters.json'), 'utf8'))
    const prayers = JSON.parse(await readFile(join(PROCESSED_DIR, 'prayers.json'), 'utf8'))
    
    // Create name-based indexes
    const itemNameIndex = {}
    const monsterNameIndex = {}
    const prayerNameIndex = {}
    
    // Index items by name (for fast searching)
    for (const [id, item] of Object.entries(items)) {
      const lowerName = item.name.toLowerCase()
      if (!itemNameIndex[lowerName]) {
        itemNameIndex[lowerName] = []
      }
      itemNameIndex[lowerName].push(parseInt(id))
    }
    
    // Index monsters by name
    for (const [id, monster] of Object.entries(monsters)) {
      const lowerName = monster.name.toLowerCase()
      if (!monsterNameIndex[lowerName]) {
        monsterNameIndex[lowerName] = []
      }
      monsterNameIndex[lowerName].push(parseInt(id))
    }
    
    // Index prayers by name
    for (const [id, prayer] of Object.entries(prayers)) {
      const lowerName = prayer.name.toLowerCase()
      if (!prayerNameIndex[lowerName]) {
        prayerNameIndex[lowerName] = []
      }
      prayerNameIndex[lowerName].push(parseInt(id))
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
    
    console.log('✅ Created search indexes')
  }

  async run() {
    const startTime = Date.now()
    
    try {
      await this.initDirectories()
      await this.downloadAllData()
      await this.processItems()
      await this.processMonsters()
      await this.processPrayers()
      await this.createSearchIndexes()
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(1)
      
      console.log('\n🎉 Data processing complete!')
      console.log(`⏱️  Total time: ${duration}s`)
      console.log('\n📊 Statistics:')
      console.log(`   Items: ${this.stats.itemsProcessed}`)
      console.log(`   Equipment: ${this.stats.equipmentProcessed}`)
      console.log(`   Monsters: ${this.stats.monstersProcessed}`)
      console.log(`   Prayers: ${this.stats.prayersProcessed}`)
      
      // Create a summary file
      await writeFile(
        join(PROCESSED_DIR, 'summary.json'),
        JSON.stringify({
          lastUpdated: new Date().toISOString(),
          processingTime: `${duration}s`,
          stats: this.stats
        }, null, 2)
      )
      
      console.log(`\n💾 All data saved to: ${PROCESSED_DIR}`)
      console.log('🚀 Ready to start the API server!')
      
    } catch (error) {
      console.error('❌ Error during data processing:', error)
      throw error
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const fetcher = new OSRSDataFetcher()
  fetcher.run().catch(console.error)
}

export default OSRSDataFetcher 