import { readFileSync } from 'fs'
import { join } from 'path'

export default defineEventHandler(async (event) => {
  try {
    const htmlPath = join(process.cwd(), 'test', 'all-items-display-dynamic.html')
    const htmlContent = readFileSync(htmlPath, 'utf-8')
    
    setHeader(event, 'Content-Type', 'text/html')
    return htmlContent
  } catch (error) {
    console.error('Error reading dynamic items page:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      data: { error: 'Failed to load dynamic items page' }
    })
  }
}) 