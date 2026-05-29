export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  CORS_ORIGIN: string;
  ENVIRONMENT: string;
}

export const onRequest: PagesFunction<Env> = async (ctx) => {
  // Global middleware: log requests in development
  if (ctx.env.ENVIRONMENT === 'development') {
    console.log(`[${new Date().toISOString()}] ${ctx.request.method} ${new URL(ctx.request.url).pathname}`)
  }
  return ctx.next()
}
