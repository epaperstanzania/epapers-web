import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { ApiError } from '@epapers/config/errors';
import { authenticate } from '@epapers/server/modules/auth/service';
import * as moderation from '@epapers/server/modules/moderation/service';
import * as messages from '@epapers/server/modules/admin/contact';
import { POST as flags } from '../../../apps/web/app/api/v1/flags/route';
import { POST as takedowns } from '../../../apps/web/app/api/v1/takedowns/route';
import { POST as contact } from '../../../apps/web/app/api/v1/contact-messages/route';
import { schemas } from '@epapers/server/modules/auth/schemas';
vi.mock('@epapers/server/lib/rate-limit', () => ({ rateLimit: vi.fn() }));
vi.mock('@epapers/server/lib/write-policy', () => ({ enforceWritePolicy: vi.fn() }));
vi.mock('@epapers/server/modules/auth/service', async original => ({ ...await original<typeof import('@epapers/server/modules/auth/service')>(), authenticate: vi.fn() }));
vi.mock('@epapers/server/modules/moderation/service', () => ({ flag: vi.fn(), takedown: vi.fn() }));
vi.mock('@epapers/server/modules/admin/contact', () => ({ contact: vi.fn() }));
const id = '11111111-1111-4111-8111-111111111111';
const surfaces = [
    { path: 'flags', handler: flags, service: moderation.flag, body: { paperId: id, reason: 'copyright', details: 'Test report' } },
    { path: 'takedowns', handler: takedowns, service: moderation.takedown, body: { paperId: id, requesterFullName: 'Test User', requesterEmail: 'test@example.com', affiliation: 'Test', reason: 'Copyright report fixture' } },
    { path: 'contact-messages', handler: contact, service: messages.contact, body: { senderName: 'Test User', senderEmail: 'test@example.com', subject: 'Test message', message: 'JWT-only test fixture' } },
];
const request = (path: string, body: unknown, token?: string) => new NextRequest(`https://api.example.com/api/v1/${path}`, {
    method: 'POST', headers: { Origin: 'https://app.example.com', 'X-EPapers-Client': 'web', 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body),
});
beforeEach(() => vi.resetAllMocks());
describe('JWT replaces CAPTCHA on reporting and contact routes', () => {
    for (const surface of surfaces) {
        it(`${surface.path} rejects guests before processing the request`, async () => {
            expect((await surface.handler(request(surface.path, surface.body))).status).toBe(401);
            expect(surface.service).not.toHaveBeenCalled();
        });
        it(`${surface.path} rejects invalid/expired sessions`, async () => {
            vi.mocked(authenticate).mockRejectedValue(new ApiError(401, 'UNAUTHORIZED', 'Authentication required'));
            expect((await surface.handler(request(surface.path, surface.body, 'invalid'))).status).toBe(401);
            expect(surface.service).not.toHaveBeenCalled();
        });
        it(`${surface.path} accepts authenticated requests without a challenge token`, async () => {
            const identity = { user: { id, role: 'CONTRIBUTOR', status: 'ACTIVE', deletedAt: null }, session: { id } } as Awaited<ReturnType<typeof authenticate>>;
            vi.mocked(authenticate).mockResolvedValue(identity);
            vi.mocked(surface.service).mockResolvedValue({ id, status: 'pending' });
            expect((await surface.handler(request(surface.path, surface.body, 'authenticated'))).status).toBe(200);
            expect(surface.service).toHaveBeenCalledWith(expect.not.objectContaining({ turnstileToken: expect.anything() }), identity.user);
        });
    }
    it('registration and password recovery schemas need no challenge token', () => {
        expect(schemas.register.safeParse({ username: 'test_user', email: 'test@example.com', password: 'Unique test password1!', fullName: 'Test User' }).success).toBe(true);
        expect(schemas.forgot.safeParse({ email: 'test@example.com' }).success).toBe(true);
    });
});
