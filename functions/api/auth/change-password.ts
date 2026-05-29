import type { Env } from '../../_middleware'
import { requireAuth, AuthError, authErrorResponse } from '../../lib/auth'
import { verifyPassword, hashPassword } from '../../lib/crypto'
import { getUserById, updateUserPassword, logAudit } from '../../lib/db'
import { jsonResponse, errorResponse, optionsResponse } from '../../lib/response'

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const origin = ctx.env.CORS_ORIGIN || '*'
  try {
    const payload = await requireAuth(ctx.request, ctx.env)
    const body = await ctx.request.json() as { current_password?: string; new_password?: string }
    const { current_password, new_password } = body

    if (!current_password || !new_password) {
      return errorResponse('current_password and new_password are required', 400, origin)
    }
    if (new_password.length < 8) {
      return errorResponse('Password must be at least 8 characters', 400, origin)
    }

    const user = await getUserById(ctx.env.DB, payload.sub)
    if (!user) return errorResponse('User not found', 404, origin)

    const valid = await verifyPassword(current_password, user.password_hash)
    if (!valid) return errorResponse('Current password is incorrect', 401, origin)

    const newHash = await hashPassword(new_password)
    await updateUserPassword(ctx.env.DB, user.id, newHash)

    const ip = ctx.request.headers.get('CF-Connecting-IP')
    await logAudit(ctx.env.DB, user.id, 'CHANGE_PASSWORD', 'users', user.id, null, null, ip)

    return jsonResponse({ message: 'Password updated successfully' }, 200, origin)
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err, origin)
    return errorResponse('Internal server error', 500, origin)
  }
}

export const onRequestOptions: PagesFunction<Env> = async (ctx) =>
  optionsResponse(ctx.env.CORS_ORIGIN || '*')
