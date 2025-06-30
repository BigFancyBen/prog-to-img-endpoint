import OSRSDataService from '../../../services/dataService.js'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const page = parseInt(query.page as string) || 1
    const maxResults = parseInt(query.max_results as string) || 25
    const where = query.where ? JSON.parse(query.where as string) : {}

    let result
    if (Object.keys(where).length > 0) {
      // Search with filters
      result = await OSRSDataService.searchItems(where, page, maxResults)
    } else {
      // Get all items
      result = await OSRSDataService.getAllItems(page, maxResults)
    }

    return result
  } catch (error) {
    console.error('Error fetching items:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      data: { error: error.message }
    })
  }
}) 