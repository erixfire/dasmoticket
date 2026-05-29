import type { Env } from '../../../_middleware'
import { requireRole, AuthError, authErrorResponse } from '../../../lib/auth'
import { logAudit } from '../../../lib/db'
import { jsonResponse, errorResponse, optionsResponse } from '../../../lib/response'

// PATCH /api/admin/departments/:id
export const onRequestPatch: PagesFunction<Env> = async (ctx) => {
  const origin = ctx.env.CORS_ORIGIN || '*'
  try {
    const payload = await requireRole(ctx.request, ctx.env, 'admin')
    const id = parseInt(ctx.params.id as string)
    if (isNaN(id)) return errorResponse('Invalid ID', 400, origin)
    const body = await ctx.request.json() as { name?: string; code?: string }
    const fields: string[] = []; const values: unknown[] = []
    if (body.name?.trim()) { fields.push('name = ?'); values.push(body.name.trim()) }
    if (body.code?.trim()) { fields.push('code = ?'); values.push(body.code.toUpperCase().trim()) }
    if (!fields.length) return errorResponse('Nothing to update', 400, origin)
    values.push(id)
    await ctx.env.DB.prepare(`UPDATE departments SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run()
    await logAudit(ctx.env.DB, payload.sub, 'ADMIN_UPDATE_DEPT', 'departments', id, null, JSON.stringify(body), ctx.request.headers.get('CF-Connecting-IP'))
    return jsonResponse({ message: 'Department updated' }, 200, origin)
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err, origin)
    return errorResponse('Internal server error', 500, origin)
  }
}

// DELETE /api/admin/departments/:id
export const onRequestDelete: PagesFunction<Env> = async (ctx) => {
  const origin = ctx.env.CORS_ORIGIN || '*'
  try {
    const payload = await requireRole(ctx.request, ctx.env, 'admin')
    const id = parseInt(ctx.params.id as string)
    if (isNaN(id)) return errorResponse('Invalid ID', 400, origin)
    const inUse = await ctx.env.DB.prepare('SELECT COUNT(*) as cnt FROM users WHERE department_id = ?').bind(id).first<{ cnt: number }>()
    if ((inUse?.cnt ?? 0) > 0) return errorResponse('Cannot delete department with assigned users', 400, origin)
    await ctx.env.DB.prepare('DELETE FROM departments WHERE id = ?').bind(id).run()
    await logAudit(ctx.env.DB, payload.sub, 'ADMIN_DELETE_DEPT', 'departments', id, null, null, ctx.request.headers.get('CF-Connecting-IP'))
    return jsonResponse({ message: 'Department deleted' }, 200, origin)
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err, origin)
    return errorResponse('Internal server error', 500, origin)
  }
}

export const onRequestOptions: PagesFunction<Env> = async (ctx) =>
  optionsResponse(ctx.env.CORS_ORIGIN || '*')
