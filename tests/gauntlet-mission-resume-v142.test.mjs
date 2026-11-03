import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {
  captureHuntGauntletV142,resumeHuntGauntletV142,HUNT_GAUNTLET_CONFIG_KEY_V142,
} from "../app/game/systems/huntGauntletIdentityV142.ts";
import {GAUNTLET_CATALOG_V132} from "../app/game/systems/clanWarGauntletCatalogV132.ts";
import {
  defaultSave,exportSave,parseSaveImport,
} from "../app/game/save.ts";
import {
  normalizeActiveHuntSave,ACTIVE_HUNT_SAVE_VERSION,ACTIVE_HUNT_RUNTIME_REVISION,
} from "../app/game/systems/activeHuntSave.ts";

const root=fileURLToPath(new URL("../",import.meta.url));
const read=path=>readFileSync(root+path,"utf8");
const owner="2026-10-31T14:46:00.000Z";
const rank="elite";
const studies=GAUNTLET_CATALOG_V132.filter(x=>x.unlock.startsWith("challenge:")).map(x=>x.id);

test("Every legitimate V142 unlocked identity survives saved/reloaded sidecar configuration",()=>{
  let supported=0;
  for(const item of GAUNTLET_CATALOG_V132){
    const captured=captureHuntGauntletV142(item.id,"elder",studies);
    assert.equal(captured,item.id);
    const configuration={inventory:{},gauntletVariantId:captured,visualOptions:{screenShake:true}};
    const serial=JSON.parse(JSON.stringify(configuration));
    assert.equal(resumeHuntGauntletV142(serial,"jungle-hunter","elder",studies),item.id);
    supported++;
  }
  assert.equal(supported,54);
});
test("Saved Wolf stays Wolf after a different cosmetic preference is equipped elsewhere",()=>{
  const saved={gauntletVariantId:captureHuntGauntletV142("wolf",rank,[])};
  assert.equal(resumeHuntGauntletV142(saved,"feral",rank,[]),"wolf");
  assert.equal(resumeHuntGauntletV142(saved,"jungle-hunter",rank,[]),"wolf");
  assert.equal(captureHuntGauntletV142("feral",rank,[]),"feral");
});
test("Legacy V141 sidecar without optional model preserves previous behavior",()=>{
  assert.equal(resumeHuntGauntletV142({},"wolf",rank,[]),"wolf");
  assert.equal(resumeHuntGauntletV142({},"lost-shaman","elder",["lost-shaman"]),"lost-shaman");
  assert.equal(resumeHuntGauntletV142({},"../../fake",rank,[]),"jungle-hunter");
  assert.equal(resumeHuntGauntletV142({},null,rank,[]),"jungle-hunter");
});
test("An old/future/hostile cosmetic receipt cannot unlock an unearned gauntlet",()=>{
  const malformed=[
    "../../injected","constructor","evil",null,undefined,42,[],{}, "wolf/../../other",
  ];
  for(const v of malformed){
    assert.equal(resumeHuntGauntletV142({gauntletVariantId:v},"wolf",rank,[]),
      "jungle-hunter",String(v));
  }
  assert.equal(resumeHuntGauntletV142({gauntletVariantId:"wolf"},"jungle-hunter","blooded",[]),"jungle-hunter");
  assert.equal(resumeHuntGauntletV142({gauntletVariantId:"lost-shaman"},"wolf","elder",[]),"jungle-hunter");
  assert.equal(resumeHuntGauntletV142({gauntletVariantId:"lost-shaman"},"wolf","elder",["lost-shaman"]),"lost-shaman");
  assert.equal(resumeHuntGauntletV142(Object.create({gauntletVariantId:"wolf"}),"feral",rank,[]),"feral");
});
test("V1 active hunt sidecar roundtrip persists optional selected identity, no schema break",()=>{
  const save=defaultSave(owner);
  const equipment={gauntletVariantId:captureHuntGauntletV142("wolf",rank,[])};
  const sidecar={
    version:ACTIVE_HUNT_SAVE_VERSION,
    runtimeRevision:ACTIVE_HUNT_RUNTIME_REVISION,
    ownerSaveCreatedAt:save.createdAt,missionId:"jungle-vey",difficultyId:"hunter",
    encounterRun:0,runId:"v142-hunt-001",sequence:3,startedAt:owner,
    savedAt:"2026-10-31T15:02:00.000Z",
    configuration:{...equipment,inventory:save.inventory,loadout:save.loadout,
      appearance:save.appearance,visualOptions:{screenShake:true,reducedGore:false,highContrastVision:false}},
    snapshot:{player:{x:122,y:50}},retryCheckpoint:null,
  };
  const restored=normalizeActiveHuntSave(JSON.parse(JSON.stringify(sidecar)),ACTIVE_HUNT_RUNTIME_REVISION);
  assert.ok(restored,"Old V1 sidecar must accept an optional cosmetic identifier");
  assert.equal(restored?.version,1);
  assert.equal(restored?.configuration.gauntletVariantId,"wolf");
  assert.equal(restored?.sequence,3);
  assert.equal(restored?.ownerSaveCreatedAt,owner);
  assert.equal(resumeHuntGauntletV142(restored.configuration,"feral",rank,[]),"wolf");
  const campaignImport=parseSaveImport(exportSave(save));
  assert.equal(campaignImport.failure,null);
  assert.deepEqual(campaignImport.save?.gauntletV134?.claimedStudies,[]);
});
test("GameClient writes launch-time visual identity, preserves it across writes, and passes it to HuntCanvas on resume",()=>{
  const client=read("app/game/GameClient.tsx");
  const runtime=read("app/game/HuntCanvas.tsx");
  assert.match(client,/gauntletVariantId: captureHuntGauntletV142\(gauntletVariantId,save\.profile\.rankId/);
  assert.match(client,/configuration: huntConfiguration\(runtimeSave,hunterGauntlet\.equippedId\)/);
  assert.match(client,/\.\.\.session\.configuration/);
  assert.match(client,/gauntletVariantId: resumeHuntGauntletV142\(/);
  assert.match(client,/resumed\.configuration,/);
  assert.match(client,/gauntletVariantId=\{huntResumePayload\?\.gauntletVariantId \?\? hunterGauntlet\.equippedId\}/);
  assert.match(runtime,/const \[gauntletVisualId\]=useState\(\(\)=>gauntletVariantId \?\? "jungle-hunter"\)/);
  assert.match(runtime,/loadGauntletRigPartV141\(gauntletVisualId,moduleId,loadImage,legacyPath\)/);
  assert.ok(!read("app/game/systems/huntGauntletIdentityV142.ts").includes("damage"));
  assert.ok(!read("app/game/systems/huntGauntletIdentityV142.ts").includes("rewards"));
  assert.ok(!client.includes("setHuntResumePayload({snapshot: resumed.snapshot, retryCheckpoint: resumed.retryCheckpoint})"));
  assert.equal(HUNT_GAUNTLET_CONFIG_KEY_V142,"gauntletVariantId");
});
