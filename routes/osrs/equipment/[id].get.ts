import OSRSDataService from '../../../services/dataService.js'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    
    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        data: { error: 'Equipment ID is required' }
      })
    }

    const equipment = await OSRSDataService.getEquipmentById(id)
    return equipment
  } catch (error) {
    if (error.message.includes('not found')) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
        data: { error: error.message }
      })
    }
    
    console.error('Error fetching equipment:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      data: { error: error.message }
    })
  }
}) 