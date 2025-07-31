import databaseService from './services/databaseService.js'

async function findValidBarrowsIcons() {
  await databaseService.init()
  
  // Find items that DO have valid Barrows icons
  const allItems = databaseService.getAllItems()
  const barrowsItems = allItems.filter(item => 
    item.name.includes("Ahrim's") || 
    item.name.includes("Dharok's") || 
    item.name.includes("Guthan's") || 
    item.name.includes("Karil's") || 
    item.name.includes("Torag's") || 
    item.name.includes("Verac's")
  )
  
  console.log('🔍 Looking for Barrows items with VALID icons...')
  let validCount = 0
  let validItems = []
  
  barrowsItems.forEach(item => {
    const iconBuffer = databaseService.getIconData(item.id)
    const hasValidIcon = iconBuffer && iconBuffer.length > 0 && (
      (iconBuffer[0] === 0x89 && iconBuffer[1] === 0x50 && iconBuffer[2] === 0x4E && iconBuffer[3] === 0x47) ||
      (iconBuffer[0] === 0x52 && iconBuffer[1] === 0x49 && iconBuffer[2] === 0x46 && iconBuffer[3] === 0x46)
    )
    
    if (hasValidIcon) {
      validCount++
      validItems.push(item)
      console.log(`✅ ${item.id}: ${item.name}`)
    }
  })
  
  console.log(`\n📊 Found ${validCount} Barrows items with valid icons`)
  
  if (validItems.length > 0) {
    console.log('\n🎯 These can be used as source icons for copying to degraded versions')
  } else {
    console.log('\n❌ No valid Barrows icons found - need to download from wiki first')
  }
}

findValidBarrowsIcons().catch(console.error)
