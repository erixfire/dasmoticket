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
export type ScheduleStatus = 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled'
export type RepairType = 'Onsite' | 'Offsite'

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

export interface Schedule {
  id: number
  ticket_id: number
  ticket_number: string
  ticket_title: string
  repair_type: RepairType
  proposed_at: string | null
  confirmed_at: string | null
  scheduled_date: string | null
  location_notes: string | null
  status: ScheduleStatus
  requester_name: string
  assigned_name: string | null
  created_at: string
}

export interface Survey {
  id: number
  ticket_id: number
  ticket_number: string
  ticket_title: string
  respondent_id: number
  respondent_name: string
  rating: number
  comments: string | null
  submitted_at: string
}

export interface Department {
  id: number
  name: string
  code: string
}

export interface AuditLog {
  id: number
  user_id: number | null
  actor_name: string | null
  actor_email: string | null
  action: string
  entity_type: string
  entity_id: number | null
  old_value: string | null
  new_value: string | null
  ip_address: string | null
  created_at: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}
