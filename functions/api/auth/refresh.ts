import type { Env } from '../../_middleware'
import { verifyJWTLenient, signJWT } from '../../lib/crypto'
import { getUserById, logAudit } from '../../lib/db'
import { jsonResponse, errorResponse, optionsResponse } from '../../lib/response'

const TOKEN_TTL = 60 * 60 * 8  // 8 hours

// POST /api/auth/refresh
// Accepts a valid OR recently-expired token (up to 1h grace), issues a fresh one.
// No body needed — token comes from Authorization header.
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const origin = ctx.env.CORS_ORIGIN
  const ip = ctx.request.headers.get('CF-Connecting-IP') || 'unknown'

  try {
    const authHeader = ctx.request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse('Missing token', 401, origin)
    }
    const token = authHeader.slice(7)

    let payload
    try {
      payload = await verifyJWTLenient(token, ctx.env.JWT_SECRET)
    } catch {
      return errorResponse('Token invalid or too old to refresh', 401, origin)
    }

    // Re-fetch user to pick up role / active-status changes since token was issued
    const user = await getUserById(ctx.env.DB, payload.sub)
    if (!user || !user.is_active) {
      return errorResponse('Account not found or deactivated', 403, origin)
    }

    const newToken = await signJWT(
      { sub: user.id, email: user.email, role: user.role },
      ctx.env.JWT_SECRET,
      TOKEN_TTL
    )

    await logAudit(ctx.env.DB, user.id, 'TOKEN_REFRESH', 'users', user.id, null, null, ip)

    return jsonResponse({ token: newToken, expires_in: TOKEN_TTL }, 200, origin)
  } catch {
    return errorResponse('Internal server error', 500, origin)
  }
}

export const onRequestOptions: PagesFunction<Env> = async (ctx) =>
  optionsResponse(ctx.env.CORS_ORIGIN)
