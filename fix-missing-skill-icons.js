import databaseService from './services/databaseService.js'

await databaseService.init()

const missingSkillIcons = {
  'agility': { id: -17, url: 'https://oldschool.runescape.wiki/images/0/00/Agility_icon.png' },
  'smithing': { id: -14, url: 'https://oldschool.runescape.wiki/images/d/dd/Smithing_icon.png' },
  'herblore': { id: -16, url: 'https://oldschool.runescape.wiki/images/3/3a/Herblore_icon.png' },
  'attack': { id: -1, url: 'https://oldschool.runescape.wiki/images/8/8b/Attack_icon.png' },
  'defence': { id: -2, url: 'https://oldschool.runescape.wiki/images/b/b0/Defence_icon.png' },
  'ranged': { id: -5, url: 'https://oldschool.runescape.wiki/images/1/19/Ranged_icon.png' },
  'prayer': { id: -6, url: 'https://oldschool.runescape.wiki/images/f/f2/Prayer_icon.png' },
  'magic': { id: -7, url: 'https://oldschool.runescape.wiki/images/5/5c/Magic_icon.png' },
  'cooking': { id: -8, url: 'https://oldschool.runescape.wiki/images/4/43/Cooking_icon.png' },
  'woodcutting': { id: -9, url: 'https://oldschool.runescape.wiki/images/f/f4/Woodcutting_icon.png' },
  'fletching': { id: -10, url: 'https://oldschool.runescape.wiki/images/3/39/Fletching_icon.png' },
  'fishing': { id: -11, url: 'https://oldschool.runescape.wiki/images/0/05/Fishing_icon.png' },
  'firemaking': { id: -12, url: 'https://oldschool.runescape.wiki/images/9/9b/Firemaking_icon.png' },
  'crafting': { id: -13, url: 'https://oldschool.runescape.wiki/images/c/cf/Crafting_icon.png' },
  'mining': { id: -15, url: 'https://oldschool.runescape.wiki/images/4/4a/Mining_icon.png' },
  'thieving': { id: -18, url: 'https://oldschool.runescape.wiki/images/4/4a/Thieving_icon.png' },
  'slayer': { id: -19, url: 'https://oldschool.runescape.wiki/images/2/28/Slayer_icon.png' },
  'farming': { id: -20, url: 'https://oldschool.runescape.wiki/images/f/fc/Farming_icon.png' },
  'runecraft': { id: -21, url: 'https://oldschool.runescape.wiki/images/d/da/Runecraft_icon.png' },
  'hunter': { id: -22, url: 'https://oldschool.runescape.wiki/images/d/dd/Hunter_icon.png' },
  'construction': { id: -23, url: 'https://oldschool.runescape.wiki/images/f/f6/Construction_icon.png' },
  'overall': { id: -24, url: 'https://oldschool.runescape.wiki/images/1/1f/Overall_icon.png' }
}

async function downloadIcon(url) {
  try {
    console.log(`Downloading from: ${url}`)
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (error) {
    console.error(`Error downloading icon:`, error)
    throw error
  }
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

console.log('🎯 Downloading missing skill icons...')

let successful = 0
let failed = 0

for (const [skillName, { id, url }] of Object.entries(missingSkillIcons)) {
  try {
    console.log(`\n📥 Processing ${skillName}...`)
    
    // Check if already exists
    const db = databaseService.db
    const existing = db.prepare('SELECT icon_data FROM items WHERE id = ?').get(id)
    if (existing && existing.icon_data && existing.icon_data.length > 0) {
      console.log(`⏭️  ${skillName} already exists, skipping`)
      continue
    }
    
    const iconBuffer = await downloadIcon(url)
    await storeIconInDatabase(id, iconBuffer, `${skillName} skill icon`)
    
    successful++
    
    // Small delay to be respectful
    await new Promise(resolve => setTimeout(resolve, 500))
    
  } catch (error) {
    console.error(`❌ Failed to process ${skillName}:`, error)
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

for (const skill of checkSkills) {
  const skillData = missingSkillIcons[skill]
  if (skillData) {
    const item = db.prepare('SELECT id, name, length(icon_data) as size FROM items WHERE id = ?').get(skillData.id)
    if (item && item.size > 0) {
      console.log(`✅ ${skill}: Found (${item.size} bytes)`)
    } else {
      console.log(`❌ ${skill}: Still missing`)
    }
  }
}
