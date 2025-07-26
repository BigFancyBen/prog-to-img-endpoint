import wtf from 'wtf_wikipedia'

async function testWtf() {
  try {
    console.log('Testing wtf_wikipedia...')
    
    const testWikitext = `{{Infobox Item
|name = Test Item
|id = 123
|examine = A test item
}}`
    
    console.log('Input wikitext:')
    console.log(testWikitext)
    
    const doc = wtf(testWikitext)
    console.log('Parsed document:', !!doc)
    console.log('Has infoboxes:', doc.infoboxes().length)
    
    if (doc.infoboxes().length > 0) {
      const infobox = doc.infoboxes()[0]
      console.log('Infobox template:', infobox.template)
      console.log('Infobox data keys:', Object.keys(infobox.data || {}))
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
}

testWtf()
