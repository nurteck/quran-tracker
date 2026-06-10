import { getUser, getDefaultRoute } from './auth.js';
import { applyTranslations } from './i18n.js';

const routes = new Map();

export function registerRoute(path, handler, options = {}) {
  routes.set(path, { handler, ...options });
}

export function navigate(hash) {
  window.location.hash = hash.startsWith('#') ? hash : `#${hash}`;
}

function getPath() {
  const hash = window.location.hash || '#/login';
  const path = hash.replace(/^#/, '') || '/login';
  return path.startsWith('/') ? path : `/${path}`;
}

function matchRoute(path) {
  if (routes.has(path)) return { route: routes.get(path), params: {} };

  for (const [pattern, route] of routes) {
    const paramNames = [];
    const regex = new RegExp(
      `^${pattern.replace(/:([^/]+)/g, (_, name) => {
        paramNames.push(name);
        return '([^/]+)';
      })}$`
    );
    const match = path.match(regex);
    if (match) {
      const params = {};
      paramNames.forEach((name, i) => {
        params[name] = match[i + 1];
      });
      return { route, params };
    }
  }
  return null;
}

export async function renderRoute() {
  const app = document.getElementById('app');
  const path = getPath();
  const matched = matchRoute(path);

  if (!matched) {
    if (path === '/telegram' || path === '/quran') {
      navigate('#/login');
      return;
    }
    app.innerHTML = '<main class="app-content"><p>Page not found</p></main>';
    return;
  }

  const { route, params } = matched;
  const user = getUser();

  if (route.public && user) {
    navigate(getDefaultRoute(user.role));
    return;
  }

  if (!route.public && !user) {
    navigate('#/login');
    return;
  }

  if (route.roles && user && !route.roles.includes(user.role)) {
    navigate(getDefaultRoute(user.role));
    return;
  }

  try {
    await route.handler(app, params);
    applyTranslations(app);
  } catch (err) {
    console.error('Route render failed:', err);
    app.innerHTML = `
      <main class="app-content">
        <div class="card">
          <h1>Ошибка загрузки страницы</h1>
          <p class="form-error">${err?.message || 'Unknown error'}</p>
          <p class="text-muted">Обновите страницу или войдите заново.</p>
          <a class="btn btn--primary" href="#/login">Войти</a>
        </div>
      </main>`;
  }
}

export function startRouter() {
  window.addEventListener('hashchange', () => renderRoute());
  return renderRoute();
}
