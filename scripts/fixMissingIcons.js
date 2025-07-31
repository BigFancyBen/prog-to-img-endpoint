#!/usr/bin/env node

import databaseService from '../services/databaseService.js'
import WikiLookupService from '../services/wikiLookupService.js'
import puppeteer from 'puppeteer'

console.log('🎨 Missing Icon Fixer - Download Icons for Existing Items')

class MissingIconFixer {
  constructor() {
    this.browser = null
    this.page = null
    this.wikiService = new WikiLookupService()
    this.stats = {
      totalMissingIcons: 0,
      iconsFixed: 0,
      errors: 0,
      skipped: 0
    }
  }

  async init() {
    console.log('🔧 Initializing services...')
    
    // Initialize database
    await databaseService.init()
    console.log('✅ Database initialized')
    
    // Launch browser
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    this.page = await this.browser.newPage()
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    console.log('✅ Browser initialized')
  }

  async findItemsMissingIcons() {
    console.log('\n🔍 Finding items missing icons...')
    
    const db = databaseService.db
    
    // Get items missing icons but have wiki mappings
    const missingIconItems = db.prepare(`
      SELECT 
        i.id,
        i.name,
        w.wiki_page,
        w.wiki_url
      FROM items i
      LEFT JOIN item_wiki_mapping w ON i.id = w.id
      WHERE i.icon_data IS NULL
      ORDER BY i.id
      LIMIT 500
    `).all()

    this.stats.totalMissingIcons = missingIconItems.length

    console.log(`📊 Found ${missingIconItems.length} items missing icons`)
    
    if (missingIconItems.length > 0) {
      console.log('\n📋 Sample items missing icons:')
      console.log('ID  | Item Name                | Wiki Page')
      console.log('----|--------------------------|---------------------------')
      missingIconItems.slice(0, 15).forEach(item => {
        const idStr = item.id.toString().padEnd(3)
        const nameStr = item.name.substring(0, 24).padEnd(24)
        const wikiStr = item.wiki_page ? item.wiki_page.substring(0, 25) : 'No mapping'
        console.log(`${idStr} | ${nameStr} | ${wikiStr}`)
      })
      
      if (missingIconItems.length > 15) {
        console.log(`... and ${missingIconItems.length - 15} more`)
      }
    }
    
    return missingIconItems
  }

  async downloadIcon(item) {
    try {
      console.log(`🔍 Downloading icon for: ${item.name} (ID: ${item.id})`)
      
      if (!item.wiki_page) {
        // Try to find item by name if no wiki mapping
        const result = await this.wikiService.lookupItem(item.name, this.page)
        if (result && result.iconData) {
          return result.iconData
        } else {
          console.log(`  ⚠️ No wiki mapping and search failed for: ${item.name}`)
          return null
        }
      }

      // Use the wiki page mapping
      const result = await this.wikiService.lookupItem(item.wiki_page, this.page)
      if (result && result.iconData) {
        return result.iconData
      } else {
        console.log(`  ⚠️ Failed to get icon from wiki page: ${item.wiki_page}`)
        return null
      }
      
    } catch (error) {
      console.error(`  ❌ Error downloading icon for ${item.name}:`, error.message)
      return null
    }
  }

  async fixMissingIcons(missingIconItems) {
    if (missingIconItems.length === 0) {
      console.log('✅ No items missing icons!')
      return
    }
    
    console.log(`\n🎨 Fixing icons for ${missingIconItems.length} items...`)
    
    const db = databaseService.db
    const updateStmt = db.prepare(`
      UPDATE items 
      SET icon_data = ?, last_updated = CURRENT_TIMESTAMP 
      WHERE id = ?
    `)

    let fixed = 0
    let errors = 0
    let skipped = 0

    for (let i = 0; i < missingIconItems.length; i++) {
      const item = missingIconItems[i]
      
      try {
        const iconData = await this.downloadIcon(item)
        
        if (iconData) {
          updateStmt.run(iconData, item.id)
          console.log(`  ✅ Fixed icon for ID ${item.id}: ${item.name} (${iconData.length} bytes)`)
          fixed++
        } else {
          console.log(`  ⚠️ Skipped ID ${item.id}: ${item.name} (no icon found)`)
          skipped++
        }
        
        // Progress update every 10 items
        if ((i + 1) % 10 === 0) {
          console.log(`    📊 Progress: ${i + 1}/${missingIconItems.length} (${Math.round((i + 1)/missingIconItems.length*100)}%) | ✅ ${fixed} | ⚠️ ${skipped} | ❌ ${errors}`)
        }
        
        // Small delay to be respectful to the wiki
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (error) {
        console.error(`  ❌ Error processing ID ${item.id}:`, error.message)
        errors++
      }
    }

    this.stats.iconsFixed = fixed
    this.stats.errors = errors
    this.stats.skipped = skipped
    
    console.log(`\n✅ Icon fixing complete!`)
    console.log(`  Icons fixed: ${fixed}`)
    console.log(`  Items skipped: ${skipped}`)
    console.log(`  Errors: ${errors}`)
  }

  async verifyResults() {
    console.log('\n🔍 Verifying results...')
    
    const db = databaseService.db
    
    const totalItems = db.prepare('SELECT COUNT(*) as count FROM items').get().count
    const itemsWithIcons = db.prepare('SELECT COUNT(*) as count FROM items WHERE icon_data IS NOT NULL').get().count
    const itemsWithoutIcons = totalItems - itemsWithIcons

    console.log('\n📊 Final Icon Status:')
    console.log(`  Total items: ${totalItems}`)
    console.log(`  Items with icons: ${itemsWithIcons} (${Math.round(itemsWithIcons/totalItems*100)}%)`)
    console.log(`  Items still missing icons: ${itemsWithoutIcons} (${Math.round(itemsWithoutIcons/totalItems*100)}%)`)
    
    if (itemsWithoutIcons > 0) {
      const stillMissing = db.prepare(`
        SELECT id, name 
        FROM items 
        WHERE icon_data IS NULL 
        ORDER BY id 
        LIMIT 10
      `).all()
      
      console.log('\n📋 Items still missing icons:')
      stillMissing.forEach(item => {
        console.log(`  ID ${item.id}: ${item.name}`)
      })
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close()
      console.log('✅ Browser closed')
    }
  }

  async run() {
    try {
      await this.init()
      
      const missingIconItems = await this.findItemsMissingIcons()
      await this.fixMissingIcons(missingIconItems)
      await this.verifyResults()
      
      console.log('\n📊 Final Statistics:')
      console.log(`  Items processed: ${this.stats.totalMissingIcons}`)
      console.log(`  Icons successfully fixed: ${this.stats.iconsFixed}`)
      console.log(`  Items skipped (no icon found): ${this.stats.skipped}`)
      console.log(`  Errors: ${this.stats.errors}`)
      
      if (this.stats.iconsFixed > 0) {
        console.log('\n🎉 SUCCESS: Icons have been fixed for existing items!')
      }
      
    } catch (error) {
      console.error('❌ Error in missing icon fixer:', error)
      throw error
    } finally {
      await this.cleanup()
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const fixer = new MissingIconFixer()
  fixer.run().catch(console.error)
}

export default MissingIconFixer
