import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const b=await build({stdin:{contents:'export * from "./app/game/systems/cloudResponseV94"; export * from "./app/game/systems/cloudAccountRestV71";',resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const a=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
const uri='https://example.invalid/test',enc=new TextEncoder();
const read=(fetcher,max=1000,timeout=1000)=>a.fetchCloudJsonV94(fetcher,uri,{},max,timeout);
const isReason=reason=>error=>error instanceof a.CloudResponseErrorV94&&error.reason===reason;
test('streamed UTF-8 across byte boundaries keeps the exact JSON value at its byte limit',async()=>{
 const data={message:'Chassé 🏆'},bytes=enc.encode(JSON.stringify(data));let index=0;
 const stream=new ReadableStream({pull(c){if(index===bytes.length)c.close();else c.enqueue(bytes.slice(index,index+++1));}});
 assert.deepEqual((await read(async()=>new Response(stream),bytes.length)).data,data);
});
test('oversized streams are cancelled without trusting content-length',async()=>{
 let cancelled=0;const stream=new ReadableStream({pull(c){c.enqueue(enc.encode('1234567890'));},cancel(){cancelled++;}});
 await assert.rejects(read(async()=>new Response(stream),9),isReason('oversized'));assert.equal(cancelled,1);
});
test('an oversized advertised body is refused before consuming its chunks',async()=>{
 let cancelled=0;const stream=new ReadableStream({cancel(){cancelled++;}});
 await assert.rejects(read(async()=>new Response(stream,{headers:{'content-length':'5000'}}),100),isReason('oversized'));assert.equal(cancelled,1);
});
test('a stalled custom fetch is bounded even when it ignores AbortSignal',async()=>{
 let signal;await assert.rejects(read(async(_url,options)=>{signal=options.signal;return new Promise(()=>{});},100,20),isReason('deadline'));
 assert.equal(signal.aborted,true);
});
test('a stalled native response body is bounded and cancelled',async()=>{
 let cancelled=0;const stream=new ReadableStream({cancel(){cancelled++;}});
 await assert.rejects(read(async()=>new Response(stream),100,20),isReason('deadline'));assert.equal(cancelled,1);
});
test('a late fetch rejection remains handled after the deadline',async()=>{
 let reject;await assert.rejects(read(()=>new Promise((_r,j)=>{reject=j;}),100,20),isReason('deadline'));reject(Error('late'));await new Promise(r=>setTimeout(r,0));
});
test('a late successful response is discarded without parsing it',async()=>{
 let resolve,cancelled=0;await assert.rejects(read(()=>new Promise(r=>{resolve=r;}),100,20),isReason('deadline'));
 resolve(new Response(new ReadableStream({cancel(){cancelled++;}})));await new Promise(r=>setTimeout(r,0));assert.equal(cancelled,1);
});
test('invalid JSON and invalid UTF-8 are rejected without embedding provider content',async()=>{
 for(const body of ['secret-token-password',Uint8Array.from([0xff,0xfe])])await assert.rejects(read(async()=>new Response(body)),e=>isReason('invalid-json')(e)&&!e.message.includes('secret'));
});
test('successful empty logout bodies and ordinary error JSON remain readable',async()=>{
 assert.deepEqual(await read(async()=>new Response(null,{status:204})),{ok:true,status:204,data:null});
 assert.deepEqual(await read(async()=>Response.json({error:'fixture'},{status:409})),{ok:false,status:409,data:{error:'fixture'}});
});
test('invalid resource budgets are rejected before sending any network request',async()=>{
 let calls=0;for(const [bytes,time] of [[0,100],[Infinity,100],[2**30,100],[100,0],[100,Infinity]])await assert.rejects(a.fetchCloudJsonV94(async()=>{calls++;return Response.json({});},uri,{},bytes,time),RangeError);assert.equal(calls,0);
});
test('malformed mutation acknowledgement never claims no remote archive was replaced and never retries',async()=>{
 let calls=0;const api=a.createCloudRestV71(async()=>{calls++;return new Response('provider-token-in-html');});
 await assert.rejects(api.push({accessToken:'test',refreshToken:'test',expiresAt:1,user:{id:'c4fcb61c-644f-448a-8d89-b47bd9d90e9c',email:'qa@example.invalid'}},1,{}),e=>/non confirmé/.test(e.message)&&!e.message.includes('Aucune archive remplacée')&&!e.message.includes('provider-token'));
 assert.equal(calls,1);
});
test('authentication response quota is enforced before session parsing',async()=>{
 const api=a.createCloudRestV71(async()=>new Response(' '.repeat(a.CLOUD_AUTH_RESPONSE_BYTES_V94+1)));
 await assert.rejects(api.signIn('qa@example.invalid','not-real'),/trop volumineuse/);
});
