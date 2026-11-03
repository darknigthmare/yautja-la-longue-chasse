import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundled=await build({stdin:{contents:'export * from "./app/game/systems/cloudAccountRestV71";',resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const p=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const id='c4fcb61c-644f-448a-8d89-b47bd9d90e9c';
const auth={access_token:'test-access-token-long',refresh_token:'test-refresh-token-long',expires_at:2000000000,user:{id,email:'qa@example.invalid'}};
const session={accessToken:auth.access_token,refreshToken:auth.refresh_token,expiresAt:auth.expires_at,user:auth.user};
test('password sign-in sends credentials only to Auth and verifies response ownership shape',async()=>{
 const calls=[];const api=p.createCloudRestV71(async(url,options)=>{calls.push({url,options});return Response.json(auth);});
 assert.deepEqual(await api.signIn(' qa@example.invalid ','fake-password'),session);
 assert.match(calls[0].url,/\/auth\/v1\/token\?grant_type=password$/);
 assert.equal(calls[0].options.headers.Authorization,undefined);
 assert.deepEqual(JSON.parse(calls[0].options.body),{email:'qa@example.invalid',password:'fake-password'});
});
test('confirmation-required sign-up never invents a logged-in account',async()=>{
 const api=p.createCloudRestV71(async()=>Response.json({user:auth.user}));
 assert.equal(await api.signUp('qa@example.invalid','fake-password'),null);
});
test('malformed Auth expiry/token never becomes a usable session',async()=>{
 const api=p.createCloudRestV71(async()=>Response.json({...auth,expires_at:'invalid',expires_in:'invalid',access_token:'short'}));
 await assert.rejects(api.signIn('qa@example.invalid','fake-password'),/Session/);
 assert.equal(p.parseCloudSessionV71('{broken'),null);
});
test('refresh cannot change the account owner',async()=>{
 const api=p.createCloudRestV71(async()=>Response.json({...auth,user:{...auth.user,id:'0d235e68-f03d-478d-9c25-cf0e1f4bbb04'}}));
 await assert.rejects(api.refresh(session),/propriétaire/);
});
test('provider errors do not expose credentials or raw service messages',async()=>{
 const api=p.createCloudRestV71(async()=>Response.json({message:'secret-password test-access-token-long'},{status:400}));
 await assert.rejects(api.signIn('qa@example.invalid','secret-password'),e=>!e.message.includes('secret-password')&&!e.message.includes('test-access'));
});
test('update sends owner and previous revision filters, never a blind upsert',async()=>{
 const calls=[];const api=p.createCloudRestV71(async(url,options)=>{calls.push({url,options});return Response.json([{user_id:id,revision:3}]);});
 await api.push(session,2,{format:'yautja-account-archive',entries:[]});
 assert(calls[0].url.endsWith('user_id=eq.'+id+'&revision=eq.2'));
 assert.equal(calls[0].options.method,'PATCH');
 assert.equal(calls[0].options.headers.Authorization,'Bearer '+session.accessToken);
 assert.equal(JSON.parse(calls[0].options.body).revision,3);
 assert(!JSON.stringify(calls[0].options.body).includes('refreshToken'));
});
test('stale update and duplicate creation report a conflict, not success',async()=>{
 const empty=p.createCloudRestV71(async()=>Response.json([]));
 await assert.rejects(empty.push(session,2,{}),p.CloudRevisionConflictV71);
 const duplicate=p.createCloudRestV71(async()=>Response.json({code:'23505'},{status:409}));
 await assert.rejects(duplicate.push(session,null,{}),p.CloudRevisionConflictV71);
});
test('an invalid revision never issues any network request',async()=>{
 let called=false;const api=p.createCloudRestV71(async()=>{called=true;return Response.json([]);});
 await assert.rejects(api.push(session,Number.MAX_SAFE_INTEGER,{}),/Révision/);assert.equal(called,false);
});
