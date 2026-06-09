function syncBootBackground(theme) {
  const bg = theme === 'dark' ? '#070b15' : '#f8fafc';
  document.documentElement.style.backgroundColor = bg;
  document.body.style.backgroundColor = bg;
}

export function applyTheme(theme) {
  const resolved = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.classList.add('theme-switching');
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  localStorage.setItem('theme', resolved);
  syncBootBackground(resolved);
  window.setTimeout(() => {
    document.documentElement.classList.remove('theme-switching');
  }, 220);
  return resolved;
}

export function initTheme(theme) {
  const stored = theme || localStorage.getItem('theme');
  if (stored) return applyTheme(stored);
  return applyTheme('dark');
}
