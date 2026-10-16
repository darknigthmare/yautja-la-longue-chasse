import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {productionBuildStepsV94,runProductionBuildV94} from '../scripts/build-production-v94.mjs';
const root='/tmp/yautja-fixture', nextCli='/tmp/yautja-fixture/node_modules/next/dist/bin/next';
test('production retains all existing verification and guarded packaging stages',()=>{
 const steps=productionBuildStepsV94(root,nextCli);
 assert.deepEqual(steps.map(s=>s.id),['audio','next','pit-css','native-origin','static-output']);
 assert.deepEqual(steps[1].args,[nextCli,'build','--webpack']);assert.ok(steps.every(s=>s.command===process.execPath));
});
test('success runs all five stages without a shell',()=>{
 const calls=[];const result=runProductionBuildV94({root,nextCli,log:()=>{},spawn:(command,args,options)=>{calls.push({command,args,options});return {status:0};}});
 assert.equal(result.ok,true);assert.equal(calls.length,5);assert.ok(calls.every(c=>c.options.cwd===root&&c.options.shell===false));
});
for(let failed=0;failed<5;failed++)test(`production is fail-fast at stage ${failed+1}`,()=>{
 let calls=0;const result=runProductionBuildV94({root,nextCli,log:()=>{},spawn:()=>({status:calls++===failed?7:0})});
 assert.equal(result.ok,false);assert.equal(result.exitCode,7);assert.equal(calls,failed+1);
});
test('process spawn errors fail rather than reporting a successful build',()=>{
 const result=runProductionBuildV94({root,nextCli,log:()=>{},spawn:()=>({error:new Error('ENOENT'),status:null})});assert.equal(result.ok,false);assert.equal(result.exitCode,1);
});
test('a killed build is an error even without an exit status',()=>{
 const result=runProductionBuildV94({root,nextCli,log:()=>{},spawn:()=>({signal:'SIGTERM',status:null})});assert.equal(result.ok,false);assert.equal(result.exitCode,1);
});
test('npm production and Vercel invoke the very same checked pipeline',()=>{
 const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
 const vercel=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
 assert.equal(pkg.scripts['build:production'],'node scripts/build-production-v94.mjs');assert.equal(vercel.buildCommand,pkg.scripts['build:production']);
 assert.match(pkg.scripts['qa:production'],/npm run test:audit:v94/);assert.match(pkg.scripts['qa:production'],/npm run build:production/);
});
