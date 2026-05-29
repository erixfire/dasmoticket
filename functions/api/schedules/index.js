import { dbFirst, dbRun, jsonResponse } from '../../utils/db.js';

// POST /api/schedules - Propose a repair schedule
export async function onRequestPost({ request, env, data }) {
  const user = data.user;
  const { ticket_id, repair_type, proposed_datetime, location_notes } = await request.json();

  if (!ticket_id || !repair_type || !proposed_datetime) {
    return jsonResponse({ error: 'ticket_id, repair_type, and proposed_datetime are required' }, 400);
  }

  const ticket = await dbFirst(env.DB, 'SELECT * FROM tickets WHERE id = ?', [ticket_id]);
  if (!ticket) return jsonResponse({ error: 'Ticket not found' }, 404);
  if (user.role === 'employee' && ticket.requester_id !== user.id)
    return jsonResponse({ error: 'Forbidden' }, 403);

  await dbRun(env.DB,
    `INSERT INTO repair_schedules (ticket_id, repair_type, proposed_datetime, location_notes, proposed_by)
     VALUES (?, ?, ?, ?, ?)`,
    [ticket_id, repair_type, proposed_datetime, location_notes || '', user.id]
  );

  await dbRun(env.DB,
    `UPDATE tickets SET status = 'In Progress', updated_at = ? WHERE id = ? AND status = 'Open'`,
    [new Date().toISOString(), ticket_id]
  );

  return jsonResponse({ message: 'Schedule proposed successfully' }, 201);
}

// PATCH /api/schedules/:id - Confirm schedule (IT Staff / Admin only)
export async function onRequestPatch({ request, env, params, data }) {
  const user = data.user;
  if (user.role === 'employee') return jsonResponse({ error: 'Forbidden' }, 403);

  const { confirmed_datetime, status } = await request.json();
  const now = new Date().toISOString();

  await dbRun(env.DB,
    `UPDATE repair_schedules SET confirmed_datetime = COALESCE(?, confirmed_datetime), status = COALESCE(?, status), confirmed_by = ?, updated_at = ? WHERE id = ?`,
    [confirmed_datetime, status, user.id, now, params.id]
  );

  const schedule = await dbFirst(env.DB, 'SELECT * FROM repair_schedules WHERE id = ?', [params.id]);
  return jsonResponse({ message: 'Schedule updated', schedule });
}
