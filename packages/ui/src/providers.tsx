'use client';
import { AuthProvider } from './context/AuthContext';
import { AdminReauthentication } from './components/common/AdminReauthentication';
import { ApiFeedback } from './components/common/ApiFeedback';
import { RequestProgress } from './components/common/RequestProgress';
export function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider><AdminReauthentication /><ApiFeedback /><RequestProgress />{children}</AuthProvider>;
}
