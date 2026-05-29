import { renderLogin } from './pages/login.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderTickets } from './pages/tickets.js';
import { renderNewTicket } from './pages/newTicket.js';
import { renderTicketDetail } from './pages/ticketDetail.js';
import { getUser, logout } from './utils/auth.js';
import { renderLayout } from './components/layout.js';

const routes = {
  '/': renderDashboard,
  '/tickets': renderTickets,
  '/tickets/new': renderNewTicket,
  '/login': renderLogin,
};

export function navigate(path) {
  history.pushState({}, '', path);
  render();
}

function render() {
  const app = document.getElementById('app');
  const user = getUser();
  const path = window.location.pathname;

  if (!user && path !== '/login') {
    navigate('/login');
    return;
  }

  if (path === '/login') {
    app.innerHTML = '';
    renderLogin(app);
    return;
  }

  // Handle dynamic ticket detail route
  const ticketMatch = path.match(/^\/tickets\/(\d+)$/);
  if (ticketMatch) {
    renderLayout(app, user, (content) => renderTicketDetail(content, ticketMatch[1]));
    return;
  }

  const handler = routes[path] || renderDashboard;
  renderLayout(app, user, handler);
}

window.addEventListener('popstate', render);
window.navigate = navigate;
render();
