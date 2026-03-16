(function () {
  'use strict';

  const SESSION_KEY = 'plannerSession';

  const hintEl = document.getElementById('contactAuthHint');
  const statusEl = document.getElementById('contactStatus');
  const form = document.getElementById('contactForm');
  const messagesListEl = document.getElementById('messagesList');

  const nameEl = document.getElementById('name');
  const emailEl = document.getElementById('email');
  const messageEl = document.getElementById('message');

  const MESSAGES_KEY = 'plannerMessages';

  function apiBase() {
    if (window.location && window.location.protocol === 'file:') return null;
    if (window.location && window.location.hostname === 'localhost' && window.location.port === '3000') {
      return '';
    }
    return 'http://localhost:3000';
  }

  function apiUrl(path) {
    const base = apiBase();
    if (base === null) return null;
    return `${base}${path}`;
  }

  async function getJson(url) {
    const res = await fetch(url);
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    if (!res.ok) {
      const msg = data?.error || 'Eroare server.';
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }
    return data;
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
      const msg = data?.error || 'Eroare server.';
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  function loadSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      const token = String(parsed.token ?? '').trim();
      const email = String(parsed.email ?? '').trim();
      const name = String(parsed.name ?? '').trim();
      if (!token || !email) return null;
      return { token, email, name };
    } catch {
      return null;
    }
  }

  function setDisabled(disabled) {
    [nameEl, emailEl, messageEl].forEach((el) => {
      if (!el) return;
      el.disabled = disabled;
    });

    const btn = form?.querySelector('button[type="submit"]');
    if (btn) btn.disabled = disabled;
  }

  function setText(el, text) {
    if (!el) return;
    el.textContent = text || '';
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (c) => {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      }[c];
    });
  }

  async function renderMessages() {
    if (!messagesListEl) return;
    const session = loadSession();

    if (window.location.protocol === 'file:') {
      messagesListEl.innerHTML = '<p class="contact-note">Pornește serverul Node și deschide site-ul pe http://localhost:3000.</p>';
      return;
    }

    if (!session) {
      messagesListEl.innerHTML = '<p class="contact-note">Loghează-te ca să vezi mesajele.</p>';
      return;
    }

    let msgs = [];
    try {
      const url = apiUrl(`/api/messages?token=${encodeURIComponent(session.token)}`);
      if (!url) {
        messagesListEl.innerHTML = '<p class="contact-note">Pornește serverul Node și deschide site-ul pe http://localhost:3000.</p>';
        return;
      }
      const data = await getJson(url);
      msgs = Array.isArray(data?.messages) ? data.messages : [];
    } catch (err) {
      messagesListEl.innerHTML = `<p class="contact-note">${escapeHtml(err?.message || 'Nu pot încărca mesajele.')}</p>`;
      return;
    }

    if (!msgs.length) {
      messagesListEl.innerHTML = '<p class="contact-note">Nu există mesaje salvate încă.</p>';
      return;
    }

    const ul = document.createElement('ul');
    ul.className = 'messages-ul';

    msgs.slice(0, 10).forEach((m) => {
      const li = document.createElement('li');
      const when = m?.created_at ? escapeHtml(m.created_at) : '';
      const who = m?.email ? escapeHtml(m.email) : '';
      const name = m?.name ? escapeHtml(m.name) : '';
      const text = m?.message ? escapeHtml(m.message) : '';

      li.innerHTML = `
        <div class="msg-head">
          <strong>${name || 'Anonim'}</strong>
          <span class="msg-meta">${who}${when ? ' · ' + when : ''}</span>
        </div>
        <div class="msg-body">${text}</div>
      `.trim();
      ul.appendChild(li);
    });

    messagesListEl.innerHTML = '';
    messagesListEl.appendChild(ul);
  }

  function render() {
    const session = loadSession();

    if (!session) {
      setDisabled(true);
      setText(
        hintEl,
        'Pentru a trimite un mesaj trebuie să fii logat. Mergi la pagina de logare.'
      );
      void renderMessages();
      return;
    }

    setDisabled(false);
    setText(hintEl, `Ești logat ca: ${session.email}`);

    if (nameEl && session.name && !nameEl.value) nameEl.value = session.name;
    if (emailEl && session.email && !emailEl.value) emailEl.value = session.email;

    void renderMessages();
  }

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const session = loadSession();
    if (!session) {
      render();
      return;
    }

    if (window.location.protocol === 'file:') {
      setText(statusEl, 'Pornește serverul Node și deschide site-ul pe http://localhost:3000.');
      return;
    }

    try {
      const url = apiUrl('/api/messages');
      if (!url) {
        setText(statusEl, 'Pornește serverul Node și deschide site-ul pe http://localhost:3000.');
        return;
      }
      await postJson(url, {
        token: session.token,
        name: String(nameEl?.value ?? '').trim(),
        email: String(emailEl?.value ?? '').trim(),
        message: String(messageEl?.value ?? '').trim(),
      });

      setText(statusEl, 'Mesajul a fost trimis (salvat în baza de date).');
      if (messageEl) messageEl.value = '';
      await renderMessages();
    } catch (err) {
      setText(statusEl, err?.message || 'Eroare la trimitere.');
    }
  });

  render();
})();
