// Temp endpoint removed after initial setup
import type { Env } from '../../_middleware'
export const onRequestPost: PagesFunction<Env> = async () =>
  new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
export const onRequestOptions: PagesFunction<Env> = async () =>
  new Response(null, { status: 204 })
