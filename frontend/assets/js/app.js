import { initSession, getDefaultRoute, getUser } from './auth.js';
import { getAccessToken, getRefreshToken } from './session-token.js';
import { isInsideTelegramWebApp } from './telegram-env.js';
import { authenticateTelegramUser } from './telegram-login.js';
import { initI18n } from './i18n.js';
import { initTheme } from './theme.js';
import { registerRoute, startRouter, navigate } from './router.js';
import { renderLoginPage } from './pages/login.js';
import { renderAdminDashboard } from './pages/admin-dashboard.js';
import { renderAdminUsers } from './pages/admin-users.js';
import { renderAdminGroups } from './pages/admin-groups.js';
import { renderTeacherDashboard } from './pages/teacher-dashboard.js';
import { renderStudentDashboard } from './pages/student-dashboard.js';
import {
  renderProgressPage,
  renderAttendancePage,
  renderRankingPage,
  renderAnalyticsPage,
  renderGoalsPage,
  renderChatPage,
  renderExportPage,
  renderProfilePage,
} from './pages/features.js';

async function applyUserPreferences(user) {
  if (user?.language) await initI18n(user.language);
  if (user?.theme) initTheme(user.theme);
}

async function bootstrap() {
  if (window.location.pathname === '/telegram') {
    window.history.replaceState(null, '', '/#/login');
  }

  initTheme(localStorage.getItem('theme') || 'dark');
  document.documentElement.classList.toggle('tg-miniapp', isInsideTelegramWebApp());

  registerRoute('/login', renderLoginPage, { public: true });
  registerRoute('/admin', renderAdminDashboard, { roles: ['admin'] });
  registerRoute('/admin/users', renderAdminUsers, { roles: ['admin'] });
  registerRoute('/admin/groups', renderAdminGroups, { roles: ['admin'] });
  registerRoute('/teacher', renderTeacherDashboard, { roles: ['teacher'] });
  registerRoute('/student', renderStudentDashboard, { roles: ['student'] });
  registerRoute('/progress', renderProgressPage, { roles: ['student', 'teacher', 'admin'] });
  registerRoute('/attendance', renderAttendancePage, { roles: ['admin', 'teacher'] });
  registerRoute('/ranking', renderRankingPage, { roles: ['admin', 'teacher', 'student'] });
  registerRoute('/analytics', renderAnalyticsPage, { roles: ['admin', 'teacher', 'student'] });
  registerRoute('/goals', renderGoalsPage, { roles: ['admin', 'teacher', 'student'] });
  registerRoute('/chat', renderChatPage, { roles: ['admin', 'teacher', 'student'] });
  registerRoute('/export', renderExportPage, { roles: ['admin', 'teacher'] });
  registerRoute('/profile', renderProfilePage, { roles: ['admin', 'teacher', 'student'] });

  await initI18n();

  let user = null;

  if (getAccessToken() || getRefreshToken()) {
    user = await initSession();
  }

  if (!user && isInsideTelegramWebApp()) {
    try {
      user = await authenticateTelegramUser();
    } catch (err) {
      console.error('Telegram authentication failed:', err);
    }
  }

  if (user) {
    await applyUserPreferences(user);
    const hash = window.location.hash;
    const onLoginRoute = !hash || hash === '#/' || hash === '#' || hash === '#/login';
    if (onLoginRoute) {
      navigate(getDefaultRoute(user.role));
    }
  } else {
    const hash = window.location.hash;
    if (!hash || hash === '#/' || hash === '#') {
      window.location.hash = '#/login';
    }
  }

  await startRouter();
}

bootstrap().catch((err) => {
  console.error('App bootstrap failed:', err);
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML =
      '<main class="app-content login-page"><div class="card"><p>Failed to load application.</p></main>';
  }
});
