/**
 * ONE-SHOT SETUP ENDPOINT
 * POST /api/setup
 * Body: { user_id: number, password: string, setup_key: string }
 *
 * - Only works if the target user still has password_hash = 'CHANGE_ME'
 * - Disabled automatically once any real hash exists
 * - Requires SETUP_KEY env var to match (prevents random abuse)
 */
import type { Env } from '../_middleware'
import { hashPassword } from '../lib/crypto'

interface SetupBody {
  user_id: number
  password: string
  setup_key: string
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  try {
    // Check if setup has already been completed (no CHANGE_ME hashes left)
    const pending = await ctx.env.DB
      .prepare("SELECT COUNT(*) as cnt FROM users WHERE password_hash = 'CHANGE_ME'")
      .first<{ cnt: number }>()

    if (!pending || pending.cnt === 0) {
      return json({ error: 'Setup already completed. This endpoint is disabled.' }, 403)
    }

    const body = await ctx.request.json() as SetupBody
    const { user_id, password, setup_key } = body

    // Validate setup key against env var (set SETUP_KEY in Cloudflare Pages env vars)
    const expectedKey = (ctx.env as unknown as Record<string, string>).SETUP_KEY
    if (!expectedKey || setup_key !== expectedKey) {
      return json({ error: 'Invalid setup key.' }, 401)
    }

    if (!password || password.length < 8) {
      return json({ error: 'Password must be at least 8 characters.' }, 400)
    }

    const user = await ctx.env.DB
      .prepare('SELECT id, name, email, role FROM users WHERE id = ? AND password_hash = ?')
      .bind(user_id, 'CHANGE_ME')
      .first<{ id: number; name: string; email: string; role: string }>()

    if (!user) {
      return json({ error: 'User not found or already set up.' }, 404)
    }

    const hash = await hashPassword(password)
    await ctx.env.DB
      .prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(hash, user_id)
      .run()

    return json({
      success: true,
      message: `Password set for ${user.name} (${user.email}). You can now log in.`,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    })
  } catch (err) {
    return json({ error: 'Setup failed', detail: String(err) }, 500)
  }
}

// Disable GET so it can't be probed
export const onRequestGet: PagesFunction<Env> = async () =>
  new Response('Not found', { status: 404 })
