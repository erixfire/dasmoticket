// Centralized API client for the frontend

const BASE_URL = '/api'

function getToken(): string | null {
  return localStorage.getItem('dasmoticket_token')
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  }
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`)
  return data
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ success: boolean; data: { token: string; user: import('@/types').User; expires_in: number } }>(
        '/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }
      ),
    me: () => request<{ success: boolean; data: import('@/types').User }>('/auth/me'),
    changePassword: (current_password: string, new_password: string) =>
      request('/auth/change-password', { method: 'POST', body: JSON.stringify({ current_password, new_password }) }),
  },
  users: {
    list: (page = 1) => request<{ success: boolean; data: { users: import('@/types').User[] } }>(`/users?page=${page}`),
    create: (payload: { name: string; email: string; password: string; role: string; department_id?: number | null }) =>
      request('/users', { method: 'POST', body: JSON.stringify(payload) }),
  },
  departments: {
    list: () => request<{ success: boolean; data: { departments: import('@/types').Department[] } }>('/departments'),
  },
  tickets: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : ''
      return request<{ success: boolean; data: { tickets: import('@/types').Ticket[] } }>(`/tickets${qs}`)
    },
    get: (id: number) => request<{ success: boolean; data: import('@/types').Ticket }>(`/tickets/${id}`),
    create: (payload: Partial<import('@/types').Ticket>) =>
      request('/tickets', { method: 'POST', body: JSON.stringify(payload) }),
    update: (id: number, payload: Partial<import('@/types').Ticket>) =>
      request(`/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  },
}
