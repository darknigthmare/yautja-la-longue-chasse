#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(readFileSync(path.join(root,'production/homeworld-v158/manifest.json'),'utf8'));
const geometry=readFileSync(path.join(root,'app/game/systems/homeworldGeometryV64.ts'),'utf8');
const fail=(msg)=>{throw new Error(msg);};
const eq=(cond,msg)=>{if(!cond)fail(msg);};
const camera=manifest.camera;
eq(camera.projection==='orthographic'&&camera.yawDegrees===0&&camera.pitchDegrees===35,'camera contract changed');
eq(Math.abs(camera.depthScale-Math.sin(35*Math.PI/180))<1e-12,'ground depth scaling mismatch');
eq(/yawDegrees:\s*0,\s*pitchDegrees:\s*35,\s*depthScale:\s*Math\.sin\(35\s*\*\s*Math\.PI\s*\/\s*180\)/.test(geometry),'game native geometry no longer matches manifest');
eq(manifest.sourceAvailability==='COMPANION_DOWNLOAD_ONLY_NOT_COMMITTED_IN_THIS_PR','binary delivery status changed without review');
eq(manifest.canon.claim1to1===false && manifest.runtime.integrated===false,'unverified canon/runtime admission');
eq(manifest.candidates.length===10,'must track exactly 10 separate candidates');
const ids=new Set(),paths=new Set(),digests=new Set();
for(const item of manifest.candidates){
  eq(/^HW10(3[1-9]|40)$/.test(item.id) && !ids.has(item.id),'duplicate or out-of-range id '+item.id);
  ids.add(item.id);
  eq(item.artState==='CANDIDATE_NOT_ADMITTED' && item.sourceInGit===false,'unapproved art promoted: '+item.id);
  eq(typeof item.label==='string' && item.label.trim().length>3,'missing label '+item.id);
  eq(['front','front-left','front-right','side-left','side-right','rear','rear-left','rear-right','top-front'].includes(item.orientation),'bad orientation '+item.id);
  eq(/^sprites_png\/HW10(?:3[1-9]|40)_[a-z0-9_]+\.png$/.test(item.originalArchivePath),'unsafe asset path '+item.id);
  eq(item.originalArchivePath.split('/').pop().startsWith(item.id+'_'),'path/id mismatch '+item.id);
  eq(!paths.has(item.originalArchivePath),'duplicate path '+item.id);paths.add(item.originalArchivePath);
  eq(/^[a-f0-9]{64}$/.test(item.sha256) && !digests.has(item.sha256),'duplicate or invalid sha '+item.id);digests.add(item.sha256);
  eq(Number.isInteger(item.bytes)&&item.bytes>1000,'invalid byte size '+item.id);
  eq(Number.isInteger(item.dimensionsPx.width)&&item.dimensionsPx.width>0&&Number.isInteger(item.dimensionsPx.height)&&item.dimensionsPx.height>0,'invalid dimensions '+item.id);
  eq(item.nativeGroundPivot===null && item.footprintWorld===null && item.doorway===null,'unmeasured attachment invented '+item.id);
}
eq(manifest.candidates.filter(x=>x.sourceType==='independent_1536x1024').length===1,'large source count changed');
eq(manifest.candidates.filter(x=>x.sourceType==='sprite-sheet-crop').length===9,'sheet crop count changed');
const idx=process.argv.indexOf('--assets-dir');
eq(process.argv.length===2 || (process.argv.length===4 && idx===2),'usage: node scripts/verify-homeworld-v158.mjs [--assets-dir /extracted/lot]');
if(idx!==-1){
  const base=path.resolve(process.argv[idx+1]);
  for(const item of manifest.candidates){
    const full=path.join(base,item.originalArchivePath);
    eq(existsSync(full),'missing PNG '+item.id+' ('+full+')');
    const bin=readFileSync(full);
    eq(bin.length===item.bytes,'byte mismatch '+item.id);
    eq(createHash('sha256').update(bin).digest('hex')===item.sha256,'SHA256 mismatch '+item.id);
    eq(bin.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'not a PNG '+item.id);
    eq(bin.toString('ascii',12,16)==='IHDR','missing IHDR '+item.id);
    eq(bin.readUInt32BE(16)===item.dimensionsPx.width&&bin.readUInt32BE(20)===item.dimensionsPx.height,'PNG dimensions changed '+item.id);
    eq(bin[25]===6,'expected truecolor RGBA PNG '+item.id);
  }
}
console.log('OK: V158 '+manifest.candidates.length+' unique candidates; '+(idx!==-1?'original PNG bytes verified':'metadata only — binaries not in GitHub'));
