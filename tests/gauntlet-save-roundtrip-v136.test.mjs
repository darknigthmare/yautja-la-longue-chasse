import test from "node:test";
import assert from "node:assert/strict";
import {
  SAVE_VERSION,SAVE_STORAGE_KEY,defaultSave,normalizeSave,parseSaveImport,
  exportSave,loadSaveWithStatus,writeSaveWithStatus,reconcileSaveWrite,
} from "../app/game/save.ts";
import {gauntletCampaignEquipV134,gauntletCampaignClaimV134,
  emptyGauntletCampaignV134,GAUNTLET_STUDIES_V134} from "../app/game/systems/gauntletCampaignV134.ts";

const owner="2026-10-31T08:33:00.000Z";
function makeStorage(){
  const raw=new Map();
  return {
    raw,
    getItem:key=>raw.has(key)?raw.get(key):null,
    setItem:(key,val)=>{raw.set(key,String(val));},
    removeItem:key=>{raw.delete(key);},
    clear:()=>raw.clear(),
    key:i=>[...raw.keys()][i]??null,
    get length(){return raw.size;},
  };
}
test("fresh V13 campaign uses an owner-scoped empty gauntlet, no fabricated study rewards",()=>{
  const save=defaultSave(owner);
  assert.equal(SAVE_VERSION,13);
  assert.equal(save.version,13);
  assert.deepEqual(save.gauntletV134,emptyGauntletCampaignV134(owner));
  assert.equal(save.gauntletV134?.claimedStudies.length,0);
  assert.equal(normalizeSave(save).gauntletV134?.equippedId,"jungle-hunter");
});
test("legacy V12 import upgrades to V13 without gifting any of 44 studies",()=>{
  const old=defaultSave(owner);
  old.version=12;
  delete old.gauntletV134;
  old.profile.hunterName="Ancien chasseur";
  const parsed=parseSaveImport(JSON.stringify(old));
  assert.equal(parsed.failure,null);
  assert.equal(parsed.save?.version,13);
  assert.equal(parsed.save?.profile.hunterName,"Ancien chasseur");
  assert.equal(parsed.save?.gauntletV134,undefined);
  assert.equal((parsed.save?.trophies??[]).length,0);
});
test("rank-unlocked equipped Wolf survives a real V13 export/import roundtrip",()=>{
  const save=defaultSave(owner);
  save.profile={...save.profile,honor:730,rankId:"elite"};
  const update=gauntletCampaignEquipV134(save,"wolf");
  assert.equal(update.ok,true);
  const next={...save,gauntletV134:update.archive};
  const dump=exportSave(next);
  const imported=parseSaveImport(dump);
  assert.equal(imported.failure,null);
  assert.equal(imported.save?.profile.rankId,"elite");
  assert.equal(imported.save?.gauntletV134?.equippedId,"wolf");
  assert.equal(imported.save?.gauntletV134?.ownerCreatedAt,owner);
  assert.deepEqual(imported.save?.gauntletV134?.claimedStudies,[]);
});
test("foreign/future/duplicated gauntlet study receipts are rejected BEFORE import",()=>{
  const saved=defaultSave(owner);
  const foreign={...saved,gauntletV134:{...saved.gauntletV134,ownerCreatedAt:"intruder"}};
  assert.equal(parseSaveImport(JSON.stringify(foreign)).save,null);
  const future={...saved,gauntletV134:{...saved.gauntletV134,version:2}};
  assert.equal(parseSaveImport(JSON.stringify(future)).failure,"future-version");
  const id=GAUNTLET_STUDIES_V134[0].id;
  const duplicated={...saved,gauntletV134:{...saved.gauntletV134,claimedStudies:[id,id]}};
  assert.equal(parseSaveImport(JSON.stringify(duplicated)).save,null);
});
test("transactional gauntlet equip preserves the persistent primary and backup",()=>{
  const store=makeStorage();
  const save=defaultSave(owner);
  const created=writeSaveWithStatus(save,store,SAVE_STORAGE_KEY);
  assert.equal(created.persisted,true);
  const ranked={...created.save,profile:{...created.save.profile,honor:730,rankId:"elite"}};
  const equip=gauntletCampaignEquipV134(ranked,"wolf");
  assert.ok(equip.ok&&equip.archive);
  const saved=writeSaveWithStatus({...ranked,gauntletV134:equip.archive},store,SAVE_STORAGE_KEY);
  assert.equal(saved.persisted,true);
  assert.equal(loadSaveWithStatus(store,SAVE_STORAGE_KEY).save.gauntletV134?.equippedId,"wolf");
  assert.equal(parseSaveImport(store.getItem(SAVE_STORAGE_KEY)).save?.gauntletV134?.equippedId,"wolf");
  assert.equal(parseSaveImport(store.getItem(SAVE_STORAGE_KEY+".backup")).save?.gauntletV134?.equippedId,"jungle-hunter");
});
test("changed primary between visits is a conflict and cannot silently award/equip",()=>{
  const store=makeStorage();
  const initial=writeSaveWithStatus(defaultSave(owner),store,SAVE_STORAGE_KEY);
  assert.equal(initial.persisted,true);
  const modified={...initial.save,profile:{...initial.save.profile,hunterName:"Autre onglet"}};
  // Simulate a second browser tab writing while the first has the old exact bytes.
  store.setItem(SAVE_STORAGE_KEY,JSON.stringify(modified));
  const attempted={...initial.save,gauntletV134:{...initial.save.gauntletV134,equippedId:"city-hunter"}};
  const guarded=writeSaveWithStatus(attempted,store,SAVE_STORAGE_KEY);
  assert.equal(guarded.persisted,false);
  assert.equal(guarded.failure,"save-conflict");
  assert.equal(parseSaveImport(store.getItem(SAVE_STORAGE_KEY)).save?.profile.hunterName,"Autre onglet");
});
