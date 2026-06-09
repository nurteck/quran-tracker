const DEFAULT_LANG = 'ru';
const SUPPORTED = ['ky', 'ru', 'en'];

let currentLang = DEFAULT_LANG;
let dictionary = {};

export function getLang() {
  return currentLang;
}

export async function loadLocale(lang) {
  const resolved = SUPPORTED.includes(lang) ? lang : DEFAULT_LANG;
  const res = await fetch(`/assets/locales/${resolved}.json`);
  dictionary = await res.json();
  currentLang = resolved;
  document.documentElement.lang = resolved;
  localStorage.setItem('lang', resolved);
  applyTranslations();
  return currentLang;
}

export function t(key) {
  return dictionary[key] ?? key;
}

export function applyTranslations(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });

  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) el.placeholder = t(key);
  });
}

export async function initI18n(lang) {
  const stored = lang || localStorage.getItem('lang');
  return loadLocale(stored || DEFAULT_LANG);
}
