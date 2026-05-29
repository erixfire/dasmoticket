import type { Env } from '../../_middleware'
import { requireAuth, AuthError, authErrorResponse } from '../../lib/auth'
import { listSchedules, createSchedule, getScheduleByTicketId, getTicketById, logAudit } from '../../lib/db'
import { jsonResponse, errorResponse, optionsResponse } from '../../lib/response'

const REPAIR_TYPES = ['Onsite', 'Offsite']

// GET /api/schedules
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const origin = ctx.env.CORS_ORIGIN || '*'
  try {
    const payload = await requireAuth(ctx.request, ctx.env)
    const p = new URL(ctx.request.url).searchParams
    const { schedules, total } = await listSchedules(ctx.env.DB, {
      role: payload.role,
      userId: payload.sub,
      status: p.get('status') || undefined,
      repair_type: p.get('repair_type') || undefined,
      date_from: p.get('date_from') || undefined,
      date_to: p.get('date_to') || undefined,
      page: parseInt(p.get('page') || '1'),
      limit: Math.min(parseInt(p.get('limit') || '20'), 100),
    })
    return jsonResponse({ schedules, total }, 200, origin)
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err, origin)
    return errorResponse('Internal server error', 500, origin)
  }
}

// POST /api/schedules — create a repair schedule for a ticket
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const origin = ctx.env.CORS_ORIGIN || '*'
  try {
    const payload = await requireAuth(ctx.request, ctx.env)
    const body = await ctx.request.json() as {
      ticket_id?: number
      repair_type?: string
      scheduled_date?: string
      location_notes?: string
    }
    const { ticket_id, repair_type, scheduled_date, location_notes } = body

    if (!ticket_id || !repair_type || !scheduled_date) {
      return errorResponse('ticket_id, repair_type, and scheduled_date are required', 400, origin)
    }
    if (!REPAIR_TYPES.includes(repair_type)) {
      return errorResponse('repair_type must be Onsite or Offsite', 400, origin)
    }
    // Validate ISO date
    if (isNaN(Date.parse(scheduled_date))) {
      return errorResponse('scheduled_date must be a valid ISO datetime', 400, origin)
    }
    // Cannot schedule in the past
    if (new Date(scheduled_date) < new Date()) {
      return errorResponse('scheduled_date cannot be in the past', 400, origin)
    }

    const ticket = await getTicketById(ctx.env.DB, ticket_id)
    if (!ticket) return errorResponse('Ticket not found', 404, origin)
    if (payload.role === 'employee' && ticket.requester_id !== payload.sub) {
      return errorResponse('Forbidden', 403, origin)
    }
    // Only one active schedule per ticket
    const existing = await getScheduleByTicketId(ctx.env.DB, ticket_id)
    if (existing && existing.status === 'Pending') {
      return errorResponse('A pending schedule already exists for this ticket. Confirm or cancel it first.', 409, origin)
    }

    const result = await createSchedule(ctx.env.DB, {
      ticketId: ticket_id,
      repairType: repair_type,
      scheduledDate: scheduled_date,
      locationNotes: location_notes?.trim() || null,
      proposedBy: payload.sub,
    })

    const ip = ctx.request.headers.get('CF-Connecting-IP')
    await logAudit(ctx.env.DB, payload.sub, 'CREATE_SCHEDULE', 'schedules', Number(result.meta.last_row_id), null, JSON.stringify({ ticket_id, repair_type, scheduled_date }), ip)

    return jsonResponse({ id: result.meta.last_row_id, message: 'Schedule created successfully' }, 201, origin)
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err, origin)
    return errorResponse('Internal server error', 500, origin)
  }
}

export const onRequestOptions: PagesFunction<Env> = async (ctx) =>
  optionsResponse(ctx.env.CORS_ORIGIN || '*')
