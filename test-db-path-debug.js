import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import Database from 'better-sqlite3'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Test the same logic as databaseService
const isProduction = process.env.NODE_ENV === 'production' || process.cwd().includes('.output')
let DB_DIR = join(process.cwd(), 'data')
let DB_PATH = join(DB_DIR, 'osrs.db')

console.log(`🔍 Database path: ${DB_PATH}`)
console.log(`🔍 Is production: ${isProduction}`)
console.log(`🔍 Current working directory: ${process.cwd()}`)

console.log(`🔍 Final database path: ${DB_PATH}`)

// Try to open the database
try {
  const db = new Database(DB_PATH)
  const itemCount = db.prepare('SELECT COUNT(*) as count FROM items').get()
  console.log(`✅ Database opened successfully with ${itemCount.count} items`)
  
  // Test a search
  const searchResult = db.prepare('SELECT * FROM items WHERE name LIKE ? LIMIT 5').all('%Leather body%')
  console.log(`🔍 Search for "Leather body" found ${searchResult.length} items:`)
  searchResult.forEach(item => {
    console.log(`  - ${item.name} (ID: ${item.id})`)
  })
  
  db.close()
} catch (error) {
  console.error('❌ Failed to open database:', error.message)
} 