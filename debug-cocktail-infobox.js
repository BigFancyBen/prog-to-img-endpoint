import WikitextParser from './scripts/wiki/wikitextParser.js';

async function debugCocktailInfobox() {
    console.log('🔍 Debugging Odd cocktail infobox data...');
    
    try {
        const parser = new WikitextParser();
        const pageContent = await parser.getPageContent('Odd cocktail');
        const infoboxes = parser.extractInfoboxes(pageContent);
        
        console.log(`\n📊 Found ${infoboxes.length} infoboxes`);
        
        infoboxes.forEach((infobox, index) => {
            console.log(`\n--- Infobox ${index + 1} ---`);
            console.log('Type:', infobox.type);
            
            // Look for versioned data
            const versionFields = ['name1', 'name2', 'name3', 'name4', 'image1', 'image2', 'image3', 'image4', 'id1', 'id2', 'id3', 'id4'];
            versionFields.forEach(field => {
                if (infobox.data[field]) {
                    console.log(`${field}: ${infobox.data[field]}`);
                }
            });
            
            // Also show general fields
            const generalFields = ['name', 'image', 'id'];
            generalFields.forEach(field => {
                if (infobox.data[field]) {
                    console.log(`${field}: ${infobox.data[field]}`);
                }
            });
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

debugCocktailInfobox();
