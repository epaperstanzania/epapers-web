import type { Department, Program, Module, Paper, UserProfile, AchievementBadge, XpLedgerEntry, FlaggedReport, TakedownRequest, ModuleRequest, AuditLogItem, SystemAnnouncement, AppNotification, PaperFilters, Role, AdminStats } from '../types';
import { ApiError, request, listAll, getSessionRole, sensitiveRequest } from './client';
import { portalOrigins } from '@epapers/config/portals';

export function profileImageUrl(id: string) { return `${portalOrigins.web}/api/v1/profile-images/${encodeURIComponent(id)}`; }

export function calculateLevel(xp: number) {
  const level = xp < 200 ? 1 : xp < 500 ? 2 : xp < 1000 ? 3 : 4;
  const minXp = [0, 0, 200, 500, 1000][level], maxXp = [0, 200, 500, 1000, 2000][level];
  return { level, title: ['','Novice Archivist','Scholar','Senior Curator','Master Archivist'][level], minXp, maxXp, progressPercent: Math.min(100, Math.round((xp - minXp) / (maxXp - minXp) * 100)) };
}
export const normalizeModuleCode = (input: string) => input.toUpperCase().replace(/\s+/g, '');
const idPath = (id: string) => encodeURIComponent(id);
export function academicYearStart(value: string) {
  if (!/^\d{4}(?:\/\d{4})?$/.test(value)) throw new Error('Choose a valid academic year.');
  return Number(value.slice(0, 4));
}
type DepartmentDto = Pick<Department, 'id' | 'code' | 'name' | 'description' | 'icon'>;
type ProgramDto = Pick<Program, 'id' | 'departmentId' | 'code' | 'name' | 'level'> & { campus: string; awardTitle: string };
type ModuleDto = Pick<Module, 'id' | 'programId' | 'code' | 'name' | 'semester'> & { levelYear: number | null; credits: number | null };
export type PaperDto = Pick<Paper, 'id' | 'title' | 'category' | 'testNumber' | 'semester' | 'examPeriod' | 'hasMarkingScheme' | 'pageCount' | 'viewsCount' | 'downloadsCount'> & {
  academicYear: number; module: ModuleDto; program: ProgramDto; department: DepartmentDto;
  uploader: { username: string; avatarId?: string; isLecturerVerified: boolean } | null;
  createdAt: string; downloadAvailable: boolean; status?: string; rejectionReason?: string; duplicateWarning?: boolean;
};
type ProfileDto = { id?: string; username: string; email?: string; role?: Role; emailVerified?: boolean; isLecturerVerified?: boolean; lecturerVerified?: boolean; homeDepartmentId?: string; bio?: string; avatarId?: string; xp?: number; allTimeXp?: number; levelTitle: string; joinedAt?: string; status?: UserProfile['status']; rank?: number; approvedCount?: number };
export function profileFromDto(p: ProfileDto): UserProfile {
  return {
    id: p.id || p.username, username: p.username, email: p.email || '', role: p.role || 'contributor',
    isEmailVerified: p.emailVerified || false, isLecturerVerified: p.isLecturerVerified || p.lecturerVerified || false,
    departmentId: p.homeDepartmentId || undefined, bio: p.bio || '', avatarId: p.avatarId || undefined, accentColor: '',
    xp: p.xp ?? 0, allTimeXp: p.allTimeXp ?? 0, level: ['Novice Archivist', 'Scholar', 'Senior Curator', 'Master Archivist'].indexOf(p.levelTitle) + 1 || 1,
    levelTitle: p.levelTitle, joinedDate: p.joinedAt || '', status: p.status || 'active', rank: p.rank ?? 0,
    acceptanceRate: 0, submissionsCount: 0, approvedCount: p.approvedCount ?? 0, markingSchemesCount: 0,
  };
}
const departmentFromDto = (d: DepartmentDto): Department => ({ ...d, programsCount: 0, modulesCount: 0, papersCount: 0 });
export function paperFromDto(p: PaperDto): Paper {
  return {
    id: p.id, title: p.title, moduleId: p.module.id, moduleCode: p.module.code, moduleName: p.module.name,
    departmentId: p.department.id, departmentName: p.department.name, programId: p.program.id, programName: p.program.name,
    category: p.category, testNumber: p.testNumber, academicYear: `${p.academicYear}/${p.academicYear + 1}`, semester: p.semester, examPeriod: p.examPeriod,
    hasMarkingScheme: p.hasMarkingScheme, pdfUrl: '', fileSize: '', pageCount: p.pageCount ?? 0, viewsCount: p.viewsCount, downloadsCount: p.downloadsCount,
    status: (p.status || 'approved').toUpperCase() as Paper['status'], uploadedAt: p.createdAt,
    uploadedBy: { username: p.uploader?.username || 'Deleted account', role: p.uploader?.isLecturerVerified ? 'lecturer' : 'contributor', avatarId: p.uploader?.avatarId, isLecturerVerified: p.uploader?.isLecturerVerified },
    verifiedLecturerBadge: p.uploader?.isLecturerVerified, rejectionReason: p.rejectionReason, duplicateWarning: p.duplicateWarning, downloadAvailable: p.downloadAvailable,
  };
}
async function optional<T>(load: () => Promise<T>): Promise<T | null> {
  try { return await load(); } catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
}
async function uploadFile(file: File) {
  const upload = await request<{ uploadId: string; uploadUrl: string; headers: Record<string, string> }>('/uploads/presign', {
    method: 'POST', auth: true, body: { filename: file.name, contentType: 'application/pdf', sizeBytes: file.size },
  });
  const headers = new Headers(upload.headers); headers.delete('Content-Length');
  let response: Response;
  try {
    response = await fetch(upload.uploadUrl, { method: 'PUT', body: file, headers, credentials: 'omit', signal: AbortSignal.timeout(120000) });
  } catch {
    throw new Error('Cannot reach PDF storage. Check your connection and try again. If this continues, contact support.');
  }
  if (!response.ok) throw new Error('The PDF upload was rejected. Please select the file and try again.');
  await request(`/uploads/${idPath(upload.uploadId)}/complete`, { method: 'POST', auth: true });
  return upload.uploadId;
}
type Download = { url: string; filename: string; expiresAt: string };

export const api = {
  async uploadProfileImage(file: File): Promise<UserProfile> {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size < 1 || file.size > 6 * 1024 * 1024) throw new Error('Choose a JPEG, PNG or WebP image up to 6 MiB.');
    const upload = await request<{ token: string; uploadUrl: string; headers: Record<string, string> }>('/users/me/avatar/presign', { method: 'POST', auth: true, body: { contentType: file.type, sizeBytes: file.size } });
    const response = await fetch(upload.uploadUrl, { method: 'PUT', body: file, headers: upload.headers, credentials: 'omit', signal: AbortSignal.timeout(120000) });
    if (!response.ok) throw new Error('Profile image upload failed. Please try again.');
    return profileFromDto(await request<ProfileDto>('/users/me/avatar/complete', { method: 'POST', auth: true, body: { token: upload.token } }));
  },
  async searchPapers(filters: PaperFilters = {}): Promise<{ papers: Paper[]; total: number }> {
    const rows = await listAll<PaperDto>('/papers', { q: filters.query?.trim(), departmentId: filters.departmentId, programId: filters.programId, category: filters.category,
      testNumber: filters.testNumber && filters.testNumber !== 'ALL' ? filters.testNumber : undefined,
      academicYear: filters.year && filters.year !== 'ALL' ? academicYearStart(filters.year) : undefined,
      semester: filters.semester, hasMarkingScheme: filters.hasMarkingScheme ? 'true' : undefined, sortBy: filters.sortBy });
    return { papers: rows.map(paperFromDto), total: rows.length };
  },
  async getAllPapers(includePending = true): Promise<Paper[]> {
    const admin = getSessionRole() === 'admin', owner = includePending && !!getSessionRole() && !admin;
    return (await listAll<PaperDto>(admin && includePending ? '/admin/papers' : owner ? '/users/me/papers' : '/papers', {}, admin && includePending || owner)).map(paperFromDto);
  },
  async getPaper(id: string): Promise<Paper | null> {
    return optional(async () => {
      const admin = getSessionRole() === 'admin';
      let p: PaperDto;
      try { p = await request<PaperDto>(`${admin ? '/admin' : ''}/papers/${idPath(id)}`, { auth: admin }); }
      catch (error) {
        if (!admin && getSessionRole() && error instanceof ApiError && error.status === 404) return (await api.getAllPapers()).find(p => p.id === id) || null;
        throw error;
      }
      if (!admin) void request(`/papers/${idPath(id)}/view`, { method: 'POST' }).catch(() => undefined);
      return paperFromDto(p);
    });
  },
  async getDownloadUrl(paperId: string, kind: 'exam' | 'marking_scheme' = 'exam'): Promise<Download> {
    const admin = getSessionRole() === 'admin';
    return request(`${admin ? '/admin' : ''}/papers/${idPath(paperId)}/download-url`, { method: 'POST', body: { kind }, auth: admin });
  },
  async recordDownload(paperId: string, kind: 'exam' | 'marking_scheme' = 'exam'): Promise<void> {
    const download = await api.getDownloadUrl(paperId, kind), link = document.createElement('a');
    link.href = download.url; link.download = download.filename; link.target = '_blank'; link.rel = 'noopener noreferrer';
    document.body.appendChild(link); link.click(); link.remove();
  },
  async getDepartments(): Promise<Department[]> {
    const [deps, progs, mods, papers] = await Promise.all([listAll<DepartmentDto>('/departments'), listAll<ProgramDto>('/programs'), listAll<ModuleDto>('/modules'), listAll<PaperDto>('/papers')]);
    return deps.map(d => ({ ...departmentFromDto(d), programsCount: progs.filter(p => p.departmentId === d.id).length,
      modulesCount: mods.filter(m => progs.some(p => p.id === m.programId && p.departmentId === d.id)).length, papersCount: papers.filter(p => p.department.id === d.id).length }));
  },
  async getPrograms(departmentId?: string): Promise<Program[]> {
    const [rows, deps, mods] = await Promise.all([listAll<ProgramDto>('/programs', { departmentId }), listAll<DepartmentDto>('/departments'), listAll<ModuleDto>('/modules', { departmentId })]);
    return rows.map(p => ({ ...p, departmentName: deps.find(d => d.id === p.departmentId)?.name || '', level: p.level === 'BACHELOR' ? 'Bachelor Degree' : 'Ordinary Diploma', modulesCount: mods.filter(m => m.programId === p.id).length }));
  },
  async getModules(filters: { programId?: string; departmentId?: string; semester?: 1 | 2 } = {}): Promise<Module[]> {
    const [rows, programs] = await Promise.all([listAll<ModuleDto>('/modules', filters), api.getPrograms(filters.departmentId)]);
    return rows.map(m => { const p = programs.find(p => p.id === m.programId); return { ...m, departmentId: p?.departmentId || '', departmentName: p?.departmentName || '', programName: p?.name || '', levelYear: m.levelYear ?? 0, credits: m.credits ?? 0, papersCount: 0 }; });
  },
  async getDepartment(id: string) {
    return optional(async () => {
      const d = await request<DepartmentDto>(`/departments/${idPath(id)}`);
      const [programs, modules, result] = await Promise.all([api.getPrograms(d.id), api.getModules({ departmentId: d.id }), api.searchPapers({ departmentId: d.id })]);
      return { department: { ...departmentFromDto(d), programsCount: programs.length, modulesCount: modules.length, papersCount: result.total }, programs, modules, papers: result.papers };
    });
  },
  async getProgram(id: string) {
    return optional(async () => {
      const p = await request<ProgramDto>(`/programs/${idPath(id)}`);
      const [programs, modules, result] = await Promise.all([api.getPrograms(p.departmentId), api.getModules({ programId: id }), api.searchPapers({ programId: id })]);
      return { program: programs.find(x => x.id === p.id)!, modules, papers: result.papers };
    });
  },
  async getModule(codeOrId: string) {
    return optional(async () => {
      const m = await request<ModuleDto>(`/modules/${idPath(codeOrId.includes('-') ? codeOrId : normalizeModuleCode(codeOrId))}`);
      const [modules, rows] = await Promise.all([api.getModules({ programId: m.programId }), listAll<PaperDto>('/papers', { moduleId: m.id })]);
      return { module: { ...modules.find(x => x.id === m.id)!, papersCount: rows.length }, papers: rows.map(paperFromDto) };
    });
  },
  async hasDuplicatePaper(input: { moduleId: string; category: 'TEST' | 'UE' | 'SUPP'; testNumber?: 1 | 2; academicYear: string; semester: 1 | 2 }) {
    return (await request<{ duplicateWarning: boolean }>('/papers/duplicate-check', { method: 'POST', auth: true, body: { ...input, academicYear: academicYearStart(input.academicYear) } })).duplicateWarning;
  },
  async uploadPaper(input: { title: string; moduleId: string; category: 'TEST' | 'UE' | 'SUPP'; testNumber?: 1 | 2; academicYear: string; semester: 1 | 2; examPeriod: string; examFile: File; markingSchemeFile?: File }) {
    const examUploadId = await uploadFile(input.examFile), markingSchemeUploadId = input.markingSchemeFile ? await uploadFile(input.markingSchemeFile) : undefined;
    const result = await request<{ id: string; status: string; duplicateWarning: boolean; levelTitle: string }>('/papers', { method: 'POST', auth: true,
      body: { title: input.title, moduleId: input.moduleId, category: input.category, testNumber: input.testNumber, academicYear: academicYearStart(input.academicYear), semester: input.semester, examPeriod: input.examPeriod, examUploadId, markingSchemeUploadId } });
      return { paperId: result.id, autoApproved: result.status === 'approved', duplicateWarning: result.duplicateWarning, levelTitle: result.levelTitle };
  },
  async reviewPaper(paperId: string, action: 'approve' | 'approve_with_edits' | 'reject' | 'spam', reason = '', edits?: Partial<Paper>) {
    await request(`/admin/papers/${idPath(paperId)}/review`, { method: 'PATCH', auth: true, body: { action: action === 'approve' || action === 'approve_with_edits' ? 'approved' : action === 'reject' ? 'rejected' : 'marked_spam', reason, title: edits?.title, moduleId: edits?.moduleId } });
    const paper = await api.getPaper(paperId);
    if (!paper) throw new Error('Reviewed paper could not be loaded.');
    return { success: true, xpDelta: 0, message: 'Review saved.', paper };
  },
  async getLeaderboard(period: 'week' | 'month' | 'all' = 'all'): Promise<UserProfile[]> { return (await listAll<ProfileDto>('/leaderboard', { period }, true)).map(profileFromDto); },
  async getMe(): Promise<UserProfile> { return profileFromDto(await request<ProfileDto>('/auth/me', { auth: true })); },
  async getUserProfile(username: string): Promise<UserProfile | null> { return optional(async () => profileFromDto(await request<ProfileDto>(`/users/by-username/${idPath(username)}`))); },
  async updateUserProfile(_username: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    return profileFromDto(await request<ProfileDto>('/users/me', { method: 'PATCH', auth: true, body: { username: updates.username, bio: updates.bio, avatarId: updates.avatarId } }));
  },
  async getXpLedger(userId: string): Promise<XpLedgerEntry[]> {
    return (await listAll<{ id: string; userId: string; eventType: XpLedgerEntry['type']; title: string; amount: number; createdAt: string; note: string; reason: string; status: XpLedgerEntry['status'] }>(`/admin/users/${idPath(userId)}/xp-ledger`, {}, true)).map(r => ({ ...r, type: r.eventType, date: r.createdAt, relativeTime: new Date(r.createdAt).toLocaleDateString(), note: r.note || r.reason }));
  },
  async getAchievements(): Promise<AchievementBadge[]> {
    const rows = await request<(Omit<AchievementBadge, 'xpReward' | 'isUnlocked' | 'unlockedDate' | 'badgeStatus'> & { unlockedAt: string | null })[]>('/users/me/achievements', { auth: true });
    return rows.map(r => ({ ...r, xpReward: 0, isUnlocked: !!r.unlockedAt, unlockedDate: r.unlockedAt || undefined, badgeStatus: r.unlockedAt ? 'Unlocked' : r.progress ? 'In Progress' : 'Locked' }));
  },
  async getNotifications(userId: string): Promise<AppNotification[]> { return (await listAll<Omit<AppNotification, 'read' | 'userId'> & { readAt: string | null }>('/notifications', {}, true)).map(n => ({ ...n, userId, read: !!n.readAt })); },
  async markNotificationRead(id: string) { await request(`/notifications/${idPath(id)}`, { method: 'PATCH', auth: true, body: { read: true } }); if (typeof window !== 'undefined') window.dispatchEvent(new Event('epapers-notifications-read')); },
  async markAllNotificationsRead(_userId: string) { await request('/notifications/read-all', { method: 'POST', auth: true }); if (typeof window !== 'undefined') window.dispatchEvent(new Event('epapers-notifications-read')); },
  async getFlags(): Promise<FlaggedReport[]> {
    return (await listAll<Omit<FlaggedReport, 'reportedAt' | 'reportedBy' | 'paperTitle' | 'moduleCode'> & { createdAt: string }>('/admin/flags', {}, true)).map(r => ({ ...r, reportedAt: r.createdAt, reportedBy: '', paperTitle: r.paperId, moduleCode: '' }));
  },
  async submitFlag(r: Omit<FlaggedReport, 'id' | 'reportedAt' | 'status'>) { return request('/flags', { method: 'POST', auth: true, body: { paperId: r.paperId, reason: r.reason, details: r.details } }); },
  async resolveFlag(id: string, status: 'resolved' | 'dismissed', note = 'Report reviewed by administrator') { await request(`/admin/flags/${idPath(id)}`, { method: 'PATCH', auth: true, body: { status, note } }); },
  async getTakedowns(): Promise<TakedownRequest[]> {
    return (await listAll<Omit<TakedownRequest, 'requesterName' | 'submittedAt' | 'paperTitle' | 'moduleCode'> & { requesterFullName: string; createdAt: string }>('/admin/takedowns', {}, true)).map(r => ({ ...r, requesterName: r.requesterFullName, submittedAt: r.createdAt, paperTitle: r.paperId, moduleCode: '' }));
  },
  async submitTakedown(r: Omit<TakedownRequest, 'id' | 'submittedAt' | 'status'>) { return request('/takedowns', { method: 'POST', auth: true, body: { paperId: r.paperId, requesterFullName: r.requesterName, requesterEmail: r.requesterEmail, affiliation: r.affiliation, reason: r.reason, evidence: r.evidence } }); },
  async resolveTakedown(id: string, status: 'approved_removed' | 'rejected', note: string) { await request(`/admin/takedowns/${idPath(id)}`, { method: 'PATCH', auth: true, body: { status, note } }); },
  async getModuleRequests(): Promise<ModuleRequest[]> {
    const [rows, programs] = await Promise.all([listAll<Omit<ModuleRequest, 'academicYear' | 'requestedAt'> & { academicYear: number; createdAt: string }>('/admin/module-requests', {}, true), api.getPrograms()]);
    return rows.map(r => { const p = programs.find(p => p.id === r.programId); return { ...r, academicYear: `${r.academicYear}/${r.academicYear + 1}`, requestedAt: r.createdAt, requestedBy: '', programName: p?.name || '', departmentId: p?.departmentId || '', departmentName: p?.departmentName || '' }; });
  },
  async submitModuleRequest(r: Omit<ModuleRequest, 'id' | 'requestedAt' | 'status' | 'notes'>) { return request('/module-requests', { method: 'POST', body: { departmentId: r.departmentId, programId: r.programId, moduleCode: normalizeModuleCode(r.moduleCode), moduleName: r.moduleName, academicYear: academicYearStart(r.academicYear), semester: r.semester, description: r.description } }); },
  async resolveModuleRequest(id: string, status: 'approved' | 'rejected', note = 'Curriculum request reviewed by administrator') { await request(`/admin/module-requests/${idPath(id)}`, { method: 'PATCH', auth: true, body: { status, note } }); },
  async getAuditLogPage(cursor?: string): Promise<{ items: AuditLogItem[]; nextCursor: string | null }> {
    type Row = Omit<AuditLogItem, 'adminUsername' | 'timestamp'> & { actorUserId: string; actorUsername?: string; actorRole?: string; createdAt: string };
    const params = new URLSearchParams({ limit: '100' });
    if (cursor) params.set('cursor', cursor);
    const page = await request<{ items: Row[]; nextCursor: string | null }>(`/admin/audit-logs?${params}`, { auth: true });
    return { nextCursor: page.nextCursor, items: page.items.map(r => ({ ...r, adminUsername: r.actorUsername || r.actorUserId || 'System', timestamp: r.createdAt, targetDescription: r.targetDescription || r.targetId || '' })) };
  },
  async getAuditLogs(): Promise<AuditLogItem[]> { return (await api.getAuditLogPage()).items; },
  async getAdminStats(): Promise<AdminStats> {
    const s = await request<{ pendingPapers: number; approvedPapers: number; flags: number; takedowns: number; moduleRequests: number; lecturers: number; users: number; downloads: number }>('/admin/dashboard/stats', { auth: true });
    return { pendingPapers: s.pendingPapers, totalPapers: s.approvedPapers, pendingFlags: s.flags, pendingTakedowns: s.takedowns, pendingModuleReqs: s.moduleRequests, verifiedLecturers: s.lecturers, totalUsers: s.users, totalDownloads: s.downloads };
  },
  async getAllUsers(): Promise<UserProfile[]> { return (await listAll<ProfileDto>('/admin/users', {}, true)).map(profileFromDto); },
  async manageUser(id: string, action: 'suspend' | 'ban' | 'reinstate' | 'change_role' | 'verify_lecturer' | 'adjust_xp', reason: string, payload?: { newRole?: Role; xpAdjustment?: number }) {
    const body: Record<string, unknown> = { reason };
    if (action === 'suspend' || action === 'ban' || action === 'reinstate') body.status = { suspend: 'SUSPENDED', ban: 'BANNED', reinstate: 'ACTIVE' }[action];
    if (action === 'change_role') body.role = payload?.newRole?.toUpperCase();
    if (action === 'verify_lecturer') { body.role = 'LECTURER'; body.lecturerVerified = true; }
    if (action === 'adjust_xp') body.grantXp = { amount: payload?.xpAdjustment, requestId: crypto.randomUUID() };
    return profileFromDto(await sensitiveRequest<ProfileDto>(`/admin/users/${idPath(id)}`, { method: 'PATCH', body }));
  },
  async createDepartment(d: Omit<Department, 'id' | 'programsCount' | 'modulesCount' | 'papersCount'>) {
    return departmentFromDto(await request<DepartmentDto>('/admin/departments', { method: 'POST', auth: true, body: { code: d.code, name: d.name, description: d.description, icon: d.icon, reason: 'Department added through curriculum management' } }));
  },
  async createProgram(p: Omit<Program, 'id' | 'modulesCount'>) {
    const result = await request<ProgramDto>('/admin/programs', { method: 'POST', auth: true, body: { departmentId: p.departmentId, code: p.code, name: p.name, level: p.level === 'BACHELOR' || /bachelor/i.test(p.level) ? 'BACHELOR' : 'ORDINARY_DIPLOMA', campus: p.campus || 'MAIN', awardTitle: p.awardTitle || p.name, reason: 'Program added through curriculum management' } });
    return { ...p, ...result, modulesCount: 0 };
  },
  async createModule(m: Omit<Module, 'id' | 'papersCount'>) {
    const result = await request<ModuleDto>('/admin/modules', { method: 'POST', auth: true, body: { programId: m.programId, code: normalizeModuleCode(m.code), name: m.name, semester: m.semester, levelYear: m.levelYear || undefined, credits: m.credits, reason: 'Module added through curriculum management' } });
    return { ...m, ...result, levelYear: result.levelYear ?? 0, credits: result.credits ?? 0, papersCount: 0 };
  },
  async deleteModule(id: string, reason: string) { await sensitiveRequest(`/admin/modules/${idPath(id)}`, { method: 'DELETE', body: { reason } }); },
  async getAnnouncements(): Promise<SystemAnnouncement[]> {
    return (await listAll<Omit<SystemAnnouncement, 'active' | 'startDate' | 'endDate'> & { isActive: boolean; startsAt: string; endsAt: string | null }>('/announcements/active')).map(a => ({ ...a, active: a.isActive, startDate: a.startsAt, endDate: a.endsAt || '' }));
  },
  async createAnnouncement(a: Omit<SystemAnnouncement, 'id'>, delivery: { sendEmail?: boolean; requestId?: string } = {}): Promise<SystemAnnouncement> {
    const r = await request<{ id: string }>('/admin/announcements', { method: 'POST', auth: true, body: { title: a.title, content: a.content, type: a.type, isActive: a.active, startsAt: new Date(a.startDate).toISOString(), endsAt: a.endDate ? new Date(a.endDate).toISOString() : null, reason: 'Announcement published through communications', sendEmail: delivery.sendEmail ?? false, requestId: delivery.requestId } });
    return { ...a, id: r.id };
  },
};
