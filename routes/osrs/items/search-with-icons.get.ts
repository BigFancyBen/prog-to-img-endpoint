import { getQuery } from 'h3'
import OSRSDataService from '../../../services/osrsDataService.js'
import IconService from '../../../services/iconService.js'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const { name, id, query: searchQuery, page = 1, max_results = 25 } = query
    
    // Support both 'name' and 'query' parameters for backward compatibility
    const searchTerm = name || searchQuery
    
    if (!searchTerm && !id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        data: { error: 'Either name/query or id parameter is required' }
      })
    }
    
    let results = []
    const pageNum = parseInt(page as string) || 1
    const maxResults = parseInt(max_results as string) || 25
    
    if (id) {
      // Get specific item by ID
      const item = await OSRSDataService.getItemById(parseInt(id as string))
      if (item) {
        results = [item]
      }
    } else if (searchTerm) {
      // Search by name with wiki lookup
      results = await OSRSDataService.searchItemsByName(searchTerm, maxResults)
    }
    
    // Add icon data to each item
    const itemsWithIcons = await Promise.all(
      results.map(async (item) => {
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
      total: itemsWithIcons.length,
      page: pageNum,
      max_results: maxResults,
      query: { name: searchTerm, id },
      count: itemsWithIcons.length,
      wiki_lookup_enabled: true
    }
  } catch (error) {
    console.error('Error searching items with icons:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      data: { error: 'Failed to search items with icons' }
    })
  }
}) 