import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ verify: vi.fn(), close: vi.fn(), provider: { EMAIL_PROVIDER: 'smtp' } }));
vi.mock('@epapers/config/server-env', () => ({ env: mocks.provider }));
vi.mock('@epapers/server/lib/email/provider', () => ({ createSmtpTransport: () => ({ verify: mocks.verify, close: mocks.close }) }));
import { emailConnectivity } from '@epapers/server/lib/email/health';
beforeEach(() => { vi.clearAllMocks(); mocks.provider.EMAIL_PROVIDER = 'smtp'; });
afterEach(() => vi.useRealTimers());
describe('email health', () => {
  it('verifies SMTP without sending mail and closes the transport', async () => {
    mocks.verify.mockResolvedValue(true);
    expect((await emailConnectivity()).status).toBe('healthy'); expect(mocks.verify).toHaveBeenCalledTimes(1); expect(mocks.close).toHaveBeenCalledTimes(1);
  });
  it('returns a safe failed status for SMTP authentication/TLS errors', async () => {
    mocks.verify.mockRejectedValue(new Error('password:secret'));
    const result = await emailConnectivity(); expect(result.status).toBe('unhealthy'); expect(JSON.stringify(result)).not.toContain('password:secret'); expect(mocks.close).toHaveBeenCalledTimes(1);
  });
  it('times out an unresponsive SMTP probe and closes the transport', async () => {
    vi.useFakeTimers(); mocks.verify.mockReturnValue(new Promise(() => {}));
    const pending = emailConnectivity(); await vi.advanceTimersByTimeAsync(8000);
    expect((await pending).status).toBe('unhealthy'); expect(mocks.close).toHaveBeenCalledTimes(1);
  });
  it('labels unsupported provider probes as unknown', async () => {
    mocks.provider.EMAIL_PROVIDER = 'resend'; expect((await emailConnectivity()).status).toBe('unknown'); expect(mocks.verify).not.toHaveBeenCalled();
  });
});
