(function () {
  'use strict';

  const USERS_KEY = 'plannerUsers';
  const SESSION_KEY = 'plannerSession';

  function plannerRedirectTarget() {
    const path = String(window.location.pathname ?? '').replace(/\\/g, '/');
    const inPagesDir = path.includes('/pages/');
    return inPagesDir ? 'planner.html' : 'pages/planner.html';
  }


  function normalizeEmail(email) {
    return String(email ?? '').trim().toLowerCase();
  }

  function loadUsers() {
    try {
      const raw = localStorage.getItem(USERS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function setSession(user) {
    const session = {
      email: user.email,
      name: user.name,
      loggedInAt: new Date().toISOString(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function setError(errorEl, message) {
    if (!errorEl) return;
    errorEl.textContent = message || '';
  }

  function handleRegister() {
    const form = document.getElementById('registerForm');
    if (!form) return;

    const nameEl = document.getElementById('regName');
    const emailEl = document.getElementById('regEmail');
    const passEl = document.getElementById('regPassword');
    const confirmEl = document.getElementById('regPasswordConfirm');
    const errorEl = document.getElementById('authError');

    form.addEventListener('submit', (e) => {
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

      const users = loadUsers();
      const exists = users.some((u) => normalizeEmail(u?.email) === email);
      if (exists) {
        setError(errorEl, 'Există deja un cont cu acest email.');
        emailEl?.focus();
        return;
      }

      const user = { name, email, password };
      saveUsers([user, ...users]);
      setSession(user);

      window.location.href = plannerRedirectTarget();
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

    form.addEventListener('submit', (e) => {
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

      const users = loadUsers();
      const user = users.find((u) => normalizeEmail(u?.email) === email);

      if (!user || user.password !== password) {
        setError(errorEl, 'Email sau parolă incorecte.');
        return;
      }

      setSession(user);
      window.location.href = plannerRedirectTarget();
    });

    [emailEl, passEl].forEach((el) => {
      el?.addEventListener('input', () => setError(errorEl, ''));
    });
  }

  handleRegister();
  handleLogin();
})();
