'use client';
import { useState } from 'react';
import { GraduationCap, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Link, NavLink, Navigate } from '../../navigation';
import { EPapersLogo } from '../common/EPapersLogo';
import { LogoutButton } from '../common/LogoutButton';
import { PageLoader } from '../common/PageLoader';
import { portalOrigins } from '@epapers/config/portals';
export function LecturerLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuth(), [open, setOpen] = useState(false), [collapsed, setCollapsed] = useState(false);
  if (loading) return <PageLoader fullPage />;
  if (!currentUser) return <Navigate to="/login" replace />;
  if (currentUser.role !== 'lecturer') return <main id="main-content" className="mx-auto max-w-xl p-8"><h1 className="text-2xl font-bold">Lecturer access required</h1><p className="my-4">This portal is for lecturer accounts. Contact an administrator to request the lecturer role.</p><Link className="text-blue-800 underline" to="/dashboard">Return to your workspace</Link></main>;
  const items = [['Faculty overview', portalOrigins.lecturer + '/'], ['Faculty papers','/lecturer/papers'], ['Bulk upload','/lecturer/bulk-upload'], ['Verification','/lecturer/verification'], ['Account settings','/dashboard/settings'], ['Browse archive','/search']];
  return <div className="min-h-screen lg:flex"><aside className={`${open ? 'fixed inset-0 z-50 flex' : 'hidden'} ${collapsed ? 'lg:w-24' : 'lg:w-64'} flex-col bg-[#00337A] text-white lg:sticky lg:top-0 lg:flex lg:h-screen`}><div className="flex items-center justify-between p-5"><Link to={portalOrigins.lecturer + '/'}><EPapersLogo collapsed={collapsed} /></Link><button className="p-3 lg:hidden" aria-label="Close menu" onClick={()=>setOpen(false)}><X /></button></div><div className="flex items-center gap-2 px-5 py-4"><GraduationCap aria-hidden="true" />{!collapsed && <span>Lecturer workspace</span>}</div><nav className="flex-1 p-3" aria-label="Lecturer"><ul>{items.map(([label,to])=><li key={label}><NavLink to={to} end className={({isActive})=>`my-1 block rounded-lg px-4 py-3 ${isActive?'bg-white text-blue-950':'hover:bg-white/10'}`} onClick={()=>setOpen(false)} title={label}>{collapsed ? label.slice(0,1) : label}</NavLink></li>)}</ul></nav><button className="hidden p-4 lg:block" onClick={()=>setCollapsed(!collapsed)}>{collapsed?'Expand':'Collapse sidebar'}</button><LogoutButton /></aside><div className="min-w-0 flex-1"><header className="flex items-center justify-between border-b bg-white p-4"><button className="p-2 lg:hidden" aria-label="Open menu" aria-expanded={open} onClick={()=>setOpen(true)}><Menu /></button><span className="font-semibold">DIT faculty archive</span><span className="text-sm">@{currentUser.username}</span></header><main id="main-content" className="mx-auto max-w-7xl p-4 sm:p-8">{!currentUser.isLecturerVerified && <p className="mb-6 rounded-lg bg-amber-50 p-4 text-amber-950">Your account is not verified as a lecturer. <Link to="/lecturer/verification" className="underline">Review your verification</Link>. Submissions remain subject to moderation.</p>}{children}</main></div></div>;
}
