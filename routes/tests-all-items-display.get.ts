import { readFileSync } from 'fs'
import { join } from 'path'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const { dynamic } = query
    
    // Choose which file to serve based on the 'dynamic' query parameter
    const fileName = dynamic ? 'all-items-display-dynamic.html' : 'all-items-display.html'
    const htmlPath = join(process.cwd(), 'tests', fileName)
    
    console.log(`Serving ${fileName} from ${htmlPath}`)
    
    const htmlContent = readFileSync(htmlPath, 'utf-8')
    
    setHeader(event, 'Content-Type', 'text/html')
    return htmlContent
  } catch (error) {
    console.error('Error reading all-items-display.html:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      data: { error: 'Failed to load all-items-display.html' }
    })
  }
}) 