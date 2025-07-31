import databaseService from './services/databaseService.js'
import IconService from './services/iconService.js'

await databaseService.init()

console.log('🧪 Testing IconService with essential icons:')

// Test skill icons
const skillsToTest = ['strength', 'hitpoints']
for (const skill of skillsToTest) {
  console.log(`\nTesting ${skill} skill icon:`)
  
  const hasIcon = IconService.hasSkillIcon(skill)
  console.log(`  Has icon: ${hasIcon}`)
  
  if (hasIcon) {
    const skillIcon = await IconService.getSkillIcon(skill)
    console.log(`  Retrieved: ${skillIcon ? 'Success (base64 data ready)' : 'Failed'}`)
  }
}

// Test collection log background
console.log('\nTesting collection log background:')
const collectionLogIcon = await IconService.getCollectionLogIcon()
console.log(`  Retrieved: ${collectionLogIcon ? 'Success (base64 data ready)' : 'Failed'}`)

// Check for missing skill icons
console.log('\n🔍 Missing skill icons:')
const missingSkills = IconService.getMissingSkillIcons()
console.log(`Missing skills: ${missingSkills.length > 0 ? missingSkills.join(', ') : 'None'}`)
