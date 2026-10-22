import 'server-only';
import { env } from '@epapers/config/server-env';
export function broadcastEmail(to: string, title: string, content: string) {
    const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
    const link = new URL('/dashboard/notifications', env.APP_ORIGIN).toString();
    return { to, subject: `Epapers: ${title.replace(/[\r\n]/g, ' ')}`, text: `${title}\n\n${content}\n\nView your Epapers notifications: ${link}`, html: `<h1>Epapers</h1><h2>${escape(title)}</h2><p style="white-space:pre-wrap">${escape(content)}</p><p><a href="${escape(link)}">View notifications</a></p>` };
}
export function otpEmail(to: string, code: string) {
    const text = `Your Epapers verification code is ${code}. It expires in 10 minutes. Enter this code on the Epapers email verification page. If you did not create an account, you can ignore this email. Do not share this code.`;
    return { to, subject: 'Verify your Epapers email', text, html: `<h1>Epapers</h1><p>Verify your email address</p><p>Your verification code is:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p><p>This code expires in 10 minutes. Enter it on the Epapers email verification page.</p><p>If you did not create an account, you can ignore this email. Do not share this code.</p>` };
}
export function adminCodeEmail(to: string, code: string, kind: 'login' | 'reauth') {
    const action = kind === 'login' ? 'administrator sign-in' : 'administrator action confirmation';
    return { to, subject: `Epapers ${action} code`,
        text: `Your Epapers ${action} code is ${code}. It expires in 10 minutes. Do not share this code. If you did not request it, secure your account.`,
        html: `<h1>Epapers</h1><p>Your ${action} code:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p><p>This code expires in 10 minutes. Do not share it. If you did not request it, secure your account.</p>` };
}
export function resetEmail(to: string, token: string) { const link = new URL('/reset-password', env.APP_ORIGIN); link.searchParams.set('token', token); const text = `Reset your Epapers password: ${link.toString()}. This link expires in 30 minutes.`; return { to, subject: 'Reset your Epapers password', text, html: `<p>${text.replaceAll('&', '&amp;')}</p>` }; }
export function reviewEmail(to:string,approved:boolean,reason:string){const text=approved?'Your Epapers contribution was approved.':'Your Epapers contribution was reviewed. Reason: '+reason;const escaped=text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');return {to,subject:approved?'Epapers contribution approved':'Epapers contribution reviewed',text,html:`<p>${escaped}</p>`};}
