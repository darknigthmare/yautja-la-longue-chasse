import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {
  GAUNTLET_STUDIES_V134, evaluateGauntletStudyV134, emptyGauntletCampaignV134,
  normalizeGauntletCampaignV134, gauntletCampaignClaimV134, gauntletCampaignEquipV134,
} from "../app/game/systems/gauntletCampaignV134.ts";
import {GAUNTLET_CATALOG_V132} from "../app/game/systems/clanWarGauntletCatalogV132.ts";

const read=(path)=>readFileSync(fileURLToPath(new URL("../"+path,import.meta.url)),"utf8");
const MISSIONS=[
  "jungle-vey","ice-cryostalker","volcano-bad-blood","swamp-hydra","desert-sandmaw",
  "ocean-leviathan","fungal-hivemind","ruins-ancient-guardian",
];
function evidence({
  owner="hunter-01",rank="elder",scans=150,completions=5,hasTrophy=true,
  quality="flawless",rite=true,
}={}){
  const progress=Object.fromEntries(MISSIONS.map(id=>[id,{completions}]));
  const trophies=hasTrophy?MISSIONS.map(missionId=>({
    missionId,quality,workshop:rite?{completedActions:["clean","prepare","display","rite"]}:undefined,
  })):[];
  return {createdAt:owner,profile:{rankId:rank},missionProgress:progress,
    trophies,statistics:{totalScans:scans},gauntletV134:emptyGauntletCampaignV134(owner)};
}
test("V134 authors all 44 study dossiers, with stable existing campaign missions",()=>{
  const challenges=GAUNTLET_CATALOG_V132.filter(g=>g.unlock.startsWith("challenge:"));
  assert.equal(GAUNTLET_STUDIES_V134.length,44);
  assert.deepEqual(new Set(GAUNTLET_STUDIES_V134.map(x=>x.id)).size,44);
  assert.deepEqual(GAUNTLET_STUDIES_V134.map(x=>x.id),challenges.map(x=>x.id));
  for(const study of GAUNTLET_STUDIES_V134){
    assert.ok(MISSIONS.includes(study.missionId));
    assert.ok(study.completions>=1&&study.completions<=2);
    assert.ok(study.minimumScans>0);
    assert.match(study.archiveContext,/pas acquisition/);
  }
});
test("no study unlock from rank alone, nonexistent trophies, wrong hunts or missing rites",()=>{
  const study=GAUNTLET_STUDIES_V134.find(x=>x.workshop);
  const base=evidence();
  assert.ok(evaluateGauntletStudyV134(base,study.id).ok);
  assert.ok(!evaluateGauntletStudyV134(evidence({hasTrophy:false}),study.id).ok);
  assert.ok(!evaluateGauntletStudyV134(evidence({rank:"young-blood"}),study.id).ok);
  assert.ok(!evaluateGauntletStudyV134(evidence({scans:0}),study.id).ok);
  assert.ok(!evaluateGauntletStudyV134(evidence({completions:0}),study.id).ok);
  assert.ok(!evaluateGauntletStudyV134(evidence({rite:false}),study.id).ok);
  assert.ok(!evaluateGauntletStudyV134(evidence({quality:"worthy"}),study.id).ok);
  assert.ok(!evaluateGauntletStudyV134(base,"source-not-in-catalog").ok);
});
test("all 44 replicas can be earned only by validated study and exactly once",()=>{
  let save=evidence();
  for(const study of GAUNTLET_STUDIES_V134){
    const before=gauntletCampaignEquipV134(save,study.id);
    assert.equal(before.ok,false,`Unclaimed ${study.id} should not equip`);
    const receipt=gauntletCampaignClaimV134(save,study.id);
    assert.ok(receipt.ok,`Eligible study should be claimable: ${study.id}: ${receipt.reason}`);
    assert.equal(receipt.archive.claimedStudies.length,save.gauntletV134.claimedStudies.length+1);
    save={...save,gauntletV134:receipt.archive};
    const repeated=gauntletCampaignClaimV134(save,study.id);
    assert.equal(repeated.ok,false);
    assert.ok(gauntletCampaignEquipV134(save,study.id).ok);
  }
  assert.equal(save.gauntletV134.claimedStudies.length,44);
  assert.equal(normalizeGauntletCampaignV134(save.gauntletV134,save.createdAt)?.claimedStudies.length,44);
});
test("owner mismatch and forged/duplicate/future gauntlet receipts are rejected",()=>{
  const archive=emptyGauntletCampaignV134("A");
  assert.deepEqual(normalizeGauntletCampaignV134(archive,"A"),archive);
  assert.equal(normalizeGauntletCampaignV134(archive,"B"),null);
  assert.equal(normalizeGauntletCampaignV134({...archive,version:2},"A"),null);
  assert.equal(normalizeGauntletCampaignV134({...archive,claimedStudies:["fictitious-id"]},"A"),null);
  assert.equal(normalizeGauntletCampaignV134({...archive,claimedStudies:[GAUNTLET_STUDIES_V134[0].id,GAUNTLET_STUDIES_V134[0].id]},"A"),null);
  assert.equal(gauntletCampaignEquipV134({...evidence({owner:"B"}),gauntletV134:archive},"jungle-hunter").ok,false);
  assert.equal(gauntletCampaignClaimV134({...evidence({owner:"B"}),gauntletV134:archive},GAUNTLET_STUDIES_V134[0].id).ok,false);
});
test("Save V13 path, transactional equip and source-protected campaign contracts are wired",()=>{
  const save=read("app/game/save.ts"),types=read("app/game/types.ts");
  const game=read("app/game/GameClient.tsx"),panel=read("app/game/ClanWarPanelV85.tsx");
  const locker=read("app/game/ClanWarGauntletLockerV132.tsx");
  assert.match(save,/export const SAVE_VERSION = 13;/);
  assert.match(save,/12: \(input\) => \(\{ \.\.\.input, version: 13 \}\)/);
  assert.match(save,/normalizeGauntletCampaignV134/);
  assert.match(save,/future-version/);
  assert.match(types,/gauntletV134\?/);
  assert.match(game,/persistSocialProgress\(\{gauntletV134:claim.archive\}\)/);
  assert.match(game,/onClaimGauntletStudy=\{claimGauntletResearchV134\}/);
  assert.match(panel,/claimedStudies=\{save.gauntletV134\?\.claimedStudies\?\?\[\]\}/);
  assert.match(locker,/onClaimStudy\?\.\(preview.id\)/);
  assert.equal((panel.match(/<ClanWarAtlasV95\b/g)||[]).length,1);
});
