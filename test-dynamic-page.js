import fetch from 'node-fetch'

async function testDynamicPage() {
  try {
    console.log('🔍 Testing API endpoints for dynamic page...')
    
    // Test the items index endpoint
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
    
    // Test the search endpoint
    console.log('\n2. Testing search endpoint...')
    const searchResponse = await fetch('http://localhost:3000/osrs/items/search?name=sword&max_results=5')
    if (searchResponse.ok) {
      const searchData = await searchResponse.json()
      console.log('✅ Search endpoint working')
      console.log(`   Found ${searchData.results.length} items for "sword"`)
      console.log(`   Sample result: ${searchData.results[0]?.name || 'None'}`)
    } else {
      console.log('❌ Search endpoint failed:', searchResponse.status)
    }
    
    // Test the dynamic page HTML
    console.log('\n3. Testing dynamic page HTML...')
    const pageResponse = await fetch('http://localhost:3000/test/all-items-display-dynamic.html')
    if (pageResponse.ok) {
      console.log('✅ Dynamic page HTML accessible')
      const html = await pageResponse.text()
      console.log(`   Page size: ${html.length} characters`)
      console.log(`   Contains "OSRS Items Database": ${html.includes('OSRS Items Database')}`)
      console.log(`   Contains "ItemsManager": ${html.includes('ItemsManager')}`)
    } else {
      console.log('❌ Dynamic page HTML failed:', pageResponse.status)
    }
    
    console.log('\n🎉 All tests completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Wait for server to start
setTimeout(testDynamicPage, 3000) 