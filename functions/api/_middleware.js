import { verifyToken } from '../utils/auth.js';

export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);

  // CORS Headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': env.CORS_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Public routes bypass auth
  const publicPaths = ['/api/auth/login', '/api/auth/register'];
  if (publicPaths.some(p => url.pathname.startsWith(p))) {
    const res = await next();
    Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }

  // Verify JWT
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const token = authHeader.split(' ')[1];
  const payload = await verifyToken(token, env.JWT_SECRET);
  if (!payload) {
    return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  context.data.user = payload;
  const res = await next();
  Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}
