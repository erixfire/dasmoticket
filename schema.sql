-- ============================================
-- DASMOTICKET - Cloudflare D1 Schema
-- Iloilo City Government IT Ticketing System
-- ============================================

PRAGMA foreign_keys = ON;

-- Departments
CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('employee', 'it_staff', 'admin')),
  department_id INTEGER REFERENCES departments(id),
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tickets
CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK(category IN ('Hardware', 'Software', 'Network', 'Account', 'Other')),
  priority TEXT NOT NULL CHECK(priority IN ('Low', 'Medium', 'High', 'Critical')),
  status TEXT NOT NULL DEFAULT 'Open' CHECK(status IN ('Open', 'In Progress', 'Resolved', 'Closed')),
  requester_id INTEGER NOT NULL REFERENCES users(id),
  assigned_to INTEGER REFERENCES users(id),
  department_id INTEGER REFERENCES departments(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME
);

-- Ticket Notes / Internal Comments
CREATE TABLE IF NOT EXISTS ticket_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES users(id),
  note TEXT NOT NULL,
  is_internal INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Repair Schedules
CREATE TABLE IF NOT EXISTS schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  repair_type TEXT NOT NULL CHECK(repair_type IN ('Onsite', 'Offsite')),
  proposed_at DATETIME,
  confirmed_at DATETIME,
  scheduled_date DATETIME,
  location_notes TEXT,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending', 'Confirmed', 'Completed', 'Cancelled')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- After-Work Surveys
CREATE TABLE IF NOT EXISTS surveys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL UNIQUE REFERENCES tickets(id) ON DELETE CASCADE,
  respondent_id INTEGER NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  comments TEXT,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id INTEGER,
  old_value TEXT,
  new_value TEXT,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed: Default Departments
INSERT OR IGNORE INTO departments (name, code) VALUES
  ('DASMO', 'DASMO'),
  ('City Mayor Office', 'CMO'),
  ('City Administrator', 'CA'),
  ('City Health Office', 'CHO'),
  ('City Engineering Office', 'CEO'),
  ('City Treasurer Office', 'CTO'),
  ('City Assessor Office', 'CAO'),
  ('General Services Office', 'GSO'),
  ('Human Resource Management Office', 'HRMO'),
  ('Information Technology Office', 'ITO');

-- Seed: Default Admin User (password: admin123 - CHANGE IN PRODUCTION)
INSERT OR IGNORE INTO users (name, email, password_hash, role, department_id) VALUES
  ('DASMO Admin', 'admin@iloilocity.gov.ph', '$2a$10$placeholder_hash_change_this', 'admin', 1);
