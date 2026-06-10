export function isTelegramMiniApp() {
  return Boolean(window.Telegram?.WebApp?.platform);
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
