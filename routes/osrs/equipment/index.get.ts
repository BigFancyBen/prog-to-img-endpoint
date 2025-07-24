// @ts-ignore
import OSRSDataService from '../../../services/osrsDataService.js'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const page = parseInt(query.page as string) || 1
    const maxResults = parseInt(query.max_results as string) || 25

    const equipment = await OSRSDataService.getAllEquipment()
    
    // Simple pagination
    const startIndex = (page - 1) * maxResults
    const endIndex = startIndex + maxResults
    const paginatedEquipment = equipment.slice(startIndex, endIndex)
    
    return {
      equipment: paginatedEquipment,
      pagination: {
        page: page,
        maxResults: maxResults,
        total: equipment.length,
        totalPages: Math.ceil(equipment.length / maxResults)
      }
    }
  } catch (error: any) {
    console.error('Error fetching equipment:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      data: { error: error.message || 'Unknown error' }
    })
  }
})