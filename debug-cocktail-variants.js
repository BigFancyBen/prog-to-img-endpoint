import WikiLookupService from './services/wikiLookupService.js';

async function debugCocktailVariants() {
    console.log('🔍 Debugging Odd cocktail variants...');
    
    try {
        const wikiService = new WikiLookupService();
        const result = await wikiService.lookupItemByName('Odd cocktail');
        
        console.log('\n📊 Raw lookup result:');
        console.log('Found versions:', result.versions.length);
        
        result.versions.forEach((version, index) => {
            console.log(`\n--- Version ${index + 1} (ID: ${version.id}) ---`);
            console.log('Name:', version.name);
            console.log('Image:', version.image);
            console.log('Icon URL:', version.iconUrl);
            
            // Show raw infobox data for this version
            if (version.rawData) {
                console.log('Raw infobox data:');
                const relevantKeys = ['name', 'image', 'itemname', 'invimage', 'image1', 'image2', 'image3', 'image4'];
                relevantKeys.forEach(key => {
                    if (version.rawData[key]) {
                        console.log(`  ${key}: ${version.rawData[key]}`);
                    }
                });
            }
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

debugCocktailVariants();
