// Database query helpers - all SQL abstracted here

export interface DBUser {
  id: number
  name: string
  email: string
  password_hash: string
  role: string
  department_id: number | null
  department_name: string | null
  is_active: number
  created_at: string
  updated_at: string
}

export interface DBTicket {
  id: number
  ticket_number: string
  title: string
  description: string | null
  category: string
  priority: string
  status: string
  requester_id: number
  requester_name: string
  assigned_to: number | null
  assigned_name: string | null
  department_id: number | null
  department_name: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
}

export interface DBNote {
  id: number
  ticket_id: number
  author_id: number
  author_name: string
  note: string
  is_internal: number
  created_at: string
}

export interface DBSchedule {
  id: number
  ticket_id: number
  ticket_number: string
  ticket_title: string
  repair_type: 'Onsite' | 'Offsite'
  proposed_at: string | null
  confirmed_at: string | null
  scheduled_date: string | null
  location_notes: string | null
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled'
  requester_name: string
  assigned_name: string | null
  created_at: string
}

export interface DBSurvey {
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

export interface DBDepartment {
  id: number
  name: string
  code: string
  created_at: string
}

export interface DBAuditLog {
  id: number
  user_id: number | null
  actor_name: string | null
  actor_role: string | null
  action: string
  entity_type: string
  entity_id: number | null
  old_value: string | null
  new_value: string | null
  ip_address: string | null
  created_at: string
}

// ─ Users ───────────────────────────────────────────────────────────────────────────

export async function getUserByEmail(db: D1Database, email: string): Promise<DBUser | null> {
  return db.prepare(
    `SELECT u.*, d.name as department_name FROM users u
     LEFT JOIN departments d ON u.department_id = d.id
     WHERE u.email = ? AND u.is_active = 1`
  ).bind(email).first<DBUser>()
}

export async function getUserById(db: D1Database, id: number): Promise<DBUser | null> {
  return db.prepare(
    `SELECT u.*, d.name as department_name FROM users u
     LEFT JOIN departments d ON u.department_id = d.id
     WHERE u.id = ?`
  ).bind(id).first<DBUser>()
}

export async function listUsers(db: D1Database, page = 1, limit = 20): Promise<DBUser[]> {
  const offset = (page - 1) * limit
  const result = await db.prepare(
    `SELECT u.id, u.name, u.email, u.role, u.department_id, u.is_active, u.created_at, d.name as department_name
     FROM users u LEFT JOIN departments d ON u.department_id = d.id
     ORDER BY u.created_at DESC LIMIT ? OFFSET ?`
  ).bind(limit, offset).all<DBUser>()
  return result.results
}

export async function listItStaff(db: D1Database): Promise<DBUser[]> {
  const result = await db.prepare(
    `SELECT id, name, email FROM users WHERE role IN ('it_staff','admin') AND is_active = 1 ORDER BY name ASC`
  ).all<DBUser>()
  return result.results
}

export async function createUser(db: D1Database, name: string, email: string, passwordHash: string, role: string, departmentId: number | null): Promise<D1Result> {
  return db.prepare(
    `INSERT INTO users (name, email, password_hash, role, department_id) VALUES (?, ?, ?, ?, ?)`
  ).bind(name, email, passwordHash, role, departmentId).run()
}

export async function updateUser(db: D1Database, id: number, data: { role?: string; is_active?: number }): Promise<D1Result> {
  const fields: string[] = []
  const values: unknown[] = []
  if (data.role !== undefined)      { fields.push('role = ?');      values.push(data.role) }
  if (data.is_active !== undefined) { fields.push('is_active = ?'); values.push(data.is_active) }
  if (fields.length === 0) throw new Error('No fields to update')
  fields.push('updated_at = CURRENT_TIMESTAMP')
  values.push(id)
  return db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run()
}

export async function updateUserPassword(db: D1Database, userId: number, passwordHash: string): Promise<D1Result> {
  return db.prepare(
    `UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).bind(passwordHash, userId).run()
}

// ─ Departments ─────────────────────────────────────────────────────────────

export async function listDepartments(db: D1Database): Promise<DBDepartment[]> {
  const result = await db.prepare(`SELECT * FROM departments ORDER BY name ASC`).all<DBDepartment>()
  return result.results
}

export async function getDepartmentById(db: D1Database, id: number): Promise<DBDepartment | null> {
  return db.prepare(`SELECT * FROM departments WHERE id = ?`).bind(id).first<DBDepartment>()
}

export async function createDepartment(db: D1Database, name: string, code: string): Promise<D1Result> {
  return db.prepare(
    `INSERT INTO departments (name, code) VALUES (?, ?)`
  ).bind(name, code).run()
}

export async function updateDepartment(db: D1Database, id: number, name: string): Promise<D1Result> {
  const code = name.trim().slice(0, 4).toUpperCase().replace(/\s+/g, '')
  return db.prepare(
    `UPDATE departments SET name = ?, code = ? WHERE id = ?`
  ).bind(name, code, id).run()
}

export async function deleteDepartment(db: D1Database, id: number): Promise<D1Result> {
  return db.prepare(`DELETE FROM departments WHERE id = ?`).bind(id).run()
}

// ─ Tickets ───────────────────────────────────────────────────────────────────────────

const TICKET_SELECT = `
  SELECT t.*,
    r.name as requester_name,
    a.name as assigned_name,
    d.name as department_name
  FROM tickets t
  LEFT JOIN users r ON t.requester_id = r.id
  LEFT JOIN users a ON t.assigned_to = a.id
  LEFT JOIN departments d ON t.department_id = d.id
`

export interface ListTicketsParams {
  role: string
  userId: number
  status?: string
  category?: string
  priority?: string
  search?: string
  page?: number
  limit?: number
}

export async function listTickets(db: D1Database, params: ListTicketsParams): Promise<{ tickets: DBTicket[]; total: number }> {
  const { role, userId, status, category, priority, search, page = 1, limit = 20 } = params
  const conditions: string[] = []
  const bindings: unknown[] = []
  if (role === 'employee') { conditions.push('t.requester_id = ?'); bindings.push(userId) }
  if (status) { conditions.push('t.status = ?'); bindings.push(status) }
  if (category) { conditions.push('t.category = ?'); bindings.push(category) }
  if (priority) { conditions.push('t.priority = ?'); bindings.push(priority) }
  if (search) { conditions.push('(t.title LIKE ? OR t.ticket_number LIKE ?)'); bindings.push(`%${search}%`, `%${search}%`) }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
  const offset = (page - 1) * limit
  const [dataResult, countResult] = await Promise.all([
    db.prepare(`${TICKET_SELECT} ${where} ORDER BY t.created_at DESC LIMIT ? OFFSET ?`).bind(...bindings, limit, offset).all<DBTicket>(),
    db.prepare(`SELECT COUNT(*) as total FROM tickets t ${where}`).bind(...bindings).first<{ total: number }>(),
  ])
  return { tickets: dataResult.results, total: countResult?.total ?? 0 }
}

export async function getTicketById(db: D1Database, id: number): Promise<DBTicket | null> {
  return db.prepare(`${TICKET_SELECT} WHERE t.id = ?`).bind(id).first<DBTicket>()
}

export async function createTicket(db: D1Database, data: { title: string; description: string | null; category: string; priority: string; requesterId: number; departmentId: number | null; assignedTo: number | null }): Promise<D1Result> {
  const ticketNumber = generateTicketNumber()
  return db.prepare(
    `INSERT INTO tickets (ticket_number, title, description, category, priority, status, requester_id, department_id, assigned_to)
     VALUES (?, ?, ?, ?, ?, 'Open', ?, ?, ?)`
  ).bind(ticketNumber, data.title, data.description, data.category, data.priority, data.requesterId, data.departmentId, data.assignedTo).run()
}

export async function updateTicket(db: D1Database, id: number, data: { title?: string; description?: string; category?: string; priority?: string; status?: string; assigned_to?: number | null }): Promise<D1Result> {
  const fields: string[] = []
  const values: unknown[] = []
  if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title) }
  if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description) }
  if (data.category !== undefined) { fields.push('category = ?'); values.push(data.category) }
  if (data.priority !== undefined) { fields.push('priority = ?'); values.push(data.priority) }
  if (data.status !== undefined) {
    fields.push('status = ?'); values.push(data.status)
    if (data.status === 'Resolved') { fields.push('resolved_at = CURRENT_TIMESTAMP') }
  }
  if (data.assigned_to !== undefined) { fields.push('assigned_to = ?'); values.push(data.assigned_to) }
  fields.push('updated_at = CURRENT_TIMESTAMP')
  values.push(id)
  return db.prepare(`UPDATE tickets SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run()
}

// ─ Notes ──────────────────────────────────────────────────────────────────────────

export async function getTicketNotes(db: D1Database, ticketId: number): Promise<DBNote[]> {
  const result = await db.prepare(
    `SELECT n.*, u.name as author_name FROM ticket_notes n
     JOIN users u ON n.author_id = u.id
     WHERE n.ticket_id = ? ORDER BY n.created_at ASC`
  ).bind(ticketId).all<DBNote>()
  return result.results
}

export async function addTicketNote(db: D1Database, ticketId: number, authorId: number, note: string, isInternal: number): Promise<D1Result> {
  return db.prepare(
    `INSERT INTO ticket_notes (ticket_id, author_id, note, is_internal) VALUES (?, ?, ?, ?)`
  ).bind(ticketId, authorId, note, isInternal).run()
}

// ─ Schedules ───────────────────────────────────────────────────────────────────────

const SCHEDULE_SELECT = `
  SELECT s.*,
    t.ticket_number, t.title as ticket_title,
    r.name as requester_name,
    a.name as assigned_name
  FROM schedules s
  JOIN tickets t ON s.ticket_id = t.id
  JOIN users r ON t.requester_id = r.id
  LEFT JOIN users a ON t.assigned_to = a.id
`

export async function getScheduleByTicketId(db: D1Database, ticketId: number): Promise<DBSchedule | null> {
  return db.prepare(`${SCHEDULE_SELECT} WHERE s.ticket_id = ? ORDER BY s.created_at DESC LIMIT 1`)
    .bind(ticketId).first<DBSchedule>()
}

export async function getScheduleById(db: D1Database, id: number): Promise<DBSchedule | null> {
  return db.prepare(`${SCHEDULE_SELECT} WHERE s.id = ?`).bind(id).first<DBSchedule>()
}

export interface ListSchedulesParams {
  role: string
  userId: number
  status?: string
  repair_type?: string
  date_from?: string
  date_to?: string
  page?: number
  limit?: number
}

export async function listSchedules(db: D1Database, params: ListSchedulesParams): Promise<{ schedules: DBSchedule[]; total: number }> {
  const { role, userId, status, repair_type, date_from, date_to, page = 1, limit = 20 } = params
  const conditions: string[] = []
  const bindings: unknown[] = []
  if (role === 'employee') { conditions.push('t.requester_id = ?'); bindings.push(userId) }
  if (role === 'it_staff') { conditions.push('t.assigned_to = ?'); bindings.push(userId) }
  if (status) { conditions.push('s.status = ?'); bindings.push(status) }
  if (repair_type) { conditions.push('s.repair_type = ?'); bindings.push(repair_type) }
  if (date_from) { conditions.push('date(s.scheduled_date) >= ?'); bindings.push(date_from) }
  if (date_to) { conditions.push('date(s.scheduled_date) <= ?'); bindings.push(date_to) }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
  const offset = (page - 1) * limit
  const [data, count] = await Promise.all([
    db.prepare(`${SCHEDULE_SELECT} ${where} ORDER BY s.scheduled_date ASC, s.created_at DESC LIMIT ? OFFSET ?`)
      .bind(...bindings, limit, offset).all<DBSchedule>(),
    db.prepare(`SELECT COUNT(*) as total FROM schedules s JOIN tickets t ON s.ticket_id = t.id ${where}`)
      .bind(...bindings).first<{ total: number }>(),
  ])
  return { schedules: data.results, total: count?.total ?? 0 }
}

export async function createSchedule(db: D1Database, data: { ticketId: number; repairType: string; scheduledDate: string; locationNotes: string | null; proposedBy: number }): Promise<D1Result> {
  return db.prepare(
    `INSERT INTO schedules (ticket_id, repair_type, scheduled_date, location_notes, status, proposed_at)
     VALUES (?, ?, ?, ?, 'Pending', CURRENT_TIMESTAMP)`
  ).bind(data.ticketId, data.repairType, data.scheduledDate, data.locationNotes).run()
}

export async function updateScheduleStatus(db: D1Database, id: number, status: string, confirmedAt?: string): Promise<D1Result> {
  if (status === 'Confirmed') {
    return db.prepare(`UPDATE schedules SET status = ?, confirmed_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(status, id).run()
  }
  return db.prepare(`UPDATE schedules SET status = ? WHERE id = ?`).bind(status, id).run()
}

export async function getScheduleCountByDate(db: D1Database, dateStr: string): Promise<number> {
  const result = await db.prepare(
    `SELECT COUNT(*) as cnt FROM schedules WHERE date(scheduled_date) = ? AND status NOT IN ('Cancelled')`
  ).bind(dateStr).first<{ cnt: number }>()
  return result?.cnt ?? 0
}

export async function getSchedulesForCalendar(db: D1Database, yearMonth: string, role: string, userId: number): Promise<{ date: string; count: number }[]> {
  const conditions: string[] = [`strftime('%Y-%m', s.scheduled_date) = ?`]
  const bindings: unknown[] = [yearMonth]
  if (role === 'employee') { conditions.push('t.requester_id = ?'); bindings.push(userId) }
  if (role === 'it_staff') { conditions.push('t.assigned_to = ?'); bindings.push(userId) }
  const where = 'WHERE ' + conditions.join(' AND ')
  const result = await db.prepare(
    `SELECT date(s.scheduled_date) as date, COUNT(*) as count
     FROM schedules s JOIN tickets t ON s.ticket_id = t.id
     ${where} AND s.status != 'Cancelled'
     GROUP BY date(s.scheduled_date)`
  ).bind(...bindings).all<{ date: string; count: number }>()
  return result.results
}

// ─ Surveys ──────────────────────────────────────────────────────────────────────────

export async function getSurveyByTicketId(db: D1Database, ticketId: number): Promise<DBSurvey | null> {
  return db.prepare(
    `SELECT sv.*, t.ticket_number, t.title as ticket_title, u.name as respondent_name
     FROM surveys sv
     JOIN tickets t ON sv.ticket_id = t.id
     JOIN users u ON sv.respondent_id = u.id
     WHERE sv.ticket_id = ?`
  ).bind(ticketId).first<DBSurvey>()
}

export async function createSurvey(db: D1Database, ticketId: number, respondentId: number, rating: number, comments: string | null): Promise<D1Result> {
  return db.prepare(
    `INSERT INTO surveys (ticket_id, respondent_id, rating, comments) VALUES (?, ?, ?, ?)`
  ).bind(ticketId, respondentId, rating, comments).run()
}

export async function getSurveyStats(db: D1Database): Promise<{ avg_rating: number; total: number; distribution: Record<number, number> }> {
  const [summary, dist] = await Promise.all([
    db.prepare(`SELECT ROUND(AVG(rating), 2) as avg_rating, COUNT(*) as total FROM surveys`).first<{ avg_rating: number; total: number }>(),
    db.prepare(`SELECT rating, COUNT(*) as cnt FROM surveys GROUP BY rating ORDER BY rating DESC`).all<{ rating: number; cnt: number }>(),
  ])
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  dist.results.forEach(r => { distribution[r.rating] = r.cnt })
  return { avg_rating: summary?.avg_rating ?? 0, total: summary?.total ?? 0, distribution }
}

// ─ Stats ──────────────────────────────────────────────────────────────────────────

export async function getTicketStats(db: D1Database, role: string, userId: number) {
  if (role === 'employee') {
    return db.prepare(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN status = 'Open' THEN 1 ELSE 0 END) as open,
         SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
         SUM(CASE WHEN status = 'Resolved' AND date(resolved_at) = date('now') THEN 1 ELSE 0 END) as resolved_today,
         SUM(CASE WHEN priority = 'Critical' AND status NOT IN ('Resolved','Closed') THEN 1 ELSE 0 END) as critical
       FROM tickets WHERE requester_id = ?`
    ).bind(userId).first()
  }
  return db.prepare(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN status = 'Open' THEN 1 ELSE 0 END) as open,
       SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
       SUM(CASE WHEN status = 'Resolved' AND date(resolved_at) = date('now') THEN 1 ELSE 0 END) as resolved_today,
       SUM(CASE WHEN priority = 'Critical' AND status NOT IN ('Resolved','Closed') THEN 1 ELSE 0 END) as critical
     FROM tickets`
  ).first()
}

// ─ Audit Logs ────────────────────────────────────────────────────────────────────

export async function listAuditLogs(
  db: D1Database,
  params: { action?: string; entity_type?: string; page?: number; limit?: number }
): Promise<{ logs: DBAuditLog[]; total: number }> {
  const { action, entity_type, page = 1, limit = 50 } = params
  const conditions: string[] = []
  const bindings: unknown[] = []
  if (action)      { conditions.push('al.action = ?');      bindings.push(action) }
  if (entity_type) { conditions.push('al.entity_type = ?'); bindings.push(entity_type) }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
  const offset = (page - 1) * limit
  const [data, count] = await Promise.all([
    db.prepare(
      `SELECT al.*, u.name as actor_name, u.role as actor_role
       FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id
       ${where}
       ORDER BY al.created_at DESC LIMIT ? OFFSET ?`
    ).bind(...bindings, limit, offset).all<DBAuditLog>(),
    db.prepare(`SELECT COUNT(*) as total FROM audit_logs al ${where}`)
      .bind(...bindings).first<{ total: number }>(),
  ])
  return { logs: data.results, total: count?.total ?? 0 }
}

export async function logAudit(db: D1Database, userId: number | null, action: string, entityType: string, entityId: number | null, oldValue: string | null, newValue: string | null, ipAddress: string | null): Promise<void> {
  await db.prepare(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_value, new_value, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(userId, action, entityType, entityId, oldValue, newValue, ipAddress).run()
}

// ─ Helpers ──────────────────────────────────────────────────────────────────────────

function generateTicketNumber(): string {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, '')
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `TKT-${date}-${rand}`
}
