import IconService from './services/iconService.js'
import databaseService from './services/databaseService.js'

await databaseService.init()

console.log('🧪 Final test - verifying Dinh\'s bulwark icon is now PNG...')

// Test Dinh's bulwark
const dinhIcon = await IconService.getItemIcon(21015)
if (dinhIcon) {
  console.log('✅ Dinh\'s bulwark icon retrieved')
  console.log('  Format:', dinhIcon.includes('image/png') ? 'PNG ✅' : 'Other format ❌')
  console.log('  Data preview:', dinhIcon.substring(0, 50) + '...')
} else {
  console.log('❌ Failed to get Dinh\'s bulwark icon')
}

console.log('\n🧪 Testing collection log API...')

// Test collection log API
try {
  const response = await fetch('http://localhost:3000/api/collection-log', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      logType: "Equipment Collection",
      items: [
        {"name": "Dinhs bulwark", "obtained": true}
      ]
    })
  })
  
  if (response.ok) {
    const size = response.headers.get('content-length')
    console.log('✅ Collection log API working')
    console.log('  Response size:', size, 'bytes')
    console.log('  Content type:', response.headers.get('content-type'))
  } else {
    console.log('❌ Collection log API failed:', response.status, response.statusText)
  }
} catch (error) {
  console.log('❌ Collection log API error:', error.message)
}

console.log('\n🎉 All tests complete!')
