import { getUser, logout } from '../utils/auth.js';

export function renderLayout(app, user, contentFn) {
  app.innerHTML = `
    <aside class="sidebar">
      <div class="logo">DASMO <span>IT</span></div>
      <nav>
        <a href="/" onclick="navigate('/');return false;" class="${location.pathname==='/'?'active':''}">🏠 <span>Dashboard</span></a>
        <a href="/tickets" onclick="navigate('/tickets');return false;" class="${location.pathname.startsWith('/tickets')&&location.pathname!=='/tickets/new'?'active':''}">🎫 <span>Tickets</span></a>
        <a href="/tickets/new" onclick="navigate('/tickets/new');return false;">➕ <span>New Ticket</span></a>
        ${user.role !== 'employee' ? '<a href="/admin" onclick="navigate(\'/admin\');return false;">⚙️ <span>Admin</span></a>' : ''}
      </nav>
      <div class="user-info">
        <div style="font-weight:600">${user.full_name}</div>
        <div style="color:rgba(255,255,255,0.6);text-transform:capitalize">${user.role.replace('_',' ')}</div>
        <button class="btn btn-outline" style="margin-top:0.6rem;color:#fff;border-color:rgba(255,255,255,0.4);width:100%" onclick="window._logout()">Logout</button>
      </div>
    </aside>
    <div class="main">
      <div class="topbar">
        <span style="font-weight:600;color:var(--primary)">Iloilo City Government — IT Support Portal</span>
        <span style="color:var(--muted);font-size:0.82rem">${new Date().toLocaleDateString('en-PH',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</span>
      </div>
      <div class="content" id="main-content"></div>
    </div>
  `;
  window._logout = logout;
  contentFn(document.getElementById('main-content'));
}
