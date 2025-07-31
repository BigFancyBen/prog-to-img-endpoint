import WikiLookupService from './services/wikiLookupService.js';

async function directCocktailTest() {
    console.log('🔍 Direct cocktail test...');
    
    try {
        const wikiService = new WikiLookupService();
        
        // Try to get the wiki page content directly
        const url = 'https://oldschool.runescape.wiki/w/Odd_cocktail';
        console.log('Fetching:', url);
        
        const response = await fetch(url + '?action=raw');
        const wikitext = await response.text();
        
        console.log('\n📄 First 1000 chars of wikitext:');
        console.log(wikitext.substring(0, 1000));
        
        // Look for image references
        const imageMatches = wikitext.match(/image\d*\s*=\s*[^|\n}]+/gi);
        console.log('\n🖼️ Image references found:');
        imageMatches?.forEach((match, i) => {
            console.log(`${i + 1}: ${match.trim()}`);
        });
        
        // Look for ID references  
        const idMatches = wikitext.match(/id\d*\s*=\s*\d+/gi);
        console.log('\n🆔 ID references found:');
        idMatches?.forEach((match, i) => {
            console.log(`${i + 1}: ${match.trim()}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

directCocktailTest();
