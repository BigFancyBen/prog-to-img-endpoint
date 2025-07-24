// @ts-ignore
import OSRSDataService from '../../../services/osrsDataService.js'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const page = parseInt(query.page as string) || 1
    const maxResults = parseInt(query.max_results as string) || 25

    const weapons = await OSRSDataService.getAllWeapons()
    
    // Simple pagination
    const startIndex = (page - 1) * maxResults
    const endIndex = startIndex + maxResults
    const paginatedWeapons = weapons.slice(startIndex, endIndex)
    
    return {
      weapons: paginatedWeapons,
      pagination: {
        page: page,
        maxResults: maxResults,
        total: weapons.length,
        totalPages: Math.ceil(weapons.length / maxResults)
      }
    }
  } catch (error: any) {
    console.error('Error fetching weapons:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      data: { error: error.message || 'Unknown error' }
    })
  }
})