import { getDefaultRoute, getUser } from '../auth.js';
import { navigate } from '../router.js';
import { t } from '../i18n.js';
import { ApiError } from '../api.js';
import { showToast } from '../toast.js';
import { isInsideTelegramWebApp, canOpenTelegramBotExternally, openTelegramBot } from '../telegram-env.js';
import { authenticateTelegramUser } from '../telegram-login.js';

function renderTelegramLoading(app, message) {
  app.innerHTML = `
    <div class="login-page login-page--auto">
      <section class="auth-panel login-auto-panel">
        <img class="login-logo" src="/public/logo.svg" alt="Quran Progress Tracker" />
        <h1 data-i18n="login.welcome">${t('login.welcome')}</h1>
        <p class="telegram-status" id="telegram-status">${message}</p>
        <div class="login-spinner" aria-hidden="true"></div>
      </section>
    </div>
  `;
}

function renderTelegramError(app, message) {
  app.innerHTML = `
    <div class="login-page login-page--auto">
      <section class="auth-panel login-auto-panel">
        <img class="login-logo" src="/public/logo.svg" alt="Quran Progress Tracker" />
        <h1 data-i18n="login.welcome">${t('login.welcome')}</h1>
        <p class="form-error" id="telegram-error">${message}</p>
        <button type="button" id="telegram-retry" class="btn btn--telegram btn--block">
          <span data-i18n="login.telegramRetry">${t('login.telegramRetry')}</span>
        </button>
      </section>
    </div>
  `;

  app.querySelector('#telegram-retry')?.addEventListener('click', () => renderLoginPage(app));
}

function renderBrowserTelegramGate(app, botUsername) {
  app.innerHTML = `
    <div class="login-page">
      <section class="auth-panel">
        <div class="login-header">
          <img class="login-logo" src="/public/logo.svg" alt="Quran Progress Tracker" />
          <h1 data-i18n="login.welcome">${t('login.welcome')}</h1>
          <p class="login-subtitle" data-i18n="login.telegramOnlySubtitle">${t('login.telegramOnlySubtitle')}</p>
        </div>
        <div class="login-card card">
          <button type="button" id="telegram-login-btn" class="btn btn--telegram btn--block">
            <span class="telegram-mark" aria-hidden="true">✈</span>
            <span data-i18n="login.telegram">${t('login.telegram')}</span>
          </button>
          <p class="telegram-hint" data-i18n="login.telegramBrowserHint">${t('login.telegramBrowserHint')}</p>
        </div>
      </section>
    </div>
  `;

  app.querySelector('#telegram-login-btn')?.addEventListener('click', () => {
    if (botUsername && canOpenTelegramBotExternally()) {
      openTelegramBot(botUsername);
      return;
    }
    showToast(t('login.telegramConfigMissing'), 'error');
  });
}

export async function renderLoginPage(app) {
  if (getUser()) {
    navigate(getDefaultRoute(getUser().role));
    return;
  }

  let botUsername = '';
  try {
    const config = await (await fetch('/api/v1/auth/config')).json();
    botUsername = config.telegramBotUsername || '';
  } catch {
    botUsername = '';
  }

  if (isInsideTelegramWebApp()) {
    renderTelegramLoading(app, t('login.telegramSigningIn'));
    try {
      const user = await authenticateTelegramUser();
      navigate(getDefaultRoute(user.role));
      return;
    } catch (error) {
      console.error('Telegram Mini App login failed:', error);
      const message = error instanceof ApiError ? error.message : t('login.telegramMiniAppError');
      renderTelegramError(app, message);
      return;
    }
  }

  renderBrowserTelegramGate(app, botUsername);
}
