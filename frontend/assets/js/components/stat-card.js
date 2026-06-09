export function renderStatCard({ label, labelKey, value, icon }) {
  return `
    <div class="stat-card">
      ${icon ? `<span class="stat-card__icon" aria-hidden="true">${icon}</span>` : ''}
      <div class="stat-card__body">
        <p class="stat-card__value">${value ?? '—'}</p>
        <p class="stat-card__label"${labelKey ? ` data-i18n="${labelKey}"` : ''}>${label || ''}</p>
      </div>
    </div>
  `;
}

export function renderStatGrid(cards) {
  return `<div class="stat-grid">${cards.join('')}</div>`;
}
