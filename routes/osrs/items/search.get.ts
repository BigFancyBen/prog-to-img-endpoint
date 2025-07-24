// @ts-ignore
import OSRSDataService from '../../../services/osrsDataService.js'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const { name, id } = query
    
    if (!name && !id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        data: { error: 'Either name or id parameter is required' }
      })
    }

    let results = []

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
    } else if (name) {
      // Search by name with wiki lookup
      results = await OSRSDataService.searchItemsByName(name, 10)
    }

    return {
      query: { name, id },
      results,
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
