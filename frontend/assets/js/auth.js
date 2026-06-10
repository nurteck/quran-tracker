import { apiFetch } from './api.js';
import { storeAccessToken, clearAccessToken } from './session-token.js';

let currentUser = null;

function persistSession(data) {
  currentUser = data.user;
  if (data.accessToken) {
    storeAccessToken(data.accessToken);
  }
}

export function getUser() {
  return currentUser;
}

export function setUser(user) {
  currentUser = user;
}

export function clearUser() {
  currentUser = null;
}

export async function fetchMe() {
  const data = await apiFetch('/auth/me');
  currentUser = data.user;
  return currentUser;
}

export async function login(username, password) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  persistSession(data);
  return currentUser;
}

export async function register(fullName, username, password) {
  const data = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ fullName, username, password }),
  });
  persistSession(data);
  return currentUser;
}

export async function loginWithTelegram(payload) {
  const data = await apiFetch('/auth/telegram', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  persistSession(data);
  return currentUser;
}

export async function loginWithTelegramMiniApp(initData) {
  const data = await apiFetch('/auth/telegram-miniapp', {
    method: 'POST',
    body: JSON.stringify({ initData }),
  });
  persistSession(data);
  return currentUser;
}

export async function forgotPassword(username) {
  return apiFetch('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
}

export async function logout() {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
  } finally {
    clearUser();
    clearAccessToken();
  }
}

export function getDefaultRoute(role) {
  const routes = {
    admin: '#/admin',
    teacher: '#/teacher',
    student: '#/student',
  };
  return routes[role] || '#/login';
}

export async function initSession() {
  try {
    return await fetchMe();
  } catch {
    clearUser();
    clearAccessToken();
    return null;
  }
}
