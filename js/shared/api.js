// Centralized API client for all serverless endpoints
const API_BASE = '/api/data';

async function request(url, options = {}) {
  const token = sessionStorage.getItem('admin_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    sessionStorage.removeItem('admin_token');
    window.dispatchEvent(new CustomEvent('auth-expired'));
    throw new Error('Session expired. Please log in again.');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export async function fetchSection(section) {
  return request(`${API_BASE}/${section}`);
}

export async function createEntry(section, data) {
  return request(`${API_BASE}/${section}`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateEntry(section, id, data) {
  return request(`${API_BASE}/${section}`, {
    method: 'PUT',
    body: JSON.stringify({ id, ...data })
  });
}

export async function deleteEntry(section, id) {
  return request(`${API_BASE}/${section}`, {
    method: 'DELETE',
    body: JSON.stringify({ id })
  });
}

export async function authenticate(password) {
  const res = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Invalid password' }));
    throw new Error(err.error);
  }
  const { token } = await res.json();
  sessionStorage.setItem('admin_token', token);
  return token;
}

export function getToken() {
  return sessionStorage.getItem('admin_token');
}

export function isLoggedIn() {
  return !!sessionStorage.getItem('admin_token');
}

export function logout() {
  sessionStorage.removeItem('admin_token');
}
