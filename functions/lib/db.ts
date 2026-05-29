// Database query helpers - keep all SQL abstracted here

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

export async function getUserByEmail(db: D1Database, email: string): Promise<DBUser | null> {
  return db.prepare(
    `SELECT u.*, d.name as department_name
     FROM users u
     LEFT JOIN departments d ON u.department_id = d.id
     WHERE u.email = ? AND u.is_active = 1`
  ).bind(email).first<DBUser>()
}

export async function getUserById(db: D1Database, id: number): Promise<DBUser | null> {
  return db.prepare(
    `SELECT u.*, d.name as department_name
     FROM users u
     LEFT JOIN departments d ON u.department_id = d.id
     WHERE u.id = ? AND u.is_active = 1`
  ).bind(id).first<DBUser>()
}

export async function listUsers(db: D1Database, page = 1, limit = 20): Promise<DBUser[]> {
  const offset = (page - 1) * limit
  const result = await db.prepare(
    `SELECT u.id, u.name, u.email, u.role, u.department_id, u.is_active, u.created_at, d.name as department_name
     FROM users u
     LEFT JOIN departments d ON u.department_id = d.id
     ORDER BY u.created_at DESC
     LIMIT ? OFFSET ?`
  ).bind(limit, offset).all<DBUser>()
  return result.results
}

export async function createUser(
  db: D1Database,
  name: string,
  email: string,
  passwordHash: string,
  role: string,
  departmentId: number | null
): Promise<D1Result> {
  return db.prepare(
    `INSERT INTO users (name, email, password_hash, role, department_id)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(name, email, passwordHash, role, departmentId).run()
}

export async function updateUserPassword(db: D1Database, userId: number, passwordHash: string): Promise<D1Result> {
  return db.prepare(
    `UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).bind(passwordHash, userId).run()
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

export async function listDepartments(db: D1Database) {
  const result = await db.prepare(`SELECT * FROM departments ORDER BY name ASC`).all()
  return result.results
}
