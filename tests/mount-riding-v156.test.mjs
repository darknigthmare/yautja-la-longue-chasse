import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';
import {mountRideAutopilotV156} from './helpers/mount-riding-v156-route.mjs';

const qa=homeworldSceneSsrV78();
const rv=qa.load('app/game/systems/mobility/mountRidingV156.ts');
const mt=qa.load('app/game/systems/mobility/mountsV153.ts');
const m=qa.load('app/game/systems/mobility/ledger.ts');
const course=qa.load('app/game/systems/mobility/course.ts');
const saves=qa.load('app/game/save.ts');
const OWNER='2026-11-08T10:00:00.000Z';
const TRIAL='trial-kha-rha';
const GOOD={'approach-without-fire':'no-fire','shared-scent':'scent-first','short-circuit':'stop-return'};
let ev=0;const eid=()=>`ev-ride-${++ev}`;

function seed(){const s=saves.defaultSave(OWNER);s.profile.honor=300;s.profile.rankId='blooded';s.profile.clanMarks=10000;return s;}
function actM(s,cmd){const r=mt.actMountsV153(s,{ownerCreatedAt:s.createdAt,expectedRevision:s.mountsV153?.revision??0,...cmd});assert(r.accepted,r.message);return {...s,mountsV153:r.state,profile:{...s.profile,clanMarks:r.clanMarks}};}
/** Monture recrutée par la voie réelle de #151, puis valeurs de test ajustées. */
function recruited({bond=50,fatigue=0,injury=0}={}){
 let s=actM(seed(),{type:'begin-trial',mountId:'kha_rha'});
 for(const [exerciseId,optionId] of Object.entries(GOOD))s=actM(s,{type:'trust-exercise',trialId:TRIAL,exerciseId,optionId,eventId:eid()});
 s=actM(s,{type:'recruit',mountId:'kha_rha',trialId:TRIAL});
 Object.assign(s.mountsV153.mounts[0],{bond,fatigue,injury});
 assert.equal(mt.inspectMountsV153(s.mountsV153,OWNER).status,'valid');
 return s;
}
function act(s,cmd,ok=true){
 const before=JSON.stringify(s);
 const r=rv.actMountRideV156(s,{ownerCreatedAt:s.createdAt,expectedRevision:s.mountRidesV156?.revision??0,...cmd});
 assert.equal(r.accepted,ok,r.message);assert.equal(JSON.stringify(s),before,'réducteur pur');
 if(!r.accepted)return {save:s,r};
 return {save:{...s,mountRidesV156:r.rides,...(r.mounts?{mountsV153:r.mounts}:{})},r};
}
const mount=s=>s.mountsV153.mounts.find(v=>v.id==='kha_rha');
/** Rejoue la course par paquets de 60 commandes au travers de la transaction. */
function rideTo(s,stop,max=6000){
 const st={i:0};let c=s.mountRidesV156.active.course;
 while(c.tick<max&&!stop(c)){
  const inputs=[];let p=c;
  for(let i=0;i<60&&p.tick<max&&!stop(p);i++){const input=mountRideAutopilotV156(p,undefined,st);inputs.push(input);p=rv.stepMountRideV156(p,input,'kha_rha',s.mountRidesV156.active.bond);}
  s=act(s,{type:'ride',rideId:s.mountRidesV156.active.id,inputs}).save;c=s.mountRidesV156.active.course;
  assert.deepEqual(c,p,'prédiction = transaction');
 }
 return s;
}
function store(){const values=new Map();return {get length(){return values.size;},key(i){return [...values.keys()][i]??null;},getItem(k){return values.get(k)??null;},setItem(k,v){values.set(k,String(v));},removeItem(k){values.delete(k);}};}
const IDLE={throttle:0,steer:0,brake:false,boost:false,interact:false},GO={...IDLE,throttle:1},SPRINT={...GO,boost:true};

test('départ refusé : fatigue, blessure (seuils #151), BOND sous le seuil de monte, séance ouverte, aire occupée',()=>{
 assert.equal(rv.MOUNT_RIDE_MIN_BOND_V156,50);
 for(const [state,word] of [[{fatigue:80},'Épuisé'],[{injury:50},'Blessé'],[{bond:49},'BOND 50 requis']]){
  const r=act(recruited(state),{type:'mount',mountId:'kha_rha'},false);assert(r.r.message.includes(word),r.r.message);
 }
 act(recruited({fatigue:79,injury:49}),{type:'mount',mountId:'kha_rha'});
 act(seed(),{type:'mount',mountId:'kha_rha'},false);
 act(recruited(),{type:'mount',mountId:'war_kha_rha'},false);
 const open=actM(recruited(),{type:'open-session',mountId:'kha_rha'});act(open,{type:'mount',mountId:'kha_rha'},false);
 // Engin sur l'aire : refus, et registre mobilityV1 jamais écrit par la chevauchée.
 const busy=recruited();busy.mobilityV1=m.createMobilityLedger(OWNER);
 const started=m.actMobility(busy,{type:'start',modelId:'scout_grav_sled',loaned:true,ownerCreatedAt:OWNER,expectedRevision:0});assert(started.accepted,started.message);
 busy.mobilityV1=started.state;act(busy,{type:'mount',mountId:'kha_rha'},false);
});

test('course déterministe sur l’aire avec les statistiques du catalogue',()=>{
 const run=()=>{let s=act(recruited(),{type:'mount',mountId:'kha_rha'}).save;return rideTo(s,rv.mountRidePassedV156);};
 const a=run(),b=run();
 assert.deepEqual(a.mountRidesV156.active.course,b.mountRidesV156.active.course);
 const c=a.mountRidesV156.active.course;
 assert(rv.mountRidePassedV156(c));assert.equal(c.checkpoint,3);assert.equal(c.impacts,0);
 // Chiffres attendus pour ce pilote (régression).
 assert.equal(c.tick,1389);assert.equal(Math.ceil(c.fatigue),12);
 // Vitesse de pointe = catalogue « Stats » kha_rha (107 u/s à état 100).
 let p=rv.createMountRideCourseV156(0,0);for(let i=0;i<120;i++)p=rv.stepMountRideV156(p,GO,'kha_rha',50);
 assert(Math.abs(p.speed-107)<1e-9,String(p.speed));
 // Blessure : vitesse réduite selon la formule d'état du catalogue.
 let h=rv.createMountRideCourseV156(0,40);for(let i=0;i<120;i++)h=rv.stepMountRideV156(h,GO,'kha_rha',50);
 assert(Math.abs(h.speed-107*(.45+.55*.6))<1e-9);
 assert.throws(()=>rv.stepMountRideV156(p,GO,'scout_grav_sled',50));
});

test('fatigue croissante ; le BOND ne la réduit pas ; épuisement = au pas',()=>{
 const run=(bond,input,n=600)=>{let c=rv.createMountRideCourseV156(10,0);const f=[];for(let i=0;i<n;i++){c=rv.stepMountRideV156(c,input,'kha_rha',bond);f.push(c.fatigue);}return {c,f};};
 const low=run(50,GO),high=run(100,GO);
 assert.deepEqual(low.f,high.f,'BOND sans effet sur la fatigue');
 for(let i=1;i<low.f.length;i++)assert(low.f[i]>=low.f[i-1]);
 assert(low.c.fatigue>10);
 const idle=run(100,IDLE);assert.equal(idle.c.fatigue,10,'aucun repos pendant la course');
 const sprint=run(50,SPRINT,120),walk=run(50,GO,120);assert(sprint.c.fatigue-10>2.5*(walk.c.fatigue-10));
 let tired=rv.createMountRideCourseV156(80,0);for(let i=0;i<120;i++)tired=rv.stepMountRideV156(tired,SPRINT,'kha_rha',100);
 assert(Math.abs(tired.speed-107*.35)<1e-9,'épuisé : au pas, sans sprint');
});

test('pendant la sortie : registre des montures gelé ; retour immédiat au sas sans circuit = aucun BOND',()=>{
 let s=act(recruited({bond:50}),{type:'mount',mountId:'kha_rha'}).save;
 const rideId=s.mountRidesV156.active.id;
 for(const cmd of [{type:'open-session',mountId:'kha_rha'},{type:'care',mountId:'kha_rha',expectedCost:1}])
  assert.equal(mt.actMountsV153(s,{...cmd,ownerCreatedAt:OWNER,expectedRevision:s.mountsV153.revision}).accepted,false);
 act(s,{type:'mount',mountId:'kha_rha'},false);
 const r=act(s,{type:'return',rideId});assert.equal(mount(r.save).bond,50);assert.equal(r.save.mountRidesV156.lastReport.result,'returned');
 assert.equal(r.save.mountRidesV156.lastReport.sessionId,null);
});

test('retour réussi : BOND +4, séance S-unique, fatigue reportée, rejouer refusé',()=>{
 let s=act(recruited({bond:50}),{type:'mount',mountId:'kha_rha'}).save;
 const rideId=s.mountRidesV156.active.id,sessionsBefore=mount(s).sessions,nextSession=s.mountsV153.nextSessionId;
 s=rideTo(s,rv.mountRidePassedV156);
 const fatigue=s.mountRidesV156.active.course.fatigue;
 const done=act(s,{type:'return',rideId});s=done.save;
 assert.equal(mount(s).bond,54);assert.equal(mount(s).sessions,sessionsBefore+1);
 assert.equal(mount(s).fatigue,Math.ceil(fatigue));assert.equal(mount(s).injury,0);
 assert.deepEqual(s.mountsV153.lastSession,{id:`S${nextSession}`,mountId:'kha_rha',gain:4,outcome:'closed'});
 assert(s.mountsV153.consumedEventIds.includes(`ride-r${rideId}`));
 assert.equal(s.mountRidesV156.lastReport.result,'passed');assert.equal(s.mountRidesV156.lastReport.sessionId,`S${nextSession}`);
 // Rejouer le même retour : refusé, aucun BOND de plus.
 act(s,{type:'return',rideId},false);
 act({...s,mountRidesV156:done.save.mountRidesV156},{type:'return',rideId,expectedRevision:s.mountRidesV156.revision-1},false);
 // Plafond : BOND 98 → +2 ; BOND 100 → +0.
 for(const [bond,gain] of [[98,2],[100,0]]){
  let t=act(recruited({bond}),{type:'mount',mountId:'kha_rha'}).save;const id=t.mountRidesV156.active.id;t=rideTo(t,rv.mountRidePassedV156);
  t=act(t,{type:'return',rideId:id}).save;assert.equal(mount(t).bond,bond+gain);assert(t.mountsV153.lastSession.gain<=5);
 }
 // Deux sorties successives : deux séances distinctes, chacune comptée une fois.
 let u=act(s,{type:'mount',mountId:'kha_rha'}).save;const second=u.mountRidesV156.active.id;assert.notEqual(second,rideId);
 u=rideTo(u,rv.mountRidePassedV156);u=act(u,{type:'return',rideId:second}).save;
 assert.equal(mount(u).bond,58);assert.notEqual(u.mountsV153.lastSession.id,s.mountsV153.lastSession.id);
 // Retour incomplet ou pied à terre : aucun BOND, fatigue conservée.
 let v=act(recruited(),{type:'mount',mountId:'kha_rha'}).save;const vid=v.mountRidesV156.active.id;
 v=rideTo(v,c=>c.checkpoint>=1);const vf=v.mountRidesV156.active.course.fatigue;
 act(v,{type:'return',rideId:vid},false);
 v=act(v,{type:'dismount',rideId:vid}).save;assert.equal(mount(v).bond,50);assert.equal(mount(v).fatigue,Math.ceil(vf));
 assert.equal(v.mountRidesV156.lastReport.result,'recovered');assert.equal(v.mountRidesV156.lastReport.bondGain,0);assert.equal(v.profile.clanMarks,10000,'aucun frais');
});

test('choc : blessure biologique ; soins (pas réparation) ; arrêt au seuil',()=>{
 // Sous l'atelier central, cap au nord : un choc. Blessure = |v| × 0,12 × (1 − résistance du catalogue) (formule des engins, proposé).
 const resistance=qa.load('app/game/systems/mobility/catalogue.ts').mobilityStats('kha_rha').collisionResistance;
 assert(Math.abs(resistance-.175)<1e-12);
 let c={...rv.createMountRideCourseV156(0,0),x:500,y:470,heading:-Math.PI/2},prev=c;
 for(let i=0;i<240&&c.impacts===0;i++){prev=c;c=rv.stepMountRideV156(c,GO,'kha_rha',50);}
 assert.equal(c.impacts,1);
 const v=Math.min(107,prev.speed+(25+8*8)/60);
 assert(Math.abs(c.injury-v*.12*(1-resistance))<1e-9,`${c.injury} vs ${v}`);
 // Au seuil de 50 : l'animal s'arrête.
 let hurt=rv.createMountRideCourseV156(0,50);for(let i=0;i<60;i++)hurt=rv.stepMountRideV156(hurt,GO,'kha_rha',50);
 assert.equal(hurt.speed,0);assert(rv.mountRideHaltedV156(hurt));
 // Transaction : demi-tour depuis le sas puis course droit dans le bord gauche de l'aire.
 let s=act(recruited(),{type:'mount',mountId:'kha_rha'}).save;const id=s.mountRidesV156.active.id;
 // Pivot sur place jusqu'au cap ouest, puis galop droit dans le bord gauche.
 let p=s.mountRidesV156.active.course;const turn=[];
 while(Math.abs(p.heading)<3.1){turn.push({...IDLE,steer:-1});p=rv.stepMountRideV156(p,turn.at(-1),'kha_rha',50);}
 for(let i=0;i<turn.length;i+=60)s=act(s,{type:'ride',rideId:id,inputs:turn.slice(i,i+60)}).save;
 for(let k=0;k<6&&s.mountRidesV156.active.course.impacts===0;k++)s=act(s,{type:'ride',rideId:id,inputs:Array(60).fill(GO)}).save;
 const crs=s.mountRidesV156.active.course;assert(crs.impacts>=1,'choc contre le bord');assert(crs.injury>0);
 s=act(s,{type:'dismount',rideId:id}).save;assert.equal(mount(s).injury,Math.ceil(crs.injury));
 const cost=mt.mountCareQuoteV153(s.mountsV153,'kha_rha');assert(cost>0);
 s.mobilityV1=m.createMobilityLedger(OWNER);
 assert.equal(m.actMobility(s,{type:'repair',modelId:'kha_rha',expectedCost:cost,ownerCreatedAt:OWNER,expectedRevision:0}).accepted,false);
 s=actM(s,{type:'care',mountId:'kha_rha',expectedCost:cost});assert.equal(mount(s).injury,0);assert.equal(mount(s).bond,50,'aucun BOND gratuit');
});

test('peur : l’aire réelle n’a pas de feu ; zone de feu de test → panique sous BOND 25 seulement',()=>{
 assert.deepEqual(rv.MOUNT_RIDE_YARD_V156.hazards,[]);
 const fire={id:'test-fire',label:'Aire de test',hazards:[{id:'brasier-test',condition:'fire',x:300,y:450,w:60,h:80}]};
 const go=(bond)=>{let c=rv.createMountRideCourseV156(0,0);for(let i=0;i<180;i++)c=rv.stepMountRideV156(c,GO,'kha_rha',bond,fire);return c;};
 const low=go(24),high=go(60);
 assert.equal(low.panicked,true);assert.equal(low.injury,10);assert.equal(low.speed,0);assert(rv.mountRideHaltedV156(low));
 assert.equal(high.panicked,false);assert.equal(high.injury,0);assert(high.x>360);
 const toxic={...fire,hazards:[{...fire.hazards[0],condition:'toxic'}]};
 let t=rv.createMountRideCourseV156(0,0);for(let i=0;i<180;i++)t=rv.stepMountRideV156(t,GO,'kha_rha',100,toxic);
 assert(t.x<300);assert.equal(t.injury,0);assert(t.hazardsMet>=1,'refus d’entrer en milieu toxique');
});

test('sauvegarde : aller-retour, ancienne sauvegarde intacte, état falsifié refusé',()=>{
 let s=act(recruited(),{type:'mount',mountId:'kha_rha'}).save;
 s=act(s,{type:'ride',rideId:1,inputs:Array(30).fill(GO)}).save;
 s.mobilityV1=m.createMobilityLedger(OWNER);
 const db=store(),w=saves.writeSaveWithStatus(s,db);assert(w.persisted,w.failure);
 const loaded=saves.loadSaveWithStatus(db);assert(!loaded.failure,loaded.failure);
 assert.deepEqual(loaded.save.mountRidesV156,s.mountRidesV156);assert.deepEqual(loaded.save.mountsV153,s.mountsV153);
 assert.deepEqual(loaded.save.mobilityV1,s.mobilityV1);
 const portable=saves.parseSaveImport(saves.exportSave(w.save));assert.deepEqual(portable.save.mountRidesV156,s.mountRidesV156);
 // Ancienne sauvegarde (#151) : pas de champ ajouté.
 const legacy=recruited();const ldb=store(),lw=saves.writeSaveWithStatus(legacy,ldb);assert(lw.persisted);
 const raw=JSON.parse(saves.exportSave(lw.save));assert.equal(Object.hasOwn(raw.save,'mountRidesV156'),false);
 const re=saves.parseSaveImport(JSON.stringify(raw));assert(re.save,re.failure);assert.deepEqual(re.save.mountsV153,legacy.mountsV153);
 for(const [mutate,failure] of [
  [v=>v.mountRidesV156.version=2,'future-version'],
  [v=>v.mountRidesV156.extra=1,'invalid-save'],
  [v=>v.mountsV153.mounts[0].fatigue=1,'invalid-save'],// registre modifié pendant la sortie
  [v=>v.mountRidesV156.active.course.fatigue=-1,'invalid-save'],
  [v=>v.mountRidesV156.active.mountId='war_kha_rha','invalid-save'],
  [v=>v.mountRidesV156.active.bond=49,'invalid-save'],
 ]){
  const bad=JSON.parse(saves.exportSave(w.save));mutate(bad.save);
  const r=saves.parseSaveImport(JSON.stringify(bad));assert.equal(r.save,null);assert.equal(r.failure,failure);
 }
});

test('machines inchangées : ledger et aire sans dépendance à la monture',()=>{
 for(const f of ['ledger.ts','course.ts','controller.ts','catalogue.ts'])assert(!fs.readFileSync(`app/game/systems/mobility/${f}`,'utf8').includes('mountRidingV156'),f);
 assert(!fs.readFileSync('app/game/MobilityDrivingYard.tsx','utf8').includes('mountRidingV156'));
 // Une course machine donne le même état avec ou sans registre de chevauchées dans la campagne.
 const base=seed();base.mobilityV1=m.createMobilityLedger(OWNER);
 const withRides=recruited();withRides.mobilityV1=m.createMobilityLedger(OWNER);withRides.mountRidesV156=rv.createMountRidesV156(OWNER);
 const a=m.actMobility(base,{type:'start',modelId:'scout_grav_sled',loaned:true,ownerCreatedAt:OWNER,expectedRevision:0});
 const b=m.actMobility(withRides,{type:'start',modelId:'scout_grav_sled',loaned:true,ownerCreatedAt:OWNER,expectedRevision:0});
 assert.deepEqual(a.state,b.state);
 let c1=course.createMobilityCourse(),c2=course.createMobilityCourse();for(let i=0;i<300;i++){c1=course.stepMobilityCourse(c1,GO,'scout_grav_sled',{drive:0,armor:0,cargo:0,cooling:0});c2=course.stepMobilityCourse(c2,GO,'scout_grav_sled',{drive:0,armor:0,cargo:0,cooling:0});}
 assert.deepEqual(c1,c2);
 const client=fs.readFileSync('app/game/GameClient.tsx','utf8');
 assert(client.includes('persistSocialProgress(result.mounts?{mountRidesV156:result.rides,mountsV153:result.mounts}:{mountRidesV156:result.rides})'));
 assert(client.includes('if(current.mountRidesV156?.active) return refused('));
});

test('interface SSR : bouton Monter, refus affiché, aire montée en pause avec silhouette provisoire',()=>{
 const props=(save)=>({save,mountId:'kha_rha',allowed:true,onCommand:()=>({accepted:false,message:'',state:null}),onRideCommand:()=>({accepted:false,message:'',state:null}),onMessage:()=>{}});
 const ready=qa.render('app/game/MobilityMountsV153.tsx',props(recruited()));
 assert(ready.includes('Monter · aire des convois'));assert(ready.includes('data-mount-ride-start="ready"'));assert(ready.includes('proposé'));
 const tired=qa.render('app/game/MobilityMountsV153.tsx',props(recruited({fatigue:80})));
 assert(tired.includes('data-mount-ride-start="refused"'));assert(tired.includes('Épuisé'));
 const young=qa.render('app/game/MobilityMountsV153.tsx',props(recruited({bond:10})));assert(young.includes('BOND 50 requis'));
 const riding=act(recruited(),{type:'mount',mountId:'kha_rha'}).save;
 const html=qa.render('app/game/MobilityGarage.tsx',{save:riding,onCommand:()=>{throw Error('SSR');},onMountCommand:()=>{throw Error('SSR');},onRideCommand:()=>{throw Error('SSR');},onClose:()=>{}});
 assert(html.includes('data-mount-ride-yard'));assert(html.includes('EN PAUSE'));assert(html.includes('data-mount-silhouette="provisoire"'));
 assert(html.includes('aucun feu'));assert.equal((html.match(/data-mobility-npc=/g)||[]).length,2);assert(!html.includes('data-mobility-yard'));
});

test('adoption, progression réelle du lien, monte et reprise sans modifier le registre', () => {
 const cost = mt.KHA_RHA_ADOPTION_MARKS_V153;
 let save = actM(seed(), {type:'begin-trial', mountId:'kha_rha'});
 for (const [exerciseId,optionId] of Object.entries(GOOD)) {
  save = actM(save, {type:'trust-exercise', trialId:TRIAL, exerciseId, optionId, eventId:eid()});
 }
 save = actM(save, {type:'adopt', mountId:'kha_rha', trialId:TRIAL, expectedCost:cost});
 assert.equal(save.profile.clanMarks, 10000 - cost);
 act(save, {type:'mount', mountId:'kha_rha'}, false);
 for (let i=0; i<10; i++) {
  save = actM(save, {type:'open-session', mountId:'kha_rha'});
  const sessionId = save.mountsV153.session.id;
  for (let j=0; j<3; j++) {
   save = actM(save, {type:'exercise', sessionId, exerciseId:'groundwork', condition:'calm', eventId:eid()});
  }
  save = actM(save, {type:'close-session', sessionId});
  const care = mt.mountCareQuoteV153(save.mountsV153, 'kha_rha');
  save = actM(save, {type:'care', mountId:'kha_rha', expectedCost:care});
 }
 assert.equal(mount(save).bond, rv.MOUNT_RIDE_MIN_BOND_V156);
 save = act(save, {type:'mount', mountId:'kha_rha'}).save;
 const rideId = save.mountRidesV156.active.id;
 save = act(save, {type:'ride', rideId, inputs:Array.from({length:60}, () => GO)}).save;
 const first = save.mountRidesV156.active.course;
 assert(first.distance > 0);
 const resumed = saves.parseSaveImport(saves.exportSave(save));
 assert.equal(resumed.failure, null);
 assert.deepEqual(resumed.save.mountRidesV156.active.course, first);
 assert.equal(mount(resumed.save).proof.adoptionMarks, cost);
 save = act(resumed.save, {type:'ride', rideId, inputs:Array.from({length:60}, () => GO)}).save;
 assert(save.mountRidesV156.active.course.distance > first.distance);
 save = act(save, {type:'dismount', rideId}).save;
 assert.equal(save.mountRidesV156.active, null);
 assert.equal(save.mountRidesV156.lastReport.result, 'recovered');
 assert.equal(save.mountRidesV156.lastReport.bondGain, 0);
 assert.equal(mount(save).proof.adoptionMarks, cost);
});
