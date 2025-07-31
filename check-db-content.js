#!/usr/bin/env node

import databaseService from './services/databaseService.js'

await databaseService.init()

const samples = databaseService.db.prepare('SELECT * FROM item_wiki_mapping LIMIT 10').all()
console.log('Sample wiki page mappings:')
samples.forEach(item => {
  console.log(`ID ${item.id}: ${item.name} → "${item.wiki_page}"`)
})

console.log('\nChecking for wiki pages with /w/ prefix:')
const withPrefix = databaseService.db.prepare("SELECT COUNT(*) as count FROM item_wiki_mapping WHERE wiki_page LIKE '/w/%'").get()
console.log(`Pages with /w/ prefix: ${withPrefix.count}`)

console.log('\nFirst few items with /w/ prefix:')
const prefixedPages = databaseService.db.prepare("SELECT * FROM item_wiki_mapping WHERE wiki_page LIKE '/w/%' LIMIT 5").all()
prefixedPages.forEach(item => {
  console.log(`ID ${item.id}: ${item.name} → "${item.wiki_page}"`)
})
