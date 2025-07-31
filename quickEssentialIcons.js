import databaseService from './services/databaseService.js'

console.log('🚀 Starting essential icons download...')
console.log('📦 Initializing database...')
await databaseService.init()

const skillIconUrls = {
  'strength': 'https://oldschool.runescape.wiki/images/1/1b/Strength_icon.png',
  'hitpoints': 'https://oldschool.runescape.wiki/images/a/a5/Hitpoints_icon.png'
}

const skillIds = {
  'strength': -3,
  'hitpoints': -4
}

async function downloadIcon(url) {
  try {
    console.log(`Downloading icon from: ${url}`)
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (error) {
    console.error(`Error downloading icon from ${url}:`, error)
    throw error
  }
}

async function storeIconInDatabase(itemId, iconBuffer, name) {
  try {
    const db = databaseService.db
    
    // Check if item exists, if not create it
    const existingItem = db.prepare('SELECT id FROM items WHERE id = ?').get(itemId)
    
    if (!existingItem) {
      console.log(`Creating new item entry for ${name} (ID: ${itemId})`)
      db.prepare('INSERT INTO items (id, name, icon_data) VALUES (?, ?, ?)').run(itemId, name, iconBuffer)
    } else {
      console.log(`Updating icon for existing item ${name} (ID: ${itemId})`)
      db.prepare('UPDATE items SET icon_data = ? WHERE id = ?').run(iconBuffer, itemId)
    }
    
    console.log(`✅ Stored ${name} icon (${iconBuffer.length} bytes) with ID: ${itemId}`)
  } catch (error) {
    console.error(`Error storing icon for ${name}:`, error)
    throw error
  }
}

async function downloadSkillIcons() {
  console.log('📥 Downloading skill icons...')
  
  for (const [skillName, url] of Object.entries(skillIconUrls)) {
    try {
      const skillId = skillIds[skillName]
      console.log(`\n🎯 Processing ${skillName} skill icon...`)
      
      // Download the icon
      const iconBuffer = await downloadIcon(url)
      
      // Store in database
      await storeIconInDatabase(skillId, iconBuffer, `${skillName} skill icon`)
      
      // Small delay to be respectful to the wiki
      await new Promise(resolve => setTimeout(resolve, 1000))
      
    } catch (error) {
      console.error(`❌ Failed to process ${skillName} skill icon:`, error)
    }
  }
}

async function downloadCollectionLogBackground() {
  console.log('\n📥 Downloading collection log background...')
  
  try {
    // Read local collection log background
    const { readFile } = await import('fs/promises')
    const { join } = await import('path')
    
    try {
      const localBgPath = join(process.cwd(), 'collection-log-background.png')
      console.log(`Reading local collection log background: ${localBgPath}`)
      const localBgBuffer = await readFile(localBgPath)
      
      await storeIconInDatabase(-100, localBgBuffer, 'Collection Log Background')
      console.log('✅ Collection log background stored from local file')
      
    } catch (localError) {
      console.log('Local collection log background not found')
      console.error(localError)
    }
    
  } catch (error) {
    console.error('❌ Failed to store collection log background:', error)
  }
}

async function main() {
  try {
    // Initialize database first
    console.log('📦 Initializing database...')
    await databaseService.init()
    console.log('✅ Database initialized')
    
    await downloadSkillIcons()
    await downloadCollectionLogBackground()
    console.log('\n🎉 Essential icons download completed!')
  } catch (error) {
    console.error('\n❌ Essential icons download failed:', error)
  }
}

main()
