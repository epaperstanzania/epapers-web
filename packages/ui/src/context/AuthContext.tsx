'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserProfile, Role } from '../types';
import { api, profileFromDto } from '../services/api';
import { request, setSession, restoreSession, subscribeSession, getAccessToken, type Session } from '../services/client';
import { signIn, verifySignIn, needsEmailVerification, type LoginResult } from '../services/auth';
import { usePathname } from 'next/navigation';

interface AuthContextType {
  currentUser: UserProfile | null; role: Role; isAuthenticated: boolean; isGuest: boolean;
  loading: boolean; accessToken: string | null;
  login: (username: string, password: string) => Promise<LoginResult>;
  verifyAdminLogin: (challengeToken: string, code: string) => Promise<Session>;
  logout: () => void; refreshUser: () => Promise<void>;
  updateBioAndAvatar: (bio: string, avatarId: string) => Promise<void>;
  flashMessage: string | null; setFlashMessage: (message: string | null) => void;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  useEffect(() => {
    const unsubscribe = subscribeSession(session => {
      setAccessToken(session?.accessToken || null);
      setCurrentUser(session ? profileFromDto(session.user as Parameters<typeof profileFromDto>[0]) : null);
    });
    let active = true;
    void restoreSession().finally(() => { if (active) setLoading(false); });
    return () => { active = false; unsubscribe(); };
  }, []);
  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    void api.getAllPapers().then(papers => {
      if (!active) return;
      setCurrentUser(user => {
        if (!user || getAccessToken() !== accessToken) return user;
        const mine = papers.filter(p => p.uploadedBy.username === user.username), approved = mine.filter(p => p.status === 'APPROVED');
        return { ...user, submissionsCount: mine.length, approvedCount: approved.length,
          markingSchemesCount: approved.filter(p => p.hasMarkingScheme).length,
          acceptanceRate: mine.length ? Math.round(approved.length / mine.length * 100) : 0 };
      });
    }).catch(() => undefined);
    return () => { active = false; };
  }, [accessToken]);
  useEffect(() => {
    if (!accessToken || !currentUser?.id || !pathname || pathname.startsWith('/auth/')) return;
    void request('/users/me/activity', { method: 'POST', auth: true, body: { path: pathname } }).catch(() => undefined);
  }, [accessToken, currentUser?.id, pathname]);
  const refreshUser = async () => {
    const expectedToken = getAccessToken();
    const user = await api.getMe();
    if (expectedToken === getAccessToken()) setCurrentUser(current => ({ ...current, ...user,
      submissionsCount: current?.submissionsCount ?? 0, approvedCount: current?.approvedCount ?? 0,
      markingSchemesCount: current?.markingSchemesCount ?? 0, acceptanceRate: current?.acceptanceRate ?? 0 }));
  };
  const acceptSession = async (session: Session) => {
    setSession(session);
    await refreshUser().catch(() => undefined);
    return session;
  };
  const login = async (username: string, password: string) => {
    const result = await signIn(username, password);
    return needsEmailVerification(result) ? result : acceptSession(result);
  };
  const verifyAdminLogin = async (challengeToken: string, code: string) => {
    return acceptSession(await verifySignIn(challengeToken, code));
  };
  const logout = () => {
    // Capture the request before clearing the in-memory access token.
    const pending = accessToken ? request('/auth/logout', { method: 'POST', auth: true, retry: false }) : Promise.resolve();
    setSession(null);
    void pending.catch(() => setFlashMessage('Signed out locally. The backend session could not be closed; please retry when connected.'));
  };
  const updateBioAndAvatar = async (bio: string, avatarId: string) => {
    if (!currentUser) return;
    const user = await api.updateUserProfile(currentUser.username, { bio, avatarId });
    setCurrentUser({ ...currentUser, ...user, isLecturerVerified: currentUser.isLecturerVerified });
  };
  const role: Role = currentUser?.role || 'guest';
  return <AuthContext.Provider value={{ currentUser, role, loading, accessToken, isAuthenticated: !!accessToken && !!currentUser, isGuest: !accessToken,
    login, verifyAdminLogin, logout, refreshUser, updateBioAndAvatar, flashMessage, setFlashMessage }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
