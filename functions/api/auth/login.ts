import type { Env } from '../../_middleware'
import { verifyPassword, hashPassword, signJWT } from '../../lib/crypto'
import { getUserByEmail } from '../../lib/db'
import { jsonResponse, errorResponse, optionsResponse } from '../../lib/response'
import { logAudit } from '../../lib/db'

const TOKEN_TTL = 60 * 60 * 8 // 8 hours

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const origin = ctx.env.CORS_ORIGIN || '*'
  try {
    const body = await ctx.request.json() as { email?: string; password?: string }
    const { email, password } = body

    if (!email || !password) {
      return errorResponse('Email and password are required', 400, origin)
    }

    const user = await getUserByEmail(ctx.env.DB, email.toLowerCase().trim())

    const passwordMatch = user
      ? await verifyPassword(password, user.password_hash)
      : await verifyPassword(password, 'pbkdf2:00000000000000000000000000000000:0000000000000000000000000000000000000000000000000000000000000000')

    if (!user || !passwordMatch) {
      return errorResponse('Invalid email or password', 401, origin)
    }

    // Auto-upgrade plain: hash to PBKDF2 on first login
    if (user.password_hash.startsWith('plain:')) {
      const newHash = await hashPassword(password)
      await ctx.env.DB
        .prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .bind(newHash, user.id)
        .run()
    }

    const now = Math.floor(Date.now() / 1000)
    const token = await signJWT(
      { sub: user.id, email: user.email, role: user.role },
      ctx.env.JWT_SECRET
    )

    const ip = ctx.request.headers.get('CF-Connecting-IP')
    await logAudit(ctx.env.DB, user.id, 'LOGIN', 'users', user.id, null, null, ip)

    const { password_hash, ...safeUser } = user
    void password_hash
    void now

    return jsonResponse({ token, user: safeUser, expires_in: TOKEN_TTL }, 200, origin)
  } catch (err) {
    console.error('Login error:', err)
    return errorResponse('Internal server error', 500, origin)
  }
}

export const onRequestOptions: PagesFunction<Env> = async (ctx) =>
  optionsResponse(ctx.env.CORS_ORIGIN || '*')
