import { getUser } from '../auth.js';
import { t } from '../i18n.js';

const ADMIN_LINKS = [
  { path: '#/admin', labelKey: 'nav.dashboard', icon: '▦' },
  { path: '#/admin/users', labelKey: 'nav.users', icon: '👥' },
  { path: '#/admin/groups', labelKey: 'nav.groups', icon: '◎' },
  { path: '#/attendance', labelKey: 'nav.attendance', icon: '☑' },
  { path: '#/goals', labelKey: 'nav.goals', icon: '◎' },
  { path: '#/analytics', labelKey: 'nav.analytics', icon: '▥' },
  { path: '#/chat', labelKey: 'nav.chat', icon: '○' },
  { path: '#/export', labelKey: 'nav.export', icon: '⇩' },
  { path: '#/ranking', labelKey: 'nav.ranking', icon: '♕' },
  { path: '#/profile', labelKey: 'nav.profile', icon: '☻' },
];

const TEACHER_LINKS = [
  { path: '#/teacher', labelKey: 'nav.dashboard', icon: '▦' },
  { path: '#/attendance', labelKey: 'nav.attendance', icon: '☑' },
  { path: '#/goals', labelKey: 'nav.goals', icon: '◎' },
  { path: '#/analytics', labelKey: 'nav.analytics', icon: '▥' },
  { path: '#/chat', labelKey: 'nav.chat', icon: '○' },
  { path: '#/ranking', labelKey: 'nav.ranking', icon: '♕' },
  { path: '#/profile', labelKey: 'nav.profile', icon: '☻' },
];

const STUDENT_LINKS = [
  { path: '#/student', labelKey: 'nav.dashboard', icon: '▦' },
  { path: '#/progress', labelKey: 'nav.progress', icon: '✓' },
  { path: '#/goals', labelKey: 'nav.goals', icon: '◎' },
  { path: '#/analytics', labelKey: 'nav.analytics', icon: '▥' },
  { path: '#/chat', labelKey: 'nav.chat', icon: '○' },
  { path: '#/ranking', labelKey: 'nav.ranking', icon: '♕' },
  { path: '#/profile', labelKey: 'nav.profile', icon: '☻' },
];

function getLinks(role) {
  if (role === 'admin') return ADMIN_LINKS;
  if (role === 'teacher') return TEACHER_LINKS;
  if (role === 'student') return STUDENT_LINKS;
  return [];
}

export function renderSidebar(activePath) {
  const user = getUser();
  const links = getLinks(user?.role);

  const items = links
    .map(
      (link) => `
      <a href="${link.path}" class="sidebar__link${activePath === link.path.replace('#', '') ? ' sidebar__link--active' : ''}">
        <span class="sidebar__icon" aria-hidden="true">${link.icon}</span>
        <span data-i18n="${link.labelKey}">${t(link.labelKey)}</span>
      </a>`
    )
    .join('');

  return `
    <aside class="sidebar" aria-label="Navigation">
      <div class="sidebar__brand">
        <img class="sidebar__logo-img" src="/public/logo.svg" alt="" aria-hidden="true" />
        <span>
          <span class="sidebar__title">Quran Tracker</span>
          <span class="sidebar__role">${user?.role || ''}</span>
        </span>
      </div>
      <nav class="sidebar__nav">${items}</nav>
      <div class="sidebar__user">
        <span class="sidebar__avatar" aria-hidden="true">${
          user?.avatar
            ? `<img src="${user.avatar}" alt="" />`
            : (user?.displayName || user?.username || '?')[0].toUpperCase()
        }</span>
        <span>
          <span class="sidebar__name">${user?.displayName || user?.username || ''}</span>
          <span class="sidebar__handle">${user?.handle ? `@${user.handle}` : ''}</span>
        </span>
      </div>
    </aside>
  `;
}

export function renderBottomNav(activePath) {
  const user = getUser();
  const links = getLinks(user?.role).slice(0, 5);

  const items = links
    .map(
      (link) => `
      <a href="${link.path}" class="bottom-nav__link${activePath === link.path.replace('#', '') ? ' bottom-nav__link--active' : ''}">
        <span class="bottom-nav__icon" aria-hidden="true">${link.icon}</span>
        <span data-i18n="${link.labelKey}">${t(link.labelKey)}</span>
      </a>`
    )
    .join('');

  return `<nav class="bottom-nav" aria-label="Navigation">${items}</nav>`;
}
