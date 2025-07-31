#!/usr/bin/env node

import puppeteer from 'puppeteer'

console.log('🔍 Debugging Item IDs page scraping...')

async function debugScraping() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  
  const page = await browser.newPage()
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
  
  console.log('📖 Loading Item IDs page...')
  
  await page.goto('https://oldschool.runescape.wiki/w/Item_IDs', {
    waitUntil: 'networkidle0',
    timeout: 60000
  })

  console.log('🔍 Analyzing page structure...')

  const analysis = await page.evaluate(() => {
    const tables = document.querySelectorAll('table')
    console.log(`Found ${tables.length} tables`)
    
    let totalRows = 0
    let sampleRows = []
    
    tables.forEach((table, tableIndex) => {
      const rows = table.querySelectorAll('tr')
      console.log(`Table ${tableIndex + 1}: ${rows.length} rows`)
      totalRows += rows.length
      
      // Sample first few rows from each table
      for (let i = 0; i < Math.min(3, rows.length); i++) {
        const row = rows[i]
        const cells = row.querySelectorAll('td')
        if (cells.length >= 2) {
          const idCell = cells[0]
          const nameCell = cells[1]
          
          const idText = idCell.textContent?.trim()
          const nameText = nameCell.textContent?.trim()
          const link = nameCell.querySelector('a')
          const href = link?.getAttribute('href')
          
          sampleRows.push({
            table: tableIndex + 1,
            row: i + 1,
            id: idText,
            name: nameText,
            href: href,
            hasLink: !!link
          })
        }
      }
    })
    
    return {
      tableCount: tables.length,
      totalRows: totalRows,
      sampleRows: sampleRows
    }
  })

  console.log('\n📊 Analysis results:')
  console.log(`Tables found: ${analysis.tableCount}`)
  console.log(`Total rows: ${analysis.totalRows}`)
  
  console.log('\n📋 Sample rows:')
  analysis.sampleRows.forEach(row => {
    console.log(`Table ${row.table}, Row ${row.row}: ID="${row.id}" Name="${row.name}" HasLink=${row.hasLink} Href="${row.href}"`)
  })

  await browser.close()
}

debugScraping()
