import test from 'node:test';
import assert from 'node:assert/strict';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';

const qa=homeworldSceneSsrV78();
const mt=qa.load('app/game/systems/mobility/mountsV153.ts');
const m=qa.load('app/game/systems/mobility/ledger.ts');
const cat=qa.load('app/game/systems/mobility/catalogue.ts');
const saves=qa.load('app/game/save.ts');
const OWNER='2026-11-08T10:00:00.000Z';

function seed(){const s=saves.defaultSave(OWNER);s.profile.honor=300;s.profile.rankId='blooded';s.profile.clanMarks=10000;return s;}
let ev=0;const eid=()=>`ev-test-${++ev}`;
function act(s,cmd,ok=true){
 const before=JSON.stringify(s);
 const r=mt.actMountsV153(s,{ownerCreatedAt:s.createdAt,expectedRevision:s.mountsV153?.revision??0,...cmd});
 assert.equal(r.accepted,ok,r.message);assert.equal(JSON.stringify(s),before,'réducteur pur');
 return r.accepted?{save:{...s,mountsV153:r.state,profile:{...s.profile,clanMarks:r.clanMarks}},r}:{save:s,r};
}
const TRIAL='trial-kha-rha';
const GOOD={'approach-without-fire':'no-fire','shared-scent':'scent-first','short-circuit':'stop-return'};
function trialDone(s=seed()){
 s=act(s,{type:'begin-trial',mountId:'kha_rha'}).save;
 for(const [exerciseId,optionId] of Object.entries(GOOD))s=act(s,{type:'trust-exercise',trialId:TRIAL,exerciseId,optionId,eventId:eid()}).save;
 return s;
}
function recruited(){return act(trialDone(),{type:'recruit',mountId:'kha_rha',trialId:TRIAL}).save;}
function withSession(s=recruited()){return act(s,{type:'open-session',mountId:'kha_rha'}).save;}
const mount=s=>s.mountsV153.mounts.find(v=>v.id==='kha_rha');
function store(){const values=new Map();return {get length(){return values.size;},key(i){return [...values.keys()][i]??null;},getItem(k){return values.get(k)??null;},setItem(k,v){values.set(k,String(v));},removeItem(k){values.delete(k);}};}

test('profils : seize montures du catalogue, faiblesses citées exactement',()=>{
 assert.equal(mt.MOUNT_PROFILES_V153.length,16);
 assert.deepEqual(mt.MOUNT_PROFILES_V153.map(p=>p.id),cat.MOBILITY_CATALOGUE.filter(d=>d.kind==='mount').map(d=>d.id));
 for(const r of mt.MOUNT_REACTION_SOURCES_V153)assert(cat.MOBILITY_CATALOGUE.some(d=>d.weaknesses.includes(r.source)),r.source);
 assert.deepEqual(mt.mountProfileV153('kha_rha').reactions.map(r=>r.trigger),['fire','toxic']);
 assert.deepEqual(mt.MOUNT_PROFILES_V153.filter(p=>p.recruitment).map(p=>p.id),['kha_rha']);
});

test('aucun animal par défaut : état neuf vide, ancienne sauvegarde sans monture',()=>{
 assert.deepEqual(mt.createMountsV153(OWNER).mounts,[]);
 assert.equal(mt.inspectMountsV153(undefined,OWNER).status,'absent');
 const s=seed();assert.equal(Object.hasOwn(s,'mountsV153'),false);
 const db=store(),w=saves.writeSaveWithStatus(s,db);assert(w.persisted,w.failure);
 const loaded=saves.loadSaveWithStatus(db);assert(!loaded.failure,loaded.failure);assert.equal(Object.hasOwn(loaded.save,'mountsV153'),false);
});

test('recrutement explicite : refus sans preuve complète',()=>{
 act(seed(),{type:'recruit',mountId:'kha_rha',trialId:TRIAL},false);
 let s=act(seed(),{type:'begin-trial',mountId:'kha_rha'}).save;
 act(s,{type:'recruit',mountId:'kha_rha',trialId:TRIAL},false);
 // Exercices hors ordre refusés.
 act(s,{type:'trust-exercise',trialId:TRIAL,exerciseId:'shared-scent',optionId:'scent-first',eventId:eid()},false);
 // Mauvaise approche : interrompt, ne compte pas ; reprise possible.
 const bad=act(s,{type:'trust-exercise',trialId:TRIAL,exerciseId:'approach-without-fire',optionId:'torch',eventId:eid()});
 assert.equal(bad.r.outcome,'interrupted');s=bad.save;assert.equal(s.mountsV153.trial.passed.length,0);assert.equal(s.mountsV153.trial.attempts,1);
 s=act(s,{type:'trust-exercise',trialId:TRIAL,exerciseId:'approach-without-fire',optionId:'no-fire',eventId:eid()}).save;
 s=act(s,{type:'trust-exercise',trialId:TRIAL,exerciseId:'shared-scent',optionId:'scent-first',eventId:eid()}).save;
 act(s,{type:'recruit',mountId:'kha_rha',trialId:TRIAL},false);
 assert.deepEqual(s.mountsV153.mounts,[]);
 s=act(s,{type:'trust-exercise',trialId:TRIAL,exerciseId:'short-circuit',optionId:'stop-return',eventId:eid()}).save;
 assert.equal(s.mountsV153.trial.status,'complete');assert.deepEqual(s.mountsV153.mounts,[],'preuve seule : pas de monture sans confirmation');
 s=act(s,{type:'recruit',mountId:'kha_rha',trialId:TRIAL}).save;
 const k=mount(s);assert.equal(k.bond,0);assert.equal(k.fatigue,0);assert.equal(k.proof.eventIds.length,3);
 act(s,{type:'recruit',mountId:'kha_rha',trialId:TRIAL},false);
});

test('recrutement : rang, monture sans voie et preuve falsifiée refusés',()=>{
 const low=seed();low.profile.rankId='young-blood';act(low,{type:'begin-trial',mountId:'kha_rha'},false);
 for(const id of ['war_kha_rha','forest_stalker_mount','elder_great_beast'])act(seed(),{type:'begin-trial',mountId:id},false);
 // Monture ajoutée sans essai complet : sauvegarde invalide.
 const forged=seed();forged.mountsV153=mt.createMountsV153(OWNER);forged.mountsV153.revision=1;
 forged.mountsV153.mounts.push({id:'kha_rha',recruitedRevision:1,proof:{kind:'trust-exercises',trialId:TRIAL,eventIds:[]},bond:0,fatigue:0,injury:0,sessions:0});
 assert.equal(mt.inspectMountsV153(forged.mountsV153,OWNER).status,'invalid-save');
 const s=recruited();const other=structuredClone(s.mountsV153);other.mounts[0].id='war_kha_rha';
 assert.equal(mt.inspectMountsV153(other,OWNER).status,'invalid-save');
 const swapped=structuredClone(s.mountsV153);swapped.mounts[0].proof.eventIds.reverse();
 assert.equal(mt.inspectMountsV153(swapped,OWNER).status,'invalid-save');
});

test('événement déjà consommé : sans effet',()=>{
 let s=trialDone();
 const id=s.mountsV153.trial.passed[0].eventId;
 s=act(s,{type:'recruit',mountId:'kha_rha',trialId:TRIAL}).save;s=withSession(s);
 act(s,{type:'exercise',sessionId:'S1',exerciseId:'groundwork',condition:'calm',eventId:id},false);
 const e=eid();s=act(s,{type:'exercise',sessionId:'S1',exerciseId:'groundwork',condition:'calm',eventId:e}).save;
 act(s,{type:'exercise',sessionId:'S1',exerciseId:'groundwork',condition:'calm',eventId:e},false);
});

test('BOND plafonné à 5 par séance, avec identifiant de séance',()=>{
 let s=withSession();
 assert.equal(s.mountsV153.session.id,'S1');
 for(let i=0;i<4;i++)s=act(s,{type:'exercise',sessionId:'S1',exerciseId:'groundwork',condition:'calm',eventId:eid()}).save;
 assert.equal(mount(s).bond,5);assert.equal(s.mountsV153.session.gain,5);assert.equal(mount(s).fatigue,32);
 act(s,{type:'exercise',sessionId:'S2',exerciseId:'groundwork',condition:'calm',eventId:eid()},false);
 s=act(s,{type:'close-session',sessionId:'S1'}).save;assert.equal(s.mountsV153.lastSession.gain,5);
 act(s,{type:'exercise',sessionId:'S1',exerciseId:'groundwork',condition:'calm',eventId:eid()},false);
 s=withSession(s);assert.equal(s.mountsV153.session.id,'S2');
 s=act(s,{type:'exercise',sessionId:'S2',exerciseId:'groundwork',condition:'calm',eventId:eid()}).save;
 assert.equal(mount(s).bond,7);
 // Exercice de palier supérieur verrouillé.
 act(s,{type:'exercise',sessionId:'S2',exerciseId:'lead',condition:'calm',eventId:eid()},false);
 const cheat=structuredClone(s.mountsV153);cheat.session.gain=6;assert.equal(mt.inspectMountsV153(cheat,OWNER).status,'invalid-save');
});

test('fatigue : le lien ne la fait pas retomber, refus au seuil, charge exige une pause',()=>{
 let s=withSession();s.mountsV153.mounts[0].bond=100;
 const before=mount(s).fatigue;
 s=act(s,{type:'exercise',sessionId:'S1',exerciseId:'charge',condition:'calm',eventId:eid()}).save;
 assert.equal(mount(s).fatigue,before+25);assert.equal(mount(s).bond,100);
 s=act(s,{type:'exercise',sessionId:'S1',exerciseId:'charge',condition:'calm',eventId:eid()}).save;assert.equal(mount(s).fatigue,50);
 const r=act(s,{type:'exercise',sessionId:'S1',exerciseId:'charge',condition:'calm',eventId:eid()});
 assert.equal(r.r.outcome,'refused');assert.equal(mount(r.save).fatigue,50);
 s=r.save;s.mountsV153.mounts[0].fatigue=80;
 const t=act(s,{type:'exercise',sessionId:'S1',exerciseId:'groundwork',condition:'calm',eventId:eid()});
 assert.equal(t.r.outcome,'refused');assert.equal(mount(t.save).fatigue,80);assert.equal(mount(t.save).bond,100);
});

test('peur selon le BOND : feu sous 25 = panique et blessure, dès 25 = exercice',()=>{
 let s=withSession();
 const p=act(s,{type:'exercise',sessionId:'S1',exerciseId:'groundwork',condition:'fire',eventId:eid()});
 assert.equal(p.r.outcome,'panic');assert.equal(mount(p.save).injury,10);assert.equal(mount(p.save).bond,0);
 assert.equal(p.save.mountsV153.session,null);assert.equal(p.save.mountsV153.lastSession.outcome,'interrupted');
 s=withSession();s.mountsV153.mounts[0].bond=25;
 const ok=act(s,{type:'exercise',sessionId:'S1',exerciseId:'groundwork',condition:'fire',eventId:eid()});
 assert.equal(ok.r.outcome,'completed');assert.equal(mount(ok.save).bond,27);assert.equal(mount(ok.save).injury,0);
 // Toxique : refus quel que soit le BOND (aucun équipement implémenté).
 s=withSession();s.mountsV153.mounts[0].bond=100;
 const tox=act(s,{type:'exercise',sessionId:'S1',exerciseId:'groundwork',condition:'toxic',eventId:eid()});
 assert.equal(tox.r.outcome,'refused');assert.equal(mount(tox.save).bond,100);
 // Fonction pure : autres profils.
 const forest=mt.mountProfileV153('forest_stalker_mount'),bison=mt.mountProfileV153('bone_bison_war_mount');
 assert.equal(mt.mountReactionV153(forest,'explosions',100,1),'none');assert.equal(mt.mountReactionV153(forest,'explosions',100,2),'panic');
 assert.equal(mt.mountReactionV153(bison,'isolation',24),'panic');assert.equal(mt.mountReactionV153(bison,'isolation',25),'none');
 assert.equal(mt.mountReactionV153(mt.mountProfileV153('night_stalker_mount'),'intense-light',100),'refusal');
});

test('blessure : refus au seuil ; soins distincts de la réparation, sans BOND',()=>{
 let s=recruited();s.mountsV153.mounts[0].injury=50;s.mountsV153.mounts[0].fatigue=40;s.mountsV153.mounts[0].bond=12;
 s=withSession(s);
 const r=act(s,{type:'exercise',sessionId:'S1',exerciseId:'groundwork',condition:'calm',eventId:eid()});assert.equal(r.r.outcome,'refused');
 s=act(r.save,{type:'close-session',sessionId:'S1'}).save;
 const cost=mt.mountCareQuoteV153(s.mountsV153,'kha_rha');assert.equal(cost,Math.ceil(50*1.2+40*.2));
 act(s,{type:'care',mountId:'kha_rha',expectedCost:cost-1},false);
 const marks=s.profile.clanMarks;
 s=act(s,{type:'care',mountId:'kha_rha',expectedCost:cost}).save;
 assert.equal(mount(s).injury,0);assert.equal(mount(s).fatigue,0);assert.equal(mount(s).bond,12);assert.equal(s.profile.clanMarks,marks-cost);
 assert.equal(mt.mountCareQuoteV153(s.mountsV153,'kha_rha'),null);
 // Le registre des machines ne connaît pas la monture : pas de réparation possible.
 s.mobilityV1=m.createMobilityLedger(OWNER);
 for(const type of ['repair','recharge','care']){const res=m.actMobility(s,{type,modelId:'kha_rha',expectedCost:1,ownerCreatedAt:OWNER,expectedRevision:0});assert.equal(res.accepted,false,type);}
 act(s,{type:'repair',mountId:'kha_rha',expectedCost:1},false);
 // Soins impossibles pendant une séance.
 const open=withSession(s);open.mountsV153.mounts[0].injury=10;assert.equal(mt.mountCareQuoteV153(open.mountsV153,'kha_rha'),null);
});

test('aire des convois occupée ou registre de mobilité invalide : aucune action',()=>{
 const s=seed();s.mobilityV1=m.createMobilityLedger(OWNER);s.mobilityV1.version=2;
 act(s,{type:'begin-trial',mountId:'kha_rha'},false);
 act({...seed(),createdAt:'2026-01-01T00:00:00.000Z'},{type:'begin-trial',mountId:'kha_rha',ownerCreatedAt:OWNER},false);
 const stale=trialDone();act(stale,{type:'recruit',mountId:'kha_rha',trialId:TRIAL,expectedRevision:0},false);
});

test('sauvegarde : aller-retour, ancienne sauvegarde intacte, version future refusée',()=>{
 let s=withSession();s=act(s,{type:'exercise',sessionId:'S1',exerciseId:'groundwork',condition:'calm',eventId:eid()}).save;
 s.mobilityV1=m.createMobilityLedger(OWNER);
 const mobilityBefore=JSON.stringify(s.mobilityV1);
 const db=store(),w=saves.writeSaveWithStatus(s,db);assert(w.persisted,w.failure);
 const loaded=saves.loadSaveWithStatus(db);assert(!loaded.failure,loaded.failure);
 assert.deepEqual(loaded.save.mountsV153,s.mountsV153);assert.equal(JSON.stringify(loaded.save.mobilityV1),mobilityBefore,'registre mobilityV1 inchangé');
 const portable=saves.parseSaveImport(saves.exportSave(w.save));assert.deepEqual(portable.save.mountsV153,s.mountsV153);
 // Ancienne sauvegarde : mobilityV1 de forme exacte, sans mountsV153.
 const legacy=seed();legacy.mobilityV1=m.createMobilityLedger(OWNER);legacy.mobilityV1.circulationPermit=true;
 const legacyDb=store(),lw=saves.writeSaveWithStatus(legacy,legacyDb);assert(lw.persisted,lw.failure);
 const raw=JSON.parse(saves.exportSave(lw.save));assert.equal(Object.hasOwn(raw.save,'mountsV153'),false);
 const reimported=saves.parseSaveImport(JSON.stringify(raw));assert(reimported.save,reimported.failure);
 assert.deepEqual(reimported.save.mobilityV1,legacy.mobilityV1);assert.equal(m.inspectMobilityLedger(reimported.save.mobilityV1,OWNER).status,'valid');
 // Version future et état invalide refusés à l'import.
 for(const [mutate,failure] of [[v=>v.mountsV153.version=2,'future-version'],[v=>v.mountsV153.mounts[0].bond=101,'invalid-save'],[v=>v.mountsV153.extra=1,'invalid-save']]){
  const bad=JSON.parse(saves.exportSave(w.save));mutate(bad.save);const r=saves.parseSaveImport(JSON.stringify(bad));assert.equal(r.save,null);assert.equal(r.failure,failure);
 }
 assert.equal(mt.inspectMountsV153({version:3},OWNER).status,'future-version');
});

test('garage SSR : panneau monture, voie Kha’Rha marquée proposée, autres montures sans voie',()=>{
 const k=qa.render('app/game/MobilityGarage.tsx',{save:seed(),onCommand:()=>{},onMountCommand:()=>({accepted:false,message:'',state:null}),onClose:()=>{}});
 assert(k.includes('Registre de mobilité'));
 const panel=qa.render('app/game/MobilityMountsV153.tsx',{save:seed(),mountId:'kha_rha',allowed:true,onCommand:()=>{},onMessage:()=>{}});
 assert(panel.includes('data-mount-recruitment="trust-exercises"'));assert(panel.includes('Premier lien'));assert(panel.includes('Proposé'));assert(panel.includes('Approcher un jeune adulte'));
 const other=qa.render('app/game/MobilityMountsV153.tsx',{save:seed(),mountId:'war_kha_rha',allowed:true,onCommand:()=>{},onMessage:()=>{}});
 assert(other.includes('data-mount-recruitment="unavailable"'));assert(!other.includes('Approcher un jeune adulte'));
 const owned=qa.render('app/game/MobilityMountsV153.tsx',{save:withSession(),mountId:'kha_rha',allowed:true,onCommand:()=>{},onMessage:()=>{}});
 assert(owned.includes('data-mount-bond="0"'));assert(owned.includes('data-mount-session="S1"'));assert(owned.includes('BOND 25 requis'));
});

test('adoption de l’élevage : preuve complète, devis exact et débit unique', () => {
 const cost = mt.KHA_RHA_ADOPTION_MARKS_V153;
 const order = {type:'adopt', mountId:'kha_rha', trialId:TRIAL, expectedCost:cost};
 const empty = seed();
 act(empty, order, false);
 const ready = trialDone();
 act(ready, {...order, trialId:'autre-approche'}, false);
 act(ready, {...order, expectedCost:cost - 1}, false);
 act(ready, {...order, expectedRevision:ready.mountsV153.revision - 1}, false);
 act(ready, {...order, mountId:'war_kha_rha'}, false);
 act({...ready, profile:{...ready.profile, clanMarks:cost - 1}}, order, false);
 act({...ready, profile:{...ready.profile, rankId:'young-blood'}}, order, false);

 const bought = act({...ready, profile:{...ready.profile, clanMarks:cost}}, order).save;
 assert.equal(bought.profile.clanMarks, 0);
 assert.equal(bought.mountsV153.spentMarks, cost);
 assert.equal(bought.mountsV153.mounts.length, 1);
 assert.equal(mount(bought).proof.adoptionMarks, cost);
 assert.deepEqual(mount(bought).proof.eventIds, ready.mountsV153.trial.passed.map(p => p.eventId));
 assert.equal(mount(bought).bond, 0);
 act(bought, {...order, expectedRevision:ready.mountsV153.revision}, false);
 act(bought, {type:'recruit', mountId:'kha_rha', trialId:TRIAL}, false);
 act(bought, order, false);

 const db = store();
 const receipt = saves.writeSaveWithStatus(bought, db);
 assert(receipt.persisted, receipt.failure);
 const resumed = saves.loadSaveWithStatus(db);
 assert.equal(resumed.failure, null);
 assert.deepEqual(resumed.save.mountsV153, bought.mountsV153);
 assert.equal(resumed.save.profile.clanMarks, 0);
 for (const tamper of [
  state => {state.spentMarks = cost - 1;},
  state => {state.mounts[0].proof.adoptionMarks = cost - 1;},
  state => {state.mounts[0].proof.eventIds = [];},
 ]) {
  const invalid = structuredClone(bought.mountsV153);
  tamper(invalid);
  assert.equal(mt.inspectMountsV153(invalid, OWNER).status, 'invalid-save');
 }
 const legacy = act(ready, {type:'recruit', mountId:'kha_rha', trialId:TRIAL}).save;
 assert.equal(legacy.profile.clanMarks, ready.profile.clanMarks);
 assert.equal(Object.hasOwn(mount(legacy).proof, 'adoptionMarks'), false);
 assert.equal(mt.inspectMountsV153(legacy.mountsV153, OWNER).status, 'valid');
});
