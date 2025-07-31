#!/usr/bin/env node

import databaseService from '../services/databaseService.js'
import WikiLookupService from '../services/wikiLookupService.js'

console.log('🔍 Checking Verac\'s brassard status...')

class VeracsBrassardFixer {
  constructor() {
    this.wikiService = new WikiLookupService()
  }

  async init() {
    await databaseService.init()
    console.log('✅ Database initialized')
  }

  async checkAndFixVeracsBrassard() {
    const db = databaseService.db
    
    // Find all Verac's brassard variants
    const veracsItems = db.prepare(`
      SELECT id, name, length(icon_data) as icon_size 
      FROM items 
      WHERE name LIKE '%Verac%brassard%' 
      ORDER BY id
    `).all()
    
    console.log(`\n📊 Found ${veracsItems.length} Verac's brassard items:`)
    veracsItems.forEach(item => {
      const status = item.icon_size > 0 ? `✅ ${item.icon_size} bytes` : '❌ No icon'
      console.log(`  ID ${item.id}: ${item.name} - ${status}`)
    })
    
    // Find items without icons
    const itemsNeedingIcons = veracsItems.filter(item => item.icon_size === 0)
    
    if (itemsNeedingIcons.length === 0) {
      console.log('\n🎉 All Verac\'s brassard items already have icons!')
      return
    }
    
    console.log(`\n🔧 Fixing ${itemsNeedingIcons.length} items without icons...`)
    
    // Get wiki mapping for these items
    for (const item of itemsNeedingIcons) {
      console.log(`\n🎨 Fixing: ${item.name} (ID: ${item.id})`)
      
      // Get wiki page mapping
      const mapping = db.prepare('SELECT wiki_page FROM item_wiki_mapping WHERE id = ?').get(item.id)
      
      if (mapping) {
        console.log(`📖 Wiki page: ${mapping.wiki_page}`)
        
        try {
          // Use wiki service to lookup and download icon
          const result = await this.wikiService.lookupItemByWikiPage(mapping.wiki_page, item.id)
          
          if (result) {
            // Check if icon was downloaded
            const iconCheck = db.prepare('SELECT length(icon_data) as size FROM items WHERE id = ?').get(item.id)
            if (iconCheck && iconCheck.size > 0) {
              console.log(`  ✅ Icon downloaded: ${iconCheck.size} bytes`)
            } else {
              console.log(`  ⚠️  Lookup succeeded but no icon data saved`)
            }
          } else {
            console.log(`  ❌ Wiki lookup failed`)
          }
        } catch (error) {
          console.log(`  💥 Error: ${error.message}`)
        }
      } else {
        console.log(`  ⚠️  No wiki mapping found for item ${item.id}`)
      }
      
      // Small delay between items
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    // Final check
    console.log('\n📊 Final status:')
    const finalCheck = db.prepare(`
      SELECT id, name, length(icon_data) as icon_size 
      FROM items 
      WHERE name LIKE '%Verac%brassard%' 
      ORDER BY id
    `).all()
    
    finalCheck.forEach(item => {
      const status = item.icon_size > 0 ? `✅ ${item.icon_size} bytes` : '❌ Still missing'
      console.log(`  ID ${item.id}: ${item.name} - ${status}`)
    })
  }

  async run() {
    try {
      await this.init()
      await this.checkAndFixVeracsBrassard()
    } catch (error) {
      console.error('❌ Error:', error.message)
      console.error(error.stack)
    }
  }
}

const fixer = new VeracsBrassardFixer()
fixer.run()
