import { getUser } from '../auth.js';
import { apiFetch } from '../api.js';
import { mountAppLayout } from '../components/layout.js';
import { t } from '../i18n.js';

export async function renderStudentDashboard(app) {
  const user = getUser();
  const [{ progress }, { goals }] = await Promise.all([
    apiFetch('/progress/today'),
    apiFetch('/goals'),
  ]);
  const me = progress[0] || { pages: 0, repetitions: 0, points: 0 };
  mountAppLayout(app, {
    titleKey: 'student.dashboard.title',
    title: t('student.dashboard.title'),
    activePath: '/student',
    content: `
      <p class="text-muted"><span data-i18n="student.dashboard.welcome">${t('student.dashboard.welcome')}</span>, ${user?.displayName || ''}</p>
      <div class="stat-grid">
        <article class="stat-card"><span class="stat-card__icon">📖</span><div><p class="stat-card__value">${me.pages}</p><p class="stat-card__label">${t('ranking.pages')}</p></div></article>
        <article class="stat-card"><span class="stat-card__icon">↻</span><div><p class="stat-card__value">${me.repetitions}</p><p class="stat-card__label">${t('ranking.repetitions')}</p></div></article>
        <article class="stat-card"><span class="stat-card__icon">★</span><div><p class="stat-card__value">${me.points}</p><p class="stat-card__label">${t('ranking.points')}</p></div></article>
      </div>
      <section class="card feature-card">
        <h2>${t('goals.title')}</h2>
        <p class="text-muted">${goals.filter((goal) => !goal.is_done).length} ${t('goals.active')}</p>
        <a class="btn btn--primary" href="#/progress">${t('progress.add')}</a>
      </section>
    `,
  });
}
