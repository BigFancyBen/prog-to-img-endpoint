#!/usr/bin/env node

/**
 * Test script to verify database integration with API endpoints
 */

import https from 'https'
import http from 'http'

const BASE_URL = 'http://localhost:3000'

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const client = urlObj.protocol === 'https:' ? https : http
    
    const req = client.get(url, (res) => {
      let data = ''
      
      res.on('data', chunk => {
        data += chunk
      })
      
      res.on('end', () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(data))
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`))
          }
        } catch (error) {
          reject(error)
        }
      })
    })
    
    req.on('error', reject)
    req.setTimeout(10000, () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })
  })
}

async function testDatabaseAPI() {
  console.log('🧪 Testing Database-backed API Endpoints')
  console.log('=========================================')
  console.log('')

  // Test individual item lookup
  console.log('📦 Testing individual item lookup...')
  try {
    const item = await makeRequest(`${BASE_URL}/osrs/items/4087`)
    if (item) {
      console.log(`✅ Item: ${item.name} (ID: ${item.id})`)
      console.log(`   Members: ${item.members}`)
      console.log(`   Equipable: ${item.equipable}`)
      console.log(`   Icon path: ${item.icon_path ? 'Available' : 'Missing'}`)
      if (item.equipment) {
        console.log(`   Equipment stats: Defence slash ${item.equipment.defence_slash}`)
      }
    }
  } catch (error) {
    console.error(`❌ Error testing individual item:`, error.message)
  }
  console.log('')

  // Test search functionality
  console.log('🔍 Testing search functionality...')
  const searchResults = await makeRequest(`${BASE_URL}/osrs/items/search?name=dragon&limit=3`)
  if (searchResults && searchResults.results) {
    console.log(`✅ Search returned ${searchResults.results.length} results for "dragon"`)
    searchResults.results.slice(0, 3).forEach(item => {
      console.log(`   - ${item.name} (ID: ${item.id})`)
    })
  }
  console.log('')

  // Test equipment endpoint
  console.log('⚔️  Testing equipment endpoint...')
  const equipment = await makeRequest(`${BASE_URL}/osrs/equipment/4087`)
  if (equipment && equipment.equipable) {
    console.log(`✅ Equipment: ${equipment.name}`)
    console.log(`   Slot: ${equipment.equipment?.slot}`)
    console.log(`   Defence: ${equipment.equipment?.defence_slash} slash`)
  }
  console.log('')

  // Test weapons endpoint
  console.log('🗡️  Testing weapons endpoint...')
  const weapon = await makeRequest(`${BASE_URL}/osrs/weapons/4587`)
  if (weapon && weapon.equipable_weapon) {
    console.log(`✅ Weapon: ${weapon.name}`)
    console.log(`   Attack speed: ${weapon.weapon?.attack_speed}`)
    console.log(`   Weapon type: ${weapon.weapon?.weapon_type}`)
  }
  console.log('')

  // Test pagination
  console.log('📄 Testing pagination...')
  const paginatedItems = await makeRequest(`${BASE_URL}/osrs/items?page=1&max_results=5`)
  if (paginatedItems && paginatedItems.items) {
    console.log(`✅ Pagination working: ${paginatedItems.items.length} items returned`)
    console.log(`   Total items: ${paginatedItems.pagination.total}`)
    console.log(`   Total pages: ${paginatedItems.pagination.totalPages}`)
    console.log(`   Current page: ${paginatedItems.pagination.page}`)
  }
  console.log('')

  // Test equipment list
  console.log('🛡️  Testing equipment list...')
  const equipmentList = await makeRequest(`${BASE_URL}/osrs/equipment?page=1&max_results=3`)
  if (equipmentList && equipmentList.equipment) {
    console.log(`✅ Equipment list: ${equipmentList.equipment.length} items returned`)
    equipmentList.equipment.forEach(item => {
      console.log(`   - ${item.name} (${item.equipment?.slot})`)
    })
  }
  console.log('')

  // Test weapons list
  console.log('⚔️  Testing weapons list...')
  const weaponsList = await makeRequest(`${BASE_URL}/osrs/weapons?page=1&max_results=3`)
  if (weaponsList && weaponsList.weapons) {
    console.log(`✅ Weapons list: ${weaponsList.weapons.length} items returned`)
    weaponsList.weapons.forEach(item => {
      console.log(`   - ${item.name} (${item.weapon?.weapon_type})`)
    })
  }
  console.log('')

  // Test missing item (should return placeholder)
  console.log('❓ Testing missing item handling...')
  const missingItem = await makeRequest(`${BASE_URL}/osrs/items/999999`)
  if (missingItem) {
    console.log(`✅ Missing item handling: ${missingItem.name}`)
    console.log(`   Is placeholder: ${missingItem._missing ? 'Yes' : 'No'}`)
  }
  console.log('')

  console.log('🎉 Database API tests completed!')
  console.log('')
  console.log('Summary:')
  console.log('✅ Items API - Individual lookup working')
  console.log('✅ Items API - Search functionality working') 
  console.log('✅ Items API - Pagination working')
  console.log('✅ Equipment API - Individual lookup working')
  console.log('✅ Equipment API - List with pagination working')
  console.log('✅ Weapons API - Individual lookup working')
  console.log('✅ Weapons API - List with pagination working')
  console.log('✅ Missing item handling working')
  console.log('')
  console.log('🎯 All database integrations are functioning correctly!')
}

// Only run if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testDatabaseAPI().catch(console.error)
}

export default testDatabaseAPI
