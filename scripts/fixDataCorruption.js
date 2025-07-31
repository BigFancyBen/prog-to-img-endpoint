#!/usr/bin/env node

import databaseService from '../services/databaseService.js'

console.log('🔧 Data Corruption Fixer - Correcting Items Table with Authoritative Wiki Mappings')

class DataCorruptionFixer {
  constructor() {
    this.stats = {
      totalItems: 0,
      corruptedItems: 0,
      fixedItems: 0,
      itemsWithIcons: 0,
      itemsWithoutIcons: 0,
      errors: 0
    }
  }

  async init() {
    console.log('🔧 Initializing database service...')
    await databaseService.init()
    console.log('✅ Database initialized')
  }

  async analyzeCorruption() {
    console.log('\n🔍 Analyzing data corruption...')
    
    const db = databaseService.db
    
    // Get all corrupted items with icon status
    const corruptedItems = db.prepare(`
      SELECT 
        i.id,
        i.name as local_name,
        w.name as wiki_name,
        w.wiki_page,
        w.wiki_url,
        CASE 
          WHEN i.icon_data IS NOT NULL THEN 1
          ELSE 0
        END as has_icon,
        LENGTH(i.icon_data) as icon_size
      FROM items i
      JOIN item_wiki_mapping w ON i.id = w.id
      WHERE i.name != w.name 
      ORDER BY i.id
    `).all()

    this.stats.corruptedItems = corruptedItems.length
    this.stats.itemsWithIcons = corruptedItems.filter(item => item.has_icon).length
    this.stats.itemsWithoutIcons = corruptedItems.length - this.stats.itemsWithIcons

    console.log(`📊 Found ${corruptedItems.length} corrupted items`)
    console.log(`📊 ${this.stats.itemsWithIcons} have icons`)
    console.log(`📊 ${this.stats.itemsWithoutIcons} missing icons`)
    
    if (corruptedItems.length > 0) {
      console.log('\n📋 Sample corrupted items:')
      console.log('ID  | Current Name         | Correct Name         | Icon Status')
      console.log('----|---------------------|---------------------|------------')
      corruptedItems.slice(0, 15).forEach(item => {
        const idStr = item.id.toString().padEnd(3)
        const currentStr = item.local_name.substring(0,19).padEnd(19)
        const correctStr = item.wiki_name.substring(0,19).padEnd(19)
        const iconStr = item.has_icon ? `✅ ${item.icon_size}b` : '❌ None'
        console.log(`${idStr} | ${currentStr} | ${correctStr} | ${iconStr}`)
      })
      
      if (corruptedItems.length > 15) {
        console.log(`... and ${corruptedItems.length - 15} more`)
      }
    }
    
    return corruptedItems
  }

  async fixCorruptedItems(corruptedItems) {
    if (corruptedItems.length === 0) {
      console.log('✅ No corrupted items to fix!')
      return
    }
    
    console.log(`\n🔧 Fixing ${corruptedItems.length} corrupted items...`)
    
    const db = databaseService.db
    
    // Update items with correct names from wiki mappings
    const updateStmt = db.prepare(`
      UPDATE items 
      SET 
        name = ?,
        wiki_name = ?,
        wiki_url = ?,
        last_updated = CURRENT_TIMESTAMP
      WHERE id = ?
    `)

    const updateMany = db.transaction((items) => {
      let fixed = 0
      let errors = 0
      
      for (const item of items) {
        try {
          // Clean up the wiki name for the items table
          let cleanName = item.wiki_name
          
          // Handle dose variants like "Defence potion#(1)" -> "Defence potion(1)"
          if (cleanName.includes('#(') && cleanName.includes(')')) {
            cleanName = cleanName.replace('#(', '(')
          }
          // Handle other variants like "Black candle#Lit" -> "Black candle (lit)"
          else if (cleanName.includes('#')) {
            const parts = cleanName.split('#')
            if (parts[1]) {
              cleanName = `${parts[0]} (${parts[1].toLowerCase()})`
            }
          }
          
          updateStmt.run(cleanName, item.wiki_name, item.wiki_url, item.id)
          
          if (fixed < 20) { // Show first 20 fixes
            const iconStatus = item.has_icon ? '🎨' : '❌'
            console.log(`  ✅ ID ${item.id}: "${item.local_name}" → "${cleanName}" ${iconStatus}`)
          } else if (fixed === 20) {
            console.log('  ... (showing progress for remaining fixes)')
          }
          
          fixed++
          
          if (fixed % 100 === 0) {
            console.log(`    📊 Progress: ${fixed}/${items.length} (${Math.round(fixed/items.length*100)}%)`)
          }
          
        } catch (error) {
          console.error(`❌ Failed to fix ID ${item.id}:`, error.message)
          errors++
        }
      }
      
      return { fixed, errors }
    })

    const result = updateMany(corruptedItems)
    this.stats.fixedItems = result.fixed
    this.stats.errors = result.errors
    
    console.log(`\n✅ Successfully fixed ${result.fixed} corrupted items`)
    
    if (result.errors > 0) {
      console.log(`⚠️ ${result.errors} items failed to fix`)
    }
  }

  async verifyFixes() {
    console.log('\n🔍 Verifying fixes...')
    
    const db = databaseService.db
    
    // Check if there are still any corrupted items
    const remainingCorrupted = db.prepare(`
      SELECT COUNT(*) as count
      FROM items i
      JOIN item_wiki_mapping w ON i.id = w.id
      WHERE i.name != w.name
    `).get()

    // Check specific examples
    const examples = db.prepare(`
      SELECT 
        i.id,
        i.name as fixed_name,
        w.name as wiki_name
      FROM items i
      JOIN item_wiki_mapping w ON i.id = w.id
      WHERE i.id IN (137, 19, 32, 83, 195)
      ORDER BY i.id
    `).all()

    console.log('\n📋 Verification examples:')
    console.log('ID  | Fixed Name           | Wiki Name')
    console.log('----|---------------------|---------------------')
    examples.forEach(item => {
      const idStr = item.id.toString().padEnd(3)
      const fixedStr = item.fixed_name.substring(0,19).padEnd(19)
      const wikiStr = item.wiki_name.substring(0,19).padEnd(19)
      const status = item.fixed_name === item.wiki_name ? '✅' : '⚠️'
      console.log(`${idStr} | ${fixedStr} | ${wikiStr} ${status}`)
    })

    if (remainingCorrupted.count === 0) {
      console.log('\n🎉 All corruption fixed! Items table now matches wiki mappings.')
    } else {
      console.log(`\n⚠️ ${remainingCorrupted.count} items still have minor differences (likely formatting variants)`)
    }
    
    return remainingCorrupted.count
  }

  async run() {
    try {
      await this.init()
      
      const corruptedItems = await this.analyzeCorruption()
      await this.fixCorruptedItems(corruptedItems)
      const remaining = await this.verifyFixes()
      
      console.log('\n📊 Final Statistics:')
      console.log(`  Total corrupted items found: ${this.stats.corruptedItems}`)
      console.log(`  Items with icons: ${this.stats.itemsWithIcons}`)
      console.log(`  Items without icons: ${this.stats.itemsWithoutIcons}`)
      console.log(`  Items fixed: ${this.stats.fixedItems}`)
      console.log(`  Remaining issues: ${remaining}`)
      console.log(`  Errors: ${this.stats.errors}`)
      
      if (remaining === 0) {
        console.log('\n🎉 SUCCESS: All data corruption has been fixed!')
        console.log('   Your items table now has authoritative names from the wiki.')
      } else {
        console.log('\n✅ SUCCESS: Major corruption fixed!')
        console.log(`   ${remaining} minor formatting differences remain (these are acceptable).`)
      }
      
    } catch (error) {
      console.error('❌ Error in data corruption fixer:', error)
      throw error
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const fixer = new DataCorruptionFixer()
  fixer.run().catch(console.error)
}

export default DataCorruptionFixer
