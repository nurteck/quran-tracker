import * as groupsRepo from '../repositories/groups.repo.js';
import * as usersRepo from '../repositories/users.repo.js';

function toPublicGroup(row) {
  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    teacherId: row.teacher_id,
    teacherName: row.teacher_name,
    memberCount: row.member_count ?? 0,
    createdAt: row.created_at,
  };
}

function toPublicMember(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    username: row.username,
    role: row.role,
  };
}

export async function listGroups() {
  const rows = await groupsRepo.findAll();
  return rows.map(toPublicGroup);
}

export async function getGroup(id) {
  const group = await groupsRepo.findById(id);
  if (!group) {
    const err = new Error('Group not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  const members = await groupsRepo.findMembers(id);
  return {
    ...toPublicGroup({ ...group, member_count: members.length }),
    members: members.map(toPublicMember),
  };
}

async function assertTeacher(teacherId) {
  const teacher = await usersRepo.findActiveById(teacherId);
  if (!teacher || teacher.role !== 'teacher') {
    const err = new Error('Teacher not found');
    err.status = 400;
    err.code = 'VALIDATION';
    throw err;
  }
}

export async function createGroup({ name, teacherId, startDate }) {
  await assertTeacher(teacherId);
  const row = await groupsRepo.create({
    name,
    teacherId,
    startDate: startDate ?? new Date().toISOString().slice(0, 10),
  });
  const teacher = await usersRepo.findById(teacherId);
  return toPublicGroup({ ...row, teacher_name: teacher?.full_name, member_count: 0 });
}

export async function updateGroup(id, { name, teacherId, startDate }) {
  if (teacherId !== undefined) {
    await assertTeacher(teacherId);
  }
  const row = await groupsRepo.update(id, { name, teacherId, startDate });
  if (!row) {
    const err = new Error('Group not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  const teacher = row.teacher_id ? await usersRepo.findById(row.teacher_id) : null;
  const members = await groupsRepo.findMembers(id);
  return toPublicGroup({ ...row, teacher_name: teacher?.full_name, member_count: members.length });
}

export async function deleteGroup(id) {
  const ok = await groupsRepo.remove(id);
  if (!ok) {
    const err = new Error('Group not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
}

export async function addMember(groupId, userId) {
  const group = await groupsRepo.findById(groupId);
  if (!group) {
    const err = new Error('Group not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  const user = await usersRepo.findActiveById(userId);
  if (!user || user.role !== 'student') {
    const err = new Error('Student not found');
    err.status = 400;
    err.code = 'VALIDATION';
    throw err;
  }
  await groupsRepo.addMember(groupId, userId);
}

export async function removeMember(groupId, userId) {
  await groupsRepo.removeMember(groupId, userId);
}
