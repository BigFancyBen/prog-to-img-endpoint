import databaseService from './services/databaseService.js'

await databaseService.init()
const db = databaseService.db

console.log('🔍 Checking essential icons in database:')

const essentialIcons = [
  { id: -3, name: 'Strength skill icon' },
  { id: -4, name: 'Hitpoints skill icon' },
  { id: -100, name: 'Collection Log Background' }
]

essentialIcons.forEach(({ id, name }) => {
  const item = db.prepare('SELECT id, name, length(icon_data) as size FROM items WHERE id = ?').get(id)
  if (item) {
    console.log(`✅ ID ${item.id}: ${item.name} (${item.size} bytes)`)
  } else {
    console.log(`❌ ID ${id}: ${name} - Not found`)
  }
})

console.log('\n📊 Database icon statistics:')
const stats = db.prepare('SELECT COUNT(*) as total, SUM(CASE WHEN icon_data IS NOT NULL AND length(icon_data) > 0 THEN 1 ELSE 0 END) as with_icons FROM items').get()
console.log(`Total items: ${stats.total}`)
console.log(`Items with icons: ${stats.with_icons}`)
console.log(`Coverage: ${((stats.with_icons / stats.total) * 100).toFixed(2)}%`)
