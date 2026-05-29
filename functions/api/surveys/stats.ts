import type { Env } from '../../_middleware'
import { requireRole, AuthError, authErrorResponse } from '../../lib/auth'
import { getSurveyStats } from '../../lib/db'
import { jsonResponse, errorResponse, optionsResponse } from '../../lib/response'

// GET /api/surveys/stats — admin only
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const origin = ctx.env.CORS_ORIGIN || '*'
  try {
    await requireRole(ctx.request, ctx.env, 'admin', 'it_staff')
    const stats = await getSurveyStats(ctx.env.DB)
    return jsonResponse({ stats }, 200, origin)
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err, origin)
    return errorResponse('Internal server error', 500, origin)
  }
}

export const onRequestOptions: PagesFunction<Env> = async (ctx) =>
  optionsResponse(ctx.env.CORS_ORIGIN || '*')
