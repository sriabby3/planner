(function () {
  'use strict';

  const form = document.querySelector('form');
  const taskListEl = document.getElementById('taskList');
  const textInput = document.getElementById('taskText');
  const timeInput = document.getElementById('taskTime');
  const prioritySelect = document.getElementById('taskPriority');

  const STORAGE_KEY = 'plannerTasks';

  function loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveTasks(tasks) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
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

  function upsertEmptyState() {
    const tasks = loadTasks();
    if (tasks.length) return;
    taskListEl.innerHTML = '<p>Încă nu ai activități adăugate.</p>';
  }

  function setTaskDone(id, done) {
    const tasks = loadTasks();
    const next = tasks.map((t) => (t.id === id ? { ...t, done: !!done } : t));
    saveTasks(next);
    render();
  }

  function deleteTask(id) {
    const tasks = loadTasks().filter((t) => t.id !== id);
    saveTasks(tasks);
    render();
  }

  function createTaskElement(task) {
    const li = document.createElement('li');
    li.dataset.id = task.id;
    if (task.done) li.classList.add('is-done');

    const left = document.createElement('div');
    left.className = 'task-left';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'task-done';
    checkbox.id = `task-done-${task.id}`;
    checkbox.checked = !!task.done;
    checkbox.setAttribute('aria-label', `Marchează ca gata: ${task.text}`);
    checkbox.addEventListener('change', () => {
      setTaskDone(task.id, checkbox.checked);
    });

    const checkboxLabel = document.createElement('label');
    checkboxLabel.className = 'task-done-label';
    checkboxLabel.htmlFor = checkbox.id;
    checkboxLabel.textContent = 'Gata';

    const content = document.createElement('div');
    content.className = 'task-content';

    const title = document.createElement('span');
    title.className = 'task-title';
    title.innerHTML = `<strong>${escapeHtml(task.text)}</strong>`;

    const meta = document.createElement('span');
    meta.className = 'meta';

    const time = task.time ? escapeHtml(task.time) : '';
    const priority = task.priority ? escapeHtml(task.priority) : '';

    if (time && priority) {
      meta.textContent = `${time} · Prioritate: ${priority}`;
    } else if (time) {
      meta.textContent = time;
    } else if (priority) {
      meta.textContent = `Prioritate: ${priority}`;
    } else {
      meta.textContent = '';
    }

    content.appendChild(title);
    if (meta.textContent) content.appendChild(meta);

    left.appendChild(checkbox);
    left.appendChild(checkboxLabel);
    left.appendChild(content);

    const del = document.createElement('button');
    del.type = 'button';
    del.textContent = 'Șterge';
    del.addEventListener('click', () => {
      deleteTask(task.id);
    });

    li.appendChild(left);
    li.appendChild(del);

    return li;
  }

  function render() {
    const tasks = loadTasks();

    if (!tasks.length) {
      upsertEmptyState();
      return;
    }

    const ul = document.createElement('ul');
    tasks.forEach((task) => {
      ul.appendChild(createTaskElement(task));
    });

    taskListEl.innerHTML = '';
    taskListEl.appendChild(ul);
  }

  function addTaskFromForm() {
    const text = (textInput?.value ?? '').trim();
    if (!text) return;

    const time = timeInput?.value ?? '';
    const priority = prioritySelect?.value ?? '';

    const tasks = loadTasks();
    const id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : Date.now().toString();

    const task = {
      id,
      text,
      time,
      priority,
      done: false,
    };

    tasks.push(task);
    saveTasks(tasks);

    form.reset();
    render();

    textInput?.focus();
  }

  if (!form || !taskListEl || !textInput || !timeInput || !prioritySelect) {
    return;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    addTaskFromForm();
  });

  render();
})();
