import { c as defineEventHandler, f as setHeader, e as createError } from '../../_/nitro.mjs';
import { readFile } from 'fs/promises';
import { join } from 'path';
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

const items_get = defineEventHandler(async (event) => {
  try {
    const htmlContent = await readFile(join(process.cwd(), "public", "docs", "items.html"), "utf-8");
    setHeader(event, "content-type", "text/html");
    return htmlContent;
  } catch (error) {
    throw createError({
      statusCode: 404,
      statusMessage: "Documentation page not found"
    });
  }
});

export { items_get as default };
//# sourceMappingURL=items.get.mjs.map
