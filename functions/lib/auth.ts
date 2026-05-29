import { verifyJWT, type JWTPayload } from './crypto'
import type { Env } from '../_middleware'

export type { JWTPayload }

export async function requireAuth(
  request: Request,
  env: Env
): Promise<JWTPayload> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthError('Missing or invalid Authorization header', 401)
  }
  const token = authHeader.slice(7)
  try {
    return await verifyJWT(token, env.JWT_SECRET)
  } catch (err) {
    throw new AuthError('Invalid or expired token', 401)
  }
}

export async function requireRole(
  request: Request,
  env: Env,
  ...roles: string[]
): Promise<JWTPayload> {
  const payload = await requireAuth(request, env)
  if (!roles.includes(payload.role)) {
    throw new AuthError('Insufficient permissions', 403)
  }
  return payload
}

export class AuthError extends Error {
  constructor(message: string, public status: number = 401) {
    super(message)
    this.name = 'AuthError'
  }
}

export function authErrorResponse(err: AuthError, corsOrigin: string): Response {
  return new Response(
    JSON.stringify({ success: false, error: err.message }),
    {
      status: err.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': corsOrigin || '*',
      },
    }
  )
}
