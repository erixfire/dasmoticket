// Standardized API response helpers

export function corsHeaders(origin: string) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  }
}

export function jsonResponse<T>(data: T, status = 200, origin = '*'): Response {
  return new Response(
    JSON.stringify({ success: true, data }),
    { status, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } }
  )
}

export function errorResponse(message: string, status = 400, origin = '*'): Response {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    { status, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } }
  )
}

export function optionsResponse(origin: string): Response {
  return new Response(null, { status: 204, headers: corsHeaders(origin) })
}
