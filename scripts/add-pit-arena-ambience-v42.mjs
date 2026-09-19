import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {arenaCompositionDigest} from './lib/pit-arena-composition-v42.mjs';

const manifestPath='art-source/v33/pit-arenas/production-manifest.json';
const planPath='art-source/v42/pit-arenas/composition-plan.json';
const manifest=JSON.parse(await fs.readFile(manifestPath,'utf8'));
const plan=JSON.parse(await fs.readFile(planPath,'utf8'));
const numbers=[24,40,43,53,55,61];
assert(manifest.stages.every(stage=>stage.runtimeEnabled),'Complete the 100 reviewed neutral compositions before this bounded pass');
assert(!plan.entries.some(entry=>entry.curatedModules.some(module=>module.ambientMotion||module.sourceAssetId==='p3-c-brazier-flame')),'Ambience already staged; do not overwrite later review');
const originalTwenty=JSON.stringify(manifest.stages.slice(0,20));
const origin=manifest.stages[0];
function reference(id,plane,placements,extra={}){
 const asset=origin.planes.flatMap(p=>p.assets).find(a=>a.id===id);assert(asset);
 return {plane,libraryRef:origin.catalogueId+'/'+id,sourceCatalogueId:origin.catalogueId,sourceAssetId:id,
  sourcePaths:asset.frames.map(f=>f.path),sourceSha256:asset.frames.map(f=>f.generation.sha256),
  placements,parallax:asset.parallax,opacity:asset.opacity,
  reuseReason:'Explicit reuse of unchanged reviewed V33 artwork, no new drawing or stage signature claimed.',...extra};
}
const before=[];
for(const number of numbers){
 const stage=manifest.stages.find(s=>s.number===number),entry=plan.entries.find(e=>e.number===number);assert(stage&&entry);
 before.push({number,arenaId:stage.catalogueId,compositionDigest:arenaCompositionDigest(stage)});
 if([40,43,53,55].includes(number)){
  const index=entry.curatedModules.findIndex(a=>a.plane==='P3'&&a.sourceAssetId==='p3-b-prop-right');assert(index>=0);
  entry.curatedModules[index]=reference('p3-b-brazier-right','P3',[{x:696,y:352,width:116,height:76}],{anchorToGround:true,opacity:1});
  entry.curatedModules.push(reference('p3-c-brazier-flame','P3',[{x:716,y:324,width:76,height:62}],{anchorToGround:true,opacity:1}));
 }else{
  entry.curatedModules.push(reference('p0-b-vault-haze','P0',[{x:-120,y:50,width:1200,height:190}],
   {opacity:.28,ambientMotion:{kind:'drift-x',amplitudePx:14,periodFrames:1200}}));
 }
 stage.runtimeEnabled=false;delete stage.runtimeExtension;delete stage.compositionVisualReview;
}
assert.equal(JSON.stringify(manifest.stages.slice(0,20)),originalTwenty);
await fs.writeFile('work/v42/pre-ambience-stage-digests.json',JSON.stringify({before,note:'Replaced by new renderer and visual evidence after this explicit composition change.'},null,2)+'\n');
await fs.writeFile(planPath,JSON.stringify(plan,null,2)+'\n');
await fs.writeFile('work/v42/arena-generation-plan.json',JSON.stringify(plan,null,2)+'\n');
await fs.writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
execFileSync(process.execPath,['scripts/assemble-pit-arena-compositions-v42.mjs','--ids',numbers.join(',')],{stdio:'inherit',windowsHide:true});
