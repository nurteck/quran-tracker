import { apiFetch, ApiError } from '../api.js';
import { mountAppLayout } from '../components/layout.js';
import { renderDataTable } from '../components/data-table.js';
import { openModal, formField, formFieldMultiSelect } from '../components/modal.js';
import { showToast } from '../toast.js';
import { t } from '../i18n.js';
import { applyTranslations } from '../i18n.js';

function actionButtons(group) {
  return `
    <div class="table-actions">
      <button type="button" class="btn btn--ghost btn--sm" data-action="edit" data-id="${group.id}" data-i18n="common.edit">${t('common.edit')}</button>
      <button type="button" class="btn btn--danger btn--sm" data-action="delete" data-id="${group.id}" data-i18n="common.delete">${t('common.delete')}</button>
    </div>`;
}

async function fetchTeachers() {
  const data = await apiFetch('/users?role=teacher');
  return data.users;
}

async function fetchStudents() {
  const data = await apiFetch('/users?role=student');
  return data.users;
}

async function loadGroups() {
  const data = await apiFetch('/groups');
  return data.groups;
}

function groupFormFields({ teachers, group = null, memberIds = [] }) {
  const teacherOptions = teachers.map((tch) => ({
    value: tch.id,
    label: tch.fullName || tch.displayName,
  }));

  const studentOptions = (group?.students || []).map((s) => ({
    value: s.id,
    label: s.fullName || s.username,
  }));

  const fields = [
    formField({
      id: 'name',
      labelKey: 'admin.groups.name',
      label: t('admin.groups.name'),
      required: true,
      value: group?.name || '',
    }),
    formField({
      id: 'teacherId',
      labelKey: 'admin.groups.teacher',
      label: t('admin.groups.teacher'),
      type: 'select',
      required: true,
      value: group?.teacherId || '',
      options: [{ value: '', label: '—' }, ...teacherOptions],
    }),
    formField({
      id: 'startDate',
      labelKey: 'admin.groups.startDate',
      label: t('admin.groups.startDate'),
      type: 'date',
      required: true,
      value: group?.startDate?.slice?.(0, 10) || new Date().toISOString().slice(0, 10),
    }),
  ];

  if (studentOptions.length) {
    fields.push(
      formFieldMultiSelect({
        id: 'memberIds',
        labelKey: 'admin.groups.members',
        label: t('admin.groups.members'),
        options: studentOptions,
        selected: memberIds,
      })
    );
  }

  return fields.join('');
}

function getSelectedMemberIds(form) {
  return [...form.querySelectorAll('input[name="memberIds"]:checked')].map((input) => input.value);
}

function renderPage(app, groups, error) {
  const table = renderDataTable({
    emptyMessageKey: 'admin.groups.empty',
    emptyMessage: t('admin.groups.empty'),
    columns: [
      { key: 'name', labelKey: 'admin.groups.name', label: t('admin.groups.name') },
      { key: 'teacher', labelKey: 'admin.groups.teacher', label: t('admin.groups.teacher') },
      { key: 'members', labelKey: 'admin.groups.memberCount', label: t('admin.groups.memberCount') },
      { key: 'startDate', labelKey: 'admin.groups.startDate', label: t('admin.groups.startDate') },
      { key: 'actions', labelKey: 'common.actions', label: t('common.actions') },
    ],
    rows: groups.map((g) => ({
      name: g.name,
      teacher: g.teacherName || '—',
      members: g.memberCount ?? 0,
      startDate: g.startDate?.slice?.(0, 10) || '—',
      actions: actionButtons(g),
    })),
  });

  mountAppLayout(app, {
    titleKey: 'admin.groups.title',
    title: t('admin.groups.title'),
    activePath: '/admin/groups',
    content: `
      <div class="page-toolbar">
        <span></span>
        <button type="button" id="add-group-btn" class="btn btn--primary" data-i18n="admin.groups.add">${t('admin.groups.add')}</button>
      </div>
      ${error ? `<p class="form-error">${error}</p>` : table}
    `,
  });

  applyTranslations(app);

  app.querySelector('#add-group-btn')?.addEventListener('click', () => openCreateModal(app));

  app.querySelectorAll('[data-action="edit"]').forEach((btn) => {
    btn.addEventListener('click', () => openEditModal(app, btn.dataset.id));
  });

  app.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener('click', () => deleteGroup(app, btn.dataset.id));
  });
}

async function refresh(app) {
  try {
    const groups = await loadGroups();
    renderPage(app, groups, null);
  } catch (err) {
    renderPage(app, [], err.message);
  }
}

async function openCreateModal(app) {
  const teachers = await fetchTeachers();
  if (!teachers.length) {
    showToast(t('admin.groups.noTeachers'), 'error');
    return;
  }

  const students = await fetchStudents();
  const modal = openModal({
    titleKey: 'admin.groups.add',
    title: t('admin.groups.add'),
    bodyHtml: groupFormFields({ teachers, group: { students } }),
    submitLabelKey: 'common.create',
    submitLabel: t('common.create'),
    onSubmit: async (form) => {
      const body = {
        name: form.name.value.trim(),
        teacherId: form.teacherId.value,
        startDate: form.startDate.value,
      };
      const { group } = await apiFetch('/groups', { method: 'POST', body: JSON.stringify(body) });

      const selected = getSelectedMemberIds(form);
      if (selected.length) {
        for (const userId of selected) {
          await apiFetch(`/groups/${group.id}/members`, {
            method: 'POST',
            body: JSON.stringify({ userId }),
          });
        }
      }

      showToast(t('admin.groups.created'));
      await refresh(app);
    },
  });
  applyTranslations(modal);
}

async function openEditModal(app, id) {
  const [{ group }, teachers, students] = await Promise.all([
    apiFetch(`/groups/${id}`),
    fetchTeachers(),
    fetchStudents(),
  ]);

  const memberIds = (group.members || []).map((m) => m.id);
  const allStudents = students.map((s) => ({ id: s.id, fullName: s.fullName || s.displayName, username: s.username }));

  const modal = openModal({
    titleKey: 'admin.groups.edit',
    title: t('admin.groups.edit'),
    bodyHtml: groupFormFields({
      teachers,
      group: { ...group, students: allStudents },
      memberIds,
    }),
    submitLabelKey: 'common.save',
    submitLabel: t('common.save'),
    onSubmit: async (form) => {
      const body = {
        name: form.name.value.trim(),
        teacherId: form.teacherId.value,
        startDate: form.startDate.value,
      };
      await apiFetch(`/groups/${id}`, { method: 'PUT', body: JSON.stringify(body) });

      const selectedIds = getSelectedMemberIds(form);
      if (selectedIds.length || memberIds.length) {
        const selected = new Set(selectedIds);
        const current = new Set(memberIds);

        for (const userId of selected) {
          if (!current.has(userId)) {
            await apiFetch(`/groups/${id}/members`, {
              method: 'POST',
              body: JSON.stringify({ userId }),
            });
          }
        }
        for (const userId of current) {
          if (!selected.has(userId)) {
            await apiFetch(`/groups/${id}/members/${userId}`, { method: 'DELETE' });
          }
        }
      }

      showToast(t('admin.groups.updated'));
      await refresh(app);
    },
  });
  applyTranslations(modal);
}

async function deleteGroup(app, id) {
  if (!confirm(t('admin.groups.confirmDelete'))) return;
  try {
    await apiFetch(`/groups/${id}`, { method: 'DELETE' });
    showToast(t('admin.groups.deleted'));
    await refresh(app);
  } catch (err) {
    showToast(err instanceof ApiError ? err.message : t('common.error'), 'error');
  }
}

export async function renderAdminGroups(app) {
  mountAppLayout(app, {
    titleKey: 'admin.groups.title',
    title: t('admin.groups.title'),
    activePath: '/admin/groups',
    content: `<p class="text-muted" data-i18n="common.loading">${t('common.loading')}</p>`,
  });

  await refresh(app);
}
