#!/usr/bin/env node

import fs from 'fs'

console.log('🔍 Analyzing HTML patterns...')

const htmlFilePath = 'c:\\Users\\Tango\\Downloads\\Item IDs - OSRS Wiki.htm'

if (!fs.existsSync(htmlFilePath)) {
  console.error(`❌ HTML file not found: ${htmlFilePath}`)
  process.exit(1)
}

const htmlContent = fs.readFileSync(htmlFilePath, 'utf8')
console.log(`✅ Loaded HTML file (${Math.round(htmlContent.length / 1024)}KB)`)

// Look for the specific patterns you showed me
console.log('\n🔍 Looking for patterns...')

// Check if the content contains the example you provided
const hasDwarfRemains = htmlContent.includes('Dwarf remains')
const hasLookupLink = htmlContent.includes('Special:Lookup')
const hasItemIDsText = htmlContent.includes('Item IDs')

console.log(`Contains "Dwarf remains": ${hasDwarfRemains}`)
console.log(`Contains "Special:Lookup": ${hasLookupLink}`)
console.log(`Contains "Item IDs": ${hasItemIDsText}`)

// Find lines containing "Dwarf remains" for context
const lines = htmlContent.split('\n')
const dwarfLines = lines.filter(line => line.includes('Dwarf remains'))
console.log(`\n📋 Lines containing "Dwarf remains" (${dwarfLines.length} found):`)
dwarfLines.forEach((line, i) => {
  console.log(`${i + 1}: ${line.trim()}`)
})

// Also look for the next few lines after Dwarf remains to see the ID pattern
const dwarfIndex = lines.findIndex(line => line.includes('Dwarf remains'))
if (dwarfIndex >= 0) {
  console.log(`\n📋 Lines around "Dwarf remains" (starting at line ${dwarfIndex + 1}):`)
  for (let i = Math.max(0, dwarfIndex - 2); i < Math.min(lines.length, dwarfIndex + 5); i++) {
    console.log(`${i + 1}: ${lines[i].trim()}`)
  }
}

// Look for table structures
const tableCount = (htmlContent.match(/<table/g) || []).length
const trCount = (htmlContent.match(/<tr/g) || []).length
const tdCount = (htmlContent.match(/<td/g) || []).length

console.log(`\n📊 HTML structure:`)
console.log(`Tables: ${tableCount}`)
console.log(`Table rows: ${trCount}`)
console.log(`Table cells: ${tdCount}`)

// Look for ID links
const idLinks = htmlContent.match(/href="[^"]*[&?]id=\d+[^"]*"/g) || []
console.log(`\nID links found: ${idLinks.length}`)
if (idLinks.length > 0) {
  console.log('First 5 ID links:')
  idLinks.slice(0, 5).forEach((link, i) => {
    console.log(`  ${i + 1}: ${link}`)
  })
}

// Look for wiki page links
const wikiLinks = htmlContent.match(/href="\/w\/[^"]+"/g) || []
console.log(`\nWiki page links found: ${wikiLinks.length}`)
if (wikiLinks.length > 0) {
  console.log('First 5 wiki links:')
  wikiLinks.slice(0, 5).forEach((link, i) => {
    console.log(`  ${i + 1}: ${link}`)
  })
}
