const WikiLookupService = require('./services/wikiLookupService.js');

async function testWikiLookup() {
  try {
    console.log('Testing WikiLookupService...');
    const wikiService = new WikiLookupService.default();
    
    console.log('Looking up Verac\'s brassard...');
    const result = await wikiService.lookupItemByName("Verac's brassard");
    
    if (result) {
      console.log('Found:', result.name, 'ID:', result.id);
    } else {
      console.log('Not found');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testWikiLookup();
