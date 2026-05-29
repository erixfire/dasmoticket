import type { Env } from '../../_middleware'
import { requireAuth, AuthError, authErrorResponse } from '../../lib/auth'
import { listItStaff } from '../../lib/db'
import { jsonResponse, errorResponse, optionsResponse } from '../../lib/response'

// GET /api/users/staff - returns IT staff list for assign dropdown
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const origin = ctx.env.CORS_ORIGIN || '*'
  try {
    await requireAuth(ctx.request, ctx.env)
    const staff = await listItStaff(ctx.env.DB)
    return jsonResponse({ staff }, 200, origin)
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err, origin)
    return errorResponse('Internal server error', 500, origin)
  }
}

export const onRequestOptions: PagesFunction<Env> = async (ctx) =>
  optionsResponse(ctx.env.CORS_ORIGIN || '*')
