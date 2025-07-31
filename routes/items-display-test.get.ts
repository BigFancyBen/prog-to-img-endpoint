import { readFileSync } from 'fs'
import { join } from 'path'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const { dynamic } = query
    
    console.log('Route accessed!')
    console.log('Query parameters:', query)
    console.log('Dynamic parameter:', dynamic)
    
    // Choose which file to serve based on the 'dynamic' query parameter
    const fileName = dynamic ? 'all-items-display-dynamic.html' : 'all-items-display.html'
    const htmlPath = join(process.cwd(), 'tests', fileName)
    
    console.log(`Serving ${fileName} from ${htmlPath}`)
    
    // Check if file exists
    try {
      const htmlContent = readFileSync(htmlPath, 'utf-8')
      console.log(`Successfully read file: ${htmlPath}`)
      
      setHeader(event, 'Content-Type', 'text/html')
      return htmlContent
    } catch (fileError) {
      console.error(`File not found: ${htmlPath}`)
      throw createError({
        statusCode: 404,
        statusMessage: 'File Not Found',
        data: { error: `File not found: ${fileName}` }
      })
    }
  } catch (error) {
    console.error('Error in items-display-test route:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal Server Error',
      data: { error: error.message || 'Failed to load items display' }
    })
  }
}) 