// @ts-ignore
import OSRSDataService from '../../../../services/osrsDataService.js'

export default defineEventHandler(async (event) => {
  try {
    const name = getRouterParam(event, 'name')
    
    if (!name) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        data: { error: 'Item name is required' }
      })
    }

    // Decode URL-encoded name
    const decodedName = decodeURIComponent(name)
    
    const item = await OSRSDataService.getItemByName(decodedName)
    
    if (!item) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
        data: { error: `Item '${decodedName}' not found` }
      })
    }
    
    return item
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    
    console.error('Error fetching item by name:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      data: { error: error instanceof Error ? error.message : 'Unknown error occurred' }
    })
  }
})
