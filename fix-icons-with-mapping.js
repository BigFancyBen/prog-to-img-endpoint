#!/usr/bin/env node

import databaseService from './services/databaseService.js'
import WikiLookupService from './services/wikiLookupService.js'

console.log('🔧 Fixing missing icons using authoritative wiki mapping...')

class AuthoritativeIconFixer {
  constructor() {
    this.wikiLookupService = new WikiLookupService()
    this.fixedCount = 0
    this.failedCount = 0
  }

  async init() {
    console.log('🚀 Initializing...')
    await databaseService.init()
    console.log('✅ Database initialized')
  }

  async fixMissingIcons() {
    console.log('🔍 Finding items with missing icons that have wiki mappings...')
    
    const db = databaseService.db
    
    // Get items that need icons AND have wiki page mappings
    const query = `
      SELECT i.id, i.name, m.wiki_page, m.wiki_url
      FROM items i
      INNER JOIN item_wiki_mapping m ON i.id = m.id
      WHERE (i.icon_data IS NULL OR length(i.icon_data) = 0)
      ORDER BY i.id
    `
    
    const itemsNeedingIcons = db.prepare(query).all()
    
    console.log(`🎯 Found ${itemsNeedingIcons.length} items with missing icons that have wiki mappings`)
    
    if (itemsNeedingIcons.length === 0) {
      console.log('🎉 All items with wiki mappings already have icons!')
      return
    }
    
    // Process items with delay
    const delay = 3000 // 3 seconds between items
    
    for (let i = 0; i < itemsNeedingIcons.length; i++) {
      const item = itemsNeedingIcons[i]
      
      try {
        console.log(`\n🔍 Processing ${i + 1}/${itemsNeedingIcons.length}: ${item.name} (ID: ${item.id})`)
        console.log(`  📖 Wiki page: ${item.wiki_page}`)
        
        // Use the wiki page directly instead of searching by name
        const result = await this.wikiLookupService.lookupItemByWikiPage(item.wiki_page, item.id)
        
        if (result) {
          this.fixedCount++
          console.log(`  ✅ Fixed icon for: ${item.name}`)
        } else {
          this.failedCount++
          console.log(`  ❌ Could not find icon for: ${item.name}`)
        }
        
        // Progress update
        const progress = ((i + 1) / itemsNeedingIcons.length * 100).toFixed(1)
        console.log(`📊 Progress: ${i + 1}/${itemsNeedingIcons.length} (${progress}%) | ✅ ${this.fixedCount} | ❌ ${this.failedCount}`)
        
        // Delay between items (except for the last one)
        if (i < itemsNeedingIcons.length - 1) {
          console.log(`⏳ Waiting ${delay/1000}s before next item...`)
          await this.sleep(delay)
        }
        
      } catch (error) {
        this.failedCount++
        console.log(`  💥 Error processing ${item.name}: ${error.message}`)
      }
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async run() {
    try {
      await this.init()
      await this.fixMissingIcons()
      
      console.log(`\n🎉 Icon fixing complete!`)
      console.log(`✅ Successfully fixed: ${this.fixedCount}`)
      console.log(`❌ Failed to fix: ${this.failedCount}`)
      
      // Show final statistics
      const db = databaseService.db
      const stats = db.prepare(`
        SELECT 
          COUNT(*) as total_items,
          COUNT(CASE WHEN icon_data IS NOT NULL AND length(icon_data) > 0 THEN 1 END) as items_with_icons,
          COUNT(CASE WHEN icon_data IS NULL OR length(icon_data) = 0 THEN 1 END) as items_without_icons
        FROM items i
        INNER JOIN item_wiki_mapping m ON i.id = m.id
      `).get()
      
      console.log(`\n📊 Final statistics for items with wiki mappings:`)
      console.log(`  Total items: ${stats.total_items}`)
      console.log(`  Items with icons: ${stats.items_with_icons}`)
      console.log(`  Items without icons: ${stats.items_without_icons}`)
      console.log(`  Coverage: ${((stats.items_with_icons / stats.total_items) * 100).toFixed(1)}%`)
      
    } catch (error) {
      console.error('❌ Error:', error.message)
      console.error(error.stack)
    }
  }
}

const fixer = new AuthoritativeIconFixer()
fixer.run()
