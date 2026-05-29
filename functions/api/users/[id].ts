import type { Env } from '../../_middleware'
import { requireRole, AuthError, authErrorResponse } from '../../lib/auth'
import { getUserById, updateUser, logAudit } from '../../lib/db'
import { jsonResponse, errorResponse, optionsResponse } from '../../lib/response'

const VALID_ROLES = ['employee', 'it_staff', 'admin']

// PATCH /api/users/:id - Admin only
export const onRequestPatch: PagesFunction<Env> = async (ctx) => {
  const origin = ctx.env.CORS_ORIGIN || '*'
  try {
    const actor = await requireRole(ctx.request, ctx.env, 'admin')
    const id = Number(ctx.params.id)
    if (isNaN(id)) return errorResponse('Invalid user id', 400, origin)

    const body = await ctx.request.json() as { role?: string; is_active?: number }

    // Validate role if provided
    if (body.role !== undefined && !VALID_ROLES.includes(body.role)) {
      return errorResponse(`role must be one of: ${VALID_ROLES.join(', ')}`, 400, origin)
    }

    // Validate is_active if provided
    if (body.is_active !== undefined && body.is_active !== 0 && body.is_active !== 1) {
      return errorResponse('is_active must be 0 or 1', 400, origin)
    }

    // Prevent admin from deactivating themselves
    if (actor.sub === id && body.is_active === 0) {
      return errorResponse('You cannot deactivate your own account', 403, origin)
    }

    const existing = await getUserById(ctx.env.DB, id)
    if (!existing) return errorResponse('User not found', 404, origin)

    await updateUser(ctx.env.DB, id, body)

    const ip = ctx.request.headers.get('CF-Connecting-IP')
    await logAudit(
      ctx.env.DB,
      actor.sub,
      body.role !== undefined ? 'UPDATE_USER_ROLE' : 'UPDATE_USER_STATUS',
      'users',
      id,
      JSON.stringify({ role: existing.role, is_active: existing.is_active }),
      JSON.stringify(body),
      ip
    )

    const updated = await getUserById(ctx.env.DB, id)
    return jsonResponse({ user: updated }, 200, origin)
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err, origin)
    return errorResponse('Internal server error', 500, origin)
  }
}

export const onRequestOptions: PagesFunction<Env> = async (ctx) =>
  optionsResponse(ctx.env.CORS_ORIGIN || '*')
