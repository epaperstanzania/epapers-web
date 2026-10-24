import { request, type Session } from './client';

export type EmailChallenge = {
  verificationRequired: true; challengeToken: string; expiresAt: string; resendAfter: string; message: string;
};
export type LoginResult = Session | EmailChallenge;
export const needsEmailVerification = (result: LoginResult): result is EmailChallenge => 'verificationRequired' in result;
export function signIn(usernameOrEmail: string, password: string) {
  return request<LoginResult>('/auth/login', { method: 'POST', body: { usernameOrEmail, password }, retry: false });
}
export function verifySignIn(challengeToken: string, code: string, rememberDevice = false) {
  return request<Session>('/auth/admin/verify-login', { method: 'POST', body: { challengeToken, code, rememberDevice }, retry: false });
}
