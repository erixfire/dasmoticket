import type { Env } from '../../_middleware'
import { requireAuth, AuthError, authErrorResponse } from '../../lib/auth'
import { getTicketById, updateTicket, getTicketNotes, addTicketNote, logAudit } from '../../lib/db'
import { jsonResponse, errorResponse, optionsResponse } from '../../lib/response'

const VALID_STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed']
const VALID_CATEGORIES = ['Hardware', 'Software', 'Network', 'Account', 'Other']
const VALID_PRIORITIES = ['Low', 'Medium', 'High', 'Critical']

// GET /api/tickets/:id
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const origin = ctx.env.CORS_ORIGIN || '*'
  try {
    const payload = await requireAuth(ctx.request, ctx.env)
    const id = parseInt(ctx.params.id as string)
    if (isNaN(id)) return errorResponse('Invalid ticket ID', 400, origin)

    const ticket = await getTicketById(ctx.env.DB, id)
    if (!ticket) return errorResponse('Ticket not found', 404, origin)

    // Employees can only view their own tickets
    if (payload.role === 'employee' && ticket.requester_id !== payload.sub) {
      return errorResponse('Forbidden', 403, origin)
    }

    const notes = await getTicketNotes(ctx.env.DB, id)
    // Filter internal notes for employees
    const filteredNotes = payload.role === 'employee' ? notes.filter(n => !n.is_internal) : notes

    return jsonResponse({ ticket, notes: filteredNotes }, 200, origin)
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err, origin)
    return errorResponse('Internal server error', 500, origin)
  }
}

// PATCH /api/tickets/:id
export const onRequestPatch: PagesFunction<Env> = async (ctx) => {
  const origin = ctx.env.CORS_ORIGIN || '*'
  try {
    const payload = await requireAuth(ctx.request, ctx.env)
    const id = parseInt(ctx.params.id as string)
    if (isNaN(id)) return errorResponse('Invalid ticket ID', 400, origin)

    const ticket = await getTicketById(ctx.env.DB, id)
    if (!ticket) return errorResponse('Ticket not found', 404, origin)

    // Employees can only update their own Open tickets
    if (payload.role === 'employee') {
      if (ticket.requester_id !== payload.sub) return errorResponse('Forbidden', 403, origin)
      if (ticket.status !== 'Open') return errorResponse('Cannot edit a ticket that is no longer Open', 403, origin)
    }

    const body = await ctx.request.json() as {
      title?: string; description?: string; category?: string
      priority?: string; status?: string; assigned_to?: number | null
    }

    if (body.status && !VALID_STATUSES.includes(body.status)) return errorResponse('Invalid status', 400, origin)
    if (body.category && !VALID_CATEGORIES.includes(body.category)) return errorResponse('Invalid category', 400, origin)
    if (body.priority && !VALID_PRIORITIES.includes(body.priority)) return errorResponse('Invalid priority', 400, origin)
    // Only staff/admin can assign
    if (body.assigned_to !== undefined && payload.role === 'employee') delete body.assigned_to

    await updateTicket(ctx.env.DB, id, body)

    const ip = ctx.request.headers.get('CF-Connecting-IP')
    await logAudit(ctx.env.DB, payload.sub, 'UPDATE_TICKET', 'tickets', id,
      JSON.stringify({ status: ticket.status, assigned_to: ticket.assigned_to }),
      JSON.stringify(body), ip)

    const updated = await getTicketById(ctx.env.DB, id)
    return jsonResponse({ ticket: updated }, 200, origin)
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err, origin)
    return errorResponse('Internal server error', 500, origin)
  }
}

export const onRequestOptions: PagesFunction<Env> = async (ctx) =>
  optionsResponse(ctx.env.CORS_ORIGIN || '*')
