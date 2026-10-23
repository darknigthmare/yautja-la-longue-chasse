#!/usr/bin/env node
/** Current V106 follow-up; previous releases are immutable evidence, not a
 * command to run their generators against this newer application. */
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {verifySourceScopeV105,verifyFrozenInputsV105} from './build-excel-followup-v105.mjs';
import {collectRuntimeInputsV106} from './collect-v106-runtime-inputs.mjs';

export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const REGISTRY='docs/v106-workstreams-source.json';
export const OUTPUTS=['v106-workstreams.json','YAUTJA_V106_SUIVI.xlsx','v106-excel-followup-qa.json'];
const WRITER='scripts/build-excel-followup-v106.py';
const BASELINE_SHA='b0a317b339736d44bcf5b7dc11708749091740e2d9636e67beaa7751118f10bc';
const HISTORICAL_SHA='dca6f60fd822c8deddd7178006b2771d747a2e0cd654e697e691e90f5923048d';
const CLANS_SHA='1a889f3a61078d8fb377326f383d0a34a25f11523e89a93c485e1b7cec720f0d';
const PLAN='app/game/data/pitWorkbookAnimationPlanV100.json',SCOPE='app/game/data/pitWorkbookScopeV105.json';
const SCOPES={'PIT-V106-ENTITIES-MOTIONS':'FIVE_SOURCE_ACTIONS_SUPERS_AND_RELATIVE_MOTIONS','HOMEWORLD-V106-ARCHIVE':'ROLE03_OPTION_B_PHYSICAL_SEPARATION','CLANS-V106-ASSAULT':'DATED_INTEL_AND_REAL_ASSAULT_RESERVATION'};
const CANDIDATES=['M_F003_S3','M_F003_SUPER','M_F006_S1','M_F006_S2','M_F006_SUPER'];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const read=relative=>fs.readFile(path.join(ROOT,relative));
const json=async relative=>JSON.parse(await read(relative));
const local=relative=>typeof relative==='string'&&!path.isAbsolute(relative)&&!relative.includes('\\')&&relative.split('/').every(part=>part&&part!=='.'&&part!=='..');
const fingerprint=files=>Promise.all([...new Set(files)].sort().map(async file=>{assert.ok(local(file),'Local input required');const bytes=await read(file);return {path:file,sha256:sha(bytes),bytes:bytes.length};}));
const proofShape=proof=>{assert.ok(local(proof.path)&&proof.path.startsWith('docs/')&&!proof.path.includes('/tests/'),'Portable final proof required');assert.match(proof.sha256??'',/^[a-f0-9]{64}$/,'Final proof SHA required');};

async function python(payload,mode=''){
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'yautja-excel-v106-'));
 try{
  if(payload.workbook){await fs.writeFile(path.join(directory,'verify.xlsx'),payload.workbook);payload={...payload,workbook:undefined,workbookPath:path.join(directory,'verify.xlsx')};}
  const request=path.join(directory,'request.json');await fs.writeFile(request,JSON.stringify(payload));
  return execFileSync('python3',[path.join(ROOT,WRITER),...(mode?[mode]:[]),'--request',request],{stdio:['ignore','pipe','pipe'],timeout:30000,maxBuffer:40*1024*1024});
 }finally{await fs.rm(directory,{recursive:true,force:true});}
}
export const writeWorkbookV106=(baseline,sheets)=>python({root:ROOT,baseline,sheets});
export const verifyWorkbookV106=async(workbook,baseline)=>JSON.parse(await python({root:ROOT,baseline,workbook},'--verify'));

export function verifyRegistryV106(registry){
 assert.equal(registry.schemaVersion,1);assert.equal(registry.release,'V106');assert.match(registry.asOf,/^\d{4}-\d{2}-\d{2}$/);
 assert.deepEqual(registry.baseline,{path:'docs/YAUTJA_V105_SUIVI.xlsx',sha256:BASELINE_SHA},'Pinned V105 baseline required');
 assert.ok(['PENDING_RUNTIME_FREEZE','FROZEN'].includes(registry.baselineFreeze),'Explicit runtime freeze required');
 assert.deepEqual(registry.workstreams.map(item=>item.id).sort(),Object.keys(SCOPES).sort(),'Three bounded V106 workstreams required');
 for(const item of registry.workstreams){
  assert.ok(['EN_COURS','A_VALIDER','OUVERT','LIVRE_PARTIEL','VALIDE_CIBLE'].includes(item.status),'Unbounded delivery status rejected');
  assert.equal(item.validationScope,SCOPES[item.id],'Explicit limited scope required');
  assert.ok(item.source&&item.runtime&&item.remaining&&item.implementation?.length&&item.implementation.every(local)&&Array.isArray(item.proof),'Incomplete workstream');
  if(item.status==='VALIDE_CIBLE'){
   assert.equal(registry.baselineFreeze,'FROZEN','Freeze runtime before promotion');
   assert.ok(item.tests?.startsWith('PASS')&&item.browser?.startsWith('PASS_CIBLE_PRODUCTION'),'Executed tests and production browser proof required');
   assert.ok(item.proof.length>=2,'Global and domain proof required');item.proof.forEach(proofShape);
   assert.ok(item.proof.some(proof=>proof.path==='docs/v106-validation-summary.json'),'Global production proof required');
  }
 }
 if(registry.workstreams.some(item=>item.status==='VALIDE_CIBLE'))assert.ok(registry.workstreams.every(item=>item.status==='VALIDE_CIBLE'),'All three production recipes are required before V106 promotion');
 if(registry.baselineFreeze==='FROZEN'){
  assert.equal(registry.runtimeFreeze?.path,'docs/v106-runtime-freeze.json','Portable production freeze required');proofShape(registry.runtimeFreeze);
 }
 assert.ok(Array.isArray(registry.runtimeModules)&&Array.isArray(registry.validations)&&Array.isArray(registry.limits));
 for(const item of registry.runtimeModules){assert.ok(local(item.path)&&/^app\/.+\.(ts|tsx)$/.test(item.path),'Runtime module required');assert.match(item.id,/^[A-Za-z][A-Za-z0-9]*$/);}
 assert.equal(new Set(registry.runtimeModules.map(item=>item.id)).size,registry.runtimeModules.length,'Duplicate runtime module');
 for(const item of registry.validations){
  assert.ok(item.id&&item.scope&&item.limit&&item.command&&item.evidence?.length,'Validation command/scope/evidence required');
  if(item.status?.startsWith('PASS'))item.evidence.forEach(proofShape);
 }
}

export function verifyArchiveSourceV106(option,source,corpusBytes){
 assert.equal(source.sourceCorpusSha256,sha(corpusBytes),'V6 corpus changed');
 const corpus=JSON.parse(corpusBytes);assert.deepEqual(source.source,corpus.source,'V6 source provenance changed');
 assert.equal(source.sceneId,'D6-W-PNJ-ROLE-03');
 const expected={'Scènes de dialogue V6':[383],'Répliques V6':[3183,3184,3185,3186,3187,3188,3189,3190],'Choix et actions V6':[788,789]};
 assert.deepEqual(source.sheets.map(sheet=>sheet.name),Object.keys(expected),'Archive sheet subset changed');
 for(const sheet of source.sheets){
  assert.deepEqual(sheet.rows.map(row=>row.number),expected[sheet.name],'Archive row subset changed');
  const original=corpus.sheets.find(item=>item.name===sheet.name);assert.ok(original);
  for(const row of sheet.rows)assert.deepEqual(row,original.rows.find(item=>item.number===row.number),'Archive source cells changed');
 }
 const row=source.sheets.find(sheet=>sheet.name==='Choix et actions V6').rows.find(row=>row.number===789);
 assert.equal(row.cells.find(cell=>cell.address==='C789').value,'B');assert.equal(option.address,'Choix et actions V6!A789:I789');
 for(const [key,column]of [['action','F'],['conditions','G']])assert.equal(option[key],row.cells.find(cell=>cell.address===column+'789').value,'Archive option B text changed');
 return {id:'ARCHIVE-OPTION-B',option:'B',source:'Scènes de dialogue V6!A383:Q383 · Choix et actions V6!A789:I789 · Répliques V6!A3189:K3190 · succès A3184:K3184'};
}

export function verifyAssaultSourceV106(contract,corpus){
 assert.equal(contract.workbook,corpus.sourceWorkbook);assert.equal(contract.sha256,corpus.sha256,'V3 provenance changed');
 const expected=[['CON-R09',14],['CON-R12',17],['CON-R14',19]];
 assert.equal(contract.sheet,'Règles de conquête');assert.deepEqual(contract.sources,expected.map(([id,n])=>({id,cells:`C${n}:H${n}`})),'Assault source cells changed');
 return expected.map(([id,n])=>{
  const row=corpus.sheets.find(sheet=>sheet.name===contract.sheet).rows.find(row=>row.row===n);assert.equal(row.cells.A.value,id,'Assault source identity changed');
  return {id,source:`${contract.sheet}!C${n}:H${n}`,status:'SOURCE_CONSERVEE',runtime:[...'CDEFGH'].map(column=>`${row.cells[column].address} : ${row.cells[column].value}`).join('\n'),remaining:'Texte source exact ; adaptation du front libre et six ouvrages physiques séparés.'};
 });
}

const compile=registry=>build({stdin:{contents:`export {getPitWorkbookNativeV100} from './app/game/pitWorkbookAnimationV100';
export {validateHunterSpriteAtlas} from './app/game/hunterSpriteAtlas';
${registry.runtimeModules.map(item=>`import * as ${item.id} from ${JSON.stringify('./'+item.path)}; export {${item.id}};`).join('\n')}`,resolveDir:ROOT},absWorkingDir:ROOT,bundle:true,write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});

export function runtimeFactsV106(api){
 const bindings=api.pitBindings,combat=api.pitCombatV106,engine=api.pitEngine,source=api.pitSourceV106,motion=api.pitMotionV106;
 assert.equal(combat.PIT_WORKBOOK_COMBAT_RECIPE_V106,'workbook-v106');assert.equal(combat.PIT_WORKBOOK_COMBAT_STATE_VERSION_V106,14);
 assert.equal(bindings.PIT_WORKBOOK_BODY_MOVES_V106.length,12);assert.equal(bindings.PIT_WORKBOOK_BODY_PRESENTATIONS_V106.length,10);
 const moves=bindings.PIT_WORKBOOK_ADDITIONAL_MOVES_V106;assert.deepEqual(moves.map(item=>item.actionId).sort(),CANDIDATES);
 const additional=moves.map(move=>{
  assert.deepEqual(combat.getPitWorkbookCombatMoveV106(move.fighterId,move.key),move,'Combat and native target diverged');
  const provenance=[...source.PIT_WORKBOOK_ENTITY_SOURCES_V106,...api.pitSuperSourceV106.PIT_WORKBOOK_SUPER_SOURCES_V106].find(item=>item.actionId===move.actionId);assert.ok(provenance);
  for(const key of ['startup','active','recovery','damage','costPercent'])assert.equal(move[key],provenance.sourceTargets[key],'Entity source target changed');
  const native=api.getPitWorkbookNativeV100(move.fighterId,move.actionId);assert.ok(native,'Historical native admission required');
  const definition=bindings.PIT_WORKBOOK_ADDITIONAL_REGISTRY_V106.find(item=>item.fighterId===move.fighterId&&item.atlas.id===provenance.atlasId+'-action-v106');
  assert.ok(definition&&api.validateHunterSpriteAtlas(definition.atlas).valid&&!definition.variantId,'Valid native V106 definition required');
  assert.equal(definition.atlas.clips.length,move.key==='SUPER'?8:6);
  const frameKey=f=>JSON.stringify([f.pageId,f.rect,f.pivot]);
  for(const clip of definition.atlas.clips){
   assert.equal(clip.status,'validated');assert.equal(clip.loop,false);
   const phase=clip.id.slice(`pit.stand.workbook-v106.${move.key}.`.length);assert.ok((move.key==='SUPER'?['startup','active','recovery','recovery.confirmed']:['startup','active','recovery']).includes(phase));
   assert.equal(clip.frames.reduce((sum,f)=>sum+f.durationTicks*60/clip.ticksPerSecond,0),move[phase.startsWith('recovery')?'recovery':phase],'Source phase timing changed');
   for(const frame of clip.frames)assert.ok(native.definition.atlas.clips.some(original=>original.facing===clip.facing&&original.frames.some(f=>frameKey(f)===frameKey(frame))),'Native rectangle/pivot transformed');
  }
  for(const page of definition.atlas.pages)assert.deepEqual(page,native.definition.atlas.pages.find(original=>original.id===page.id),'Native page transformed');
  const state=engine.createPitCombatState(move.fighterId,move.fighterId==='scar'?'feral-hunter':'scar',{normalMoves:'workbook-v106'});state.fighters[0].traque=engine.PIT_MAX_TRAQUE;
  const input={workbookAction:move.key==='SUPER'?'super':move.key==='S2'?'shield':'projectile'},stepped=engine.stepPitCombat(state,[input,{}]);
  assert.equal(stepped.version,14);assert.equal(stepped.fighters[0].action?.workbookMove,move.key,'New command is not executable');
  return {...move,runtimeInput:input,provenance,runtimeDefinition:definition};
 });
 const versions=Object.fromEntries([['legacy',undefined],['v104','workbook-v104'],['v105','workbook-v105'],['v106','workbook-v106']].map(([id,normalMoves])=>[id,engine.createPitCombatState('feral-hunter','scar',normalMoves?{normalMoves}:undefined).version]));
 assert.deepEqual(versions,{legacy:11,v104:12,v105:13,v106:14});
 assert.equal(motion.PIT_WORKBOOK_MOTION_WINDOW_V106,24);assert.equal(motion.PIT_WORKBOOK_MOTION_BUTTON_WINDOW_V106,6);
 const patterns={'236236':[2,3,6,2,3,6],'236':[2,3,6],'623':[6,2,3],'214':[2,1,4],'22':[2,5,2]};
 for(const facing of [1,-1])for(const [name,pattern]of Object.entries(patterns)){
  let history=motion.freshPitWorkbookMotionV106(facing);
  pattern.forEach((direction,frame)=>{const horizontal=direction===1||direction===4?-1:direction===3||direction===6?1:0;history=motion.samplePitWorkbookMotionV106(history,{down:[1,2,3].includes(direction),left:horizontal*facing<0,right:horizontal*facing>0},facing,frame,true);});
  assert.equal(motion.resolvePitWorkbookMotionV106(history,pattern.length-1),name,'Relative motion not recognized');
 }
 const mappings=[['feral-hunter','236','S1'],['feral-hunter','214','S2'],['feral-hunter','623','S3'],['feral-hunter','236236','SUPER'],['scar','236','S1'],['scar','623','S3'],['scar','22','S4'],['scar','236236','SUPER']];
 const motions=mappings.map(([fighterId,notation,key])=>{
  const move=combat.getPitWorkbookCombatMoveV106(fighterId,key);assert.ok(move&&move.command===notation+'+S','Source notation changed');
  for(const facing of [1,-1]){
   let state=engine.createPitCombatState(fighterId,fighterId==='scar'?'feral-hunter':'scar',{mode:'training',normalMoves:'workbook-v106'});
   Object.assign(state.fighters[0],{x:facing===1?200:900,facing,traque:engine.PIT_MAX_TRAQUE});Object.assign(state.fighters[1],{x:facing===1?850:250,facing:-facing});
   const directions=patterns[notation];
   directions.forEach((direction,index)=>{
    const horizontal=direction===1||direction===4?-facing:direction===3||direction===6?facing:0;
    state=engine.stepPitCombat(state,[{down:direction<=3,left:horizontal===-1,right:horizontal===1,...(index===directions.length-1?{attack:'technique'}:{})},{}]);
   });
   assert.equal(state.fighters[0].action?.workbookMove,key,'Real directional motion not bound: '+fighterId+'/'+notation+'/'+facing);
  }
  return {fighterId,notation,key,source:`${move.sheet}!${move.cell}`,sourceCommand:move.command,windowTicks:24,buttonWindowTicks:6,runtime:'Directions relatives au regard puis S frais, sondées dans le moteur aux deux sens ; double236 prioritaire sur236.',remaining:'Notation conservée ; collisions, portée et stuns restent des adaptations du moteur.'};
 });
 return {additional,versions,motions};
}

export async function collectFollowupV106(registry=undefined){
 registry??=await json(REGISTRY);verifyRegistryV106(registry);
 assert.equal(sha(await read(registry.baseline.path)),BASELINE_SHA,'V105 workbook changed');
 const historicalBytes=await read('docs/v105-workstreams.json');assert.equal(sha(historicalBytes),HISTORICAL_SHA,'V105 follow-up changed');const historical=JSON.parse(historicalBytes);
 const fixed=[REGISTRY,WRITER,'scripts/lib/excel_followup_append.py','scripts/build-excel-followup-v99.mjs','scripts/build-excel-followup-v100.py','scripts/build-excel-followup-v100.mjs','scripts/build-excel-followup-v105.mjs','scripts/build-excel-followup-v106.mjs','scripts/collect-v106-runtime-inputs.mjs',registry.baseline.path,'docs/v105-workstreams.json',PLAN,SCOPE,'docs/v56-excel-priorities.json','docs/war-clans-v3-workbook-source.json','public/game/dialogues/v85/bible-dialogues.json',...(registry.baselineFreeze==='FROZEN'?[registry.runtimeFreeze.path]:[]),...registry.workstreams.flatMap(item=>item.implementation)];
 const compiled=await compile(registry),imports=Object.keys(compiled.metafile.inputs).filter(file=>file!=='<stdin>'),guarded=[...fixed,...imports],before=await fingerprint(guarded);
 const api=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
 const plan=await json(PLAN),scope=await json(SCOPE),extractionBytes=await read(plan.source.extractionPath);verifySourceScopeV105(scope,plan,JSON.parse(extractionBytes),sha(extractionBytes));
 const runtime=runtimeFactsV106(api),inventory=await collectRuntimeInputsV106();
 const archiveSource=verifyArchiveSourceV106(api.homeworldArchive.HOMEWORLD_ARCHIVE_OPTION_V106,api.homeworldArchive.HOMEWORLD_ARCHIVE_SOURCE_V106,await read('public/game/dialogues/v85/bible-dialogues.json'));
 const archive=api.homeworldArchive.HOMEWORLD_ARCHIVE_V106;assert.equal(archive.supports.length,2);assert.equal(archive.cases.length,2);
 const clanBytes=await read('docs/war-clans-v3-workbook-source.json');assert.equal(sha(clanBytes),CLANS_SHA,'V3 pinned extraction changed');
 const clans=verifyAssaultSourceV106(api.clanAssault.WAR_ASSAULT_CONTRACT_V106,JSON.parse(clanBytes));
 const pit=registry.workstreams.find(item=>item.domain==='The Pit'),hw=registry.workstreams.find(item=>item.domain==='Homeworld'),war=registry.workstreams.find(item=>item.domain==='Guerre de clans');
 const promoted=pit.status==='VALIDE_CIBLE',actions=structuredClone(historical.actions),clips=[];
 for(const action of actions){
  const target=plan.fighters.find(item=>item.fighterId===action.fighterId).actions.find(item=>item.id===action.actionId);assert.ok(target);
  for(const key of ['sheet','cell','sourceText','key','category'])assert.equal(action[key],target[key],'Historical/source action changed');
  const candidate=runtime.additional.find(item=>item.actionId===action.actionId);
  action.bindingOrigin=candidate?'V106_CANDIDATE':'V105_IMMUTABLE_EVIDENCE';
  if(candidate){
   const {runtimeDefinition,provenance}=candidate;
   const numbers=/Préparation \/ actif \/ récupération : (\d+) \/ (\d+) \/ (\d+) images · dégâts (\d+) · coût (\d+) %/.exec(action.sourceText);assert.ok(numbers,'Exact source figures required');
   for(const [index,key]of ['startup','active','recovery','damage','costPercent'].entries())assert.equal(candidate[key],Number(numbers[index+1]),'Source figure changed: '+action.actionId+'/'+key);
   assert.equal(candidate.command,target.command,'Source command changed');assert.equal(provenance.sourceSheet,target.sheet);assert.equal(provenance.sourceCell,target.cell);
   const reuse=provenance.visualReuse??('SUPER sans partenaire peint ; phases 24/8/48 et dégâts 280 / coût 100 % conservés. Notation source 236236+S et commande accessible raccordées ; la double236 est prioritaire sur236. Continuation uniquement après contact réel non gardé ; caméra adaptée et retour vectoriel déclarés : '+JSON.stringify(provenance.mechanicalAdaptation));
   Object.assign(action,{command:promoted?'COMMANDE_V106_OPT_IN':'COMMANDE_V106_A_VALIDER',mechanics:promoted?(action.key==='SUPER'?'SUPER_CONTACT_CONFIRME_PARTIEL':action.key==='S2'?'BOUCLIER_FRONTAL_9_GARDE_9_BORD':'PROJECTILE_V106_PARTIEL'):'MECANIQUE_V106_A_VALIDER',runtimeRecipe:'workbook-v106',runtimeInput:candidate.runtimeInput,runtimeAtlasId:runtimeDefinition.atlas.id,runtimeClips:runtimeDefinition.atlas.clips.map(clip=>({id:clip.id,facing:clip.facing,frames:clip.frames.length,durationTicks60:clip.frames.reduce((n,f)=>n+f.durationTicks*60/clip.ticksPerSecond,0)})),remaining:reuse+' Les entités en vol restent un retour vectoriel adapté ; aucune nouvelle image indépendante ni kit complet certifié.'});
   for(const clip of runtimeDefinition.atlas.clips)clips.push({fighterId:action.fighterId,actionId:action.actionId,facing:clip.facing,phase:clip.id.slice(`pit.stand.workbook-v106.${candidate.key}.`.length),atlasId:runtimeDefinition.atlas.id,clipId:clip.id,frames:clip.frames.length,durationTicks60:clip.frames.reduce((n,f)=>n+f.durationTicks*60/clip.ticksPerSecond,0),status:promoted?'RACCORD_V106_VALIDE_CIBLE':'RACCORD_V106_A_VALIDER',visualReuse:reuse,pages:runtimeDefinition.atlas.pages.map(page=>({path:'public'+page.src,sha256:provenance.sourceHashes[page.src]}))});
  }
 }
 assert.equal(actions.length,52);assert.equal(clips.length,34);
 const declared=actions.filter(action=>api.pitBindings.getPitWorkbookRuntimeBindingV106(action.fighterId,action.actionId)).length;assert.equal(declared,40);
 const assetMap=new Map(historical.assets.map(item=>[item.path,item]));for(const item of inventory.assets){if(assetMap.has(item.path))assert.equal(assetMap.get(item.path).sha256,item.sha256,'Historical/native asset disagreement');assetMap.set(item.path,item);}
 const assets=[...assetMap.values()].sort((a,b)=>a.path.localeCompare(b.path));
 for(const asset of assets)assert.equal(sha(await read(asset.path)),asset.sha256,'Admitted native/public input changed: '+asset.path);
 const proofs=[...registry.workstreams.flatMap(item=>item.status==='VALIDE_CIBLE'?item.proof:[]),...registry.validations.flatMap(item=>item.status.startsWith('PASS')?item.evidence:[])];
 for(const proof of proofs)assert.equal(sha(await read(proof.path)),proof.sha256,'Final proof changed: '+proof.path);
 const inputs=await fingerprint([...guarded,...inventory.inputs.map(item=>item.path),...assets.map(item=>item.path),...proofs.map(item=>item.path)]);
 for(const asset of assets)assert.equal(inputs.find(input=>input.path===asset.path).sha256,asset.sha256,'Public input changed during collection: '+asset.path);
 let runtimeFrozenInputsVerified=0;if(registry.baselineFreeze==='FROZEN'){const bytes=await read(registry.runtimeFreeze.path);assert.equal(sha(bytes),registry.runtimeFreeze.sha256,'Production freeze changed');runtimeFrozenInputsVerified=verifyFrozenInputsV105(inputs,JSON.parse(bytes));}
 assert.deepEqual(await fingerprint(guarded),before,'Inputs changed during collection; rerun after stabilization');
 const openItems=historical.openItems.filter(item=>!promoted||!CANDIDATES.includes(item.id));
 if(hw.status!=='VALIDE_CIBLE')openItems.push({id:archiveSource.id,domain:'Homeworld',source:archiveSource.source,status:hw.status,remaining:hw.remaining});
 const exclusions=inventory.assets.filter(item=>item.provenance?.admission==='LEGACY_V11_EXCLUSION_ONLY');assert.equal(exclusions.length,2);
 const facts={...historical.facts,historicalSourceRuntimeBindings:35,sourceBindingsDeclared:declared,sourceRuntimeBindings:promoted?declared:35,sourceActionsRemaining:promoted?12:17,newRuntimeMoves:5,newRuntimeMoveClips:34,allSourceRuntimeMoves:30,newRuntimePresentations:0,allSourcePresentations:10,newRuntimePresentationClips:0,allSourceMoveClips:72,newNativeDrawings:0,motionPatterns:5,motionBindings:8,archiveContainers:2,archiveSupports:2,publicInputsForNewConnections:inventory.assets.length-exclusions.length,publicInputsForValidation:inventory.assets.length,historicalAppearanceExclusionInputs:exclusions.length,nativePages:historical.facts.nativePages,publicAssetsVerified:assets.length};
 assert.equal(facts.campaignStages,16);assert.equal(facts.variantConstraints,14);assert.equal(facts.openWarStructures,6);assert.equal(new Set(openItems.map(item=>item.id)).size,openItems.length,'Duplicate open item');
 return {schemaVersion:1,release:'V106',asOf:registry.asOf,baseline:registry.baseline,baselineFreeze:registry.baselineFreeze,runtimeFreeze:registry.runtimeFreeze,runtimeFrozenInputsVerified,method:'Source cells verified against pinned extractions; five real source commands and eight relative-motion bindings probed in both facings. Inherited V105 evidence remains frozen. This generator runs no production browser recipe.',facts,pitVersions:runtime.versions,delivery:{characters:'OUVERT',completeKits:'OUVERT',nativeEntitySprites:'OUVERT',entities:'OUVERT',campaigns:'OUVERT',variantAnimations:'OUVERT',canonicalFidelity:'NON_CERTIFIE'},workstreams:registry.workstreams,actions,clips,motions:runtime.motions,campaignStages:historical.campaignStages,variantConstraints:historical.variantConstraints,homeworld:[{...archiveSource,status:hw.status,runtime:JSON.stringify({definition:archive,option:api.homeworldArchive.HOMEWORLD_ARCHIVE_OPTION_V106}),remaining:hw.remaining}],clans:[...clans,{id:war.id,source:war.source,status:war.status,runtime:war.runtime,remaining:war.remaining}],openItems,assets,inputs,validations:registry.validations,limits:registry.limits};
}

const column=(key,label,width=30)=>({key,label,width});
const printable=value=>value===undefined||value===null?'':typeof value==='object'&&!(Object.keys(value).length===2&&'formula'in value&&'cached'in value)?JSON.stringify(value):value;
const sheet=(name,title,columns,rows)=>({name,title,subtitle:'Sources, héritage, raccords et preuves séparés · V106',columns,rows:rows.map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key,printable(value)])))});
export function buildSheetsV106(s){
 const metric=(label,value,scope,formula)=>({label,value:formula?{formula,cached:value}:value,scope});
 const summary=[metric('Actions source Feral + Scar',52,'26 actions par personnage.',`COUNTA('ActionsV106'!A5:A56)`),metric('Liaisons source historiquement validées',35,'V105 immuable ; le générateur ne revalide pas l’ancien runtime.'),metric('Liaisons source déclarées V106',40,'Cinq cibles nouvelles ; distinct des validations production.'),metric('Liaisons source validées',s.facts.sourceRuntimeBindings,'40/52 uniquement après les trois recettes production et le gel.'),metric('Actions source encore ouvertes',s.facts.sourceActionsRemaining,'17 avant validation V106 ; 12 après validation ciblée.'),metric('Clips de phases raccordés V106',34,'Découpages et réemploi de dessins existants.',`COUNTA('ClipsV106'!A5:A38)`),metric('Nouveaux dessins natifs',0,'Feral S1 réemploi V59 retimé ; Feral S2 et Scar S3 admissions V100.'),metric('Motions / liaisons',`${s.facts.motionPatterns}/${s.facts.motionBindings}`,'236,214,623,22,236236 ; directions relatives et S frais.'),metric('Étapes de campagne ouvertes',16,'Aucune campagne terminée déduite.'),metric('Contraintes de variantes ouvertes',14,'Aucune variante terminée déduite.'),metric('Ouvrages Clans ouverts',6,'Aucun ouvrage physique fermé.'),metric('Feuilles V105 conservées',49,s.baseline.path),...['EN_COURS','A_VALIDER','OUVERT','LIVRE_PARTIEL','VALIDE_CIBLE'].map(status=>metric(`Chantiers ${status}`,s.workstreams.filter(item=>item.status===status).length,'Trois preuves production et gel requis pour promotion.',`COUNTIF('ChantiersV106'!E5:E7,"${status}")`)),metric('Excel natif exécuté','NON','Vérification ZIP/XML et caches seulement.')];
 return [
  sheet('SyntheseV106','YAUTJA · suivi actif V106',[column('label','Indicateur',52),column('value','Valeur',26),column('scope','Portée / limite',120)],summary),
  sheet('ChantiersV106','Trois périmètres et leurs preuves',[column('id','ID',42),column('domain','Domaine'),column('title','Chantier',65),column('source','Source',100),column('status','Statut'),column('validationScope','Portée limitée',55),column('runtime','Implémentation',125),column('tests','Tests exécutés',110),column('browser','Navigateur exécuté',110),column('proof','Preuves et SHA',125),column('remaining','Reste ouvert',130),column('implementation','Fichiers',110)],s.workstreams),
  sheet('ActionsV106','52 actions · états indépendants',[column('fighterId','Personnage'),column('actionId','Action source',30),column('key','Clé',18),column('sheet','Feuille',28),column('cell','Cellule',16),column('category','Catégorie'),column('label','Libellé',48),column('bindingOrigin','Origine de la preuve',38),column('drawing','Dessin natif',32),column('animation','Cycle natif',40),column('sourceCommand','Commande source',50),column('command','État commande',40),column('mechanics','Mécanique',44),column('presentation','Présentation',42),column('bodyId','BODY source',30),column('entityIds','Entités source',60),column('nativeAtlasId','Atlas étude native',55),column('runtimeRecipe','Recette explicite',30),column('runtimeInput','Entrée adaptée',60),column('runtimeAtlasId','Atlas raccordé',60),column('runtimeClips','Phases raccordées',135),column('sourceText','Texte source exact',140),column('remaining','Reste / réemploi',140),column('sourceSha256','SHA classeur source',72)],s.actions),
  sheet('ClipsV106','34 phases · aucun nouveau dessin',[column('fighterId','Personnage'),column('actionId','Action source'),column('facing','Direction',18),column('phase','Phase',20),column('atlasId','Atlas',60),column('clipId','Clip',70),column('frames','Références images',25),column('durationTicks60','Durée 60 Hz',22),column('status','État raccord',40),column('visualReuse','Réemploi / limite',140),column('pages','Pages et SHA',130)],s.clips),
  sheet('MotionsV106','Notations source et directions relatives',[column('fighterId','Personnage'),column('notation','Motion',20),column('key','Action',20),column('source','Cellule source',45),column('sourceCommand','Notation source exacte',65),column('windowTicks','Fenêtre 60 Hz',25),column('buttonWindowTicks','Fenêtre S',25),column('runtime','Règle adaptée',115),column('remaining','Limite',115)],s.motions),
  sheet('HomeworldV106','Archiviste · option B physique',[column('id','ID',45),column('option','Option',18),column('source','Cellules source',105),column('status','État'),column('runtime','Règles livrées',130),column('remaining','Reste / limite',130)],s.homeworld),
  sheet('ClansV106','Assaut préparé · renseignement daté',[column('id','ID',45),column('source','Cellules source',105),column('status','État'),column('runtime','Règles livrées',135),column('remaining','Limite / ouvrages ouverts',130)],s.clans),
  sheet('ManquantsV106','Contraintes restant ouvertes',[column('id','ID',65),column('domain','Domaine',35),column('source','Cellules source',100),column('status','État'),column('remaining','Travail restant / texte exact',145)],s.openItems),
  sheet('SourcesV106','Entrées réellement lues et leurs SHA',[column('path','Fichier',115),column('sha256','SHA-256',72),column('bytes','Octets',22),column('scope','Portée',125)],s.inputs.map(item=>({...item,scope:s.assets.find(asset=>asset.path===item.path)?.scope??(item.path===s.baseline.path?'49 feuilles V105 immuables.':'Entrée lue/importée ; aucune validation de jeu impliquée.')}))),
  sheet('ValidationsV106','Recettes explicitement exécutées',[column('id','ID',45),column('status','État'),column('scope','Portée',115),column('command','Commande',120),column('evidence','Preuves et SHA',125),column('limit','Limite',125)],s.validations.length?s.validations:[{id:'V106-VALIDATION-PENDING',status:'A_VALIDER',scope:'Trois recettes production réelles et gel global attendus.',command:'À consigner après exécution réelle',evidence:'Aucune preuve finale déclarée',limit:'Le collecteur ne lance ni les tests métier ni les recettes navigateur.'}]),
  sheet('JournalV106','Méthode et limites',[column('subject','Sujet',45),column('detail','Décision / limite',145)],[{subject:'Méthode',detail:s.method},{subject:'Gel runtime',detail:s.baselineFreeze},{subject:'Registre',detail:REGISTRY},{subject:'Contrôle courant',detail:'node scripts/build-excel-followup-v106.mjs --check'},{subject:'Contrôle V105 historique',detail:'node scripts/check-excel-history-v106.mjs --check'},...s.limits.map((detail,index)=>({subject:`Limite ${index+1}`,detail}))]),
 ];
}
export async function generateFollowupV106({outputDir=path.join(ROOT,'docs'),check=false}={}){
 const snapshot=await collectFollowupV106(),workbook=await writeWorkbookV106(snapshot.baseline,buildSheetsV106(snapshot)),structural=await verifyWorkbookV106(workbook,snapshot.baseline);
 const qa={schemaVersion:1,release:'V106',result:'PASS_STRUCTURE',scope:'Cellules source exactes, 5 commandes et 8 liaisons de motions sondées aux deux sens, SHA des entrées, ZIP/XML, 49 feuilles conservées et caches. Aucun navigateur ou Excel natif exécuté par ce générateur.',workbook:'docs/YAUTJA_V106_SUIVI.xlsx',sha256:sha(workbook),bytes:workbook.length,inputFingerprintsVerified:snapshot.inputs.length,assetsVerified:snapshot.assets.length,facts:snapshot.facts,delivery:snapshot.delivery,...structural,nativeExcelApplicationVerified:false,nativeExcelCalculationEngineExecuted:false};
 const products=[Buffer.from(JSON.stringify(snapshot,null,2)+'\n'),workbook,Buffer.from(JSON.stringify(qa,null,2)+'\n')];
 if(!check)await fs.mkdir(outputDir,{recursive:true});
 for(const [index,name]of OUTPUTS.entries()){const target=path.join(outputDir,name);if(check)assert.ok((await fs.readFile(target)).equals(products[index]),`Suivi V106 périmé : ${name}`);else await fs.writeFile(target,products[index]);}
 return {snapshot,qa,workbookSha256:sha(workbook),bytes:workbook.length,outputDir};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const args=process.argv.slice(2),at=args.indexOf('--output-dir');assert.ok(args.every((arg,index)=>['--check','--output-dir'].includes(arg)||at>=0&&index===at+1)&&(at<0||args[at+1]),'Usage: node scripts/build-excel-followup-v106.mjs [--check] [--output-dir path]');
 const result=await generateFollowupV106({check:args.includes('--check'),...(at>=0?{outputDir:path.resolve(args[at+1])}:{})});console.log(JSON.stringify({result:'PASS_STRUCTURE',mode:args.includes('--check')?'check':'generate',sha256:result.workbookSha256,bytes:result.bytes,inputs:result.snapshot.inputs.length,facts:result.snapshot.facts}));
}
