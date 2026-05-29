import type { Env } from '../../_middleware'
import { requireAuth, AuthError, authErrorResponse } from '../../lib/auth'
import { getUserById } from '../../lib/db'
import { jsonResponse, errorResponse, optionsResponse } from '../../lib/response'

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const origin = ctx.env.CORS_ORIGIN || '*'
  try {
    const payload = await requireAuth(ctx.request, ctx.env)
    const user = await getUserById(ctx.env.DB, payload.sub)
    if (!user) return errorResponse('User not found', 404, origin)
    const { password_hash, ...safeUser } = user
    void password_hash
    return jsonResponse(safeUser, 200, origin)
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err, origin)
    return errorResponse('Internal server error', 500, origin)
  }
}

export const onRequestOptions: PagesFunction<Env> = async (ctx) =>
  optionsResponse(ctx.env.CORS_ORIGIN || '*')
