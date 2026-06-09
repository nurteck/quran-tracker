import { initSession } from './auth.js';
import { initI18n } from './i18n.js';
import { initTheme } from './theme.js';
import { registerRoute, startRouter } from './router.js';
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

async function bootstrap() {
  if (window.location.pathname === '/telegram') {
    window.history.replaceState(null, '', '/#/login');
  }

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

  const user = await initSession();
  await initI18n(user?.language);
  initTheme(user?.theme);

  if (!window.location.hash) {
    window.location.hash = user ? `#/${user.role === 'admin' ? 'admin' : user.role}` : '#/login';
  }

  await startRouter();
}

bootstrap().catch((err) => {
  console.error('App bootstrap failed:', err);
  document.getElementById('app').innerHTML =
    '<main class="app-content"><p>Failed to load application.</p></main>';
});
