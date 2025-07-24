#!/usr/bin/env node

import db from '../services/databaseService.js'

async function getItemIds() {
  console.log('📊 Getting sample item IDs from database...')

  try {
    // Initialize the database
    await db.init()
    
    // Get some sample items
    const items = db.db.prepare('SELECT id, name, icon_path FROM items ORDER BY id LIMIT 15').all()
    
    console.log('\n🎯 Available Item IDs for testing:')
    items.forEach(item => {
      console.log(`  ${item.id}: ${item.name} ${item.icon_path ? '🖼️' : '❌'}`)
    })
    
    // Get some specific useful items if they exist
    const commonItems = ['Lobster', 'Fire rune', 'Bronze sword', 'Iron dagger', 'Coins']
    console.log('\n🔍 Looking for common items:')
    
    for (const itemName of commonItems) {
      const item = db.db.prepare('SELECT id, name FROM items WHERE name LIKE ? LIMIT 1').get(`%${itemName}%`)
      if (item) {
        console.log(`  ✅ ${item.id}: ${item.name}`)
      } else {
        console.log(`  ❌ ${itemName} not found`)
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

getItemIds().catch(console.error)

getItemIds().catch(console.error)
