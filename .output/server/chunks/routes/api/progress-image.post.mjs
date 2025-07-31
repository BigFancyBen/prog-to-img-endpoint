import { c as defineEventHandler, r as readBody, e as createError } from '../../_/nitro.mjs';
import { z } from 'zod';
import { a as generateProgressImage } from '../../_/imageGenerationService.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:url';
import 'node:path';
import 'node:crypto';
import 'sharp';
import 'path';
import 'url';
import 'fs/promises';
import '../../_/osrsDataService.mjs';
import 'better-sqlite3';
import 'https';

const progressImageSchema = z.object({
  script_name: z.string().min(1, "Script name is required"),
  runtime: z.number().min(0, "Runtime must be a positive number"),
  loot: z.array(z.object({
    id: z.number(),
    name: z.string().optional(),
    count: z.number()
  })).optional(),
  xp_earned: z.array(z.object({
    skill: z.string(),
    xp: z.string()
  })).optional()
});
const progressImage_post = defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const validatedData = progressImageSchema.parse(body);
    const result = await generateProgressImage(validatedData);
    return result;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: "Validation Error",
        data: error.errors
      });
    }
    console.error("Error generating progress image:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error"
    });
  }
});

export { progressImage_post as default };
//# sourceMappingURL=progress-image.post.mjs.map
