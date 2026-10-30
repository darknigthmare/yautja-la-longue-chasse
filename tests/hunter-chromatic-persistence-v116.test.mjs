import test from "node:test";
import assert from "node:assert/strict";
import { commitHunterChromaticsV116 } from "../app/game/systems/hunterChromaticPersistenceV116.ts";
import { DEFAULT_CHROMATICS_V113, migrateLegacyPhgAppearanceV115 } from "../app/game/hunterChromaticsV113.ts";

const owner = "2026-10-30T11:00:00.000Z";
const currentSave = () => ({
  createdAt: owner,
  appearance: { presetId: "jungle-hunter", chromaticsV113: { ...DEFAULT_CHROMATICS_V113 } },
  profile: { clanMarks: 100, honor: 0 },
});
const draft = { ...DEFAULT_CHROMATICS_V113, skinHex:"#AABBCC",
  outfitMaterialId:"phg-fine-net", armorMaterialId:"phg-samurai-red-lacquer" };
const unexpected = () => { throw Error("Unexpected reconciliation"); };

test("confirmed owner-only paint retains gameplay progress and does not mutate source", () => {
  const current=currentSave();
  const result=commitHunterChromaticsV116({
    current,expectedOwnerCreatedAt:owner,draft,
    write(next){return {save:next,persisted:true,failure:null};},reconcile:unexpected,
  });
  assert.equal(result.ok,true);
  assert.equal(result.recovered,false);
  assert.equal(result.save.appearance.presetId,"custom");
  assert.equal(result.save.appearance.chromaticsV113.skinHex,"#aabbcc");
  assert.equal(result.save.appearance.chromaticsV113.outfitMaterialId,"phg-fine-net");
  assert.deepEqual(result.save.profile,current.profile);
  assert.equal(current.appearance.presetId,"jungle-hunter");
  assert.deepEqual(current.appearance.chromaticsV113,DEFAULT_CHROMATICS_V113);
});

test("foreign owner never reaches writer",()=>{
  let count=0;
  const result=commitHunterChromaticsV116({
    current:currentSave(),expectedOwnerCreatedAt:"wrong-owner",draft,
    write(){count++;throw Error("must not run");},reconcile:unexpected,
  });
  assert.deepEqual(result,{ok:false,failure:"save-conflict"});
  assert.equal(count,0);
});

test("blocked write never publishes the cosmetic candidate",()=>{
  const current=currentSave();
  const result=commitHunterChromaticsV116({
    current,expectedOwnerCreatedAt:owner,draft,
    write(next){return {save:next,persisted:false,failure:"protected-save"};},
    reconcile:unexpected,
  });
  assert.deepEqual(result,{ok:false,failure:"protected-save"});
  assert.equal(current.appearance.presetId,"jungle-hunter");
});

test("ambiguous readback can only recover exact owner's receipt",()=>{
  const result=commitHunterChromaticsV116({
    current:currentSave(),expectedOwnerCreatedAt:owner,draft,
    write(next){return {save:next,persisted:false,failure:"write-failed"};},
    reconcile(attempt,id){
      assert.equal(id,owner);
      assert.equal(attempt.save.appearance.chromaticsV113.skinHex,"#aabbcc");
      return {status:"confirmed",save:attempt.save,failure:null};
    },
  });
  assert.equal(result.ok,true);
  assert.equal(result.recovered,true);
});

test("unconfirmed, conflicted and unreadable readbacks refuse",()=>{
  for(const mode of ["retry","refused","throw"]){
    const current=currentSave();
    const result=commitHunterChromaticsV116({
      current,expectedOwnerCreatedAt:owner,draft,
      write(next){return {save:next,persisted:false,failure:"write-failed"};},
      reconcile(){
        if(mode==="retry")return {status:"retry",save:null,failure:null};
        if(mode==="refused")return {status:"refused",save:null,failure:"save-conflict"};
        throw Error("storage unavailable");
      },
    });
    assert.equal(result.ok,false);
    assert.equal(result.failure,mode==="retry"?"write-failed":mode==="refused"?"save-conflict":"read-failed");
    assert.deepEqual(current.appearance.chromaticsV113,DEFAULT_CHROMATICS_V113);
  }
});

test("throwing writer or wrong-owner receipt are refused",()=>{
  for(const write of [
    ()=>{throw Error("blocked");},
    ()=>({save:{...currentSave(),createdAt:"wrong-owner"},persisted:true,failure:null}),
  ]){
    const result=commitHunterChromaticsV116({
      current:currentSave(),expectedOwnerCreatedAt:owner,draft,write,reconcile:unexpected,
    });
    assert.equal(result.ok,false);
  }
});

test("null modern palette is an explicit reset, not a legacy PR25 import",()=>{
  const old={skinId:"moss-mottle",dreadTintId:"blue-black",
    armorTintId:"jade",skinMaterialId:"skin_classe_viking_base_observee"};
  assert.deepEqual(migrateLegacyPhgAppearanceV115({...old,chromaticsV113:null}),DEFAULT_CHROMATICS_V113);
  const imported=migrateLegacyPhgAppearanceV115({...old,chromaticsV113:undefined});
  assert.equal(imported.skinHex,"#677b4b");
  assert.equal(imported.dreadHex,"#343e53");
  assert.equal(imported.armorHex,"#466f5b");
  assert.equal(imported.skinMaterialId,"phg-skin_classe_viking_base_observee");
  const partiallyExplicit=migrateLegacyPhgAppearanceV115({
    ...old,chromaticsV113:{skinHex:null,skinMaterialId:null},
  });
  assert.equal(partiallyExplicit.skinHex,null);
  assert.equal(partiallyExplicit.skinMaterialId,null);
  assert.equal(partiallyExplicit.dreadHex,"#343e53");
});
