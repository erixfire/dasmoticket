export type UserRole = 'employee' | 'it_staff' | 'admin'

export interface User {
  id: number
  name: string
  email: string
  role: UserRole
  department_id: number | null
  department_name?: string
  is_active: number
  created_at: string
}

export type TicketCategory = 'Hardware' | 'Software' | 'Network' | 'Account' | 'Other'
export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical'
export type TicketStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed'

export interface Ticket {
  id: number
  ticket_number: string
  title: string
  description: string | null
  category: TicketCategory
  priority: TicketPriority
  status: TicketStatus
  requester_id: number
  requester_name?: string
  assigned_to: number | null
  assigned_name?: string | null
  department_id: number | null
  department_name?: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
}

export interface TicketNote {
  id: number
  ticket_id: number
  author_id: number
  author_name?: string
  note: string
  is_internal: number
  created_at: string
}

export interface Department {
  id: number
  name: string
  code: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}
