import type { Env } from '../../_middleware'
import { requireRole, AuthError, authErrorResponse } from '../../lib/auth'
import { listUsers, createUser } from '../../lib/db'
import { hashPassword } from '../../lib/crypto'
import { jsonResponse, errorResponse, optionsResponse } from '../../lib/response'
import { logAudit } from '../../lib/db'

const VALID_ROLES = ['employee', 'it_staff', 'admin']

// GET /api/users - Admin only
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const origin = ctx.env.CORS_ORIGIN || '*'
  try {
    await requireRole(ctx.request, ctx.env, 'admin')
    const url = new URL(ctx.request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100)
    const users = await listUsers(ctx.env.DB, page, limit)
    return jsonResponse({ users, page, limit }, 200, origin)
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err, origin)
    return errorResponse('Internal server error', 500, origin)
  }
}

// POST /api/users - Admin only: create new user
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const origin = ctx.env.CORS_ORIGIN || '*'
  try {
    const actor = await requireRole(ctx.request, ctx.env, 'admin')
    const body = await ctx.request.json() as {
      name?: string
      email?: string
      password?: string
      role?: string
      department_id?: number | null
    }
    const { name, email, password, role, department_id = null } = body

    if (!name || !email || !password || !role) {
      return errorResponse('name, email, password, and role are required', 400, origin)
    }
    if (!VALID_ROLES.includes(role)) {
      return errorResponse(`role must be one of: ${VALID_ROLES.join(', ')}`, 400, origin)
    }
    if (password.length < 8) {
      return errorResponse('Password must be at least 8 characters', 400, origin)
    }

    const passwordHash = await hashPassword(password)
    const result = await createUser(ctx.env.DB, name, email.toLowerCase().trim(), passwordHash, role, department_id)

    const ip = ctx.request.headers.get('CF-Connecting-IP')
    await logAudit(ctx.env.DB, actor.sub, 'CREATE_USER', 'users', Number(result.meta.last_row_id), null, JSON.stringify({ name, email, role }), ip)

    return jsonResponse({ id: result.meta.last_row_id, message: 'User created successfully' }, 201, origin)
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err, origin)
    if (err instanceof Error && err.message.includes('UNIQUE')) {
      return errorResponse('Email already exists', 409, origin)
    }
    return errorResponse('Internal server error', 500, origin)
  }
}

export const onRequestOptions: PagesFunction<Env> = async (ctx) =>
  optionsResponse(ctx.env.CORS_ORIGIN || '*')
