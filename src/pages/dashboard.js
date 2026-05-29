import { apiFetch } from '../utils/auth.js';
import { getUser } from '../utils/auth.js';

export async function renderDashboard(content) {
  const user = getUser();
  content.innerHTML = `<div style="color:var(--muted)">Loading dashboard...</div>`;

  if (user.role !== 'employee') {
    const stats = await apiFetch('/dashboard/stats');
    content.innerHTML = `
      <h2 style="margin-bottom:1rem">Dashboard Overview</h2>
      <div class="stats-grid">
        <div class="stat-card" style="border-color:var(--info)">
          <div class="label">Open</div>
          <div class="value" style="color:var(--info)">${stats.counts.open}</div>
        </div>
        <div class="stat-card" style="border-color:var(--warning)">
          <div class="label">In Progress</div>
          <div class="value" style="color:var(--warning)">${stats.counts.in_progress}</div>
        </div>
        <div class="stat-card" style="border-color:var(--success)">
          <div class="label">Resolved</div>
          <div class="value" style="color:var(--success)">${stats.counts.resolved}</div>
        </div>
        <div class="stat-card">
          <div class="label">Closed</div>
          <div class="value">${stats.counts.closed}</div>
        </div>
        <div class="stat-card" style="border-color:var(--accent)">
          <div class="label">Avg Rating</div>
          <div class="value" style="color:var(--accent)">${stats.avg_satisfaction_rating || '—'} ⭐</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
        <div class="card">
          <h3 style="margin-bottom:0.8rem">By Category</h3>
          ${stats.by_category.map(c => `<div style="display:flex;justify-content:space-between;padding:0.35rem 0;border-bottom:1px solid var(--border)">
            <span>${c.category}</span><strong>${c.count}</strong></div>`).join('')}
        </div>
        <div class="card">
          <h3 style="margin-bottom:0.8rem">By Priority</h3>
          ${stats.by_priority.map(p => `<div style="display:flex;justify-content:space-between;padding:0.35rem 0;border-bottom:1px solid var(--border)">
            <span>${p.priority}</span><strong>${p.count}</strong></div>`).join('')}
        </div>
      </div>
    `;
  } else {
    const { tickets } = await apiFetch('/tickets');
    const open = tickets?.filter(t => t.status !== 'Closed' && t.status !== 'Resolved').length || 0;
    content.innerHTML = `
      <h2 style="margin-bottom:1rem">My Tickets</h2>
      <div class="stats-grid">
        <div class="stat-card"><div class="label">Total</div><div class="value">${tickets?.length || 0}</div></div>
        <div class="stat-card" style="border-color:var(--info)"><div class="label">Active</div><div class="value" style="color:var(--info)">${open}</div></div>
      </div>
      <div class="card">
        <p>Welcome, <strong>${user.full_name}</strong>! Use the sidebar to submit or track your IT support tickets.</p>
        <br/>
        <button class="btn btn-primary" onclick="window.navigate('/tickets/new')">➕ Submit New Ticket</button>
      </div>
    `;
  }
}
