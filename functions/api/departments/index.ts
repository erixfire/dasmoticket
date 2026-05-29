import type { Env } from '../../_middleware'
import { requireAuth, requireRole, AuthError, authErrorResponse } from '../../lib/auth'
import { listDepartments, createDepartment, logAudit } from '../../lib/db'
import { jsonResponse, errorResponse, optionsResponse } from '../../lib/response'

// GET /api/departments - Any authenticated user
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const origin = ctx.env.CORS_ORIGIN || '*'
  try {
    await requireAuth(ctx.request, ctx.env)
    const departments = await listDepartments(ctx.env.DB)
    return jsonResponse({ departments }, 200, origin)
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err, origin)
    return errorResponse('Internal server error', 500, origin)
  }
}

// POST /api/departments - Admin only
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const origin = ctx.env.CORS_ORIGIN || '*'
  try {
    const actor = await requireRole(ctx.request, ctx.env, 'admin')
    const body = await ctx.request.json() as { name?: string; head?: string }
    const name = body.name?.trim()
    if (!name) return errorResponse('name is required', 400, origin)
    if (name.length < 2 || name.length > 80) return errorResponse('name must be 2–80 characters', 400, origin)

    const code = name.slice(0, 4).toUpperCase().replace(/\s+/g, '')
    const result = await createDepartment(ctx.env.DB, name, code)

    const ip = ctx.request.headers.get('CF-Connecting-IP')
    await logAudit(ctx.env.DB, actor.sub, 'CREATE_DEPARTMENT', 'departments', Number(result.meta.last_row_id), null, JSON.stringify({ name, code }), ip)

    const departments = await listDepartments(ctx.env.DB)
    return jsonResponse({ department: departments.find(d => d.id === Number(result.meta.last_row_id)) }, 201, origin)
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err, origin)
    if (err instanceof Error && err.message.includes('UNIQUE')) {
      return errorResponse('A department with that name already exists', 409, origin)
    }
    return errorResponse('Internal server error', 500, origin)
  }
}

export const onRequestOptions: PagesFunction<Env> = async (ctx) =>
  optionsResponse(ctx.env.CORS_ORIGIN || '*')
