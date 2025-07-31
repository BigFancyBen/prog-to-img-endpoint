import fetch from 'node-fetch'

async function testDBFixed() {
  try {
    console.log('🔍 Testing database in production build...')
    
    const testData = {
      itemName: 'Leather body (g)',
      userName: 'TestUser'
    }
    
    console.log('Test data:', testData)
    
    const response = await fetch('http://localhost:3000/api/collection-log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    })
    
    if (response.ok) {
      const result = await response.json()
      console.log('✅ Success! Status:', response.status)
      console.log('Response type:', typeof result)
      if (typeof result === 'string' && result.startsWith('data:image/png;base64,')) {
        console.log('✅ Received valid image data')
        console.log('Image data length:', result.length)
      } else if (result.body && typeof result.body === 'string' && result.body.startsWith('data:image/png;base64,')) {
        console.log('✅ Received valid image data in response body')
        console.log('Image data length:', result.body.length)
        console.log('✅ Production database is working correctly!')
      } else {
        console.log('Response structure:', Object.keys(result))
        console.log('Response body type:', typeof result.body)
        if (result.body) {
          console.log('Response body starts with:', result.body.substring(0, 50))
        }
      }
    } else {
      const errorText = await response.text()
      console.error('❌ Error:', response.status, response.statusText)
      console.error('Error details:', errorText)
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message)
  }
}

// Wait for server to start
setTimeout(testDBFixed, 3000) 