import 'server-only';
import nodemailer from 'nodemailer';
import { env } from '@epapers/config/server-env';
export interface EmailMessage {
    to: string;
    subject: string;
    html: string;
    text: string;
}
export interface EmailProvider {
    send(message: EmailMessage): Promise<void>;
}
export function createSmtpTransport() {
    return nodemailer.createTransport({
        host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_SECURE,
        requireTLS: !env.SMTP_SECURE,
        auth: { user: env.SMTP_USER, pass: env.SMTP_HOST === 'smtp.gmail.com' ? env.SMTP_PASSWORD?.replace(/\s/g, '') : env.SMTP_PASSWORD },
        connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000,
        logger: false, debug: false,
    });
}
export class SmtpProvider implements EmailProvider {
    private transport = createSmtpTransport();
    async send(message: EmailMessage) { await this.transport.sendMail({ ...message, from: env.SMTP_FROM }); }
}
export class ResendProvider implements EmailProvider {
    async send(message: EmailMessage) {
        const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...message, from: env.EMAIL_FROM }), signal: AbortSignal.timeout(15000) });
        if (!response.ok)
            throw new Error('Email delivery failed');
    }
}
export const emailProvider: EmailProvider = env.EMAIL_PROVIDER === 'smtp' ? new SmtpProvider() : new ResendProvider();
