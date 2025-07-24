// @ts-ignore
import OSRSDataService from '../../../services/osrsDataService.js'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    
    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        data: { error: 'Item ID is required' }
      })
    }

    // Check cache first, then fallback to wiki lookup by default
    // Users can disable wiki lookup by setting ?wiki_lookup=false
    const query = getQuery(event)
    const enableWikiLookup = query.wiki_lookup !== 'false'

    const item = await OSRSDataService.getItemById(id, enableWikiLookup)
    return item
  } catch (error: any) {
    if (error.message && error.message.includes('not found')) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
        data: { error: error.message }
      })
    }
    
    console.error('Error fetching item:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      data: { error: error.message || 'Unknown error' }
    })
  }
}) 