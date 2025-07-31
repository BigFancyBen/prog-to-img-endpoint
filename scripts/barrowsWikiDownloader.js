#!/usr/bin/env node

import databaseService from '../services/databaseService.js'
import axios from 'axios'

console.log('🛡️ Barrows Wiki Icon Downloader - Direct Wiki Fetching')

class BarrowsWikiIconDownloader {
  constructor() {
    this.stats = {
      itemsProcessed: 0,
      iconsDownloaded: 0,
      errors: 0
    }
    this.axiosInstance = axios.create({
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
  }

  async init() {
    console.log('🔧 Initializing database service...')
    await databaseService.init()
    console.log('✅ Database initialized')
  }

  generateWikiUrls(itemName) {
    // Remove durability suffixes - these are all sections on the same wiki page
    const baseName = itemName.replace(/\s*\((100|75|50|25|broken|undamaged)\)/g, '')
    
    // Generate different icon URL patterns for the base item
    const patterns = [
      baseName,
      baseName.replace(/'/g, '%27'),
      baseName.replace(/ /g, '_'),
      baseName.replace(/'/g, '').replace(/ /g, '_'),
      baseName.replace("'s", "")
    ]
    
    const urls = []
    for (const pattern of patterns) {
      urls.push(
        `https://oldschool.runescape.wiki/images/${encodeURIComponent(pattern)}.png`,
        `https://oldschool.runescape.wiki/images/${encodeURIComponent(pattern)}_detail.png`,
        `https://oldschool.runescape.wiki/images/${pattern.replace(/ /g, '_')}.png`,
        `https://oldschool.runescape.wiki/images/${pattern.replace(/ /g, '_')}_detail.png`
      )
    }
    
    return [...new Set(urls)] // Remove duplicates
  }

  async downloadIcon(itemId, itemName) {
    const urls = this.generateWikiUrls(itemName)
    
    console.log(`  🔍 Trying ${urls.length} URL patterns for ID ${itemId}: ${itemName}`)
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i]
      try {
        const response = await this.axiosInstance.get(url, { 
          responseType: 'arraybuffer',
          validateStatus: (status) => status === 200
        })
        
        if (response.data && response.data.byteLength > 100) { // Valid icon should be > 100 bytes
          console.log(`  ✅ Downloaded icon for ID ${itemId}: ${itemName}`)
          console.log(`     Source: ${url} (${response.data.byteLength} bytes, attempt ${i + 1}/${urls.length})`)
          return {
            data: response.data,
            path: url
          }
        }
      } catch (error) {
        // Continue to next URL pattern
        if (i < 3) { // Only log first few attempts to avoid spam
          console.log(`     ❌ Failed attempt ${i + 1}: ${error.response?.status || error.code}`)
        }
      }
    }
    
    console.log(`  ❌ Failed to download icon for ID ${itemId}: ${itemName} (tried ${urls.length} patterns)`)
    return null
  }

  async processBarrowsItems() {
    const db = databaseService.db
    
    // Get all Barrows items missing icons
    const barrowsItems = db.prepare(`
      SELECT id, name FROM items 
      WHERE icon_data IS NULL 
        AND (name LIKE '%Ahrim%' OR name LIKE '%Dharok%' OR name LIKE '%Guthan%' 
             OR name LIKE '%Karil%' OR name LIKE '%Torag%' OR name LIKE '%Verac%')
      ORDER BY name
      LIMIT 30
    `).all()

    console.log(`\n🛡️ Processing ${barrowsItems.length} Barrows items missing icons...`)
    
    for (let i = 0; i < barrowsItems.length; i++) {
      const item = barrowsItems[i]
      this.stats.itemsProcessed++
      
      console.log(`\n[${i + 1}/${barrowsItems.length}] Processing ID ${item.id}: ${item.name}`)
      
      try {
        const iconResult = await this.downloadIcon(item.id, item.name)
        
        if (iconResult) {
          // Save to database
          const updateStmt = db.prepare(`
            UPDATE items 
            SET 
              icon_data = ?,
              icon_path = ?,
              last_updated = CURRENT_TIMESTAMP 
            WHERE id = ?
          `)
          
          updateStmt.run(iconResult.data, iconResult.path, item.id)
          this.stats.iconsDownloaded++
        } else {
          this.stats.errors++
        }
        
        // Small delay to be respectful to the wiki
        await new Promise(resolve => setTimeout(resolve, 300))
        
      } catch (error) {
        console.error(`  ❌ Error processing ID ${item.id}:`, error.message)
        this.stats.errors++
      }
    }
  }

  async run() {
    try {
      await this.init()
      await this.processBarrowsItems()
      
      console.log('\n📊 Final Statistics:')
      console.log(`  Items processed: ${this.stats.itemsProcessed}`)
      console.log(`  Icons downloaded: ${this.stats.iconsDownloaded}`)
      console.log(`  Errors: ${this.stats.errors}`)
      
      if (this.stats.itemsProcessed > 0) {
        const successRate = ((this.stats.iconsDownloaded/this.stats.itemsProcessed)*100).toFixed(1)
        console.log(`  Success rate: ${successRate}%`)
      }
      
      if (this.stats.iconsDownloaded > 0) {
        console.log('\n🎉 SUCCESS: Barrows icons have been downloaded directly from the wiki!')
        console.log('   These items now use the base icon (durability variants share the same icon)')
      }
      
    } catch (error) {
      console.error('❌ Error in Barrows wiki downloader:', error)
      throw error
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const downloader = new BarrowsWikiIconDownloader()
  downloader.run().catch(console.error)
}

export default BarrowsWikiIconDownloader
