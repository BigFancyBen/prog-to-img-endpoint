import { defineNitroConfig } from 'nitropack/config'

export default defineNitroConfig({
  srcDir: ".",
  publicAssets: [
    {
      baseURL: '/test',
      dir: './test'
    },
    {
      baseURL: '/icons',
      dir: './icons'
    },
    {
      baseURL: '/font',
      dir: './font'
    },
    {
      baseURL: '/data',
      dir: './data'
    },
    {
      baseURL: '/',
      dir: './public'
    }
  ],
  experimental: {
    wasm: false
  }
}); 