export function applyTheme(theme) {
  const resolved = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  localStorage.setItem('theme', resolved);
  return resolved;
}

export function initTheme(theme) {
  const stored = theme || localStorage.getItem('theme');
  if (stored) return applyTheme(stored);
  return applyTheme('dark');
}
