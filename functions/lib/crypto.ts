// Web Crypto API helpers — works in Cloudflare Workers

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
    const [, saltHex, hashHex] = stored.split(':')
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
