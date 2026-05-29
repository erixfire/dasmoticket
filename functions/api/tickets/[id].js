import { dbFirst, dbRun, jsonResponse } from '../../utils/db.js';

// GET /api/tickets/:id
export async function onRequestGet({ env, params, data }) {
  const user = data.user;
  const ticket = await dbFirst(env.DB,
    `SELECT t.*, u.full_name as requester_name, a.full_name as assignee_name, d.name as department_name
     FROM tickets t
     LEFT JOIN users u ON t.requester_id = u.id
     LEFT JOIN users a ON t.assigned_to = a.id
     LEFT JOIN departments d ON t.department_id = d.id
     WHERE t.id = ?`,
    [params.id]
  );
  if (!ticket) return jsonResponse({ error: 'Not found' }, 404);
  if (user.role === 'employee' && ticket.requester_id !== user.id)
    return jsonResponse({ error: 'Forbidden' }, 403);

  const { results: notes } = await dbFirst(env.DB,
    `SELECT n.*, u.full_name as author FROM ticket_notes n JOIN users u ON n.author_id = u.id WHERE n.ticket_id = ? ORDER BY n.created_at DESC`,
    [params.id]
  ) || { results: [] };

  return jsonResponse({ ticket, notes });
}

// PATCH /api/tickets/:id - Update status, assignment, etc.
export async function onRequestPatch({ request, env, params, data }) {
  const user = data.user;
  if (user.role === 'employee') return jsonResponse({ error: 'Forbidden' }, 403);

  const body = await request.json();
  const { status, assigned_to, priority, note } = body;

  const ticket = await dbFirst(env.DB, 'SELECT * FROM tickets WHERE id = ?', [params.id]);
  if (!ticket) return jsonResponse({ error: 'Not found' }, 404);

  const now = new Date().toISOString();
  const resolved_at = status === 'Resolved' ? now : ticket.resolved_at;
  const closed_at = status === 'Closed' ? now : ticket.closed_at;

  await dbRun(env.DB,
    `UPDATE tickets SET
      status = COALESCE(?, status),
      assigned_to = COALESCE(?, assigned_to),
      priority = COALESCE(?, priority),
      resolved_at = ?,
      closed_at = ?,
      updated_at = ?
     WHERE id = ?`,
    [status, assigned_to, priority, resolved_at, closed_at, now, params.id]
  );

  if (note) {
    await dbRun(env.DB,
      'INSERT INTO ticket_notes (ticket_id, author_id, note) VALUES (?, ?, ?)',
      [params.id, user.id, note]
    );
  }

  await dbRun(env.DB,
    `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, old_value, new_value) VALUES (?, 'UPDATE', 'ticket', ?, ?, ?)`,
    [user.id, params.id, ticket.status, status || ticket.status]
  );

  const updated = await dbFirst(env.DB, 'SELECT * FROM tickets WHERE id = ?', [params.id]);
  return jsonResponse({ message: 'Ticket updated', ticket: updated });
}
