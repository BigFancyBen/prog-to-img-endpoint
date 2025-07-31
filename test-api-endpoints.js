import fetch from 'node-fetch'

async function testAPIEndpoints() {
  try {
    console.log('🔍 Testing API endpoints...')
    
    // Test 1: Items index endpoint
    console.log('\n1. Testing items index endpoint...')
    const itemsResponse = await fetch('http://localhost:3000/osrs/items?page=1&max_results=5')
    if (itemsResponse.ok) {
      const itemsData = await itemsResponse.json()
      console.log('✅ Items endpoint working')
      console.log(`   Found ${itemsData.items.length} items`)
      console.log(`   Total items: ${itemsData.pagination.total}`)
      console.log(`   Sample item: ${itemsData.items[0]?.name || 'None'}`)
    } else {
      console.log('❌ Items endpoint failed:', itemsResponse.status)
    }
    
    // Test 2: Search endpoint
    console.log('\n2. Testing search endpoint...')
    const searchResponse = await fetch('http://localhost:3000/osrs/items/search?name=sword&max_results=5')
    if (searchResponse.ok) {
      const searchData = await searchResponse.json()
      console.log('✅ Search endpoint working')
      console.log(`   Response keys: ${Object.keys(searchData)}`)
      console.log(`   Found ${searchData.results?.length || searchData.items?.length || 0} items for "sword"`)
      const firstItem = searchData.results?.[0] || searchData.items?.[0]
      console.log(`   Sample result: ${firstItem?.name || 'None'}`)
    } else {
      console.log('❌ Search endpoint failed:', searchResponse.status)
    }
    
    // Test 3: Test the simple test page
    console.log('\n3. Testing simple test page...')
    const testResponse = await fetch('http://localhost:3000/test-dynamic-items-simple.html')
    if (testResponse.ok) {
      console.log('✅ Simple test page accessible')
      const html = await testResponse.text()
      console.log(`   Page size: ${html.length} characters`)
    } else {
      console.log('❌ Simple test page failed:', testResponse.status)
    }
    
    console.log('\n🎉 API endpoints test completed!')
    console.log('\n📋 Available URLs:')
    console.log('   - Original static page: http://localhost:3000/tests-all-items-display')
    console.log('   - Dynamic page: http://localhost:3000/tests-all-items-display?dynamic=true')
    console.log('   - Simple test: http://localhost:3000/test-dynamic-items-simple.html')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Wait for server to start
setTimeout(testAPIEndpoints, 2000) 