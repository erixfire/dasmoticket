import type { Env } from '../../../../_middleware'
import { requireAuth, AuthError, authErrorResponse } from '../../../../lib/auth'
import { getScheduleByTicketId } from '../../../../lib/db'
import { jsonResponse, errorResponse, optionsResponse } from '../../../../lib/response'

// GET /api/tickets/:id/schedule
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const origin = ctx.env.CORS_ORIGIN || '*'
  try {
    await requireAuth(ctx.request, ctx.env)
    const id = parseInt(ctx.params.id as string)
    if (isNaN(id)) return errorResponse('Invalid ticket ID', 400, origin)
    const schedule = await getScheduleByTicketId(ctx.env.DB, id)
    return jsonResponse({ schedule: schedule ?? null }, 200, origin)
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err, origin)
    return errorResponse('Internal server error', 500, origin)
  }
}

export const onRequestOptions: PagesFunction<Env> = async (ctx) =>
  optionsResponse(ctx.env.CORS_ORIGIN || '*')
