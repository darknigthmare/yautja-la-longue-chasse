#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const m=JSON.parse(readFileSync(path.join(root,'production/homeworld-v158/manifest.json'),'utf8'));
const assert=(v,msg)=>{if(!v)throw new Error(msg);};
const args=process.argv.slice(2);
assert(args.length===0 || (args.length===2 && args[0]==='--assets-dir'),'usage: verify-homeworld-v158.mjs [--assets-dir DIR]');
const base=args.length ? path.resolve(args[1]) : path.join(root,'production/homeworld-v158/assets');
const geometry=readFileSync(path.join(root,'app/game/systems/homeworldGeometryV64.ts'),'utf8');
assert(/yawDegrees:\s*0,\s*pitchDegrees:\s*35/.test(geometry),'native camera changed; review required');
assert(m.camera.projection==='orthographic' && m.camera.pitchDegrees===35 && m.camera.yawDegrees===0,'invalid declared projection');
assert(Math.abs(m.camera.depthScale-Math.sin(35*Math.PI/180))<1e-12,'depth projection mismatch');
assert(m.sourceAvailability==='COMMITTED_IN_PR_BRANCH','PNG delivery not recorded');
assert(m.canon.claim1to1===false && m.runtime.integrated===false,'unverified art/runtime admission');
assert(m.candidates.length===10,'expected ten candidates');
const ids=new Set(), digests=new Set();
for(const a of m.candidates){
  assert(/^HW10(3[1-9]|40)$/.test(a.id) && !ids.has(a.id),'invalid or duplicate ID');ids.add(a.id);
  assert(/^[a-f0-9]{64}$/.test(a.sha256) && !digests.has(a.sha256),'invalid or duplicate digest');digests.add(a.sha256);
  assert(a.sourceInGit===true && a.artState==='CANDIDATE_NOT_ADMITTED','incorrect presence/admission state');
  assert(a.nativeGroundPivot===null && a.footprintWorld===null && a.doorway===null,'unmeasured physical metadata invented');
  assert(/^sprites_png\/HW10(?:3[1-9]|40)_[a-z0-9_]+\.png$/.test(a.originalArchivePath),'unsafe asset path');
  assert(a.repositoryPath==='production/homeworld-v158/assets/'+a.originalArchivePath,'unexpected repository path');
  const f=path.join(base,a.originalArchivePath);
  assert(existsSync(f),'missing PNG '+a.id);
  const b=readFileSync(f);
  assert(b.length===a.bytes,'byte count changed '+a.id);
  assert(createHash('sha256').update(b).digest('hex')===a.sha256,'SHA256 mismatch '+a.id);
  assert(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'not a PNG '+a.id);
  assert(b.toString('ascii',12,16)==='IHDR','invalid IHDR '+a.id);
  assert(b.readUInt32BE(16)===a.dimensionsPx.width && b.readUInt32BE(20)===a.dimensionsPx.height,'dimensions changed '+a.id);
  assert(b[25]===6,'expected RGBA '+a.id);
}
assert(m.candidates.filter(a=>a.sourceType==='independent_1536x1024').length===1,'original source classification changed');
assert(m.candidates.filter(a=>a.sourceType==='sprite-sheet-crop').length===9,'original crop classification changed');
console.log('OK: 10 V158 original PNG files verified; 0 artistic or runtime admissions.');
