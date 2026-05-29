import type { Env } from '../../_middleware'
import { requireAuth, AuthError, authErrorResponse } from '../../lib/auth'
import { listTickets, createTicket, logAudit } from '../../lib/db'
import { jsonResponse, errorResponse, optionsResponse } from '../../lib/response'
import { checkRateLimit, rateLimitResponse, TICKET_LIMITS } from '../../lib/rateLimit'

const VALID_CATEGORIES = ['Hardware', 'Software', 'Network', 'Account', 'Other']
const VALID_PRIORITIES = ['Low', 'Medium', 'High', 'Critical']
const MAX_TITLE_LEN    = 200
const MAX_DESC_LEN     = 5000

// GET /api/tickets
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const origin = ctx.env.CORS_ORIGIN
  try {
    const payload = await requireAuth(ctx.request, ctx.env)
    const url = new URL(ctx.request.url)
    const p = url.searchParams

    const { tickets, total } = await listTickets(ctx.env.DB, {
      role: payload.role,
      userId: payload.sub,
      status: p.get('status') || undefined,
      category: p.get('category') || undefined,
      priority: p.get('priority') || undefined,
      search: p.get('search') || undefined,
      page: parseInt(p.get('page') || '1'),
      limit: Math.min(parseInt(p.get('limit') || '20'), 100),
    })

    return jsonResponse({ tickets, total, page: parseInt(p.get('page') || '1') }, 200, origin)
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err, origin)
    return errorResponse('Internal server error', 500, origin)
  }
}

// POST /api/tickets
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const origin = ctx.env.CORS_ORIGIN
  try {
    const payload = await requireAuth(ctx.request, ctx.env)

    // Per-user rate limit: 10 tickets / hour
    const rl = await checkRateLimit(ctx.env.DB, `user:${payload.sub}`, 'create_ticket', TICKET_LIMITS)
    if (!rl.allowed) return rateLimitResponse(rl, origin)

    const body = await ctx.request.json() as {
      title?: string
      description?: string
      category?: string
      priority?: string
      department_id?: number | null
      assigned_to?: number | null
    }

    const { title, description, category, priority, department_id = null, assigned_to = null } = body

    if (!title?.trim() || !category || !priority) {
      return errorResponse('title, category, and priority are required', 400, origin)
    }
    if (title.trim().length > MAX_TITLE_LEN) {
      return errorResponse(`Title must be ${MAX_TITLE_LEN} characters or fewer`, 400, origin)
    }
    if (description && description.length > MAX_DESC_LEN) {
      return errorResponse(`Description must be ${MAX_DESC_LEN} characters or fewer`, 400, origin)
    }
    if (!VALID_CATEGORIES.includes(category)) return errorResponse('Invalid category', 400, origin)
    if (!VALID_PRIORITIES.includes(priority))  return errorResponse('Invalid priority', 400, origin)

    const resolvedAssignee = payload.role === 'employee' ? null : (assigned_to ?? null)

    const result = await createTicket(ctx.env.DB, {
      title: title.trim(),
      description: description?.trim() || null,
      category,
      priority,
      requesterId: payload.sub,
      departmentId: department_id,
      assignedTo: resolvedAssignee,
    })

    const ip = ctx.request.headers.get('CF-Connecting-IP')
    await logAudit(ctx.env.DB, payload.sub, 'CREATE_TICKET', 'tickets', Number(result.meta.last_row_id), null, JSON.stringify({ title: title.trim(), category, priority }), ip)

    return jsonResponse({ id: result.meta.last_row_id, message: 'Ticket created successfully' }, 201, origin)
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err, origin)
    return errorResponse('Internal server error', 500, origin)
  }
}

export const onRequestOptions: PagesFunction<Env> = async (ctx) =>
  optionsResponse(ctx.env.CORS_ORIGIN)
