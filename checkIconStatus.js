#!/usr/bin/env node

import databaseService from './services/databaseService.js'

console.log('🔍 Checking icon download status...')

async function checkIconStatus() {
  try {
    await databaseService.init()
    const db = databaseService.db

    // Check current icon status
    const total = db.prepare('SELECT COUNT(*) as count FROM items').get().count
    const withIcons = db.prepare('SELECT COUNT(*) as count FROM items WHERE icon_data IS NOT NULL AND length(icon_data) > 0').get().count
    const withoutIcons = total - withIcons

    console.log('\n=== CURRENT ICON STATUS ===')
    console.log(`Total items: ${total}`)
    console.log(`Items with icons: ${withIcons}`)
    console.log(`Items without icons: ${withoutIcons}`)
    console.log(`Progress: ${((withIcons/total)*100).toFixed(2)}%`)
    
    // Check some specific items that were being processed
    const testItems = [133, 135, 1241, 1243, 1255, 1257, 2432, 3172, 3173, 7410]
    console.log('\n=== CHECKING SPECIFIC ITEMS THAT WERE BEING PROCESSED ===')
    
    for (const id of testItems) {
      const item = db.prepare('SELECT id, name, length(icon_data) as size FROM items WHERE id = ?').get(id)
      if (item) {
        console.log(`ID ${id}: ${item.name} - Icon size: ${item.size || 0} bytes`)
      } else {
        console.log(`ID ${id}: NOT FOUND`)
      }
    }
    
    // Check largest icons to see if they downloaded properly
    console.log('\n=== LARGEST ICON FILES (TOP 10) ===')
    const largestIcons = db.prepare('SELECT id, name, length(icon_data) as size FROM items WHERE icon_data IS NOT NULL ORDER BY length(icon_data) DESC LIMIT 10').all()
    largestIcons.forEach(item => {
      console.log(`ID ${item.id}: ${item.name} - ${item.size} bytes`)
    })
    
    // Check items with 0-byte icons (empty but not null)
    console.log('\n=== ITEMS WITH 0-BYTE ICON DATA ===')
    const emptyIcons = db.prepare('SELECT COUNT(*) as count FROM items WHERE icon_data IS NOT NULL AND length(icon_data) = 0').get().count
    console.log(`Items with 0-byte icons: ${emptyIcons}`)
    
    if (emptyIcons > 0) {
      const samples = db.prepare('SELECT id, name FROM items WHERE icon_data IS NOT NULL AND length(icon_data) = 0 LIMIT 5').all()
      samples.forEach(item => {
        console.log(`  ID ${item.id}: ${item.name}`)
      })
    }

    // Check recently updated items
    console.log('\n=== RECENT IMPROVEMENTS (items that gained icons recently) ===')
    // This is a rough check - items with smaller IDs that now have icons
    const recentlyFixed = db.prepare(`
      SELECT id, name, length(icon_data) as size 
      FROM items 
      WHERE icon_data IS NOT NULL 
      AND length(icon_data) > 0 
      AND id IN (133, 135, 1241, 1243, 1255, 1257, 2432, 3172, 3173, 7410, 7581, 7582, 7584, 7585)
      ORDER BY id
    `).all()
    
    console.log(`Found ${recentlyFixed.length} recently processed items with icons:`)
    recentlyFixed.forEach(item => {
      console.log(`  ✅ ID ${item.id}: ${item.name} - ${item.size} bytes`)
    })

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

checkIconStatus()
