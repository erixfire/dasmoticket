// Web Crypto API helpers — runs natively on Cloudflare Workers

// ─ JWT ──────────────────────────────────────────────────────────────────────

export interface JWTPayload {
  sub: number
  email: string
  role: string
  iat: number
  exp: number
}

function base64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlDecode(str: string): Uint8Array {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64)
  return new Uint8Array([...bin].map(c => c.charCodeAt(0)))
}

async function hmacKey(secret: string, usage: KeyUsage): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    [usage]
  )
}

export async function signJWT(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  secret: string,
  expiresInSeconds = 60 * 60 * 8
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const fullPayload: JWTPayload = { ...payload, iat: now, exp: now + expiresInSeconds }
  const header = base64url(new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })))
  const body   = base64url(new TextEncoder().encode(JSON.stringify(fullPayload)))
  const key    = await hmacKey(secret, 'sign')
  const sig    = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${header}.${body}`))
  return `${header}.${body}.${base64url(sig)}`
}

export async function verifyJWT(token: string, secret: string): Promise<JWTPayload> {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Invalid token')
  const [header, body, sig] = parts
  const key = await hmacKey(secret, 'verify')
  const valid = await crypto.subtle.verify(
    'HMAC', key,
    base64urlDecode(sig),
    new TextEncoder().encode(`${header}.${body}`)
  )
  if (!valid) throw new Error('Invalid signature')
  const payload: JWTPayload = JSON.parse(new TextDecoder().decode(base64urlDecode(body)))
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Token expired')
  return payload
}

/**
 * Like verifyJWT but allows tokens expired within the grace window.
 * Used exclusively by POST /api/auth/refresh.
 */
export async function verifyJWTLenient(
  token: string,
  secret: string,
  gracePeriodSeconds = 60 * 60  // accept tokens expired up to 1 hour ago
): Promise<JWTPayload> {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Invalid token')
  const [header, body, sig] = parts
  const key = await hmacKey(secret, 'verify')
  const valid = await crypto.subtle.verify(
    'HMAC', key,
    base64urlDecode(sig),
    new TextEncoder().encode(`${header}.${body}`)
  )
  if (!valid) throw new Error('Invalid signature')
  const payload: JWTPayload = JSON.parse(new TextDecoder().decode(base64urlDecode(body)))
  const now = Math.floor(Date.now() / 1000)
  if (payload.exp < now - gracePeriodSeconds) throw new Error('Token too old to refresh')
  return payload
}

// ─ Password (PBKDF2) ────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial, 256
  )
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('')
  const hashHex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('')
  return `pbkdf2:${saltHex}:${hashHex}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const parts = stored.split(':')
    if (parts.length !== 3 || parts[0] !== 'pbkdf2') return false
    const [, saltHex, hashHex] = parts
    const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(h => parseInt(h, 16)))
    const encoder = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
      keyMaterial, 256
    )
    const newHash = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('')
    return newHash === hashHex
  } catch { return false }
}
