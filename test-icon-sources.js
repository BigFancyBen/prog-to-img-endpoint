import databaseService from './services/databaseService.js'
import IconService from './services/iconService.js'
import FileService from './services/fileService.js'

async function testIconSources() {
  console.log('🧪 Testing Icon Sources...\n')
  
  // Initialize database
  await databaseService.init()
  
  // Test 1: Item icons should come from database
  console.log('📦 Testing Item Icons (should come from database):')
  const testItemIds = [1, 101, 1005]
  
  for (const itemId of testItemIds) {
    const hasIcon = await IconService.hasItemIcon(itemId)
    const iconBuffer = await IconService.getItemIconBuffer(itemId)
    const item = databaseService.getItemById(itemId)
    
    console.log(`  Item ${itemId} (${item?.name || 'Unknown'}):`)
    console.log(`    ✅ Has icon: ${hasIcon}`)
    console.log(`    ✅ Icon size: ${iconBuffer ? iconBuffer.length + ' bytes' : 'No icon'}`)
  }
  
  // Test 2: Skill icons should come from filesystem
  console.log('\n⚔️  Testing Skill Icons (should come from filesystem):')
  const testSkills = ['attack', 'defence', 'strength', 'magic']
  
  for (const skill of testSkills) {
    try {
      const iconPath = await FileService.getSkillIcon(skill)
      console.log(`  Skill ${skill}: ✅ ${iconPath}`)
    } catch (error) {
      console.log(`  Skill ${skill}: ❌ ${error.message}`)
    }
  }
  
  // Test 3: Collection log background should come from filesystem
  console.log('\n📋 Testing Collection Log Background (should come from filesystem):')
  try {
    const bgPath = await FileService.getCollectionLogBackground()
    console.log(`  Collection Log BG: ✅ ${bgPath}`)
  } catch (error) {
    console.log(`  Collection Log BG: ❌ ${error.message}`)
  }
  
  // Test 4: API endpoint should use database icons
  console.log('\n🌐 Testing API Endpoint (item icons should use database):')
  const response = await fetch('http://localhost:3001/osrs/items/1')
  if (response.ok) {
    const data = await response.json()
    console.log(`  API Item 1: ✅ ${data.name}`)
    console.log(`  Icon path in response: ${data.icon_path || 'null'}`)
    console.log(`  Icon URL in response: ${data.icon_url || 'null'}`)
  } else {
    console.log('  API test failed - server not running?')
  }
  
  console.log('\n✅ Icon source testing complete!')
  process.exit(0)
}

testIconSources().catch(console.error)
