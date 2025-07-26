import { generateCollectionLogImage } from './services/imageGenerationService.js'
import fs from 'fs'

async function testFileRefCollectionLog() {
  try {
    const result = await generateCollectionLogImage({
      userName: "TestUser",
      itemName: "Toolkit"
    })
    
    console.log('Result status:', result.statusCode)
    const response = JSON.parse(result.body)
    console.log('Response length:', response.length)
    
    if (response.startsWith('data:image/png;base64,')) {
      const base64Data = response.replace(/^data:image\/png;base64,/, '')
      const buffer = Buffer.from(base64Data, 'base64')
      
      fs.writeFileSync('test-file-ref-collection-log.png', buffer)
      console.log('Created test-file-ref-collection-log.png with size:', buffer.length, 'bytes')
    } else {
      console.log('Response does not appear to be a valid image:', response.substring(0, 100))
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
}

testFileRefCollectionLog()
