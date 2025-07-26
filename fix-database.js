import databaseService from './services/databaseService.js'

async function fixDatabase() {
  await databaseService.init()
  const db = databaseService.db

  // Fix all icon paths that contain full paths
  const updateStmt = db.prepare(`
    UPDATE items 
    SET icon_path = CASE 
      WHEN icon_path LIKE '%icons/items/%' THEN SUBSTR(icon_path, INSTR(icon_path, 'icons/items/') + 12)
      ELSE icon_path 
    END
    WHERE icon_path LIKE '%icons/items/%'
  `)

  const result = updateStmt.run()
  console.log(`Fixed ${result.changes} icon paths`)

  // Delete Verac's entries to force re-fetch
  const deleteStmt = db.prepare(`DELETE FROM items WHERE name LIKE '%Verac%brassard%'`)
  const deleteResult = deleteStmt.run()
  console.log(`Deleted ${deleteResult.changes} Verac's brassard entries`)

  await databaseService.close()
}

fixDatabase()
