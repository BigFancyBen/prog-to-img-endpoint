import { readFileSync } from 'fs'
import { join } from 'path'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { dynamic } = query
  
  console.log('Route accessed!')
  console.log('Query parameters:', query)
  console.log('Dynamic parameter:', dynamic)
  
  return {
    message: 'Items display route working!',
    dynamic: dynamic,
    timestamp: new Date().toISOString()
  }
}) 