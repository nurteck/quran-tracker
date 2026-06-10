import { apiFetch } from '../api.js';
import { getUser, setUser } from '../auth.js';
import { mountAppLayout, patchAppContent } from '../components/layout.js';
import { renderDataTable } from '../components/data-table.js';
import { showToast } from '../toast.js';
import { t } from '../i18n.js';

function empty(value) {
  return value || '—';
}

function statusBadge(ok) {
  return `<span class="badge ${ok ? 'badge--student' : 'badge--admin'}">${ok ? t('status.yes') : t('status.no')}</span>`;
}

function avatarHtml(user, className = 'user-avatar') {
  const name = user?.display_name || user?.displayName || user?.full_name || user?.fullName || user?.username || '?';
  return `<span class="${className}">${user?.avatar ? `<img src="${user.avatar}" alt="" />` : name[0].toUpperCase()}</span>`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function renderProgressPage(app) {
  const user = getUser();
  let history = [];
  try {
    const data = await apiFetch('/progress/history');
    history = data.history;
  } catch {
    history = [];
  }

  mountAppLayout(app, {
    title: t('progress.title'),
    activePath: user?.role === 'student' ? '/progress' : `/${user?.role}`,
    content: `
      <section class="card feature-card">
        <h2 data-i18n="progress.add">${t('progress.add')}</h2>
        <form id="progress-form" class="inline-form">
          <input name="pageNumber" type="number" min="1" max="604" placeholder="${t('progress.page')}" required />
          <input name="repeatCount" type="number" min="0" placeholder="${t('progress.repetitions')}" value="0" />
          <input name="comment" placeholder="${t('progress.comment')}" />
          <button class="btn btn--primary">${t('common.save')}</button>
        </form>
      </section>
      <section class="card feature-card">
        <h2 data-i18n="progress.history">${t('progress.history')}</h2>
        ${renderDataTable({
          emptyMessage: t('progress.empty'),
          columns: [
            { key: 'date', label: t('progress.date') },
            { key: 'student', label: t('admin.users.roleStudent') },
            { key: 'page', label: t('progress.page') },
            { key: 'repetitions', label: t('progress.repetitions') },
            { key: 'comment', label: t('progress.comment') },
          ],
          rows: history.map((item) => ({
            date: item.reading_date?.slice?.(0, 10),
            student: item.full_name,
            page: item.page_number,
            repetitions: item.repeat_count,
            comment: empty(item.comment),
          })),
        })}
      </section>
    `,
  });

  app.querySelector('#progress-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await apiFetch('/progress', {
      method: 'POST',
      body: JSON.stringify({
        pageNumber: Number(e.target.pageNumber.value),
        repeatCount: Number(e.target.repeatCount.value || 0),
        comment: e.target.comment.value.trim(),
      }),
    });
    showToast(t('progress.saved'));
    renderProgressPage(app);
  });
}

export async function renderAttendancePage(app) {
  const { attendance } = await apiFetch('/attendance');
  mountAppLayout(app, {
    title: t('attendance.title'),
    activePath: '/attendance',
    content: renderDataTable({
      emptyMessage: t('attendance.empty'),
      columns: [
        { key: 'name', label: t('admin.users.fullName') },
        { key: 'today', label: t('attendance.today') },
        { key: 'yesterday', label: t('attendance.yesterday') },
        { key: 'week', label: t('attendance.week') },
      ],
      rows: attendance.map((row) => ({
        name: row.full_name,
        today: statusBadge(Number(row.today) > 0),
        yesterday: statusBadge(Number(row.yesterday) > 0),
        week: row.week,
      })),
    }),
  });
}

export async function renderRankingPage(app) {
  const { ranking } = await apiFetch('/ranking');
  mountAppLayout(app, {
    title: t('ranking.title'),
    activePath: '/ranking',
    content: renderDataTable({
      emptyMessage: t('ranking.empty'),
      columns: [
        { key: 'place', label: '#' },
        { key: 'name', label: t('admin.users.fullName') },
        { key: 'pages', label: t('ranking.pages') },
        { key: 'repetitions', label: t('ranking.repetitions') },
        { key: 'points', label: t('ranking.points') },
      ],
      rows: ranking.map((row, index) => ({
        place: index + 1,
        name: row.full_name,
        pages: row.pages,
        repetitions: row.repetitions,
        points: `<strong>${row.points}</strong>`,
      })),
    }),
  });
}

function renderAnalyticsContent(scope, analytics, summary) {
  const maxActivity = Math.max(...analytics.map((day) => Number(day.pages || 0) + Number(day.repetitions || 0)), 1);
  return `
    <div class="tabs">
      <button type="button" class="tab${scope === 'me' ? ' tab--active' : ''}" data-scope="me">${t('analytics.me')}</button>
      <button type="button" class="tab${scope === 'all' ? ' tab--active' : ''}" data-scope="all">${t('analytics.all')}</button>
    </div>
    <div class="stats-grid">
      <article class="stat-card"><span>${t('analytics.totalPages')}</span><strong>${summary.pages}</strong></article>
      <article class="stat-card"><span>${t('analytics.totalRepetitions')}</span><strong>${summary.repetitions}</strong></article>
      <article class="stat-card"><span>${t('analytics.active')}</span><strong>${summary.activeStudents}</strong></article>
      <article class="stat-card"><span>${t('analytics.bestDay')}</span><strong>${summary.bestDay?.day?.slice?.(0, 10) || '—'}</strong></article>
    </div>
    <section class="card feature-card">
      <h2>${t('analytics.week')}</h2>
      <div class="analytics-list">
        ${analytics.map((day) => {
          const activity = Number(day.pages || 0) + Number(day.repetitions || 0);
          const width = Math.round((activity / maxActivity) * 100);
          return `
            <div class="analytics-row">
              <strong>${day.day?.slice?.(0, 10) || day.day}</strong>
              <div class="analytics-row__bar"><span style="width: ${width}%"></span></div>
              <span>${t('ranking.pages')}: ${day.pages}</span>
              <span>${t('ranking.repetitions')}: ${day.repetitions}</span>
            </div>`;
        }).join('')}
      </div>
    </section>
  `;
}

function bindAnalyticsTabs(app) {
  app.querySelectorAll('[data-scope]').forEach((btn) => {
    btn.addEventListener('click', () => renderAnalyticsPage(app, btn.dataset.scope, { soft: true }));
  });
}

export async function renderAnalyticsPage(app, scopeOrParams = 'me', options = {}) {
  const scope = typeof scopeOrParams === 'string' ? scopeOrParams : 'me';
  const soft = options.soft === true;
  const { analytics, summary } = await apiFetch(`/analytics?scope=${scope}`);
  const content = renderAnalyticsContent(scope, analytics, summary);

  if (soft && patchAppContent(app, content)) {
    bindAnalyticsTabs(app);
    return;
  }

  mountAppLayout(app, {
    title: t('analytics.title'),
    activePath: '/analytics',
    content,
  });
  bindAnalyticsTabs(app);
}

export async function renderGoalsPage(app) {
  const user = getUser();
  const { goals } = await apiFetch('/goals');
  const { groups } = user?.role === 'student' ? { groups: [] } : await apiFetch('/my-groups');
  const canAssign = user?.role === 'teacher' || user?.role === 'admin';
  mountAppLayout(app, {
    title: t('goals.title'),
    activePath: '/goals',
    content: `
      ${canAssign ? `
        <section class="card feature-card">
          <h2>${t('goals.assign')}</h2>
          <form id="goal-form" class="goal-form">
            <input name="title" placeholder="${t('goals.name')}" required />
            <input name="targetPages" type="number" min="0" placeholder="${t('ranking.pages')}" />
            <input name="targetRepetitions" type="number" min="0" placeholder="${t('ranking.repetitions')}" />
            <input name="dueDate" type="date" />
            <select name="groupId" required>
              <option value="">${t('goals.selectGroup')}</option>
              ${groups.map((group) => `<option value="${group.id}">${group.name}</option>`).join('')}
            </select>
            <button class="btn btn--primary">${t('goals.assignButton')}</button>
          </form>
        </section>
      ` : ''}
      ${renderDataTable({
        emptyMessage: t('goals.empty'),
        columns: [
          { key: 'title', label: t('goals.name') },
          { key: 'group', label: t('goals.group') },
          { key: 'assignedBy', label: t('goals.assignedBy') },
          { key: 'target', label: t('goals.target') },
          { key: 'due', label: t('goals.due') },
          { key: 'done', label: canAssign ? t('goals.progress') : t('goals.done') },
          { key: 'actions', label: t('common.actions') },
        ],
        rows: goals.map((goal) => ({
          title: goal.title,
          group: goal.group_name || '—',
          assignedBy: goal.assigned_by_name || '—',
          target: `${goal.target_pages} / ${goal.target_repetitions}`,
          due: empty(goal.due_date?.slice?.(0, 10)),
          done: canAssign
            ? `${goal.done_count || 0} / ${goal.student_count || 0}`
            : statusBadge(goal.is_done),
          actions: goal.owner_id === user?.id
            ? `<button class="btn btn--ghost btn--sm" data-toggle-goal="${goal.id}">${t('goals.toggle')}</button>`
            : '—',
        })),
      })}
    `,
  });
  app.querySelector('#goal-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!e.target.groupId.value) {
      showToast(t('goals.selectGroup'), 'error');
      return;
    }
    await apiFetch('/goals', {
      method: 'POST',
      body: JSON.stringify({
        title: e.target.title.value.trim(),
        targetPages: Number(e.target.targetPages.value || 0),
        targetRepetitions: Number(e.target.targetRepetitions.value || 0),
        dueDate: e.target.dueDate.value || null,
        groupId: e.target.groupId.value,
      }),
    });
    showToast(t('goals.created'));
    renderGoalsPage(app);
  });
  app.querySelectorAll('[data-toggle-goal]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await apiFetch(`/goals/${btn.dataset.toggleGoal}/toggle`, { method: 'PUT' });
      renderGoalsPage(app);
    });
  });
}

function renderChatContent(groups, messages, error, activeGroupId) {
  return `
    <section class="card chat-box">
      <div class="page-toolbar">
        <label class="filter-group">${t('chat.group')}
          <select id="chat-group">
            ${groups.map((group) => `<option value="${group.id}"${group.id === activeGroupId ? ' selected' : ''}>${group.name}</option>`).join('')}
          </select>
        </label>
      </div>
      <div class="chat-list">
        ${error ? `<p class="form-error">${error}</p>` : messages
          .map(
            (msg) => `
              <p class="chat-message">
                ${avatarHtml(msg)}
                <span><strong>${msg.display_name || msg.full_name}</strong><br>${msg.message}</span>
              </p>`
          )
          .join('') || `<p class="text-muted">${activeGroupId ? t('chat.empty') : t('chat.noGroups')}</p>`}
      </div>
      <form id="chat-form" class="inline-form"${activeGroupId ? '' : ' hidden'}>
        <input name="message" placeholder="${t('chat.placeholder')}" required />
        <button class="btn btn--primary">${t('chat.send')}</button>
      </form>
    </section>
  `;
}

let chatPollTimer = null;

function stopChatPolling() {
  if (chatPollTimer) {
    clearInterval(chatPollTimer);
    chatPollTimer = null;
  }
}

function startChatPolling(app, activeGroupId) {
  stopChatPolling();
  if (!activeGroupId) return;

  chatPollTimer = setInterval(async () => {
    if (document.hidden || !window.location.hash.includes('/chat')) {
      stopChatPolling();
      return;
    }
    await renderChatPage(app, activeGroupId, { soft: true, poll: true });
  }, 12_000);
}

function bindChatPage(app, activeGroupId) {
  app.querySelector('#chat-group')?.addEventListener('change', (e) => {
    stopChatPolling();
    renderChatPage(app, e.target.value, { soft: true });
  });
  app.querySelector('#chat-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await apiFetch('/chat', {
      method: 'POST',
      body: JSON.stringify({ groupId: activeGroupId, message: e.target.message.value.trim() }),
    });
    e.target.message.value = '';
    renderChatPage(app, activeGroupId, { soft: true });
  });
  app.__chatPollCleanup = stopChatPolling;
  startChatPolling(app, activeGroupId);
}

export async function renderChatPage(app, selectedGroupIdOrParams = null, options = {}) {
  const selectedGroupId = typeof selectedGroupIdOrParams === 'string' ? selectedGroupIdOrParams : null;
  const soft = options.soft === true;
  const poll = options.poll === true;
  let groups = app.__chatGroups || [];
  let messages = app.__chatMessages || [];
  let error = null;

  if (!poll) {
    try {
      const data = await apiFetch('/my-groups');
      groups = data.groups || [];
      app.__chatGroups = groups;
    } catch (err) {
      error = err.message || t('common.error');
    }
  }

  const activeGroupId = selectedGroupId || groups[0]?.id || '';
  if (activeGroupId && !error) {
    try {
      const lastMessage = messages[messages.length - 1];
      const sinceQuery =
        poll && lastMessage?.created_at
          ? `&since=${encodeURIComponent(lastMessage.created_at)}`
          : '';
      const data = await apiFetch(`/chat?groupId=${activeGroupId}${sinceQuery}`);
      const incoming = data.messages || [];
      if (poll && incoming.length) {
        const known = new Set(messages.map((msg) => msg.id));
        messages = [...messages, ...incoming.filter((msg) => !known.has(msg.id))];
      } else if (!poll) {
        messages = incoming;
      }
      app.__chatMessages = messages;
    } catch (err) {
      if (!poll) error = err.message || t('common.error');
    }
  }

  const content = renderChatContent(groups, messages, error, activeGroupId);
  if (soft && patchAppContent(app, content)) {
    if (!poll) bindChatPage(app, activeGroupId);
    return;
  }

  mountAppLayout(app, {
    title: t('chat.title'),
    activePath: '/chat',
    content,
  });
  bindChatPage(app, activeGroupId);
}

export async function renderAssistantPage(app) {
  mountAppLayout(app, {
    title: t('assistant.title'),
    activePath: '/assistant',
    content: `
      <section class="card feature-card">
        <p class="text-muted">${t('assistant.description')}</p>
        <form id="assistant-form" class="inline-form">
          <input name="prompt" placeholder="${t('assistant.placeholder')}" required />
          <button class="btn btn--primary">${t('assistant.ask')}</button>
        </form>
        <div id="assistant-answer" class="assistant-answer"></div>
      </section>
    `,
  });
  app.querySelector('#assistant-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const answer = app.querySelector('#assistant-answer');
    answer.textContent = t('common.loading');
    const data = await apiFetch('/assistant', {
      method: 'POST',
      body: JSON.stringify({ prompt: e.target.prompt.value.trim() }),
    });
    answer.textContent = data.response;
  });
}

export async function renderExportPage(app) {
  const data = await apiFetch('/export');
  mountAppLayout(app, {
    title: t('export.title'),
    activePath: '/export',
    content: `
      <section class="card feature-card">
        <p>${t('export.count')}: <strong>${data.rows.length}</strong></p>
        <button id="download-json" class="btn btn--primary">${t('export.download')}</button>
      </section>
    `,
  });
  app.querySelector('#download-json')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quran-progress-export.json';
    a.click();
    URL.revokeObjectURL(url);
  });
}

export async function renderProfilePage(app) {
  const user = getUser();
  mountAppLayout(app, {
    title: t('profile.title'),
    activePath: '/profile',
    content: `
      <section class="card feature-card profile-card">
        <div>
          ${avatarHtml(user, 'profile-avatar')}
          <p class="text-muted profile-avatar-hint">${t('profile.avatarHint')}</p>
        </div>
        <form id="profile-form" class="profile-form">
          <label>${t('admin.users.fullName')}<input name="fullName" value="${user?.fullName || ''}" /></label>
          <label>${t('profile.displayName')}<input name="displayName" value="${user?.displayName || ''}" /></label>
          <label>${t('profile.handle')}<input name="handle" value="${user?.handle ? `@${user.handle}` : ''}" /></label>
          <label>${t('profile.avatar')}<input name="avatar" type="file" accept="image/*" /></label>
          <button class="btn btn--primary">${t('common.save')}</button>
        </form>
      </section>
    `,
  });
  app.querySelector('#profile-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      fullName: e.target.fullName.value.trim(),
      displayName: e.target.displayName.value.trim(),
      handle: e.target.handle.value.trim(),
    };
    if (e.target.avatar.files[0]) {
      body.avatar = await readFileAsDataUrl(e.target.avatar.files[0]);
    }
    const { user: updated } = await apiFetch('/profile', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    setUser(updated);
    showToast(t('profile.saved'));
    renderProfilePage(app);
  });
}
