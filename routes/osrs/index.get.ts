import OSRSDataService from '../../services/dataService.js'

export default defineEventHandler(async (event) => {
  try {
    // Get data summary for statistics
    const summary = await OSRSDataService.getDataSummary()
    
    return {
      message: 'OSRS Database API',
      version: '1.0.0',
      description: 'Complete Old School RuneScape database API with items, equipment, weapons, monsters, and prayers',
      documentation: {
        base_url: '/osrs',
        endpoints: {
          items: {
            list: 'GET /osrs/items - List all items (paginated)',
            get: 'GET /osrs/items/{id} - Get item by ID',
            search: 'GET /osrs/items?where={"name":"iron"} - Search items'
          },
          equipment: {
            list: 'GET /osrs/equipment - List all equipment (paginated)',
            get: 'GET /osrs/equipment/{id} - Get equipment by ID'
          },
          weapons: {
            list: 'GET /osrs/weapons - List all weapons (paginated)',
            get: 'GET /osrs/weapons/{id} - Get weapon by ID'
          },
          monsters: {
            list: 'GET /osrs/monsters - List all monsters (paginated)',
            get: 'GET /osrs/monsters/{id} - Get monster by ID'
          },
          prayers: {
            list: 'GET /osrs/prayers - List all prayers (paginated)',
            get: 'GET /osrs/prayers/{id} - Get prayer by ID'
          },
          search: {
            search: 'GET /osrs/search/{type}?q=search_term - Search by name across data types'
          }
        },
        parameters: {
          pagination: {
            page: 'Page number (default: 1)',
            max_results: 'Results per page (default: 25, max: 100)'
          },
          filtering: {
            where: 'JSON object for filtering (e.g., {"equipable": true})'
          }
        }
      },
      statistics: summary.stats,
      last_updated: summary.lastUpdated,
      _links: {
        items: { href: '/osrs/items' },
        equipment: { href: '/osrs/equipment' },
        weapons: { href: '/osrs/weapons' },
        monsters: { href: '/osrs/monsters' },
        prayers: { href: '/osrs/prayers' }
      }
    }
  } catch (error) {
    console.error('Error fetching API info:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      data: { error: error.message }
    })
  }
}) 