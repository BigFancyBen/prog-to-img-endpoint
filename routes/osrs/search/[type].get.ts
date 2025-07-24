import OSRSDataService from '../../../services/osrsDataService.js'

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

    // Currently only items search is supported in the database
    if (type !== 'items') {
      return {
        error: true,
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Invalid search type. Currently only "items" is supported'
      }
    }

    const results = await OSRSDataService.searchItemsByName(searchQuery)
    
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
      data: { error: error instanceof Error ? error.message : 'Unknown error occurred' }
    })
  }
}) 