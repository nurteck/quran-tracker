import { apiFetch } from '../api.js';
import { mountAppLayout } from '../components/layout.js';
import { renderStatCard, renderStatGrid } from '../components/stat-card.js';
import { renderDataTable } from '../components/data-table.js';
import { getUser } from '../auth.js';
import { t } from '../i18n.js';

export async function renderAdminDashboard(app) {
  const user = getUser();
  let stats = null;
  let progress = [];
  let error = null;

  mountAppLayout(app, {
    titleKey: 'admin.dashboard.title',
    title: t('admin.dashboard.title'),
    activePath: '/admin',
    content: `<p class="text-muted" data-i18n="common.loading">${t('common.loading')}</p>`,
  });

  try {
    [stats, { progress }] = await Promise.all([
      apiFetch('/stats/admin'),
      apiFetch('/progress/today'),
    ]);
  } catch (err) {
    error = err.message;
  }

  const cards = stats
    ? renderStatGrid([
        renderStatCard({
          icon: '🎓',
          value: stats.totalStudents,
          labelKey: 'admin.stats.students',
          label: t('admin.stats.students'),
        }),
        renderStatCard({
          icon: '👨‍🏫',
          value: stats.totalTeachers,
          labelKey: 'admin.stats.teachers',
          label: t('admin.stats.teachers'),
        }),
        renderStatCard({
          icon: '📚',
          value: stats.totalGroups,
          labelKey: 'admin.stats.groups',
          label: t('admin.stats.groups'),
        }),
        renderStatCard({
          icon: '✅',
          value: stats.checkedInToday,
          labelKey: 'admin.stats.checkedInToday',
          label: t('admin.stats.checkedInToday'),
        }),
      ])
    : '';

  mountAppLayout(app, {
    titleKey: 'admin.dashboard.title',
    title: t('admin.dashboard.title'),
    activePath: '/admin',
    content: `
      <p class="text-muted dashboard-welcome">
        <span data-i18n="admin.dashboard.welcome">${t('admin.dashboard.welcome')}</span>, ${user?.displayName || ''}
      </p>
      ${error ? `<p class="form-error">${error}</p>` : cards}
      <section class="card feature-card">
        <h2 data-i18n="admin.dashboard.todayProgress">${t('admin.dashboard.todayProgress')}</h2>
        ${renderDataTable({
          emptyMessage: t('progress.empty'),
          columns: [
            { key: 'student', label: t('admin.users.roleStudent') },
            { key: 'pages', label: t('ranking.pages') },
            { key: 'repetitions', label: t('ranking.repetitions') },
            { key: 'points', label: t('ranking.points') },
            { key: 'comment', label: t('progress.comment') },
          ],
          rows: progress.map((row) => ({
            student: row.full_name,
            pages: row.pages,
            repetitions: row.repetitions,
            points: `<strong>${row.points}</strong>`,
            comment: row.comment || '—',
          })),
        })}
      </section>
    `,
  });
}
