export interface Env {
  DB: D1Database
  JWT_SECRET: string
  CORS_ORIGIN: string
  ENVIRONMENT: string
}

export const onRequest: PagesFunction<Env> = async (ctx) => {
  // Handle preflight globally
  if (ctx.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': ctx.env.CORS_ORIGIN || '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  if (ctx.env.ENVIRONMENT === 'development') {
    console.log(`[${new Date().toISOString()}] ${ctx.request.method} ${new URL(ctx.request.url).pathname}`)
  }

  return ctx.next()
}
