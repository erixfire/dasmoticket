import type { Env } from '../../../_middleware'
import { requireAuth, AuthError, authErrorResponse } from '../../../lib/auth'
import { getTicketById, getTicketNotes, addTicketNote } from '../../../lib/db'
import { jsonResponse, errorResponse, optionsResponse } from '../../../lib/response'

// POST /api/tickets/:id/notes
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const origin = ctx.env.CORS_ORIGIN || '*'
  try {
    const payload = await requireAuth(ctx.request, ctx.env)
    const id = parseInt(ctx.params.id as string)
    if (isNaN(id)) return errorResponse('Invalid ticket ID', 400, origin)

    const ticket = await getTicketById(ctx.env.DB, id)
    if (!ticket) return errorResponse('Ticket not found', 404, origin)
    if (payload.role === 'employee' && ticket.requester_id !== payload.sub) {
      return errorResponse('Forbidden', 403, origin)
    }

    const body = await ctx.request.json() as { note?: string; is_internal?: boolean }
    if (!body.note?.trim()) return errorResponse('Note content is required', 400, origin)

    // Employees cannot post internal notes
    const isInternal = payload.role !== 'employee' && (body.is_internal ?? false) ? 1 : 0

    await addTicketNote(ctx.env.DB, id, payload.sub, body.note.trim(), isInternal)
    const notes = await getTicketNotes(ctx.env.DB, id)
    const filtered = payload.role === 'employee' ? notes.filter(n => !n.is_internal) : notes
    return jsonResponse({ notes: filtered }, 201, origin)
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err, origin)
    return errorResponse('Internal server error', 500, origin)
  }
}

export const onRequestOptions: PagesFunction<Env> = async (ctx) =>
  optionsResponse(ctx.env.CORS_ORIGIN || '*')
