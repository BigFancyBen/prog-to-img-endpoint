#!/usr/bin/env node

import databaseService from '../services/databaseService.js'

console.log('🛡️ Barrows Equipment Icon Fixer - Handling Durability Variants')

class BarrowsIconFixer {
  constructor() {
    this.stats = {
      barrowsItemsFound: 0,
      iconsFixed: 0,
      errors: 0
    }
  }

  async init() {
    console.log('🔧 Initializing database service...')
    await databaseService.init()
    console.log('✅ Database initialized')
  }

  async findBarrowsItemsMissingIcons() {
    console.log('\n🔍 Finding Barrows items missing icons...')
    
    const db = databaseService.db
    
    // Find Barrows items with durability variants that are missing icons
    const barrowsItems = db.prepare(`
      SELECT 
        id,
        name,
        CASE 
          WHEN name LIKE '%Ahrim%' THEN 'Ahrim'
          WHEN name LIKE '%Dharok%' THEN 'Dharok'
          WHEN name LIKE '%Guthan%' THEN 'Guthan'
          WHEN name LIKE '%Karil%' THEN 'Karil'
          WHEN name LIKE '%Torag%' THEN 'Torag'
          WHEN name LIKE '%Verac%' THEN 'Verac'
          ELSE NULL
        END as barrows_set,
        CASE 
          WHEN name LIKE '%robetop%' THEN 'robetop'
          WHEN name LIKE '%robeskirt%' THEN 'robeskirt'
          WHEN name LIKE '%hood%' THEN 'hood'
          WHEN name LIKE '%staff%' THEN 'staff'
          WHEN name LIKE '%greataxe%' THEN 'greataxe'
          WHEN name LIKE '%platebody%' THEN 'platebody'
          WHEN name LIKE '%platelegs%' THEN 'platelegs'
          WHEN name LIKE '%helm%' THEN 'helm'
          WHEN name LIKE '%warspear%' THEN 'warspear'
          WHEN name LIKE '%chainskirt%' THEN 'chainskirt'
          WHEN name LIKE '%crossbow%' THEN 'crossbow'
          WHEN name LIKE '%coif%' THEN 'coif'
          WHEN name LIKE '%hammers%' THEN 'hammers'
          WHEN name LIKE '%plateskirt%' THEN 'plateskirt'
          WHEN name LIKE '%brassard%' THEN 'brassard'
          WHEN name LIKE '%flail%' THEN 'flail'
          ELSE NULL
        END as item_type
      FROM items 
      WHERE icon_data IS NULL 
        AND (name LIKE '%Ahrim%' OR name LIKE '%Dharok%' OR name LIKE '%Guthan%' 
             OR name LIKE '%Karil%' OR name LIKE '%Torag%' OR name LIKE '%Verac%')
        AND (name LIKE '%(100)' OR name LIKE '%(75)' OR name LIKE '%(50)' 
             OR name LIKE '%(25)' OR name LIKE '%(broken)')
      ORDER BY barrows_set, item_type, id
    `).all()

    this.stats.barrowsItemsFound = barrowsItems.length

    console.log(`📊 Found ${barrowsItems.length} Barrows items missing icons`)
    
    if (barrowsItems.length > 0) {
      console.log('\n📋 Barrows items missing icons:')
      console.log('ID   | Item Name                           | Set    | Type')
      console.log('-----|-------------------------------------|--------|-------------')
      barrowsItems.slice(0, 15).forEach(item => {
        const idStr = item.id.toString().padEnd(4)
        const nameStr = item.name.substring(0, 35).padEnd(35)
        const setStr = (item.barrows_set || 'Unknown').padEnd(6)
        const typeStr = item.item_type || 'Unknown'
        console.log(`${idStr} | ${nameStr} | ${setStr} | ${typeStr}`)
      })
      
      if (barrowsItems.length > 15) {
        console.log(`... and ${barrowsItems.length - 15} more`)
      }
    }
    
    return barrowsItems
  }

  async fixBarrowsIcons(barrowsItems) {
    if (barrowsItems.length === 0) {
      console.log('✅ No Barrows items missing icons!')
      return
    }
    
    console.log(`\n🛡️ Fixing icons for ${barrowsItems.length} Barrows items...`)
    
    const db = databaseService.db
    
    let fixed = 0
    let errors = 0

    for (const item of barrowsItems) {
      try {
        // Look for ANY item with the same set and type that has an icon
        // First try exact naming patterns
        const searchPatterns = [
          `${item.barrows_set}'s ${item.item_type} (100)`,  // Look for the (100) version
          `${item.barrows_set}'s ${item.item_type} (75)`,   // Look for the (75) version  
          `${item.barrows_set}'s ${item.item_type} (50)`,   // Look for the (50) version
          `${item.barrows_set}'s ${item.item_type} (25)`,   // Look for the (25) version
          `${item.barrows_set}'s ${item.item_type} (undamaged)`, // Look for undamaged version
        ]
        
        let sourceItem = null
        let sourcePattern = null
        
        // Try to find any variant of this item type that has an icon
        for (const pattern of searchPatterns) {
          const foundItem = db.prepare(`
            SELECT icon_data, icon_path, name
            FROM items 
            WHERE name = ? AND icon_data IS NOT NULL
            LIMIT 1
          `).get(pattern)
          
          if (foundItem && foundItem.icon_data) {
            sourceItem = foundItem
            sourcePattern = pattern
            break
          }
        }

        if (sourceItem && sourceItem.icon_data) {
          // Copy the icon from the source item
          const updateStmt = db.prepare(`
            UPDATE items 
            SET 
              icon_data = ?,
              icon_path = ?,
              last_updated = CURRENT_TIMESTAMP 
            WHERE id = ?
          `)
          
          updateStmt.run(sourceItem.icon_data, sourceItem.icon_path, item.id)
          
          console.log(`  ✅ Copied icon for ID ${item.id}: ${item.name} ← ${sourceItem.name} (${sourceItem.icon_data.length} bytes)`)
          fixed++
          
        } else {
          console.log(`  ⚠️ No icon source found for ID ${item.id}: ${item.name} (searched for: ${item.barrows_set}'s ${item.item_type})`)
        }
        
      } catch (error) {
        console.error(`  ❌ Error processing ID ${item.id}:`, error.message)
        errors++
      }
    }

    this.stats.iconsFixed = fixed
    this.stats.errors = errors
    
    console.log(`\n✅ Barrows icon fixing complete!`)
    console.log(`  Icons copied: ${fixed}`)
    console.log(`  Items without source icons: ${barrowsItems.length - fixed - errors}`)
    console.log(`  Errors: ${errors}`)
  }

  async verifyResults() {
    console.log('\n🔍 Verifying Barrows icon fixes...')
    
    const db = databaseService.db
    
    const remainingBarrows = db.prepare(`
      SELECT COUNT(*) as count
      FROM items 
      WHERE icon_data IS NULL 
        AND (name LIKE '%Ahrim%' OR name LIKE '%Dharok%' OR name LIKE '%Guthan%' 
             OR name LIKE '%Karil%' OR name LIKE '%Torag%' OR name LIKE '%Verac%')
        AND (name LIKE '%(100)' OR name LIKE '%(75)' OR name LIKE '%(50)' 
             OR name LIKE '%(25)' OR name LIKE '%(broken)')
    `).get().count

    console.log(`📊 Barrows items still missing icons: ${remainingBarrows}`)
    
    if (remainingBarrows > 0) {
      const stillMissing = db.prepare(`
        SELECT id, name 
        FROM items 
        WHERE icon_data IS NULL 
          AND (name LIKE '%Ahrim%' OR name LIKE '%Dharok%' OR name LIKE '%Guthan%' 
               OR name LIKE '%Karil%' OR name LIKE '%Torag%' OR name LIKE '%Verac%')
          AND (name LIKE '%(100)' OR name LIKE '%(75)' OR name LIKE '%(50)' 
               OR name LIKE '%(25)' OR name LIKE '%(broken)')
        ORDER BY id 
        LIMIT 10
      `).all()
      
      console.log('\n📋 Barrows items still missing icons:')
      stillMissing.forEach(item => {
        console.log(`  ID ${item.id}: ${item.name}`)
      })
    }
  }

  async run() {
    try {
      await this.init()
      
      const barrowsItems = await this.findBarrowsItemsMissingIcons()
      await this.fixBarrowsIcons(barrowsItems)
      await this.verifyResults()
      
      console.log('\n📊 Final Statistics:')
      console.log(`  Barrows items found: ${this.stats.barrowsItemsFound}`)
      console.log(`  Icons successfully copied: ${this.stats.iconsFixed}`)
      console.log(`  Errors: ${this.stats.errors}`)
      
      if (this.stats.iconsFixed > 0) {
        console.log('\n🎉 SUCCESS: Barrows durability variant icons have been fixed!')
        console.log('   These items now have the correct base icons copied from their pristine versions.')
      }
      
    } catch (error) {
      console.error('❌ Error in Barrows icon fixer:', error)
      throw error
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const fixer = new BarrowsIconFixer()
  fixer.run().catch(console.error)
}

export default BarrowsIconFixer
