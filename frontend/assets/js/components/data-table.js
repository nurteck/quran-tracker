export function renderDataTable({ columns, rows, emptyMessage, emptyMessageKey }) {
  if (!rows.length) {
    return `<p class="table-empty"${emptyMessageKey ? ` data-i18n="${emptyMessageKey}"` : ''}>${emptyMessage || 'No data'}</p>`;
  }

  const thead = columns
    .map(
      (col) =>
        `<th${col.labelKey ? ` data-i18n="${col.labelKey}"` : ''}>${col.label || ''}</th>`
    )
    .join('');

  const tbody = rows
    .map((row) => {
      const cells = columns.map((col) => `<td>${row[col.key] ?? ''}</td>`).join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  return `
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr>${thead}</tr></thead>
        <tbody>${tbody}</tbody>
      </table>
    </div>
  `;
}
