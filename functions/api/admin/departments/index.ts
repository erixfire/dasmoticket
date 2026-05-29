import type { Env } from '../../../_middleware'
import { requireRole, AuthError, authErrorResponse } from '../../../lib/auth'
import { listDepartments, logAudit } from '../../../lib/db'
import { jsonResponse, errorResponse, optionsResponse } from '../../../lib/response'

// GET /api/admin/departments
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const origin = ctx.env.CORS_ORIGIN || '*'
  try {
    await requireRole(ctx.request, ctx.env, 'admin', 'it_staff')
    const departments = await listDepartments(ctx.env.DB)
    return jsonResponse({ departments }, 200, origin)
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err, origin)
    return errorResponse('Internal server error', 500, origin)
  }
}

// POST /api/admin/departments
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const origin = ctx.env.CORS_ORIGIN || '*'
  try {
    const payload = await requireRole(ctx.request, ctx.env, 'admin')
    const body = await ctx.request.json() as { name?: string; code?: string }
    if (!body.name?.trim() || !body.code?.trim()) {
      return errorResponse('name and code are required', 400, origin)
    }
    const code = body.code.toUpperCase().trim()
    const existing = await ctx.env.DB.prepare('SELECT id FROM departments WHERE code = ?').bind(code).first()
    if (existing) return errorResponse('Department code already exists', 409, origin)
    const result = await ctx.env.DB.prepare(
      'INSERT INTO departments (name, code) VALUES (?, ?)'
    ).bind(body.name.trim(), code).run()
    const ip = ctx.request.headers.get('CF-Connecting-IP')
    await logAudit(ctx.env.DB, payload.sub, 'ADMIN_CREATE_DEPT', 'departments', Number(result.meta.last_row_id), null, JSON.stringify({ name: body.name, code }), ip)
    return jsonResponse({ id: result.meta.last_row_id, message: 'Department created' }, 201, origin)
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err, origin)
    return errorResponse('Internal server error', 500, origin)
  }
}

export const onRequestOptions: PagesFunction<Env> = async (ctx) =>
  optionsResponse(ctx.env.CORS_ORIGIN || '*')
