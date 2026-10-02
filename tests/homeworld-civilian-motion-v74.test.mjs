import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import sharp from 'sharp';
import {build} from 'esbuild';
import {renderToStaticMarkup} from 'react-dom/server';
const result=await build({stdin:{contents:"export * from './app/game/systems/homeworldCivilianMotionV74.ts'; export * from './app/game/systems/homeworldCivilianMotionCodexV74.ts'; export * from './app/game/systems/homeworldIdentityV72.ts'; export * from './app/game/systems/homeworldLifeV69.ts'; export {default as Civilian} from './app/game/HomeworldCivilianV72.tsx';",resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',jsx:'automatic'});
const api=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const manifest=api.HOMEWORLD_CIVILIAN_MOTION_V74;
test('fourteen costumes have four native right and four native left drawings, with actual transparent preserved source windows',async()=>{
  assert.equal(Object.keys(manifest.roles).length,14);assert.equal(Object.keys(manifest.sources).length,8);
  let frames=0;
  for(const source of Object.values(manifest.sources)){
    const bytes=await fs.readFile('public'+source.src),{data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),source.sha256);assert.equal(info.width,source.sourceWidth);assert.equal(info.height,source.sourceHeight);assert.equal(info.channels,4);
    let transparent=0;for(let n=3;n<data.length;n+=4)if(data[n]===0)transparent++;
    assert.equal(transparent,source.transparentPixels);assert(transparent>info.width*info.height*.45,'real alpha gutters');
    for(const cell of source.cells){
      const r=cell.sourceRect;assert(r.x>=0&&r.y>=0&&r.x+r.width<=info.width&&r.y+r.height<=info.height);
      let left=r.width,top=r.height,right=-1,bottom=-1,solid=0,edge=0;const hash=crypto.createHash('sha256');
      for(let y=0;y<r.height;y++){const offset=((r.y+y)*info.width+r.x)*4;hash.update(data.subarray(offset,offset+r.width*4));
        for(let x=0;x<r.width;x++)if(data[((r.y+y)*info.width+r.x+x)*4+3]>12){solid++;left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);if(!x||!y||x===r.width-1||y===r.height-1)edge++;}}
      assert.deepEqual(cell.alphaBounds,{x:left,y:top,width:right-left+1,height:bottom-top+1});assert.equal(cell.solidPixels,solid);assert.equal(cell.edgePixels,edge);assert.equal(edge,0,'no neighbouring foot/dread cut through a window');
      assert.equal(cell.rgbaWindowSha256,hash.digest('hex'));assert.equal(cell.pivot.y,bottom);assert(cell.pivot.x>0&&cell.pivot.x<r.width);
    }
  }
  for(const role of api.HOMEWORLD_CIVILIAN_ROLES_V72){const actor=manifest.roles[role];for(const clip of Object.values(actor.clips)){assert.equal(clip.length,4);frames+=clip.length;assert.equal(new Set(clip.map(f=>f.rgbaWindowSha256)).size,4);}assert.equal(actor.nativeHeight,Math.max(...actor.clips.right.concat(actor.clips.left).map(f=>f.alphaBounds.height)));}
  assert.equal(frames,112);
});
test('the paused city clock selects every frame and each independently drawn direction without per-frame stretching or mirroring',()=>{
  for(const role of api.HOMEWORLD_CIVILIAN_ROLES_V72)for(const facing of[1,-1]){
    const samples=Array.from({length:4},(_,index)=>api.homeworldCivilianMotionFrameV74(role,index/6+.001,facing,100));
    assert.deepEqual(samples.map(f=>f.index),[0,1,2,3]);assert.equal(new Set(samples.map(f=>f.scale)).size,1);
    assert.equal(api.homeworldCivilianMotionFrameV74(role,4/6+.001,facing,100).index,0);
    assert.equal(api.homeworldCivilianMotionFrameV74(role,NaN,facing).index,0);
    for(const sample of samples){assert.equal(sample.clip,facing===1?'right':'left');assert.equal(sample.frame.row%2,facing===1?0:1);
      const html=renderToStaticMarkup(api.Civilian({role,moving:true,seconds:sample.index/6+.001,facing,height:100}));
      assert(html.includes('data-native-clip="walk-'+sample.clip+'"'));assert(html.includes('data-native-frame="'+sample.index+'"'));assert(!html.includes('transform:'),'left walk is native, not mirrored');assert(!html.includes('animation:'));
      assert.equal(-sample.frame.pivot.y*sample.scale+sample.frame.pivot.y*sample.scale,0,'ground pivot always maps to actor ground origin');}
    const frozenA=renderToStaticMarkup(api.Civilian({role,moving:true,seconds:3.15,facing})),frozenB=renderToStaticMarkup(api.Civilian({role,moving:true,seconds:3.15,facing}));assert.equal(frozenA,frozenB);
  }
});
test('named and stationary NPCs preserve the original portrait by default, including their exact source and native scale',()=>{
  for(const role of api.HOMEWORLD_CIVILIAN_ROLES_V72){const art=api.homeworldCivilianArtV72(role),html=renderToStaticMarkup(api.Civilian({role}));
    assert(html.includes(art.src));assert(html.includes('data-native-clip="idle"'));assert(html.includes('data-homeworld-civilian-v72="'+role+'"'));
    const stationary=renderToStaticMarkup(api.Civilian({role,moving:false,seconds:99999,facing:-1}));assert(stationary.includes(art.src));assert(stationary.includes('scaleX(-1)'));}
});
test('the same 98 residents retain routes, professions and pause behavior while clip offsets and speed come from existing route metadata',async()=>{
  assert.equal(api.HOMEWORLD_RESIDENTS_V69.length,98);
  const phases=new Set();
  for(const resident of api.HOMEWORLD_RESIDENTS_V69){const pose=api.homeworldResidentPoseV69(resident,5),role=api.homeworldResidentRoleV72(resident);
    const a=api.homeworldCivilianMotionFrameV74(role,5+resident.phaseSeconds,pose.facing,100,resident.speed);
    const b=api.homeworldCivilianMotionFrameV74(role,5+resident.phaseSeconds,pose.facing,100,resident.speed);assert.deepEqual(a,b);phases.add(a.index);
    assert(a.fps>0&&a.fps<6,'casual gait timing follows the actual civilian speed');assert.deepEqual(api.homeworldResidentPoseV69(resident,5),pose);}
  assert(phases.size>=3,'residents are not all in one synchronized phase');
  const source=await fs.readFile('app/game/HomeworldPopulationV68.tsx','utf8');assert(source.includes('seconds={seconds+resident.phaseSeconds}'));assert(source.includes('moving={pose.moving}'));assert(source.includes('speed={resident.speed}'));assert(source.includes('homeworldResidentPoseV68(resident, seconds)'));
});
test('fourteen source codex parents state local animation origin, preserved assets and non-blocking population, not fictional city positions',()=>{
  const records=api.HOMEWORLD_CIVILIAN_MOTION_CODEX_V74;assert.equal(records.length,14);assert.equal(new Set(records.map(r=>r.id)).size,14);
  for(const record of records){assert.match(record.id,/^civilian-motion-v74:/);assert.equal(record.spaceId,'animation-library-v74');assert.equal(record.lore,'original-adaptation');assert.equal(record.footprint,null);assert(record.constraints.some(t=>t.includes('non bloquant')));assert(record.constraints.some(t=>t.includes('SHA256')));}
});
