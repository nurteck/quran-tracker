import {
  initSession,
  getDefaultRoute,
  loginWithTelegramMiniApp,
} from './auth.js';
import { getAccessToken } from './session-token.js';
import {
  isTelegramMiniApp,
  waitForTelegramInitData,
  prepareTelegramWebApp,
} from './telegram-env.js';
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

async function tryAutoTelegramLogin() {
  if (!isTelegramMiniApp()) return null;
  const initData = await waitForTelegramInitData();
  if (!initData) return null;
  prepareTelegramWebApp();
  return loginWithTelegramMiniApp(initData);
}

async function applyUserPreferences(user) {
  if (user?.language) await initI18n(user.language);
  if (user?.theme) initTheme(user.theme);
}

async function bootstrap() {
  if (window.location.pathname === '/telegram') {
    window.history.replaceState(null, '', '/#/login');
  }

  initTheme(localStorage.getItem('theme') || 'dark');
  document.documentElement.classList.toggle('tg-miniapp', isTelegramMiniApp());

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

  const hash = window.location.hash;
  const onLoginRoute = !hash || hash === '#/' || hash === '#' || hash === '#/login';

  let user = null;

  if (getAccessToken()) {
    user = await initSession();
  }

  if (!user && isTelegramMiniApp()) {
    try {
      user = await tryAutoTelegramLogin();
    } catch (err) {
      console.error('Auto Telegram login failed:', err);
    }
  }

  if (user) {
    await applyUserPreferences(user);
    if (onLoginRoute) {
      navigate(getDefaultRoute(user.role));
    }
  } else if (!hash || hash === '#/' || hash === '#') {
    window.location.hash = '#/login';
  }

  await startRouter();
}

bootstrap().catch((err) => {
  console.error('App bootstrap failed:', err);
  document.getElementById('app').innerHTML =
    '<main class="app-content login-page"><div class="card"><p>Failed to load application.</p><a href="#/login">Login</a></div></main>';
});
