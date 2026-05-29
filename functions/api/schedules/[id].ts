import type { Env } from '../../_middleware'
import { requireAuth, requireRole, AuthError, authErrorResponse } from '../../lib/auth'
import { getScheduleById, updateScheduleStatus, logAudit } from '../../lib/db'
import { jsonResponse, errorResponse, optionsResponse } from '../../lib/response'

const VALID_TRANSITIONS: Record<string, string[]> = {
  Pending: ['Confirmed', 'Cancelled'],
  Confirmed: ['Completed', 'Cancelled'],
  Completed: [],
  Cancelled: [],
}

// GET /api/schedules/:id
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const origin = ctx.env.CORS_ORIGIN || '*'
  try {
    const payload = await requireAuth(ctx.request, ctx.env)
    const id = parseInt(ctx.params.id as string)
    if (isNaN(id)) return errorResponse('Invalid schedule ID', 400, origin)
    const schedule = await getScheduleById(ctx.env.DB, id)
    if (!schedule) return errorResponse('Schedule not found', 404, origin)
    return jsonResponse({ schedule }, 200, origin)
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err, origin)
    return errorResponse('Internal server error', 500, origin)
  }
}

// PATCH /api/schedules/:id — confirm, complete, or cancel
export const onRequestPatch: PagesFunction<Env> = async (ctx) => {
  const origin = ctx.env.CORS_ORIGIN || '*'
  try {
    const payload = await requireAuth(ctx.request, ctx.env)
    const id = parseInt(ctx.params.id as string)
    if (isNaN(id)) return errorResponse('Invalid schedule ID', 400, origin)

    const schedule = await getScheduleById(ctx.env.DB, id)
    if (!schedule) return errorResponse('Schedule not found', 404, origin)

    const body = await ctx.request.json() as { status?: string }
    const { status } = body
    if (!status) return errorResponse('status is required', 400, origin)

    const allowed = VALID_TRANSITIONS[schedule.status] ?? []
    if (!allowed.includes(status)) {
      return errorResponse(`Cannot transition from ${schedule.status} to ${status}`, 400, origin)
    }
    // Only IT staff/admin can confirm or complete
    if (['Confirmed', 'Completed'].includes(status) && payload.role === 'employee') {
      return errorResponse('Only IT staff can confirm or complete a schedule', 403, origin)
    }

    await updateScheduleStatus(ctx.env.DB, id, status)
    const ip = ctx.request.headers.get('CF-Connecting-IP')
    await logAudit(ctx.env.DB, payload.sub, 'UPDATE_SCHEDULE', 'schedules', id, schedule.status, status, ip)

    const updated = await getScheduleById(ctx.env.DB, id)
    return jsonResponse({ schedule: updated }, 200, origin)
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err, origin)
    return errorResponse('Internal server error', 500, origin)
  }
}

export const onRequestOptions: PagesFunction<Env> = async (ctx) =>
  optionsResponse(ctx.env.CORS_ORIGIN || '*')
