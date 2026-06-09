let activeModal = null;

export function openModal({ title, titleKey, bodyHtml, onSubmit, submitLabel, submitLabelKey, cancelLabelKey }) {
  closeModal();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal__header">
        <h2 class="modal__title"${titleKey ? ` data-i18n="${titleKey}"` : ''}>${title || ''}</h2>
        <button type="button" class="modal__close" aria-label="Close">&times;</button>
      </div>
      <form class="modal__form">
        <div class="modal__body">${bodyHtml}</div>
        <p class="form-error modal__error" role="alert" hidden></p>
        <div class="modal__footer">
          <button type="button" class="btn btn--ghost modal__cancel" data-i18n="${cancelLabelKey || 'common.cancel'}">Cancel</button>
          <button type="submit" class="btn btn--primary"${submitLabelKey ? ` data-i18n="${submitLabelKey}"` : ''}>${submitLabel || 'Save'}</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);
  activeModal = overlay;

  const form = overlay.querySelector('.modal__form');
  const errorEl = overlay.querySelector('.modal__error');
  const closeBtn = overlay.querySelector('.modal__close');
  const cancelBtn = overlay.querySelector('.modal__cancel');

  const close = () => closeModal();
  closeBtn.addEventListener('click', close);
  cancelBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    errorEl.textContent = '';
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    try {
      await onSubmit(form, errorEl);
      close();
    } catch (err) {
      errorEl.textContent = err.message || 'Request failed';
      errorEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
    }
  });

  return overlay;
}

export function closeModal() {
  if (activeModal) {
    activeModal.remove();
    activeModal = null;
  }
}

export function formField({ id, label, labelKey, type = 'text', required = false, value = '', options }) {
  if (type === 'select') {
    const opts = (options || [])
      .map((o) => `<option value="${o.value}"${o.value === value ? ' selected' : ''}>${o.label}</option>`)
      .join('');
    return `
      <div class="form-field">
        <label for="${id}"${labelKey ? ` data-i18n="${labelKey}"` : ''}>${label || ''}</label>
        <select id="${id}" name="${id}"${required ? ' required' : ''}>${opts}</select>
      </div>`;
  }

  return `
    <div class="form-field">
      <label for="${id}"${labelKey ? ` data-i18n="${labelKey}"` : ''}>${label || ''}</label>
      <input type="${type}" id="${id}" name="${id}" value="${value ?? ''}"${required ? ' required' : ''} />
    </div>`;
}

export function formFieldMultiSelect({ id, label, labelKey, options, selected = [] }) {
  const opts = (options || [])
    .map(
      (o) =>
        `<label class="checkbox-option">
          <input type="checkbox" name="${id}" value="${o.value}"${selected.includes(o.value) ? ' checked' : ''} />
          <span>${o.label}</span>
        </label>`
    )
    .join('');
  return `
    <div class="form-field">
      <label for="${id}"${labelKey ? ` data-i18n="${labelKey}"` : ''}>${label || ''}</label>
      <div id="${id}" class="checkbox-list">${opts}</div>
    </div>`;
}
