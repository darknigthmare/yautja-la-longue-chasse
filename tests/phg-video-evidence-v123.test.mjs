import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=JSON.parse(readFileSync(new URL("../app/game/data/phgVisualReferenceResearchV123.json",import.meta.url),"utf8"));
const pending=JSON.parse(readFileSync(new URL("../app/game/data/phgVisualFidelityQueueV122.json",import.meta.url),"utf8"));
test("V123 every unresolved PHG material has source provenance, no invented pixel proof",()=>{
 assert.equal(source.coverage,34);
 assert.equal(source.targets.length,pending.records.length);
 assert.deepEqual(source.targets.map(x=>x.id),pending.records.map(x=>x.id));
 assert.equal(new Set(source.targets.map(x=>x.id)).size,34);
 assert.equal(source.actualVideoFramesInspected,0);
 assert.equal(source.exactSelectedSwatchFramesForOpenCases,0);
 assert.equal(source.pixel1to1Certified,0);
 for(const item of source.targets){
   assert.equal(item.frameSeenByAssistant,false);
   assert.equal(item.sourceIsPixelVerified,false);
   assert.equal(item.UV1to1,false);
   assert.equal(item.releaseGate,"needs-named-menu-selected-front-side-back");
   for(const ref of item.videoCandidates) {
     const v=source.videoMetadataSources.find(x=>x.id===ref.sourceId);
     assert.ok(v,"unknown video "+ref.sourceId);
     assert.equal(ref.framePixelsInspected,false);
     assert.equal(ref.provesSelectedMaterial,false);
     if(ref.seconds!==undefined) {
       assert.equal(ref.timestampFromUploaderDescription,true);
       assert.ok(ref.seconds>=0 && ref.seconds<30*60);
       assert.equal(ref.url,v.url+"&t="+ref.seconds+"s");
     } else assert.equal(ref.segment,"undetermined");
   }
 }
});
test("V123 selected/equipped screenshot controls never automatically resolve a missing shader",()=>{
 assert.equal(source.observedScreenshotControls.length,3);
 const control=source.observedScreenshotControls.find(x=>x.id==="CONTROL_RAPTOR_NUKE");
 assert.match(control.displayLabel,/Default equipped/);
 assert.equal(control.relatedUnresolvedId,"skin_gator_virus");
 assert.ok(source.targets.find(x=>x.id==="skin_gator_virus").screenshotCandidateId==="CONTROL_RAPTOR_NUKE");
 for(const c of source.observedScreenshotControls){
   assert.ok(c.pageUrl.startsWith("https://"));
   assert.ok(c.imageUrl.startsWith("https://"));
   assert.equal(c.artUVVerified,false);
 }
});
test("V123 research includes official dated notes and both historical and 2026 films",()=>{
 for(const id of ["PATCH_2_0","PATCH_2_05","PATCH_2_08","PATCH_2_39","PATCH_3_6"])assert.ok(source.officialPatchNotes.some(x=>x.id===id));
 for(const id of ["YT_SKINS_2021","YT_MASKS_2022","YT_CLASSES_2025","YT_CLASSES_2026"])assert.ok(source.videoMetadataSources.some(x=>x.id===id));
 const feral=source.targets.find(x=>x.id==="skin_classe_feral_default_apres_3_6_0");
 assert.equal(feral.officialPatchId,"PATCH_3_6");
 assert.ok(feral.videoCandidates.some(x=>x.sourceId==="YT_CLASSES_2025"));
 assert.ok(feral.videoCandidates.some(x=>x.sourceId==="YT_CLASSES_2026"));
});

test("V123.1: contradictory screenshots and mask/armor names never count as approved PHG UV", () => {
 assert.equal(source.attributionPitfallsV123.length,4);
 for (const p of source.attributionPitfallsV123) {
   assert.equal(p.blocksOfficialPixelClaim,true);
   assert.equal(p.selectedNameVisible,false);
   assert.ok(p.source.startsWith("https://"));
   assert.ok(p.forbiddenInference.length>30);
   for(const id of p.relatedIds)assert.ok(source.targets.some(x=>x.id===id),id);
 }
 const disputed=source.attributionPitfallsV123.find(x=>x.id==="PHG_REDGREEN_NOT_PROOF_EPIC");
 assert.match(disputed.finding,/Shatter Fracture/);
 const ogre=source.attributionPitfallsV123.find(x=>x.id==="PHG_OGRE_IS_ALPHA_MASK_TINT");
 assert.match(ogre.finding,/Mask Tint/);
 const jh=source.attributionPitfallsV123.find(x=>x.id==="PHG_JH87_ARMOR_NOT_SKIN_MENU");
 assert.match(jh.finding,/HUNTER ARMOR/);
 assert.equal(source.pixel1to1Certified,0);
});
