import WikitextParser from '../scripts/wiki/wikitextParser.js'

// Test wikitext content similar to what we'd find for Attack potion
const testWikitext = `
{{Infobox Bonuses
|version1 = (1)
|version2 = (2) 
|version3 = (3)
|version4 = (4)
|image1 = [[File:Attack potion(1).png]]
|image2 = [[File:Attack potion(2).png]]
|image3 = [[File:Attack potion(3).png]]
|image4 = [[File:Attack potion(4).png]]
|name1 = Attack potion(1)
|name2 = Attack potion(2)
|name3 = Attack potion(3)
|name4 = Attack potion(4)
}}
`

console.log('🧪 Testing icon extraction from wikitext...')

const parser = new WikitextParser(testWikitext)

// Extract the template
const templateFound = parser.extractInfobox('Infobox Bonuses')
console.log('📋 Template found:', templateFound)

// Test if template is extracted
console.log('📋 Template extracted:', !!parser.template)
if (parser.template) {
  console.log('📋 Template keys:', Object.keys(parser.template))
  console.log('📋 image1 value:', parser.template.image1)
}

// Test extractVersionedIcon
const iconFilename = parser.extractVersionedIcon()
console.log('📸 Extracted icon filename:', iconFilename)

// Test getIconUrl
const iconUrl = parser.getIconUrl(iconFilename)
console.log('🔗 Generated icon URL:', iconUrl)

// Test selectBestIcon directly
console.log('\n🧪 Testing selectBestIcon with various inputs:')
const testImageValues = [
  '[[File:Attack potion(1).png]]',
  'Attack potion(1).png',
  'File:Attack potion(1).png'
]

testImageValues.forEach(imageValue => {
  const result = parser.selectBestIcon(imageValue)
  console.log(`  "${imageValue}" -> "${result}"`)
})

// Test cleanIconFilename directly
const testFilenames = [
  'Attack potion(1)',
  'File:Attack potion(1)',
  'Attack potion(1).png',
  'File:Attack potion(1).png'
]

console.log('\n🧪 Testing cleanIconFilename with various inputs:')
testFilenames.forEach(filename => {
  const cleaned = parser.cleanIconFilename(filename)
  console.log(`  "${filename}" -> "${cleaned}"`)
})
