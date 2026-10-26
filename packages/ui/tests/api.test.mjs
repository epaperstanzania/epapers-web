process.env.NODE_ENV = 'test';
import { getSystemHealth } from '../src/services/system-health.ts';
import assert from 'node:assert/strict';
import { test, afterEach } from 'node:test';
import { api, academicYearStart, paperFromDto } from '../src/services/api.ts';
import { request, listAll, setSession, getAccessToken, registerReauthentication, subscribePendingRequests } from '../src/services/client.ts';
import { signIn, verifySignIn, needsEmailVerification } from '../src/services/auth.ts';

const originalFetch = globalThis.fetch;
const ok = data => new Response(JSON.stringify({ data }), { headers: { 'Content-Type': 'application/json' } });
const failure = (status, code) => new Response(JSON.stringify({ error: { code, message: code } }), { status });
const session = accessToken => ({ accessToken, user: { id: 'owner', username: 'owner', role: 'contributor' } });
const paper = {
  id: 'paper', title: 'Real paper', academicYear: 2024, category: 'UE', semester: 1, examPeriod: 'UE',
  module: { id: 'module', programId: 'program', code: 'COE07201', name: 'Computing', semester: 1, levelYear: 2, credits: 10 },
  program: { id: 'program', departmentId: 'department', code: 'BSC', name: 'Computing', level: 'BACHELOR' },
  department: { id: 'department', code: 'CST', name: 'Computing', description: '', icon: 'Building2' },
  uploader: { username: 'owner', isLecturerVerified: false }, pageCount: 2, hasMarkingScheme: false,
  downloadAvailable: false, viewsCount: 2, downloadsCount: 1, createdAt: '2026-10-11T00:00:00Z',
};
afterEach(() => { globalThis.fetch = originalFetch; setSession(null); });

test('password field errors expose the specific backend reason without repeating generic validation messages', async () => {
  const message = 'An email address cannot be used as a password. Choose a different password.';
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request', fields: [{ path: 'password', message: 'Password must include a letter and a number.' }, { path: 'password', message }] } }), { status: 422 });
  await assert.rejects(request('/auth/register', { method: 'POST', body: {} }), error => error.message === message);
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { code: 'WEAK_PASSWORD', message: 'This password is too common and weak. Choose a less predictable password.' } }), { status: 422 });
  await assert.rejects(request('/auth/reset-password', { method: 'POST', body: {} }), /common and weak/);
});

test('admin login uses the shared credentials endpoint and requires a second email-code request', async () => {
  const calls = [], challenge = { verificationRequired: true, challengeToken: 'x'.repeat(43), expiresAt: new Date(Date.now() + 600000).toISOString(), resendAfter: new Date().toISOString(), message: 'Enter code' };
  globalThis.fetch = async (url, options) => { calls.push({ url, body: JSON.parse(options.body) }); return ok(calls.length === 1 ? challenge : { ...session('verified'), user: { id: 'admin', role: 'admin' } }); };
  const result = await signIn('admin@example.com', 'Correct1');
  assert.equal(needsEmailVerification(result), true); assert.equal(getAccessToken(), null);
  assert.equal(calls[0].url, '/api/v1/auth/login'); assert.deepEqual(calls[0].body, { usernameOrEmail: 'admin@example.com', password: 'Correct1' });
  const verified = await verifySignIn(result.challengeToken, '123456');
  assert.equal(verified.user.role, 'admin'); assert.equal(calls[1].url, '/api/v1/auth/admin/verify-login');
  assert.deepEqual(calls[1].body, { challengeToken: result.challengeToken, code: '123456', rememberDevice: false });
});

test('module requests keep the signed-in contributor identity while allowing guest requests', async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, headers: options.headers, body: JSON.parse(options.body) });
    return ok({ id: 'request-id', status: 'pending' });
  };
  const details = {
    departmentId: 'department', departmentName: 'Computing', programId: 'program', programName: 'Computer Engineering',
    academicYear: '2025/2026', semester: 2, moduleCode: 'COE 08204', moduleName: 'Cloud Computing',
    description: 'Missing from the upload list', requestedBy: 'contributor',
  };
  await api.submitModuleRequest(details);
  setSession(session('contributor-token'));
  await api.submitModuleRequest(details);
  assert.equal(calls[0].url, '/api/v1/module-requests');
  assert.equal(calls[0].headers.Authorization, undefined);
  assert.equal(calls[1].headers.Authorization, 'Bearer contributor-token');
  assert.equal(calls[1].body.moduleCode, 'COE08204');
});

test('paper demand is submitted and read from the API without fabricated suggestions', async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return ok(url.endsWith('/suggestions') ? [{ moduleId: 'module', requestsThisWeek: 2 }] : { id: 'request-id', status: 'pending' });
  };
  const input = { moduleId: 'module', category: 'TEST', testNumber: 1, academicYear: 2024, wantsMarkingScheme: true, description: 'Answer key needed' };
  await api.submitPaperRequest(input);
  setSession(session('contributor-token'));
  const suggestions = await api.getPaperSuggestions();
  assert.deepEqual(JSON.parse(calls[0].options.body), input);
  assert.equal(calls[0].url, '/api/v1/paper-requests');
  assert.equal(calls[1].url, '/api/v1/paper-requests/suggestions');
  assert.equal(calls[1].options.headers.Authorization, 'Bearer contributor-token');
  assert.equal(suggestions[0].requestsThisWeek, 2);
});

test('search translates filters, removes ALL, and follows every cursor', async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    const query = new URL(url, 'http://localhost').searchParams;
    assert.equal(query.get('academicYear'), '2024'); assert.equal(query.get('q'), 'COE07201');
    assert.equal(query.get('testNumber'), '2');
    assert.equal(query.has('departmentId'), false); assert.equal(query.get('hasMarkingScheme'), 'true');
    return ok({ items: [{ ...paper, id: query.has('cursor') ? 'second' : 'first' }], nextCursor: query.has('cursor') ? null : 'next' });
  };
  const result = await api.searchPapers({ query: 'COE07201', year: '2024/2025', departmentId: 'ALL', testNumber: 2, hasMarkingScheme: true });
  assert.equal(result.total, 2); assert.equal(result.papers[0].academicYear, '2024/2025');
  assert.equal(calls.length, 2); assert.equal(calls[0].options.credentials, 'include');
});
test('expired parallel authenticated requests share one refresh and retry with new JWT', async () => {
  setSession(session('expired')); let refreshes = 0;
  globalThis.fetch = async (url, options) => {
    if (url.endsWith('/auth/refresh')) { refreshes++; await new Promise(resolve => setTimeout(resolve, 10)); return ok(session('fresh')); }
    if (options.headers.Authorization === 'Bearer expired') return failure(401, 'UNAUTHORIZED');
    assert.equal(options.headers.Authorization, 'Bearer fresh'); return ok({ connected: true });
  };
  const responses = await Promise.all([request('/auth/me', { auth: true }), request('/notifications', { auth: true })]);
  assert.equal(refreshes, 1); assert.equal(responses.length, 2); assert.equal(getAccessToken(), 'fresh');
});
test('failed refresh clears JWT and stops retrying', async () => {
  setSession(session('expired')); let count = 0;
  globalThis.fetch = async () => { count++; return failure(401, 'UNAUTHORIZED'); };
  await assert.rejects(request('/auth/me', { auth: true }), { status: 401 });
  assert.equal(count, 2); assert.equal(getAccessToken(), null);
});
test('owner submissions use the authenticated owner route', async () => {
  setSession(session('owner-token'));
  globalThis.fetch = async (url, options) => {
    assert.equal(new URL(url, 'http://localhost').pathname, '/api/v1/users/me/papers');
    assert.equal(options.headers.Authorization, 'Bearer owner-token');
    return ok({ items: [{ ...paper, status: 'pending' }], nextCursor: null });
  };
  assert.equal((await api.getAllPapers())[0].status, 'PENDING');
});
test('a pending paper is read only through the authenticated owner list', async () => {
  setSession(session('owner-token'));
  globalThis.fetch = async (url, options) => {
    if (url.endsWith('/papers/paper')) return failure(404, 'NOT_FOUND');
    assert.ok(url.startsWith('/api/v1/users/me/papers?'));
    assert.equal(options.headers.Authorization, 'Bearer owner-token');
    return ok({ items: [{ ...paper, status: 'pending' }], nextCursor: null });
  };
  assert.equal((await api.getPaper('paper')).status, 'PENDING');
});
test('upload sends actual bytes to storage and only supported fields to paper submission', async () => {
  setSession(session('owner-token')); const calls = []; const file = new File(['%PDF-1.4\n%%EOF'], 'exam.pdf', { type: 'application/pdf' });
  globalThis.fetch = async (url, options) => {
    calls.push(url);
    if (url.endsWith('/uploads/presign')) {
      assert.deepEqual(JSON.parse(options.body), { filename: 'exam.pdf', contentType: 'application/pdf', sizeBytes: file.size });
      return ok({ uploadId: 'upload', uploadUrl: 'https://storage.invalid/upload', headers: { 'Content-Type': 'application/pdf', 'If-None-Match': '*', 'Content-Length': String(file.size) } });
    }
    if (url.startsWith('https://storage.invalid')) {
      assert.equal(options.body, file); assert.equal(options.credentials, 'omit');
      assert.equal(options.headers.has('Authorization'), false); assert.equal(options.headers.has('Content-Length'), false); assert.equal(options.headers.get('If-None-Match'), '*');
      return new Response(null, { status: 200 });
    }
    if (url.endsWith('/complete')) return ok({ uploadId: 'upload' });
    if (url.endsWith('/papers')) {
      const body = JSON.parse(options.body);
      assert.equal(body.examUploadId, 'upload'); assert.equal(body.academicYear, 2024);
      assert.equal('uploader' in body, false); assert.equal('departmentId' in body, false);
      return ok({ id: 'paper', status: 'pending', duplicateWarning: false, levelTitle: 'Scholar' });
    }
    throw new Error('Submission history is temporarily unavailable');
  };
  const result = await api.uploadPaper({ title: 'Real paper', moduleId: 'module', category: 'UE', academicYear: '2024/2025', semester: 1, examPeriod: 'UE', examFile: file });
  assert.equal(result.paperId, 'paper');
  assert.equal(result.autoApproved, false); assert.equal(calls[2], '/api/v1/uploads/upload/complete');
  assert.equal(calls.length, 4, 'A successful submission must not depend on a subsequent history request');
});
test('sensitive admin mutations attach reauthentication proof and uppercase status', async () => {
  setSession({ ...session('admin-token'), user: { id: 'admin', username: 'admin', role: 'admin' } });
  const unregister = registerReauthentication(async () => 'proof');
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/v1/admin/users/user'); assert.equal(options.headers['X-EPapers-Reauth'], 'proof');
    assert.deepEqual(JSON.parse(options.body), { reason: 'Policy violation', status: 'SUSPENDED' });
    return ok({ id: 'user', username: 'user', role: 'contributor', status: 'suspended', levelTitle: 'Scholar' });
  };
  try { assert.equal((await api.manageUser('user', 'suspend', 'Policy violation')).status, 'suspended'); }
  finally { unregister(); }
});
test('API failures remain failures instead of returning demo data', async () => {
  globalThis.fetch = async () => { throw new Error('offline'); };
  await assert.rejects(api.searchPapers(), { code: 'CONNECTION_FAILED' });
});
test('repeated cursors are rejected', async () => {
  globalThis.fetch = async () => ok({ items: [], nextCursor: 'same' });
  await assert.rejects(listAll('/papers'), { code: 'INVALID_CURSOR' });
});
test('paper adapter exposes metadata without inventing a public file URL', () => {
  const result = paperFromDto({ ...paper, uploader: null });
  assert.equal(result.pdfUrl, ''); assert.equal(result.uploadedBy.username, 'Deleted account');
  assert.equal(result.moduleId, 'module'); assert.equal(result.downloadAvailable, false);
  assert.equal(academicYearStart('2024/2025'), 2024); assert.throws(() => academicYearStart('ALL'));
});


test('identical concurrent writes share one request and pending feedback clears after success and failure', async () => {
  setSession(session('action-token'));
  const counts = [], unsubscribe = subscribePendingRequests(count => counts.push(count));
  let release, calls = 0;
  globalThis.fetch = async () => { calls++; await new Promise(resolve => { release = resolve; }); return ok({ message: 'Saved' }); };
  const first = request('/notifications/read-all', { method: 'POST', auth: true });
  const second = request('/notifications/read-all', { method: 'POST', auth: true });
  assert.equal(calls, 1); release();
  await Promise.all([first, second]);
  assert.deepEqual(counts, [0, 1, 0]);
  globalThis.fetch = async () => failure(500, 'FAILED');
  await assert.rejects(request('/notifications/read-all', { method: 'POST', auth: true }), /FAILED/);
  assert.equal(counts.at(-1), 0);
  unsubscribe();
});

test('broadcast passes the email choice and stable request ID to the real endpoint', async () => {
  setSession({ accessToken: 'admin-token', user: { id: 'admin', username: 'admin', role: 'admin' } });
  let body;
  globalThis.fetch = async (url, options) => { assert.match(url, /\/admin\/announcements$/); body = JSON.parse(options.body); return ok({ id: 'broadcast' }); };
  await api.createAnnouncement({ title: 'Notice', content: 'Campus message', type: 'info', active: true, startDate: '2026-10-11', endDate: '2026-11-11' }, { sendEmail: true, requestId: 'request-id' });
  assert.equal(body.sendEmail, true); assert.equal(body.requestId, 'request-id');
});


test('system health uses the authenticated admin endpoint without inventing fallback metrics', async () => {
  setSession({ accessToken: 'admin-health-token', user: { id: 'admin', username: 'admin', role: 'admin' } });
  globalThis.fetch = async (url, options) => { assert.match(url, /\/admin\/health$/); assert.equal(options.headers.Authorization, 'Bearer admin-health-token'); return ok({ status: 'warning', storage: [{ usedBytes: null }] }); };
  const result = await getSystemHealth(); assert.equal(result.status, 'warning'); assert.equal(result.storage[0].usedBytes, null);
  globalThis.fetch = async () => failure(503, 'UNAVAILABLE'); await assert.rejects(getSystemHealth(), /UNAVAILABLE/);
});
