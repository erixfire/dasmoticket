import type { Env } from '../../_middleware'
import { requireRole, AuthError, authErrorResponse } from '../../lib/auth'
import { listAuditLogs } from '../../lib/db'
import { jsonResponse, errorResponse, optionsResponse } from '../../lib/response'

// GET /api/audit-logs?page=1&limit=50&action=UPDATE_USER_ROLE&entity_type=users
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const origin = ctx.env.CORS_ORIGIN || '*'
  try {
    await requireRole(ctx.request, ctx.env, 'admin')
    const url = new URL(ctx.request.url)
    const page   = Math.max(1, parseInt(url.searchParams.get('page')  || '1'))
    const limit  = Math.min(100, parseInt(url.searchParams.get('limit') || '50'))
    const action      = url.searchParams.get('action')      || undefined
    const entity_type = url.searchParams.get('entity_type') || undefined

    const { logs, total } = await listAuditLogs(ctx.env.DB, { action, entity_type, page, limit })
    return jsonResponse({ logs, total, page, limit }, 200, origin)
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err, origin)
    return errorResponse('Internal server error', 500, origin)
  }
}

export const onRequestOptions: PagesFunction<Env> = async (ctx) =>
  optionsResponse(ctx.env.CORS_ORIGIN || '*')
