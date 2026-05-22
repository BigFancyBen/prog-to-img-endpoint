import { z } from 'zod'
import { generateLevelUpImage } from '../../services/imageGenerationService.js'

const levelUpSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  skill: z.string().min(1, 'Skill is required'),
  level: z.number().int().min(1).max(126)
})

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const validatedData = levelUpSchema.parse(body)
    const result = await generateLevelUpImage(validatedData)
    return result
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Validation Error',
        data: error.errors
      })
    }

    console.error('Error generating level-up image:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error'
    })
  }
})
