import databaseService from './services/databaseService.js'

await databaseService.init()

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

console.log('🏃 Downloading agility skill icon...')

try {
  const agilityUrl = 'https://oldschool.runescape.wiki/images/0/00/Agility_icon.png'
  const agilityId = -17  // agility skill ID
  
  const iconBuffer = await downloadIcon(agilityUrl)
  await storeIconInDatabase(agilityId, iconBuffer, 'agility skill icon')
  
  console.log('✅ Agility skill icon successfully stored!')
  
  // Verify it was stored
  const db = databaseService.db
  const item = db.prepare('SELECT id, name, length(icon_data) as size FROM items WHERE id = ?').get(agilityId)
  console.log(`✅ Verification: ${item.name} (${item.size} bytes)`)
  
} catch (error) {
  console.error('❌ Failed to download agility skill icon:', error)
}
