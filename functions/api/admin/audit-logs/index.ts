import type { Env } from '../../../_middleware'
import { requireRole, AuthError, authErrorResponse } from '../../../lib/auth'
import { jsonResponse, errorResponse, optionsResponse } from '../../../lib/response'

// GET /api/admin/audit-logs
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const origin = ctx.env.CORS_ORIGIN || '*'
  try {
    await requireRole(ctx.request, ctx.env, 'admin')
    const p = new URL(ctx.request.url).searchParams
    const page = Math.max(1, parseInt(p.get('page') || '1'))
    const limit = Math.min(50, parseInt(p.get('limit') || '30'))
    const offset = (page - 1) * limit
    const entity_type = p.get('entity_type') || null
    const action = p.get('action') || null
    const user_id = p.get('user_id') || null
    const conditions: string[] = []
    const bindings: unknown[] = []
    if (entity_type) { conditions.push('al.entity_type = ?'); bindings.push(entity_type) }
    if (action) { conditions.push('al.action LIKE ?'); bindings.push(`%${action}%`) }
    if (user_id) { conditions.push('al.user_id = ?'); bindings.push(parseInt(user_id)) }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
    const [rows, total] = await Promise.all([
      ctx.env.DB.prepare(
        `SELECT al.*, u.name as actor_name, u.email as actor_email
         FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id
         ${where} ORDER BY al.created_at DESC LIMIT ? OFFSET ?`
      ).bind(...bindings, limit, offset).all(),
      ctx.env.DB.prepare(
        `SELECT COUNT(*) as cnt FROM audit_logs al ${where}`
      ).bind(...bindings).first<{ cnt: number }>(),
    ])
    return jsonResponse({ logs: rows.results, total: total?.cnt ?? 0, page }, 200, origin)
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err, origin)
    return errorResponse('Internal server error', 500, origin)
  }
}

export const onRequestOptions: PagesFunction<Env> = async (ctx) =>
  optionsResponse(ctx.env.CORS_ORIGIN || '*')
