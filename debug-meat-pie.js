#!/usr/bin/env node

import puppeteer from 'puppeteer'

async function checkMeatPieWiki() {
  console.log('🔍 Checking Meat pie wiki page manually...')
  
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()
  
  try {
    await page.goto('https://oldschool.runescape.wiki/w/Meat_pie', {
      waitUntil: 'networkidle0',
      timeout: 30000
    })
    
    // Check for images on the page
    const images = await page.evaluate(() => {
      const imgElements = Array.from(document.querySelectorAll('img'))
      return imgElements
        .map(img => ({
          src: img.src,
          alt: img.alt,
          title: img.title
        }))
        .filter(img => img.src.includes('oldschool.runescape.wiki/images/'))
    })
    
    console.log('\n📸 Images found on Meat pie page:')
    images.forEach(img => {
      console.log(`  - ${img.src}`)
      console.log(`    Alt: ${img.alt}`)
      console.log(`    Title: ${img.title}`)
      console.log('')
    })
    
    // Check for infoboxes
    const infoboxes = await page.evaluate(() => {
      const infoboxElements = Array.from(document.querySelectorAll('.infobox, .infobox-item'))
      return infoboxElements.map(box => ({
        html: box.innerHTML.substring(0, 500) + '...',
        text: box.textContent.substring(0, 200) + '...'
      }))
    })
    
    console.log('\n📋 Infoboxes found:')
    infoboxes.forEach((box, index) => {
      console.log(`  Infobox ${index + 1}: ${box.text}`)
    })
    
    // Check page title and redirects
    const pageTitle = await page.title()
    const currentUrl = page.url()
    
    console.log(`\n📄 Page title: ${pageTitle}`)
    console.log(`📄 Current URL: ${currentUrl}`)
    
  } catch (error) {
    console.error('Error checking wiki page:', error)
  } finally {
    await browser.close()
  }
}

checkMeatPieWiki()
