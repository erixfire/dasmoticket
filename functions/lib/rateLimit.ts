/**
 * D1-backed rate limiter.
 * Table: rate_limit_attempts (ip TEXT, endpoint TEXT, attempts INT, window_start INT)
 * Blocks after MAX_ATTEMPTS within WINDOW_MS.
 */

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const BLOCK_MS  = 30 * 60 * 1000 // 30 minute block

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfter?: number // seconds until block lifts
}

export async function checkRateLimit(
  db: D1Database,
  ip: string,
  endpoint: string
): Promise<RateLimitResult> {
  const now = Date.now()
  const windowStart = now - WINDOW_MS

  // Ensure table exists (idempotent)
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS rate_limit_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 1,
      window_start INTEGER NOT NULL,
      blocked_until INTEGER
    )
  `).run()

  // Check existing record
  const record = await db.prepare(
    `SELECT * FROM rate_limit_attempts WHERE ip = ? AND endpoint = ? ORDER BY window_start DESC LIMIT 1`
  ).bind(ip, endpoint).first<{ id: number; attempts: number; window_start: number; blocked_until: number | null }>()

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
      if (record.attempts >= MAX_ATTEMPTS) {
        // Exceeded — set block
        const blockedUntil = now + BLOCK_MS
        await db.prepare(
          `UPDATE rate_limit_attempts SET blocked_until = ? WHERE id = ?`
        ).bind(blockedUntil, record.id).run()
        return { allowed: false, remaining: 0, retryAfter: BLOCK_MS / 1000 }
      }
      // Increment
      await db.prepare(
        `UPDATE rate_limit_attempts SET attempts = attempts + 1 WHERE id = ?`
      ).bind(record.id).run()
      return { allowed: true, remaining: MAX_ATTEMPTS - record.attempts - 1 }
    }
  }

  // New window — upsert
  await db.prepare(
    `INSERT INTO rate_limit_attempts (ip, endpoint, attempts, window_start) VALUES (?, ?, 1, ?)
     ON CONFLICT DO NOTHING`
  ).bind(ip, endpoint, now).run()

  return { allowed: true, remaining: MAX_ATTEMPTS - 1 }
}

export async function resetRateLimit(
  db: D1Database,
  ip: string,
  endpoint: string
): Promise<void> {
  await db.prepare(
    `DELETE FROM rate_limit_attempts WHERE ip = ? AND endpoint = ?`
  ).bind(ip, endpoint).run()
}
