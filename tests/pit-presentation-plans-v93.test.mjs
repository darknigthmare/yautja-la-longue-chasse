import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { test } from 'node:test';
import { build } from 'esbuild';

const built = await build({ stdin: { contents: `
export * from './app/game/systems/pitPresentationPlansV93';
export { PIT_FIGHTERS } from './app/game/systems/pitCombat';
export { PIT_VERSUS_FIGHTER_IDS } from './app/game/systems/pitRosterExpansion';
export { getPitFighterVariants } from './app/game/systems/pitUserRoster';
export { PIT_SPRITE_SHEET_REGISTRY } from './app/game/pitSpriteSheetRegistry';
export { getPitFighterPresentationCue } from './app/game/pitFighterPresentation';
`, resolveDir: process.cwd() }, bundle:true, platform:'node', format:'esm', write:false, logLevel:'silent' });
const p = await import('data:text/javascript;base64,' + Buffer.from(built.outputFiles[0].text).toString('base64'));
const catalog = p.PIT_PRESENTATION_CATALOG_V93;
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const owner = (id, category, variant, registry) => p.getPitPresentationPlanV93(id, category, variant, registry);
const snapshotAtlasIds = new Set(catalog.entries.flatMap(entry=>entry.nativeClips.map(clip=>clip.atlasId)));
const snapshotRegistry = p.PIT_SPRITE_SHEET_REGISTRY.filter(definition => snapshotAtlasIds.has(definition.atlas.id));
const historicalAtlasIds = new Set(catalog.historicalSnapshot.atlasIds);
const historicalRegistry = snapshotRegistry.filter(definition=>historicalAtlasIds.has(definition.atlas.id)).sort((a,b)=>a.atlas.id.localeCompare(b.atlas.id));

test('catalog covers all201 actual identities, all416 explicit variants and all21 historical defaults exactly', () => {
 assert.equal(catalog.sourceBaseline,'bd88961');
 assert.equal(catalog.sourceSnapshot,'v93-native-admission-11-pages');
 assert.deepEqual(catalog.entries.map(entry=>entry.fighterId).sort(), Object.keys(p.PIT_FIGHTERS).sort());
 assert.deepEqual(catalog.entries.map(entry=>entry.fighterId).sort(), [...p.PIT_VERSUS_FIGHTER_IDS].sort());
 assert.equal(catalog.entries.length,201); assert.equal(new Set(catalog.entries.map(entry=>entry.fighterId)).size,201);
 for (const entry of catalog.entries) {
  assert.deepEqual(entry.appearances.filter(appearance=>appearance.kind==='supplied-variant').map(appearance=>appearance.variantId).sort(), p.getPitFighterVariants(entry.fighterId).map(variant=>variant.id).sort());
  assert.equal(entry.appearances.filter(appearance=>appearance.variantId===null).length, entry.fighterId.startsWith('user-')?0:1);
  assert(entry.appearances.some(appearance=>appearance.appearanceId===entry.defaultAppearanceId));
 }
 assert.equal(catalog.entries.reduce((sum,entry)=>sum+entry.appearances.length,0),437);
 assert.equal(catalog.snapshot.explicitVariants,416); assert.equal(catalog.snapshot.runtimeDefaultAppearances,21);
});

test('all1206 plans retain six exact categories, separate dizzy/taunt IDs and explicit noncertified staging', () => {
 assert.deepEqual(p.PIT_PRESENTATION_CATEGORIES_V93,['idle','intro','round-victory','round-defeat','finisher-stunned','taunt']);
 const sourceIds = new Set(catalog.sources.map(source=>source.id));
 for (const entry of catalog.entries) {
  assert.deepEqual(entry.plans.map(plan=>plan.category),p.PIT_PRESENTATION_CATEGORIES_V93);
  assert.equal(entry.oneToOneCertified,false);
  for (const plan of entry.plans) {
   assert.equal(plan.id,entry.fighterId+'.'+plan.category); assert.equal(plan.fidelity,'gameplay-adaptation');
   assert.equal(plan.documentedGesture,false); assert.equal(plan.oneToOneCertified,false);
   assert.equal(plan.detailedDeliveryStatus,'unproduced-or-partial');
   assert(plan.sourceIds.every(id=>sourceIds.has(id))); assert(plan.direction.length>20);
   assert.equal(plan.familyId,entry.familyId);
  }
 }
 const dizzy = catalog.categories.find(category=>category.id==='finisher-stunned');
 assert.equal(dizzy.clipId,'pit.presentation.dizzy'); assert.equal(dizzy.loop,true);
 const taunt = catalog.categories.find(category=>category.id==='taunt');
 assert.equal(taunt.clipId,'pit.presentation.taunt'); assert.equal(taunt.loop,false);
 for (const category of catalog.categories) { assert.equal(category.keyPoses.length,category.minimumDistinctDrawings); assert(category.suggestedTicks>=category.minimumDistinctDrawings); }
 assert.equal(catalog.completeRosterAnimations,false); assert.equal(catalog.oneToOneCertified,false);
});

test('taunt planning matches a cosmetic live gesture without making the opponent dizzy or changing its round outcome', () => {
 const taunt = catalog.categories.find(category=>category.id==='taunt');
 assert.match(taunt.terminal,/Voluntary cosmetic gesture during live combat/);
 assert.match(taunt.terminal,/only the actual winner may gesture during the final KO window/);
 assert.match(taunt.terminal,/never stuns the opponent/);
 const fight = {phase:'fight',elapsedMs:200,durationMs:1000,round:1,blocksSimulation:false,resultVisible:false,fighterTaunts:[true,false]};
 const before = JSON.stringify(fight);
 assert.equal('pit.presentation.'+p.getPitFighterPresentationCue(0,fight).kind,taunt.clipId);
 assert.equal(p.getPitFighterPresentationCue(1,fight),null,'The rival retains gameplay, not a dizzy or defeat cue');
 assert.equal(JSON.stringify(fight),before);
 const final = {phase:'taunt',elapsedMs:200,durationMs:5000,round:2,blocksSimulation:true,resultVisible:false,winnerSlot:1,fighterSlot:1};
 assert.equal(p.getPitFighterPresentationCue(1,final).kind,'taunt');
 assert.equal(p.getPitFighterPresentationCue(0,final).kind,'dizzy');
 assert.equal(taunt.loop,false); assert.equal(taunt.minimumDistinctDrawings,12);
});

test('409 measured clips retain exact ownership and pixel identity, preserving all65 historical atlases and135 original PNGs', () => {
 const clips = catalog.entries.flatMap(entry=>entry.nativeClips);
 assert.equal(clips.length,409); assert.equal(snapshotRegistry.length,76);
 assert.equal(catalog.snapshot.registeredClips,409); assert.equal(catalog.snapshot.registryEntries,76);
 assert.equal(catalog.snapshot.pages,172); assert.equal(catalog.snapshot.uniquePngs,146);
 assert.equal(catalog.snapshot.pixelDistinctDrawings,841);
 assert.equal(catalog.historicalSnapshot.sourceBaseline,'bd88961');
 assert.equal(catalog.historicalSnapshot.registryEntries,65); assert.equal(historicalRegistry.length,65);
 assert.equal(catalog.historicalSnapshot.registeredClips,387);
 assert.equal(historicalRegistry.reduce((sum,definition)=>sum+definition.atlas.clips.length,0),387);
 assert.equal(hash(JSON.stringify(historicalRegistry)),catalog.historicalSnapshot.registrySha256,'All65 full historical registrations are immutable, not only their clip counts');
 assert.equal(catalog.historicalSnapshot.uniquePngs,135); assert.equal(catalog.historicalSnapshot.pages.length,135);
 assert.equal(new Set(catalog.historicalSnapshot.pages.map(page=>page.src)).size,135);
 const live = snapshotRegistry.flatMap(definition=>definition.atlas.clips.map(clip=>({definition,clip})));
 assert.equal(live.length,409);
 const files = new Map();
 for (const proof of clips) {
  const found = live.find(({definition,clip})=>definition.fighterId===proof.fighterId && (definition.variantId??null)===proof.variantId && definition.atlas.id===proof.atlasId && clip.id===proof.clipId && clip.facing===proof.facing);
  assert(found,proof.atlasId+':'+proof.clipId+':'+proof.facing);
  assert.equal(proof.frameCount,found.clip.frames.length);
  assert.equal(proof.loop,found.clip.loop); assert.equal(proof.ticksPerSecond,found.clip.ticksPerSecond);
  assert.deepEqual(proof.frames.map(({pageId,rect,pivot,durationTicks})=>({pageId,rect,pivot,durationTicks})), found.clip.frames);
  assert.equal(proof.pngsPresent,true); assert.equal(proof.rectsValid,true);
  assert.equal(proof.bordersClear,true); assert.equal(proof.cellsNonemptyTransparent,true);
  assert(proof.distinctDrawings>0 && proof.distinctDrawings<=proof.frameCount);
  assert.equal(proof.visualReview,'not-re-reviewed-v93'); assert.equal(proof.canonOneToOneCertified,false);
  for (const page of proof.sourcePages) {
   if (!files.has(page.src)) files.set(page.src,hash(fs.readFileSync('public'+page.src)));
   assert.equal(files.get(page.src),page.sourceSha256,'measured PNG is immutable: '+page.src);
  }
 }
 assert.equal(files.size,146);
 for (const page of catalog.historicalSnapshot.pages) assert.equal(files.get(page.src),page.sourceSha256,'Original135 PNG proof remains preserved: '+page.src);
 const newClips = clips.filter(proof=>!historicalAtlasIds.has(proof.atlasId));
 assert.equal(newClips.length,22); assert.equal(new Set(newClips.map(proof=>proof.atlasId)).size,11);
 for (const proof of newClips) {
  assert.equal(proof.frameCount,3); assert.equal(proof.distinctDrawings,3);
  assert.equal(proof.registeredHeldPose,false); assert.notEqual(proof.variantId,null);
  const category = catalog.categories.find(candidate=>candidate.clipId===proof.clipId);
  assert(category); assert.equal(proof.loop,category.loop);
  const coverage = owner(proof.fighterId,category.id,proof.variantId,snapshotRegistry).facings.find(face=>face.facing===proof.facing);
  assert.equal(coverage.status,'partial-native'); assert.equal(coverage.measuredDistinctDrawings,3);
  assert.equal(coverage.anatomyReviewedV93,false); assert.equal(coverage.detailedDeliveryComplete,false);
 }
});

test('Scar and City use their own new masked idle and retain historical ceremonies without borrowing null-owned clips', () => {
 for (const [id,variant] of [['scar','scar-avec-casque-6a0a69930d'],['city-hunter','city-hunter-avec-casque-12136078fe']]) {
  assert(owner(id,'idle',variant,historicalRegistry).facings.every(face=>face.status==='missing'),'Historical body idle never transfers to a supplied mask');
  for (const category of ['idle','finisher-stunned','taunt']) {
   const plan = owner(id,category,variant,snapshotRegistry);
   assert(plan.facings.every(face=>face.status==='partial-native' && face.measuredDistinctDrawings===3));
   assert(plan.facings.every(face=>face.clips.every(clip=>!historicalAtlasIds.has(clip.atlasId))),'New costume clips do not borrow historical bodies');
  }
  for (const category of ['intro','round-victory','round-defeat']) {
   const plan = owner(id,category,variant,snapshotRegistry);
   assert(plan.facings.every(face=>face.status==='partial-native' && face.measuredDistinctDrawings===3));
   assert(plan.facings.every(face=>face.filesPresentAtBaselineAudit===true && face.rectsValidAtBaselineAudit===true));
  }
 }
 assert(owner('celtic','intro','celtic-avec-casque-0764ed4b53',snapshotRegistry).facings.every(face=>face.status==='missing'));
 assert(owner('user-ahab','idle','ahab-avec-casque-0c8ceb1c95',snapshotRegistry).facings.every(face=>face.measuredDistinctDrawings===2));
});

test('held stances, hitstun, missing or foreign masks and human anatomy never masquerade as presentation cycles', () => {
 const held = owner('jungle-hunter','idle','jungle-hunter-final-duel-v57',snapshotRegistry);
 assert(held.facings.every(face=>face.status==='held-only' && face.measuredDistinctDrawings===1));
 assert.equal(owner('user-ahab','idle',null,snapshotRegistry),null);
 assert.equal(owner('user-ahab','intro','scar-avec-casque-6a0a69930d',snapshotRegistry),null);
 assert.equal(owner('not-a-fighter','idle',null,snapshotRegistry),null);
 assert.equal(owner('scar','hitstun',null,snapshotRegistry),null);
 for (const id of ['theta','machiko-noguchi']) {
  const result = owner(id,'finisher-stunned',null,snapshotRegistry);
  assert.equal(result.entry.species,'human'); assert.equal(result.family.id,'human-guard');
  assert(result.entry.constraints.some(rule=>rule.includes('human')));
  assert(result.facings.every(face=>face.status==='missing'));
 }
});

test('a changed or new declaration cannot inherit old PNG/distinct-drawing proof, or manufacture an opposite facing', () => {
 const ahab = snapshotRegistry.find(definition=>definition.fighterId==='user-ahab' && definition.atlas.clips.some(clip=>clip.id==='idle'&&clip.facing==='right'));
 const altered = structuredClone(ahab); altered.atlas.id='new-unaudited-native-v93';
 altered.atlas.clips=altered.atlas.clips.filter(clip=>clip.id==='idle'&&clip.facing==='right');
 const result = owner('user-ahab','idle','ahab-avec-casque-0c8ceb1c95',[altered]);
 assert.equal(result.facings.find(face=>face.facing==='right').status,'pixel-review-required');
 assert.equal(result.facings.find(face=>face.facing==='right').measuredDistinctDrawings,null);
 assert.equal(result.facings.find(face=>face.facing==='right').filesPresentAtBaselineAudit,null);
 assert.equal(result.facings.find(face=>face.facing==='left').status,'missing');
 const changed = structuredClone(ahab); changed.atlas.clips[0].frames[0].rect[0]+=1;
 const changedResult = owner('user-ahab','idle','ahab-avec-casque-0c8ceb1c95',[changed]);
 assert(changedResult.facings.some(face=>face.status==='pixel-review-required'));
 const held = structuredClone(altered); held.atlas.clips[0].frames=held.atlas.clips[0].frames.slice(0,1);
 const heldResult = owner('user-ahab','idle','ahab-avec-casque-0c8ceb1c95',[held]).facings.find(face=>face.facing==='right');
 assert.equal(heldResult.status,'held-only'); assert.equal(heldResult.measuredDistinctDrawings,null,'unmeasured held declaration is not a pixel measurement');
 const missingPage = structuredClone(altered); missingPage.atlas.pages=[];
 const missingPageResult = owner('user-ahab','idle','ahab-avec-casque-0c8ceb1c95',[missingPage]).facings.find(face=>face.facing==='right');
 assert.equal(missingPageResult.status,'pixel-review-required'); assert.equal(missingPageResult.filesPresentAtBaselineAudit,null);
 assert.deepEqual(missingPageResult.clips[0].sourcePaths,[],'an absent page has no invented source path');
});

test('reference scopes distinguish primary access, licensed appearance and one documented still from complete gestures', () => {
 const allowed = new Set(['www.20thcenturystudios.com','store.necaonline.com','necaonline.com','www.playstation.com','blog.playstation.com','blog.fr.playstation.com','store.playstation.com','www.marvel.com','digital.darkhorse.com','store.steampowered.com']);
 for (const source of catalog.sources) {
  assert(allowed.has(new URL(source.url).hostname),source.url); assert.equal(source.oneToOneCertified,false);
  assert(source.supports.length>10 && source.doesNotEstablish.length>10);
  if (source.accessStatus==='inherited-local-dossier') assert.equal(source.checkedAt,null);
 }
 const dek = owner('user-dek','intro',undefined,snapshotRegistry);
 assert.equal(dek.plan.poseEvidence.length,1); assert.equal(dek.plan.poseEvidence[0].kind,'documented-static-pose-only');
 assert.equal(dek.plan.documentedGesture,false);
 assert.equal(owner('user-samurai','intro',undefined,snapshotRegistry).plan.documentedGesture,false);
 assert.equal(catalog.entries.find(entry=>entry.fighterId==='original-mutated-yautja').sourceReviewNeeded,false,'project original does not require a fictional official identity');
 assert.equal(catalog.entries.find(entry=>entry.fighterId==='user-warp-adjutant').sourceReviewNeeded,true);
});

test('exhaustive queue covers437 appearances x6 categories x2 facings and remains honest about incomplete delivery', () => {
 const before = JSON.stringify(catalog), registryBefore = JSON.stringify(p.PIT_SPRITE_SHEET_REGISTRY);
 const queue = p.getPitPresentationProductionQueueV93(undefined,snapshotRegistry);
 assert.equal(queue.length,437*6*2);
 assert.equal(new Set(queue.map(row=>[row.fighterId,row.appearanceId,row.category,row.facing].join('|'))).size,queue.length);
 assert(queue.every(row=>row.detailedDeliveryComplete===false && row.oneToOneCertified===false));
 assert(queue.every(row=>row.missingDistinctDrawings===null||row.missingDistinctDrawings>=0));
 const scoped = p.getPitPresentationProductionQueueV93(['scar'],snapshotRegistry);
 assert.equal(scoped.length,(p.getPitFighterVariants('scar').length+1)*12);
 assert(scoped.every(row=>row.fighterId==='scar'));
 const audit = p.auditPitPresentationPlansV93(snapshotRegistry);
 assert.equal(audit.counts.identities,201); assert.equal(audit.counts.identityPlans,1206);
 assert.equal(audit.counts.requestedFacingCategories,5244);
 assert.equal(audit.counts.baselineRegisteredClips,409);
 assert.equal(audit.counts.partialFacingCategories,78); assert.equal(audit.counts.heldOnlyFacingCategories,4);
 assert.equal(audit.counts.missingFacingCategories,5162); assert.equal(audit.counts.pixelReviewRequiredFacingCategories,0);
 assert.equal(audit.counts.detailedDeliveryCertified,0); assert.equal(audit.counts.canonOneToOneCertified,0);
 assert(audit.counts.missingFacingCategories>5000);
 assert.equal(JSON.stringify(catalog),before); assert.equal(JSON.stringify(p.PIT_SPRITE_SHEET_REGISTRY),registryBefore);
 assert(Object.isFrozen(catalog)); assert(Object.isFrozen(catalog.entries[0].plans[0]));
});
