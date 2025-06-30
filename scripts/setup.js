import { readFile, writeFile, mkdir, access } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const DATA_DIR = join(__dirname, '../data')
const PROCESSED_DIR = join(DATA_DIR, 'processed')

async function setupOSRSData() {
  console.log('🚀 Setting up OSRS API data...')
  
  // Create directories
  try {
    await mkdir(PROCESSED_DIR, { recursive: true })
    console.log('📁 Created data directories')
  } catch (error) {
    // Directory already exists
  }

  // Sample items data with our existing items plus OSRS items
  const items = {
    "995": {
      "id": 995,
      "name": "Coins",
      "examine": "Lovely money!",
      "members": false,
      "cost": 1,
      "lowalch": null,
      "highalch": null,
      "weight": 0.0,
      "stackable": true,
      "equipable": false,
      "equipable_by_player": false,
      "equipable_weapon": false,
      "wiki_name": "Coins",
      "wiki_url": "https://oldschool.runescape.wiki/w/Coins",
      "icon": "/icons/coins.png"
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
      "stackable": false,
      "equipable": false,
      "equipable_by_player": false,
      "equipable_weapon": false,
      "noteable": true,
      "wiki_name": "Grimy tarromin",
      "wiki_url": "https://oldschool.runescape.wiki/w/Grimy_tarromin",
      "icon": "/icons/grimy_tarromin.png"
    },
    "199": {
      "id": 199,
      "name": "Grimy guam leaf",
      "examine": "A grimy herb.",
      "members": false,
      "cost": 15,
      "lowalch": 6,
      "highalch": 9,
      "weight": 0.003,
      "stackable": false,
      "equipable": false,
      "equipable_by_player": false,
      "equipable_weapon": false,
      "wiki_name": "Grimy guam leaf",
      "wiki_url": "https://oldschool.runescape.wiki/w/Grimy_guam_leaf",
      "icon": "/icons/grimy_guam_leaf.png"
    },
    "561": {
      "id": 561,
      "name": "Nature rune",
      "examine": "Used for transmutation magic.",
      "members": false,
      "cost": 311,
      "lowalch": 124,
      "highalch": 186,
      "weight": 0.0,
      "stackable": true,
      "equipable": false,
      "equipable_by_player": false,
      "equipable_weapon": false,
      "wiki_name": "Nature rune",
      "wiki_url": "https://oldschool.runescape.wiki/w/Nature_rune",
      "icon": "/icons/nature_rune.png"
    },
    "11849": {
      "id": 11849,
      "name": "Mark of grace",
      "examine": "A mark of grace, earned from the various Agility courses.",
      "members": true,
      "cost": 1,
      "lowalch": null,
      "highalch": null,
      "weight": 0.0,
      "stackable": true,
      "equipable": false,
      "equipable_by_player": false,
      "equipable_weapon": false,
      "wiki_name": "Mark of grace",
      "wiki_url": "https://oldschool.runescape.wiki/w/Mark_of_grace",
      "icon": "/icons/mark_of_grace.png"
    },
    "1277": {
      "id": 1277,
      "name": "Dragon sword",
      "examine": "A sword made of dragon metal.",
      "members": true,
      "cost": 100000,
      "lowalch": 40000,
      "highalch": 60000,
      "weight": 2.267,
      "stackable": false,
      "equipable": true,
      "equipable_by_player": true,
      "equipable_weapon": true,
      "wiki_name": "Dragon sword",
      "wiki_url": "https://oldschool.runescape.wiki/w/Dragon_sword",
      "icon": "/icons/dragon_sword.png",
      "equipment": {
        "attack_stab": 0,
        "attack_slash": 67,
        "attack_crush": -2,
        "attack_magic": 0,
        "attack_ranged": 0,
        "defence_stab": 0,
        "defence_slash": 0,
        "defence_crush": 0,
        "defence_magic": 0,
        "defence_ranged": 0,
        "melee_strength": 66,
        "ranged_strength": 0,
        "magic_damage": 0,
        "prayer": 0,
        "slot": "weapon",
        "requirements": {
          "attack": 60
        }
      },
      "weapon": {
        "attack_speed": 4,
        "weapon_type": "sword",
        "stances": [
          {
            "combat_style": "stab",
            "attack_type": "stab",
            "attack_style": "accurate",
            "experience": "attack",
            "boosts": "Accurate: +3 Attack"
          }
        ]
      }
    }
  }

  // Extract equipment and weapons from items
  const equipment = {}
  const weapons = {}
  
  for (const [id, item] of Object.entries(items)) {
    if (item.equipable_by_player) {
      equipment[id] = item
      if (item.equipable_weapon) {
        weapons[id] = item
      }
    }
  }

  // Sample monsters data
  const monsters = {
    "1": {
      "id": 1,
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
      "wiki_name": "Chaos druid",
      "wiki_url": "https://oldschool.runescape.wiki/w/Chaos_druid",
      "slayer_level": null,
      "slayer_xp": null
    },
    "2": {
      "id": 2,
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
      "wiki_name": "Abyssal demon",
      "wiki_url": "https://oldschool.runescape.wiki/w/Abyssal_demon",
      "slayer_level": 85,
      "slayer_xp": 150
    }
  }

  // Sample prayers data
  const prayers = {
    "1": {
      "id": 1,
      "name": "Thick Skin",
      "description": "Increases your Defence level by 5%",
      "level_required": 1,
      "drain_rate": 1,
      "members": false,
      "wiki_url": "https://oldschool.runescape.wiki/w/Thick_Skin"
    },
    "2": {
      "id": 2,
      "name": "Burst of Strength",
      "description": "Increases your Strength level by 5%",
      "level_required": 4,
      "drain_rate": 1,
      "members": false,
      "wiki_url": "https://oldschool.runescape.wiki/w/Burst_of_Strength"
    },
    "3": {
      "id": 3,
      "name": "Clarity of Thought",  
      "description": "Increases your Attack level by 5%", 
      "level_required": 7,
      "drain_rate": 1,
      "members": false,
      "wiki_url": "https://oldschool.runescape.wiki/w/Clarity_of_Thought"
    },
    "4": {
      "id": 4,
      "name": "Piety",
      "description": "Increases Attack, Strength and Defence levels by 20%, 23% and 25% respectively",
      "level_required": 70,
      "drain_rate": 24,
      "members": true,
      "wiki_url": "https://oldschool.runescape.wiki/w/Piety"
    }
  }

  // Create search indexes
  const indexes = {
    items: {},
    monsters: {},
    prayers: {},
    lastUpdated: new Date().toISOString()
  }

  // Index items by name
  for (const [id, item] of Object.entries(items)) {
    const name = item.name.toLowerCase()
    if (!indexes.items[name]) indexes.items[name] = []
    indexes.items[name].push(parseInt(id))
  }

  // Index monsters by name
  for (const [id, monster] of Object.entries(monsters)) {
    const name = monster.name.toLowerCase()
    if (!indexes.monsters[name]) indexes.monsters[name] = []
    indexes.monsters[name].push(parseInt(id))
  }

  // Index prayers by name
  for (const [id, prayer] of Object.entries(prayers)) {
    const name = prayer.name.toLowerCase()
    if (!indexes.prayers[name]) indexes.prayers[name] = []
    indexes.prayers[name].push(parseInt(id))
  }

  // Write all data files
  await writeFile(join(PROCESSED_DIR, 'items.json'), JSON.stringify(items, null, 2))
  await writeFile(join(PROCESSED_DIR, 'equipment.json'), JSON.stringify(equipment, null, 2))
  await writeFile(join(PROCESSED_DIR, 'weapons.json'), JSON.stringify(weapons, null, 2))
  await writeFile(join(PROCESSED_DIR, 'monsters.json'), JSON.stringify(monsters, null, 2))
  await writeFile(join(PROCESSED_DIR, 'prayers.json'), JSON.stringify(prayers, null, 2))
  await writeFile(join(PROCESSED_DIR, 'indexes.json'), JSON.stringify(indexes, null, 2))

  // Create summary
  const summary = {
    lastUpdated: new Date().toISOString(),
    processingTime: '0.1s',
    stats: {
      itemsProcessed: Object.keys(items).length,
      equipmentProcessed: Object.keys(equipment).length,
      monstersProcessed: Object.keys(monsters).length,
      prayersProcessed: Object.keys(prayers).length
    }
  }
  await writeFile(join(PROCESSED_DIR, 'summary.json'), JSON.stringify(summary, null, 2))

  console.log('✅ OSRS API data setup complete!')
  console.log(`📊 Created ${Object.keys(items).length} items, ${Object.keys(monsters).length} monsters, ${Object.keys(prayers).length} prayers`)
  console.log('🚀 Ready to start the API server!')
  
  return summary
}

// Run setup immediately
setupOSRSData().catch(console.error)

export default setupOSRSData 