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

// ─ Users ───────────────────────────────────────────────────────────────

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
     WHERE u.id = ? AND u.is_active = 1`
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

export async function updateUserPassword(db: D1Database, userId: number, passwordHash: string): Promise<D1Result> {
  return db.prepare(
    `UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).bind(passwordHash, userId).run()
}

// ─ Departments ────────────────────────────────────────────────────────

export async function listDepartments(db: D1Database) {
  const result = await db.prepare(`SELECT * FROM departments ORDER BY name ASC`).all()
  return result.results
}

// ─ Tickets ─────────────────────────────────────────────────────────────

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

  // Employees can only see their own tickets
  if (role === 'employee') {
    conditions.push('t.requester_id = ?')
    bindings.push(userId)
  }
  if (status) { conditions.push('t.status = ?'); bindings.push(status) }
  if (category) { conditions.push('t.category = ?'); bindings.push(category) }
  if (priority) { conditions.push('t.priority = ?'); bindings.push(priority) }
  if (search) {
    conditions.push('(t.title LIKE ? OR t.ticket_number LIKE ?)')
    bindings.push(`%${search}%`, `%${search}%`)
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
  const offset = (page - 1) * limit

  const [dataResult, countResult] = await Promise.all([
    db.prepare(`${TICKET_SELECT} ${where} ORDER BY t.created_at DESC LIMIT ? OFFSET ?`)
      .bind(...bindings, limit, offset).all<DBTicket>(),
    db.prepare(`SELECT COUNT(*) as total FROM tickets t ${where}`)
      .bind(...bindings).first<{ total: number }>(),
  ])

  return { tickets: dataResult.results, total: countResult?.total ?? 0 }
}

export async function getTicketById(db: D1Database, id: number): Promise<DBTicket | null> {
  return db.prepare(`${TICKET_SELECT} WHERE t.id = ?`).bind(id).first<DBTicket>()
}

export async function createTicket(
  db: D1Database,
  data: {
    title: string
    description: string | null
    category: string
    priority: string
    requesterId: number
    departmentId: number | null
    assignedTo: number | null
  }
): Promise<D1Result> {
  const ticketNumber = generateTicketNumber()
  return db.prepare(
    `INSERT INTO tickets (ticket_number, title, description, category, priority, status, requester_id, department_id, assigned_to)
     VALUES (?, ?, ?, ?, ?, 'Open', ?, ?, ?)`
  ).bind(ticketNumber, data.title, data.description, data.category, data.priority, data.requesterId, data.departmentId, data.assignedTo).run()
}

export async function updateTicket(
  db: D1Database,
  id: number,
  data: {
    title?: string
    description?: string
    category?: string
    priority?: string
    status?: string
    assigned_to?: number | null
  }
): Promise<D1Result> {
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

// ─ Notes ──────────────────────────────────────────────────────────────

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

// ─ Stats ───────────────────────────────────────────────────────────────

export async function getTicketStats(db: D1Database, role: string, userId: number) {
  const scope = role === 'employee' ? `WHERE requester_id = ${userId}` : ''
  const result = await db.prepare(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN status = 'Open' THEN 1 ELSE 0 END) as open,
       SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
       SUM(CASE WHEN status = 'Resolved' AND date(resolved_at) = date('now') THEN 1 ELSE 0 END) as resolved_today,
       SUM(CASE WHEN priority = 'Critical' AND status NOT IN ('Resolved','Closed') THEN 1 ELSE 0 END) as critical
     FROM tickets ${scope}`
  ).first()
  return result
}

// ─ Helpers ────────────────────────────────────────────────────────────

function generateTicketNumber(): string {
  const prefix = 'TKT'
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, '')
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${prefix}-${date}-${rand}`
}

export async function logAudit(
  db: D1Database,
  userId: number | null,
  action: string,
  entityType: string,
  entityId: number | null,
  oldValue: string | null,
  newValue: string | null,
  ipAddress: string | null
): Promise<void> {
  await db.prepare(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_value, new_value, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(userId, action, entityType, entityId, oldValue, newValue, ipAddress).run()
}
