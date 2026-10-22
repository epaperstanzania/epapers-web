import { beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from '@epapers/config/server-env';
import { createSmtpTransport, SmtpProvider } from '@epapers/server/lib/email/provider';
import { otpEmail, resetEmail, reviewEmail } from '@epapers/server/lib/email/templates';
const transport = vi.hoisted(() => ({ sendMail: vi.fn().mockResolvedValue({}), verify: vi.fn(), close: vi.fn() }));
vi.mock('nodemailer', () => ({ default: { createTransport: vi.fn(() => transport) } }));
import nodemailer from 'nodemailer';
beforeEach(() => vi.clearAllMocks());
describe('SMTP verification email delivery', () => {
    it('normalizes Gmail app passwords and uses TLS with bounded timeouts', () => {
        const previous = { host: env.SMTP_HOST, password: env.SMTP_PASSWORD, secure: env.SMTP_SECURE };
        try {
            env.SMTP_HOST = 'smtp.gmail.com'; env.SMTP_PASSWORD = 'abcd efgh ijkl mnop'; env.SMTP_SECURE = true;
            createSmtpTransport();
            expect(nodemailer.createTransport).toHaveBeenCalledWith(expect.objectContaining({ secure: true, requireTLS: false, auth: expect.objectContaining({ pass: 'abcdefghijklmnop' }), connectionTimeout: 10000, socketTimeout: 20000, debug: false }));
        } finally { env.SMTP_HOST = previous.host; env.SMTP_PASSWORD = previous.password; env.SMTP_SECURE = previous.secure; }
    });
    it('preserves other providers passwords and requires STARTTLS when secure is false', () => {
        const previous = { host: env.SMTP_HOST, password: env.SMTP_PASSWORD, secure: env.SMTP_SECURE };
        try {
            env.SMTP_HOST = 'smtp.example.com'; env.SMTP_PASSWORD = 'keep spaces'; env.SMTP_SECURE = false;
            createSmtpTransport();
            expect(nodemailer.createTransport).toHaveBeenCalledWith(expect.objectContaining({ requireTLS: true, auth: expect.objectContaining({ pass: 'keep spaces' }) }));
        } finally { env.SMTP_HOST = previous.host; env.SMTP_PASSWORD = previous.password; env.SMTP_SECURE = previous.secure; }
    });
    it('delivers both text and HTML from the configured sender', async () => {
        const message = otpEmail('recipient@example.com', '123456');
        await new SmtpProvider().send(message);
        expect(transport.sendMail).toHaveBeenCalledWith({ ...message, from: env.SMTP_FROM });
    });
    it('includes the same code and expiry in both verification formats', () => {
        const message = otpEmail('recipient@example.com', '012345');
        expect(message.subject).toBe('Verify your Epapers email');
        for (const body of [message.text, message.html]) {
            expect(body).toContain('012345'); expect(body).toContain('10 minutes'); expect(body).toContain('Epapers');
        }
    });
    it('uses the frontend origin for reset links and escapes review reasons', () => {
        expect(resetEmail('recipient@example.com', 'reset-token').text).toContain(env.APP_ORIGIN + '/reset-password?token=reset-token');
        expect(reviewEmail('recipient@example.com', false, '<script>alert(1)</script>').html).not.toContain('<script>');
    });
});
