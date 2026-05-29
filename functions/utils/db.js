// Database query helpers for Cloudflare D1
export async function dbQuery(db, sql, params = []) {
  const stmt = db.prepare(sql);
  return params.length ? stmt.bind(...params).all() : stmt.all();
}

export async function dbFirst(db, sql, params = []) {
  const stmt = db.prepare(sql);
  return params.length ? stmt.bind(...params).first() : stmt.first();
}

export async function dbRun(db, sql, params = []) {
  const stmt = db.prepare(sql);
  return params.length ? stmt.bind(...params).run() : stmt.run();
}

export function generateTicketNumber() {
  const now = new Date();
  const ymd = now.toISOString().slice(2, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `TKT-${ymd}-${rand}`;
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
