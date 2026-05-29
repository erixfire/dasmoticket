const BASE = '/api/admin'

function getToken() { return localStorage.getItem('dasmoticket_token') }

async function adminRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((options.headers as Record<string, string>) || {}),
    },
  })
  const json = await res.json() as { success: boolean; data?: T; error?: string }
  if (!res.ok) throw new Error(json.error || `Request failed: ${res.status}`)
  // Unwrap the { success, data } envelope from jsonResponse()
  return (json.data ?? json) as T
}

export const adminApi = {
  users: {
    list: (page = 1) => adminRequest<{ users: import('@/types').User[]; total: number; page: number }>(`/users?page=${page}`),
    create: (payload: { name: string; email: string; password: string; role: string; department_id?: number | null }) =>
      adminRequest<{ id: number; message: string }>(`/users`, { method: 'POST', body: JSON.stringify(payload) }),
    update: (id: number, payload: Partial<{ name: string; role: string; department_id: number | null; is_active: number; new_password: string }>) =>
      adminRequest<{ user: import('@/types').User }>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    deactivate: (id: number) => adminRequest<{ message: string }>(`/users/${id}`, { method: 'DELETE' }),
  },
  departments: {
    list: () => adminRequest<{ departments: import('@/types').Department[] }>('/departments'),
    create: (payload: { name: string; code: string }) =>
      adminRequest<{ id: number; message: string }>('/departments', { method: 'POST', body: JSON.stringify(payload) }),
    update: (id: number, payload: { name?: string; code?: string }) =>
      adminRequest<{ message: string }>(`/departments/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    delete: (id: number) => adminRequest<{ message: string }>(`/departments/${id}`, { method: 'DELETE' }),
  },
  auditLogs: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : ''
      return adminRequest<{ logs: import('@/types').AuditLog[]; total: number; page: number }>(`/audit-logs${qs}`)
    },
  },
}
