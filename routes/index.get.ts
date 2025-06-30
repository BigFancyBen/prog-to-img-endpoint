import { readFile } from 'fs/promises'
import { join } from 'path'

export default defineEventHandler(async (event) => {
  try {
    const htmlContent = await readFile(join(process.cwd(), 'test', 'test.html'), 'utf-8')
    
    setHeader(event, 'content-type', 'text/html')
    return htmlContent
  } catch (error) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Test page not found'
    })
  }
}) 