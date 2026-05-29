import type { Env } from '../../../_middleware'
import { requireRole, AuthError, authErrorResponse } from '../../../lib/auth'
import { getUserById, updateUserPassword, logAudit } from '../../../lib/db'
import { jsonResponse, errorResponse, optionsResponse } from '../../../lib/response'
import { hashPassword } from '../../../lib/crypto'

// PATCH /api/admin/users/:id
export const onRequestPatch: PagesFunction<Env> = async (ctx) => {
  const origin = ctx.env.CORS_ORIGIN || '*'
  try {
    const payload = await requireRole(ctx.request, ctx.env, 'admin')
    const id = parseInt(ctx.params.id as string)
    if (isNaN(id)) return errorResponse('Invalid user ID', 400, origin)
    const user = await getUserById(ctx.env.DB, id)
    if (!user) return errorResponse('User not found', 404, origin)

    const body = await ctx.request.json() as {
      name?: string; role?: string; department_id?: number | null
      is_active?: number; new_password?: string
    }
    const fields: string[] = []
    const values: unknown[] = []
    if (body.name !== undefined) { fields.push('name = ?'); values.push(body.name.trim()) }
    if (body.role !== undefined) { fields.push('role = ?'); values.push(body.role) }
    if (body.department_id !== undefined) { fields.push('department_id = ?'); values.push(body.department_id) }
    if (body.is_active !== undefined) { fields.push('is_active = ?'); values.push(body.is_active) }
    if (body.new_password) {
      const hash = await hashPassword(body.new_password)
      fields.push('password_hash = ?'); values.push(hash)
    }
    if (fields.length === 0) return errorResponse('No fields to update', 400, origin)
    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)
    await ctx.env.DB.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run()
    const ip = ctx.request.headers.get('CF-Connecting-IP')
    await logAudit(ctx.env.DB, payload.sub, 'ADMIN_UPDATE_USER', 'users', id, null, JSON.stringify(body), ip)
    const updated = await getUserById(ctx.env.DB, id)
    return jsonResponse({ user: updated }, 200, origin)
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err, origin)
    return errorResponse('Internal server error', 500, origin)
  }
}

// DELETE /api/admin/users/:id  (soft delete)
export const onRequestDelete: PagesFunction<Env> = async (ctx) => {
  const origin = ctx.env.CORS_ORIGIN || '*'
  try {
    const payload = await requireRole(ctx.request, ctx.env, 'admin')
    const id = parseInt(ctx.params.id as string)
    if (isNaN(id)) return errorResponse('Invalid user ID', 400, origin)
    if (id === payload.sub) return errorResponse('Cannot deactivate your own account', 400, origin)
    await ctx.env.DB.prepare('UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(id).run()
    const ip = ctx.request.headers.get('CF-Connecting-IP')
    await logAudit(ctx.env.DB, payload.sub, 'ADMIN_DEACTIVATE_USER', 'users', id, '1', '0', ip)
    return jsonResponse({ message: 'User deactivated' }, 200, origin)
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err, origin)
    return errorResponse('Internal server error', 500, origin)
  }
}

export const onRequestOptions: PagesFunction<Env> = async (ctx) =>
  optionsResponse(ctx.env.CORS_ORIGIN || '*')
