import { apiFetch } from '../utils/auth.js';

export function renderLogin(app) {
  app.innerHTML = `
    <div class="login-page">
      <div class="login-box">
        <h2>🏛️ DASMO</h2>
        <p class="subtitle">Iloilo City Government — IT Support Portal</p>
        <div id="login-error" style="color:var(--danger);font-size:0.85rem;margin-bottom:0.8rem;display:none"></div>
        <div class="form-group">
          <label>Email Address</label>
          <input type="email" id="login-email" placeholder="your@iloilocity.gov.ph" />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="password" id="login-pass" placeholder="••••••••" />
        </div>
        <button class="btn btn-primary" style="width:100%" id="login-btn">Sign In</button>
      </div>
    </div>
  `;

  document.getElementById('login-btn').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-pass').value;
    const errEl = document.getElementById('login-error');
    errEl.style.display = 'none';

    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: pass }),
    });

    if (res?.token) {
      localStorage.setItem('dasmo_token', res.token);
      window.navigate('/');
    } else {
      errEl.textContent = res?.error || 'Login failed';
      errEl.style.display = 'block';
    }
  });

  document.getElementById('login-pass').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('login-btn').click();
  });
}
