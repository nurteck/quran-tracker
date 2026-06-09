import { apiFetch, ApiError } from '../api.js';
import { mountAppLayout } from '../components/layout.js';
import { renderDataTable } from '../components/data-table.js';
import { openModal, formField } from '../components/modal.js';
import { showToast } from '../toast.js';
import { t } from '../i18n.js';
import { applyTranslations } from '../i18n.js';

const ROLE_LABELS = {
  admin: 'admin.users.roleAdmin',
  teacher: 'admin.users.roleTeacher',
  student: 'admin.users.roleStudent',
};

function roleLabel(role) {
  return `<span class="badge badge--${role}">${t(ROLE_LABELS[role] || role)}</span>`;
}

function userAvatar(user) {
  const name = user.displayName || user.fullName || user.username || '?';
  return `<span class="user-avatar">${user.avatar ? `<img src="${user.avatar}" alt="" />` : name[0].toUpperCase()}</span>`;
}

function actionButtons(user) {
  return `
    <div class="table-actions">
      <button type="button" class="btn btn--ghost btn--sm" data-action="edit" data-id="${user.id}" data-i18n="common.edit">${t('common.edit')}</button>
      <button type="button" class="btn btn--danger btn--sm" data-action="delete" data-id="${user.id}" data-i18n="common.delete">${t('common.delete')}</button>
    </div>`;
}

function userFormFields(user = null) {
  return [
    formField({
      id: 'fullName',
      labelKey: 'admin.users.fullName',
      label: t('admin.users.fullName'),
      required: true,
      value: user?.fullName || '',
    }),
    formField({
      id: 'username',
      labelKey: 'admin.users.username',
      label: t('admin.users.username'),
      required: true,
      value: user?.username || '',
    }),
    formField({
      id: 'handle',
      labelKey: 'profile.handle',
      label: t('profile.handle'),
      required: true,
      value: user?.handle ? `@${user.handle}` : '',
    }),
    formField({
      id: 'password',
      labelKey: user ? 'admin.users.newPassword' : 'admin.users.password',
      label: user ? t('admin.users.newPassword') : t('admin.users.password'),
      type: 'password',
      required: !user,
    }),
    formField({
      id: 'role',
      labelKey: 'admin.users.role',
      label: t('admin.users.role'),
      type: 'select',
      required: true,
      value: user?.role || 'student',
      options: [
        { value: 'admin', label: t('admin.users.roleAdmin') },
        { value: 'teacher', label: t('admin.users.roleTeacher') },
        { value: 'student', label: t('admin.users.roleStudent') },
      ],
    }),
  ].join('');
}

async function loadUsers(roleFilter) {
  const query = roleFilter ? `?role=${roleFilter}` : '';
  const data = await apiFetch(`/users${query}`);
  return data.users;
}

function renderPage(app, users, roleFilter, error) {
  const table = renderDataTable({
    emptyMessageKey: 'admin.users.empty',
    emptyMessage: t('admin.users.empty'),
    columns: [
      { key: 'fullName', labelKey: 'admin.users.fullName', label: t('admin.users.fullName') },
      { key: 'avatar', label: t('profile.avatar') },
      { key: 'username', labelKey: 'admin.users.username', label: t('admin.users.username') },
      { key: 'handle', label: t('profile.handle') },
      { key: 'role', labelKey: 'admin.users.role', label: t('admin.users.role') },
      { key: 'actions', labelKey: 'common.actions', label: t('common.actions') },
    ],
    rows: users.map((u) => ({
      fullName: u.fullName || u.displayName,
      avatar: userAvatar(u),
      username: u.username,
      handle: u.handle ? `@${u.handle}` : '—',
      role: roleLabel(u.role),
      actions: actionButtons(u),
    })),
  });

  mountAppLayout(app, {
    titleKey: 'admin.users.title',
    title: t('admin.users.title'),
    activePath: '/admin/users',
    content: `
      <div class="page-toolbar">
        <div class="filter-group">
          <label for="role-filter" data-i18n="admin.users.filterRole">${t('admin.users.filterRole')}</label>
          <select id="role-filter">
            <option value=""${!roleFilter ? ' selected' : ''} data-i18n="admin.users.allRoles">${t('admin.users.allRoles')}</option>
            <option value="admin"${roleFilter === 'admin' ? ' selected' : ''}>${t('admin.users.roleAdmin')}</option>
            <option value="teacher"${roleFilter === 'teacher' ? ' selected' : ''}>${t('admin.users.roleTeacher')}</option>
            <option value="student"${roleFilter === 'student' ? ' selected' : ''}>${t('admin.users.roleStudent')}</option>
          </select>
        </div>
        <button type="button" id="add-user-btn" class="btn btn--primary" data-i18n="admin.users.add">${t('admin.users.add')}</button>
      </div>
      ${error ? `<p class="form-error">${error}</p>` : table}
    `,
  });

  applyTranslations(app);

  app.querySelector('#role-filter')?.addEventListener('change', (e) => {
    refresh(app, e.target.value || null);
  });

  app.querySelector('#add-user-btn')?.addEventListener('click', () => openCreateModal(app, roleFilter));

  app.querySelectorAll('[data-action="edit"]').forEach((btn) => {
    btn.addEventListener('click', () => openEditModal(app, btn.dataset.id, roleFilter));
  });

  app.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    const user = users.find((item) => item.id === btn.dataset.id);
    btn.addEventListener('click', () => deleteUser(app, user, roleFilter));
  });
}

async function refresh(app, roleFilter) {
  try {
    const users = await loadUsers(roleFilter);
    renderPage(app, users, roleFilter, null);
  } catch (err) {
    renderPage(app, [], roleFilter, err.message);
  }
}

function openCreateModal(app, roleFilter) {
  const modal = openModal({
    titleKey: 'admin.users.add',
    title: t('admin.users.add'),
    bodyHtml: userFormFields(),
    submitLabelKey: 'common.create',
    submitLabel: t('common.create'),
    onSubmit: async (form) => {
      const body = {
        fullName: form.fullName.value.trim(),
        username: form.username.value.trim(),
        handle: form.handle.value.trim(),
        password: form.password.value,
        role: form.role.value,
      };
      await apiFetch('/users', { method: 'POST', body: JSON.stringify(body) });
      showToast(t('admin.users.created'));
      await refresh(app, roleFilter);
    },
  });
  applyTranslations(modal);
}

async function openEditModal(app, id, roleFilter) {
  const { user } = await apiFetch(`/users/${id}`);
  const modal = openModal({
    titleKey: 'admin.users.edit',
    title: t('admin.users.edit'),
    bodyHtml: userFormFields(user),
    submitLabelKey: 'common.save',
    submitLabel: t('common.save'),
    onSubmit: async (form) => {
      const body = {
        fullName: form.fullName.value.trim(),
        username: form.username.value.trim(),
        handle: form.handle.value.trim(),
        role: form.role.value,
      };
      if (form.password.value) body.password = form.password.value;
      await apiFetch(`/users/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      showToast(t('admin.users.updated'));
      await refresh(app, roleFilter);
    },
  });
  applyTranslations(modal);
}

async function deleteUser(app, user, roleFilter) {
  if (!user) return;
  if (user.role === 'teacher') {
    await openTeacherDeleteModal(app, user, roleFilter);
    return;
  }
  if (!confirm(t('admin.users.confirmDelete'))) return;
  try {
    await apiFetch(`/users/${user.id}`, { method: 'DELETE', body: JSON.stringify({}) });
    showToast(t('admin.users.deleted'));
    await refresh(app, roleFilter);
  } catch (err) {
    showToast(err instanceof ApiError ? err.message : t('common.error'), 'error');
  }
}

async function openTeacherDeleteModal(app, user, roleFilter) {
  const teachers = (await loadUsers('teacher')).filter((teacher) => teacher.id !== user.id);
  const teacherOptions = teachers
    .map((teacher) => `<option value="${teacher.id}">${teacher.fullName || teacher.displayName}</option>`)
    .join('');
  const modal = openModal({
    titleKey: 'admin.users.deleteTeacherTitle',
    title: t('admin.users.deleteTeacherTitle'),
    bodyHtml: `
      <p class="text-muted">${t('admin.users.deleteTeacherText')}</p>
      <label class="checkbox-option">
        <input type="radio" name="teacherAction" value="deleteGroups" checked />
        <span>${t('admin.users.deleteTeacherGroups')}</span>
      </label>
      <label class="checkbox-option">
        <input type="radio" name="teacherAction" value="reassign"${teacherOptions ? '' : ' disabled'} />
        <span>${t('admin.users.reassignTeacherGroups')}</span>
      </label>
      <div class="form-field">
        <label for="reassignTeacherId">${t('admin.groups.teacher')}</label>
        <select id="reassignTeacherId" name="reassignTeacherId"${teacherOptions ? '' : ' disabled'}>
          ${teacherOptions || `<option value="">${t('admin.users.noOtherTeachers')}</option>`}
        </select>
      </div>
    `,
    submitLabelKey: 'common.delete',
    submitLabel: t('common.delete'),
    onSubmit: async (form) => {
      const teacherAction = form.teacherAction.value;
      const body = { teacherAction };
      if (teacherAction === 'reassign') body.reassignTeacherId = form.reassignTeacherId.value;
      await apiFetch(`/users/${user.id}`, { method: 'DELETE', body: JSON.stringify(body) });
      showToast(t('admin.users.deleted'));
      await refresh(app, roleFilter);
    },
  });
  applyTranslations(modal);
}

export async function renderAdminUsers(app) {
  mountAppLayout(app, {
    titleKey: 'admin.users.title',
    title: t('admin.users.title'),
    activePath: '/admin/users',
    content: `<p class="text-muted" data-i18n="common.loading">${t('common.loading')}</p>`,
  });

  await refresh(app, null);
}

// closeModal imported but unused in some paths - that's ok, modal handles itself
