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
      request<{ success: boolean; data: { token: string; user: import('@/types').User; expires_in: number } }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    me: () =>
      request<{ success: boolean; data: import('@/types').User }>('/auth/me'),
    changePassword: (current_password: string, new_password: string) =>
      request('/auth/change-password', { method: 'POST', body: JSON.stringify({ current_password, new_password }) }),
  },
  users: {
    list: (page = 1) =>
      request<{ success: boolean; data: { users: import('@/types').User[] } }>(`/users?page=${page}`),
    create: (payload: { name: string; email: string; password: string; role: string; department_id?: number | null }) =>
      request('/users', { method: 'POST', body: JSON.stringify(payload) }),
    update: (id: number, payload: { role?: import('@/types').UserRole; is_active?: number }) =>
      request<{ success: boolean; data: { user: import('@/types').User } }>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    staff: () =>
      request<{ success: boolean; data: { staff: import('@/types').User[] } }>('/users/staff'),
  },
  departments: {
    list: () =>
      request<{ success: boolean; data: { departments: import('@/types').Department[] } }>('/departments'),
    create: (name: string, head?: string) =>
      request<{ success: boolean; data: { department: import('@/types').Department } }>('/departments', { method: 'POST', body: JSON.stringify({ name, head }) }),
    update: (id: number, name: string) =>
      request<{ success: boolean; data: { department: import('@/types').Department } }>(`/departments/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) }),
    delete: (id: number) =>
      request<{ success: boolean }>(`/departments/${id}`, { method: 'DELETE' }),
  },
  tickets: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : ''
      return request<{ success: boolean; data: { tickets: import('@/types').Ticket[]; total: number; page: number } }>(`/tickets${qs}`)
    },
    get: (id: number) =>
      request<{ success: boolean; data: { ticket: import('@/types').Ticket; notes: import('@/types').TicketNote[] } }>(`/tickets/${id}`),
    create: (payload: { title: string; description?: string; category: string; priority: string; department_id?: number | null }) =>
      request<{ success: boolean; data: { id: number } }>('/tickets', { method: 'POST', body: JSON.stringify(payload) }),
    update: (id: number, payload: Partial<import('@/types').Ticket & { assigned_to: number | null }>) =>
      request<{ success: boolean; data: { ticket: import('@/types').Ticket } }>(`/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    addNote: (id: number, note: string, is_internal = false) =>
      request(`/tickets/${id}/notes`, { method: 'POST', body: JSON.stringify({ note, is_internal }) }),
    getSchedule: (id: number) =>
      request<{ success: boolean; data: { schedule: import('@/types').Schedule | null } }>(`/tickets/${id}/schedule`),
    getSurvey: (id: number) =>
      request<{ success: boolean; data: { survey: import('@/types').Survey | null } }>(`/tickets/${id}/survey`),
    submitSurvey: (id: number, rating: number, comments?: string) =>
      request(`/tickets/${id}/survey`, { method: 'POST', body: JSON.stringify({ rating, comments }) }),
  },
  schedules: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : ''
      return request<{ success: boolean; data: { schedules: import('@/types').Schedule[]; total: number } }>(`/schedules${qs}`)
    },
    create: (payload: { ticket_id: number; repair_type: string; scheduled_date: string; location_notes?: string }) =>
      request<{ success: boolean; data: { id: number } }>('/schedules', { method: 'POST', body: JSON.stringify(payload) }),
    update: (id: number, status: string) =>
      request<{ success: boolean; data: { schedule: import('@/types').Schedule } }>(`/schedules/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    calendar: (month: string) =>
      request<{ success: boolean; data: { month: string; days: { date: string; count: number }[] } }>(`/schedules/calendar?month=${month}`),
  },
  dashboard: {
    stats: () =>
      request<{ success: boolean; data: { stats: { total: number; open: number; in_progress: number; resolved_today: number; critical: number } } }>('/dashboard/stats'),
  },
  surveys: {
    stats: () =>
      request<{ success: boolean; data: { stats: { avg_rating: number; total: number; distribution: Record<number, number> } } }>('/surveys/stats'),
  },
}
