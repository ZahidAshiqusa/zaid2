// Admin password gate and token management
import { authenticate, isLoggedIn, logout } from './api.js';
import { ICONS } from './utils.js';

export function showPasswordGate(onSuccess) {
  if (isLoggedIn()) {
    onSuccess();
    return;
  }

  const gate = document.createElement('div');
  gate.className = 'password-gate';
  gate.id = 'password-gate';
  gate.innerHTML = `
    <div class="password-card">
      <div class="app-logo">
        ${ICONS.shield}
      </div>
      <h2>Admin Access</h2>
      <p>Enter the admin password to continue</p>
      <div class="form-group">
        <input type="password" class="form-input" id="admin-password" placeholder="Enter password..." autofocus>
      </div>
      <div id="auth-error" style="color:var(--danger);font-size:0.8rem;margin-bottom:12px;display:none;"></div>
      <button class="btn btn-primary" id="auth-submit" style="width:100%;">
        ${ICONS.login} Authenticate
      </button>
      <div style="margin-top:16px;">
        <a href="/index.html" style="font-size:0.8rem;color:var(--text-muted);">Back to Dashboard</a>
      </div>
    </div>
  `;

  document.body.appendChild(gate);

  const input = gate.querySelector('#admin-password');
  const submit = gate.querySelector('#auth-submit');
  const errorEl = gate.querySelector('#auth-error');

  async function tryAuth() {
    const pwd = input.value.trim();
    if (!pwd) {
      errorEl.textContent = 'Please enter a password';
      errorEl.style.display = 'block';
      return;
    }

    submit.disabled = true;
    submit.innerHTML = '<span class="loading-spinner"></span> Authenticating...';
    errorEl.style.display = 'none';

    try {
      await authenticate(pwd);
      gate.remove();
      onSuccess();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = 'block';
      submit.disabled = false;
      submit.innerHTML = `${ICONS.login} Authenticate`;
      input.value = '';
      input.focus();
    }
  }

  submit.addEventListener('click', tryAuth);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') tryAuth();
  });
}

export function setupLogout() {
  const btn = document.getElementById('logout-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      logout();
      location.reload();
    });
  }
}

// Listen for auth expiration
window.addEventListener('auth-expired', () => {
  showPasswordGate(() => location.reload());
});
