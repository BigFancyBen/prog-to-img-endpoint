#!/usr/bin/env node

import axios from 'axios'

const BASE_URL = 'http://localhost:3002'

async function testAPIs() {
  console.log('🧪 Testing OSRS APIs with current database data...')
  
  const tests = [
    {
      name: 'Items List (Pagination)',
      url: `${BASE_URL}/osrs/items?max_results=5`,
      method: 'GET'
    },
    {
      name: 'Specific Item - Grail bell (ID: 17)',
      url: `${BASE_URL}/osrs/items/17`,
      method: 'GET'
    },
    {
      name: 'Specific Item - Guam potion (unf) (ID: 91)',
      url: `${BASE_URL}/osrs/items/91`,
      method: 'GET'
    },
    {
      name: 'Search Items - "herb"',
      url: `${BASE_URL}/osrs/search/items?q=herb&max_results=3`,
      method: 'GET'
    },
    {
      name: 'Equipment List',
      url: `${BASE_URL}/osrs/equipment?max_results=3`,
      method: 'GET'
    },
    {
      name: 'Weapons List',
      url: `${BASE_URL}/osrs/weapons?max_results=3`,
      method: 'GET'
    },
    {
      name: 'Progress Image Generation',
      url: `${BASE_URL}/api/progress-image`,
      method: 'POST',
      data: {
        script_name: "Test Bot",
        loot: [
          {"id": 17, "name": "Grail bell", "count": 25},
          {"id": 91, "name": "Guam potion (unf)", "count": 150},
          {"id": 199, "name": "Grimy guam leaf", "count": 500}
        ],
        runtime: 60,
        xp_earned: [
          {"skill": "Cooking", "xp": "1250"},
          {"skill": "Magic", "xp": "850"}
        ]
      }
    }
  ]
  
  let passed = 0
  let failed = 0
  
  for (const test of tests) {
    try {
      console.log(`\n🔍 Testing: ${test.name}`)
      
      const config = {
        method: test.method,
        url: test.url,
        timeout: 10000
      }
      
      if (test.data) {
        config.data = test.data
      }
      
      const response = await axios(config)
      
      if (response.status === 200) {
        console.log(`✅ PASS - Status: ${response.status}`)
        
        // Show sample of the response data
        if (test.method === 'POST' && test.name.includes('Progress Image')) {
          console.log(`   📊 Response type: ${typeof response.data}`)
          if (typeof response.data === 'string') {
            console.log(`   📊 Image data length: ${response.data.length} characters`)
          }
        } else {
          console.log(`   📊 Data:`, JSON.stringify(response.data, null, 2).substring(0, 200) + '...')
        }
        passed++
      } else {
        console.log(`❌ FAIL - Status: ${response.status}`)
        failed++
      }
      
    } catch (error) {
      console.log(`❌ FAIL - ${error.message}`)
      if (error.response) {
        console.log(`   Status: ${error.response.status}`)
        console.log(`   Data:`, error.response.data)
      }
      failed++
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  console.log(`\n📊 Test Results:`)
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`)
  
  if (failed === 0) {
    console.log(`\n🎉 All tests passed! APIs are working correctly with the current database.`)
  } else {
    console.log(`\n⚠️  Some tests failed. Check the server logs and database content.`)
  }
}

testAPIs().catch(console.error)
