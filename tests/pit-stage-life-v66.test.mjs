import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {build} from 'esbuild';
const bundle=await build({stdin:{contents:'export * from "./app/game/pitStageLifeV66";export * from "./app/game/pitStageLifeLaunchV66";export * from "./app/game/pitStageLifeDirectorV60";export * from "./app/game/pitStageLifeDirectorV63";export * from "./app/game/systems/pitReplay";',resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const a=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const stages=a.PIT_STAGE_LIFE_V66.stages;
test('V66 native additions are nine unique untouched PNGs with six genuinely different source cells each',async()=>{
  assert.equal(stages.length,3);const hashes=new Set();
  for(const stage of stages){assert(a.isPitStageLifeStageV66(stage));assert.equal(stage.events.length,3);
    for(const event of stage.events){const bytes=await fs.readFile('public'+event.src),sha=createHash('sha256').update(bytes).digest('hex');assert.equal(sha,event.sha256);assert(!hashes.has(sha));hashes.add(sha);
      const meta=await sharp(bytes).metadata();assert(meta.hasAlpha);assert.equal(meta.width,event.width);assert.equal(meta.height,event.height);
      const frames=new Set();for(const f of event.frames){const[x,y,width,height]=f.rect;const crop=await sharp(bytes).extract({left:x,top:y,width,height}).raw().toBuffer();frames.add(createHash('sha256').update(crop).digest('hex'));}assert.equal(frames.size,6);
    }
  }assert.equal(hashes.size,9);
});
test('each launch shuffles all three events once and never immediately repeats across cycles',()=>{
  const firstOrders=new Set();const stage=stages[0];
  for(let seed=1;seed<=150;seed++){let last;
    for(let cycle=0;cycle<12;cycle++){const s=a.getPitStageLifeScheduleV60(stage.stageId,1,cycle,seed);assert.deepEqual([...s.bag].sort(),[0,1,2]);assert.notEqual(s.bag[0],last);last=s.bag[2];if(!cycle)firstOrders.add(s.bag.join());assert(s.firstDelay>=180&&s.firstDelay<=360);
      for(let n=0;n<3;n++){const clock={round:1,phase:'round',roundFrame:s.firstDelay+cycle*a.PIT_STAGE_LIFE_CYCLE_V60+s.starts[n]+30,launchSeed:seed};const before=structuredClone(clock),poses=a.getPitStageLifePosesV60(stage,clock);assert.equal(poses.filter(p=>p.active).length,1);assert.equal(poses[s.bag[n]].nativeFrame,1);assert.deepEqual(clock,before);assert.deepEqual(a.getPitStageLifePosesV60(stage,clock),poses);assert(a.getPitStageLifePosesV60(stage,clock,true).every(p=>!p.active));}
    }
  }assert.equal(firstOrders.size,6);
});
test('existing replay seed survives normalization and playback without changing fighter state',()=>{
  const record=seed=>{const r=a.createPitReplayRecorder({fighters:['jungle-hunter','city-hunter'],arenaId:'the-pit',seed});for(let i=0;i<120;i++)r.append([{},{}]);return r.finish();};
  const one=record(9182),two=record(6781);assert.equal(a.normalizePitReplay(one).seed,9182);assert.deepEqual(a.playPitReplay(one),a.playPitReplay(two));assert.deepEqual(a.getPitStageLifeScheduleV60(stages[0].stageId,1,0),a.getPitStageLifeScheduleV60(stages[0].stageId,1,0,0));
  assert.notDeepEqual(a.getPitStageLifeScheduleV60(stages[0].stageId,1,0,one.seed),a.getPitStageLifeScheduleV60(stages[0].stageId,1,0,two.seed));
});
test('V63 multi-event directors share the launch seed, remain repeatable, and keep all events',()=>{
  const orders=new Set();for(let seed=1;seed<80;seed++){let previous;for(let cycle=0;cycle<10;cycle++){const s=a.getPitStageLifeScheduleV63('arena-126-avpr-2007-hospital-roof',1,cycle,6,seed);assert.deepEqual([...s.bag].sort(),[0,1,2,3,4,5]);assert.notEqual(s.bag[0],previous);previous=s.bag.at(-1);assert.deepEqual(s,a.getPitStageLifeScheduleV63('arena-126-avpr-2007-hospital-roof',1,cycle,6,seed));orders.add(s.bag.join());}}assert(orders.size>20);
});
