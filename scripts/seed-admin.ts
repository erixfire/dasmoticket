// Run this script once to seed the admin user with a proper hashed password.
// Usage: npx tsx scripts/seed-admin.ts
// Then copy the hash and run: wrangler d1 execute dasmoticket-db --local --command="UPDATE users SET password_hash='<hash>' WHERE email='admin@iloilocity.gov.ph'"

const PBKDF2_ITERATIONS = 100_000
const SALT_LENGTH = 16

async function hashPassword(password: string): Promise<string> {
  // Node.js Web Crypto (available in Node 18+)
  const { webcrypto } = await import('node:crypto')
  const subtle = webcrypto.subtle
  const salt = webcrypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const keyMaterial = await subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const hashBuffer = await subtle.deriveBits({ name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' }, keyMaterial, 256)
  const toHex = (buf: Uint8Array) => Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('')
  return `${toHex(salt)}:${toHex(new Uint8Array(hashBuffer))}`
}

const password = process.argv[2] || 'Admin@Iloilo2025!'
hashPassword(password).then(hash => {
  console.log(`\nPassword: ${password}`)
  console.log(`Hash:     ${hash}`)
  console.log(`\nRun this to update the admin user:`)
  console.log(`wrangler d1 execute dasmoticket-db --local --command="UPDATE users SET password_hash='${hash}' WHERE email='admin@iloilocity.gov.ph'"`)
})
