import { describe,it,expect } from 'vitest';
import { readFileSync,readdirSync } from 'node:fs';
import { join,relative } from 'node:path';
type Operation={security?:Array<Record<string,unknown>>,parameters?:Array<{name:string,required?:boolean}>,responses?:Record<string,{content?:Record<string,unknown>}>};
const document=JSON.parse(readFileSync('../../docs/openapi.yaml','utf8')) as {paths:Record<string,Record<string,Operation>>,components:{schemas:Record<string,unknown>}};
const normalize=(path:string)=>path.replace(/\{[^}]+\}/g,'{}');
function files(root:string):string[]{return readdirSync(root,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(root,e.name)):e.name==='route.ts'?[join(root,e.name)]:[]);}
describe('generated handover contract',()=>{
 it('documents every route method and keeps Node.js runtime explicit',()=>{
  const paths=new Map(Object.entries(document.paths).map(([p,v])=>[normalize(p),v]));
  for(const file of files('../../apps/web/app/api/v1')){
   const source=readFileSync(file,'utf8'),path='/'+relative('../../apps/web/app/api/v1',file).replaceAll('\\','/').replace(/\/route\.ts$/,'').replace(/\[(\w+)\]/g,'{$1}');
   expect(source,file).toMatch(/runtime\s*=\s*['"]nodejs['"]|export\s*\{[^}]*runtime/);
   const methods=[...source.matchAll(/export\s+(?:async\s+function|const)\s+(GET|POST|PATCH|DELETE)\b/g)].map(m=>m[1].toLowerCase());
   const exported=source.match(/export\s*\{([^}]+)\}/)?.[1]||'';methods.push(...[...exported.matchAll(/\b(GET|POST|PATCH|DELETE)\b/g)].map(m=>m[1].toLowerCase()));
   expect(methods.length,file).toBeGreaterThan(0);
   for(const method of methods)expect(paths.get(normalize(path))?.[method],method+' '+path).toBeDefined();
  }
 });
 it('resolves all local schema references',()=>{
  for(const item of Object.values(document.paths))for(const operation of Object.values(item))expect(operation.responses?.['200']?.content?.['application/json'] || operation.responses?.['200']?.content?.['image/jpeg'] || Object.keys(operation.responses || {}).some(status => Number(status) >= 300 && Number(status) < 400)).toBeTruthy();
  const text=JSON.stringify(document);for(const [,name] of text.matchAll(/"\$ref":"#\/components\/schemas\/([^"/]+)"/g))expect(document.components.schemas[name],name).toBeDefined();
 });
 it('documents admin bearer access and sensitive reauth headers',()=>{
  for(const [path,item] of Object.entries(document.paths))if(path.startsWith('/admin/'))for(const operation of Object.values(item))expect(operation.security).toEqual([{bearerAuth:[]}]);
  for(const [path,method] of [['/admin/users/{id}','patch'],['/admin/papers/{id}','delete'],['/admin/papers/{id}/restore','post'],['/admin/settings','patch']])expect(document.paths[path][method].parameters).toContainEqual(expect.objectContaining({name:'X-EPapers-Reauth',required:true}));
 });
});
