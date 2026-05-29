import type { Env } from '../../_middleware'
import { requireRole, AuthError, authErrorResponse } from '../../lib/auth'
import { getDepartmentById, updateDepartment, deleteDepartment, logAudit } from '../../lib/db'
import { jsonResponse, errorResponse, optionsResponse } from '../../lib/response'

// PATCH /api/departments/:id - Admin only
export const onRequestPatch: PagesFunction<Env> = async (ctx) => {
  const origin = ctx.env.CORS_ORIGIN || '*'
  try {
    const actor = await requireRole(ctx.request, ctx.env, 'admin')
    const id = Number(ctx.params.id)
    if (isNaN(id)) return errorResponse('Invalid department id', 400, origin)

    const body = await ctx.request.json() as { name?: string }
    const name = body.name?.trim()
    if (!name) return errorResponse('name is required', 400, origin)
    if (name.length < 2 || name.length > 80) return errorResponse('name must be 2–80 characters', 400, origin)

    const existing = await getDepartmentById(ctx.env.DB, id)
    if (!existing) return errorResponse('Department not found', 404, origin)

    await updateDepartment(ctx.env.DB, id, name)

    const ip = ctx.request.headers.get('CF-Connecting-IP')
    await logAudit(ctx.env.DB, actor.sub, 'UPDATE_DEPARTMENT', 'departments', id, existing.name, name, ip)

    const updated = await getDepartmentById(ctx.env.DB, id)
    return jsonResponse({ department: updated }, 200, origin)
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err, origin)
    return errorResponse('Internal server error', 500, origin)
  }
}

// DELETE /api/departments/:id - Admin only
export const onRequestDelete: PagesFunction<Env> = async (ctx) => {
  const origin = ctx.env.CORS_ORIGIN || '*'
  try {
    const actor = await requireRole(ctx.request, ctx.env, 'admin')
    const id = Number(ctx.params.id)
    if (isNaN(id)) return errorResponse('Invalid department id', 400, origin)

    const existing = await getDepartmentById(ctx.env.DB, id)
    if (!existing) return errorResponse('Department not found', 404, origin)

    await deleteDepartment(ctx.env.DB, id)

    const ip = ctx.request.headers.get('CF-Connecting-IP')
    await logAudit(ctx.env.DB, actor.sub, 'DELETE_DEPARTMENT', 'departments', id, existing.name, null, ip)

    return jsonResponse({ success: true }, 200, origin)
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err, origin)
    return errorResponse('Internal server error', 500, origin)
  }
}

export const onRequestOptions: PagesFunction<Env> = async (ctx) =>
  optionsResponse(ctx.env.CORS_ORIGIN || '*')
