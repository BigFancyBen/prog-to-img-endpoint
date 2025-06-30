import process from 'node:process';globalThis._importMeta_={url:import.meta.url,env:process.env};import { tmpdir } from 'node:os';
import { Server } from 'node:http';
import { resolve, dirname, join } from 'node:path';
import nodeCrypto from 'node:crypto';
import { parentPort, threadId } from 'node:worker_threads';
import { defineEventHandler, handleCacheHeaders, splitCookiesString, createEvent, fetchWithEvent, isEvent, eventHandler, setHeaders, sendRedirect, proxyRequest, getRequestURL, getRequestHeader, getResponseHeader, getRequestHeaders, setResponseHeaders, setResponseStatus, send, createApp, createRouter as createRouter$1, toNodeListener, lazyEventHandler, createError, getRouterParam, readBody, getQuery as getQuery$1, setHeader } from 'file://C:/Users/Tango/Documents/projects/prog-to-img-endpoint/node_modules/h3/dist/index.mjs';
import destr from 'file://C:/Users/Tango/Documents/projects/prog-to-img-endpoint/node_modules/destr/dist/index.mjs';
import { createHooks } from 'file://C:/Users/Tango/Documents/projects/prog-to-img-endpoint/node_modules/hookable/dist/index.mjs';
import { createFetch, Headers as Headers$1 } from 'file://C:/Users/Tango/Documents/projects/prog-to-img-endpoint/node_modules/ofetch/dist/node.mjs';
import { fetchNodeRequestHandler, callNodeRequestHandler } from 'file://C:/Users/Tango/Documents/projects/prog-to-img-endpoint/node_modules/node-mock-http/dist/index.mjs';
import { parseURL, withoutBase, joinURL, getQuery, withQuery } from 'file://C:/Users/Tango/Documents/projects/prog-to-img-endpoint/node_modules/ufo/dist/index.mjs';
import { createStorage, prefixStorage } from 'file://C:/Users/Tango/Documents/projects/prog-to-img-endpoint/node_modules/unstorage/dist/index.mjs';
import unstorage_47drivers_47fs from 'file://C:/Users/Tango/Documents/projects/prog-to-img-endpoint/node_modules/unstorage/drivers/fs.mjs';
import { digest } from 'file://C:/Users/Tango/Documents/projects/prog-to-img-endpoint/node_modules/ohash/dist/index.mjs';
import { klona } from 'file://C:/Users/Tango/Documents/projects/prog-to-img-endpoint/node_modules/klona/dist/index.mjs';
import defu, { defuFn } from 'file://C:/Users/Tango/Documents/projects/prog-to-img-endpoint/node_modules/defu/dist/defu.mjs';
import { snakeCase } from 'file://C:/Users/Tango/Documents/projects/prog-to-img-endpoint/node_modules/scule/dist/index.mjs';
import { toRouteMatcher, createRouter } from 'file://C:/Users/Tango/Documents/projects/prog-to-img-endpoint/node_modules/radix3/dist/index.mjs';
import { readFile } from 'node:fs/promises';
import consola from 'file://C:/Users/Tango/Documents/projects/prog-to-img-endpoint/node_modules/consola/dist/index.mjs';
import { ErrorParser } from 'file://C:/Users/Tango/Documents/projects/prog-to-img-endpoint/node_modules/youch-core/build/index.js';
import { Youch } from 'file://C:/Users/Tango/Documents/projects/prog-to-img-endpoint/node_modules/youch/build/index.js';
import { SourceMapConsumer } from 'file://C:/Users/Tango/Documents/projects/prog-to-img-endpoint/node_modules/source-map/source-map.js';
import { z } from 'file://C:/Users/Tango/Documents/projects/prog-to-img-endpoint/node_modules/zod/dist/esm/index.js';
import sharp from 'file://C:/Users/Tango/Documents/projects/prog-to-img-endpoint/node_modules/sharp/lib/index.js';
import { fileURLToPath } from 'node:url';

const serverAssets = [{"baseName":"server","dir":"C:/Users/Tango/Documents/projects/prog-to-img-endpoint/assets"}];

const assets = createStorage();

for (const asset of serverAssets) {
  assets.mount(asset.baseName, unstorage_47drivers_47fs({ base: asset.dir, ignore: (asset?.ignore || []) }));
}

const storage = createStorage({});

storage.mount('/assets', assets);

storage.mount('root', unstorage_47drivers_47fs({"driver":"fs","readOnly":true,"base":"C:/Users/Tango/Documents/projects/prog-to-img-endpoint"}));
storage.mount('src', unstorage_47drivers_47fs({"driver":"fs","readOnly":true,"base":"C:/Users/Tango/Documents/projects/prog-to-img-endpoint"}));
storage.mount('build', unstorage_47drivers_47fs({"driver":"fs","readOnly":false,"base":"C:/Users/Tango/Documents/projects/prog-to-img-endpoint/.nitro"}));
storage.mount('cache', unstorage_47drivers_47fs({"driver":"fs","readOnly":false,"base":"C:/Users/Tango/Documents/projects/prog-to-img-endpoint/.nitro/cache"}));
storage.mount('data', unstorage_47drivers_47fs({"driver":"fs","base":"C:/Users/Tango/Documents/projects/prog-to-img-endpoint/.data/kv"}));

function useStorage(base = "") {
  return base ? prefixStorage(storage, base) : storage;
}

const Hasher = /* @__PURE__ */ (() => {
  class Hasher2 {
    buff = "";
    #context = /* @__PURE__ */ new Map();
    write(str) {
      this.buff += str;
    }
    dispatch(value) {
      const type = value === null ? "null" : typeof value;
      return this[type](value);
    }
    object(object) {
      if (object && typeof object.toJSON === "function") {
        return this.object(object.toJSON());
      }
      const objString = Object.prototype.toString.call(object);
      let objType = "";
      const objectLength = objString.length;
      objType = objectLength < 10 ? "unknown:[" + objString + "]" : objString.slice(8, objectLength - 1);
      objType = objType.toLowerCase();
      let objectNumber = null;
      if ((objectNumber = this.#context.get(object)) === void 0) {
        this.#context.set(object, this.#context.size);
      } else {
        return this.dispatch("[CIRCULAR:" + objectNumber + "]");
      }
      if (typeof Buffer !== "undefined" && Buffer.isBuffer && Buffer.isBuffer(object)) {
        this.write("buffer:");
        return this.write(object.toString("utf8"));
      }
      if (objType !== "object" && objType !== "function" && objType !== "asyncfunction") {
        if (this[objType]) {
          this[objType](object);
        } else {
          this.unknown(object, objType);
        }
      } else {
        const keys = Object.keys(object).sort();
        const extraKeys = [];
        this.write("object:" + (keys.length + extraKeys.length) + ":");
        const dispatchForKey = (key) => {
          this.dispatch(key);
          this.write(":");
          this.dispatch(object[key]);
          this.write(",");
        };
        for (const key of keys) {
          dispatchForKey(key);
        }
        for (const key of extraKeys) {
          dispatchForKey(key);
        }
      }
    }
    array(arr, unordered) {
      unordered = unordered === void 0 ? false : unordered;
      this.write("array:" + arr.length + ":");
      if (!unordered || arr.length <= 1) {
        for (const entry of arr) {
          this.dispatch(entry);
        }
        return;
      }
      const contextAdditions = /* @__PURE__ */ new Map();
      const entries = arr.map((entry) => {
        const hasher = new Hasher2();
        hasher.dispatch(entry);
        for (const [key, value] of hasher.#context) {
          contextAdditions.set(key, value);
        }
        return hasher.toString();
      });
      this.#context = contextAdditions;
      entries.sort();
      return this.array(entries, false);
    }
    date(date) {
      return this.write("date:" + date.toJSON());
    }
    symbol(sym) {
      return this.write("symbol:" + sym.toString());
    }
    unknown(value, type) {
      this.write(type);
      if (!value) {
        return;
      }
      this.write(":");
      if (value && typeof value.entries === "function") {
        return this.array(
          [...value.entries()],
          true
          /* ordered */
        );
      }
    }
    error(err) {
      return this.write("error:" + err.toString());
    }
    boolean(bool) {
      return this.write("bool:" + bool);
    }
    string(string) {
      this.write("string:" + string.length + ":");
      this.write(string);
    }
    function(fn) {
      this.write("fn:");
      if (isNativeFunction(fn)) {
        this.dispatch("[native]");
      } else {
        this.dispatch(fn.toString());
      }
    }
    number(number) {
      return this.write("number:" + number);
    }
    null() {
      return this.write("Null");
    }
    undefined() {
      return this.write("Undefined");
    }
    regexp(regex) {
      return this.write("regex:" + regex.toString());
    }
    arraybuffer(arr) {
      this.write("arraybuffer:");
      return this.dispatch(new Uint8Array(arr));
    }
    url(url) {
      return this.write("url:" + url.toString());
    }
    map(map) {
      this.write("map:");
      const arr = [...map];
      return this.array(arr, false);
    }
    set(set) {
      this.write("set:");
      const arr = [...set];
      return this.array(arr, false);
    }
    bigint(number) {
      return this.write("bigint:" + number.toString());
    }
  }
  for (const type of [
    "uint8array",
    "uint8clampedarray",
    "unt8array",
    "uint16array",
    "unt16array",
    "uint32array",
    "unt32array",
    "float32array",
    "float64array"
  ]) {
    Hasher2.prototype[type] = function(arr) {
      this.write(type + ":");
      return this.array([...arr], false);
    };
  }
  function isNativeFunction(f) {
    if (typeof f !== "function") {
      return false;
    }
    return Function.prototype.toString.call(f).slice(
      -15
      /* "[native code] }".length */
    ) === "[native code] }";
  }
  return Hasher2;
})();
function serialize(object) {
  const hasher = new Hasher();
  hasher.dispatch(object);
  return hasher.buff;
}
function hash(value) {
  return digest(typeof value === "string" ? value : serialize(value)).replace(/[-_]/g, "").slice(0, 10);
}

function defaultCacheOptions() {
  return {
    name: "_",
    base: "/cache",
    swr: true,
    maxAge: 1
  };
}
function defineCachedFunction(fn, opts = {}) {
  opts = { ...defaultCacheOptions(), ...opts };
  const pending = {};
  const group = opts.group || "nitro/functions";
  const name = opts.name || fn.name || "_";
  const integrity = opts.integrity || hash([fn, opts]);
  const validate = opts.validate || ((entry) => entry.value !== void 0);
  async function get(key, resolver, shouldInvalidateCache, event) {
    const cacheKey = [opts.base, group, name, key + ".json"].filter(Boolean).join(":").replace(/:\/$/, ":index");
    let entry = await useStorage().getItem(cacheKey).catch((error) => {
      console.error(`[cache] Cache read error.`, error);
      useNitroApp().captureError(error, { event, tags: ["cache"] });
    }) || {};
    if (typeof entry !== "object") {
      entry = {};
      const error = new Error("Malformed data read from cache.");
      console.error("[cache]", error);
      useNitroApp().captureError(error, { event, tags: ["cache"] });
    }
    const ttl = (opts.maxAge ?? 0) * 1e3;
    if (ttl) {
      entry.expires = Date.now() + ttl;
    }
    const expired = shouldInvalidateCache || entry.integrity !== integrity || ttl && Date.now() - (entry.mtime || 0) > ttl || validate(entry) === false;
    const _resolve = async () => {
      const isPending = pending[key];
      if (!isPending) {
        if (entry.value !== void 0 && (opts.staleMaxAge || 0) >= 0 && opts.swr === false) {
          entry.value = void 0;
          entry.integrity = void 0;
          entry.mtime = void 0;
          entry.expires = void 0;
        }
        pending[key] = Promise.resolve(resolver());
      }
      try {
        entry.value = await pending[key];
      } catch (error) {
        if (!isPending) {
          delete pending[key];
        }
        throw error;
      }
      if (!isPending) {
        entry.mtime = Date.now();
        entry.integrity = integrity;
        delete pending[key];
        if (validate(entry) !== false) {
          let setOpts;
          if (opts.maxAge && !opts.swr) {
            setOpts = { ttl: opts.maxAge };
          }
          const promise = useStorage().setItem(cacheKey, entry, setOpts).catch((error) => {
            console.error(`[cache] Cache write error.`, error);
            useNitroApp().captureError(error, { event, tags: ["cache"] });
          });
          if (event?.waitUntil) {
            event.waitUntil(promise);
          }
        }
      }
    };
    const _resolvePromise = expired ? _resolve() : Promise.resolve();
    if (entry.value === void 0) {
      await _resolvePromise;
    } else if (expired && event && event.waitUntil) {
      event.waitUntil(_resolvePromise);
    }
    if (opts.swr && validate(entry) !== false) {
      _resolvePromise.catch((error) => {
        console.error(`[cache] SWR handler error.`, error);
        useNitroApp().captureError(error, { event, tags: ["cache"] });
      });
      return entry;
    }
    return _resolvePromise.then(() => entry);
  }
  return async (...args) => {
    const shouldBypassCache = await opts.shouldBypassCache?.(...args);
    if (shouldBypassCache) {
      return fn(...args);
    }
    const key = await (opts.getKey || getKey)(...args);
    const shouldInvalidateCache = await opts.shouldInvalidateCache?.(...args);
    const entry = await get(
      key,
      () => fn(...args),
      shouldInvalidateCache,
      args[0] && isEvent(args[0]) ? args[0] : void 0
    );
    let value = entry.value;
    if (opts.transform) {
      value = await opts.transform(entry, ...args) || value;
    }
    return value;
  };
}
function cachedFunction(fn, opts = {}) {
  return defineCachedFunction(fn, opts);
}
function getKey(...args) {
  return args.length > 0 ? hash(args) : "";
}
function escapeKey(key) {
  return String(key).replace(/\W/g, "");
}
function defineCachedEventHandler(handler, opts = defaultCacheOptions()) {
  const variableHeaderNames = (opts.varies || []).filter(Boolean).map((h) => h.toLowerCase()).sort();
  const _opts = {
    ...opts,
    getKey: async (event) => {
      const customKey = await opts.getKey?.(event);
      if (customKey) {
        return escapeKey(customKey);
      }
      const _path = event.node.req.originalUrl || event.node.req.url || event.path;
      let _pathname;
      try {
        _pathname = escapeKey(decodeURI(parseURL(_path).pathname)).slice(0, 16) || "index";
      } catch {
        _pathname = "-";
      }
      const _hashedPath = `${_pathname}.${hash(_path)}`;
      const _headers = variableHeaderNames.map((header) => [header, event.node.req.headers[header]]).map(([name, value]) => `${escapeKey(name)}.${hash(value)}`);
      return [_hashedPath, ..._headers].join(":");
    },
    validate: (entry) => {
      if (!entry.value) {
        return false;
      }
      if (entry.value.code >= 400) {
        return false;
      }
      if (entry.value.body === void 0) {
        return false;
      }
      if (entry.value.headers.etag === "undefined" || entry.value.headers["last-modified"] === "undefined") {
        return false;
      }
      return true;
    },
    group: opts.group || "nitro/handlers",
    integrity: opts.integrity || hash([handler, opts])
  };
  const _cachedHandler = cachedFunction(
    async (incomingEvent) => {
      const variableHeaders = {};
      for (const header of variableHeaderNames) {
        const value = incomingEvent.node.req.headers[header];
        if (value !== void 0) {
          variableHeaders[header] = value;
        }
      }
      const reqProxy = cloneWithProxy(incomingEvent.node.req, {
        headers: variableHeaders
      });
      const resHeaders = {};
      let _resSendBody;
      const resProxy = cloneWithProxy(incomingEvent.node.res, {
        statusCode: 200,
        writableEnded: false,
        writableFinished: false,
        headersSent: false,
        closed: false,
        getHeader(name) {
          return resHeaders[name];
        },
        setHeader(name, value) {
          resHeaders[name] = value;
          return this;
        },
        getHeaderNames() {
          return Object.keys(resHeaders);
        },
        hasHeader(name) {
          return name in resHeaders;
        },
        removeHeader(name) {
          delete resHeaders[name];
        },
        getHeaders() {
          return resHeaders;
        },
        end(chunk, arg2, arg3) {
          if (typeof chunk === "string") {
            _resSendBody = chunk;
          }
          if (typeof arg2 === "function") {
            arg2();
          }
          if (typeof arg3 === "function") {
            arg3();
          }
          return this;
        },
        write(chunk, arg2, arg3) {
          if (typeof chunk === "string") {
            _resSendBody = chunk;
          }
          if (typeof arg2 === "function") {
            arg2(void 0);
          }
          if (typeof arg3 === "function") {
            arg3();
          }
          return true;
        },
        writeHead(statusCode, headers2) {
          this.statusCode = statusCode;
          if (headers2) {
            if (Array.isArray(headers2) || typeof headers2 === "string") {
              throw new TypeError("Raw headers  is not supported.");
            }
            for (const header in headers2) {
              const value = headers2[header];
              if (value !== void 0) {
                this.setHeader(
                  header,
                  value
                );
              }
            }
          }
          return this;
        }
      });
      const event = createEvent(reqProxy, resProxy);
      event.fetch = (url, fetchOptions) => fetchWithEvent(event, url, fetchOptions, {
        fetch: useNitroApp().localFetch
      });
      event.$fetch = (url, fetchOptions) => fetchWithEvent(event, url, fetchOptions, {
        fetch: globalThis.$fetch
      });
      event.waitUntil = incomingEvent.waitUntil;
      event.context = incomingEvent.context;
      event.context.cache = {
        options: _opts
      };
      const body = await handler(event) || _resSendBody;
      const headers = event.node.res.getHeaders();
      headers.etag = String(
        headers.Etag || headers.etag || `W/"${hash(body)}"`
      );
      headers["last-modified"] = String(
        headers["Last-Modified"] || headers["last-modified"] || (/* @__PURE__ */ new Date()).toUTCString()
      );
      const cacheControl = [];
      if (opts.swr) {
        if (opts.maxAge) {
          cacheControl.push(`s-maxage=${opts.maxAge}`);
        }
        if (opts.staleMaxAge) {
          cacheControl.push(`stale-while-revalidate=${opts.staleMaxAge}`);
        } else {
          cacheControl.push("stale-while-revalidate");
        }
      } else if (opts.maxAge) {
        cacheControl.push(`max-age=${opts.maxAge}`);
      }
      if (cacheControl.length > 0) {
        headers["cache-control"] = cacheControl.join(", ");
      }
      const cacheEntry = {
        code: event.node.res.statusCode,
        headers,
        body
      };
      return cacheEntry;
    },
    _opts
  );
  return defineEventHandler(async (event) => {
    if (opts.headersOnly) {
      if (handleCacheHeaders(event, { maxAge: opts.maxAge })) {
        return;
      }
      return handler(event);
    }
    const response = await _cachedHandler(
      event
    );
    if (event.node.res.headersSent || event.node.res.writableEnded) {
      return response.body;
    }
    if (handleCacheHeaders(event, {
      modifiedTime: new Date(response.headers["last-modified"]),
      etag: response.headers.etag,
      maxAge: opts.maxAge
    })) {
      return;
    }
    event.node.res.statusCode = response.code;
    for (const name in response.headers) {
      const value = response.headers[name];
      if (name === "set-cookie") {
        event.node.res.appendHeader(
          name,
          splitCookiesString(value)
        );
      } else {
        if (value !== void 0) {
          event.node.res.setHeader(name, value);
        }
      }
    }
    return response.body;
  });
}
function cloneWithProxy(obj, overrides) {
  return new Proxy(obj, {
    get(target, property, receiver) {
      if (property in overrides) {
        return overrides[property];
      }
      return Reflect.get(target, property, receiver);
    },
    set(target, property, value, receiver) {
      if (property in overrides) {
        overrides[property] = value;
        return true;
      }
      return Reflect.set(target, property, value, receiver);
    }
  });
}
const cachedEventHandler = defineCachedEventHandler;

const inlineAppConfig = {};



const appConfig = defuFn(inlineAppConfig);

function getEnv(key, opts) {
  const envKey = snakeCase(key).toUpperCase();
  return destr(
    process.env[opts.prefix + envKey] ?? process.env[opts.altPrefix + envKey]
  );
}
function _isObject(input) {
  return typeof input === "object" && !Array.isArray(input);
}
function applyEnv(obj, opts, parentKey = "") {
  for (const key in obj) {
    const subKey = parentKey ? `${parentKey}_${key}` : key;
    const envValue = getEnv(subKey, opts);
    if (_isObject(obj[key])) {
      if (_isObject(envValue)) {
        obj[key] = { ...obj[key], ...envValue };
        applyEnv(obj[key], opts, subKey);
      } else if (envValue === void 0) {
        applyEnv(obj[key], opts, subKey);
      } else {
        obj[key] = envValue ?? obj[key];
      }
    } else {
      obj[key] = envValue ?? obj[key];
    }
    if (opts.envExpansion && typeof obj[key] === "string") {
      obj[key] = _expandFromEnv(obj[key]);
    }
  }
  return obj;
}
const envExpandRx = /\{\{([^{}]*)\}\}/g;
function _expandFromEnv(value) {
  return value.replace(envExpandRx, (match, key) => {
    return process.env[key] || match;
  });
}

const _inlineRuntimeConfig = {
  "app": {
    "baseURL": "/"
  },
  "nitro": {
    "routeRules": {}
  }
};
const envOptions = {
  prefix: "NITRO_",
  altPrefix: _inlineRuntimeConfig.nitro.envPrefix ?? process.env.NITRO_ENV_PREFIX ?? "_",
  envExpansion: _inlineRuntimeConfig.nitro.envExpansion ?? process.env.NITRO_ENV_EXPANSION ?? false
};
const _sharedRuntimeConfig = _deepFreeze(
  applyEnv(klona(_inlineRuntimeConfig), envOptions)
);
function useRuntimeConfig(event) {
  {
    return _sharedRuntimeConfig;
  }
}
_deepFreeze(klona(appConfig));
function _deepFreeze(object) {
  const propNames = Object.getOwnPropertyNames(object);
  for (const name of propNames) {
    const value = object[name];
    if (value && typeof value === "object") {
      _deepFreeze(value);
    }
  }
  return Object.freeze(object);
}
new Proxy(/* @__PURE__ */ Object.create(null), {
  get: (_, prop) => {
    console.warn(
      "Please use `useRuntimeConfig()` instead of accessing config directly."
    );
    const runtimeConfig = useRuntimeConfig();
    if (prop in runtimeConfig) {
      return runtimeConfig[prop];
    }
    return void 0;
  }
});

const config = useRuntimeConfig();
const _routeRulesMatcher = toRouteMatcher(
  createRouter({ routes: config.nitro.routeRules })
);
function createRouteRulesHandler(ctx) {
  return eventHandler((event) => {
    const routeRules = getRouteRules(event);
    if (routeRules.headers) {
      setHeaders(event, routeRules.headers);
    }
    if (routeRules.redirect) {
      let target = routeRules.redirect.to;
      if (target.endsWith("/**")) {
        let targetPath = event.path;
        const strpBase = routeRules.redirect._redirectStripBase;
        if (strpBase) {
          targetPath = withoutBase(targetPath, strpBase);
        }
        target = joinURL(target.slice(0, -3), targetPath);
      } else if (event.path.includes("?")) {
        const query = getQuery(event.path);
        target = withQuery(target, query);
      }
      return sendRedirect(event, target, routeRules.redirect.statusCode);
    }
    if (routeRules.proxy) {
      let target = routeRules.proxy.to;
      if (target.endsWith("/**")) {
        let targetPath = event.path;
        const strpBase = routeRules.proxy._proxyStripBase;
        if (strpBase) {
          targetPath = withoutBase(targetPath, strpBase);
        }
        target = joinURL(target.slice(0, -3), targetPath);
      } else if (event.path.includes("?")) {
        const query = getQuery(event.path);
        target = withQuery(target, query);
      }
      return proxyRequest(event, target, {
        fetch: ctx.localFetch,
        ...routeRules.proxy
      });
    }
  });
}
function getRouteRules(event) {
  event.context._nitro = event.context._nitro || {};
  if (!event.context._nitro.routeRules) {
    event.context._nitro.routeRules = getRouteRulesForPath(
      withoutBase(event.path.split("?")[0], useRuntimeConfig().app.baseURL)
    );
  }
  return event.context._nitro.routeRules;
}
function getRouteRulesForPath(path) {
  return defu({}, ..._routeRulesMatcher.matchAll(path).reverse());
}

function _captureError(error, type) {
  console.error(`[${type}]`, error);
  useNitroApp().captureError(error, { tags: [type] });
}
function trapUnhandledNodeErrors() {
  process.on(
    "unhandledRejection",
    (error) => _captureError(error, "unhandledRejection")
  );
  process.on(
    "uncaughtException",
    (error) => _captureError(error, "uncaughtException")
  );
}
function joinHeaders(value) {
  return Array.isArray(value) ? value.join(", ") : String(value);
}
function normalizeFetchResponse(response) {
  if (!response.headers.has("set-cookie")) {
    return response;
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: normalizeCookieHeaders(response.headers)
  });
}
function normalizeCookieHeader(header = "") {
  return splitCookiesString(joinHeaders(header));
}
function normalizeCookieHeaders(headers) {
  const outgoingHeaders = new Headers();
  for (const [name, header] of headers) {
    if (name === "set-cookie") {
      for (const cookie of normalizeCookieHeader(header)) {
        outgoingHeaders.append("set-cookie", cookie);
      }
    } else {
      outgoingHeaders.set(name, joinHeaders(header));
    }
  }
  return outgoingHeaders;
}

function defineNitroErrorHandler(handler) {
  return handler;
}

const errorHandler$0 = defineNitroErrorHandler(
  async function defaultNitroErrorHandler(error, event) {
    const res = await defaultHandler(error, event);
    if (!event.node?.res.headersSent) {
      setResponseHeaders(event, res.headers);
    }
    setResponseStatus(event, res.status, res.statusText);
    return send(
      event,
      typeof res.body === "string" ? res.body : JSON.stringify(res.body, null, 2)
    );
  }
);
async function defaultHandler(error, event, opts) {
  const isSensitive = error.unhandled || error.fatal;
  const statusCode = error.statusCode || 500;
  const statusMessage = error.statusMessage || "Server Error";
  const url = getRequestURL(event, { xForwardedHost: true, xForwardedProto: true });
  if (statusCode === 404) {
    const baseURL = "/";
    if (/^\/[^/]/.test(baseURL) && !url.pathname.startsWith(baseURL)) {
      const redirectTo = `${baseURL}${url.pathname.slice(1)}${url.search}`;
      return {
        status: 302,
        statusText: "Found",
        headers: { location: redirectTo },
        body: `Redirecting...`
      };
    }
  }
  await loadStackTrace(error).catch(consola.error);
  const youch = new Youch();
  if (isSensitive && !opts?.silent) {
    const tags = [error.unhandled && "[unhandled]", error.fatal && "[fatal]"].filter(Boolean).join(" ");
    const ansiError = await (await youch.toANSI(error)).replaceAll(process.cwd(), ".");
    consola.error(
      `[request error] ${tags} [${event.method}] ${url}

`,
      ansiError
    );
  }
  const useJSON = opts?.json || !getRequestHeader(event, "accept")?.includes("text/html");
  const headers = {
    "content-type": useJSON ? "application/json" : "text/html",
    // Prevent browser from guessing the MIME types of resources.
    "x-content-type-options": "nosniff",
    // Prevent error page from being embedded in an iframe
    "x-frame-options": "DENY",
    // Prevent browsers from sending the Referer header
    "referrer-policy": "no-referrer",
    // Disable the execution of any js
    "content-security-policy": "script-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self';"
  };
  if (statusCode === 404 || !getResponseHeader(event, "cache-control")) {
    headers["cache-control"] = "no-cache";
  }
  const body = useJSON ? {
    error: true,
    url,
    statusCode,
    statusMessage,
    message: error.message,
    data: error.data,
    stack: error.stack?.split("\n").map((line) => line.trim())
  } : await youch.toHTML(error, {
    request: {
      url: url.href,
      method: event.method,
      headers: getRequestHeaders(event)
    }
  });
  return {
    status: statusCode,
    statusText: statusMessage,
    headers,
    body
  };
}
async function loadStackTrace(error) {
  if (!(error instanceof Error)) {
    return;
  }
  const parsed = await new ErrorParser().defineSourceLoader(sourceLoader).parse(error);
  const stack = error.message + "\n" + parsed.frames.map((frame) => fmtFrame(frame)).join("\n");
  Object.defineProperty(error, "stack", { value: stack });
  if (error.cause) {
    await loadStackTrace(error.cause).catch(consola.error);
  }
}
async function sourceLoader(frame) {
  if (!frame.fileName || frame.fileType !== "fs" || frame.type === "native") {
    return;
  }
  if (frame.type === "app") {
    const rawSourceMap = await readFile(`${frame.fileName}.map`, "utf8").catch(() => {
    });
    if (rawSourceMap) {
      const consumer = await new SourceMapConsumer(rawSourceMap);
      const originalPosition = consumer.originalPositionFor({ line: frame.lineNumber, column: frame.columnNumber });
      if (originalPosition.source && originalPosition.line) {
        frame.fileName = resolve(dirname(frame.fileName), originalPosition.source);
        frame.lineNumber = originalPosition.line;
        frame.columnNumber = originalPosition.column || 0;
      }
    }
  }
  const contents = await readFile(frame.fileName, "utf8").catch(() => {
  });
  return contents ? { contents } : void 0;
}
function fmtFrame(frame) {
  if (frame.type === "native") {
    return frame.raw;
  }
  const src = `${frame.fileName || ""}:${frame.lineNumber}:${frame.columnNumber})`;
  return frame.functionName ? `at ${frame.functionName} (${src}` : `at ${src}`;
}

const errorHandlers = [errorHandler$0];

async function errorHandler(error, event) {
  for (const handler of errorHandlers) {
    try {
      await handler(error, event, { defaultHandler });
      if (event.handled) {
        return; // Response handled
      }
    } catch(error) {
      // Handler itself thrown, log and continue
      console.error(error);
    }
  }
  // H3 will handle fallback
}

const plugins = [
  
];

const _lazy_TslISg = () => Promise.resolve().then(function () { return collectionLog_post$1; });
const _lazy_mumCVE = () => Promise.resolve().then(function () { return progressImage_post$1; });
const _lazy_hMo7P1 = () => Promise.resolve().then(function () { return getCollectionLogItem_post$1; });
const _lazy_zX4aZM = () => Promise.resolve().then(function () { return getImage_post$1; });
const _lazy_MmDG6x = () => Promise.resolve().then(function () { return index_get$d; });
const _lazy_aaHfqf = () => Promise.resolve().then(function () { return _id__get$9; });
const _lazy_yq8S3H = () => Promise.resolve().then(function () { return index_get$b; });
const _lazy_5xsEet = () => Promise.resolve().then(function () { return index_get$9; });
const _lazy_ax8Fo9 = () => Promise.resolve().then(function () { return _id__get$7; });
const _lazy_qXR5R8 = () => Promise.resolve().then(function () { return index_get$7; });
const _lazy_Q3NBgc = () => Promise.resolve().then(function () { return _id__get$5; });
const _lazy__CFLsy = () => Promise.resolve().then(function () { return index_get$5; });
const _lazy_5b2XAx = () => Promise.resolve().then(function () { return _id__get$3; });
const _lazy_62G3LM = () => Promise.resolve().then(function () { return index_get$3; });
const _lazy_ibCIpH = () => Promise.resolve().then(function () { return _type__get$1; });
const _lazy_USmzaT = () => Promise.resolve().then(function () { return _id__get$1; });
const _lazy_yHSNPL = () => Promise.resolve().then(function () { return index_get$1; });

const handlers = [
  { route: '/api/collection-log', handler: _lazy_TslISg, lazy: true, middleware: false, method: "post" },
  { route: '/api/progress-image', handler: _lazy_mumCVE, lazy: true, middleware: false, method: "post" },
  { route: '/getCollectionLogItem', handler: _lazy_hMo7P1, lazy: true, middleware: false, method: "post" },
  { route: '/getImage', handler: _lazy_zX4aZM, lazy: true, middleware: false, method: "post" },
  { route: '/', handler: _lazy_MmDG6x, lazy: true, middleware: false, method: "get" },
  { route: '/osrs/equipment/:id', handler: _lazy_aaHfqf, lazy: true, middleware: false, method: "get" },
  { route: '/osrs/equipment', handler: _lazy_yq8S3H, lazy: true, middleware: false, method: "get" },
  { route: '/osrs', handler: _lazy_5xsEet, lazy: true, middleware: false, method: "get" },
  { route: '/osrs/items/:id', handler: _lazy_ax8Fo9, lazy: true, middleware: false, method: "get" },
  { route: '/osrs/items', handler: _lazy_qXR5R8, lazy: true, middleware: false, method: "get" },
  { route: '/osrs/monsters/:id', handler: _lazy_Q3NBgc, lazy: true, middleware: false, method: "get" },
  { route: '/osrs/monsters', handler: _lazy__CFLsy, lazy: true, middleware: false, method: "get" },
  { route: '/osrs/prayers/:id', handler: _lazy_5b2XAx, lazy: true, middleware: false, method: "get" },
  { route: '/osrs/prayers', handler: _lazy_62G3LM, lazy: true, middleware: false, method: "get" },
  { route: '/osrs/search/:type', handler: _lazy_ibCIpH, lazy: true, middleware: false, method: "get" },
  { route: '/osrs/weapons/:id', handler: _lazy_USmzaT, lazy: true, middleware: false, method: "get" },
  { route: '/osrs/weapons', handler: _lazy_yHSNPL, lazy: true, middleware: false, method: "get" }
];

function createNitroApp() {
  const config = useRuntimeConfig();
  const hooks = createHooks();
  const captureError = (error, context = {}) => {
    const promise = hooks.callHookParallel("error", error, context).catch((error_) => {
      console.error("Error while capturing another error", error_);
    });
    if (context.event && isEvent(context.event)) {
      const errors = context.event.context.nitro?.errors;
      if (errors) {
        errors.push({ error, context });
      }
      if (context.event.waitUntil) {
        context.event.waitUntil(promise);
      }
    }
  };
  const h3App = createApp({
    debug: destr(true),
    onError: (error, event) => {
      captureError(error, { event, tags: ["request"] });
      return errorHandler(error, event);
    },
    onRequest: async (event) => {
      event.context.nitro = event.context.nitro || { errors: [] };
      const fetchContext = event.node.req?.__unenv__;
      if (fetchContext?._platform) {
        event.context = {
          _platform: fetchContext?._platform,
          // #3335
          ...fetchContext._platform,
          ...event.context
        };
      }
      if (!event.context.waitUntil && fetchContext?.waitUntil) {
        event.context.waitUntil = fetchContext.waitUntil;
      }
      event.fetch = (req, init) => fetchWithEvent(event, req, init, { fetch: localFetch });
      event.$fetch = (req, init) => fetchWithEvent(event, req, init, {
        fetch: $fetch
      });
      event.waitUntil = (promise) => {
        if (!event.context.nitro._waitUntilPromises) {
          event.context.nitro._waitUntilPromises = [];
        }
        event.context.nitro._waitUntilPromises.push(promise);
        if (event.context.waitUntil) {
          event.context.waitUntil(promise);
        }
      };
      event.captureError = (error, context) => {
        captureError(error, { event, ...context });
      };
      await nitroApp$1.hooks.callHook("request", event).catch((error) => {
        captureError(error, { event, tags: ["request"] });
      });
    },
    onBeforeResponse: async (event, response) => {
      await nitroApp$1.hooks.callHook("beforeResponse", event, response).catch((error) => {
        captureError(error, { event, tags: ["request", "response"] });
      });
    },
    onAfterResponse: async (event, response) => {
      await nitroApp$1.hooks.callHook("afterResponse", event, response).catch((error) => {
        captureError(error, { event, tags: ["request", "response"] });
      });
    }
  });
  const router = createRouter$1({
    preemptive: true
  });
  const nodeHandler = toNodeListener(h3App);
  const localCall = (aRequest) => callNodeRequestHandler(nodeHandler, aRequest);
  const localFetch = (input, init) => {
    if (!input.toString().startsWith("/")) {
      return globalThis.fetch(input, init);
    }
    return fetchNodeRequestHandler(
      nodeHandler,
      input,
      init
    ).then((response) => normalizeFetchResponse(response));
  };
  const $fetch = createFetch({
    fetch: localFetch,
    Headers: Headers$1,
    defaults: { baseURL: config.app.baseURL }
  });
  globalThis.$fetch = $fetch;
  h3App.use(createRouteRulesHandler({ localFetch }));
  for (const h of handlers) {
    let handler = h.lazy ? lazyEventHandler(h.handler) : h.handler;
    if (h.middleware || !h.route) {
      const middlewareBase = (config.app.baseURL + (h.route || "/")).replace(
        /\/+/g,
        "/"
      );
      h3App.use(middlewareBase, handler);
    } else {
      const routeRules = getRouteRulesForPath(
        h.route.replace(/:\w+|\*\*/g, "_")
      );
      if (routeRules.cache) {
        handler = cachedEventHandler(handler, {
          group: "nitro/routes",
          ...routeRules.cache
        });
      }
      router.use(h.route, handler, h.method);
    }
  }
  h3App.use(config.app.baseURL, router.handler);
  const app = {
    hooks,
    h3App,
    router,
    localCall,
    localFetch,
    captureError
  };
  return app;
}
function runNitroPlugins(nitroApp2) {
  for (const plugin of plugins) {
    try {
      plugin(nitroApp2);
    } catch (error) {
      nitroApp2.captureError(error, { tags: ["plugin"] });
      throw error;
    }
  }
}
const nitroApp$1 = createNitroApp();
function useNitroApp() {
  return nitroApp$1;
}
runNitroPlugins(nitroApp$1);

const scheduledTasks = false;

const tasks = {
  
};

const __runningTasks__ = {};
async function runTask(name, {
  payload = {},
  context = {}
} = {}) {
  if (__runningTasks__[name]) {
    return __runningTasks__[name];
  }
  if (!(name in tasks)) {
    throw createError({
      message: `Task \`${name}\` is not available!`,
      statusCode: 404
    });
  }
  if (!tasks[name].resolve) {
    throw createError({
      message: `Task \`${name}\` is not implemented!`,
      statusCode: 501
    });
  }
  const handler = await tasks[name].resolve();
  const taskEvent = { name, payload, context };
  __runningTasks__[name] = handler.run(taskEvent);
  try {
    const res = await __runningTasks__[name];
    return res;
  } finally {
    delete __runningTasks__[name];
  }
}

if (!globalThis.crypto) {
  globalThis.crypto = nodeCrypto;
}
const { NITRO_NO_UNIX_SOCKET, NITRO_DEV_WORKER_ID } = process.env;
trapUnhandledNodeErrors();
parentPort?.on("message", (msg) => {
  if (msg && msg.event === "shutdown") {
    shutdown();
  }
});
const nitroApp = useNitroApp();
const server = new Server(toNodeListener(nitroApp.h3App));
let listener;
listen().catch(() => listen(
  true
  /* use random port */
)).catch((error) => {
  console.error("Dev worker failed to listen:", error);
  return shutdown();
});
nitroApp.router.get(
  "/_nitro/tasks",
  defineEventHandler(async (event) => {
    const _tasks = await Promise.all(
      Object.entries(tasks).map(async ([name, task]) => {
        const _task = await task.resolve?.();
        return [name, { description: _task?.meta?.description }];
      })
    );
    return {
      tasks: Object.fromEntries(_tasks),
      scheduledTasks
    };
  })
);
nitroApp.router.use(
  "/_nitro/tasks/:name",
  defineEventHandler(async (event) => {
    const name = getRouterParam(event, "name");
    const payload = {
      ...getQuery$1(event),
      ...await readBody(event).then((r) => r?.payload).catch(() => ({}))
    };
    return await runTask(name, { payload });
  })
);
function listen(useRandomPort = Boolean(
  NITRO_NO_UNIX_SOCKET || process.versions.webcontainer || "Bun" in globalThis && process.platform === "win32"
)) {
  return new Promise((resolve, reject) => {
    try {
      listener = server.listen(useRandomPort ? 0 : getSocketAddress(), () => {
        const address = server.address();
        parentPort?.postMessage({
          event: "listen",
          address: typeof address === "string" ? { socketPath: address } : { host: "localhost", port: address?.port }
        });
        resolve();
      });
    } catch (error) {
      reject(error);
    }
  });
}
function getSocketAddress() {
  const socketName = `nitro-worker-${process.pid}-${threadId}-${NITRO_DEV_WORKER_ID}-${Math.round(Math.random() * 1e4)}.sock`;
  if (process.platform === "win32") {
    return join(String.raw`\\.\pipe`, socketName);
  }
  if (process.platform === "linux") {
    const nodeMajor = Number.parseInt(process.versions.node.split(".")[0], 10);
    if (nodeMajor >= 20) {
      return `\0${socketName}`;
    }
  }
  return join(tmpdir(), socketName);
}
async function shutdown() {
  server.closeAllConnections?.();
  await Promise.all([
    new Promise((resolve) => listener?.close(resolve)),
    nitroApp.hooks.callHook("close").catch(console.error)
  ]);
  parentPort?.postMessage({ event: "exit" });
}

const __filename$3 = fileURLToPath(globalThis._importMeta_.url);
const __dirname$1 = dirname(__filename$3);
const CANVAS_CONFIG = {
  WIDTH: 330,
  TITLE_HEIGHT: 80};
({
  FONT_DIR: join(__dirname$1, "../font"),
  ICONS_DIR: join(__dirname$1, "../icons"),
  ITEMS_DIR: join(__dirname$1, "../icons/items"),
  FONT_FILE: join(__dirname$1, "../font/runescape.ttf")
});
const COLLECTION_LOG_CONFIG = {
  WIDTH: 396,
  HEIGHT: 221,
  ICON_SIZE: 50,
  ICON_POSITION: { x: 173, y: 135 }
};

function formatRuntime(mins) {
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  let runtime = "";
  if (hours > 0) {
    runtime += hours === 1 ? `${hours}hr ` : `${hours}hrs `;
  }
  if (minutes > 0) {
    runtime += minutes === 1 ? `${minutes}min` : `${minutes}mins`;
  }
  return runtime.trim() || "0mins";
}
function formatCount(count) {
  if (count >= 1e6) {
    return `${Math.floor(count * 10 / 1e6) / 10}m`;
  }
  if (count > 1e5) {
    return `${Math.trunc(count / 1e3)}k`;
  }
  if (count > 1e3) {
    return `${Math.trunc(count * 10 / 1e3) / 10}k`;
  }
  return count.toString();
}
function formatXP(xp) {
  const xpInt = typeof xp === "string" ? parseInt(xp.replace(/,/g, "")) : xp;
  if (xpInt >= 1e6) {
    return `${Math.floor(xpInt * 10 / 1e6) / 10}m xp`;
  }
  if (xpInt > 1e3) {
    return `${Math.trunc(xpInt * 10 / 1e3 / 10)}k xp`;
  }
  return `${xpInt} xp`;
}
function getCurrentDate() {
  return (/* @__PURE__ */ new Date()).toLocaleDateString("en-US");
}

const __filename$2 = fileURLToPath(globalThis._importMeta_.url);
const __dirname = dirname(__filename$2);
const cache = /* @__PURE__ */ new Map();
const CACHE_TTL$1 = 60 * 60 * 1e3;
let itemsData = null;
let itemsIndex = null;
class FileService {
  /**
   * Load items data from local file
   * @returns {Promise<Object>} Items data
   */
  static async loadItemsData() {
    if (itemsData) return itemsData;
    try {
      const dataPath = join(__dirname, "../../data/processed/items.json");
      const data = await readFile(dataPath, "utf8");
      itemsData = JSON.parse(data);
      return itemsData;
    } catch (error) {
      console.error("Error loading items data:", error);
      throw new Error("Failed to load local items data");
    }
  }
  /**
   * Load items index from local file
   * @returns {Promise<Object>} Items index
   */
  static async loadItemsIndex() {
    if (itemsIndex) return itemsIndex;
    try {
      const indexPath = join(__dirname, "../../data/processed/indexes.json");
      const data = await readFile(indexPath, "utf8");
      const indexes = JSON.parse(data);
      itemsIndex = indexes.items || {};
      return itemsIndex;
    } catch (error) {
      console.error("Error loading items index:", error);
      throw new Error("Failed to load local items index");
    }
  }
  /**
   * Get item data from local file by ID
   * @param {number} itemId - Item ID
   * @returns {Promise<Object>} Item data
   */
  static async getItemData(itemId) {
    const cacheKey = `item_${itemId}`;
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL$1) {
        return cached.data;
      }
      cache.delete(cacheKey);
    }
    try {
      const items = await this.loadItemsData();
      const itemData = items[itemId.toString()];
      if (!itemData) {
        throw new Error(`Item ${itemId} not found in local data`);
      }
      cache.set(cacheKey, {
        data: itemData,
        timestamp: Date.now()
      });
      return itemData;
    } catch (error) {
      console.error(`Error fetching item ${itemId}:`, error);
      throw new Error(`Failed to fetch item data for ID: ${itemId}`);
    }
  }
  /**
   * Get item icon as base64 from item data
   * @param {number} itemId - Item ID
   * @returns {Promise<string>} Base64 encoded image
   */
  static async getItemIconUrl(itemId) {
    try {
      const itemData = await this.getItemData(itemId);
      if (itemData.icon) {
        return `data:image/png;base64,${itemData.icon}`;
      }
      const placeholderIcon = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
      return `data:image/png;base64,${placeholderIcon}`;
    } catch (error) {
      console.error(`Error getting item icon for ${itemId}:`, error);
      const placeholderIcon = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
      return `data:image/png;base64,${placeholderIcon}`;
    }
  }
  /**
   * Search for items by name using local data
   * @param {string} itemName - Name of the item to search for
   * @returns {Promise<Object>} First matching item data
   */
  static async searchItemByName(itemName) {
    const cacheKey = `search_${itemName.toLowerCase()}`;
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL$1) {
        return cached.data;
      }
      cache.delete(cacheKey);
    }
    try {
      const itemsIndex2 = await this.loadItemsIndex();
      const items = await this.loadItemsData();
      const queryLower = itemName.toLowerCase();
      if (itemsIndex2[queryLower]) {
        const itemId = itemsIndex2[queryLower][0];
        const itemData = items[itemId];
        if (itemData) {
          const result = { ...itemData, id: parseInt(itemId) };
          cache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
          });
          return result;
        }
      }
      for (const [name, ids] of Object.entries(itemsIndex2)) {
        if (name.includes(queryLower)) {
          const itemId = ids[0];
          const itemData = items[itemId];
          if (itemData) {
            const result = { ...itemData, id: parseInt(itemId) };
            cache.set(cacheKey, {
              data: result,
              timestamp: Date.now()
            });
            return result;
          }
        }
      }
      throw new Error(`Item not found: ${itemName}`);
    } catch (error) {
      console.error(`Error searching for item ${itemName}:`, error);
      throw new Error(`Failed to find item: ${itemName}`);
    }
  }
  /**
   * Get skill icon as base64 (still local as these don't change)
   * @param {string} skillName - Name of the skill
   * @returns {Promise<string>} Base64 encoded image
   */
  static async getSkillIcon(skillName) {
    try {
      const iconPath = join(__dirname, "../../icons", `${skillName}.png`);
      const imageBuffer = await readFile(iconPath);
      return `data:image/png;base64,${imageBuffer.toString("base64")}`;
    } catch (error) {
      console.error(`Error reading skill icon for ${skillName}:`, error);
      throw new Error(`Failed to read skill icon: ${skillName}`);
    }
  }
  /**
   * Get collection log background (still local)
   * @returns {Promise<string>} Base64 encoded image
   */
  static async getCollectionLogBackground() {
    try {
      const iconPath = join(__dirname, "../../icons/collection-log.png");
      const imageBuffer = await readFile(iconPath);
      return `data:image/png;base64,${imageBuffer.toString("base64")}`;
    } catch (error) {
      console.error("Error reading collection log background:", error);
      throw new Error("Failed to read collection log background");
    }
  }
  /**
   * Read a local image file and return as buffer (fallback method)
   * @param {string} filePath - Path to the image file
   * @returns {Promise<Buffer>} Image buffer
   */
  static async getLocalImage(filePath) {
    try {
      return await readFile(filePath);
    } catch (error) {
      console.error(`Error reading image file: ${filePath}`, error);
      throw new Error(`Failed to read image: ${filePath}`);
    }
  }
  /**
   * Clear the cache (useful for testing or memory management)
   */
  static clearCache() {
    cache.clear();
  }
  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  static getCacheStats() {
    return {
      size: cache.size,
      entries: Array.from(cache.keys())
    };
  }
}
FileService.getItemData;
FileService.getItemIconUrl;
FileService.searchItemByName;
FileService.getSkillIcon;
FileService.getCollectionLogBackground;
FileService.getLocalImage;

const __filename$1 = fileURLToPath(globalThis._importMeta_.url);
dirname(__filename$1);
async function generateProgressSVG(data) {
  var _a, _b, _c, _d;
  const titleHeight = CANVAS_CONFIG.TITLE_HEIGHT;
  let lootHeight = 0;
  if (((_a = data == null ? void 0 : data.loot) == null ? void 0 : _a.length) > 0) {
    const numLootRows = Math.floor(data.loot.length / 7) + (data.loot.length % 7 === 0 ? 0 : 1);
    lootHeight = 45 + 35 * numLootRows;
  }
  let xpHeight = 0;
  if (((_b = data == null ? void 0 : data.xp_earned) == null ? void 0 : _b.length) > 0) {
    const numSkillRows = Math.floor(data.xp_earned.length / 6) + 1;
    xpHeight = 40 + numSkillRows * 50;
  }
  const canvasHeight = titleHeight + lootHeight + xpHeight;
  const canvasWidth = CANVAS_CONFIG.WIDTH;
  let svg = `<svg width="${canvasWidth}" height="${canvasHeight}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<defs>
    <filter id="rs-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="2" stdDeviation="0" flood-color="black" flood-opacity="1"/>
    </filter>
    <style>
      .runescape-font {
        font-family: 'RuneScape UF', 'Runescape', monospace;
        font-weight: normal;
        font-style: normal;
      }
      .yellow-text { fill: #ffff00; }
      .orange-text { fill: #ff981f; }
      .white-text { fill: #ffffff; }
      .title-text { font-size: 30px; }
      .subtitle-text { font-size: 16px; }
      .section-text { font-size: 20px; }
      .small-text { font-size: 14px; }
      .item-count { font-size: 14px; text-anchor: end; }
      .xp-text { font-size: 16px; text-anchor: middle; }
    </style>
  </defs>`;
  svg += `<text x="15" y="40" class="runescape-font yellow-text title-text" filter="url(#rs-shadow)">${escapeXML(data.script_name)}</text>`;
  const runtime = formatRuntime(data.runtime);
  const curDate = getCurrentDate();
  svg += `<text x="15" y="60" class="runescape-font yellow-text subtitle-text" filter="url(#rs-shadow)">${curDate} - ${runtime}</text>`;
  svg += `<line x1="0" y1="${titleHeight}" x2="${canvasWidth}" y2="${titleHeight}" stroke="black" stroke-width="0.5"/>`;
  if (lootHeight && xpHeight) {
    svg += `<line x1="0" y1="${titleHeight + lootHeight}" x2="${canvasWidth}" y2="${titleHeight + lootHeight}" stroke="black" stroke-width="0.5"/>`;
  }
  let currentY = titleHeight;
  if ((_c = data == null ? void 0 : data.loot) == null ? void 0 : _c.length) {
    svg += `<text x="15" y="${currentY + 25}" class="runescape-font yellow-text section-text" filter="url(#rs-shadow)">Loot:</text>`;
    svg += await generateLootIcons(data.loot, currentY + 35);
    currentY += lootHeight;
  }
  if ((_d = data == null ? void 0 : data.xp_earned) == null ? void 0 : _d.length) {
    svg += `<text x="15" y="${currentY + 25}" class="runescape-font yellow-text section-text" filter="url(#rs-shadow)">XP:</text>`;
    svg += await generateXPIcons(data.xp_earned, currentY);
  }
  svg += "</svg>";
  return svg;
}
async function generateCollectionLogSVG(data) {
  const { WIDTH, HEIGHT, ICON_SIZE, ICON_POSITION } = COLLECTION_LOG_CONFIG;
  const bgImageBase64 = await FileService.getCollectionLogBackground();
  const itemData = await FileService.searchItemByName(data.itemName);
  const itemIconUrl = await FileService.getItemIconUrl(itemData.id);
  let svg = `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<defs>
    <filter id="rs-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="2" stdDeviation="0" flood-color="black" flood-opacity="1"/>
    </filter>
    <style>
      .runescape-font {
        font-family: 'RuneScape UF', 'Runescape', monospace;
        font-weight: normal;
        font-style: normal;
      }
      .orange-text { fill: #ff981f; }
      .white-text { fill: #ffffff; }
      .title-text { font-size: 25px; text-anchor: middle; }
      .date-text { font-size: 16px; text-anchor: middle; }
      .item-text { font-size: 22px; text-anchor: middle; }
    </style>
  </defs>`;
  svg += `<image href="${bgImageBase64}" width="${WIDTH}" height="${HEIGHT}"/>`;
  svg += `<text x="${WIDTH / 2}" y="45" class="runescape-font orange-text title-text" filter="url(#rs-shadow)">${escapeXML(data.userName)}'s Collection Log</text>`;
  const curDate = getCurrentDate();
  svg += `<text x="${WIDTH / 2}" y="100" class="runescape-font orange-text date-text" filter="url(#rs-shadow)">${curDate} - New item:</text>`;
  svg += `<text x="${WIDTH / 2}" y="125" class="runescape-font white-text item-text" filter="url(#rs-shadow)">${escapeXML(data.itemName)}</text>`;
  svg += `<image href="${itemIconUrl}" x="${ICON_POSITION.x}" y="${ICON_POSITION.y}" width="${ICON_SIZE}" height="${ICON_SIZE}"/>`;
  svg += "</svg>";
  return svg;
}
async function generateLootIcons(lootItems, startY) {
  let svg = "";
  const processedLoot = processCoinStacks(lootItems);
  for (let i = 0; i < processedLoot.length; i++) {
    const item = processedLoot[i];
    const xOffset = 15 + 40 * (i % 7);
    const row = Math.floor(i / 7);
    const yOffset = startY + row * 35;
    try {
      const iconUrl = await FileService.getItemIconUrl(item.id);
      svg += `<image href="${iconUrl}" x="${xOffset}" y="${yOffset}" width="32" height="32"/>`;
      const formattedCount = formatCount(item.count);
      svg += `<text x="${xOffset + 30}" y="${yOffset + 30}" class="runescape-font yellow-text item-count" filter="url(#rs-shadow)">${formattedCount}</text>`;
    } catch (error) {
      console.warn(`Could not load icon for item ${item.id}:`, error.message);
    }
  }
  return svg;
}
async function generateXPIcons(xpData, startY) {
  let svg = "";
  for (let i = 0; i < xpData.length; i++) {
    const xpItem = xpData[i];
    const yOffset = startY + 40 + 50 * Math.floor(i / 5);
    const xOffset = 15 + 60 * (i % 5);
    try {
      const iconBase64 = await FileService.getSkillIcon(xpItem.skill);
      svg += `<image href="${iconBase64}" x="${xOffset}" y="${yOffset}" width="25" height="25"/>`;
      const formattedXP = formatXP(xpItem.xp);
      svg += `<text x="${xOffset + 12.5}" y="${yOffset + 40}" class="runescape-font yellow-text xp-text" filter="url(#rs-shadow)">${formattedXP}</text>`;
    } catch (error) {
      console.warn(`Could not load icon for skill ${xpItem.skill}:`, error.message);
    }
  }
  return svg;
}
function processCoinStacks(lootItems) {
  const coinIds = [617, 995, 996, 997, 998, 999, 1e3, 1001, 1002, 1003, 1004, 6964, 8890, 8891, 8892, 8893, 8894, 8895, 8896, 8897, 8898, 8899, 14440, 18028];
  return lootItems.map((item) => {
    if (coinIds.includes(item.id)) {
      if (item.count > 5e4) {
        return { ...item, id: 1004 };
      } else if (item.count > 1e4) {
        return { ...item, id: 1003 };
      } else if (item.count > 1e3) {
        return { ...item, id: 1001 };
      } else {
        return { ...item, id: 998 };
      }
    }
    return item;
  });
}
async function svgToPng(svgString) {
  return await sharp(Buffer.from(svgString)).png({
    quality: 100,
    compressionLevel: 0,
    adaptiveFiltering: false,
    force: true
  }).toBuffer();
}
function escapeXML(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

async function generateProgressImage(data) {
  try {
    const svgString = await generateProgressSVG(data);
    const pngBuffer = await svgToPng(svgString);
    return {
      statusCode: 200,
      body: JSON.stringify(`data:image/png;base64,${pngBuffer.toString("base64")}`)
    };
  } catch (error) {
    console.error("Error generating progress image:", error);
    throw error;
  }
}
async function generateCollectionLogImage(data) {
  try {
    const svgString = await generateCollectionLogSVG(data);
    const pngBuffer = await svgToPng(svgString);
    return {
      statusCode: 200,
      body: JSON.stringify(`data:image/png;base64,${pngBuffer.toString("base64")}`)
    };
  } catch (error) {
    console.error("Error generating collection log image:", error);
    throw error;
  }
}

const collectionLogSchema$1 = z.object({
  itemName: z.string().min(1, "Item name is required"),
  userName: z.string().min(1, "User name is required")
});
const collectionLog_post = defineEventHandler(async (event) => {
  let body = null;
  try {
    body = await readBody(event);
    const validatedData = collectionLogSchema$1.parse(body);
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
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: {
        error: "An unexpected error occurred while generating the collection log image",
        suggestion: "Please try again or contact support if the problem persists."
      }
    });
  }
});

const collectionLog_post$1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: collectionLog_post
});

const progressImageSchema$1 = z.object({
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
    const validatedData = progressImageSchema$1.parse(body);
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

const progressImage_post$1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: progressImage_post
});

const collectionLogSchema = z.object({
  itemName: z.string().min(1, "Item name is required"),
  userName: z.string().min(1, "User name is required")
});
const getCollectionLogItem_post = defineEventHandler(async (event) => {
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

const getCollectionLogItem_post$1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: getCollectionLogItem_post
});

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
const getImage_post = defineEventHandler(async (event) => {
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

const getImage_post$1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: getImage_post
});

const index_get$c = defineEventHandler(async (event) => {
  try {
    const htmlContent = await readFile(join(process.cwd(), "test", "test.html"), "utf-8");
    setHeader(event, "content-type", "text/html");
    return htmlContent;
  } catch (error) {
    throw createError({
      statusCode: 404,
      statusMessage: "Test page not found"
    });
  }
});

const index_get$d = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: index_get$c
});

const __filename = fileURLToPath(globalThis._importMeta_.url);
dirname(__filename);
const DATA_DIR = join(process.cwd(), "data/processed");
const dataCache = /* @__PURE__ */ new Map();
const CACHE_TTL = 5 * 60 * 1e3;
class OSRSDataService {
  /**
   * Load data from file with caching
   */
  static async loadData(type) {
    const cacheKey = `${type}_data`;
    if (dataCache.has(cacheKey)) {
      const cached = dataCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
      }
      dataCache.delete(cacheKey);
    }
    try {
      const filePath = join(DATA_DIR, `${type}.json`);
      console.log(`Loading data from: ${filePath}`);
      const rawData = await readFile(filePath, "utf8");
      const data = JSON.parse(rawData);
      dataCache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      return data;
    } catch (error) {
      console.error(`Error loading ${type} data from ${join(DATA_DIR, `${type}.json`)}:`, error);
      throw new Error(`Failed to load ${type} data`);
    }
  }
  /**
   * Load search indexes
   */
  static async loadIndexes() {
    const cacheKey = "search_indexes";
    if (dataCache.has(cacheKey)) {
      const cached = dataCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
      }
      dataCache.delete(cacheKey);
    }
    try {
      const filePath = join(DATA_DIR, "indexes.json");
      const rawData = await readFile(filePath, "utf8");
      const indexes = JSON.parse(rawData);
      dataCache.set(cacheKey, {
        data: indexes,
        timestamp: Date.now()
      });
      return indexes;
    } catch (error) {
      console.error("Error loading search indexes:", error);
      return { items: {}, monsters: {}, prayers: {} };
    }
  }
  /**
   * Get all items with pagination
   */
  static async getAllItems(page = 1, limit = 25) {
    const items = await this.loadData("items");
    const itemsArray = Object.entries(items).map(([id, item]) => ({
      ...item,
      _id: id
    }));
    const total = itemsArray.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedItems = itemsArray.slice(startIndex, endIndex);
    return {
      _items: paginatedItems,
      _meta: {
        page,
        max_results: limit,
        total
      },
      _links: {
        self: { href: `items?page=${page}` },
        parent: { href: "/" },
        ...page > 1 && {
          prev: { href: `items?page=${page - 1}` }
        },
        ...page < totalPages && {
          next: { href: `items?page=${page + 1}` }
        },
        last: { href: `items?page=${totalPages}` }
      }
    };
  }
  /**
   * Get item by ID
   */
  static async getItemById(id) {
    const items = await this.loadData("items");
    const item = items[id.toString()];
    if (!item) {
      throw new Error(`Item with ID ${id} not found`);
    }
    return { ...item, _id: id.toString() };
  }
  /**
   * Search items by criteria
   */
  static async searchItems(where = {}, page = 1, limit = 25) {
    const items = await this.loadData("items");
    const itemsArray = Object.entries(items).map(([id, item]) => ({
      ...item,
      _id: id
    }));
    let filteredItems = itemsArray.filter((item) => {
      return Object.entries(where).every(([key, value]) => {
        if (typeof value === "string") {
          return item[key] && item[key].toString().toLowerCase().includes(value.toLowerCase());
        }
        return item[key] === value;
      });
    });
    const total = filteredItems.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedItems = filteredItems.slice(startIndex, endIndex);
    return {
      _items: paginatedItems,
      _meta: {
        page,
        max_results: limit,
        total
      },
      _links: {
        self: { href: `items?page=${page}` },
        parent: { href: "/" },
        ...page > 1 && {
          prev: { href: `items?page=${page - 1}` }
        },
        ...page < totalPages && {
          next: { href: `items?page=${page + 1}` }
        },
        last: { href: `items?page=${totalPages}` }
      }
    };
  }
  /**
   * Get all equipment with pagination
   */
  static async getAllEquipment(page = 1, limit = 25) {
    const equipment = await this.loadData("equipment");
    const equipmentArray = Object.entries(equipment).map(([id, item]) => ({
      ...item,
      _id: id
    }));
    const total = equipmentArray.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedEquipment = equipmentArray.slice(startIndex, endIndex);
    return {
      _items: paginatedEquipment,
      _meta: {
        page,
        max_results: limit,
        total
      },
      _links: {
        self: { href: `equipment?page=${page}` },
        parent: { href: "/" },
        ...page > 1 && {
          prev: { href: `equipment?page=${page - 1}` }
        },
        ...page < totalPages && {
          next: { href: `equipment?page=${page + 1}` }
        },
        last: { href: `equipment?page=${totalPages}` }
      }
    };
  }
  /**
   * Get equipment by ID
   */
  static async getEquipmentById(id) {
    const equipment = await this.loadData("equipment");
    const item = equipment[id.toString()];
    if (!item) {
      throw new Error(`Equipment with ID ${id} not found`);
    }
    return { ...item, _id: id.toString() };
  }
  /**
   * Get all weapons with pagination
   */
  static async getAllWeapons(page = 1, limit = 25) {
    const weapons = await this.loadData("weapons");
    const weaponsArray = Object.entries(weapons).map(([id, item]) => ({
      ...item,
      _id: id
    }));
    const total = weaponsArray.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedWeapons = weaponsArray.slice(startIndex, endIndex);
    return {
      _items: paginatedWeapons,
      _meta: {
        page,
        max_results: limit,
        total
      },
      _links: {
        self: { href: `weapons?page=${page}` },
        parent: { href: "/" },
        ...page > 1 && {
          prev: { href: `weapons?page=${page - 1}` }
        },
        ...page < totalPages && {
          next: { href: `weapons?page=${page + 1}` }
        },
        last: { href: `weapons?page=${totalPages}` }
      }
    };
  }
  /**
   * Get weapon by ID
   */
  static async getWeaponById(id) {
    const weapons = await this.loadData("weapons");
    const weapon = weapons[id.toString()];
    if (!weapon) {
      throw new Error(`Weapon with ID ${id} not found`);
    }
    return { ...weapon, _id: id.toString() };
  }
  /**
   * Get all monsters with pagination
   */
  static async getAllMonsters(page = 1, limit = 25) {
    const monsters = await this.loadData("monsters");
    const monstersArray = Object.entries(monsters).map(([id, monster]) => ({
      ...monster,
      _id: id
    }));
    const total = monstersArray.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedMonsters = monstersArray.slice(startIndex, endIndex);
    return {
      _items: paginatedMonsters,
      _meta: {
        page,
        max_results: limit,
        total
      },
      _links: {
        self: { href: `monsters?page=${page}` },
        parent: { href: "/" },
        ...page > 1 && {
          prev: { href: `monsters?page=${page - 1}` }
        },
        ...page < totalPages && {
          next: { href: `monsters?page=${page + 1}` }
        },
        last: { href: `monsters?page=${totalPages}` }
      }
    };
  }
  /**
   * Get monster by ID
   */
  static async getMonsterById(id) {
    const monsters = await this.loadData("monsters");
    const monster = monsters[id.toString()];
    if (!monster) {
      throw new Error(`Monster with ID ${id} not found`);
    }
    return { ...monster, _id: id.toString() };
  }
  /**
   * Get all prayers with pagination
   */
  static async getAllPrayers(page = 1, limit = 25) {
    const prayers = await this.loadData("prayers");
    const prayersArray = Object.entries(prayers).map(([id, prayer]) => ({
      ...prayer,
      _id: id
    }));
    const total = prayersArray.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedPrayers = prayersArray.slice(startIndex, endIndex);
    return {
      _items: paginatedPrayers,
      _meta: {
        page,
        max_results: limit,
        total
      },
      _links: {
        self: { href: `prayers?page=${page}` },
        parent: { href: "/" },
        ...page > 1 && {
          prev: { href: `prayers?page=${page - 1}` }
        },
        ...page < totalPages && {
          next: { href: `prayers?page=${page + 1}` }
        },
        last: { href: `prayers?page=${totalPages}` }
      }
    };
  }
  /**
   * Get prayer by ID
   */
  static async getPrayerById(id) {
    const prayers = await this.loadData("prayers");
    const prayer = prayers[id.toString()];
    if (!prayer) {
      throw new Error(`Prayer with ID ${id} not found`);
    }
    return { ...prayer, _id: id.toString() };
  }
  /**
   * Search by name across all data types
   */
  static async searchByName(query, type = "items") {
    const indexes = await this.loadIndexes();
    const queryLower = query.toLowerCase();
    const typeIndex = indexes[type] || {};
    const matches = [];
    if (typeIndex[queryLower]) {
      return typeIndex[queryLower];
    }
    for (const [name, ids] of Object.entries(typeIndex)) {
      if (name.includes(queryLower)) {
        matches.push(...ids);
      }
    }
    return matches;
  }
  /**
   * Get data summary/statistics
   */
  static async getDataSummary() {
    try {
      const summaryPath = join(DATA_DIR, "summary.json");
      const rawData = await readFile(summaryPath, "utf8");
      return JSON.parse(rawData);
    } catch (error) {
      const items = await this.loadData("items");
      const monsters = await this.loadData("monsters");
      const prayers = await this.loadData("prayers");
      return {
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
        stats: {
          itemsProcessed: Object.keys(items).length,
          monstersProcessed: Object.keys(monsters).length,
          prayersProcessed: Object.keys(prayers).length
        }
      };
    }
  }
  /**
   * Clear all caches
   */
  static clearCache() {
    dataCache.clear();
  }
}

const _id__get$8 = defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, "id");
    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: "Bad Request",
        data: { error: "Equipment ID is required" }
      });
    }
    const equipment = await OSRSDataService.getEquipmentById(id);
    return equipment;
  } catch (error) {
    if (error.message.includes("not found")) {
      throw createError({
        statusCode: 404,
        statusMessage: "Not Found",
        data: { error: error.message }
      });
    }
    console.error("Error fetching equipment:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: { error: error.message }
    });
  }
});

const _id__get$9 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: _id__get$8
});

const index_get$a = defineEventHandler(async (event) => {
  try {
    const query = getQuery$1(event);
    const page = parseInt(query.page) || 1;
    const maxResults = parseInt(query.max_results) || 25;
    const result = await OSRSDataService.getAllEquipment(page, maxResults);
    return result;
  } catch (error) {
    console.error("Error fetching equipment:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: { error: error.message }
    });
  }
});

const index_get$b = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: index_get$a
});

const index_get$8 = defineEventHandler(async (event) => {
  try {
    const summary = await OSRSDataService.getDataSummary();
    return {
      message: "OSRS Database API",
      version: "1.0.0",
      description: "Complete Old School RuneScape database API with items, equipment, weapons, monsters, and prayers",
      documentation: {
        base_url: "/osrs",
        endpoints: {
          items: {
            list: "GET /osrs/items - List all items (paginated)",
            get: "GET /osrs/items/{id} - Get item by ID",
            search: 'GET /osrs/items?where={"name":"iron"} - Search items'
          },
          equipment: {
            list: "GET /osrs/equipment - List all equipment (paginated)",
            get: "GET /osrs/equipment/{id} - Get equipment by ID"
          },
          weapons: {
            list: "GET /osrs/weapons - List all weapons (paginated)",
            get: "GET /osrs/weapons/{id} - Get weapon by ID"
          },
          monsters: {
            list: "GET /osrs/monsters - List all monsters (paginated)",
            get: "GET /osrs/monsters/{id} - Get monster by ID"
          },
          prayers: {
            list: "GET /osrs/prayers - List all prayers (paginated)",
            get: "GET /osrs/prayers/{id} - Get prayer by ID"
          },
          search: {
            search: "GET /osrs/search/{type}?q=search_term - Search by name across data types"
          }
        },
        parameters: {
          pagination: {
            page: "Page number (default: 1)",
            max_results: "Results per page (default: 25, max: 100)"
          },
          filtering: {
            where: 'JSON object for filtering (e.g., {"equipable": true})'
          }
        }
      },
      statistics: summary.stats,
      last_updated: summary.lastUpdated,
      _links: {
        items: { href: "/osrs/items" },
        equipment: { href: "/osrs/equipment" },
        weapons: { href: "/osrs/weapons" },
        monsters: { href: "/osrs/monsters" },
        prayers: { href: "/osrs/prayers" }
      }
    };
  } catch (error) {
    console.error("Error fetching API info:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: { error: error.message }
    });
  }
});

const index_get$9 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: index_get$8
});

const _id__get$6 = defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, "id");
    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: "Bad Request",
        data: { error: "Item ID is required" }
      });
    }
    const item = await OSRSDataService.getItemById(id);
    return item;
  } catch (error) {
    if (error.message.includes("not found")) {
      throw createError({
        statusCode: 404,
        statusMessage: "Not Found",
        data: { error: error.message }
      });
    }
    console.error("Error fetching item:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: { error: error.message }
    });
  }
});

const _id__get$7 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: _id__get$6
});

const index_get$6 = defineEventHandler(async (event) => {
  try {
    const query = getQuery$1(event);
    const page = parseInt(query.page) || 1;
    const maxResults = parseInt(query.max_results) || 25;
    const where = query.where ? JSON.parse(query.where) : {};
    let result;
    if (Object.keys(where).length > 0) {
      result = await OSRSDataService.searchItems(where, page, maxResults);
    } else {
      result = await OSRSDataService.getAllItems(page, maxResults);
    }
    return result;
  } catch (error) {
    console.error("Error fetching items:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: { error: error.message }
    });
  }
});

const index_get$7 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: index_get$6
});

const _id__get$4 = defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, "id");
    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: "Bad Request",
        data: { error: "Monster ID is required" }
      });
    }
    const monster = await OSRSDataService.getMonsterById(id);
    return monster;
  } catch (error) {
    if (error.message.includes("not found")) {
      throw createError({
        statusCode: 404,
        statusMessage: "Not Found",
        data: { error: error.message }
      });
    }
    console.error("Error fetching monster:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: { error: error.message }
    });
  }
});

const _id__get$5 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: _id__get$4
});

const index_get$4 = defineEventHandler(async (event) => {
  try {
    const query = getQuery$1(event);
    const page = parseInt(query.page) || 1;
    const maxResults = parseInt(query.max_results) || 25;
    const result = await OSRSDataService.getAllMonsters(page, maxResults);
    return result;
  } catch (error) {
    console.error("Error fetching monsters:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: { error: error.message }
    });
  }
});

const index_get$5 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: index_get$4
});

const _id__get$2 = defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, "id");
    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: "Bad Request",
        data: { error: "Prayer ID is required" }
      });
    }
    const prayer = await OSRSDataService.getPrayerById(id);
    return prayer;
  } catch (error) {
    if (error.message.includes("not found")) {
      throw createError({
        statusCode: 404,
        statusMessage: "Not Found",
        data: { error: error.message }
      });
    }
    console.error("Error fetching prayer:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: { error: error.message }
    });
  }
});

const _id__get$3 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: _id__get$2
});

const index_get$2 = defineEventHandler(async (event) => {
  try {
    const query = getQuery$1(event);
    const page = parseInt(query.page) || 1;
    const maxResults = parseInt(query.max_results) || 25;
    const result = await OSRSDataService.getAllPrayers(page, maxResults);
    return result;
  } catch (error) {
    console.error("Error fetching prayers:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: { error: error.message }
    });
  }
});

const index_get$3 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: index_get$2
});

const _type__get = defineEventHandler(async (event) => {
  try {
    const type = getRouterParam(event, "type");
    const query = getQuery$1(event);
    const searchQuery = query.q;
    if (!searchQuery) {
      throw createError({
        statusCode: 400,
        statusMessage: "Bad Request",
        data: { error: "Search query (q) is required" }
      });
    }
    if (!["items", "monsters", "prayers"].includes(type)) {
      throw createError({
        statusCode: 400,
        statusMessage: "Bad Request",
        data: { error: "Invalid search type. Must be items, monsters, or prayers" }
      });
    }
    const results = await OSRSDataService.searchByName(searchQuery, type);
    return {
      query: searchQuery,
      type,
      results
    };
  } catch (error) {
    console.error("Error searching:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: { error: error.message }
    });
  }
});

const _type__get$1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: _type__get
});

const _id__get = defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, "id");
    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: "Bad Request",
        data: { error: "Weapon ID is required" }
      });
    }
    const weapon = await OSRSDataService.getWeaponById(id);
    return weapon;
  } catch (error) {
    if (error.message.includes("not found")) {
      throw createError({
        statusCode: 404,
        statusMessage: "Not Found",
        data: { error: error.message }
      });
    }
    console.error("Error fetching weapon:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: { error: error.message }
    });
  }
});

const _id__get$1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: _id__get
});

const index_get = defineEventHandler(async (event) => {
  try {
    const query = getQuery$1(event);
    const page = parseInt(query.page) || 1;
    const maxResults = parseInt(query.max_results) || 25;
    const result = await OSRSDataService.getAllWeapons(page, maxResults);
    return result;
  } catch (error) {
    console.error("Error fetching weapons:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: { error: error.message }
    });
  }
});

const index_get$1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: index_get
});
//# sourceMappingURL=index.mjs.map
