import databaseService from '../services/databaseService.js'

async function analyzeDensity() {
  await databaseService.init()
  const db = databaseService.db
  
  console.log('📊 Analyzing ID density in database')
  console.log('===================================')
  
  // Analyze density in 1000-ID chunks
  const chunkSize = 1000
  const maxId = db.prepare('SELECT MAX(id) FROM items').get()['MAX(id)']
  
  console.log(`\n🔍 Analyzing chunks of ${chunkSize} IDs up to ${maxId}`)
  
  const densityData = []
  
  for (let start = 1; start <= maxId; start += chunkSize) {
    const end = Math.min(start + chunkSize - 1, maxId)
    const count = db.prepare('SELECT COUNT(*) as count FROM items WHERE id BETWEEN ? AND ?').get(start, end).count
    const density = (count / chunkSize * 100).toFixed(1)
    
    if (count > 0) {
      densityData.push({
        start,
        end,
        count,
        density: parseFloat(density)
      })
    }
  }
  
  // Sort by density (highest first)
  densityData.sort((a, b) => b.density - a.density)
  
  console.log(`\n📈 Top 15 densest ranges:`)
  densityData.slice(0, 15).forEach((chunk, i) => {
    console.log(`${(i+1).toString().padStart(2)}. Range ${chunk.start}-${chunk.end}: ${chunk.count} items (${chunk.density}% density)`)
  })
  
  console.log(`\n📉 Sparsest ranges with items:`)
  densityData.slice(-10).forEach((chunk, i) => {
    console.log(`${(densityData.length - 9 + i).toString().padStart(2)}. Range ${chunk.start}-${chunk.end}: ${chunk.count} items (${chunk.density}% density)`)
  })
  
  // Recommend priority ranges
  const highDensity = densityData.filter(c => c.density >= 10)
  const mediumDensity = densityData.filter(c => c.density >= 3 && c.density < 10)
  
  console.log(`\n🎯 Recommended scanning strategy:`)
  console.log(`📈 High priority (≥10% density): ${highDensity.length} ranges`)
  console.log(`📊 Medium priority (3-10% density): ${mediumDensity.length} ranges`)
  console.log(`📉 Low priority (<3% density): ${densityData.filter(c => c.density < 3).length} ranges`)
  
  await databaseService.close()
}

analyzeDensity().catch(console.error)
