#!/usr/bin/env node

// Test the monsters and prayers API endpoints after migration

const testEndpoints = [
  { name: 'Monsters list', url: 'http://localhost:3002/osrs/monsters' },
  { name: 'Monster by ID (1)', url: 'http://localhost:3002/osrs/monsters/1' },
  { name: 'Prayers list', url: 'http://localhost:3002/osrs/prayers' },
  { name: 'Prayer by ID (1)', url: 'http://localhost:3002/osrs/prayers/1' },
  { name: 'OSRS API root', url: 'http://localhost:3002/osrs' }
]

async function testAPI(url, name) {
  try {
    console.log(`\n🔍 Testing ${name}...`)
    console.log(`   URL: ${url}`)
    
    const response = await fetch(url)
    const status = response.status
    
    if (status === 200) {
      const data = await response.json()
      
      // Show summary based on endpoint type
      if (name.includes('list')) {
        console.log(`   ✅ Status: ${status}`)
        console.log(`   📊 Results: ${data.results ? data.results.length : 0} items`)
        console.log(`   📄 Total: ${data.total || 'N/A'}`)
        if (data.results && data.results.length > 0) {
          console.log(`   🏷️  First item: ${data.results[0].name} (ID: ${data.results[0].id})`)
        }
      } else if (name.includes('by ID')) {
        console.log(`   ✅ Status: ${status}`)
        if (data.name) {
          console.log(`   🏷️  Name: ${data.name}`)
          console.log(`   🆔 ID: ${data.id}`)
          if (data.examine) console.log(`   📝 Examine: ${data.examine.substring(0, 50)}...`)
        }
      } else {
        console.log(`   ✅ Status: ${status}`)
        console.log(`   📊 Data: ${JSON.stringify(data).substring(0, 100)}...`)
      }
    } else {
      console.log(`   ❌ Status: ${status}`)
      const text = await response.text()
      console.log(`   💬 Response: ${text.substring(0, 200)}...`)
    }
  } catch (error) {
    console.log(`   💥 Error: ${error.message}`)
  }
}

async function runTests() {
  console.log('🧪 Testing Monsters and Prayers API endpoints...')
  console.log('📌 Make sure the server is running with: npm run dev')
  
  for (const test of testEndpoints) {
    await testAPI(test.url, test.name)
    await new Promise(resolve => setTimeout(resolve, 500)) // Small delay between requests
  }
  
  console.log('\n🎯 Testing complete!')
}

runTests().catch(console.error)
