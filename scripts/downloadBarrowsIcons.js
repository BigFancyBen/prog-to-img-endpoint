import { exec } from 'child_process'
import { promisify } from 'util'
import { access, stat } from 'fs/promises'
import databaseService from '../services/databaseService.js'

const execAsync = promisify(exec)

async function downloadBarrowsIcons() {
  console.log('📥 Downloading Missing Barrows Icons')
  console.log('===================================')
  
  await databaseService.init()
  const db = databaseService.db
  
  // Get all Barrows items from database
  const barrowsItems = db.prepare(`
    SELECT id, name, icon_path 
    FROM items 
    WHERE name LIKE '%Ahrim%' 
    OR name LIKE '%Torag%' 
    OR name LIKE '%Karil%' 
    OR name LIKE '%Guthan%' 
    OR name LIKE '%Dharok%'
    OR name LIKE '%Verac%'
    ORDER BY id
  `).all()
  
  console.log(`🔍 Found ${barrowsItems.length} Barrows items in database`)
  
  let downloaded = 0
  let skipped = 0
  let failed = 0
  
  for (const item of barrowsItems) {
    const iconPath = `icons/items/${item.id}.png`
    
    try {
      // Check if file exists and has content
      const stats = await stat(iconPath)
      if (stats.size > 0) {
        console.log(`✅ ${item.id}: ${item.name} (already exists)`)
        skipped++
        continue
      } else {
        console.log(`🔄 ${item.id}: ${item.name} (0 bytes, re-downloading)`)
      }
    } catch (error) {
      console.log(`🔄 ${item.id}: ${item.name} (missing, downloading)`)
    }
    
    // Try multiple URL formats
    const urls = [
      `https://oldschool.runescape.wiki/images/${item.id}.png`,
      `https://oldschool.runescape.wiki/images/thumb/${item.id}.png/32px-${item.id}.png`,
      `https://oldschool.runescape.wiki/w/Special:FilePath/${item.id}.png`,
      `https://oldschool.runescape.wiki/w/File:${item.id}.png`
    ]
    
    let success = false
    for (const url of urls) {
      try {
        const command = `curl -s -o "${iconPath}" "${url}"`
        await execAsync(command)
        
        // Check if download was successful (file exists and has content)
        const stats = await stat(iconPath)
        if (stats.size > 0) {
          console.log(`✅ Downloaded ${item.id}.png from ${url.split('/').pop()}`)
          downloaded++
          success = true
          break
        }
      } catch (error) {
        // Continue to next URL
      }
    }
    
    if (!success) {
      console.log(`❌ Failed to download ${item.id}.png`)
      failed++
    }
    
    // Small delay to be nice to the server
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  console.log(`\n📊 Download Summary:`)
  console.log(`✅ Downloaded: ${downloaded}`)
  console.log(`⏭️  Skipped (exists): ${skipped}`)
  console.log(`❌ Failed: ${failed}`)
  
  await databaseService.close()
}

downloadBarrowsIcons().catch(console.error)
