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

  function loadSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      const email = String(parsed.email ?? '').trim();
      const name = String(parsed.name ?? '').trim();
      if (!email) return null;
      return { email, name };
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

  function loadMessages() {
    try {
      const raw = localStorage.getItem(MESSAGES_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function renderMessages() {
    if (!messagesListEl) return;
    const msgs = loadMessages();

    if (!msgs.length) {
      messagesListEl.innerHTML = '<p class="contact-note">Nu există mesaje salvate încă.</p>';
      return;
    }

    const ul = document.createElement('ul');
    ul.className = 'messages-ul';

    msgs.slice(0, 10).forEach((m) => {
      const li = document.createElement('li');
      const when = m?.createdAt ? escapeHtml(m.createdAt) : '';
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
      renderMessages();
      return;
    }

    setDisabled(false);
    setText(hintEl, `Ești logat ca: ${session.email}`);

    if (nameEl && session.name && !nameEl.value) nameEl.value = session.name;
    if (emailEl && session.email && !emailEl.value) emailEl.value = session.email;

    renderMessages();
  }

  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const session = loadSession();
    if (!session) {
      render();
      return;
    }

    setText(statusEl, 'Mesajul a fost trimis (salvat local).');

    // Demo pentru Lab: salvăm mesajul local
    try {
      const arr = loadMessages();

      arr.unshift({
        name: String(nameEl?.value ?? '').trim(),
        email: String(emailEl?.value ?? '').trim(),
        message: String(messageEl?.value ?? '').trim(),
        createdAt: new Date().toISOString(),
      });

      localStorage.setItem(MESSAGES_KEY, JSON.stringify(arr));
    } catch {
      // ignore
    }

    if (messageEl) messageEl.value = '';
    renderMessages();
  });

  render();
})();
