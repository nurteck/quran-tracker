import {
  login,
  register,
  forgotPassword,
  getDefaultRoute,
  getUser,
} from '../auth.js';
import { navigate } from '../router.js';
import { t } from '../i18n.js';
import { ApiError } from '../api.js';
import { showToast } from '../toast.js';

export function renderLoginPage(app) {
  if (getUser()) {
    navigate(getDefaultRoute(getUser().role));
    return;
  }

  app.innerHTML = `
    <div class="login-page">
      <section class="auth-panel">
        <div class="login-header">
          <img class="login-logo" src="/public/logo.svg" alt="Quran Progress Tracker" />
          <h1 data-i18n="login.welcome">Welcome back</h1>
          <p class="login-subtitle" data-i18n="login.subtitle">Log in to your account</p>
        </div>
        <div class="login-card card">
          <form id="login-form" class="login-form" novalidate>
            <div class="form-field">
              <label for="username" data-i18n="login.username">Email</label>
              <input
                type="text"
                id="username"
                name="username"
                autocomplete="username"
                required
                placeholder="you@example.com"
              />
            </div>
            <div class="form-field">
              <div class="field-row">
                <label for="password" data-i18n="login.password">Password</label>
                <button type="button" id="forgot-link" class="link-button" data-i18n="login.forgot">Forgot password?</button>
              </div>
              <input
                type="password"
                id="password"
                name="password"
                autocomplete="current-password"
                required
                placeholder="••••••••"
              />
            </div>
            <p id="login-error" class="form-error" role="alert" hidden></p>
            <button type="submit" class="btn btn--primary btn--block" data-i18n="login.submit">
              Log in
            </button>
          </form>
        </div>
        <p class="auth-footer">
          <span data-i18n="login.noAccount">Don't have an account?</span>
          <button type="button" id="register-link" class="link-button" data-i18n="login.create">Create one</button>
        </p>
      </section>
    </div>
  `;

  const form = app.querySelector('#login-form');
  const errorEl = app.querySelector('#login-error');
  const submitBtn = form.querySelector('button[type="submit"]');

  app.querySelector('#register-link').addEventListener('click', () => {
    app.innerHTML = `
      <div class="login-page">
        <section class="auth-panel">
          <div class="login-header">
            <img class="login-logo" src="/public/logo.svg" alt="Quran Progress Tracker" />
            <h1 data-i18n="register.title">${t('register.title')}</h1>
            <p class="login-subtitle" data-i18n="register.subtitle">${t('register.subtitle')}</p>
          </div>
          <div class="login-card card">
            <form id="register-form" class="login-form" novalidate>
              <div class="form-field">
                <label for="fullName" data-i18n="admin.users.fullName">${t('admin.users.fullName')}</label>
                <input id="fullName" name="fullName" required />
              </div>
              <div class="form-field">
                <label for="regUsername" data-i18n="login.username">${t('login.username')}</label>
                <input id="regUsername" name="username" required />
              </div>
              <div class="form-field">
                <label for="regPassword" data-i18n="login.password">${t('login.password')}</label>
                <input type="password" id="regPassword" name="password" required />
              </div>
              <p id="register-error" class="form-error" hidden></p>
              <button class="btn btn--primary btn--block" data-i18n="common.create">${t('common.create')}</button>
            </form>
          </div>
          <p class="auth-footer"><button type="button" id="back-login" class="link-button" data-i18n="login.submit">${t('login.submit')}</button></p>
        </section>
      </div>`;
    app.querySelector('#back-login').addEventListener('click', () => renderLoginPage(app));
    app.querySelector('#register-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = app.querySelector('#register-error');
      err.hidden = true;
      try {
        const user = await register(
          e.target.fullName.value.trim(),
          e.target.username.value.trim(),
          e.target.password.value
        );
        navigate(getDefaultRoute(user.role));
      } catch (error) {
        err.textContent = error instanceof ApiError ? error.message : t('common.error');
        err.hidden = false;
      }
    });
  });

  app.querySelector('#forgot-link').addEventListener('click', async () => {
    const username = form.username.value.trim();
    if (!username) {
      showToast(t('login.error.required'), 'error');
      return;
    }
    await forgotPassword(username);
    showToast(t('login.forgotSent'));
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    errorEl.textContent = '';

    const username = form.username.value.trim();
    const password = form.password.value;

    if (!username || !password) {
      errorEl.textContent = t('login.error.required');
      errorEl.hidden = false;
      return;
    }

    submitBtn.disabled = true;

    try {
      const user = await login(username, password);
      navigate(getDefaultRoute(user.role));
    } catch (err) {
      const message =
        err instanceof ApiError && err.code === 'INVALID_CREDENTIALS'
          ? t('login.error.invalid')
          : t('login.error.generic');
      errorEl.textContent = message;
      errorEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
    }
  });
}
