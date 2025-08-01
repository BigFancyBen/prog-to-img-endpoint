import { c as defineEventHandler, r as readBody, e as createError } from '../../_/nitro.mjs';
import { z } from 'zod';
import { g as generateCollectionLogImage } from '../../_/imageGenerationService.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:url';
import 'node:path';
import 'chokidar';
import 'anymatch';
import 'node:crypto';
import 'sharp';
import 'path';
import 'url';
import 'fs/promises';
import '../../_/osrsDataService.mjs';
import '../../_/databaseService.mjs';
import 'better-sqlite3';
import 'https';

const collectionLogSchema = z.object({
  itemName: z.string().min(1, "Item name is required"),
  userName: z.string().optional()
});
const collectionLog_post = defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const validatedData = collectionLogSchema.parse(body);
    const result = await generateCollectionLogImage(validatedData);
    return result;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: "Validation Error",
        data: error.errors
      });
    }
    console.error("Error generating collection log image:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error"
    });
  }
});

export { collectionLog_post as default };
//# sourceMappingURL=collection-log.post.mjs.map
