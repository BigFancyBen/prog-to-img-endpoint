import OSRSDataService from '../../../services/dataService.js'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const page = parseInt(query.page as string) || 1
    const maxResults = parseInt(query.max_results as string) || 25

    const result = await OSRSDataService.getAllEquipment(page, maxResults)
    return result
  } catch (error) {
    console.error('Error fetching equipment:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      data: { error: error.message }
    })
  }
}) 