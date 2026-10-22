import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { request, setSession } from '../src/services/client.ts';
const original=globalThis.fetch;
afterEach(()=>{globalThis.fetch=original;setSession(null);});
test('an expired authenticated POST retries without deduplicating against itself',async()=>{
 setSession({accessToken:'expired',user:{id:'owner',username:'owner',role:'contributor'}});
 const calls=[];
 globalThis.fetch=async(url,options)=>{calls.push({url,options});if(url.endsWith('/auth/refresh'))return Response.json({data:{accessToken:'fresh',user:{id:'owner',username:'owner',role:'contributor'}}});if(options.headers.Authorization==='Bearer expired')return Response.json({error:{code:'UNAUTHORIZED',message:'expired'}},{status:401});return Response.json({data:{ok:true}});};
 const result=await Promise.race([request('/notifications/read-all',{method:'POST',auth:true}),new Promise((_,reject)=>{const timer=setTimeout(()=>reject(new Error('POST retry deadlocked')),1500);timer.unref();})]);
 assert.deepEqual(result,{ok:true});assert.equal(calls.length,3);assert.equal(calls[2].options.headers.Authorization,'Bearer fresh');
});
