// Web Crypto API utilities for Cloudflare Workers runtime
// Uses PBKDF2 for password hashing and HMAC-SHA256 for JWT

const PBKDF2_ITERATIONS = 100_000
const SALT_LENGTH = 16

// ─── Password Hashing ───────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const hashBuffer = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256
  )
  const saltHex = bufToHex(salt)
  const hashHex = bufToHex(new Uint8Array(hashBuffer))
  return `${saltHex}:${hashHex}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(':')
  if (!saltHex || !hashHex) return false
  const salt = hexToBuf(saltHex)
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const hashBuffer = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256
  )
  const attemptHex = bufToHex(new Uint8Array(hashBuffer))
  return timingSafeEqual(attemptHex, hashHex)
}

// ─── JWT (HMAC-SHA256) ───────────────────────────────────────────────

export interface JWTPayload {
  sub: number      // user id
  email: string
  role: string
  iat: number
  exp: number
}

export async function signJWT(payload: JWTPayload, secret: string): Promise<string> {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = b64url(JSON.stringify(payload))
  const signingInput = `${header}.${body}`
  const key = await importHmacKey(secret)
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput))
  return `${signingInput}.${bufToB64url(new Uint8Array(sig))}`
}

export async function verifyJWT(token: string, secret: string): Promise<JWTPayload> {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Invalid token format')
  const [header, body, signature] = parts
  const signingInput = `${header}.${body}`
  const key = await importHmacKey(secret)
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    b64urlToBuf(signature),
    new TextEncoder().encode(signingInput)
  )
  if (!valid) throw new Error('Invalid token signature')
  const payload: JWTPayload = JSON.parse(atob(body.replace(/-/g, '+').replace(/_/g, '/')))
  if (Date.now() / 1000 > payload.exp) throw new Error('Token expired')
  return payload
}

// ─── Helpers ────────────────────────────────────────────────────────

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

function bufToHex(buf: Uint8Array): string {
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('')
}

function hexToBuf(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2)
  for (let i = 0; i < arr.length; i++) arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return arr
}

function b64url(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function bufToB64url(buf: Uint8Array): string {
  return btoa(String.fromCharCode(...buf)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function b64urlToBuf(str: string): Uint8Array {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return new Uint8Array([...raw].map(c => c.charCodeAt(0)))
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
