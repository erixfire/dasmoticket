import type { Env } from '../../../_middleware'
import { requireRole, AuthError, authErrorResponse } from '../../../lib/auth'
import { listUsers, createUser, logAudit } from '../../../lib/db'
import { jsonResponse, errorResponse, optionsResponse } from '../../../lib/response'
import { hashPassword } from '../../../lib/crypto'

// GET /api/admin/users
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const origin = ctx.env.CORS_ORIGIN || '*'
  try {
    const payload = await requireRole(ctx.request, ctx.env, 'admin')
    const p = new URL(ctx.request.url).searchParams
    const page = parseInt(p.get('page') || '1')
    const users = await listUsers(ctx.env.DB, page, 20)
    const total = await ctx.env.DB.prepare('SELECT COUNT(*) as cnt FROM users').first<{ cnt: number }>()
    return jsonResponse({ users, total: total?.cnt ?? 0, page }, 200, origin)
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err, origin)
    return errorResponse('Internal server error', 500, origin)
  }
}

// POST /api/admin/users
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const origin = ctx.env.CORS_ORIGIN || '*'
  try {
    const payload = await requireRole(ctx.request, ctx.env, 'admin')
    const body = await ctx.request.json() as {
      name?: string; email?: string; password?: string
      role?: string; department_id?: number | null
    }
    const { name, email, password, role, department_id } = body
    if (!name?.trim() || !email?.trim() || !password || !role) {
      return errorResponse('name, email, password, and role are required', 400, origin)
    }
    const VALID_ROLES = ['employee', 'it_staff', 'admin']
    if (!VALID_ROLES.includes(role)) return errorResponse('Invalid role', 400, origin)
    const existing = await ctx.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email.toLowerCase()).first()
    if (existing) return errorResponse('Email already in use', 409, origin)
    const hash = await hashPassword(password)
    const result = await createUser(ctx.env.DB, name.trim(), email.toLowerCase().trim(), hash, role, department_id ?? null)
    const ip = ctx.request.headers.get('CF-Connecting-IP')
    await logAudit(ctx.env.DB, payload.sub, 'ADMIN_CREATE_USER', 'users', Number(result.meta.last_row_id), null, JSON.stringify({ name, email, role }), ip)
    return jsonResponse({ id: result.meta.last_row_id, message: 'User created' }, 201, origin)
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err, origin)
    return errorResponse('Internal server error', 500, origin)
  }
}

export const onRequestOptions: PagesFunction<Env> = async (ctx) =>
  optionsResponse(ctx.env.CORS_ORIGIN || '*')
