import puppeteer from 'puppeteer'

console.log('🚀 Starting simple puppeteer test...')

async function testPuppeteer() {
  let browser = null
  
  try {
    console.log('📱 Launching browser...')
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    })
    console.log('✅ Browser launched successfully')
    
    const page = await browser.newPage()
    console.log('✅ New page created')
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    console.log('✅ User agent set')
    
    console.log('📖 Navigating to wiki...')
    await page.goto('https://oldschool.runescape.wiki/w/Item_IDs', {
      waitUntil: 'networkidle0',
      timeout: 30000
    })
    console.log('✅ Page loaded successfully')
    
    const title = await page.title()
    console.log(`📄 Page title: ${title}`)
    
    console.log('✅ Test completed successfully')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    if (browser) {
      await browser.close()
      console.log('✅ Browser closed')
    }
  }
}

testPuppeteer()
