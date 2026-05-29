import type { Env } from './_middleware'

/**
 * CSP Nonce Middleware
 * Intercepts HTML responses, generates a per-request nonce,
 * injects it into <script> and <link> tags, and sets a strict CSP header.
 * Only runs on text/html responses (page navigations, not API calls).
 */
export const onRequest: PagesFunction<Env> = async (ctx) => {
  const response = await ctx.next()

  // Only process HTML responses
  const contentType = response.headers.get('Content-Type') ?? ''
  if (!contentType.includes('text/html')) return response

  // Skip nonce injection in development (Vite HMR uses inline scripts)
  if (ctx.env.ENVIRONMENT === 'development') return response

  // Generate cryptographically random nonce
  const nonceBytes = crypto.getRandomValues(new Uint8Array(16))
  const nonce = btoa(String.fromCharCode(...nonceBytes))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  // Read and rewrite HTML body
  let html = await response.text()

  // Inject nonce into all <script> tags
  html = html.replace(/<script(\s)/gi, `<script nonce="${nonce}"$1`)
  html = html.replace(/<script>/gi, `<script nonce="${nonce}">`)

  // Inject nonce into all <link rel="stylesheet"> tags
  html = html.replace(/<link(\s[^>]*rel=["']stylesheet["'][^>]*)>/gi,
    (match) => match.replace('<link', `<link nonce="${nonce}"`))

  // Build strict per-request CSP
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}'`,
    `style-src 'self' 'nonce-${nonce}' 'unsafe-inline'`,  // unsafe-inline kept for CSS-in-JS / CSS Modules style attributes
    `img-src 'self' data:`,
    `connect-src 'self'`,
    `font-src 'self'`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ].join('; ')

  const newHeaders = new Headers(response.headers)
  newHeaders.set('Content-Security-Policy', csp)

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  })
}
