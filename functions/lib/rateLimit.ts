/**
 * D1-backed rate limiter.
 * Requires rate_limit_attempts table — defined in schema.sql.
 * Supports both IP-based (login) and user-ID-based (authenticated endpoints) limiting.
 */

// Login: 5 attempts / 15 min / IP
export const LOGIN_LIMITS    = { max: 5,  windowMs: 15 * 60 * 1000, blockMs: 30 * 60 * 1000 }
// Ticket creation: 10 / hour / user
export const TICKET_LIMITS   = { max: 10, windowMs: 60 * 60 * 1000, blockMs: 60 * 60 * 1000 }
// Note posting: 30 / hour / user
export const NOTE_LIMITS     = { max: 30, windowMs: 60 * 60 * 1000, blockMs: 30 * 60 * 1000 }

export interface RateLimitConfig {
  max: number
  windowMs: number
  blockMs: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfter?: number  // seconds until block lifts
}

/**
 * Check and record a rate limit attempt.
 * @param key  IP address (for login) or `user:{id}` (for authenticated routes)
 * @param endpoint  e.g. 'login', 'create_ticket', 'add_note'
 */
export async function checkRateLimit(
  db: D1Database,
  key: string,
  endpoint: string,
  config: RateLimitConfig = LOGIN_LIMITS
): Promise<RateLimitResult> {
  const now = Date.now()
  const windowStart = now - config.windowMs

  const record = await db.prepare(
    `SELECT * FROM rate_limit_attempts WHERE ip = ? AND endpoint = ? ORDER BY window_start DESC LIMIT 1`
  ).bind(key, endpoint).first<{ id: number; attempts: number; window_start: number; blocked_until: number | null }>()

  if (record) {
    // Currently blocked
    if (record.blocked_until && record.blocked_until > now) {
      return {
        allowed: false,
        remaining: 0,
        retryAfter: Math.ceil((record.blocked_until - now) / 1000),
      }
    }

    // Within current window
    if (record.window_start > windowStart) {
      if (record.attempts >= config.max) {
        const blockedUntil = now + config.blockMs
        await db.prepare(
          `UPDATE rate_limit_attempts SET blocked_until = ? WHERE id = ?`
        ).bind(blockedUntil, record.id).run()
        return { allowed: false, remaining: 0, retryAfter: config.blockMs / 1000 }
      }
      await db.prepare(
        `UPDATE rate_limit_attempts SET attempts = attempts + 1 WHERE id = ?`
      ).bind(record.id).run()
      return { allowed: true, remaining: config.max - record.attempts - 1 }
    }
  }

  // New window
  await db.prepare(
    `INSERT INTO rate_limit_attempts (ip, endpoint, attempts, window_start) VALUES (?, ?, 1, ?)`
  ).bind(key, endpoint, now).run()

  return { allowed: true, remaining: config.max - 1 }
}

export async function resetRateLimit(
  db: D1Database,
  key: string,
  endpoint: string
): Promise<void> {
  await db.prepare(
    `DELETE FROM rate_limit_attempts WHERE ip = ? AND endpoint = ?`
  ).bind(key, endpoint).run()
}

/** Build a 429 response with Retry-After header */
export function rateLimitResponse(result: RateLimitResult, origin: string): Response {
  return new Response(
    JSON.stringify({ success: false, error: `Too many requests. Try again in ${Math.ceil((result.retryAfter ?? 60) / 60)} minute(s).` }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(result.retryAfter ?? 60),
        'Access-Control-Allow-Origin': origin,
      },
    }
  )
}
