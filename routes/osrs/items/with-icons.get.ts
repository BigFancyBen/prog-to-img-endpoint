import { getQuery } from 'h3'
import OSRSDataService from '../../../services/osrsDataService.js'
import IconService from '../../../services/iconService.js'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const { page = 1, max_results = 25 } = query
    
    const pageNum = parseInt(page as string) || 1
    const maxResults = parseInt(max_results as string) || 25
    
    // Get items from the database
    const result = await OSRSDataService.getAllItems(pageNum, maxResults)
    
    // Add icon data to each item
    const itemsWithIcons = await Promise.all(
      result.items.map(async (item) => {
        try {
          const iconDataUrl = await IconService.getItemIcon(item.id)
          return {
            ...item,
            icon_data_url: iconDataUrl || null
          }
        } catch (error) {
          console.error(`Error loading icon for item ${item.id}:`, error)
          return {
            ...item,
            icon_data_url: null
          }
        }
      })
    )
    
    return {
      items: itemsWithIcons,
      total: result.total,
      page: pageNum,
      max_results: maxResults,
      total_pages: Math.ceil(result.total / maxResults)
    }
  } catch (error) {
    console.error('Error fetching items with icons:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      data: { error: 'Failed to fetch items with icons' }
    })
  }
}) 