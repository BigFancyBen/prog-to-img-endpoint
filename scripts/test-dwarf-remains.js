import WikiLookupService from '../services/wikiLookupService.js';

async function testDwarfRemains() {
    const wikiService = new WikiLookupService();
    
    console.log('🔍 Testing Dwarf remains page...');
    
    try {
        // Test the direct wiki page lookup
        const result = await wikiService.lookupItemByWikiPage('Dwarf_remains', 0);
        
        if (result) {
            console.log('✅ Success!', result);
        } else {
            console.log('❌ Failed to extract item data');
            
            // Let's get the raw wikitext to see what's there
            console.log('\n🔍 Getting raw wikitext...');
            const wikitext = await wikiService.wikiClient.getPageWikitext('Dwarf_remains');
            
            if (wikitext) {
                console.log('📄 Raw wikitext preview:');
                console.log(wikitext.substring(0, 2000));
                
                // Look for infobox patterns
                const infoboxMatches = wikitext.match(/\{\{[Ii]nfobox[^}]*\}\}/g);
                if (infoboxMatches) {
                    console.log('\n📦 Found infoboxes:');
                    infoboxMatches.forEach((match, i) => {
                        console.log(`Infobox ${i + 1}:`, match.substring(0, 200));
                    });
                }
            }
        }
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

testDwarfRemains();
