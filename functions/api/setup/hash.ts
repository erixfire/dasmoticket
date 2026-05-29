/**
 * TEMP ONE-TIME HASH UTILITY — DELETE AFTER USE
 * POST /api/setup/hash
 * Body: { password: string, token: string }
 * token must equal: iloilo2026init
 */
import type { Env } from '../../_middleware'
import { hashPassword } from '../../lib/crypto'

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const HARDCODED_TOKEN = 'iloilo2026init'

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const body = await ctx.request.json() as { password?: string; token?: string }
  if (body.token !== HARDCODED_TOKEN) {
    return json({ error: 'Unauthorized' }, 401)
  }
  if (!body.password || body.password.length < 6) {
    return json({ error: 'Password too short' }, 400)
  }
  const hash = await hashPassword(body.password)
  return json({ hash })
}
