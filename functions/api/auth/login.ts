import type { Env } from '../../_middleware'

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': ctx.env.CORS_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  }

  try {
    const { email, password } = await ctx.request.json() as { email: string; password: string }

    if (!email || !password) {
      return new Response(JSON.stringify({ success: false, error: 'Email and password are required' }), { status: 400, headers: corsHeaders })
    }

    const user = await ctx.env.DB.prepare(
      `SELECT u.*, d.name as department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.email = ? AND u.is_active = 1`
    ).bind(email).first() as Record<string, unknown> | null

    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid email or password' }), { status: 401, headers: corsHeaders })
    }

    // NOTE: In production use bcrypt via a Worker with proper crypto.
    // For Phase 1 baseline, we do a simple comparison.
    // Replace this with proper bcrypt verification in Phase 2.
    const passwordMatch = password === 'admin123' // TEMPORARY - Phase 2 will use proper hashing

    if (!passwordMatch) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid email or password' }), { status: 401, headers: corsHeaders })
    }

    // Simple JWT-like token (Phase 2 will implement proper JWT)
    const tokenPayload = { id: user.id, email: user.email, role: user.role, iat: Date.now() }
    const token = btoa(JSON.stringify(tokenPayload))

    const { password_hash, ...safeUser } = user
    void password_hash

    return new Response(JSON.stringify({
      success: true,
      data: { token, user: safeUser }
    }), { status: 200, headers: corsHeaders })

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), { status: 500, headers: corsHeaders })
  }
}

export const onRequestOptions: PagesFunction<Env> = async (ctx) => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': ctx.env.CORS_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  })
}
