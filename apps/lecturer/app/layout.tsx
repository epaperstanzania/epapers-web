import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Providers } from '@epapers/ui/providers';
import '@epapers/ui/styles.css';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {title:{default:'EPapers — lecturer',template:'%s | EPapers'},description:'Discover and contribute DIT examination papers.',applicationName:'EPapers Lecturer',appleWebApp:{capable:true,title:'EPapers Lecturer',statusBarStyle:'default'},icons:{icon:{url:'/E-Papers-logo.png',type:'image/png'},apple:'/icons/app-192.png'},robots:{index:false,follow:false}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body data-portal="lecturer"><a className="skip-link" href="#main-content">Skip to content</a><Suspense fallback={<p role="status">Loading EPapers…</p>}><Providers>{children}</Providers></Suspense></body></html>;}
