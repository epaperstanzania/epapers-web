import 'server-only';
import { env } from '@epapers/config/server-env';
import { createSmtpTransport } from '@epapers/server/lib/email/provider';
export async function emailConnectivity(): Promise<{ status: 'healthy' | 'unhealthy' | 'unknown'; message: string }> {
  if (env.EMAIL_PROVIDER !== 'smtp') return { status: 'unknown', message: 'Provider connectivity is not probed for this adapter. Queue metrics remain available.' };
  const transport = createSmtpTransport();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([transport.verify(), new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new Error('SMTP probe timed out')), 8000); })]);
    return { status: 'healthy', message: 'SMTP connection, TLS and authentication verified. No test message was sent; this does not confirm inbox delivery.' };
  } catch {
    return { status: 'unhealthy', message: 'SMTP connection, TLS or authentication failed or timed out. Check mail configuration and the server trust store.' };
  } finally { clearTimeout(timer); transport.close(); }
}
