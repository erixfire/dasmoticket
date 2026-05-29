import { dbFirst, dbQuery, jsonResponse } from '../../utils/db.js';

// GET /api/dashboard/stats - Admin/IT Staff summary
export async function onRequestGet({ env, data }) {
  const user = data.user;
  if (user.role === 'employee') return jsonResponse({ error: 'Forbidden' }, 403);

  const open = await dbFirst(env.DB, `SELECT COUNT(*) as count FROM tickets WHERE status = 'Open'`);
  const inProgress = await dbFirst(env.DB, `SELECT COUNT(*) as count FROM tickets WHERE status = 'In Progress'`);
  const resolved = await dbFirst(env.DB, `SELECT COUNT(*) as count FROM tickets WHERE status = 'Resolved'`);
  const closed = await dbFirst(env.DB, `SELECT COUNT(*) as count FROM tickets WHERE status = 'Closed'`);

  const { results: byCategory } = await dbQuery(env.DB,
    `SELECT category, COUNT(*) as count FROM tickets GROUP BY category ORDER BY count DESC`);

  const { results: byPriority } = await dbQuery(env.DB,
    `SELECT priority, COUNT(*) as count FROM tickets GROUP BY priority ORDER BY count DESC`);

  const avgRating = await dbFirst(env.DB, `SELECT AVG(rating) as avg FROM surveys`);

  return jsonResponse({
    counts: { open: open.count, in_progress: inProgress.count, resolved: resolved.count, closed: closed.count },
    by_category: byCategory,
    by_priority: byPriority,
    avg_satisfaction_rating: Math.round((avgRating.avg || 0) * 10) / 10,
  });
}
