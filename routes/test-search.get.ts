// @ts-ignore
import OSRSDataService from '../services/osrsDataService.js'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const searchQuery = query.q as string || 'instruction'
  
  console.log(`Test route: Searching for "${searchQuery}"`)
  
  const results = await OSRSDataService.testSearchItemsByName(searchQuery)
  
  return {
    query: searchQuery,
    results
  }
})
