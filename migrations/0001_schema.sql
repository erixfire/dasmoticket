-- DasmoTicket full schema
-- Migration: 0001_schema

-- Departments
CREATE TABLE IF NOT EXISTS departments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  code       TEXT    NOT NULL UNIQUE,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT    NOT NULL,
  role          TEXT    NOT NULL CHECK(role IN ('employee','it_staff','admin')),
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Tickets
CREATE TABLE IF NOT EXISTS tickets (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_number  TEXT    NOT NULL UNIQUE,
  title          TEXT    NOT NULL,
  description    TEXT,
  category       TEXT    NOT NULL CHECK(category IN ('Hardware','Software','Network','Account','Other')),
  priority       TEXT    NOT NULL CHECK(priority IN ('Low','Medium','High','Critical')),
  status         TEXT    NOT NULL DEFAULT 'Open' CHECK(status IN ('Open','In Progress','Resolved','Closed')),
  requester_id   INTEGER NOT NULL REFERENCES users(id),
  assigned_to    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  department_id  INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  resolved_at    TEXT
);

-- Ticket notes / internal comments
CREATE TABLE IF NOT EXISTS ticket_notes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id   INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_id   INTEGER NOT NULL REFERENCES users(id),
  note        TEXT    NOT NULL,
  is_internal INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Repair schedules
CREATE TABLE IF NOT EXISTS schedules (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id      INTEGER NOT NULL UNIQUE REFERENCES tickets(id) ON DELETE CASCADE,
  repair_type    TEXT    NOT NULL CHECK(repair_type IN ('Onsite','Offsite')),
  proposed_at    TEXT,
  confirmed_at   TEXT,
  scheduled_date TEXT,
  location_notes TEXT,
  status         TEXT    NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending','Confirmed','Completed','Cancelled')),
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Satisfaction surveys
CREATE TABLE IF NOT EXISTS surveys (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id     INTEGER NOT NULL UNIQUE REFERENCES tickets(id) ON DELETE CASCADE,
  respondent_id INTEGER NOT NULL REFERENCES users(id),
  rating        INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  comments      TEXT,
  submitted_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT    NOT NULL,
  entity_type TEXT    NOT NULL,
  entity_id   INTEGER,
  old_value   TEXT,
  new_value   TEXT,
  ip_address  TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tickets_status       ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_requester    ON tickets(requester_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned     ON tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_created      ON tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_ticket_notes_ticket  ON ticket_notes(ticket_id);
CREATE INDEX IF NOT EXISTS idx_schedules_ticket     ON schedules(ticket_id);
CREATE INDEX IF NOT EXISTS idx_surveys_ticket       ON surveys(ticket_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user      ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity    ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created   ON audit_logs(created_at);

-- Seed: default departments
INSERT OR IGNORE INTO departments (name, code) VALUES
  ('Information Technology', 'IT'),
  ('Human Resources', 'HR'),
  ('Finance', 'FIN'),
  ('Operations', 'OPS'),
  ('Administration', 'ADMIN');
