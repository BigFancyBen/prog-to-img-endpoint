import databaseService from './services/databaseService.js'
import IconService from './services/iconService.js'
import fs from 'fs'
import path from 'path'

/**
 * Test script to load and display all items from the database
 * Generates an HTML page showing all items with their IDs, names, and icons
 */
async function generateAllItemsPage() {
  try {
    console.log('🔄 Initializing database...')
    await databaseService.init()
    
    console.log('📊 Loading all items from database...')
    const allItems = databaseService.getAllItems()
    console.log(`   ✅ Loaded ${allItems.length} items`)
    
    console.log('🖼️ Processing icon data...')
    // Process items to add base64 icon data with proper validation
    const processedItems = allItems.map(item => {
      const processedItem = { ...item }
      
      // Get icon data from database and validate it
      if (item.id) {
        try {
          const iconBuffer = databaseService.getIconData(item.id)
          if (iconBuffer && iconBuffer.length > 0) {
            // Validate that it's actually a valid image file (PNG or WebP)
            const isPNG = iconBuffer[0] === 0x89 && iconBuffer[1] === 0x50 && iconBuffer[2] === 0x4E && iconBuffer[3] === 0x47
            const isWebP = iconBuffer[0] === 0x52 && iconBuffer[1] === 0x49 && iconBuffer[2] === 0x46 && iconBuffer[3] === 0x46 &&
                          iconBuffer[8] === 0x57 && iconBuffer[9] === 0x45 && iconBuffer[10] === 0x42 && iconBuffer[11] === 0x50
            
            if (isPNG) {
              processedItem.icon_data = iconBuffer.toString('base64')
            } else if (isWebP) {
              // For WebP, we need to specify the correct MIME type
              processedItem.icon_data = iconBuffer.toString('base64')
              processedItem.icon_format = 'webp'
            } else {
              processedItem.icon_data = null
              console.warn(`Item ${item.id} (${item.name}) has invalid icon data (not PNG or WebP format)`)
            }
          } else {
            processedItem.icon_data = null
          }
        } catch (error) {
          console.warn(`Error getting icon for item ${item.id}:`, error.message)
          processedItem.icon_data = null
        }
      }
      
      return processedItem
    })
    
    console.log('🎨 Generating HTML page...')
    const html = generateHTML(processedItems)
    
    console.log('💾 Saving HTML file...')
    const outputPath = path.join(process.cwd(), 'all-items-display.html')
    fs.writeFileSync(outputPath, html)
    
    console.log(`✅ SUCCESS: All items page generated!`)
    console.log(`📄 File saved to: ${outputPath}`)
    console.log(`🌐 Open the file in a browser to view all ${processedItems.length} items`)
    
    // Generate some stats
    const itemsWithIcons = processedItems.filter(item => item.icon_data)
    const itemsWithoutIcons = processedItems.filter(item => !item.icon_data)
    
    console.log('\n📈 Statistics:')
    console.log(`   Total items: ${processedItems.length}`)
    console.log(`   Items with icons: ${itemsWithIcons.length}`)
    console.log(`   Items without icons: ${itemsWithoutIcons.length}`)
    console.log(`   Icon coverage: ${((itemsWithIcons.length / processedItems.length) * 100).toFixed(1)}%`)
    
  } catch (error) {
    console.error('❌ Error generating all items page:', error)
    throw error
  }
}

/**
 * Generate HTML content for displaying all items
 */
function generateHTML(items) {
  const itemsWithIcons = items.filter(item => item.icon_data)
  const itemsWithoutIcons = items.filter(item => !item.icon_data)
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OSRS Items Database - All Items (${items.length} total)</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #1a1a1a;
            color: #ffffff;
            line-height: 1.6;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            background: linear-gradient(135deg, #2c3e50, #3498db);
            border-radius: 10px;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
        }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: #2c3e50;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            border: 2px solid #34495e;
        }
        
        .stat-number {
            font-size: 2em;
            font-weight: bold;
            color: #3498db;
        }
        
        .controls {
            margin-bottom: 20px;
            padding: 20px;
            background: #2c3e50;
            border-radius: 8px;
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            align-items: center;
        }
        
        .search-box {
            flex: 1;
            min-width: 200px;
            padding: 10px;
            font-size: 16px;
            border: 2px solid #34495e;
            border-radius: 5px;
            background: #34495e;
            color: white;
        }
        
        .filter-select {
            padding: 10px;
            font-size: 16px;
            border: 2px solid #34495e;
            border-radius: 5px;
            background: #34495e;
            color: white;
        }
        
        .section {
            margin-bottom: 40px;
        }
        
        .section-title {
            background: #34495e;
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 8px;
            border-left: 5px solid #3498db;
        }
        
        .items-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 15px;
        }
        
        .item-card {
            background: #2c3e50;
            border: 2px solid #34495e;
            border-radius: 8px;
            padding: 15px;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .item-card:hover {
            border-color: #3498db;
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(52, 152, 219, 0.3);
        }
        
        .icon-container {
            flex-shrink: 0;
            width: 64px;
            height: 64px;
            background: #34495e;
            border-radius: 5px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid #4a5568;
        }
        
        .item-icon {
            max-width: 60px;
            max-height: 60px;
            image-rendering: pixelated;
        }
        
        .no-icon {
            color: #7f8c8d;
            font-size: 12px;
            text-align: center;
        }
        
        .item-info {
            flex: 1;
        }
        
        .item-name {
            font-weight: bold;
            color: #3498db;
            margin-bottom: 5px;
            font-size: 16px;
        }
        
        .item-id {
            color: #7f8c8d;
            font-size: 14px;
            margin-bottom: 5px;
        }
        
        .item-details {
            font-size: 12px;
            color: #bdc3c7;
        }
        
        .item-examine {
            font-style: italic;
            color: #95a5a6;
            margin-top: 5px;
            font-size: 11px;
        }
        
        .hidden {
            display: none !important;
        }
        
        .loading {
            text-align: center;
            padding: 50px;
            font-size: 18px;
            color: #7f8c8d;
        }
        
        @media (max-width: 768px) {
            .items-grid {
                grid-template-columns: 1fr;
            }
            
            .controls {
                flex-direction: column;
                align-items: stretch;
            }
            
            .stats {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🗡️ OSRS Items Database</h1>
            <p>Complete database of Old School RuneScape items with icons</p>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-number">${items.length}</div>
                <div>Total Items</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${itemsWithIcons.length}</div>
                <div>With Icons</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${itemsWithoutIcons.length}</div>
                <div>Missing Icons</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${((itemsWithIcons.length / items.length) * 100).toFixed(1)}%</div>
                <div>Icon Coverage</div>
            </div>
        </div>
        
        <div class="controls">
            <input type="text" id="searchBox" class="search-box" placeholder="Search items by name, ID, or examine text...">
            <select id="iconFilter" class="filter-select">
                <option value="all">All Items</option>
                <option value="with-icons">Items with Icons</option>
                <option value="without-icons">Items without Icons</option>
            </select>
            <select id="sortBy" class="filter-select">
                <option value="id">Sort by ID</option>
                <option value="name">Sort by Name</option>
                <option value="members">Sort by Members/F2P</option>
            </select>
        </div>
        
        <div class="section">
            <div class="section-title">
                <h2>📦 All Items (<span id="itemCount">${items.length}</span>)</h2>
            </div>
            <div id="itemsContainer" class="items-grid">
                ${generateItemCards(items)}
            </div>
        </div>
    </div>
    
    <script>
        const allItems = ${JSON.stringify(items, null, 2)};
        let filteredItems = [...allItems];
        
        const searchBox = document.getElementById('searchBox');
        const iconFilter = document.getElementById('iconFilter');
        const sortBy = document.getElementById('sortBy');
        const itemsContainer = document.getElementById('itemsContainer');
        const itemCount = document.getElementById('itemCount');
        
        function filterAndDisplayItems() {
            const searchTerm = searchBox.value.toLowerCase();
            const iconFilterValue = iconFilter.value;
            const sortValue = sortBy.value;
            
            // Filter items
            filteredItems = allItems.filter(item => {
                // Search filter
                const matchesSearch = !searchTerm || 
                    item.name.toLowerCase().includes(searchTerm) ||
                    item.id.toString().includes(searchTerm) ||
                    (item.examine && item.examine.toLowerCase().includes(searchTerm));
                
                // Icon filter
                const hasIcon = item.icon_data;
                let matchesIconFilter = true;
                if (iconFilterValue === 'with-icons') {
                    matchesIconFilter = hasIcon;
                } else if (iconFilterValue === 'without-icons') {
                    matchesIconFilter = !hasIcon;
                }
                
                return matchesSearch && matchesIconFilter;
            });
            
            // Sort items
            filteredItems.sort((a, b) => {
                switch (sortValue) {
                    case 'name':
                        return a.name.localeCompare(b.name);
                    case 'members':
                        if (a.members !== b.members) {
                            return a.members ? -1 : 1; // Members first
                        }
                        return a.name.localeCompare(b.name);
                    default: // id
                        return a.id - b.id;
                }
            });
            
            // Update display
            displayItems(filteredItems);
            itemCount.textContent = filteredItems.length;
        }
        
        function displayItems(items) {
            itemsContainer.innerHTML = items.map(item => generateItemCard(item)).join('');
        }
        
        function generateItemCard(item) {
            const hasIcon = item.icon_data;
            const mimeType = item.icon_format === 'webp' ? 'image/webp' : 'image/png';
            const iconSrc = item.icon_data ? \`data:\${mimeType};base64,\${item.icon_data}\` : '';
            
            return \`
                <div class="item-card">
                    <div class="icon-container">
                        \${hasIcon ? 
                            \`<img src="\${iconSrc}" alt="\${item.name}" class="item-icon" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                             <div class="no-icon" style="display:none;">No Icon</div>\` :
                            \`<div class="no-icon">No Icon</div>\`
                        }
                    </div>
                    <div class="item-info">
                        <div class="item-name">\${item.name}</div>
                        <div class="item-id">ID: \${item.id}</div>
                        <div class="item-details">
                            \${item.members ? '👑 Members' : '🆓 F2P'} | 
                            \${item.tradeable ? '💰 Tradeable' : '🚫 Untradeable'} |
                            \${item.stackable ? '📚 Stackable' : '📦 Non-stackable'}
                        </div>
                        \${item.examine ? \`<div class="item-examine">"\${item.examine}"\</div>\` : ''}
                    </div>
                </div>
            \`;
        }
        
        // Event listeners
        searchBox.addEventListener('input', filterAndDisplayItems);
        iconFilter.addEventListener('change', filterAndDisplayItems);
        sortBy.addEventListener('change', filterAndDisplayItems);
        
        // Initial load
        filterAndDisplayItems();
        
        console.log('📊 Loaded', allItems.length, 'items');
        console.log('🎯 Use the search and filter controls to find specific items');
    </script>
</body>
</html>`;
}

/**
 * Generate HTML for item cards (server-side rendering)
 */
function generateItemCards(items) {
  return items.map(item => {
    const hasIcon = item.icon_data
    const mimeType = item.icon_format === 'webp' ? 'image/webp' : 'image/png'
    const iconSrc = item.icon_data ? `data:${mimeType};base64,${item.icon_data}` : ''
    
    return `
      <div class="item-card">
        <div class="icon-container">
          ${hasIcon ? 
            `<img src="${iconSrc}" alt="${item.name}" class="item-icon" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
             <div class="no-icon" style="display:none;">No Icon</div>` :
            `<div class="no-icon">No Icon</div>`
          }
        </div>
        <div class="item-info">
          <div class="item-name">${item.name}</div>
          <div class="item-id">ID: ${item.id}</div>
          <div class="item-details">
            ${item.members ? '👑 Members' : '🆓 F2P'} | 
            ${item.tradeable ? '💰 Tradeable' : '🚫 Untradeable'} |
            ${item.stackable ? '📚 Stackable' : '📦 Non-stackable'}
          </div>
          ${item.examine ? `<div class="item-examine">"${item.examine}"</div>` : ''}
        </div>
      </div>
    `
  }).join('')
}

// Run the test
generateAllItemsPage().catch(console.error)
