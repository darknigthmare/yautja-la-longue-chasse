import test from 'node:test';
import assert from 'node:assert/strict';
import { thresholdsTemple, templeCampaignRoute, stamp } from './helpers/solo-v70-played-route.mjs';
import { p } from './helpers/solo-v67-campaign-route.mjs';
const run=templeCampaignRoute(),key=p.SAVE_STORAGE_KEY;
const storage=save=>{
  const values=new Map([[key,JSON.stringify(save)]]);
  return {values,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
};
test('every actual V70 receipt survives the real save parser, while orphan and future chapters stay refused',()=>{
  for(const save of [run.origin,...run.commits.map(c=>c.after)]) {
    const parsed=p.parseSaveImport(JSON.stringify(save));assert.equal(parsed.failure,null);
    assert.deepEqual(parsed.save.soloV70,save.soloV70??null);
    assert.deepEqual(parsed.save.prologue.chronicle,save.prologue.chronicle);
  }
  for(const edit of [s=>s.soloV69=null,s=>s.soloV70.receipts.pop(),s=>s.soloV70.checkpoint.milestones['drone-confined']=0,s=>s.soloV70.status='active']) {
    const save=structuredClone(run.save);edit(save);assert.equal(p.parseSaveImport(JSON.stringify(save)).failure,'invalid-save');
  }
  for(const edit of [s=>s.soloV70.version=2,s=>s.soloV70.checkpoint.version=2]) {
    const save=structuredClone(run.save);edit(save);const s=storage(save),raw=s.getItem(key);
    assert.equal(p.parseSaveImport(raw).failure,'future-version');p.loadSaveWithStatus(s);assert.equal(s.getItem(key),raw);
  }
});
test('quota or a dropped write at all fifteen physical receipts preserves old progression and retries once',()=>{
  for(const c of run.commits) for(const kind of ['quota','drop']) {
    const s=storage(c.before);p.loadSaveWithStatus(s);const raw=s.getItem(key),write=s.setItem;
    s.setItem=(k,v)=>{if(k===key){if(kind==='quota')throw new DOMException('QA quota','QuotaExceededError');return;}write(k,v);};
    const failed=p.writeSaveWithStatus(c.after,s);assert.equal(failed.persisted,false);assert.equal(s.getItem(key),raw);
    s.setItem=write;assert.equal(p.reconcileSaveWrite(failed,c.before.createdAt,s).status,'retry');
    assert.equal(p.writeSaveWithStatus(c.after,s).persisted,true);
    const loaded=p.loadSaveWithStatus(s).save,again=thresholdsTemple.withSoloV70Progress(loaded,c.receipts,c.state,stamp);
    assert(again);assert.deepEqual(again.soloV70.receipts,loaded.soloV70.receipts);assert.equal(again.profile.playTimeSeconds,loaded.profile.playTimeSeconds);
    assert.deepEqual(again.prologue.chronicle,c.before.prologue.chronicle,'preparation never grants Blooded');
  }
});
test('uncertain durable confirmation and a replaced owner cannot duplicate or import V70 receipts',()=>{
  const c=run.commits.at(-1),s=storage(c.before);p.loadSaveWithStatus(s);const write=s.setItem;
  s.setItem=(k,v)=>{write(k,v);if(k===key)throw Error('after-write failure');};
  const result=p.writeSaveWithStatus(c.after,s);assert.equal(result.persisted,false);s.setItem=write;
  const confirmed=p.reconcileSaveWrite(result,c.before.createdAt,s);assert.equal(confirmed.status,'confirmed');
  assert.equal(confirmed.save.soloV70.receipts.length,15);assert.equal(confirmed.save.prologue.chronicle.rites.length,2);
  for(const replacement of [run.save,p.defaultSave('2026-10-02T08:00:00.000Z')]) {
    const first=run.commits[0],target=storage(first.before);p.loadSaveWithStatus(target);const raw=JSON.stringify(replacement),oldWrite=target.setItem;
    target.setItem=()=>{throw Error('refused');};const pending=p.writeSaveWithStatus(first.after,target);target.setItem=oldWrite;target.values.set(key,raw);
    assert.equal(p.reconcileSaveWrite(pending,first.before.createdAt,target).status,'refused');
    assert.equal(p.writeSaveWithStatus(first.after,target).failure,'save-conflict');assert.equal(target.getItem(key),raw);
  }
});
test('manual slots retain active V70 routing, completed return and the exact fifteen receipts',async()=>{
  const old=Object.getOwnPropertyDescriptor(globalThis,'navigator');
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{locks:{request:async(_n,_o,callback)=>callback({})}}});
  try {
    for(const save of [run.commits[4].after,run.save]) {
      const s=storage(save);assert.equal((await p.migrateLegacyCampaignSlot(s)).ok,true);
      let slot=JSON.parse(s.getItem(p.campaignSlotStorageKey(1)));
      const checkpoint=await p.saveCampaignCheckpoint(1,{kind:'manual',index:1,expectedRevision:slot.revision,location:'youth-training'},s);
      assert.equal(checkpoint.ok,true,checkpoint.message);assert.equal(checkpoint.checkpoint.resumeLocation,save.soloV70.status==='completed'?'homeworld':'youth-training');
      slot=JSON.parse(s.getItem(p.campaignSlotStorageKey(1)));
      const active=await p.activateCampaignCheckpoint(1,checkpoint.checkpoint.id,{expectedRevision:slot.revision},s);
      assert.equal(active.ok,true,active.message);assert.deepEqual(active.save.soloV70,save.soloV70);
    }
  } finally {if(old)Object.defineProperty(globalThis,'navigator',old);else delete globalThis.navigator;}
});

test('V10 migration preserves prior chapters and does not infer temple or Blooded from rank',()=>{
  const legacy=structuredClone(p.parseSaveImport(JSON.stringify(run.origin)).save);legacy.version=10;delete legacy.soloV70;
  const restored=p.parseSaveImport(JSON.stringify(legacy));assert.equal(restored.failure,null);
  assert.equal(restored.save.version,11);assert.equal(restored.save.soloV70,null);
  for(const field of ['prologue','youthTraining','soloV66','soloV67','soloV68','soloV69','homeworld','appearance','inventory','trophies'])assert.deepEqual(restored.save[field],legacy[field],field);
  const future=storage({...run.save,version:p.SAVE_VERSION+1}),raw=future.getItem(key);
  assert.equal(p.loadSaveWithStatus(future).failure,'future-version');assert.equal(future.getItem(key),raw);
});
