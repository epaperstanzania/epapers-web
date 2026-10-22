import { test,expect,type BrowserContext } from '@playwright/test';
const origins={web:'http://localhost:4310',contributor:'http://localhost:4312',lecturer:'http://localhost:4313',admin:'http://localhost:4314'};
const proxyMode = process.env.EPAPERS_TEST_AUTH_MODE === 'proxy';
async function api(context:BrowserContext,role:string|null){
 await context.route('**/api/v1/**',async route=>{const url=new URL(route.request().url());let data:unknown={items:[],nextCursor:null};let status=200;
  if(url.pathname.endsWith('/auth/refresh')){if(!role){status=401;data=null;}else data={accessToken:'browser-fixture-access',user:{id:'browser-fixture-user',username:'fixture',role,email:'fixture@example.test',emailVerified:true,isLecturerVerified:role==='lecturer',levelTitle:'Novice Archivist',joinedAt:'2026-01-01T00:00:00.000Z'}};}
  if(url.pathname.endsWith('/settings/public'))data={};
  await route.fulfill({status,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':route.request().headers().origin||origins.web,'Access-Control-Allow-Credentials':'true'},body:JSON.stringify(status===401?{error:{code:'UNAUTHORIZED',message:'Sign in'}}:{data})});
 });
}
test('public information, keyboard skip link and mobile layout',async({page,context})=>{await api(context,null);await page.goto(origins.web+'/about');await expect(page.getByRole('heading',{name:/about/i}).first()).toBeVisible();await page.keyboard.press('Tab');await expect(page.getByRole('link',{name:'Skip to content'})).toBeFocused();await page.setViewportSize({width:375,height:812});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'.cache/public-mobile.png',fullPage:true});});
test('contributor session crosses the canonical iframe and links point to public host',async({page,context})=>{await api(context,'contributor');await page.goto(origins.contributor+'/dashboard/submissions');await expect(page.getByRole('heading',{name:'My Examination Submissions'})).toBeVisible();await expect(page.getByRole('link',{name:'Browse Papers',exact:true}).first()).toHaveAttribute('href',origins.web+'/search');await page.screenshot({path:'.cache/contributor-desktop.png',fullPage:true});});
test('lecturer verification is rendered in the faculty shell',async({page,context})=>{await api(context,'lecturer');await page.goto(origins.lecturer+'/verification');await expect(page.getByRole('heading',{name:'Lecturer verification',exact:true})).toBeVisible();await expect(page.getByText('Your lecturer account is verified.')).toBeVisible();await page.setViewportSize({width:375,height:812});await page.getByRole('button',{name:'Open menu',exact:true}).click();await expect(page.getByRole('navigation',{name:'Lecturer'})).toBeVisible();await page.getByRole('button',{name:'Close menu',exact:true}).click();await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'.cache/lecturer-mobile.png',fullPage:true});});
test('admin review loads with the console navigation and no browser exceptions',async({page,context})=>{await api(context,'admin');const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await page.goto(origins.admin+'/review');await expect(page.getByRole('link',{name:'Review Queue',exact:true}).first()).toBeVisible();await expect(page.getByText(/queue|pending/i).first()).toBeVisible();expect(errors).toEqual([]);await page.screenshot({path:'.cache/admin-desktop.png',fullPage:true});});
test('anonymous protected access redirects to canonical login with validated return URL',async({page,context})=>{await api(context,null);await page.goto(origins.contributor+'/dashboard/submissions');await expect(page).toHaveURL(new RegExp('localhost:4310/login'));const returnTo=new URL(page.url()).searchParams.get('returnTo');if(proxyMode){const authorize=new URL(returnTo!);expect(authorize.pathname).toBe('/auth/authorize');expect(authorize.searchParams.get('redirectUri')).toBe(origins.contributor+'/auth/callback');expect(authorize.searchParams.get('challenge')).toMatch(/^[A-Za-z0-9_-]{43}$/);const cookie=(await context.cookies()).find(cookie=>cookie.name==='epapers_portal_signin');expect(cookie?.httpOnly).toBe(true);expect(cookie?.sameSite).toBe('Lax');}else expect(returnTo).toBe(origins.contributor+'/dashboard/submissions');});

test('upload wizard keeps Test 2 metadata and confirms a saved submission even when history is unavailable', async ({ page, context }) => {
  await api(context, 'contributor');
  const department = { id: 'department', code: 'CST', name: 'Computing', description: '', icon: 'Building2' };
  const program = { id: 'program', departmentId: department.id, code: 'BSC', name: 'Computer Engineering', level: 'BACHELOR', campus: 'DIT', awardTitle: 'Bachelor' };
  const module = { id: 'module', programId: program.id, code: 'COE07201', name: 'Programming', semester: 1, levelYear: 2, credits: 10 };
  let submissions = 0;
  await context.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url()); let data: unknown;
    if (url.pathname.endsWith('/departments')) data = { items: [department], nextCursor: null };
    else if (url.pathname.endsWith('/programs')) data = { items: [program], nextCursor: null };
    else if (url.pathname.endsWith('/modules')) data = { items: [module], nextCursor: null };
    else if (url.pathname.endsWith('/duplicate-check')) data = { duplicateWarning: false };
    else if (url.pathname.endsWith('/uploads/presign')) data = { uploadId: 'upload', uploadUrl: 'https://storage.example.test/exam', headers: { 'Content-Type': 'application/pdf' } };
    else if (url.pathname.endsWith('/uploads/upload/complete')) data = { uploadId: 'upload' };
    else if (url.pathname.endsWith('/papers') && route.request().method() === 'POST') {
      const body = route.request().postDataJSON(); expect(body.category).toBe('TEST'); expect(body.testNumber).toBe(2); submissions++;
      data = { id: 'saved-paper', status: 'pending', duplicateWarning: false, levelTitle: 'Scholar' };
    } else if (url.pathname.endsWith('/users/me/papers') && submissions) {
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'UNAVAILABLE', message: 'History unavailable' } }) }); return;
    } else { await route.fallback(); return; }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data }) });
  });
  await context.route('https://storage.example.test/**', route => route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'PUT, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } }));
  await page.goto(origins.contributor + '/upload');
  await page.getByLabel('Department', { exact: true }).selectOption('department');
  const next = page.getByRole('button', { name: 'Continue', exact: true });
  await next.click(); await page.getByLabel('Program', { exact: true }).selectOption('program');
  await next.click(); await page.getByLabel('Academic year', { exact: true }).selectOption({ index: 1 });
  await next.click(); await page.getByRole('button', { name: 'Semester 1', exact: true }).click();
  await next.click(); await page.getByRole('button', { name: /COE07201 Programming/ }).click();
  await next.click(); await expect(next).toBeDisabled();
  await page.getByRole('button', { name: 'Test 2 Second continuous assessment' }).click(); await next.click();
  await page.getByLabel('Exam paper PDF (required)', { exact: true }).setInputFiles({ name: 'empty.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(0) });
  await expect(page.getByRole('alert')).toContainText('empty'); await expect(next).toBeDisabled();
  await page.getByLabel('Exam paper PDF (required)', { exact: true }).setInputFiles({ name: 'exam.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF') });
  await next.click(); await expect(page.locator('dd').filter({ hasText: /^Test 2$/ })).toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '.cache/upload-review-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Submit paper', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Submission received' })).toBeVisible();
  expect(submissions).toBe(1);
});
