import { apiFetch } from './api.js';

let currentUser = null;

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
  currentUser = data.user;
  return currentUser;
}

export async function register(fullName, username, password) {
  return apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ fullName, username, password }),
  });
}

export async function verifyRegister(username, code) {
  const data = await apiFetch('/auth/register/verify', {
    method: 'POST',
    body: JSON.stringify({ username, code }),
  });
  currentUser = data.user;
  return currentUser;
}

export async function loginWithGoogleCredential(credential) {
  const data = await apiFetch('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential }),
  });
  currentUser = data.user;
  return currentUser;
}

export async function loginWithTelegram(payload) {
  const data = await apiFetch('/auth/telegram', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  currentUser = data.user;
  return currentUser;
}

export async function loginWithTelegramMiniApp(initData) {
  const data = await apiFetch('/auth/telegram-miniapp', {
    method: 'POST',
    body: JSON.stringify({ initData }),
  });
  currentUser = data.user;
  return currentUser;
}

export async function loginWithGoogleDemo() {
  const data = await apiFetch('/auth/google-demo', { method: 'POST' });
  currentUser = data.user;
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
    return null;
  }
}
