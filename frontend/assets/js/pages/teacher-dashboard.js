import { getUser } from '../auth.js';
import { apiFetch } from '../api.js';
import { mountAppLayout } from '../components/layout.js';
import { renderDataTable } from '../components/data-table.js';
import { t } from '../i18n.js';

export async function renderTeacherDashboard(app) {
  const user = getUser();
  const [{ progress }, { attendance }] = await Promise.all([
    apiFetch('/progress/today'),
    apiFetch('/attendance'),
  ]);
  const inactive = attendance.filter((row) => Number(row.today) === 0).length;

  mountAppLayout(app, {
    titleKey: 'teacher.dashboard.title',
    title: t('teacher.dashboard.title'),
    activePath: '/teacher',
    content: `
      <p class="text-muted"><span data-i18n="teacher.dashboard.welcome">${t('teacher.dashboard.welcome')}</span>, ${user?.displayName || ''}</p>
      <div class="stat-grid">
        <article class="stat-card"><span class="stat-card__icon">✓</span><div><p class="stat-card__value">${progress.filter((p) => Number(p.pages) > 0).length}</p><p class="stat-card__label">${t('teacher.activeToday')}</p></div></article>
        <article class="stat-card"><span class="stat-card__icon">!</span><div><p class="stat-card__value">${inactive}</p><p class="stat-card__label">${t('teacher.inactiveToday')}</p></div></article>
      </div>
      <section class="card feature-card">
        <h2>${t('admin.dashboard.todayProgress')}</h2>
        ${renderDataTable({
          emptyMessage: t('progress.empty'),
          columns: [
            { key: 'name', label: t('admin.users.fullName') },
            { key: 'pages', label: t('ranking.pages') },
            { key: 'repetitions', label: t('ranking.repetitions') },
            { key: 'points', label: t('ranking.points') },
          ],
          rows: progress.map((row) => ({
            name: row.full_name,
            pages: row.pages,
            repetitions: row.repetitions,
            points: row.points,
          })),
        })}
      </section>
    `,
  });
}
