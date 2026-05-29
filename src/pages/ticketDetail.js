import { apiFetch } from '../utils/auth.js';
import { getUser } from '../utils/auth.js';

export async function renderTicketDetail(content, id) {
  const user = getUser();
  content.innerHTML = `<div style="color:var(--muted)">Loading ticket...</div>`;
  const data = await apiFetch(`/tickets/${id}`);
  if (!data?.ticket) { content.innerHTML = '<p>Ticket not found.</p>'; return; }
  const { ticket, notes } = data;

  const surveySection = ticket.status === 'Resolved' && user.role === 'employee' ? `
    <div class="card" style="margin-top:1rem;border:2px solid var(--accent)">
      <h3>⭐ Rate This Service</h3>
      <p style="color:var(--muted);font-size:0.85rem;margin:0.4rem 0 0.8rem">Your ticket has been resolved. Please rate the service.</p>
      <div class="star-rating" id="stars">
        ${[1,2,3,4,5].map(i => `<span class="star" data-v="${i}">★</span>`).join('')}
      </div>
      <textarea id="survey-comment" placeholder="Optional comments..." style="margin-top:0.8rem"></textarea>
      <button class="btn btn-accent" style="margin-top:0.6rem" id="survey-submit">Submit Feedback</button>
      <div id="survey-msg" style="display:none;margin-top:0.6rem"></div>
    </div>` : '';

  content.innerHTML = `
    <button class="btn btn-outline" style="margin-bottom:1rem" onclick="window.navigate('/tickets')">← Back</button>
    <div style="display:grid;grid-template-columns:2fr 1fr;gap:1rem">
      <div>
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div>
              <h2>${ticket.title}</h2>
              <code style="color:var(--muted);font-size:0.82rem">${ticket.ticket_number}</code>
            </div>
            <span class="badge badge-${ticket.status.toLowerCase().replace(' ','')}">${ticket.status}</span>
          </div>
          <p style="margin:1rem 0;color:var(--muted)">${ticket.description || 'No description provided.'}</p>
          <div style="display:flex;gap:1rem;flex-wrap:wrap">
            <span>📂 ${ticket.category}</span>
            <span>🚦 ${ticket.priority}</span>
            <span>👤 ${ticket.requester_name}</span>
            <span>🏢 ${ticket.department_name || '—'}</span>
          </div>
        </div>

        ${user.role !== 'employee' ? `
        <div class="card" style="margin-top:1rem">
          <h3>Update Ticket</h3>
          <div class="form-group" style="margin-top:0.8rem">
            <label>Status</label>
            <select id="upd-status">
              ${['Open','In Progress','Resolved','Closed'].map(s => `<option${s===ticket.status?' selected':''}>${s}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Internal Note</label>
            <textarea id="upd-note" placeholder="Add an internal note..."></textarea>
          </div>
          <button class="btn btn-primary" id="upd-btn">Update</button>
          <div id="upd-msg" style="display:none;margin-top:0.6rem"></div>
        </div>` : ''}

        ${surveySection}

        <div class="card" style="margin-top:1rem">
          <h3>Activity Notes</h3>
          ${(notes||[]).length === 0 ? '<p style="color:var(--muted)">No notes yet.</p>' :
            notes.map(n => `<div style="padding:0.6rem 0;border-bottom:1px solid var(--border)">
              <strong>${n.author}</strong> <span style="color:var(--muted);font-size:0.8rem">${new Date(n.created_at).toLocaleString('en-PH')}</span>
              <p style="margin-top:0.3rem">${n.note}</p></div>`).join('')}
        </div>
      </div>

      <div>
        <div class="card">
          <h3>Schedule Repair</h3>
          <div class="form-group" style="margin-top:0.8rem">
            <label>Repair Type</label>
            <select id="sch-type"><option value="Onsite">🏢 Onsite (at your dept.)</option><option value="Offsite">🔧 Offsite (bring to IT office)</option></select>
          </div>
          <div class="form-group">
            <label>Proposed Date & Time</label>
            <input type="datetime-local" id="sch-dt" />
          </div>
          <div class="form-group">
            <label>Location Notes</label>
            <input type="text" id="sch-notes" placeholder="e.g. Room 203, 2nd floor" />
          </div>
          <button class="btn btn-accent" id="sch-btn">Propose Schedule</button>
          <div id="sch-msg" style="display:none;margin-top:0.6rem"></div>
        </div>
      </div>
    </div>
  `;

  // Update ticket handler
  document.getElementById('upd-btn')?.addEventListener('click', async () => {
    const status = document.getElementById('upd-status').value;
    const note = document.getElementById('upd-note').value;
    const msg = document.getElementById('upd-msg');
    const res = await apiFetch(`/tickets/${id}`, { method: 'PATCH', body: JSON.stringify({ status, note }) });
    msg.style.display = 'block';
    if (res?.ticket) { msg.style.color = 'var(--success)'; msg.textContent = '✅ Ticket updated!'; setTimeout(() => renderTicketDetail(content, id), 1000); }
    else { msg.style.color = 'var(--danger)'; msg.textContent = res?.error || 'Update failed'; }
  });

  // Schedule handler
  document.getElementById('sch-btn').addEventListener('click', async () => {
    const repair_type = document.getElementById('sch-type').value;
    const proposed_datetime = document.getElementById('sch-dt').value;
    const location_notes = document.getElementById('sch-notes').value;
    const msg = document.getElementById('sch-msg');
    const res = await apiFetch('/schedules', { method: 'POST', body: JSON.stringify({ ticket_id: parseInt(id), repair_type, proposed_datetime, location_notes }) });
    msg.style.display = 'block';
    if (res?.message) { msg.style.color = 'var(--success)'; msg.textContent = '📅 ' + res.message; }
    else { msg.style.color = 'var(--danger)'; msg.textContent = res?.error || 'Schedule failed'; }
  });

  // Survey stars
  const stars = document.querySelectorAll('.star');
  let selectedRating = 0;
  stars.forEach(star => {
    star.addEventListener('mouseenter', () => stars.forEach(s => s.classList.toggle('active', s.dataset.v <= star.dataset.v)));
    star.addEventListener('click', () => { selectedRating = parseInt(star.dataset.v); stars.forEach(s => s.classList.toggle('active', s.dataset.v <= star.dataset.v)); });
  });
  document.getElementById('stars')?.addEventListener('mouseleave', () => stars.forEach(s => s.classList.toggle('active', s.dataset.v <= selectedRating)));

  document.getElementById('survey-submit')?.addEventListener('click', async () => {
    const comments = document.getElementById('survey-comment').value;
    const msg = document.getElementById('survey-msg');
    if (!selectedRating) { msg.style.cssText = 'display:block;color:var(--danger)'; msg.textContent = 'Please select a rating.'; return; }
    const res = await apiFetch('/surveys', { method: 'POST', body: JSON.stringify({ ticket_id: parseInt(id), rating: selectedRating, comments }) });
    msg.style.display = 'block';
    if (res?.message) { msg.style.color = 'var(--success)'; msg.textContent = '✅ ' + res.message; }
    else { msg.style.color = 'var(--danger)'; msg.textContent = res?.error || 'Submission failed'; }
  });
}
