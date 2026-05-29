export interface Env {
  DB: D1Database
  JWT_SECRET: string
  CORS_ORIGIN: string
  ENVIRONMENT: string
  SETUP_KEY: string
}

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none';",
}

export const onRequest: PagesFunction<Env> = async (ctx) => {
  const origin = ctx.env.CORS_ORIGIN || ''

  // Validate critical env vars
  if (!ctx.env.JWT_SECRET || ctx.env.JWT_SECRET.length < 32) {
    console.error('FATAL: JWT_SECRET is missing or too short')
    return new Response(JSON.stringify({ error: 'Server misconfiguration' }), { status: 500 })
  }

  const corsHeaders = {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  }

  if (ctx.request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { ...corsHeaders, ...SECURITY_HEADERS } })
  }

  if (ctx.env.ENVIRONMENT === 'development') {
    console.log(`[${new Date().toISOString()}] ${ctx.request.method} ${new URL(ctx.request.url).pathname}`)
  }

  const response = await ctx.next()

  // Inject security + CORS headers into every response
  const newHeaders = new Headers(response.headers)
  Object.entries({ ...corsHeaders, ...SECURITY_HEADERS }).forEach(([k, v]) => newHeaders.set(k, v))
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  })
}
