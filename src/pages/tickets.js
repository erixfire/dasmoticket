import { apiFetch } from '../utils/auth.js';

const statusBadge = (s) => {
  const map = { 'Open':'open','In Progress':'progress','Resolved':'resolved','Closed':'closed' };
  return `<span class="badge badge-${map[s] || 'open'}">${s}</span>`;
};
const priorityBadge = (p) => `<span class="badge badge-${p?.toLowerCase()}">${p}</span>`;

export async function renderTickets(content) {
  content.innerHTML = `<div style="color:var(--muted)">Loading tickets...</div>`;
  const { tickets } = await apiFetch('/tickets');

  content.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
      <h2>All Tickets</h2>
      <button class="btn btn-primary" onclick="window.navigate('/tickets/new')">➕ New Ticket</button>
    </div>
    <div class="card table-wrap">
      <table>
        <thead><tr><th>Ticket #</th><th>Title</th><th>Category</th><th>Priority</th><th>Status</th><th>Requested By</th><th>Assigned To</th><th>Created</th><th></th></tr></thead>
        <tbody>
          ${(tickets || []).map(t => `
            <tr>
              <td><code>${t.ticket_number}</code></td>
              <td>${t.title}</td>
              <td>${t.category}</td>
              <td>${priorityBadge(t.priority)}</td>
              <td>${statusBadge(t.status)}</td>
              <td>${t.requester_name || '—'}</td>
              <td>${t.assignee_name || '<span style="color:var(--muted)">Unassigned</span>'}</td>
              <td>${new Date(t.created_at).toLocaleDateString('en-PH')}</td>
              <td><button class="btn btn-outline" onclick="window.navigate('/tickets/${t.id}')">View</button></td>
            </tr>`).join('') || '<tr><td colspan="9" style="text-align:center;color:var(--muted)">No tickets found.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}
