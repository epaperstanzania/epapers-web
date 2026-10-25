'use client';
import { usePathname } from 'next/navigation';
import { AuthProvider } from './context/AuthContext';
import { AdminReauthentication } from './components/common/AdminReauthentication';
import { ApiFeedback } from './components/common/ApiFeedback';
import { RequestProgress } from './components/common/RequestProgress';
import { InstallApp } from './components/common/InstallApp';
export function Providers({ children }: { children: React.ReactNode }) {
  const pathname=usePathname();
  if(pathname==='/auth/session-bridge')return <>{children}</>;
  return <AuthProvider><AdminReauthentication /><ApiFeedback /><RequestProgress />{children}<InstallApp /></AuthProvider>;
}
