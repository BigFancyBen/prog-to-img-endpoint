#!/usr/bin/env node

import puppeteer from 'puppeteer'
import fs from 'fs'

console.log('🔍 Debugging HTML structure...')

async function debugHTML() {
  const htmlFilePath = 'c:\\Users\\Tango\\Downloads\\https___oldschool.runescape.wiki_w_Item_IDs.htm'
  
  if (!fs.existsSync(htmlFilePath)) {
    console.error(`❌ HTML file not found: ${htmlFilePath}`)
    return
  }
  
  const htmlContent = fs.readFileSync(htmlFilePath, 'utf8')
  console.log(`✅ Loaded HTML file (${Math.round(htmlContent.length / 1024)}KB)`)
  
  // Check if it contains expected content
  const hasItemIDs = htmlContent.includes('Item IDs')
  const hasTables = htmlContent.includes('<table')
  const hasWikiLinks = htmlContent.includes('/w/')
  
  console.log(`Contains "Item IDs": ${hasItemIDs}`)
  console.log(`Contains tables: ${hasTables}`)
  console.log(`Contains wiki links: ${hasWikiLinks}`)
  
  // Show first 2000 characters
  console.log('\n📄 First 2000 characters:')
  console.log(htmlContent.substring(0, 2000))
  
  // Use puppeteer to analyze
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  
  const page = await browser.newPage()
  await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' })
  
  const analysis = await page.evaluate(() => {
    const title = document.title
    const tables = document.querySelectorAll('table')
    const links = document.querySelectorAll('a')
    const rows = document.querySelectorAll('tr')
    
    // Get sample table content
    let sampleTableContent = ''
    if (tables.length > 0) {
      const firstTable = tables[0]
      const firstRows = firstTable.querySelectorAll('tr')
      sampleTableContent = Array.from(firstRows).slice(0, 5).map(row => {
        const cells = row.querySelectorAll('td, th')
        return Array.from(cells).map(cell => cell.textContent?.trim()).join(' | ')
      }).join('\n')
    }
    
    return {
      title: title,
      tableCount: tables.length,
      linkCount: links.length,
      rowCount: rows.length,
      sampleTableContent: sampleTableContent
    }
  })
  
  console.log('\n📊 Puppeteer analysis:')
  console.log(`Page title: ${analysis.title}`)
  console.log(`Tables found: ${analysis.tableCount}`)
  console.log(`Links found: ${analysis.linkCount}`)
  console.log(`Rows found: ${analysis.rowCount}`)
  
  if (analysis.sampleTableContent) {
    console.log('\n📋 Sample table content:')
    console.log(analysis.sampleTableContent)
  }
  
  await browser.close()
}

debugHTML()
