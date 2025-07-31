// @ts-ignore
import OSRSDataService from '../../../services/osrsDataService.js'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const { name, id, query: searchQuery, page = 1, max_results = 25 } = query
    
    // Support both 'name' and 'query' parameters for backward compatibility
    const searchTerm = name || searchQuery
    
    if (!searchTerm && !id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        data: { error: 'Either name/query or id parameter is required' }
      })
    }

    let results = []
    const pageNum = parseInt(page as string) || 1
    const maxResults = parseInt(max_results as string) || 25

    if (id) {
      // Search by ID with wiki lookup
      try {
        const item = await OSRSDataService.getItemById(id, true)
        results = [item]
      } catch (error: any) {
        if (error.message && error.message.includes('not found')) {
          results = []
        } else {
          throw error
        }
      }
    } else if (searchTerm) {
      // Search by name with wiki lookup
      results = await OSRSDataService.searchItemsByName(searchTerm, maxResults)
    }

    return {
      items: results,
      total: results.length,
      page: pageNum,
      max_results: maxResults,
      query: { name: searchTerm, id },
      count: results.length,
      wiki_lookup_enabled: true,
      _links: {
        self: { href: `search?${new URLSearchParams(query).toString()}` },
        parent: { href: '/osrs/items' }
      }
    }
  } catch (error: any) {
    console.error('Error in item search:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      data: { error: error.message || 'Unknown error' }
    })
  }
})
