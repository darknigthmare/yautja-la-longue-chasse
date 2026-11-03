import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';

// Actual production reducers, data, roster, art and React scene. Synthetic
// ordered receipts exercise model contracts; they are NOT browser victories.
const loader = homeworldSceneSsrV78();
const C = loader.load('app/game/systems/pitCharacterChroniclesV79.ts');
const R = loader.load('app/game/systems/pitRosterExpansion.ts');
const arenas = loader.load('app/game/systems/pitCombat.ts').PIT_ARENAS;
const seeds = loader.load('app/game/data/pitChronicleSeedsV80.ts').PIT_CHRONICLE_SEEDS_V80;
const {PitCharacterChronicleSceneV79: Scene} = loader.load('app/game/PitExperienceV79.tsx');
const art = loader.load('app/game/pitCombatBitmapArt.ts');
const owner = '2026-10-03T18:00:00.000Z';
const hash = value => createHash('sha256').update(value).digest('hex');
const textEscape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#x27;'})[c]);
function enter(run) {
  while (['intro','post','defeat'].includes(run.phase)) run = C.advancePitCharacterChronicleV79(run);
  assert.equal(run.phase,'pre'); return C.advancePitCharacterChronicleV79(run);
}
function settle(run, n, win = true) {
  const e = C.getPitCharacterChronicleEncounterV79(run);
  return C.applyPitCharacterChronicleResultV79(run, {mode:'cpu',runId:run.runId,resultId:run.runId+'-'+n,
    encounterId:e.id,leftId:e.leftId,rightId:e.rightId,arenaId:e.arenaId,winnerId:win?e.leftId:e.rightId}).run;
}
function render(fighterId, run, reviewPanel) {
  return renderToStaticMarkup(React.createElement(Scene,{fighterId,run,reviewPanel,highContrast:false,onPreview:()=>{throw Error('SSR cannot decode a stage');}}));
}

test('201 explicit dossiers exactly cover runtime IDs with 8 different real opponents and 3+3 native scene compositions',()=>{
  const routes=C.PIT_CHARACTER_CHRONICLE_ROUTES_V80;
  assert.equal(routes.length,201); assert.equal(seeds.length,201);
  assert.deepEqual(new Set(routes.map(r=>r.fighterId)),new Set(R.PIT_VERSUS_FIGHTER_IDS));
  assert.equal(new Set(routes.map(r=>r.title)).size,201);
  assert.equal(new Set(seeds.map(s=>s.premise)).size,201);
  assert.equal(new Set(seeds.map(s=>s.choice)).size,201);
  assert.equal(new Set(routes.map(r=>r.rivalId)).size>30,true);
  for(const r of routes){
    assert.equal(r.version,2);assert.equal(r.encounters.length,8);assert.equal(r.intro.length,3);assert.equal(r.outro.length,3);
    assert.equal(new Set(r.encounters.map(e=>e.rightId)).size,8);
    assert.equal(r.encounters[7].rightId,r.rivalId);assert.ok(R.isPitVersusFighterId(r.rivalId));
    assert.ok(r.familyNote);assert.ok(r.rivalReason);assert.match(r.continuity,/originale/);
    assert.match(r.limitation,/aucun gain de campagne ni cloud/);
    for(const e of r.encounters){
      assert.equal(e.leftId,r.fighterId);assert.notEqual(e.leftId,e.rightId);assert.ok(R.isPitVersusFighterId(e.rightId));
      assert.ok(arenas[e.arenaId]);assert.equal(e.mode,'cpu');assert.equal(e.continuity,'ritual-reconstruction');
      assert.ok(e.before.includes(r.title)||e.before.includes(seeds.find(s=>s.fighterId===r.fighterId).premise));
      assert.ok(e.before.length>80&&e.after.length>40&&e.challenge.length>5);
    }
    for(const p of [...r.intro,...r.outro]){
      assert.ok(arenas[p.arenaId]);assert.ok(R.isPitVersusFighterId(p.focusId));assert.equal(p.illustrationKind,'existing-stage-and-portrait');
      assert.equal(p.fullScene,undefined,'no fabricated dedicated paintings');assert.ok(['wide','profile','close'].includes(p.camera));
      const a=art.getPitCombatBitmapArtDefinition(p.focusId);
      if(a)assert.ok(fs.statSync('public'+a.src).isFile(),a.src);
      else assert.ok(R.isPitExpansionFighterId(p.focusId),'atlas-only supplied portrait');
    }
  }
});

for(const route of C.PIT_CHARACTER_CHRONICLE_ROUTES_V80){
  test(`${route.fighterId}: ordered 8-duel route, all 6 illustrated panels, read-only gallery and owner-bound reload`,()=>{
    let run=C.createPitCharacterChronicleRunV79(route.fighterId,owner,'route-'+route.fighterId);
    assert.equal(run.contentVersion,2);assert.deepEqual(C.getPitCharacterChronicleGalleryAccessV80(run),{intro:true,outro:false});
    for(const p of route.intro){
      const html=render(route.fighterId,run);assert.ok(html.includes(textEscape(p.text)));assert.ok(html.includes('data-native-chronicle-portrait="'+p.focusId+'"'));
      assert.ok(html.includes('data-pit-stage-preview="'+p.arenaId+'"'));assert.ok(html.includes('RECONSTITUTION ORIGINALE'));
      run=C.advancePitCharacterChronicleV79(run);
    }
    for(let index=0;index<8;index++){
      run=enter(run);
      const pending=C.parsePitCharacterChronicleRunV79(C.serializePitCharacterChronicleRunV79(run),owner);
      assert.equal(pending.phase,'pre');assert.equal(pending.encounterIndex,index);assert.equal(pending.results.length,index);
      assert.equal(pending.contentVersion,2);assert.equal(C.getPitCharacterChronicleEncounterV79(pending).rightId,route.encounters[index].rightId);
      run=settle(run,index);assert.equal(run.phase,'post');assert.equal(run.encounterIndex,index+1);
      assert.equal(C.getPitCharacterChronicleGalleryAccessV80(run).outro,index===7);
      run=C.advancePitCharacterChronicleV79(run);
    }
    assert.equal(run.phase,'outro');
    for(const p of route.outro){
      const html=render(route.fighterId,run);assert.ok(html.includes(textEscape(p.text)));assert.ok(html.includes('data-native-chronicle-portrait="'+p.focusId+'"'));
      run=C.advancePitCharacterChronicleV79(run);
    }
    assert.equal(run.phase,'finished');assert.equal(run.results.length,8);assert.deepEqual(C.normalizePitCharacterChronicleRunV79(run,owner),run);
    const bytes=JSON.stringify(run);const gallery=render(route.fighterId,run,{phase:'outro',page:2});
    assert.ok(gallery.includes(textEscape(route.outro[2].text)));assert.equal(JSON.stringify(run),bytes,'gallery never rewrites progression');
    assert.deepEqual(C.parsePitCharacterChronicleRunV79(bytes,owner),run);
    assert.equal(C.parsePitCharacterChronicleRunV79(bytes,'2026-10-04T18:00:00.000Z'),null);
  });
}

test('V79 legacy routes and ordered checkpoints remain unchanged and never share v2 storage keys',()=>{
  assert.equal(hash(JSON.stringify(C.PIT_CHARACTER_CHRONICLE_ROUTES_V79)),'736ff270cd11aa1eab264e46b70a79636b542b5faa730ad86cb6571da00413d7');
  for(const r of C.PIT_CHARACTER_CHRONICLE_ROUTES_V79){
    let old=C.createPitCharacterChronicleRunV79(r.fighterId,owner,'legacy-'+r.fighterId,1);
    for(let i=0;i<3;i++){old=settle(enter(old),i);old=C.advancePitCharacterChronicleV79(old);}
    assert.equal(old.phase,'outro');const bytes=C.serializePitCharacterChronicleRunV79(old);
    const next=C.createPitCharacterChronicleRunV79(r.fighterId,owner,'new-'+r.fighterId,2);
    assert.notEqual(next.routeId,old.routeId);assert.notEqual(C.pitCharacterChronicleStorageKeyV79(owner,1),C.pitCharacterChronicleStorageKeyV79(owner,2));
    assert.equal(C.serializePitCharacterChronicleRunV79(C.parsePitCharacterChronicleRunV79(bytes,owner)),bytes);
    assert.equal(C.getPitCharacterChronicleRouteV79(old.fighterId,1).encounters.length,3);
    assert.equal(C.normalizePitCharacterChronicleRunV79({...old,contentVersion:2}),null);
    assert.equal(C.normalizePitCharacterChronicleRunV79({...next,contentVersion:1}),null);
  }
});

test('unearned outro cannot be opened by gallery request, forged counters, future content or a foreign duel',()=>{
  const id='user-last-hunt-super';let run=C.createPitCharacterChronicleRunV79(id,owner,'gated-last-hunt');
  assert.deepEqual(C.getPitCharacterChronicleGalleryAccessV80({...run,encounterIndex:8}),{intro:false,outro:false});
  assert.deepEqual(C.getPitCharacterChronicleGalleryAccessV80({...run,contentVersion:3}),{intro:false,outro:false});
  const html=render(id,run,{phase:'outro',page:0});assert.ok(!html.includes('data-chronicle-scene="gallery-outro"'));
  assert.ok(!html.includes(textEscape(C.getPitCharacterChronicleRouteV79(id).outro[0].text)));
  run=enter(run);const e=C.getPitCharacterChronicleEncounterV79(run);
  assert.throws(()=>C.applyPitCharacterChronicleResultV79(run,{mode:'cpu',runId:run.runId,resultId:'bad',encounterId:e.id,leftId:e.leftId,rightId:'theta',arenaId:e.arenaId,winnerId:e.leftId}));
  for(let i=0;i<3;i++){run=settle(run,'loss-'+i,false);if(i<2)run=enter(run);}
  assert.equal(run.phase,'failed');assert.equal(run.encounterIndex,0);assert.equal(C.getPitCharacterChronicleGalleryAccessV80(run).outro,false);
});

test('chooser bounds mounted portrait requests, protects old namespaces and exposes keyboard-native gallery controls',()=>{
  const s=fs.readFileSync('app/game/PitExperienceV79.tsx','utf8');
  assert.match(s,/const pageSize = compactRoster \? 6 : 24/);assert.match(s,/visibleRoutes\.map/);assert.doesNotMatch(s,/PIT_CHARACTER_CHRONICLE_ROUTES_V80\.map/);
  assert.match(s,/loading="lazy" decoding="async"/);assert.match(s,/storageKey\(ownerSaveCreatedAt, next\.fighterId, next\.contentVersion\)/);
  assert.match(s,/contentVersion === 1/);assert.match(s,/disabled=\{!endingEarned\}/);assert.match(s,/Galerie · introduction découverte/);
  assert.doesNotMatch(s,/localStorage\.(clear|removeItem)/);assert.match(s,/useMenuGamepad\(root, !inDuel/);
  assert.match(s,/!currentRun \|\| catalogueOpen/);assert.match(s,/Choisir un autre chasseur/);
});

test('played V80 scenes do not discuss software, asset certification or canon classification; documentary caveats remain outside prose',()=>{
  // An editorial lint aid, not a literary-quality or lore certification.
  const meta=/\b(?:logiciel|moteur|simulation|reconstitution|canon(?:ique)?|fichier|certifi\w*|implément\w*|atlas|png|sha256|dlc|runtime)\b|1\s*:\s*1|profil (?:partagé|de duel)|source primaire/i;
  for(const r of C.PIT_CHARACTER_CHRONICLE_ROUTES_V80){
    const seed=seeds.find(s=>s.fighterId===r.fighterId);
    assert.equal(r.outro[0].text,seed.choice,'negative clauses of an authored decision must survive intact');
    assert.equal(r.encounters[7].after,seed.choice,'the final duel and ending tell the same decision');
    const story=[...r.intro,...r.outro].map(p=>p.title+' '+p.text).concat(r.encounters.map(e=>e.title+' '+e.before+' '+e.challenge+' '+e.after));
    for(const text of story){
      assert.doesNotMatch(text,meta,r.fighterId);
      assert.doesNotMatch(text,/\bde une?\b|\bFace à le\b|Ultimate|25th Anniversary|Comic Book|modèle visuel|— classe|— interprétation/i,r.fighterId);
    }
    assert.ok(!r.intro[1].text.includes('avec '+seed.object),'a sought object must not silently become already carried');
    assert.ok(!r.encounters[0].before.includes('sans perdre '+seed.object),'do not assume the fighter already carries the sought object');
    assert.match(r.continuity,/canonique/);assert.match(r.limitation,/poses|techniques/);
    assert.match(r.limitation,/Cet enjeu est décrit/);
  }
});
