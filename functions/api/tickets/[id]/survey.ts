import type { Env } from '../../../../_middleware'
import { requireAuth, AuthError, authErrorResponse } from '../../../../lib/auth'
import { getTicketById, getSurveyByTicketId, createSurvey, logAudit } from '../../../../lib/db'
import { jsonResponse, errorResponse, optionsResponse } from '../../../../lib/response'

// GET /api/tickets/:id/survey
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const origin = ctx.env.CORS_ORIGIN || '*'
  try {
    const payload = await requireAuth(ctx.request, ctx.env)
    const id = parseInt(ctx.params.id as string)
    if (isNaN(id)) return errorResponse('Invalid ticket ID', 400, origin)
    const survey = await getSurveyByTicketId(ctx.env.DB, id)
    return jsonResponse({ survey: survey ?? null }, 200, origin)
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err, origin)
    return errorResponse('Internal server error', 500, origin)
  }
}

// POST /api/tickets/:id/survey — submit after-work survey
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const origin = ctx.env.CORS_ORIGIN || '*'
  try {
    const payload = await requireAuth(ctx.request, ctx.env)
    const id = parseInt(ctx.params.id as string)
    if (isNaN(id)) return errorResponse('Invalid ticket ID', 400, origin)

    const ticket = await getTicketById(ctx.env.DB, id)
    if (!ticket) return errorResponse('Ticket not found', 404, origin)
    // Only the requester can submit the survey
    if (ticket.requester_id !== payload.sub) {
      return errorResponse('Only the ticket requester can submit the survey', 403, origin)
    }
    // Ticket must be Resolved
    if (ticket.status !== 'Resolved') {
      return errorResponse('Survey is only available for Resolved tickets', 400, origin)
    }
    // One survey per ticket
    const existing = await getSurveyByTicketId(ctx.env.DB, id)
    if (existing) return errorResponse('Survey already submitted for this ticket', 409, origin)

    const body = await ctx.request.json() as { rating?: number; comments?: string }
    const { rating, comments } = body
    if (!rating || rating < 1 || rating > 5) {
      return errorResponse('rating must be an integer between 1 and 5', 400, origin)
    }

    await createSurvey(ctx.env.DB, id, payload.sub, rating, comments?.trim() || null)
    const ip = ctx.request.headers.get('CF-Connecting-IP')
    await logAudit(ctx.env.DB, payload.sub, 'SUBMIT_SURVEY', 'surveys', id, null, JSON.stringify({ rating, comments }), ip)

    return jsonResponse({ message: 'Survey submitted. Thank you for your feedback!' }, 201, origin)
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err, origin)
    return errorResponse('Internal server error', 500, origin)
  }
}

export const onRequestOptions: PagesFunction<Env> = async (ctx) =>
  optionsResponse(ctx.env.CORS_ORIGIN || '*')
