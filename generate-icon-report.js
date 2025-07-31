import databaseService from './services/databaseService.js'
import fs from 'fs'

/**
 * Generate a detailed report of icon data issues
 */
async function generateIconReport() {
  try {
    console.log('🔄 Initializing database...')
    await databaseService.init()
    
    console.log('📊 Analyzing all items for icon data issues...')
    const allItems = databaseService.getAllItems()
    
    const validIcons = []
    const invalidIcons = []
    const emptyIcons = []
    const noIcons = []
    
    for (const item of allItems) {
      const iconBuffer = databaseService.getIconData(item.id)
      
      if (!iconBuffer) {
        noIcons.push(item)
      } else if (iconBuffer.length === 0) {
        emptyIcons.push(item)
      } else {
        // Check if it's valid PNG or WebP
        const isPNG = iconBuffer[0] === 0x89 && iconBuffer[1] === 0x50 && iconBuffer[2] === 0x4E && iconBuffer[3] === 0x47
        const isWebP = iconBuffer[0] === 0x52 && iconBuffer[1] === 0x49 && iconBuffer[2] === 0x46 && iconBuffer[3] === 0x46 &&
                      iconBuffer[8] === 0x57 && iconBuffer[9] === 0x45 && iconBuffer[10] === 0x42 && iconBuffer[11] === 0x50
        
        if (isPNG || isWebP) {
          validIcons.push(item)
        } else {
          // Decode what the invalid data actually contains
          let dataPreview = iconBuffer.toString('utf8', 0, Math.min(50, iconBuffer.length))
          dataPreview = dataPreview.replace(/[^\x20-\x7E]/g, '�') // Replace non-printable chars
          
          invalidIcons.push({
            ...item,
            iconSize: iconBuffer.length,
            dataPreview: dataPreview
          })
        }
      }
    }
    
    console.log('\n📈 Icon Analysis Results:')
    console.log(`   Total items: ${allItems.length}`)
    console.log(`   Valid PNG/WebP icons: ${validIcons.length} (${((validIcons.length / allItems.length) * 100).toFixed(1)}%)`)
    console.log(`   Invalid icon data: ${invalidIcons.length} (${((invalidIcons.length / allItems.length) * 100).toFixed(1)}%)`)
    console.log(`   Empty icon buffers: ${emptyIcons.length}`)
    console.log(`   No icon data: ${noIcons.length}`)
    
    // Generate detailed HTML report
    const report = generateHTMLReport(validIcons, invalidIcons, emptyIcons, noIcons)
    fs.writeFileSync('icon-data-report.html', report)
    
    console.log('\n✅ Icon data report generated!')
    console.log('📄 Report saved to: icon-data-report.html')
    console.log('🌐 Open the file in a browser to view detailed analysis')
    
    // Show some examples of invalid data
    console.log('\n🔍 Examples of invalid icon data:')
    invalidIcons.slice(0, 10).forEach(item => {
      console.log(`   ${item.name} (ID: ${item.id}) - ${item.iconSize} bytes: "${item.dataPreview}"`)
    })
    
  } catch (error) {
    console.error('❌ Error generating icon report:', error)
  }
}

function generateHTMLReport(validIcons, invalidIcons, emptyIcons, noIcons) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OSRS Database Icon Data Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .section { background: white; margin: 20px 0; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .stat-card { background: #2c3e50; color: white; padding: 20px; border-radius: 8px; text-align: center; }
        .stat-number { font-size: 2em; font-weight: bold; color: #3498db; }
        .items-list { max-height: 400px; overflow-y: auto; }
        .item { padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; }
        .item:hover { background: #f8f9fa; }
        .invalid-preview { font-family: monospace; color: #e74c3c; font-size: 12px; }
        h1 { color: #2c3e50; text-align: center; }
        h2 { color: #34495e; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
        .valid { border-left: 4px solid #27ae60; }
        .invalid { border-left: 4px solid #e74c3c; }
        .empty { border-left: 4px solid #f39c12; }
        .missing { border-left: 4px solid #95a5a6; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🛡️ OSRS Database Icon Data Report</h1>
        
        <div class="stats">
            <div class="stat-card valid">
                <div class="stat-number">${validIcons.length}</div>
                <div>Valid PNG/WebP Icons</div>
                <div>${((validIcons.length / (validIcons.length + invalidIcons.length + emptyIcons.length + noIcons.length)) * 100).toFixed(1)}%</div>
            </div>
            <div class="stat-card invalid">
                <div class="stat-number">${invalidIcons.length}</div>
                <div>Invalid Icon Data</div>
                <div>${((invalidIcons.length / (validIcons.length + invalidIcons.length + emptyIcons.length + noIcons.length)) * 100).toFixed(1)}%</div>
            </div>
            <div class="stat-card empty">
                <div class="stat-number">${emptyIcons.length}</div>
                <div>Empty Buffers</div>
            </div>
            <div class="stat-card missing">
                <div class="stat-number">${noIcons.length}</div>
                <div>No Icon Data</div>
            </div>
        </div>
        
        <div class="section invalid">
            <h2>🚫 Items with Invalid Icon Data (${invalidIcons.length})</h2>
            <p>These items have icon data that is not valid PNG format:</p>
            <div class="items-list">
                ${invalidIcons.map(item => `
                    <div class="item">
                        <div>
                            <strong>${item.name}</strong> (ID: ${item.id})<br>
                            <small>Size: ${item.iconSize} bytes</small>
                        </div>
                        <div class="invalid-preview">"${item.dataPreview}"</div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="section missing">
            <h2>❓ Items with No Icon Data (${noIcons.length})</h2>
            <div class="items-list">
                ${noIcons.map(item => `
                    <div class="item">
                        <strong>${item.name}</strong> (ID: ${item.id})
                    </div>
                `).join('')}
            </div>
        </div>
        
        ${emptyIcons.length > 0 ? `
        <div class="section empty">
            <h2>📂 Items with Empty Icon Buffers (${emptyIcons.length})</h2>
            <div class="items-list">
                ${emptyIcons.map(item => `
                    <div class="item">
                        <strong>${item.name}</strong> (ID: ${item.id})
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
        
        <div class="section valid">
            <h2>✅ Summary</h2>
            <p><strong>Recommendation:</strong> Clean up the ${invalidIcons.length} items with invalid icon data to improve the accuracy of icon coverage statistics.</p>
            <p><strong>Actual Icon Coverage:</strong> ${((validIcons.length / (validIcons.length + invalidIcons.length + emptyIcons.length + noIcons.length)) * 100).toFixed(1)}% (${validIcons.length} valid PNG/WebP icons out of ${validIcons.length + invalidIcons.length + emptyIcons.length + noIcons.length} total items)</p>
        </div>
    </div>
</body>
</html>`
}

// Run the report generation
generateIconReport().catch(console.error)
