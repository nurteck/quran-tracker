const TELEGRAM_MINI_APP_PATH = 'quran';

export function isTelegramMiniApp() {
  const webApp = window.Telegram?.WebApp;
  if (!webApp) return false;
  return Boolean(webApp.initData || webApp.platform || webApp.initDataUnsafe?.user);
}

export function getTelegramInitData() {
  return window.Telegram?.WebApp?.initData || '';
}

export function prepareTelegramWebApp() {
  const webApp = window.Telegram?.WebApp;
  if (!webApp) return;
  webApp.ready();
  webApp.expand?.();
}

export function openTelegramBot(botUsername) {
  if (!botUsername) return false;
  const url = `https://t.me/${botUsername}/${TELEGRAM_MINI_APP_PATH}`;
  window.location.assign(url);
  return true;
}
