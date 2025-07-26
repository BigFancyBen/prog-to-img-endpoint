const DatabaseService = require('./services/databaseService.js');

async function testSearch() {
  try {
    const db = new DatabaseService();
    await db.init();
    
    console.log('Testing database search...');
    
    // Test simple query
    const stmt = db.db.prepare(`
      SELECT id, name FROM items 
      WHERE name LIKE ? COLLATE NOCASE
      ORDER BY name
      LIMIT 5
    `);
    
    const searchPattern = `%instruction%`;
    console.log(`Search pattern: "${searchPattern}"`);
    
    const rows = stmt.all(searchPattern);
    console.log(`Found ${rows.length} results:`);
    
    rows.forEach(row => {
      console.log(`- ${row.id}: ${row.name}`);
    });
    
    // Test exact match
    console.log('\nTesting exact match...');
    const exactStmt = db.db.prepare(`
      SELECT id, name FROM items 
      WHERE LOWER(name) = LOWER(?)
      LIMIT 1
    `);
    
    const exactRow = exactStmt.get('Instruction manual');
    console.log('Exact match result:', exactRow);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testSearch();
