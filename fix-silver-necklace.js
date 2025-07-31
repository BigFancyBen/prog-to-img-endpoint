import WikiLookupService from './services/wikiLookupService.js';
import databaseService from './services/databaseService.js';

async function downloadMissingIcon() {
  try {
    await databaseService.init();
    console.log('🔍 Checking Silver necklace (ID 1796)...');
    
    const wikiService = new WikiLookupService();
    
    // Try to download the icon for Silver necklace
    console.log('📥 Downloading icon for Silver necklace...');
    
    const iconResult = await wikiService.downloadIcon(1796, 'Silver necklace');
    
    if (iconResult && iconResult.buffer) {
      console.log(`✅ Downloaded icon: ${iconResult.buffer.length} bytes`);
      
      // Store it in the database
      const stored = databaseService.storeIconData(1796, iconResult.buffer);
      
      if (stored) {
        console.log('✅ Icon stored successfully in database');
        
        // Verify it was stored
        const hasIcon = databaseService.hasIconData(1796);
        console.log('✅ Verification:', hasIcon ? 'Icon found in database' : 'Icon NOT found in database');
      } else {
        console.log('❌ Failed to store icon in database');
      }
    } else {
      console.log('❌ Failed to download icon');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

downloadMissingIcon();
