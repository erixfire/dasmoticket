const API = '/api';

export function getUser() {
  try {
    const token = localStorage.getItem('dasmo_token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp < Math.floor(Date.now() / 1000)) { logout(); return null; }
    return payload;
  } catch { return null; }
}

export function getToken() {
  return localStorage.getItem('dasmo_token');
}

export function logout() {
  localStorage.removeItem('dasmo_token');
  window.navigate('/login');
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) { logout(); return; }
  return res.json();
}
