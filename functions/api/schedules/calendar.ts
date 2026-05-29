import type { Env } from '../../_middleware'
import { requireAuth, AuthError, authErrorResponse } from '../../lib/auth'
import { getSchedulesForCalendar } from '../../lib/db'
import { jsonResponse, errorResponse, optionsResponse } from '../../lib/response'

// GET /api/schedules/calendar?month=2026-05
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const origin = ctx.env.CORS_ORIGIN || '*'
  try {
    const payload = await requireAuth(ctx.request, ctx.env)
    const month = new URL(ctx.request.url).searchParams.get('month')
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return errorResponse('month param required in YYYY-MM format', 400, origin)
    }
    const days = await getSchedulesForCalendar(ctx.env.DB, month, payload.role, payload.sub)
    return jsonResponse({ month, days }, 200, origin)
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err, origin)
    return errorResponse('Internal server error', 500, origin)
  }
}

export const onRequestOptions: PagesFunction<Env> = async (ctx) =>
  optionsResponse(ctx.env.CORS_ORIGIN || '*')
