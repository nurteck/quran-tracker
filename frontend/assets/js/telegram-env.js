const TELEGRAM_MINI_APP_PATH = 'quran';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isInsideTelegramWebApp() {
  return Boolean(window.Telegram?.WebApp);
}

export function isTelegramMiniApp() {
  const webApp = window.Telegram?.WebApp;
  if (!webApp) return false;
  return Boolean(webApp.initData || webApp.platform || webApp.initDataUnsafe?.user);
}

export function getTelegramInitData() {
  return window.Telegram?.WebApp?.initData || '';
}

export async function waitForTelegramInitData(attempts = 20, delayMs = 150) {
  for (let i = 0; i < attempts; i += 1) {
    const initData = getTelegramInitData();
    if (initData) return initData;
    if (!isInsideTelegramWebApp()) return '';
    await sleep(delayMs);
  }
  return getTelegramInitData();
}

export function prepareTelegramWebApp() {
  const webApp = window.Telegram?.WebApp;
  if (!webApp) return;
  webApp.ready();
  webApp.expand?.();
}

export function canOpenTelegramBotExternally() {
  return !isInsideTelegramWebApp();
}

export function openTelegramBot(botUsername) {
  if (!botUsername || !canOpenTelegramBotExternally()) return false;
  const url = `https://t.me/${botUsername}/${TELEGRAM_MINI_APP_PATH}`;
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (!opened) {
    window.location.href = url;
  }
  return true;
}
