import type { Env } from '../../_middleware'
import { verifyPassword, hashPassword, signJWT } from '../../lib/crypto'
import { getUserByEmail } from '../../lib/db'
import { jsonResponse, errorResponse, optionsResponse } from '../../lib/response'
import { logAudit } from '../../lib/db'
import { checkRateLimit, resetRateLimit } from '../../lib/rateLimit'

const TOKEN_TTL = 60 * 60 * 8 // 8 hours

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const origin = ctx.env.CORS_ORIGIN || '*'
  const ip = ctx.request.headers.get('CF-Connecting-IP') || 'unknown'

  try {
    // Rate limit: 5 attempts per 15 min per IP
    const rl = await checkRateLimit(ctx.env.DB, ip, 'login')
    if (!rl.allowed) {
      return new Response(
        JSON.stringify({ success: false, error: `Too many login attempts. Try again in ${rl.retryAfter}s.` }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(rl.retryAfter),
            'Access-Control-Allow-Origin': origin,
          },
        }
      )
    }

    const body = await ctx.request.json() as { email?: string; password?: string }
    const { email, password } = body

    if (!email || !password) {
      return errorResponse('Email and password are required', 400, origin)
    }

    const user = await getUserByEmail(ctx.env.DB, email.toLowerCase().trim())

    // Constant-time: always verify even if user not found
    const dummyHash = 'pbkdf2:00000000000000000000000000000000:0000000000000000000000000000000000000000000000000000000000000000'
    const passwordMatch = user
      ? await verifyPassword(password, user.password_hash)
      : await verifyPassword(password, dummyHash)

    if (!user || !passwordMatch) {
      // Log failed attempt
      await logAudit(ctx.env.DB, null, 'LOGIN_FAILED', 'users', null, email, null, ip)
      return errorResponse('Invalid email or password', 401, origin)
    }

    if (!user.is_active) {
      await logAudit(ctx.env.DB, user.id, 'LOGIN_BLOCKED', 'users', user.id, null, null, ip)
      return errorResponse('Account is deactivated', 403, origin)
    }

    // Auto-upgrade plain: hash to PBKDF2
    if (user.password_hash.startsWith('plain:')) {
      const newHash = await hashPassword(password)
      await ctx.env.DB
        .prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .bind(newHash, user.id)
        .run()
    }

    // Reset rate limit on successful login
    await resetRateLimit(ctx.env.DB, ip, 'login')

    const token = await signJWT(
      { sub: user.id, email: user.email, role: user.role },
      ctx.env.JWT_SECRET,
      TOKEN_TTL
    )

    await logAudit(ctx.env.DB, user.id, 'LOGIN', 'users', user.id, null, null, ip)

    const { password_hash, ...safeUser } = user
    void password_hash

    return jsonResponse({ token, user: safeUser, expires_in: TOKEN_TTL }, 200, origin)
  } catch (err) {
    console.error('Login error:', err)
    return errorResponse('Internal server error', 500, origin)
  }
}

export const onRequestOptions: PagesFunction<Env> = async (ctx) =>
  optionsResponse(ctx.env.CORS_ORIGIN || '*')
