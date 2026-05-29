// DELETED — replaced by login.ts
// This file intentionally left as a redirect to prevent Cloudflare from serving old JS
export const onRequestPost = () => new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
