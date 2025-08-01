import OSRSDataService from '../../../services/osrsDataService.js'

export default defineEventHandler(async (event) => {
  try {
    const type = getRouterParam(event, 'type')
    const query = getQuery(event)
    const searchQuery = query.q as string
    const searchId = query.id as string
    const page = parseInt(query.page as string) || 1
    const maxResults = parseInt(query.max_results as string) || 25
    
    if (!searchQuery && !searchId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        data: { error: 'Search query (q) or item ID (id) is required' }
      })
    }

    // Currently only items search is supported in the database
    if (type !== 'items') {
      return {
        error: true,
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Invalid search type. Currently only "items" is supported'
      }
    }

    let results = []
    
    // Search by ID if provided
    if (searchId) {
      const itemId = parseInt(searchId)
      if (isNaN(itemId)) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Bad Request',
          data: { error: 'Invalid item ID. Must be a number.' }
        })
      }
      
      const item = await OSRSDataService.getItemById(itemId)
      if (item) {
        results = [item]
      }
    } else {
      // Search by name
      results = await OSRSDataService.searchItemsByName(searchQuery, maxResults)
    }
    
    return {
      query: searchQuery || searchId,
      type,
      results,
      pagination: {
        page,
        maxResults,
        total: results.length,
        totalPages: Math.ceil(results.length / maxResults)
      }
    }
  } catch (error) {
    console.error('Error searching:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      data: { error: error instanceof Error ? error.message : 'Unknown error occurred' }
    })
  }
}) 