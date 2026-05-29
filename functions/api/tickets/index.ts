import type { Env } from '../../_middleware'

// Placeholder for Phase 3 - Full CRUD implementation
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  return new Response(JSON.stringify({
    success: true,
    data: [],
    message: 'Ticket API - Phase 3 implementation pending'
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': ctx.env.CORS_ORIGIN || '*',
    }
  })
}
