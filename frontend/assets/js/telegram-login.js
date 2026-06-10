import { loginWithTelegramMiniApp } from './auth.js';
import { waitForTelegramInitData, prepareTelegramWebApp, isInsideTelegramWebApp } from './telegram-env.js';
import { ApiError } from './api.js';
import { t } from './i18n.js';

export async function authenticateTelegramUser() {
  if (!isInsideTelegramWebApp()) {
    throw new ApiError(400, 'NOT_TELEGRAM', t('login.telegramOpenInBot'));
  }

  const initData = await waitForTelegramInitData(30, 200);
  if (!initData) {
    throw new ApiError(400, 'TELEGRAM_INIT_DATA_MISSING', t('login.telegramInitDataMissing'));
  }

  prepareTelegramWebApp();
  return loginWithTelegramMiniApp(initData);
}
