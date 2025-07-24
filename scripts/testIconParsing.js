#!/usr/bin/env node

// Test the current icon extraction logic with a sample string
const sampleImageValue = "[[File:Dragonstone bolts (e) 1.png]] [[File:Dragonstone bolts (e) 2.png]] [[File:Dragonstone bolts (e) 3.png]] [[File:Dragonstone bolts (e) 4.png]] [[File:Dragonstone bolts (e) 5.png]]"

console.log('🧪 Testing current regex parsing...')
console.log('Input:', sampleImageValue)

// Test current regex
const fileMatches = sampleImageValue.match(/\[\[File:([^\]]+)\]\]/g)
console.log('\n📋 Current regex results:')
console.log('Matches found:', fileMatches ? fileMatches.length : 0)

if (fileMatches) {
  console.log('Raw matches:', fileMatches)
  
  const filenames = fileMatches.map(match => {
    const filename = match.match(/File:([^\]]+)/)[1]
    return filename.replace(/\.png$/i, '').trim() // Clean like cleanIconFilename
  })
  
  console.log('Cleaned filenames:', filenames)
  
  // Test the selection logic
  console.log('\n🎯 Testing selection logic:')
  
  // Look for detail versions
  const detailIcon = filenames.find(name => {
    const baseName = name.toLowerCase().replace(/\.png$/i, '')
    return baseName.endsWith('detail') && !baseName.includes('(e)') && !baseName.includes('(p)')
  })
  console.log('Detail icon found:', detailIcon || 'NONE')
  
  // Look for main icons (no suffix)
  const mainIcon = filenames.find(name => {
    const baseName = name.replace(/\.png$/i, '')
    return !baseName.match(/[0-9]$|_charged?$|_\(e\)$|_\(p\+?\+?\)$|_detail$/)
  })
  console.log('Main icon found:', mainIcon || 'NONE')
  
  // Look for stack of 5
  const stack5Icon = filenames.find(name => name.match(/\s5$/i))
  console.log('Stack-5 icon found:', stack5Icon || 'NONE')
  
  // Numbered icons (sorted)
  const numberedIcons = filenames.filter(name => {
    const baseName = name.replace(/\.png$/i, '')
    return baseName.match(/[0-9]$/)
  }).sort((a, b) => {
    const aNum = parseInt(a.match(/([0-9]+)(?:\.png)?$/i)?.[1] || '999')
    const bNum = parseInt(b.match(/([0-9]+)(?:\.png)?$/i)?.[1] || '999')
    return aNum - bNum
  })
  console.log('Numbered icons (sorted):', numberedIcons)
  
  // Final selection
  const selected = detailIcon || mainIcon || stack5Icon || numberedIcons[0] || filenames[0]
  console.log('\n✅ SELECTED ICON:', selected)
}

console.log('\n✅ Test complete')
