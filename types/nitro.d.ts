// Global Nitro type definitions
declare global {
  function defineEventHandler<T = any>(handler: (event: any) => T | Promise<T>): any
  function getQuery(event: any): Record<string, any>
  function getRouterParam(event: any, name: string): string | undefined
  function createError(error: {
    statusCode: number
    statusMessage?: string
    data?: any
  }): never
  function readBody<T = any>(event: any): Promise<T>
  function setHeader(event: any, name: string, value: string): void
  function getHeader(event: any, name: string): string | undefined
}

export {} 