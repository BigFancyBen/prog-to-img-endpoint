import databaseService from './services/databaseService.js';

async function checkItem() {
  try {
    await databaseService.init();
    
    // Check if item 1796 exists
    const item = databaseService.db.prepare('SELECT id, name, icon_data FROM items WHERE id = ?').get(1796);
    
    if (item) {
      console.log('✅ Item found:', {
        id: item.id,
        name: item.name,
        hasIconData: !!item.icon_data,
        iconDataLength: item.icon_data ? item.icon_data.length : 0
      });
    } else {
      console.log('❌ Item 1796 not found in database');
    }
    
    // Also search by name
    const itemByName = databaseService.db.prepare('SELECT id, name, icon_data FROM items WHERE name LIKE ?').get('%Silver necklace%');
    
    if (itemByName) {
      console.log('✅ Found by name search:', {
        id: itemByName.id,
        name: itemByName.name,
        hasIconData: !!itemByName.icon_data,
        iconDataLength: itemByName.icon_data ? itemByName.icon_data.length : 0
      });
    } else {
      console.log('❌ No Silver necklace found by name search');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

checkItem();
