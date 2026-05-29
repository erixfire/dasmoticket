import { dbQuery, dbFirst, dbRun, generateTicketNumber, jsonResponse } from '../../utils/db.js';

// GET /api/tickets - List tickets based on role
export async function onRequestGet({ env, data }) {
  const user = data.user;
  let sql, params;

  if (user.role === 'employee') {
    sql = `SELECT t.*, u.full_name as requester_name, a.full_name as assignee_name, d.name as department_name
           FROM tickets t
           LEFT JOIN users u ON t.requester_id = u.id
           LEFT JOIN users a ON t.assigned_to = a.id
           LEFT JOIN departments d ON t.department_id = d.id
           WHERE t.requester_id = ? ORDER BY t.created_at DESC`;
    params = [user.id];
  } else {
    sql = `SELECT t.*, u.full_name as requester_name, a.full_name as assignee_name, d.name as department_name
           FROM tickets t
           LEFT JOIN users u ON t.requester_id = u.id
           LEFT JOIN users a ON t.assigned_to = a.id
           LEFT JOIN departments d ON t.department_id = d.id
           ORDER BY t.created_at DESC`;
    params = [];
  }

  const { results } = await dbQuery(env.DB, sql, params);
  return jsonResponse({ tickets: results });
}

// POST /api/tickets - Create a new ticket
export async function onRequestPost({ request, env, data }) {
  const user = data.user;
  const body = await request.json();
  const { title, description, category, priority } = body;

  if (!title || !category) {
    return jsonResponse({ error: 'Title and category are required' }, 400);
  }

  const ticket_number = generateTicketNumber();
  const requesterUser = await dbFirst(env.DB, 'SELECT department_id FROM users WHERE id = ?', [user.id]);

  await dbRun(env.DB,
    `INSERT INTO tickets (ticket_number, title, description, category, priority, status, requester_id, department_id)
     VALUES (?, ?, ?, ?, ?, 'Open', ?, ?)`,
    [ticket_number, title, description || '', category, priority || 'Medium', user.id, requesterUser?.department_id]
  );

  await dbRun(env.DB,
    `INSERT INTO audit_logs (actor_id, action, entity_type, new_value) VALUES (?, 'CREATE', 'ticket', ?)`,
    [user.id, ticket_number]
  );

  const ticket = await dbFirst(env.DB, 'SELECT * FROM tickets WHERE ticket_number = ?', [ticket_number]);
  return jsonResponse({ message: 'Ticket created', ticket }, 201);
}
