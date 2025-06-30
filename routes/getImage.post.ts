import { z } from 'zod'
import { generateProgressImage } from '../services/imageGenerationService.js'

// Validation schema (same as progress-image)
const progressImageSchema = z.object({
  script_name: z.string().min(1, 'Script name is required'),
  runtime: z.number().min(0, 'Runtime must be a positive number'),
  loot: z.array(z.object({
    id: z.number(),
    name: z.string().optional(),
    count: z.number()
  })).optional(),
  xp_earned: z.array(z.object({
    skill: z.string(),
    xp: z.string()
  })).optional()
})

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const validatedData = progressImageSchema.parse(body)
    const result = await generateProgressImage(validatedData)
    return result
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Validation Error',
        data: error.errors
      })
    }
    
    console.error('Error generating progress image:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error'
    })
  }
}) 