import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { build } from 'esbuild';
const bundle=await build({stdin:{contents:`export * from './app/game/hunterDreadsV63';export * from './app/game/hunterRig';export {hunterBodyPartPath,hunterBodyPartPlacement} from './app/game/hunterVisuals';export {defaultSave,normalizeSave} from './app/game/save';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const profiles=JSON.parse(fs.readFileSync('app/game/data/hunterDreadProfilesV63.json'));
const morphs=['classic','elder','super','feral','huntress','young'];

test('all preserved original heads remain available independently of body, and normalization persists their selection',()=>{
 for(const morph of morphs){
  const old=api.hunterBodyPartPath(morph,'head','legacy-clan');
  assert(old.endsWith(`/body/${morph}/parts/head.webp`));assert(fs.existsSync('public'+old));
  assert.equal(api.hunterBodyPartPlacement(morph,'head','legacy-clan'),undefined);
  assert(api.hunterBodyPartPath(morph,'head','reference').startsWith('/game/sprites/v62/heads/'));
  assert.equal(api.hunterBodyPartPath(morph,'torso','legacy-clan'),api.hunterBodyPartPath(morph,'torso','reference'));
  const save=api.defaultSave();save.appearance.bodyMorphId=morph;save.appearance.headStyleId='legacy-clan';
  const restored=api.normalizeSave(JSON.parse(JSON.stringify(save)));
  assert.equal(restored.appearance.headStyleId,'legacy-clan');assert.equal(restored.appearance.bodyMorphId,morph);
 }
 const old=api.defaultSave();delete old.appearance.headStyleId;assert.equal(api.normalizeSave(old).appearance.headStyleId,'reference');assert.equal(api.normalizeSave(old).appearance.presetId,'jungle-hunter');
 old.appearance.headStyleId='forged';assert.equal(api.normalizeSave(old).appearance.headStyleId,'reference');assert.equal(api.normalizeSave(old).appearance.presetId,'custom');
});

test('collision profiles match every unchanged source bitmap',()=>{
 assert.equal(Object.keys(profiles).length,8);
 for(const [style,profile] of Object.entries(profiles)){
  assert.equal(profile.width,256);assert.equal(profile.height,384);assert(profile.samples.length>10);
  const source=fs.readFileSync(`public/game/assets/v3/actors/yautja/hunter/dreads/registered/${style}.webp`);
  assert.equal(createHash('sha256').update(source).digest('hex'),profile.sha256);
 }
});

test('damped motion responds to running, settles after braking, survives long frames and freezes in pause',()=>{
 let state={angles:Array(7).fill(0),velocities:Array(7).fill(0)};
 assert.strictEqual(api.stepHunterDreadsV63(state,0,1000,1000),state);
 for(let tick=0;tick<180;tick++)state=api.stepHunterDreadsV63(state,1/60,400,-600);
 assert(state.angles.every(angle=>angle>.05&&angle<.4));
 const moving=state.angles[0];
 for(let tick=0;tick<300;tick++)state=api.stepHunterDreadsV63(state,1/60,0,0);
 assert(Math.abs(state.angles[0])<.001&&Math.abs(state.angles[0])<moving);
 state=api.stepHunterDreadsV63({angles:[Infinity,NaN,100],velocities:[-Infinity,NaN,100]},60,Infinity,NaN);
 assert.equal(state.angles.length,7);assert(state.angles.every(a=>Number.isFinite(a)&&a>=-.25&&a<=.55));
 const simulate=fps=>{let s={angles:Array(7).fill(0),velocities:Array(7).fill(0)};for(let t=0;t<fps*2;t++)s=api.stepHunterDreadsV63(s,1/fps,t<fps?400:0,0);return s;};
 const reference=simulate(120);for(const fps of [30,60])simulate(fps).angles.forEach((angle,i)=>assert(Math.abs(angle-reference.angles[i])<1e-8,'frame rate changed damping'));
});

test('posed strands remain rooted and outside skull, neck and torso across all styles, morphs and facings',()=>{
 const bind=api.solveHunterRig({pose:'idle',facing:1,phase:0,aimAngle:0});
 const failures=[];
 for(const morph of morphs)for(const style of Object.keys(profiles))for(const head of ['reference','legacy-clan'])for(const facing of [-1,1])for(const pose of ['idle','run','jump','fall','climb','extract'])for(const phase of [0,.25,.5,.75,.99]){
  const frame=api.solveHunterRig({pose,facing,phase,speed:420,verticalVelocity:pose==='jump'?-600:700,extractionProgress:phase,worldX:83,worldY:-22,scale:1.4});
  const headMatrix=api.relativeBoneMatrix(frame,bind,'head');
  const socket=api.hunterDreadSocketV63(morph,head);
  const strands=api.solveHunterDreadsV63(frame,morph,style,head,[-.25,.55,-.25,.55,-.25,.55,-.25]);
  assert.equal(strands.length,7);
  for(const [i,strand] of strands.entries()){
   const spec=api.HUNTER_DREAD_STRANDS_V63[i];
   const root=api.transformPoint(strand.matrix,{x:143,y:43});
   const desired=api.transformPoint(headMatrix,{x:socket.x+spec.x,y:socket.y+spec.y});
   assert(Math.hypot(root.x-desired.x,root.y-desired.y)<1e-8,'strand detached from scalp');
   assert(strand.angle>=-.25&&strand.angle<=1.15);
   if(strand.collisions)failures.push({morph,style,head,facing,pose,phase,i,contacts:strand.collisions,angle:strand.angle});
  }
 }
 assert.deepEqual(failures.slice(0,12),[],`${failures.length} penetrating strand configurations`);
});
