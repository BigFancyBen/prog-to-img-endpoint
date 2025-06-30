import OSRSDataService from '../../../services/dataService.js'

export default defineEventHandler(async (event) => {
  try {
    const type = getRouterParam(event, 'type')
    const query = getQuery(event)
    const searchQuery = query.q as string
    
    if (!searchQuery) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        data: { error: 'Search query (q) is required' }
      })
    }

    if (!['items', 'monsters', 'prayers'].includes(type)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        data: { error: 'Invalid search type. Must be items, monsters, or prayers' }
      })
    }

    const results = await OSRSDataService.searchByName(searchQuery, type)
    
    return {
      query: searchQuery,
      type,
      results
    }
  } catch (error) {
    console.error('Error searching:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      data: { error: error.message }
    })
  }
}) 