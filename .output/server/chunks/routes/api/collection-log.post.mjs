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
import 'node:crypto';
import 'sharp';
import 'path';
import 'url';
import 'fs/promises';
import '../../_/osrsDataService.mjs';
import 'better-sqlite3';
import 'https';

const collectionLogSchema = z.object({
  itemName: z.string().min(1, "Item name is required"),
  userName: z.string().min(1, "User name is required")
});
const collectionLog_post = defineEventHandler(async (event) => {
  let body = null;
  try {
    body = await readBody(event);
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
    if ((error == null ? void 0 : error.message) && error.message.includes("Item not found")) {
      throw createError({
        statusCode: 404,
        statusMessage: "Item Not Found",
        data: {
          error: error.message,
          itemName: body == null ? void 0 : body.itemName,
          suggestion: "Please check the item name spelling or try a different item."
        }
      });
    }
    if ((error == null ? void 0 : error.message) && error.message.includes("Failed to read item icon")) {
      throw createError({
        statusCode: 500,
        statusMessage: "Icon Loading Error",
        data: {
          error: "Item icon could not be loaded",
          itemName: body == null ? void 0 : body.itemName,
          suggestion: "The item exists but its icon is missing. Please try a different item."
        }
      });
    }
    console.error("Error generating collection log image:", error);
    console.error("Error stack:", error.stack);
    console.error("Error message:", error.message);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: {
        error: "An unexpected error occurred while generating the collection log image",
        details: error.message,
        suggestion: "Please try again or contact support if the problem persists."
      }
    });
  }
});

export { collectionLog_post as default };
//# sourceMappingURL=collection-log.post.mjs.map
