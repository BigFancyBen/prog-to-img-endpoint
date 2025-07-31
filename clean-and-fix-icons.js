#!/usr/bin/env node

import puppeteer from 'puppeteer'
import databaseService from './services/databaseService.js'
import WikiLookupService from './services/wikiLookupService.js'

console.log('🧹 Starting Database Cleanup and Icon Fixer...')

class DatabaseCleanupAndIconFixer {
  constructor() {
    this.browser = null
    this.page = null
    this.wikiLookupService = new WikiLookupService()
    this.legitimateItems = new Map() // ID -> name mapping from official wiki
    this.removedCount = 0
    this.fixedCount = 0
    this.failedCount = 0
  }

  async init() {
    console.log('🚀 Initializing...')
    
    // Initialize database
    await databaseService.init()
    console.log('✅ Database initialized')
    
    // Launch browser for wiki scraping
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    this.page = await this.browser.newPage()
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    console.log('✅ Browser initialized')
  }

  async fetchOfficialItemList() {
    console.log('📖 Fetching official item list from wiki...')
    
    await this.page.goto('https://oldschool.runescape.wiki/w/Item_IDs', {
      waitUntil: 'networkidle0',
      timeout: 30000
    })

    const itemData = await this.page.evaluate(() => {
      const items = new Map()
      const rows = document.querySelectorAll('table tr')
      
      for (const row of rows) {
        const cells = row.querySelectorAll('td')
        if (cells.length >= 2) {
          const nameCell = cells[0]
          const idCell = cells[1]
          
          if (nameCell && idCell) {
            const rawName = nameCell.textContent?.trim()
            const idText = idCell.textContent?.trim()
            
            if (rawName && idText) {
              // Handle multiple IDs (comma-separated)
              const ids = idText.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id) && id > 0)
              
              for (const id of ids) {
                // Clean up the name - remove variant info after #
                const name = rawName.split('#')[0].trim()
                items.set(id, name)
              }
            }
          }
        }
      }
      
      return Array.from(items.entries())
    })

    // Convert back to Map
    for (const [id, name] of itemData) {
      this.legitimateItems.set(id, name)
    }

    console.log(`🎯 Found ${this.legitimateItems.size} legitimate items from official wiki`)
    return this.legitimateItems
  }

  async cleanupDatabase() {
    console.log('🧹 Cleaning up database...')
    
    const db = databaseService.db
    
    // Get all current items in database
    const currentItems = db.prepare('SELECT id, name FROM items').all()
    console.log(`📊 Found ${currentItems.length} items currently in database`)
    
    // Find items to remove (not in official list)
    const itemsToRemove = []
    
    for (const item of currentItems) {
      if (!this.legitimateItems.has(item.id)) {
        itemsToRemove.push(item)
      }
    }
    
    console.log(`🗑️  Found ${itemsToRemove.length} illegitimate items to remove:`)
    
    // Remove illegitimate items
    const removeStmt = db.prepare('DELETE FROM items WHERE id = ?')
    
    for (const item of itemsToRemove) {
      console.log(`  ❌ Removing: ID ${item.id} - "${item.name}" (not in official wiki)`)
      removeStmt.run(item.id)
      this.removedCount++
    }
    
    console.log(`✅ Removed ${this.removedCount} illegitimate items from database`)
  }

  async fixMissingIcons() {
    console.log('🔧 Finding legitimate items with missing icons...')
    
    const db = databaseService.db
    
    // Get items with missing icons, but only those that are legitimate
    const legitimateIDs = Array.from(this.legitimateItems.keys())
    
    if (legitimateIDs.length === 0) {
      console.log('❌ No legitimate items found!')
      return
    }
    
    // Create placeholders for the IN clause
    const placeholders = legitimateIDs.map(() => '?').join(',')
    const query = `
      SELECT id, name 
      FROM items 
      WHERE id IN (${placeholders}) 
        AND (icon_data IS NULL OR length(icon_data) = 0)
      ORDER BY id
    `
    
    const itemsNeedingIcons = db.prepare(query).all(...legitimateIDs)
    
    console.log(`🎯 Found ${itemsNeedingIcons.length} legitimate items needing icons`)
    
    if (itemsNeedingIcons.length === 0) {
      console.log('🎉 All legitimate items already have icons!')
      return
    }
    
    // Process items in batches
    const batchSize = 5
    const delay = 5000 // 5 second delay between items
    
    for (let i = 0; i < itemsNeedingIcons.length; i += batchSize) {
      const batch = itemsNeedingIcons.slice(i, i + batchSize)
      const batchNum = Math.floor(i / batchSize) + 1
      const totalBatches = Math.ceil(itemsNeedingIcons.length / batchSize)
      
      console.log(`\n📦 Processing batch ${batchNum}/${totalBatches}`)
      
      for (const item of batch) {
        try {
          console.log(`🔍 Fixing icon for item ${item.id}: ${item.name}`)
          
          const result = await this.wikiLookupService.lookupItemByName(item.name)
          
          if (result) {
            this.fixedCount++
            console.log(`  ✅ Fixed icon for: ${item.name}`)
          } else {
            this.failedCount++
            console.log(`  ❌ Could not find icon for: ${item.name}`)
          }
          
          // Progress update
          const processed = i + batch.indexOf(item) + 1
          const progress = ((processed / itemsNeedingIcons.length) * 100).toFixed(1)
          console.log(`📊 Progress: ${processed}/${itemsNeedingIcons.length} (${progress}%) | ✅ ${this.fixedCount} | ❌ ${this.failedCount}`)
          
          // Delay between items
          if (processed < itemsNeedingIcons.length) {
            await this.sleep(delay)
          }
          
        } catch (error) {
          this.failedCount++
          console.log(`  💥 Error processing ${item.name}: ${error.message}`)
        }
      }
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async run() {
    try {
      await this.init()
      
      // Step 1: Get official item list
      await this.fetchOfficialItemList()
      
      // Step 2: Clean up database (remove illegitimate items)
      await this.cleanupDatabase()
      
      // Step 3: Fix icons for remaining legitimate items
      await this.fixMissingIcons()
      
      console.log('\n🏁 Database cleanup and icon fixing completed!')
      console.log(`📊 Final Results:`)
      console.log(`  🗑️  Illegitimate items removed: ${this.removedCount}`)
      console.log(`  ✅ Icons fixed: ${this.fixedCount}`)
      console.log(`  ❌ Icons failed: ${this.failedCount}`)
      console.log(`  🎯 Database now contains only legitimate items from official wiki`)
      
    } catch (error) {
      console.error('💥 Process failed:', error)
    } finally {
      if (this.browser) {
        await this.browser.close()
      }
      await databaseService.close()
    }
  }
}

// Run the cleaner
const cleaner = new DatabaseCleanupAndIconFixer()
cleaner.run().catch(error => {
  console.error('💥 Fatal error:', error)
  process.exit(1)
})
