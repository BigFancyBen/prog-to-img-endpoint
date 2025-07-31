import databaseService from './services/databaseService.js'
import { readFile } from 'fs/promises'
import { join } from 'path'

/**
 * Download and store essential icons (skill icons and collection log background) in the database
 */
class EssentialIconDownloader {
  constructor() {
    this.skillIconUrls = {
      'attack': 'https://oldschool.runescape.wiki/images/8/8b/Attack_icon.png',
      'defence': 'https://oldschool.runescape.wiki/images/b/b0/Defence_icon.png',
      'strength': 'https://oldschool.runescape.wiki/images/1/1b/Strength_icon.png',
      'hitpoints': 'https://oldschool.runescape.wiki/images/a/a5/Hitpoints_icon.png',
      'ranged': 'https://oldschool.runescape.wiki/images/1/19/Ranged_icon.png',
      'prayer': 'https://oldschool.runescape.wiki/images/f/f2/Prayer_icon.png',
      'magic': 'https://oldschool.runescape.wiki/images/5/5c/Magic_icon.png',
      'cooking': 'https://oldschool.runescape.wiki/images/4/43/Cooking_icon.png',
      'woodcutting': 'https://oldschool.runescape.wiki/images/f/f4/Woodcutting_icon.png',
      'fletching': 'https://oldschool.runescape.wiki/images/3/39/Fletching_icon.png',
      'fishing': 'https://oldschool.runescape.wiki/images/0/05/Fishing_icon.png',
      'firemaking': 'https://oldschool.runescape.wiki/images/9/9b/Firemaking_icon.png',
      'crafting': 'https://oldschool.runescape.wiki/images/c/cf/Crafting_icon.png',
      'smithing': 'https://oldschool.runescape.wiki/images/d/dd/Smithing_icon.png',
      'mining': 'https://oldschool.runescape.wiki/images/4/4a/Mining_icon.png',
      'herblore': 'https://oldschool.runescape.wiki/images/3/3a/Herblore_icon.png',
      'agility': 'https://oldschool.runescape.wiki/images/0/00/Agility_icon.png',
      'thieving': 'https://oldschool.runescape.wiki/images/4/4a/Thieving_icon.png',
      'slayer': 'https://oldschool.runescape.wiki/images/2/28/Slayer_icon.png',
      'farming': 'https://oldschool.runescape.wiki/images/f/fc/Farming_icon.png',
      'runecraft': 'https://oldschool.runescape.wiki/images/d/da/Runecraft_icon.png',
      'hunter': 'https://oldschool.runescape.wiki/images/d/dd/Hunter_icon.png',
      'construction': 'https://oldschool.runescape.wiki/images/f/f6/Construction_icon.png',
      'overall': 'https://oldschool.runescape.wiki/images/1/1f/Overall_icon.png'
    }
    
    this.skillIds = {
      'attack': -1,
      'defence': -2, 
      'strength': -3,
      'hitpoints': -4,
      'ranged': -5,
      'prayer': -6,
      'magic': -7,
      'cooking': -8,
      'woodcutting': -9,
      'fletching': -10,
      'fishing': -11,
      'firemaking': -12,
      'crafting': -13,
      'smithing': -14,
      'mining': -15,
      'herblore': -16,
      'agility': -17,
      'thieving': -18,
      'slayer': -19,
      'farming': -20,
      'runecraft': -21,
      'hunter': -22,
      'construction': -23,
      'overall': -24
    }
  }

  async downloadIcon(url) {
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

  async storeIconInDatabase(itemId, iconBuffer, name) {
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

  async downloadAndStoreSkillIcons() {
    console.log('📥 Downloading and storing skill icons...')
    
    const skillsToDownload = Object.keys(this.skillIconUrls)
    let successful = 0
    let failed = 0
    
    for (const skillName of skillsToDownload) {
      try {
        const url = this.skillIconUrls[skillName]
        const skillId = this.skillIds[skillName]
        
        console.log(`\n🎯 Processing ${skillName} skill icon...`)
        
        // Download the icon
        const iconBuffer = await this.downloadIcon(url)
        
        // Store in database
        await this.storeIconInDatabase(skillId, iconBuffer, `${skillName} skill icon`)
        
        successful++
        
        // Small delay to be respectful to the wiki
        await new Promise(resolve => setTimeout(resolve, 500))
        
      } catch (error) {
        console.error(`❌ Failed to process ${skillName} skill icon:`, error)
        failed++
      }
    }
    
    console.log(`\n📊 Skill icon download summary:`)
    console.log(`✅ Successful: ${successful}`)
    console.log(`❌ Failed: ${failed}`)
    
    return { successful, failed }
  }

  async downloadAndStoreCollectionLogBackground() {
    console.log('\n📥 Downloading and storing collection log background...')
    
    try {
      // Try to read existing collection log background first
      try {
        const localBgPath = join(process.cwd(), 'collection-log-background.png')
        console.log(`Trying to read local collection log background: ${localBgPath}`)
        const localBgBuffer = await readFile(localBgPath)
        
        await this.storeIconInDatabase(-100, localBgBuffer, 'Collection Log Background')
        console.log('✅ Collection log background stored from local file')
        return true
        
      } catch (localError) {
        console.log('Local collection log background not found, downloading from wiki...')
        
        // Download from wiki
        const collectionLogUrl = 'https://oldschool.runescape.wiki/images/0/0b/Collection_log_interface.png'
        const bgBuffer = await this.downloadIcon(collectionLogUrl)
        
        await this.storeIconInDatabase(-100, bgBuffer, 'Collection Log Background')
        console.log('✅ Collection log background downloaded and stored')
        return true
      }
      
    } catch (error) {
      console.error('❌ Failed to download/store collection log background:', error)
      return false
    }
  }

  async checkMissingIcons() {
    console.log('\n🔍 Checking for missing essential icons...')
    
    const db = databaseService.db
    const missingSkills = []
    
    // Check skill icons
    for (const [skillName, skillId] of Object.entries(this.skillIds)) {
      const iconData = db.prepare('SELECT icon_data FROM items WHERE id = ?').get(skillId)
      if (!iconData || !iconData.icon_data || iconData.icon_data.length === 0) {
        missingSkills.push(skillName)
      }
    }
    
    // Check collection log background
    const collectionLogData = db.prepare('SELECT icon_data FROM items WHERE id = ?').get(-100)
    const missingCollectionLog = !collectionLogData || !collectionLogData.icon_data || collectionLogData.icon_data.length === 0
    
    console.log(`Missing skill icons: ${missingSkills.length > 0 ? missingSkills.join(', ') : 'None'}`)
    console.log(`Missing collection log background: ${missingCollectionLog ? 'Yes' : 'No'}`)
    
    return {
      missingSkills,
      missingCollectionLog,
      totalMissing: missingSkills.length + (missingCollectionLog ? 1 : 0)
    }
  }

  async downloadAllEssentialIcons() {
    console.log('🚀 Starting essential icons download...')
    
    try {
      // Check what's missing first
      const missing = await this.checkMissingIcons()
      
      if (missing.totalMissing === 0) {
        console.log('✅ All essential icons are already present in database!')
        return
      }
      
      console.log(`📋 Found ${missing.totalMissing} missing essential icons`)
      
      // Download skill icons
      if (missing.missingSkills.length > 0) {
        await this.downloadAndStoreSkillIcons()
      }
      
      // Download collection log background
      if (missing.missingCollectionLog) {
        await this.downloadAndStoreCollectionLogBackground()
      }
      
      // Final check
      console.log('\n🔍 Final verification...')
      const finalCheck = await this.checkMissingIcons()
      
      if (finalCheck.totalMissing === 0) {
        console.log('🎉 All essential icons successfully downloaded and stored!')
      } else {
        console.log(`⚠️  Still missing ${finalCheck.totalMissing} essential icons`)
      }
      
    } catch (error) {
      console.error('❌ Error during essential icons download:', error)
      throw error
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const downloader = new EssentialIconDownloader()
  
  downloader.downloadAllEssentialIcons()
    .then(() => {
      console.log('\n✅ Essential icons download completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Essential icons download failed:', error)
      process.exit(1)
    })
}

export default EssentialIconDownloader
