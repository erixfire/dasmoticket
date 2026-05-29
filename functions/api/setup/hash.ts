/**
 * TEMP UTILITY — POST /api/setup/hash
 * Body: { password: string, setup_key: string }
 * Returns the PBKDF2 hash generated inside the Worker runtime.
 * Use the returned hash to UPDATE users SET password_hash = '...' directly.
 */
import type { Env } from '../../_middleware'
import { hashPassword } from '../../lib/crypto'

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const body = await ctx.request.json() as { password?: string; setup_key?: string }
  if (!ctx.env.SETUP_KEY || body.setup_key !== ctx.env.SETUP_KEY) {
    return json({ error: 'Unauthorized' }, 401)
  }
  if (!body.password || body.password.length < 6) {
    return json({ error: 'Password too short' }, 400)
  }
  const hash = await hashPassword(body.password)
  return json({ hash })
}
