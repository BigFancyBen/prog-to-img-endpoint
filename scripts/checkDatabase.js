#!/usr/bin/env node

import db from '../services/databaseService.js'

async function checkDatabase() {
  await db.init()
  
  console.log('📊 Checking database content...')
  
  // Check the actual item data
  const fullItems = db.db.prepare("SELECT * FROM items WHERE name != 'Unknown Item' LIMIT 5").all()
  console.log('\n📋 Full items in database:')
  fullItems.forEach(item => {
    console.log(`  ${item.id}: ${item.name}`)
    console.log(`    Examine: ${item.examine || 'N/A'}`)
    console.log(`    Icon: ${item.icon_path || 'N/A'}`)
    console.log(`    Wiki: ${item.wiki_name || 'N/A'}`)
    console.log()
  })
  
  // Check if we have any items at all
  const totalItems = db.db.prepare('SELECT COUNT(*) as count FROM items').get()
  const itemsWithData = db.db.prepare("SELECT COUNT(*) as count FROM items WHERE name != 'Unknown Item'").get()
  
  console.log(`📊 Total items: ${totalItems.count}`)
  console.log(`📊 Items with data: ${itemsWithData.count}`)
  console.log(`📊 Items without data: ${totalItems.count - itemsWithData.count}`)
  
  // Show sample raw data
  console.log('\n🔍 Sample raw items:')
  const samples = db.db.prepare('SELECT id, name, examine FROM items LIMIT 10').all()
  samples.forEach(item => {
    console.log(`  ${item.id}: ${item.name} | ${item.examine || 'No examine'}`)
  })
}

checkDatabase().catch(console.error)
