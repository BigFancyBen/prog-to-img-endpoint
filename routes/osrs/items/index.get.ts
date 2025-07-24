// @ts-ignore
import OSRSDataService from '../../../services/osrsDataService.js'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const page = parseInt(query.page as string) || 1
    const maxResults = parseInt(query.max_results as string) || 25
    
    const result = await OSRSDataService.getAllItems(page, maxResults)
    return result
  } catch (error: any) {
    console.error('Error fetching items:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      data: { error: error.message || 'Unknown error' }
    })
  }
})