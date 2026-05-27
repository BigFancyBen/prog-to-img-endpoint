#!/usr/bin/env node
/**
 * Backfill pass: find every id in item_wiki_mapping that has no row in items,
 * retry the wiki lookup once, then dump any still-failing rows to a JSON file
 * so the failure patterns can be inspected and addressed.
 *
 * Does NOT stub or modify the DB beyond what lookupItemByWikiPage already does.
 */
import fs from 'fs'
import path from 'path'
import databaseService from '../services/databaseService.js'
import WikiLookupService from '../services/wikiLookupService.js'

const LOOKUP_DELAY_MS = 1500
const OUTPUT_PATH = path.resolve('logs/missing-items-failures.json')
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function main() {
  await databaseService.init()
  const db = databaseService.db
  const svc = new WikiLookupService()

  const missing = db.prepare(`
    SELECT m.id, m.name, m.wiki_page, m.wiki_url
    FROM item_wiki_mapping m
    LEFT JOIN items i ON i.id = m.id
    WHERE i.id IS NULL
    ORDER BY m.id
  `).all()

  console.log(`📊 ${missing.length} mapped ids have no row in items`)
  if (missing.length === 0) {
    console.log('🎉 Nothing to do — items table is already dense')
    process.exit(0)
  }

  let recovered = 0
  const failures = []

  for (let i = 0; i < missing.length; i++) {
    const m = missing[i]
    const progress = `[${i + 1}/${missing.length}]`
    let reason = null

    try {
      await svc.lookupItemByWikiPage(m.wiki_page, m.id)
    } catch (err) {
      reason = `exception: ${err.message}`
    }

    const existsNow = db.prepare('SELECT 1 FROM items WHERE id = ?').get(m.id)
    if (existsNow) {
      recovered++
      console.log(`${progress} ✅ recovered ${m.name} (${m.id})`)
    } else {
      const hasHash = m.wiki_page.includes('#')
      const anchor = hasHash ? m.wiki_page.split('#')[1] : null
      const basePage = m.wiki_page.split('#')[0]
      failures.push({
        id: m.id,
        name: m.name,
        wiki_page: m.wiki_page,
        wiki_url: m.wiki_url,
        base_page: basePage,
        anchor,
        reason: reason || 'lookup returned without inserting row',
      })
      console.log(`${progress} ❌ failed ${m.name} (${m.id}) — ${reason || 'no row inserted'}`)
    }

    if (i + 1 < missing.length) await sleep(LOOKUP_DELAY_MS)
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true })
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(failures, null, 2))

  const totalItems = db.prepare('SELECT COUNT(*) as c FROM items').get().c
  const totalMapped = db.prepare('SELECT COUNT(*) as c FROM item_wiki_mapping').get().c

  console.log('\n📊 BACKFILL COMPLETE')
  console.log(`  recovered: ${recovered}`)
  console.log(`  failed:    ${failures.length}`)
  console.log(`  items:     ${totalItems} / mapped: ${totalMapped}`)
  console.log(`\n📄 failures written to ${OUTPUT_PATH}`)

  if (failures.length) {
    const grouped = groupByBasePage(failures)
    const topPages = Object.entries(grouped)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 20)

    console.log('\n📋 top failure groups (by base wiki page):')
    for (const [page, items] of topPages) {
      const sample = items.slice(0, 3).map(i => `${i.name}#${i.anchor || '∅'}`).join(', ')
      console.log(`  ${items.length.toString().padStart(4)}× ${page} — e.g. ${sample}`)
    }
  }
}

function groupByBasePage(failures) {
  const out = {}
  for (const f of failures) {
    if (!out[f.base_page]) out[f.base_page] = []
    out[f.base_page].push(f)
  }
  return out
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
