// One-time, allowlisted source migration. Never reads environment or credential files.
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const source = path.dirname(root);
const read = p => fs.readFileSync(path.join(source, p), 'utf8');
const write = (p, s) => { const target = path.join(root, p); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, s); };
const json = (p, o) => write(p, JSON.stringify(o, null, 2) + '\n');
const files = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const copy = (from, to, extensions) => { for (const f of files(path.join(source, from))) if (extensions.includes(path.extname(f))) write(path.join(to, path.relative(path.join(source, from), f)), fs.readFileSync(f)); };
const special = {'lib/db':'@epapers/database','lib/retry':'@epapers/database/retry','lib/env':'@epapers/config/server-env','lib/errors':'@epapers/config/errors','lib/password-policy':'@epapers/config/password-policy','lib/jwt':'@epapers/auth/jwt','lib/crypto':'@epapers/auth/crypto'};
function serverImports(text, sourceFile) {
  return text.replace(/(['"])([^'"\n]+)\1/g, (all, quote, spec) => {
    if (spec === '@prisma/client') return quote + '@epapers/database/client' + quote;
    let resolved;
    if (spec.startsWith('@/')) resolved = spec.slice(2);
    else if (spec.startsWith('.')) { const absolute = path.resolve(path.dirname(path.join(source, sourceFile)), spec); const base = path.join(source, 'EpapersApi/src') + path.sep; if (absolute.startsWith(base)) resolved = path.relative(base, absolute).replaceAll('\\', '/'); }
    if (!resolved) return all;
    return quote + (special[resolved] || '@epapers/server/' + resolved) + quote;
  });
}
copy('EpapersApi/src', 'packages/server/src', ['.ts']);
copy('EpapersApi/prisma', 'packages/database/prisma', ['.prisma','.sql','.toml','.json','.ts']);
copy('EpapersApi/app/api', 'apps/web/app/api', ['.ts']);
copy('EpapersApi/worker', 'packages/server/src/jobs', ['.ts']);
copy('EpapersApi/tests', 'packages/server/tests', ['.ts']);
copy('userFrontend/src', 'packages/ui/src', ['.ts','.tsx','.css']);
copy('userFrontend/tests', 'packages/ui/tests', ['.mjs']);
for (const f of ['App.tsx','main.tsx']) fs.unlinkSync(path.join(root,'packages/ui/src',f));
for (const [name,target] of Object.entries(special)) {
  const rel = target.replace('@epapers/', 'packages/').split('/');
  const pkg = rel[1], entry = rel[2] || 'index';
  let text = read('EpapersApi/src/' + name + '.ts');
  text = serverImports(text, 'EpapersApi/src/' + name + '.ts');
  if (pkg === 'database') text = text.replaceAll('@epapers/database/client','@prisma/client');
  write(`packages/${pkg}/src/${entry}.ts`, text);
  // Retain no duplicate implementation in the server workspace.
  fs.unlinkSync(path.join(root,'packages/server/src',name+'.ts'));
}
write('packages/database/src/client.ts', "import 'server-only';\nexport * from '@prisma/client';\n");
for (const f of files(path.join(root,'packages/server/src'))) {
  const rel=path.relative(path.join(root,'packages/server/src'),f).replaceAll('\\','/');
  const origin=rel.startsWith('jobs/')?'EpapersApi/worker/'+rel.slice(5):'EpapersApi/src/'+rel;
  write(path.relative(root,f),serverImports(fs.readFileSync(f,'utf8'),origin));
}
for (const f of files(path.join(root,'apps/web/app/api'))) write(path.relative(root,f),serverImports(fs.readFileSync(f,'utf8'),'EpapersApi/'+path.relative(path.join(root,'apps/web'),f)));
let svc=fs.readFileSync(path.join(root,'packages/server/src/modules/auth/service.ts'),'utf8');
const active=svc.slice(svc.indexOf('function active('),svc.indexOf('async function enqueue('));
const authenticate=svc.slice(svc.indexOf('export async function authenticate('),svc.indexOf('export async function logout('));
const authorize=svc.slice(svc.indexOf('export function authorize('),svc.indexOf('export async function reauthenticate('));
write('packages/auth/src/server.ts',`import 'server-only';\nimport type { User } from '@epapers/database/client';\nimport { db } from '@epapers/database';\nimport { fail } from '@epapers/config/errors';\nimport { verifyAccess } from './jwt';\n${active}\n${authenticate}\n${authorize}`);
svc=svc.replace(authenticate,"export { authenticate, authorize } from '@epapers/auth/server';\n").replace(authorize,'');
write('packages/server/src/modules/auth/service.ts',svc);
write('packages/database/prisma/seed.ts',read('EpapersApi/prisma/seed.ts').replace("../src/lib/retry","../src/retry"));
for (const f of files(path.join(root,'packages/server/tests'))) {
 let text=serverImports(fs.readFileSync(f,'utf8'),'EpapersApi/tests/'+path.basename(f));
 text=text.replaceAll('../worker/','@epapers/server/jobs/').replaceAll('../app/api/','../../../apps/web/app/api/').replaceAll('../prisma/','../../database/prisma/');
 text=text.replaceAll("'docs/openapi.yaml'","'../../docs/openapi.yaml'").replaceAll("'app/api/v1'","'../../apps/web/app/api/v1'");
 write(path.relative(root,f),text);
}
for (const f of files(path.join(root,'packages/ui/src'))) {
 if (!/\.tsx?$/.test(f)) continue;
 let text=fs.readFileSync(f,'utf8').replaceAll("'react-router-dom'","'@epapers/ui/navigation'");
 if (f.endsWith('.tsx')) text="'use client';\n"+text;
 text=text.replaceAll('import.meta.env?.VITE_API_BASE_URL', 'process.env.NEXT_PUBLIC_API_BASE_URL');
 write(path.relative(root,f),text);
}
write('packages/auth/src/client.ts',fs.readFileSync(path.join(root,'packages/ui/src/services/client.ts'),'utf8'));
write('packages/auth/src/credentials.ts',read('userFrontend/src/services/auth.ts'));
write('packages/ui/src/services/client.ts',"export * from '@epapers/auth/client';\n");
write('packages/ui/src/services/auth.ts',"export * from '@epapers/auth/credentials';\n");
write('packages/ui/src/services/password-policy.ts',"export * from '@epapers/config/password-policy';\n");
for (const name of ['Guest','Contributor','Admin']) {
 const f=`packages/ui/src/components/layout/${name}Layout.tsx`;
 let text=fs.readFileSync(path.join(root,f),'utf8').replace(`export const ${name}Layout: React.FC = () => {`,`export const ${name}Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {`).replaceAll('<Outlet />','children_PLACEHOLDER').replaceAll('children_PLACEHOLDER','{children}').replace('NavLink, Outlet,','NavLink,');
 write(f,text);
}
const versions={next:'16.4.2',react:'19.3.1','react-dom':'19.3.1',typescript:'5.9.3',prisma:'6.19.3','@prisma/client':'6.19.3',zod:'4.3.6'};
const base={private:true,version:'2.0.0',type:'module'};
const checks={build:'tsc --noEmit',typecheck:'tsc --noEmit',lint:'eslint src --max-warnings=0'};
const manifest=(name,dependencies,exports,scripts=checks,devDependencies={})=>json(`${name.startsWith('apps/')?name:'packages/'+name}/package.json`,{...base,name:'@epapers/'+name.split('/').at(-1),exports,scripts,dependencies,devDependencies});
json('package.json',{...base,name:'epapers-v2',packageManager:'pnpm@10.33.4',engines:{node:'24.x',pnpm:'10.x'},scripts:{dev:'turbo run dev',build:'turbo run build',lint:'turbo run lint',typecheck:'turbo run typecheck',test:'turbo run test','db:generate':'pnpm --filter @epapers/database generate','db:migrate':'pnpm --filter @epapers/database migrate','db:seed':'pnpm --filter @epapers/database seed',worker:'pnpm --filter @epapers/worker start',check:'pnpm lint && pnpm typecheck && pnpm test && pnpm build'},devDependencies:{turbo:'2.11.10',typescript:versions.typescript,eslint:'9.39.5','@eslint/js':'9.39.5','@typescript-eslint/parser':'8.71.1','@typescript-eslint/eslint-plugin':'8.71.1','@types/node':'22.19.15','@types/react':'19.2.14','@types/react-dom':'19.2.3',tsx:'4.21.0',vitest:'4.1.0',globals:'16.5.0'}});
write('pnpm-workspace.yaml',`packages:\n  - apps/*\n  - packages/*\n  - worker\nonlyBuiltDependencies:\n  - '@prisma/client'\n  - '@prisma/engines'\n  - prisma\n  - argon2\n  - esbuild\n  - sharp\n`);
json('turbo.json',{$schema:'https://turborepo.dev/schema.json',globalDependencies:['tsconfig.base.json','eslint.config.mjs'],globalEnv:['NODE_ENV','NEXT_PUBLIC_*'],globalPassThroughEnv:['DATABASE_URL','APP_ORIGIN','API_ORIGIN','PORTAL_ORIGINS','COOKIE_DOMAIN','TRUST_PROXY','DATA_ENCRYPTION_KEY','JWT_ACCESS_SECRET','REFRESH_TOKEN_PEPPER','IP_HASH_SALT','R2_*','EMAIL_*','SMTP_*','RESEND_API_KEY','LOG_LEVEL','MAX_UPLOAD_BYTES','DAILY_UPLOAD_QUOTA','TEST_DATABASE_URL'],tasks:{generate:{cache:false,outputs:[]},build:{dependsOn:['^build','@epapers/database#generate'],cache:false,outputs:['.next/**','!.next/cache/**']},dev:{dependsOn:['@epapers/database#generate'],cache:false,persistent:true},lint:{dependsOn:['^lint'],outputs:[]},typecheck:{dependsOn:['^typecheck','@epapers/database#generate'],outputs:[]},test:{dependsOn:['^build','@epapers/database#generate'],cache:false,outputs:[]}}});
json('tsconfig.base.json',{compilerOptions:{target:'ES2022',lib:['dom','dom.iterable','es2022'],strict:true,noEmit:true,skipLibCheck:true,esModuleInterop:true,module:'esnext',moduleResolution:'bundler',resolveJsonModule:true,isolatedModules:true,jsx:'preserve'}});
write('.gitignore','node_modules/\n.next/\n.turbo/\n.cache/\n*.tsbuildinfo\n.env\n.env.*\n!.env.example\ncoverage/\nplaywright-report/\ntest-results/\n');
write('.node-version','24.13.0\n');
write('.npmrc','engine-strict=true\n');
write('eslint.config.mjs',`import js from '@eslint/js';\nimport parser from '@typescript-eslint/parser';\nimport ts from '@typescript-eslint/eslint-plugin';\nimport globals from 'globals';\nexport default [{ignores:['**/node_modules/**','**/.next/**','**/.cache/**','**/next-env.d.ts']},js.configs.recommended,{languageOptions:{globals:{...globals.node,...globals.browser}}},{files:['**/*.ts','**/*.tsx'],languageOptions:{parser},plugins:{'@typescript-eslint':ts},rules:{...ts.configs.recommended.rules,'no-undef':'off','no-unused-vars':'off','@typescript-eslint/no-unused-vars':'off'}}];\n`);
manifest('database',{'@prisma/client':versions['@prisma/client'],'server-only':'0.0.1'},{'.':'./src/index.ts','./client':'./src/client.ts','./retry':'./src/retry.ts'}, {...checks,generate:'prisma generate',migrate:'prisma migrate deploy',seed:'node --conditions=react-server --import tsx prisma/seed.ts'},{prisma:versions.prisma});
manifest('config',{zod:versions.zod,'server-only':'0.0.1'},{'./server-env':'./src/server-env.ts','./errors':'./src/errors.ts','./password-policy':'./src/password-policy.ts','./portals':'./src/portals.ts'});
manifest('auth',{'@epapers/database':'workspace:*','@epapers/config':'workspace:*',jose:'6.1.3',argon2:'0.41.1','server-only':'0.0.1'},{'./server':'./src/server.ts','./jwt':'./src/jwt.ts','./crypto':'./src/crypto.ts','./client':'./src/client.ts','./credentials':'./src/credentials.ts','./policy':'./src/policy.ts'});
const apiDeps=JSON.parse(read('EpapersApi/package.json')).dependencies;
delete apiDeps['@prisma/client']; delete apiDeps.jose; delete apiDeps.argon2;
Object.assign(apiDeps,{next:versions.next,react:versions.react,'react-dom':versions['react-dom'],zod:versions.zod,'@epapers/database':'workspace:*','@epapers/auth':'workspace:*','@epapers/config':'workspace:*'});
manifest('server',apiDeps,{'./lib/*':'./src/lib/*.ts','./modules/*':'./src/modules/*.ts','./jobs/*':'./src/jobs/*.ts'},{...checks,test:'vitest run'},{'@types/nodemailer':'6.4.23'});
write('packages/server/vitest.config.ts',`import { defineConfig } from 'vitest/config';\nimport { fileURLToPath } from 'node:url';\nexport default defineConfig({resolve:{alias:{'server-only':fileURLToPath(new URL('./tests/server-only.ts',import.meta.url))}},test:{setupFiles:['tests/setup.ts'],testTimeout:30000,hookTimeout:60000}});\n`);
manifest('ui',{'@epapers/auth':'workspace:*','@epapers/config':'workspace:*',next:versions.next,react:versions.react,'react-dom':versions['react-dom'],'lucide-react':'0.546.0','tailwindcss':'4.3.3','@fontsource-variable/inter':'5.2.8','@fontsource-variable/plus-jakarta-sans':'5.2.8'},{'./navigation':'./src/navigation.tsx','./providers':'./src/providers.tsx','./styles.css':'./src/index.css','./*':'./src/*.tsx'},{...checks,test:'node --import tsx --test tests/*.test.mjs'});
for (const pkg of ['database','auth','config','server','ui']) json(`packages/${pkg}/tsconfig.json`,{extends:'../../tsconfig.base.json',include:['src/**/*.ts','src/**/*.tsx',...(pkg==='database'?['prisma/seed.ts']:[])],exclude:['node_modules']});
const ports={web:3000,contributor:3002,lecturer:3003,admin:3004};
for (const [app,port] of Object.entries(ports)) {
 manifest('apps/'+app,{next:versions.next,react:versions.react,'react-dom':versions['react-dom'],'@epapers/ui':'workspace:*','@epapers/auth':'workspace:*','@epapers/config':'workspace:*',...(app==='web'?{'@epapers/server':'workspace:*','@epapers/database':'workspace:*',zod:versions.zod}:{})},{'.':'./app/layout.tsx'},{dev:`next dev -p ${port}`,build:'next build --webpack',start:`next start -p ${port}`,lint:'eslint app --max-warnings=0',typecheck:'next typegen && tsc --noEmit'},{'@tailwindcss/postcss':'4.3.3'});
 json(`apps/${app}/tsconfig.json`,{extends:'../../tsconfig.base.json',compilerOptions:{plugins:[{name:'next'}],incremental:true},include:['next-env.d.ts','app/**/*.ts','app/**/*.tsx','.next/types/**/*.ts','.next/dev/types/**/*.ts'],exclude:['node_modules']});
 write(`apps/${app}/next-env.d.ts`,'/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n');
 write(`apps/${app}/postcss.config.mjs`,"export default { plugins: { '@tailwindcss/postcss': {} } };\n");
 write(`apps/${app}/next.config.ts`,`import type { NextConfig } from 'next';\nimport path from 'node:path';\nimport { portalOrigins } from '@epapers/config/portals';\nconst config: NextConfig = {output:'standalone',outputFileTracingRoot:path.resolve(import.meta.dirname,'../..'),poweredByHeader:false,transpilePackages:['@epapers/ui','@epapers/auth','@epapers/config','@epapers/server','@epapers/database'],experimental:{cpus:2},env:{NEXT_PUBLIC_PORTAL:'${app}'},async redirects(){return ${app==='web'?`[{source:'/dashboard/:path*',destination:portalOrigins.contributor+'/dashboard/:path*',permanent:false},{source:'/upload',destination:portalOrigins.contributor+'/upload',permanent:false},{source:'/admin/:path*',destination:portalOrigins.admin+'/:path*',permanent:false},{source:'/lecturer/papers',destination:portalOrigins.lecturer+'/papers',permanent:false},{source:'/lecturer/bulk-upload',destination:portalOrigins.lecturer+'/bulk-upload',permanent:false},{source:'/leaderboard',destination:portalOrigins.contributor+'/leaderboard',permanent:false},{source:'/help',destination:portalOrigins.contributor+'/help',permanent:false}]`:app==='admin'?`[{source:'/admin/:path*',destination:'/:path*',permanent:false},{source:'/security',destination:'/health',permanent:false}]`:app==='lecturer'?`[{source:'/lecturer/papers',destination:'/papers',permanent:false},{source:'/lecturer/bulk-upload',destination:'/bulk-upload',permanent:false}]`:'[]'};}};\nexport default config;\n`);
 fs.mkdirSync(path.join(root,`apps/${app}/public`),{recursive:true});
 fs.copyFileSync(path.join(source,'userFrontend/public/E-Papers-logo.png'),path.join(root,`apps/${app}/public/E-Papers-logo.png`));
 write(`apps/${app}/app/layout.tsx`,`import type { Metadata } from 'next';\nimport { Suspense } from 'react';\nimport { Providers } from '@epapers/ui/providers';\nimport '@epapers/ui/styles.css';\nexport const dynamic = 'force-dynamic';\nexport const metadata: Metadata = {title:{default:'EPapers${app==='web'?' — DIT examination archive':' — '+app}',template:'%s | EPapers'},description:'Discover and contribute DIT examination papers.',${app==='web'?'':"robots:{index:false,follow:false},"}};\nexport default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body data-portal="${app}"><a className="skip-link" href="#main-content">Skip to content</a><Suspense fallback={<p role="status">Loading EPapers…</p>}><Providers>${app==='web'?'<div id="main-content">{children}</div>':'children_MARK'}</Providers></Suspense></body></html>;}\n`.replace('children_MARK','{children}'));
 write(`apps/${app}/app/loading.tsx`,"export { PageLoader as default } from '@epapers/ui/components/common/PageLoader';\n");
 write(`apps/${app}/app/error.tsx`,"'use client';\nexport default function ErrorPage({reset}:{error:Error;reset:()=>void}){return <main className=\"mx-auto max-w-xl p-8\"><h1 className=\"text-2xl font-bold\">This page could not be loaded</h1><p role=\"alert\">Please retry. If the problem continues, contact EPapers support.</p><button className=\"mt-4 rounded bg-blue-800 p-3 text-white\" onClick={reset}>Try again</button></main>;}\n");
 write(`apps/${app}/app/not-found.tsx`,"export { NotFoundPage as default } from '@epapers/ui/pages/guest/StaticPages';\n");
}
const page=(app,route,file,name)=>write(`apps/${app}/app/(portal)${route==='/'?'':route}/page.tsx`,`import { ${name} } from '@epapers/ui/pages/${file}';\nexport const metadata = { title: '${name.replace(/Page$/,'').replace(/([a-z])([A-Z])/g,'$1 $2')}' };\nexport default function Page(){return <${name} />;}\n`);
const inventory=[];
const map=(app,route,file,name)=>{page(app,route,file,name);inventory.push({app,route,component:name});};
for (const [route,file,name] of [['/','HomePage','HomePage'],['/search','SearchPage','SearchPage'],['/departments','DepartmentsListPage','DepartmentsListPage'],['/departments/[dept]','DepartmentDetailPage','DepartmentDetailPage'],['/modules/[code]','ModuleDetailPage','ModuleDetailPage'],['/papers/[id]','PaperDetailPage','PaperDetailPage'],['/recent','RecentPopularPages','RecentPage'],['/popular','RecentPopularPages','PopularPage']]) map('web',route,'guest/'+file,name);
for(const [route,name] of [['how-it-works','HowItWorks'],['faq','Faq'],['about','About'],['contact','Contact'],['privacy','Privacy'],['terms','Terms'],['takedown','Takedown'],['request-module','RequestModule'],['offline','Offline'],['rate-limit','RateLimit']]) map('web','/'+route,'guest/StaticPages',name+'Page');
for(const [route,name,file] of [['login','LoginPage','LoginPage'],['register','RegisterPage','AuthPages'],['verify','VerifyOtpPage','AuthPages'],['forgot-password','ForgotPasswordPage','AuthPages'],['reset-password','ResetPasswordPage','ResetPasswordPage']])map('web','/'+route,'contributor/'+file,name);
for(const [route,name,file] of [['/dashboard','DashboardPage','DashboardPage'],['/upload','UploadPage','UploadPage'],['/dashboard/submissions','SubmissionsPage','SubmissionsPage'],['/dashboard/achievements','AchievementsPage','XpAndAchievementsPages'],['/leaderboard','LeaderboardPage','LeaderboardPage'],['/dashboard/notifications','NotificationsPage','NotificationsSettingsPages'],['/dashboard/settings','SettingsPage','NotificationsSettingsPages']])map('contributor',route,'contributor/'+file,name);
map('web','/u/[username]','contributor/UserProfilePage','UserProfilePage');
map('contributor','/u/[username]','contributor/UserProfilePage','UserProfilePage');
map('contributor','/dashboard/request-module','guest/StaticPages','RequestModulePage');
map('contributor','/help','guest/StaticPages','HowItWorksPage');
for(const [route,name,file] of [['/','DashboardPage','DashboardPage'],['/papers','LecturerPapersPage','LecturerPages'],['/bulk-upload','BulkUploadPage','LecturerPages'],['/dashboard/settings','SettingsPage','NotificationsSettingsPages'],['/verification','VerificationPage','VerificationPage']])map('lecturer',route,'contributor/'+file,name);
for(const [route,name,file] of [['/','AdminOverviewPage','AdminOverviewPage'],['/review','AdminReviewPage','AdminReviewPage'],['/flags','AdminFlagsPage','AdminFlagsTakedownsPages'],['/takedowns','AdminTakedownsPage','AdminFlagsTakedownsPages'],['/structure','AdminCurriculumStructurePage','AdminCurriculumStructurePage'],['/users','AdminUsersPage','AdminUsersPage'],['/module-requests','AdminModuleRequestsPage','AdminGovernancePages'],['/papers','AdminPapersDirectoryPage','AdminGovernancePages'],['/lecturers','AdminLecturersPage','AdminGovernancePages'],['/audit','AdminAuditLogPage','AdminGovernancePages'],['/health','AdminSystemHealthPage','AdminGovernancePages'],['/communications','AdminCommunicationsPage','AdminGovernancePages'],['/settings','AdminSettingsPage','AdminGovernancePages']])map('admin',route,'admin/'+file,name);
map('admin','/notifications','contributor/NotificationsSettingsPages','NotificationsPage');
for(const [app,shell] of [['web','Guest'],['contributor','Contributor'],['admin','Admin'],['lecturer','Lecturer']])write(`apps/${app}/app/(portal)/layout.tsx`,`import { ${shell}Layout } from '@epapers/ui/components/layout/${shell}Layout';\nexport default function Layout({children}:{children:React.ReactNode}){return <${shell}Layout>{children}</${shell}Layout>;}\n`);
write('apps/contributor/app/page.tsx',"import {redirect} from 'next/navigation';\nexport default function Page(){redirect('/dashboard');}\n");
json('docs/route-inventory.json',inventory);
write('docs/openapi.yaml',read('EpapersApi/docs/openapi.yaml'));
for(const name of ['BACKUP-RESTORE','ADMIN','AUTH','UPLOADS-MODERATION','SECURITY','FRONTEND-INTEGRATION','SYSTEM-HEALTH']) write(`docs/source/${name}.md`,read(`EpapersApi/docs/${name}.md`));
json('worker/package.json',{...base,name:'@epapers/worker',exports:{'.':'./index.ts'},scripts:{...checks,lint:'eslint index.ts --max-warnings=0',start:'node --conditions=react-server --import tsx index.ts'},dependencies:{'@epapers/server':'workspace:*'}});
write('worker/index.ts',"import '@epapers/server/jobs/index';\n");
json('worker/tsconfig.json',{extends:'../tsconfig.base.json',include:['index.ts']});
console.log(`Migrated ${inventory.length} portal pages, ${files(path.join(root,'apps/web/app/api')).length} API route files, schema, services, tests, and worker.`);
