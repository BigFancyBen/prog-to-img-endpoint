import databaseService from './services/databaseService.js'
import IconService from './services/iconService.js'
import FileService from './services/fileService.js'
import { generateCollectionLogSVG, svgToPng } from './services/svgGenerationService.js'
import fs from 'fs'

async function testCollectionLogPngGeneration() {
  try {
    await databaseService.init()
    
    console.log('🧪 Testing complete collection log PNG generation for Verac\'s brassard...')
    
    const testData = {
      itemName: "Verac's brassard",
      userName: "TestUser"
    }
    
    console.log('\n1. Generating SVG...')
    const svg = await generateCollectionLogSVG(testData)
    console.log(`   ✅ SVG generated (${svg.length} chars)`)
    
    // Save SVG
    fs.writeFileSync('debug-veracs-collection-log.svg', svg)
    
    // Check for item icon in SVG
    const hasItemIcon = svg.includes('x="173" y="135"')
    console.log(`   🖼️  Item icon at correct position: ${hasItemIcon}`)
    
    console.log('\n2. Converting SVG to PNG...')
    try {
      const pngBuffer = await svgToPng(svg)
      console.log(`   ✅ PNG generated (${pngBuffer.length} bytes)`)
      
      // Save PNG
      fs.writeFileSync('debug-veracs-collection-log.png', pngBuffer)
      console.log('   📄 PNG saved as debug-veracs-collection-log.png')
      
      console.log('\n✅ SUCCESS: Both SVG and PNG generated successfully!')
      console.log('   The icon should be visible in both files.')
      console.log('   If the icon is missing in the user\'s collection log, the issue is likely:')
      console.log('   - Frontend display issue')
      console.log('   - API response formatting')
      console.log('   - Browser rendering problem')
      
    } catch (error) {
      console.error(`   ❌ Error converting SVG to PNG: ${error.message}`)
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

testCollectionLogPngGeneration()
