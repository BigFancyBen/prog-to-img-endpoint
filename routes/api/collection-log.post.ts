import { z } from 'zod'
import { generateCollectionLogImage } from '../../services/imageGenerationService.js'

// Validation schema
const collectionLogSchema = z.object({
  itemName: z.string().min(1, 'Item name is required'),
  userName: z.string().min(1, 'User name is required')
})

export default defineEventHandler(async (event) => {
  let body: any = null
  
  try {
    // Parse request body
    body = await readBody(event)
    
    // Validate input
    const validatedData = collectionLogSchema.parse(body)
    
    // Generate image
    const result = await generateCollectionLogImage(validatedData)
    
    return result
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Validation Error',
        data: error.errors
      })
    }
    
    // Handle specific item not found errors
    if (error?.message && error.message.includes('Item not found')) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Item Not Found',
        data: {
          error: error.message,
          itemName: body?.itemName,
          suggestion: 'Please check the item name spelling or try a different item.'
        }
      })
    }
    
    // Handle icon loading errors
    if (error?.message && error.message.includes('Failed to read item icon')) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Icon Loading Error',
        data: {
          error: 'Item icon could not be loaded',
          itemName: body?.itemName,
          suggestion: 'The item exists but its icon is missing. Please try a different item.'
        }
      })
    }
    
    console.error('Error generating collection log image:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      data: {
        error: 'An unexpected error occurred while generating the collection log image',
        suggestion: 'Please try again or contact support if the problem persists.'
      }
    })
  }
}) 