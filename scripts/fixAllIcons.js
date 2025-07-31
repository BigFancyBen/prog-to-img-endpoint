#!/usr/bin/env node

import databaseService from '../services/databaseService.js'
import WikiLookupService from '../services/wikiLookupService.js'

console.log('🚨 AGGRESSIVE ICON FIXER - NO EXCEPTIONS!')
console.log('This script will attempt to fix ALL missing icons')

class AggressiveIconFixer {
  constructor() {
    this.wikiService = new WikiLookupService()
    this.stats = {
      total: 0,
      fixed: 0,
      failed: 0,
      processed: 0
    }
  }

  async init() {
    console.log('🔧 Initializing services...')
    await databaseService.init()
    console.log('✅ Database initialized')
  }

  async fixAllIcons() {
    console.log('\n🎨 Finding ALL items without icons...')
    
    const db = databaseService.db
    
    // Find ALL items without icons
    const itemsNeedingIcons = db.prepare(`
      SELECT i.id, i.name, m.wiki_page 
      FROM items i
      JOIN item_wiki_mapping m ON i.id = m.id
      WHERE (i.icon_data IS NULL OR length(i.icon_data) = 0)
      ORDER BY i.id
    `).all()
    
    this.stats.total = itemsNeedingIcons.length
    console.log(`🎯 Found ${this.stats.total} items needing icons`)
    
    if (this.stats.total === 0) {
      console.log('🎉 All items already have icons!')
      return
    }
    
    console.log('🚨 AGGRESSIVE MODE: Will attempt to fix EVERY SINGLE ITEM!')
    console.log(`📋 Sample items needing icons:`)
    itemsNeedingIcons.slice(0, 15).forEach(item => {
      console.log(`  ID ${item.id}: ${item.name}`)
    })
    
    const delay = 1000 // 1 second delay
    const batchSize = 20 // Larger batches for faster processing
    
    console.log(`\n🔄 Processing ${this.stats.total} items in batches of ${batchSize}...`)
    
    for (let i = 0; i < itemsNeedingIcons.length; i += batchSize) {
      const batch = itemsNeedingIcons.slice(i, i + batchSize)
      const batchNum = Math.floor(i / batchSize) + 1
      const totalBatches = Math.ceil(itemsNeedingIcons.length / batchSize)
      
      console.log(`\n📦 Processing batch ${batchNum}/${totalBatches}`)
      
      for (const item of batch) {
        try {
          this.stats.processed++
          console.log(`🎨 [${this.stats.processed}/${this.stats.total}] Fixing: ${item.name} (ID: ${item.id})`)
          
          // Try multiple approaches for icon retrieval
          let success = false
          
          // Approach 1: Standard wiki lookup
          try {
            const result = await this.wikiService.lookupItemByWikiPage(item.wiki_page, item.id)
            if (result) {
              const iconCheck = db.prepare('SELECT length(icon_data) as size FROM items WHERE id = ?').get(item.id)
              if (iconCheck && iconCheck.size > 0) {
                this.stats.fixed++
                success = true
                console.log(`  ✅ Standard lookup: ${iconCheck.size} bytes`)
              }
            }
          } catch (error) {
            console.log(`    ⚠️  Standard lookup failed: ${error.message}`)
          }
          
          // Approach 2: Try alternative icon methods if standard failed
          if (!success) {
            try {
              const altResult = await this.tryAlternativeIconMethods(item)
              if (altResult) {
                this.stats.fixed++
                success = true
                console.log(`  ✅ Alternative method: ${altResult} bytes`)
              }
            } catch (error) {
              console.log(`    ⚠️  Alternative method failed: ${error.message}`)
            }
          }
          
          // Approach 3: Try direct icon URL construction
          if (!success) {
            try {
              const directResult = await this.tryDirectIconDownload(item)
              if (directResult) {
                this.stats.fixed++
                success = true
                console.log(`  ✅ Direct download: ${directResult} bytes`)
              }
            } catch (error) {
              console.log(`    ⚠️  Direct download failed: ${error.message}`)
            }
          }
          
          if (!success) {
            this.stats.failed++
            console.log(`  ❌ All methods failed for: ${item.name}`)
          }
          
          // Progress update every 50 items
          if (this.stats.processed % 50 === 0 || this.stats.processed === this.stats.total) {
            const progress = ((this.stats.processed / this.stats.total) * 100).toFixed(1)
            console.log(`📊 Progress: ${this.stats.processed}/${this.stats.total} (${progress}%) | ✅ ${this.stats.fixed} | ❌ ${this.stats.failed}`)
          }
          
          // Delay between items
          if (this.stats.processed < this.stats.total) {
            await this.sleep(delay)
          }
          
        } catch (error) {
          this.stats.failed++
          console.log(`  💥 Error processing ${item.name}: ${error.message}`)
        }
      }
    }
    
    console.log(`\n🎉 Icon fixing complete!`)
    console.log(`📊 Results: ${this.stats.fixed} fixed, ${this.stats.failed} failed out of ${this.stats.total} total`)
    
    // Final status check
    await this.checkFinalStatus()
  }

  async tryAlternativeIconMethods(item) {
    try {
      // For items with special characters, try URL decoding
      if (item.wiki_page && item.wiki_page.includes('%')) {
        const decodedPage = decodeURIComponent(item.wiki_page)
        const result = await this.wikiService.lookupItemByWikiPage(decodedPage, item.id)
        if (result) {
          const db = databaseService.db
          const iconCheck = db.prepare('SELECT length(icon_data) as size FROM items WHERE id = ?').get(item.id)
          return iconCheck && iconCheck.size > 0 ? iconCheck.size : null
        }
      }
      
      // For variants, try base item name
      if (item.name.includes('(') && item.name.includes(')')) {
        const baseName = item.name.replace(/\s*\([^)]*\)$/, '').trim()
        const baseWikiPage = baseName.replace(/\s+/g, '_')
        const result = await this.wikiService.lookupItemByWikiPage(baseWikiPage, item.id)
        if (result) {
          const db = databaseService.db
          const iconCheck = db.prepare('SELECT length(icon_data) as size FROM items WHERE id = ?').get(item.id)
          return iconCheck && iconCheck.size > 0 ? iconCheck.size : null
        }
      }
      
      return null
    } catch (error) {
      return null
    }
  }

  async tryDirectIconDownload(item) {
    try {
      // Construct direct icon URL from item name
      const cleanName = item.name.replace(/[()]/g, '').replace(/\s+/g, '_')
      const iconUrl = `https://oldschool.runescape.wiki/images/${cleanName}.png`
      
      // Try to download directly
      const response = await fetch(iconUrl)
      if (response.ok) {
        const iconBuffer = Buffer.from(await response.arrayBuffer())
        if (iconBuffer.length > 0) {
          // Store in database
          const db = databaseService.db
          const updateStmt = db.prepare('UPDATE items SET icon_data = ? WHERE id = ?')
          updateStmt.run(iconBuffer, item.id)
          return iconBuffer.length
        }
      }
      
      return null
    } catch (error) {
      return null
    }
  }

  async checkFinalStatus() {
    console.log('\n📊 Final status check...')
    const db = databaseService.db
    
    const total = db.prepare('SELECT COUNT(*) as count FROM items').get().count
    const withIcons = db.prepare('SELECT COUNT(*) as count FROM items WHERE icon_data IS NOT NULL AND length(icon_data) > 0').get().count
    const withoutIcons = total - withIcons
    
    console.log(`📊 Total items: ${total}`)
    console.log(`📊 Items with icons: ${withIcons}`)
    console.log(`📊 Items without icons: ${withoutIcons}`)
    console.log(`📊 Success rate: ${((withIcons/total)*100).toFixed(2)}%`)
    
    if (withoutIcons === 0) {
      console.log('🎉 SUCCESS: ALL ITEMS NOW HAVE ICONS!')
    } else {
      console.log(`⚠️  ${withoutIcons} items still need attention`)
      
      // Show remaining problematic items
      const remaining = db.prepare(`
        SELECT i.id, i.name, m.wiki_page
        FROM items i
        LEFT JOIN item_wiki_mapping m ON i.id = m.id
        WHERE i.icon_data IS NULL OR length(i.icon_data) = 0
        ORDER BY i.id
        LIMIT 20
      `).all()
      
      console.log('\n📋 Items still missing icons:')
      remaining.forEach(item => {
        console.log(`  ID ${item.id}: ${item.name}`)
      })
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async run() {
    try {
      await this.init()
      await this.fixAllIcons()
    } catch (error) {
      console.error('❌ Error during aggressive icon fixing:', error.message)
      console.error(error.stack)
    }
  }
}

const fixer = new AggressiveIconFixer()
fixer.run()
