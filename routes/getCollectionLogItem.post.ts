import { z } from 'zod'
import { generateCollectionLogImage } from '../services/imageGenerationService.js'

// Validation schema (same as collection-log)
const collectionLogSchema = z.object({
  itemName: z.string().min(1, 'Item name is required'),
  userName: z.string().min(1, 'User name is required')
})

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const validatedData = collectionLogSchema.parse(body)
    const result = await generateCollectionLogImage(validatedData)
    return result
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Validation Error',
        data: error.errors
      })
    }
    
    console.error('Error generating collection log image:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error'
    })
  }
}) 