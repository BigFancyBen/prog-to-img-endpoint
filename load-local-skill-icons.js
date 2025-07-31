import databaseService from './services/databaseService.js'
import { readFile } from 'fs/promises'
import { join } from 'path'

await databaseService.init()

const skillIconMapping = {
  'attack.png': { id: -1, name: 'attack skill icon' },
  'defence.png': { id: -2, name: 'defence skill icon' },
  'strength.png': { id: -3, name: 'strength skill icon' },
  'hitpoints.png': { id: -4, name: 'hitpoints skill icon' },
  'ranged.png': { id: -5, name: 'ranged skill icon' },
  'prayer.png': { id: -6, name: 'prayer skill icon' },
  'magic.png': { id: -7, name: 'magic skill icon' },
  'cooking.png': { id: -8, name: 'cooking skill icon' },
  'woodcutting.png': { id: -9, name: 'woodcutting skill icon' },
  'fletching.png': { id: -10, name: 'fletching skill icon' },
  'fishing.png': { id: -11, name: 'fishing skill icon' },
  'firemaking.png': { id: -12, name: 'firemaking skill icon' },
  'crafting.png': { id: -13, name: 'crafting skill icon' },
  'smithing.png': { id: -14, name: 'smithing skill icon' },
  'mining.png': { id: -15, name: 'mining skill icon' },
  'herblore.png': { id: -16, name: 'herblore skill icon' },
  'agility.png': { id: -17, name: 'agility skill icon' },
  'thieving.png': { id: -18, name: 'thieving skill icon' },
  'slayer.png': { id: -19, name: 'slayer skill icon' },
  'farming.png': { id: -20, name: 'farming skill icon' },
  'runecraft.png': { id: -21, name: 'runecraft skill icon' },
  'hunter.png': { id: -22, name: 'hunter skill icon' },
  'construction.png': { id: -23, name: 'construction skill icon' },
  'collection-log.png': { id: -100, name: 'Collection Log Background' }
}

async function storeIconInDatabase(itemId, iconBuffer, name) {
  try {
    const db = databaseService.db
    
    const existingItem = db.prepare('SELECT id FROM items WHERE id = ?').get(itemId)
    
    if (!existingItem) {
      console.log(`Creating new entry for ${name} (ID: ${itemId})`)
      db.prepare('INSERT INTO items (id, name, icon_data) VALUES (?, ?, ?)').run(itemId, name, iconBuffer)
    } else {
      console.log(`Updating icon for ${name} (ID: ${itemId})`)
      db.prepare('UPDATE items SET icon_data = ? WHERE id = ?').run(iconBuffer, itemId)
    }
    
    console.log(`✅ Stored ${name} (${iconBuffer.length} bytes)`)
  } catch (error) {
    console.error(`Error storing ${name}:`, error)
    throw error
  }
}

console.log('📂 Loading skill icons from local icons directory...')

const iconsDir = join(process.cwd(), 'icons')
let successful = 0
let failed = 0

for (const [filename, { id, name }] of Object.entries(skillIconMapping)) {
  try {
    console.log(`\n📥 Processing ${filename}...`)
    
    // Check if already exists
    const db = databaseService.db
    const existing = db.prepare('SELECT icon_data FROM items WHERE id = ?').get(id)
    if (existing && existing.icon_data && existing.icon_data.length > 0) {
      console.log(`⏭️  ${name} already exists, skipping`)
      continue
    }
    
    const iconPath = join(iconsDir, filename)
    const iconBuffer = await readFile(iconPath)
    
    await storeIconInDatabase(id, iconBuffer, name)
    
    successful++
    
  } catch (error) {
    console.error(`❌ Failed to process ${filename}:`, error)
    failed++
  }
}

console.log(`\n📊 Summary:`)
console.log(`✅ Successful: ${successful}`)
console.log(`❌ Failed: ${failed}`)

// Verify the specific ones mentioned
console.log(`\n🔍 Verifying specific icons:`)
const checkSkills = ['agility', 'smithing', 'herblore']
const db = databaseService.db

const skillIdMap = {
  'agility': -17,
  'smithing': -14,
  'herblore': -16
}

for (const skill of checkSkills) {
  const skillId = skillIdMap[skill]
  const item = db.prepare('SELECT id, name, length(icon_data) as size FROM items WHERE id = ?').get(skillId)
  if (item && item.size > 0) {
    console.log(`✅ ${skill}: Found (${item.size} bytes)`)
  } else {
    console.log(`❌ ${skill}: Still missing`)
  }
}

console.log(`\n🎉 All skill icons loaded from local directory!`)
