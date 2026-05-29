import { dbFirst, dbRun, jsonResponse } from '../../utils/db.js';

// GET /api/surveys?ticket_id= - Check if survey exists for ticket
export async function onRequestGet({ request, env, data }) {
  const url = new URL(request.url);
  const ticket_id = url.searchParams.get('ticket_id');
  if (!ticket_id) return jsonResponse({ error: 'ticket_id required' }, 400);

  const survey = await dbFirst(env.DB, 'SELECT * FROM surveys WHERE ticket_id = ?', [ticket_id]);
  return jsonResponse({ survey: survey || null });
}

// POST /api/surveys - Submit after-work survey
export async function onRequestPost({ request, env, data }) {
  const user = data.user;
  const { ticket_id, rating, comments } = await request.json();

  if (!ticket_id || !rating) return jsonResponse({ error: 'ticket_id and rating required' }, 400);
  if (rating < 1 || rating > 5) return jsonResponse({ error: 'Rating must be 1-5' }, 400);

  const ticket = await dbFirst(env.DB, 'SELECT * FROM tickets WHERE id = ? AND status = "Resolved"', [ticket_id]);
  if (!ticket) return jsonResponse({ error: 'Ticket not found or not yet resolved' }, 404);
  if (ticket.requester_id !== user.id) return jsonResponse({ error: 'Forbidden' }, 403);

  const existing = await dbFirst(env.DB, 'SELECT id FROM surveys WHERE ticket_id = ?', [ticket_id]);
  if (existing) return jsonResponse({ error: 'Survey already submitted' }, 409);

  await dbRun(env.DB,
    'INSERT INTO surveys (ticket_id, respondent_id, rating, comments) VALUES (?, ?, ?, ?)',
    [ticket_id, user.id, rating, comments || '']
  );

  await dbRun(env.DB,
    `UPDATE tickets SET status = 'Closed', closed_at = ?, updated_at = ? WHERE id = ?`,
    [new Date().toISOString(), new Date().toISOString(), ticket_id]
  );

  return jsonResponse({ message: 'Survey submitted. Thank you for your feedback!' }, 201);
}
