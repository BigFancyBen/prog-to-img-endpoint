import { generateCollectionLogImage } from './services/imageGenerationService.js'
import fs from 'fs'

async function testFixedCollectionLog() {
  try {
    const result = await generateCollectionLogImage({
      userName: "TestUser",
      itemName: "Toolkit"
    })
    
    const response = JSON.parse(result.body)
    const base64Data = response.replace(/^data:image\/png;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')
    
    fs.writeFileSync('test-fixed-collection-log.png', buffer)
    console.log('Created test-fixed-collection-log.png with size:', buffer.length, 'bytes')
    
  } catch (error) {
    console.error('Error:', error)
  }
}

testFixedCollectionLog()
