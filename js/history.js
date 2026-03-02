(function () {
  'use strict';

  const historyListEl = document.getElementById('historyList');
  const clearBtn = document.getElementById('clearHistory');
  const HISTORY_KEY = 'plannerHistory';

  function loadHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
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

  function formatHistoryItem(item) {
    const text = escapeHtml(item.text ?? '');
    const time = item.time ? escapeHtml(item.time) : '';
    const priority = item.priority ? escapeHtml(item.priority) : '';

    const parts = [];
    parts.push(`„${text}”`);
    if (time) parts.push(time);
    if (priority) parts.push(priority.charAt(0).toUpperCase() + priority.slice(1));

    return parts.join(' — ');
  }

  function render() {
    if (!historyListEl) return;

    const history = loadHistory();
    if (!history.length) {
      historyListEl.innerHTML = '<p>Nu ai activități finalizate încă.</p>';
      return;
    }

    const ul = document.createElement('ul');
    history.forEach((item) => {
      const li = document.createElement('li');
      li.innerHTML = formatHistoryItem(item);
      ul.appendChild(li);
    });

    historyListEl.innerHTML = '';
    historyListEl.appendChild(ul);
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      localStorage.removeItem(HISTORY_KEY);
      render();
    });
  }

  render();
})();
