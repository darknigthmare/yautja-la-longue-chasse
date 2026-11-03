#!/usr/bin/env node
/** Append-only V105 production follow-up. A source target, a BODY study, an
 * executable mechanic and an explicitly executed validation are separate facts. */
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {verifyPlanV100} from './build-excel-followup-v100.mjs';

export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const REGISTRY='docs/v105-workstreams-source.json';
export const OUTPUTS=['v105-workstreams.json','YAUTJA_V105_SUIVI.xlsx','v105-excel-followup-qa.json'];
const WRITER='scripts/build-excel-followup-v105.py';
const PLAN='app/game/data/pitWorkbookAnimationPlanV100.json';
const INVENTORY='app/game/data/pitWorkbookScopeV105.json';
const SCOPES={'PIT-V105-SOURCE-LINKS':'BODY_COMMAND_MECHANICS_PRESENTATION_TARGETS','HOMEWORLD-V105-HIGH-POINT':'OPTION_A_PHYSICAL_LOOKOUT','CLANS-V105-CONVOY-ROUTE':'MULTI_STEP_PHYSICAL_CONVOY_ROUTE'};
const PIN='ce78bac96ae57cbee732bc868acecd46b0dc57e5ade49f669fb15c8b12ea03aa';
const CLANS_EXTRACTION_PIN='1a889f3a61078d8fb377326f383d0a34a25f11523e89a93c485e1b7cec720f0d';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const read=relative=>fs.readFile(path.join(ROOT,relative));
const json=async relative=>JSON.parse(await read(relative));
const local=relative=>typeof relative==='string'&&!path.isAbsolute(relative)&&!relative.split(/[\\/]/).includes('..');
const fingerprint=files=>Promise.all([...new Set(files)].sort().map(async relative=>({path:relative,sha256:sha(await read(relative))})));

async function python(payload,mode=''){
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'yautja-excel-v105-'));
 try{
  if(payload.workbook){await fs.writeFile(path.join(directory,'verify.xlsx'),payload.workbook);payload={...payload,workbook:undefined,workbookPath:path.join(directory,'verify.xlsx')};}
  const request=path.join(directory,'request.json');await fs.writeFile(request,JSON.stringify(payload));
  return execFileSync('python3',[path.join(ROOT,WRITER),...(mode?[mode]:[]),'--request',request],{stdio:['ignore','pipe','pipe'],timeout:30000,maxBuffer:32*1024*1024});
 }finally{await fs.rm(directory,{recursive:true,force:true});}
}
export const writeWorkbookV105=(baseline,sheets)=>python({root:ROOT,baseline,sheets});
export const verifyWorkbookV105=async(workbook,baseline)=>JSON.parse(await python({root:ROOT,baseline,workbook},'--verify'));

export function verifyRegistryV105(registry){
 assert.equal(registry.schemaVersion,1);assert.equal(registry.release,'V105');assert.match(registry.asOf,/^\d{4}-\d{2}-\d{2}$/);
 assert.equal(registry.baseline.path,'docs/YAUTJA_V104_SUIVI.xlsx');assert.equal(registry.baseline.sha256,PIN,'Empreinte V104 historique imposée');
 assert.ok(['PENDING_RUNTIME_FREEZE','FROZEN'].includes(registry.baselineFreeze),'Gel runtime explicite requis');
 assert.deepEqual(registry.workstreams.map(item=>item.id).sort(),Object.keys(SCOPES).sort(),'Trois chantiers V105 attendus');
 for(const item of registry.workstreams){
  assert.ok(['EN_COURS','A_VALIDER','OUVERT','LIVRE_PARTIEL','VALIDE_CIBLE'].includes(item.status),'Statut limité invalide');
  assert.equal(item.validationScope,SCOPES[item.id],'Portée limitée V105 requise');
  assert.ok(item.source&&item.runtime&&item.remaining&&item.implementation.every(local)&&Array.isArray(item.proof),'Description de chantier incomplète');
  if(item.status==='VALIDE_CIBLE'){
   assert.equal(registry.baselineFreeze,'FROZEN','Geler le runtime avant validation');
   assert.ok(item.tests?.startsWith('PASS')&&item.browser?.startsWith('PASS'),'Tests et navigateur PASS explicites requis');
   assert.ok(item.proof.length,'Validation sans preuve finale');
   for(const proof of item.proof){assert.ok(local(proof.path)&&proof.path.startsWith('docs/')&&!proof.path.includes('/tests/'),'Preuve finale portable requise');assert.match(proof.sha256??'',/^[a-f0-9]{64}$/,'SHA de preuve finale requis');}
  }
 }
 if(registry.baselineFreeze==='FROZEN'){
  assert.equal(registry.runtimeFreeze?.path,'docs/v105-runtime-freeze.json','Gel de production portable requis');
  assert.match(registry.runtimeFreeze.sha256??'',/^[a-f0-9]{64}$/,'SHA du gel de production requis');
 }
 assert.ok(Array.isArray(registry.runtimeModules)&&Array.isArray(registry.validations)&&Array.isArray(registry.limits));
 for(const item of registry.runtimeModules){assert.ok(local(item.path)&&/^app\/.+\.(ts|tsx)$/.test(item.path),'Module runtime local requis');assert.match(item.id,/^[A-Za-z][A-Za-z0-9]*$/,'Identifiant de module sûr requis');}
 assert.equal(new Set(registry.runtimeModules.map(item=>item.id)).size,registry.runtimeModules.length,'Module runtime dupliqué');
 for(const item of registry.validations){
  assert.ok(item.id&&item.status&&item.scope&&item.limit&&item.command&&item.evidence?.length,'Validation sans commande, portée ou limite');
  if(item.status.startsWith('PASS'))for(const proof of item.evidence){assert.ok(local(proof.path)&&proof.path.startsWith('docs/'),'Preuve de validation portable requise');assert.match(proof.sha256??'',/^[a-f0-9]{64}$/,'SHA de validation requis');}
 }
}

export function verifyFrozenInputsV105(inputs,freeze){
 assert.equal(freeze.files,freeze.entries.length,'Inventaire de gel incomplet');
 const source=new Map(freeze.entries.map(item=>[item.path,item]));assert.equal(source.size,freeze.files,'Entrée de gel dupliquée');
 const checked=inputs.filter(item=>item.path.startsWith('app/')||item.path.startsWith('public/'));
 assert.ok(checked.length,'Aucune entrée runtime contrôlée');
 for(const item of checked)assert.equal(item.sha256,source.get(item.path)?.sha256,`Runtime différent du gel de production : ${item.path}`);
 return checked.length;
}
export async function verifyFinalProofsV105(workstreams,validations=[]){
 const proofs=[...workstreams.flatMap(item=>item.status==='VALIDE_CIBLE'?item.proof:[]),...validations.flatMap(item=>item.status.startsWith('PASS')?item.evidence:[])];
 for(const proof of proofs)assert.equal(sha(await read(proof.path)),proof.sha256,`Preuve finale modifiée : ${proof.path}`);
 return proofs;
}

export function verifyHomeworldSourceV105(option,source,corpusBytes){
 assert.equal(source.sourceCorpusSha256,sha(corpusBytes),'Corpus V6 modifié');
 const corpus=JSON.parse(corpusBytes);
 assert.equal(source.source.sha256,corpus.source.sha256,'Provenance V6 altérée');
 const row=corpus.sheets.find(sheet=>sheet.name==='Choix et actions V6').rows.find(row=>row.number===806);
 assert.deepEqual(source.sheets.find(sheet=>sheet.name==='Choix et actions V6').rows.find(row=>row.number===806),row,'Cellules option A altérées');
 assert.equal(option.option,'A');assert.equal(option.address,'Choix et actions V6!A806:I806');
 for(const [key,column]of [['action','F'],['conditions','G'],['consequence','H']])assert.equal(option[key],String(row.cells.find(cell=>cell.address===column+'806').value),'Texte option A altéré');
}

export function verifyConvoySourceV105(contract,corpus){
 assert.equal(contract.workbook,corpus.sourceWorkbook);assert.equal(contract.sha256,corpus.sha256,'Provenance V3 altérée');
 const expected=[['CON-R04',9],['CON-R10',15],['CON-R11',16]];
 assert.deepEqual(contract.sources.map(item=>[item.id,item.sheet,item.cells]),expected.map(([id,row])=>[id,'Règles de conquête',`C${row}:H${row}`]),'Cellules convoi exactes requises');
 return expected.map(([id,number])=>{
  const row=corpus.sheets.find(sheet=>sheet.name==='Règles de conquête').rows.find(row=>row.row===number);
  assert.equal(row.cells.A.value,id,'Identité règle convoi altérée');
  return {id,source:`Règles de conquête!C${number}:H${number}`,status:'SOURCE_CONSERVEE',runtime:[...'CDEFGH'].map(column=>`${row.cells[column].address} : ${row.cells[column].value}`).join('\n'),remaining:'Règle source ; adaptations de l’exercice libre déclarées par le contrat V105, sans convertir le coût source en RAV.'};
 });
}

export function verifySourceScopeV105(scope,plan,extraction,extractionHash){
 verifyPlanV100(plan,extraction,extractionHash);
 assert.equal(scope.schemaVersion,1);assert.equal(scope.source.extractionSha256,plan.source.extractionSha256);
 assert.equal(scope.source.workbookSha256,plan.source.workbookSha256);assert.equal(scope.source.actionPlanPath,PLAN);
 assert.deepEqual(scope.fighters.map(item=>item.fighterId),plan.fighters.map(item=>item.fighterId),'Identités source exactes requises');
 for(const fighter of scope.fighters){
  const original=plan.fighters.find(item=>item.fighterId===fighter.fighterId);
  const specification=extraction.p0Specifications.find(item=>item.fighterId===fighter.fighterId);
  assert.ok(specification,'Spécification source absente');assert.deepEqual(fighter.identity,specification.identity,'Identité source altérée');
  assert.equal(fighter.actions.length,26,'26 actions source par personnage');
  assert.equal(new Set(fighter.actions.map(item=>item.actionId)).size,26,'Action source dupliquée');
  for(const [index,action] of fighter.actions.entries()){
   const target=original.actions[index];
   for(const key of ['cell','sheet','key','label','sourceText','category'])assert.equal(action[key],target[key],`Action source altérée : ${fighter.fighterId}/${target.id}/${key}`);
   assert.equal(action.actionId,target.id,'Identifiant source altéré');
  }
  for(const [kind,expected] of [['campaignStages',8],['variantConstraints',7]]){
   assert.equal(fighter[kind].length,expected,`Couverture ${kind} exacte requise`);
   const source=specification[kind==='campaignStages'?'campaign':'variants'];
   const columns=kind==='campaignStages'?'DEFGHIJK':'CDEFGHI';
   assert.deepEqual(fighter[kind].map(row=>row.cell),[...columns].map(column=>column+fighter.sourceRow),'Cellules de contraintes exactes requises');
   for(const row of fighter[kind]){
    assert.equal(row.sheet,source.sheet,'Feuille de contrainte altérée');
    assert.equal(row.sourceText,source.cells[row.cell],`Texte ${kind} altéré : ${row.cell}`);
   }
  }
 }
}

function entry(registry){return `
export {getPitWorkbookNativeV100,getPitWorkbookTimelineV100} from './app/game/pitWorkbookAnimationV100';
export {PIT_WORKBOOK_NORMALS_V104} from './app/game/systems/pitWorkbookNormalsV104';
export {PIT_WORKBOOK_MOVES_V105,PIT_WORKBOOK_PRESENTATIONS_V105} from './app/game/systems/pitWorkbookMovesV105';
export {validateHunterSpriteAtlas} from './app/game/hunterSpriteAtlas';
${registry.runtimeModules.map(item=>`import * as ${item.id} from ${JSON.stringify('./'+item.path)}; export {${item.id}};`).join('\n')}`;}
const compile=registry=>build({stdin:{contents:entry(registry),resolveDir:ROOT},absWorkingDir:ROOT,bundle:true,write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});

/** A deliberately explicit adapter. Additional module exports cannot silently
 * promote a workbook state just because an object or function exists. */
export function runtimeFactsV105(api){
 const bindings=api.pitBindings,combat=api.pitCombatV105,engine=api.pitEngine;
 assert.ok(bindings&&combat&&engine,'Adaptateurs runtime Pit explicites requis');
 assert.equal(combat.PIT_WORKBOOK_COMBAT_RECIPE_V105,'workbook-v105');assert.equal(combat.PIT_WORKBOOK_COMBAT_STATE_VERSION_V105,13);
 const expectedMoves=['feral-hunter:6M','feral-hunter:EQUIP','feral-hunter:S3','scar:6M','scar:EQUIP','scar:S1','scar:S4'];
 assert.deepEqual(bindings.PIT_WORKBOOK_BODY_MOVES_V105.map(m=>m.fighterId+':'+m.key).sort(),expectedMoves.sort(),'Sept mouvements BODY ciblés attendus');
 const moves=bindings.PIT_WORKBOOK_BODY_MOVES_V105.map(move=>{
  assert.deepEqual(combat.getPitWorkbookCombatMoveV105(move.fighterId,move.key),move,'Recette et atlas doivent partager la cible source');
  const definition=bindings.PIT_WORKBOOK_MOVE_REGISTRY_V105.find(item=>item.fighterId===move.fighterId&&item.atlas.id.endsWith('-move-v105-'+move.key));
  assert.ok(definition&&!definition.variantId&&api.validateHunterSpriteAtlas(definition.atlas).valid,'Atlas de mouvement natif invalide');
  for(const facing of ['right','left'])for(const phase of ['startup','active','recovery']){
   const clip=definition.atlas.clips.find(c=>c.id===`pit.stand.workbook-v105.${move.key}.${phase}`&&c.facing===facing);
   if(move[phase]===0){assert.equal(clip,undefined,'Aucun actif inventé pour EQUIP');continue;}
   assert.ok(clip?.status==='validated'&&!clip.loop,'Phase native requise');assert.equal(clip.frames.reduce((n,f)=>n+f.durationTicks*60/clip.ticksPerSecond,0),move[phase],'Durée de phase source altérée');
  }
  const other=move.fighterId==='scar'?'feral-hunter':'scar';
  const state=engine.createPitCombatState(move.fighterId,other,{normalMoves:combat.PIT_WORKBOOK_COMBAT_RECIPE_V105});
  state.fighters[0].traque=engine.PIT_MAX_TRAQUE;
  const input=move.key==='6M'?{right:true,attack:'medium'}:{workbookAction:move.key==='EQUIP'?'equipment':move.key==='S4'?'counter':'contact'};
  const stepped=engine.stepPitCombat(state,[input,{}]);
  assert.equal(stepped.version,13);assert.equal(stepped.fighters[0].action?.workbookMove,move.key,'Commande source non raccordée au moteur');
  if(move.key==='EQUIP')assert.equal(stepped.fighters[0].action.attack,null,'EQUIP ne doit pas créer de coup');
  return {...move,runtimeInput:input,recipe:combat.PIT_WORKBOOK_COMBAT_RECIPE_V105,commandStatus:'COMMANDE_V105_OPT_IN',mechanicsStatus:move.key==='EQUIP'?'GESTE_EQUIPEMENT_SANS_INVENTAIRE':move.key==='S4'?'PARADE_CONTACT_FRONTALE_PARTIELLE':'CONTACT_V105_PARTIEL',nativePhases:definition.atlas.clips.length,runtimeDefinition:definition,remaining:move.key==='EQUIP'?'Geste sourcé à actif nul ; changement d’inventaire et objets persistants non livrés.':move.key==='S4'?'Parade frontale de contact ; pas de reflet de projectile, protection des projections ou du dos. Preuves de portée limitée consignées séparément dans ChantiersV105.':'Timings, dégâts et coût source ; portée, collisions, stuns et pushback adaptés du moteur. Entités, partenaires et autres gestes restent ouverts.'};
 });
 const scenes=bindings.PIT_WORKBOOK_BODY_PRESENTATIONS_V105;
 assert.equal(scenes.length,10,'Dix présentations sans partenaire attendues');
 const presentations=scenes.map(scene=>{
  assert.ok(['INTRO','VICTOIRE','DEFAITE','TAUNT_1','TAUNT_2'].includes(scene.key),'Présentation avec partenaire interdite');
  const definition=bindings.PIT_WORKBOOK_PRESENTATION_REGISTRY_V105.find(item=>item.fighterId===scene.fighterId&&item.atlas.id.endsWith('-presentation-v105-'+scene.key));
  assert.ok(definition&&!definition.variantId&&api.validateHunterSpriteAtlas(definition.atlas).valid,'Atlas présentation invalide');assert.equal(definition.atlas.clips.length,2);
  assert.deepEqual(definition.atlas.clips.map(c=>c.facing),['right','left']);
  return {...scene,status:'REGISTRE_PRESENTATION_V105',runtimeDefinition:definition,remaining:'Raccord natif sans partenaire ; déclenchements et lecture attestés séparément dans ChantiersV105. Aucun finisher ou campagne livré.'};
 });
 const versions={legacy:engine.createPitCombatState('feral-hunter','scar').version,v104:engine.createPitCombatState('feral-hunter','scar',{normalMoves:'workbook-v104'}).version,v105:engine.createPitCombatState('feral-hunter','scar',{normalMoves:'workbook-v105'}).version};
 assert.deepEqual(versions,{legacy:11,v104:12,v105:13});
 const lookout=api.homeworldLookout?.HOMEWORLD_CARTOGRAPHY_V105,option=api.homeworldLookout?.HOMEWORLD_CARTOGRAPHY_OPTION_V105;
 assert.equal(lookout?.sceneId,'D6-W-PNJ-ROLE-12');assert.equal(option?.option,'A');assert.equal(lookout.landmarks.length,2);
 const bearings=api.homeworldLookout.cartographyBearingsV105();assert.equal(bearings.length,2);
 const convoy=api.clanConvoy?.WAR_CONVOY_ROUTE_CONTRACT_V105;assert.equal(convoy?.id,'CONVOY-ROUTE-V105');
 assert.deepEqual(convoy.sources.map(s=>s.id),['CON-R04','CON-R10','CON-R11']);
 return {moves,presentations,versions,homeworld:[{id:lookout.routeId,option:'A',source:option.address,status:'RUNTIME_CIBLE',runtime:JSON.stringify({definition:lookout,sourceOption:option,bearings}),remaining:'Deux objets connus comparés depuis le viaduc ; aucun quartier révélé ni récompense inventée.'}],clans:[{id:convoy.id,source:convoy.sources.map(s=>`${s.id} · ${s.sheet}!${s.cells}`).join('\n'),status:'RUNTIME_CIBLE',runtime:convoy.rules.join('\n'),remaining:convoy.adaptation}]};
}

export async function collectFollowupV105(registry=undefined){
 registry??=await json(REGISTRY);verifyRegistryV105(registry);
 assert.equal(sha(await read(registry.baseline.path)),registry.baseline.sha256,'Base V104 modifiée');
 const fixed=[REGISTRY,WRITER,'scripts/lib/excel_followup_append.py','scripts/build-excel-followup-v105.mjs','scripts/build-excel-followup-v100.mjs','scripts/build-excel-followup-v100.py',registry.baseline.path,'docs/v104-workstreams.json','docs/v100-workstreams.json',PLAN,INVENTORY,'scripts/build-pit-workbook-scope-v105.mjs','app/game/data/pitWorkbookAnimationsV100.json','docs/v56-excel-priorities.json','docs/war-clans-v3-workbook-source.json','public/game/dialogues/v85/bible-dialogues.json','package.json','package-lock.json','app/game/buildInfo.ts',...(registry.baselineFreeze==='FROZEN'?[registry.runtimeFreeze.path]:[]),...registry.workstreams.flatMap(item=>item.implementation),...registry.runtimeModules.map(item=>item.path)];
 const first=await compile(registry),imports=Object.keys(first.metafile.inputs).filter(file=>file!=='<stdin>');
 const guarded=[...fixed,...imports],before=await fingerprint(guarded);
 const compiled=await compile(registry);assert.deepEqual(Object.keys(compiled.metafile.inputs),Object.keys(first.metafile.inputs),'Imports modifiés pendant collecte');
 const api=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
 const plan=await json(PLAN),extractionBytes=await read(plan.source.extractionPath),extraction=JSON.parse(extractionBytes),scope=await json(INVENTORY);
 verifySourceScopeV105(scope,plan,extraction,sha(extractionBytes));
 const runtime=runtimeFactsV105(api),assets=new Map(),actions=[],clips=[];
 verifyHomeworldSourceV105(api.homeworldLookout.HOMEWORLD_CARTOGRAPHY_OPTION_V105,await json('app/game/data/bibleCartographySceneV104.json'),await read('public/game/dialogues/v85/bible-dialogues.json'));
 const clansBytes=await read('docs/war-clans-v3-workbook-source.json');assert.equal(sha(clansBytes),CLANS_EXTRACTION_PIN,'Extraction V3 historique modifiée');
 runtime.clans.push(...verifyConvoySourceV105(api.clanConvoy.WAR_CONVOY_ROUTE_CONTRACT_V105,JSON.parse(clansBytes)));
 const sourceRows=[...api.PIT_WORKBOOK_MOVES_V105,...api.PIT_WORKBOOK_PRESENTATIONS_V105];assert.equal(sourceRows.length,52);
 for(const fighter of plan.fighters)for(const action of fighter.actions){
  const source=sourceRows.find(item=>item.fighterId===fighter.fighterId&&item.actionId===action.id);assert.ok(source,'Adaptateur source manquant');
  for(const key of ['sheet','cell','key','sourceText'])assert.equal(source[key],action[key],`Adaptateur source altéré : ${action.id}/${key}`);
  if(action.category==='move'){
   const numbers=/Préparation \/ actif \/ récupération : (\d+) \/ (\d+) \/ (\d+) images · dégâts (\d+) · coût (\d+) %/.exec(action.sourceText);
   assert.ok(numbers,'Chiffres source requis');
   for(const [index,key]of ['startup','active','recovery','damage','costPercent'].entries())assert.equal(source[key],Number(numbers[index+1]),`Chiffre source altéré : ${action.id}/${key}`);
   assert.equal(source.command,action.command,'Commande source altérée');assert.equal(source.weapon,action.weapon,'Arme source altérée');
  }
  const native=api.getPitWorkbookNativeV100(fighter.fighterId,action.id);assert.ok(native,`Admission BODY invalide : ${action.id}`);
  const pages=[];
  for(const page of native.definition.atlas.pages){
   const relative='public'+page.src;assert.ok(local(relative)&&relative.startsWith('public/game/'),'Page native locale requise');
   const expected=native.admission.review.sourceHashes?.[page.src]??native.admission.review.sourceSha256;assert.match(expected??'',/^[a-f0-9]{64}$/,'SHA natif requis');
   if(!assets.has(relative)){const bytes=await read(relative);assert.equal(sha(bytes),expected,`PNG natif modifié : ${relative}`);assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a','PNG natif attendu');assets.set(relative,{path:relative,sha256:expected,bytes:bytes.length,width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)});}
   else assert.equal(assets.get(relative).sha256,expected,'SHA natifs contradictoires');
   pages.push({path:relative,sha256:expected});
  }
  for(const facing of ['right','left']){
   const timeline=api.getPitWorkbookTimelineV100(native,facing);assert.ok(timeline.length,`Direction native absente : ${action.id}/${facing}`);
   assert.ok(timeline.every(item=>item.clip.facing===facing),'Direction reflétée interdite');
   clips.push({fighterId:fighter.fighterId,actionId:action.id,facing,atlasId:native.definition.atlas.id,clipIds:[...new Set(timeline.map(item=>item.clipId))],frames:timeline.length,durationTicks60:timeline.reduce((sum,item)=>sum+item.durationTicks60,0),status:'CYCLE_BODY_NATIF_ADMIS',pages});
  }
  const oldNormal=api.PIT_WORKBOOK_NORMALS_V104.some(item=>item.fighterId===fighter.fighterId&&item.actionId===action.id);
  const move=runtime.moves.find(item=>item.fighterId===fighter.fighterId&&item.actionId===action.id),presentation=runtime.presentations.find(item=>item.fighterId===fighter.fighterId&&item.actionId===action.id);
  const definition=(move??presentation)?.runtimeDefinition;
  if(definition){
   const frameKey=frame=>JSON.stringify([frame.pageId,frame.rect,frame.pivot]);
   for(const clip of definition.atlas.clips)for(const frame of clip.frames)assert.ok(native.definition.atlas.clips.some(original=>original.facing===clip.facing&&original.frames.some(f=>frameKey(f)===frameKey(frame))),'Rectangle ou pivot natif transformé');
   for(const page of definition.atlas.pages)assert.deepEqual(page,native.definition.atlas.pages.find(original=>original.id===page.id),'Page native transformée');
  }
  actions.push({fighterId:fighter.fighterId,actionId:action.id,...action,sourceCommand:action.command??source.triggerText,drawing:'BODY_NATIF_ADMIS',animation:'CYCLE_DEUX_DIRECTIONS_ADMIS',command:move?.commandStatus??(oldNormal?'RECETTE_V104_OPT_IN':action.category==='presentation'?'SANS_COMMANDE_COMBAT':'CIBLE_SOURCE'),mechanics:move?.mechanicsStatus??(oldNormal?'NORMALE_V104_PARTIELLE':action.category==='presentation'?'SANS_MECANIQUE_COMBAT':'OUVERT'),presentation:presentation?.status??(action.category==='presentation'?'ETUDE_INDEPENDANTE':'SANS_PRESENTATION'),bodyId:source.bodyId,entityIds:source.entityIds,nativeAtlasId:native.definition.atlas.id,runtimeRecipe:move?.recipe??(oldNormal?'workbook-v104':''),runtimeInput:move?.runtimeInput??'',runtimeAtlasId:definition?.atlas.id??'',runtimeClips:definition?.atlas.clips.map(c=>({id:c.id,facing:c.facing,frames:c.frames.length,durationTicks60:c.frames.reduce((n,f)=>n+f.durationTicks*60/c.ticksPerSecond,0)}))??[],remaining:move?.remaining??presentation?.remaining??(oldNormal?'Portée, stuns, pushback et combos hérités ; validation V104 historique, pas une nouvelle validation V105.':'Un cycle BODY ne prouve pas le déclenchement, les partenaires, objets, collisions, inventaire ou états de jeu.'),sourceSha256:plan.source.workbookSha256});
 }
 const historical=await json('docs/v104-workstreams.json');
 const extra=scope.fighters.flatMap(fighter=>[...fighter.campaignStages.map(item=>({id:item.id,domain:'The Pit · campagne',source:`${item.sheet}!${item.cell}`,status:'OUVERT',remaining:item.sourceText+'\n\nBesoins visuels restant à livrer :\n'+item.visualNeeds.join('\n')})),...fighter.variantConstraints.map(item=>({id:item.id,domain:'The Pit · variante',source:`${item.sheet}!${item.cell}`,status:'OUVERT',remaining:item.sourceText}))]);
 const actionOpen=actions.filter(item=>item.command==='CIBLE_SOURCE'||item.presentation==='ETUDE_INDEPENDANTE').map(item=>({id:item.actionId,domain:'The Pit · action',source:`${item.sheet}!${item.cell}`,status:'OUVERT',remaining:item.remaining+'\n\nTexte source exact :\n'+item.sourceText}));
 const homeworldWorkstream=registry.workstreams.find(item=>item.id==='HOMEWORLD-V105-HIGH-POINT');
 const openItems=[...historical.openItems.filter(item=>item.id!=='CARTOGRAPHE-OPTION-A'),...actionOpen,...extra,...(homeworldWorkstream.status==='VALIDE_CIBLE'?[]:[{id:'CARTOGRAPHE-OPTION-A',domain:'Homeworld',source:'Choix et actions V6!A806:H806',status:homeworldWorkstream.status,remaining:homeworldWorkstream.remaining}])];
 for(const [domain,rows]of [['Homeworld',runtime.homeworld],['Guerre de clans',runtime.clans]])for(const row of rows)if(row.status==='RUNTIME_CIBLE')row.status=registry.workstreams.find(item=>item.domain===domain).status;
 const proofs=await verifyFinalProofsV105(registry.workstreams,registry.validations),assetRows=[...assets.values()].sort((a,b)=>a.path.localeCompare(b.path));
 const inputs=await fingerprint([...guarded,...assetRows.map(item=>item.path),...proofs.map(item=>item.path)]);
 let runtimeFrozenInputsVerified=0;
 if(registry.baselineFreeze==='FROZEN'){
  const bytes=await read(registry.runtimeFreeze.path);assert.equal(sha(bytes),registry.runtimeFreeze.sha256,'Gel de production modifié');
  runtimeFrozenInputsVerified=verifyFrozenInputsV105(inputs,JSON.parse(bytes));
 }
 assert.deepEqual(await fingerprint(guarded),before,'Entrées modifiées pendant collecte ; relancer après stabilisation');
 const facts={sourceActions:actions.length,sourceActionsPerFighter:26,nativeBodyStudies:actions.length,nativeDirections:clips.length,nativePages:assetRows.length,sourceMoves:actions.filter(item=>item.category==='move').length,sourcePresentations:actions.filter(item=>item.category==='presentation').length,historicalNormals:api.PIT_WORKBOOK_NORMALS_V104.length,newRuntimeMoves:runtime.moves.length,allSourceRuntimeMoves:api.PIT_WORKBOOK_NORMALS_V104.length+runtime.moves.length,newRuntimeMoveClips:runtime.moves.reduce((n,m)=>n+m.runtimeDefinition.atlas.clips.length,0),newRuntimePresentations:runtime.presentations.length,newRuntimePresentationClips:runtime.presentations.reduce((n,m)=>n+m.runtimeDefinition.atlas.clips.length,0),campaignStages:scope.fighters.reduce((n,f)=>n+f.campaignStages.length,0),variantConstraints:scope.fighters.reduce((n,f)=>n+f.variantConstraints.length,0),historicalPlanets:historical.facts.historicalPlanets,proceduralFormatsV103:historical.facts.proceduralFormatsV103,openWarStructures:historical.facts.openWarStructures,preserveSectors:historical.facts.preserveSectors,preserveSectorTarget:historical.facts.preserveSectorTarget,preserveFighters:historical.facts.preserveFighters,preserveFighterTarget:historical.facts.preserveFighterTarget};
 facts.sourceRuntimeBindings=facts.allSourceRuntimeMoves+facts.newRuntimePresentations;facts.sourceActionsRemaining=actionOpen.length;
 assert.equal(facts.sourceActions,52);assert.equal(facts.nativeDirections,104);assert.equal(facts.openWarStructures,6);assert.equal(facts.sourceRuntimeBindings,35);assert.equal(facts.sourceActionsRemaining,17);
 return {schemaVersion:1,release:'V105',asOf:registry.asOf,baseline:registry.baseline,baselineFreeze:registry.baselineFreeze,runtimeFreeze:registry.runtimeFreeze,runtimeFrozenInputsVerified,method:'Cellules source exactes, exports réels compilés, commandes exécutées une fois, admissions natives et SHA contrôlés. Aucun test de jeu ou navigateur exécuté par le générateur.',facts,pitVersions:runtime.versions,delivery:{characters:'OUVERT',completeKits:'OUVERT',entities:'OUVERT',campaigns:'OUVERT',variantAnimations:'OUVERT',canonicalFidelity:'NON_CERTIFIE'},workstreams:registry.workstreams,actions,clips,campaignStages:scope.fighters.flatMap(f=>f.campaignStages),variantConstraints:scope.fighters.flatMap(f=>f.variantConstraints),homeworld:runtime.homeworld,clans:runtime.clans,openItems,assets:assetRows,inputs,validations:registry.validations,limits:registry.limits};
}

const column=(key,label,width=30)=>({key,label,width});
const printable=value=>value===undefined||value===null?'':typeof value==='object'&&!(Object.keys(value).length===2&&'formula'in value&&'cached'in value)?JSON.stringify(value):value;
function sheet(name,title,columns,rows){return {name,title,subtitle:'Sources, implémentation et preuves distinctes · V105',columns,rows:rows.map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key,printable(value)])))};}
export function buildSheetsV105(s){
 const metric=(label,value,scope,formula)=>({label,value:formula?{formula,cached:value}:value,scope});
 const summary=[metric('Actions source Feral + Scar',s.facts.sourceActions,'26 par personnage ; dessins et mécaniques séparés.',`COUNTA('ActionsV105'!A5:A${s.actions.length+4})`),metric('Directions BODY natives',s.facts.nativeDirections,'104 directions déjà admises avant V105.',`COUNTA('ClipsV105'!A5:A${s.clips.length+4})`),metric('Actions combat nouvelles raccordées',s.facts.newRuntimeMoves,'7 gestes, dont 2 EQUIP sans inventaire ; recette explicite.'),metric('Actions source raccordées au total',s.facts.sourceRuntimeBindings,'25 mouvements ou gestes de combat et 10 présentations ; 35/52.'),metric('Actions source restant ouvertes',s.facts.sourceActionsRemaining,'4 projections, 5 spéciaux à entités, 2 supers et 6 scènes avec partenaire.'),metric('Présentations nouvelles raccordées',s.facts.newRuntimePresentations,'Déclenchements et lecture natifs distincts des finishers.'),metric('Étapes de campagne restant ouvertes',s.facts.campaignStages,'Ciblage source, non admission campagne.'),metric('Contraintes de variantes restant ouvertes',s.facts.variantConstraints,'Pas déduites du BODY runtime-default.'),metric('Ouvrages Clans ouverts',s.facts.openWarStructures,'Six ouvrages restent distincts de la route logistique.'),metric('Preserve : secteurs',`${s.facts.preserveSectors}/${s.facts.preserveSectorTarget}`,'Historique V104 ; aucun nouveau secteur V105.'),metric('Preserve : combattants',`${s.facts.preserveFighters}/${s.facts.preserveFighterTarget}`,'Aucune nouvelle animation Preserve déduite.'),metric('Planètes historiques',s.facts.historicalPlanets,'Distinctes des formats V103.'),...['EN_COURS','A_VALIDER','OUVERT','LIVRE_PARTIEL','VALIDE_CIBLE'].map(status=>metric(`Chantiers ${status}`,s.workstreams.filter(item=>item.status===status).length,'Portée explicite et preuves épinglées.',`COUNTIF('ChantiersV105'!E5:E${s.workstreams.length+4},"${status}")`)),metric('Feuilles V104 préservées',39,s.baseline.path),metric('Application Excel native vérifiée','NON','ZIP/XML et caches contrôlés seulement.')];
 return [
  sheet('SyntheseV105','YAUTJA · suivi actif V105',[column('label','Indicateur',52),column('value','Valeur',26),column('scope','Portée / limite',115)],summary),
  sheet('ChantiersV105','Périmètres et preuves V105',[column('id','ID',38),column('domain','Domaine'),column('title','Chantier',58),column('source','Source',90),column('status','Statut'),column('validationScope','Portée limitée',48),column('runtime','Implémentation',115),column('tests','Tests déclarés',100),column('browser','Navigateur déclaré',100),column('proof','Preuves avec SHA',115),column('remaining','Reste ouvert',120),column('implementation','Fichiers',110)],s.workstreams),
  sheet('ActionsV105','52 actions · états indépendants',[column('fighterId','Personnage'),column('actionId','Action source',30),column('key','Clé',18),column('sheet','Feuille',28),column('cell','Cellule',16),column('category','Catégorie'),column('label','Libellé',48),column('drawing','Dessin natif',30),column('animation','Cycle natif',38),column('sourceCommand','Commande / déclenchement source',50),column('command','État commande',40),column('mechanics','Mécanique',40),column('presentation','Présentation',40),column('bodyId','Corps source',32),column('entityIds','Entités requises',60),column('nativeAtlasId','Atlas étude native',48),column('runtimeRecipe','Recette explicite',28),column('runtimeInput','Entrée moteur adaptée',65),column('runtimeAtlasId','Atlas raccordé V105',65),column('runtimeClips','Phases ou séquences raccordées',140),column('sourceText','Texte source exact',135),column('remaining','Reste / limite',130),column('sourceSha256','SHA source V54',72)],s.actions),
  sheet('ClipsV105','104 directions natives · phases et empreintes',[column('fighterId','Personnage'),column('actionId','Action source',30),column('facing','Direction',18),column('atlasId','Atlas',48),column('clipIds','Clips natifs',100),column('frames','Images natives',22),column('durationTicks60','Durée à 60 Hz',24),column('status','Admission visuelle',42),column('pages','Pages PNG et SHA',135)],s.clips),
  sheet('HomeworldV105','Cartographe · observation au point haut',[column('id','ID',45),column('option','Option',18),column('source','Source / cellules',95),column('status','État',32),column('runtime','Règles livrées',120),column('remaining','Limite',120)],[...s.homeworld,...s.workstreams.filter(w=>w.domain==='Homeworld').map(w=>({...w,option:'A'}))]),
  sheet('ClansV105','Route logistique · six ouvrages ouverts',[column('id','ID',45),column('source','Source / cellules',100),column('status','État',32),column('runtime','Règles livrées',125),column('remaining','Limite / ouvrages ouverts',130)],[...s.clans,...s.workstreams.filter(w=>w.domain==='Guerre de clans')]),
  sheet('ManquantsV105','Dossiers et contraintes restant ouverts',[column('id','ID',65),column('domain','Domaine',35),column('source','Source / cellules',95),column('status','État',28),column('remaining','Travail restant / texte source',145)],s.openItems),
  sheet('SourcesV105','Empreintes de toutes les entrées réellement lues',[column('path','Fichier',115),column('sha256','SHA-256',72),column('scope','Portée',120)],s.inputs.map(item=>({...item,scope:s.assets.some(asset=>asset.path===item.path)?'PNG natif vérifié ; cycle visuel distinct d’une mécanique et d’une nouvelle production.':item.path===s.baseline.path?'Base V104 épinglée ; 39 feuilles historiques conservées.':'Entrée réellement lue ou importée ; sa présence ne constitue aucun PASS.'}))),
  sheet('ValidationsV105','Validations explicitement exécutées',[column('id','ID',45),column('status','État',28),column('scope','Portée',115),column('command','Commande',120),column('evidence','Preuves et SHA',120),column('limit','Limite',125)],s.validations.length?s.validations:[{id:'V105-VALIDATION-PENDING',status:'A_VALIDER',scope:'Les chantiers restent EN_COURS jusqu’aux preuves finales.',command:'À consigner après exécution réelle',evidence:'Aucune preuve finale déclarée',limit:'Le collecteur ne lance pas les tests de jeu ni le navigateur.'}]),
  sheet('JournalV105','Méthode et limites de livraison',[column('subject','Sujet',45),column('detail','Décision / limite',145)],[{subject:'Méthode',detail:s.method},{subject:'Gel du runtime',detail:s.baselineFreeze},{subject:'Registre',detail:REGISTRY},{subject:'Génération',detail:'node scripts/build-excel-followup-v105.mjs'},{subject:'Contrôle reproductible',detail:'node scripts/build-excel-followup-v105.mjs --check'},...s.limits.map((detail,index)=>({subject:`Limite ${index+1}`,detail}))]),
 ];
}
export async function generateFollowupV105({outputDir=path.join(ROOT,'docs'),check=false}={}){
 const snapshot=await collectFollowupV105(),workbook=await writeWorkbookV105(snapshot.baseline,buildSheetsV105(snapshot)),structural=await verifyWorkbookV105(workbook,snapshot.baseline);
 const qa={schemaVersion:1,release:'V105',result:'PASS_STRUCTURE',scope:'Cellules source, 52 admissions BODY, 104 directions, SHA des PNG/entrées, ZIP/XML, préservation de 39 feuilles et caches. Aucun test de jeu ou navigateur exécuté par le générateur.',workbook:'docs/YAUTJA_V105_SUIVI.xlsx',sha256:sha(workbook),bytes:workbook.length,inputFingerprintsVerified:snapshot.inputs.length,assetsVerified:snapshot.assets.length,facts:snapshot.facts,delivery:snapshot.delivery,...structural,nativeExcelApplicationVerified:false,nativeExcelCalculationEngineExecuted:false};
 const products=[Buffer.from(JSON.stringify(snapshot,null,2)+'\n'),workbook,Buffer.from(JSON.stringify(qa,null,2)+'\n')];
 if(!check)await fs.mkdir(outputDir,{recursive:true});
 for(const [index,name]of OUTPUTS.entries()){const target=path.join(outputDir,name);if(check){if(!(await fs.readFile(target)).equals(products[index]))throw new Error(`Suivi V105 périmé : ${name}`);}else await fs.writeFile(target,products[index]);}
 return {snapshot,qa,workbookSha256:sha(workbook),bytes:workbook.length,outputDir};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const args=process.argv.slice(2),at=args.indexOf('--output-dir');assert.ok(args.every((arg,index)=>['--check','--output-dir'].includes(arg)||at>=0&&index===at+1)&&(at<0||args[at+1]),'Usage : node scripts/build-excel-followup-v105.mjs [--check] [--output-dir chemin]');
 const result=await generateFollowupV105({check:args.includes('--check'),...(at>=0?{outputDir:path.resolve(args[at+1])}:{})});console.log(JSON.stringify({result:'PASS_STRUCTURE',mode:args.includes('--check')?'check':'generate',bytes:result.bytes,sha256:result.workbookSha256,inputs:result.snapshot.inputs.length,facts:result.snapshot.facts}));
}
