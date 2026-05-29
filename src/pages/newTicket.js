import { apiFetch } from '../utils/auth.js';

export function renderNewTicket(content) {
  content.innerHTML = `
    <div style="max-width:600px">
      <h2 style="margin-bottom:1.2rem">Submit New Ticket</h2>
      <div class="card">
        <div id="form-msg" style="display:none;margin-bottom:1rem"></div>
        <div class="form-group">
          <label>Issue Title *</label>
          <input type="text" id="t-title" placeholder="Brief description of the issue" />
        </div>
        <div class="form-group">
          <label>Category *</label>
          <select id="t-cat">
            <option value="">Select category...</option>
            <option>Hardware</option><option>Software</option>
            <option>Network</option><option>Account</option><option>Other</option>
          </select>
        </div>
        <div class="form-group">
          <label>Priority</label>
          <select id="t-priority">
            <option value="Low">Low</option>
            <option value="Medium" selected>Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </div>
        <div class="form-group">
          <label>Detailed Description</label>
          <textarea id="t-desc" placeholder="Describe the issue in detail..."></textarea>
        </div>
        <div style="display:flex;gap:0.8rem">
          <button class="btn btn-primary" id="submit-btn">Submit Ticket</button>
          <button class="btn btn-outline" onclick="window.navigate('/tickets')">Cancel</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('submit-btn').addEventListener('click', async () => {
    const title = document.getElementById('t-title').value.trim();
    const category = document.getElementById('t-cat').value;
    const priority = document.getElementById('t-priority').value;
    const description = document.getElementById('t-desc').value.trim();
    const msg = document.getElementById('form-msg');

    if (!title || !category) {
      msg.style.cssText = 'display:block;color:var(--danger);background:#fdedec;padding:0.6rem;border-radius:6px';
      msg.textContent = 'Title and category are required.';
      return;
    }

    const res = await apiFetch('/tickets', { method: 'POST', body: JSON.stringify({ title, category, priority, description }) });
    if (res?.ticket) {
      msg.style.cssText = 'display:block;color:var(--success);background:#eafaf1;padding:0.6rem;border-radius:6px';
      msg.textContent = `✅ Ticket ${res.ticket.ticket_number} submitted successfully!`;
      setTimeout(() => window.navigate('/tickets'), 1500);
    } else {
      msg.style.cssText = 'display:block;color:var(--danger);background:#fdedec;padding:0.6rem;border-radius:6px';
      msg.textContent = res?.error || 'Failed to submit ticket.';
    }
  });
}
