(function () {
  'use strict';

  const SESSION_KEY = 'plannerSession';

  function apiBase() {
    if (window.location && window.location.protocol === 'file:') return null;
    // dacă deja ești pe backend, folosește relative
    if (window.location && window.location.hostname === 'localhost' && window.location.port === '3000') {
      return '';
    }
    // altfel (ex. Live Server), trimite la backend
    return 'http://localhost:3000';
  }

  function apiUrl(path) {
    const base = apiBase();
    if (base === null) return null;
    return `${base}${path}`;
  }

  function plannerRedirectTarget() {
    const path = String(window.location.pathname ?? '').replace(/\\/g, '/');
    const inPagesDir = path.includes('/pages/');
    return inPagesDir ? 'planner.html' : 'pages/planner.html';
  }


  function normalizeEmail(email) {
    return String(email ?? '').trim().toLowerCase();
  }

  function setSession(token, user) {
    const session = {
      token,
      email: user.email,
      name: user.name,
      loggedInAt: new Date().toISOString(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  async function postJson(url, body) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    });

    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      const msg =
        data?.error ||
        (res.status === 404
          ? 'API nu este disponibil. Deschide site-ul pe http://localhost:3000.'
          : 'Eroare server.');
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }

    return data;
  }

  function setError(errorEl, message) {
    if (!errorEl) return;
    errorEl.textContent = message || '';
  }

  function isFileProtocol() {
    return window.location && window.location.protocol === 'file:';
  }

  function showFileProtocolHint(errorEl, formType) {
    if (!isFileProtocol()) return false;
    const page = formType === 'register' ? 'pages/register.html' : 'pages/login.html';
    setError(
      errorEl,
      `Acest formular funcționează doar prin server. Deschide: http://localhost:3000/${page}`
    );
    return true;
  }

  function handleRegister() {
    const form = document.getElementById('registerForm');
    if (!form) return;

    const nameEl = document.getElementById('regName');
    const emailEl = document.getElementById('regEmail');
    const passEl = document.getElementById('regPassword');
    const confirmEl = document.getElementById('regPasswordConfirm');
    const errorEl = document.getElementById('authError');

    if (showFileProtocolHint(errorEl, 'register')) {
      const btn = form.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = String(nameEl?.value ?? '').trim();
      const email = normalizeEmail(emailEl?.value);
      const password = String(passEl?.value ?? '');
      const passwordConfirm = String(confirmEl?.value ?? '');

      if (!name) {
        setError(errorEl, 'Completează câmpul „Nume”.');
        nameEl?.focus();
        return;
      }

      if (!email) {
        setError(errorEl, 'Completează câmpul „Email”.');
        emailEl?.focus();
        return;
      }

      if (password.length < 6) {
        setError(errorEl, 'Parola trebuie să aibă minim 6 caractere.');
        passEl?.focus();
        return;
      }

      if (password !== passwordConfirm) {
        setError(errorEl, 'Parolele nu coincid.');
        confirmEl?.focus();
        return;
      }

      if (isFileProtocol()) {
        showFileProtocolHint(errorEl, 'register');
        return;
      }

      try {
        const url = apiUrl('/api/register');
        if (!url) {
          showFileProtocolHint(errorEl, 'register');
          return;
        }
        const data = await postJson(url, { name, email, password });
        setSession(data.token, data.user);
        window.location.href = plannerRedirectTarget();
      } catch (err) {
        setError(errorEl, err?.message || 'Eroare la înregistrare.');
      }
    });

    [nameEl, emailEl, passEl, confirmEl].forEach((el) => {
      el?.addEventListener('input', () => setError(errorEl, ''));
    });
  }

  function handleLogin() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    const emailEl = document.getElementById('loginEmail');
    const passEl = document.getElementById('loginPassword');
    const errorEl = document.getElementById('authError');

    if (showFileProtocolHint(errorEl, 'login')) {
      const btn = form.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = normalizeEmail(emailEl?.value);
      const password = String(passEl?.value ?? '');

      if (!email) {
        setError(errorEl, 'Completează câmpul „Email”.');
        emailEl?.focus();
        return;
      }

      if (!password) {
        setError(errorEl, 'Completează câmpul „Parolă”.');
        passEl?.focus();
        return;
      }

      if (isFileProtocol()) {
        showFileProtocolHint(errorEl, 'login');
        return;
      }

      try {
        const url = apiUrl('/api/login');
        if (!url) {
          showFileProtocolHint(errorEl, 'login');
          return;
        }
        const data = await postJson(url, { email, password });
        setSession(data.token, data.user);
        window.location.href = plannerRedirectTarget();
      } catch (err) {
        setError(errorEl, err?.message || 'Eroare la logare.');
      }
    });

    [emailEl, passEl].forEach((el) => {
      el?.addEventListener('input', () => setError(errorEl, ''));
    });
  }

  handleRegister();
  handleLogin();
})();
