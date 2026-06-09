import { renderSidebar, renderBottomNav } from './sidebar.js';
import { logout, getUser, setUser } from '../auth.js';
import { navigate } from '../router.js';
import { loadLocale, getLang, t, applyTranslations } from '../i18n.js';
import { applyTheme } from '../theme.js';
import { apiFetch } from '../api.js';

export function patchAppContent(app, content) {
  const main = app.querySelector('.app-shell .app-content');
  if (!main) return false;
  main.innerHTML = content;
  return true;
}

export function updateSidebarActive(app, activePath) {
  const path = activePath.startsWith('/') ? activePath : `/${activePath}`;
  app.querySelectorAll('.sidebar__link, .bottom-nav__link').forEach((link) => {
    const href = link.getAttribute('href') || '';
    const linkPath = href.replace('#', '');
    link.classList.toggle(
      link.classList.contains('sidebar__link') ? 'sidebar__link--active' : 'bottom-nav__link--active',
      linkPath === path
    );
  });
}

export function renderAppLayout({ title, titleKey, activePath, content }) {
  const path = activePath.startsWith('/') ? activePath : `/${activePath}`;
  const user = getUser();
  const theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';

  return `
    <div class="app-shell">
      ${renderSidebar(path)}
      <div class="app-shell__main">
        <header class="app-header">
          <div>
            <h1 class="app-header__title"${titleKey ? ` data-i18n="${titleKey}"` : ''}>${title || ''}</h1>
            <p class="app-header__subtitle">${user?.role || ''}</p>
          </div>
          <div class="app-header__actions">
            <select id="language-switcher" class="header-select" aria-label="Language">
              <option value="ru"${getLang() === 'ru' ? ' selected' : ''}>Русский</option>
              <option value="ky"${getLang() === 'ky' ? ' selected' : ''}>Кыргызча</option>
              <option value="en"${getLang() === 'en' ? ' selected' : ''}>English</option>
            </select>
            <button type="button" id="theme-toggle" class="btn btn--ghost btn--sm">${theme === 'dark' ? t('theme.light') : t('theme.dark')}</button>
            <button type="button" id="logout-btn" class="btn btn--ghost btn--sm" data-i18n="nav.logout">${t('nav.logout')}</button>
          </div>
        </header>
        <main class="app-content">${content}</main>
      </div>
      ${renderBottomNav(path)}
    </div>
  `;
}

export function mountAppLayout(app, options) {
  app.innerHTML = renderAppLayout(options);
  bindLayoutControls(app);
}

function bindLayoutControls(app) {
  app.querySelector('#logout-btn')?.addEventListener('click', async () => {
    await logout();
    navigate('#/login');
  });

  app.querySelector('#language-switcher')?.addEventListener('change', async (e) => {
    const language = e.target.value;
    await loadLocale(language);
    applyTranslations(app);
    const user = getUser();
    if (user) {
      try {
        const { user: updated } = await apiFetch('/profile', {
          method: 'PUT',
          body: JSON.stringify({ language }),
        });
        setUser(updated);
      } catch {
        // Local selection still works if profile save fails.
      }
    }
  });

  app.querySelector('#theme-toggle')?.addEventListener('click', async () => {
    const next = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
    applyTheme(next);
    const toggle = app.querySelector('#theme-toggle');
    if (toggle) {
      toggle.textContent = next === 'dark' ? t('theme.light') : t('theme.dark');
    }
    const user = getUser();
    if (user) {
      try {
        const { user: updated } = await apiFetch('/profile', {
          method: 'PUT',
          body: JSON.stringify({ theme: next }),
        });
        setUser(updated);
      } catch {
        // Theme is persisted locally even when profile save fails.
      }
    }
  });
}
