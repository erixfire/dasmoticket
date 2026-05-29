-- ============================================================
-- DASMO Ticketing System - Cloudflare D1 Schema
-- Iloilo City Government
-- ============================================================

PRAGMA foreign_keys = ON;

-- Departments
CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  building TEXT,
  floor TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('employee','it_staff','admin')),
  department_id INTEGER REFERENCES departments(id),
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Tickets
CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK(category IN ('Hardware','Software','Network','Account','Other')),
  priority TEXT NOT NULL CHECK(priority IN ('Low','Medium','High','Critical')) DEFAULT 'Medium',
  status TEXT NOT NULL CHECK(status IN ('Open','In Progress','Resolved','Closed')) DEFAULT 'Open',
  requester_id INTEGER NOT NULL REFERENCES users(id),
  assigned_to INTEGER REFERENCES users(id),
  department_id INTEGER REFERENCES departments(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  resolved_at TEXT,
  closed_at TEXT
);

-- Ticket Notes (Internal)
CREATE TABLE IF NOT EXISTS ticket_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES users(id),
  note TEXT NOT NULL,
  is_internal INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Repair Schedules
CREATE TABLE IF NOT EXISTS repair_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  repair_type TEXT NOT NULL CHECK(repair_type IN ('Onsite','Offsite')),
  proposed_datetime TEXT NOT NULL,
  confirmed_datetime TEXT,
  status TEXT NOT NULL CHECK(status IN ('Proposed','Confirmed','Completed','Cancelled')) DEFAULT 'Proposed',
  location_notes TEXT,
  proposed_by INTEGER NOT NULL REFERENCES users(id),
  confirmed_by INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- After-Work Surveys
CREATE TABLE IF NOT EXISTS surveys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL UNIQUE REFERENCES tickets(id) ON DELETE CASCADE,
  respondent_id INTEGER NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  comments TEXT,
  submitted_at TEXT DEFAULT (datetime('now'))
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id INTEGER REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id INTEGER,
  old_value TEXT,
  new_value TEXT,
  ip_address TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_requester ON tickets(requester_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_ticket_notes_ticket ON ticket_notes(ticket_id);
CREATE INDEX IF NOT EXISTS idx_schedules_ticket ON repair_schedules(ticket_id);
CREATE INDEX IF NOT EXISTS idx_surveys_ticket ON surveys(ticket_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_id);

-- Seed: Default Departments
INSERT OR IGNORE INTO departments (name, code, building) VALUES
  ('DASMO - IT Division', 'DASMO-IT', 'City Hall'),
  ('Office of the Mayor', 'OOM', 'City Hall'),
  ('City Administrator', 'CA', 'City Hall'),
  ('City Planning & Development Office', 'CPDO', 'City Hall'),
  ('City Health Office', 'CHO', 'Health Building'),
  ('City Engineering Office', 'CEO', 'Engineering Building'),
  ('City Social Welfare & Development Office', 'CSWDO', 'City Hall'),
  ('City Treasurer Office', 'CTO', 'Treasury Building'),
  ('City Assessor Office', 'CAO', 'City Hall'),
  ('City Civil Registry Office', 'CCRO', 'City Hall');

-- Seed: Default Admin (password: Admin@1234 - change immediately)
-- password_hash is bcrypt of 'Admin@1234'
INSERT OR IGNORE INTO users (employee_id, full_name, email, password_hash, role, department_id)
  VALUES ('EMP-0001', 'DASMO Administrator', 'admin@iloilocity.gov.ph',
    '$2b$10$placeholder_replace_with_real_bcrypt_hash', 'admin', 1);
