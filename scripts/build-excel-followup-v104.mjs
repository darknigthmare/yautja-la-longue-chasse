#!/usr/bin/env node
/** Collect actual V104 exports; append a reproducible workbook to pinned V100.
 * Source facts, executable features and explicit verification remain distinct. */
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {verifyPlanV100} from './build-excel-followup-v100.mjs';

export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const REGISTRY='docs/v104-workstreams-source.json';
export const OUTPUTS=['v104-workstreams.json','YAUTJA_V104_SUIVI.xlsx','v104-excel-followup-qa.json'];
const WRITER='scripts/build-excel-followup-v104.py';
const PLAN='app/game/data/pitWorkbookAnimationPlanV100.json';
const MASTER='docs/suivi-production/v613/data/current-master.json.gz';
const SCOPES={
 'PIT-V104-NORMALS':'NORMALS_SOURCE_OPT_IN', 'HOMEWORLD-V104-CARTOGRAPHY':'OPTION_B_KNOWN_ROUTE',
 'PRESERVE-V104-LOOKOUT':'V2_FOUR_SECTORS', 'CLANS-V103-GENERATOR':'PROCEDURAL_V103_FORMATS',
 'ENFORCERS-V613-CUMULATIVE':'STATIC_POSES_ONLY', 'ENFORCERS-10-REMAINING':'PRODUCTION_PENDING',
};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const read=relative=>fs.readFile(path.join(ROOT,relative));
const json=async relative=>JSON.parse(await read(relative));
const fingerprint=async files=>Promise.all([...new Set(files)].sort().map(async relative=>({path:relative,sha256:sha(await read(relative))})));
const local=relative=>typeof relative==='string'&&!path.isAbsolute(relative)&&!relative.split(/[\\/]/).includes('..');

async function python(payload,mode=''){
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'yautja-excel-v104-'));
 try{
  if(payload.workbook){await fs.writeFile(path.join(directory,'verify.xlsx'),payload.workbook);payload={...payload,workbook:undefined,workbookPath:path.join(directory,'verify.xlsx')};}
  const request=path.join(directory,'request.json');await fs.writeFile(request,JSON.stringify(payload));
  return execFileSync('python3',[path.join(ROOT,WRITER),...(mode?[mode]:[]),'--request',request],{stdio:['ignore','pipe','pipe'],timeout:30000,maxBuffer:32*1024*1024});
 }finally{await fs.rm(directory,{recursive:true,force:true});}
}
export const writeWorkbookV104=(baseline,sheets)=>python({root:ROOT,baseline,sheets});
export const verifyWorkbookV104=async(workbook,baseline)=>JSON.parse(await python({root:ROOT,baseline,workbook},'--verify'));

export function verifyRegistryV104(registry){
 assert.equal(registry.schemaVersion,1);assert.equal(registry.release,'V104');
 assert.match(registry.asOf,/^\d{4}-\d{2}-\d{2}$/);
 assert.equal(registry.baseline.path,'docs/YAUTJA_V100_SUIVI.xlsx');assert.match(registry.baseline.sha256,/^[a-f0-9]{64}$/);
 assert.ok(['PENDING_RUNTIME_FREEZE','FROZEN'].includes(registry.baselineFreeze),'État du gel V100 explicite requis');
 assert.equal(registry.enforcerMainReconciliation?.kind,'EXPLICIT_MERGE_ATTESTATION');
 assert.match(registry.enforcerMainReconciliation.mergeCommit,/^[a-f0-9]{40}$/,'Commit de réconciliation explicite requis');
 assert.equal(registry.enforcerMainReconciliation.pullRequest,'https://github.com/darknigthmare/yautja-la-longue-chasse/pull/10');
 assert.deepEqual(registry.workstreams.map(item=>item.id).sort(),Object.keys(SCOPES).sort(),'Chantiers V104 attendus');
 const allowed=['EN_COURS','A_VALIDER','OUVERT','MANQUANT','LIVRE_PARTIEL','VALIDE_CIBLE'];
 for(const item of registry.workstreams){
  assert.ok(allowed.includes(item.status),`Statut invalide : ${item.id}`);
  assert.equal(item.validationScope,SCOPES[item.id],`Portée limitée requise : ${item.id}`);
  assert.ok(item.source&&item.runtime&&item.remaining&&Array.isArray(item.implementation)&&Array.isArray(item.proof),`Périmètre incomplet : ${item.id}`);
  assert.ok(item.implementation.every(local),'Chemin local d’implémentation attendu');
  if(item.status==='VALIDE_CIBLE'){
   assert.notEqual(item.id,'ENFORCERS-10-REMAINING','Les Enforcers 10 sans PNG restent ouverts');
   assert.equal(registry.baselineFreeze,'FROZEN','Geler la base avant validation finale');
   assert.ok(item.tests?.startsWith('PASS')&&item.browser?.startsWith('PASS'),'Tests et navigateur PASS explicitement déclarés requis');
   assert.ok(item.proof.length,'Validation sans preuve finale');
   for(const proof of item.proof){
    assert.ok(local(proof.path)&&proof.path.startsWith('docs/')&&!proof.path.includes('/tests/'),'Preuve finale portable requise, pas un nom de test');
    assert.match(proof.sha256??'',/^[a-f0-9]{64}$/,'Empreinte de preuve finale requise');
   }
  }
 }
 assert.ok(Array.isArray(registry.validations)&&Array.isArray(registry.limits));
 for(const item of registry.validations)assert.ok(item.id&&item.status&&item.scope&&item.limit&&item.command&&item.evidence?.length,'Validation sans commande, portée ou limite');
}

export function verifyNormalRowsV104(normals,plan,extraction,extractionHash){
 verifyPlanV100(plan,extraction,extractionHash);
 const keys=['5L','5M','5H','2L','2M','2H','jL','jM','jH'];
 assert.equal(normals.length,18,'Dix-huit normales attendues');
 for(const [fighterId,row] of [['feral-hunter',10],['scar',7]]){
  const source=plan.fighters.find(item=>item.fighterId===fighterId);
  const current=normals.filter(item=>item.fighterId===fighterId);
  assert.deepEqual(current.map(item=>item.key),keys,'Neuf commandes distinctes par personnage');
  current.forEach((item,index)=>{
   const action=source.actions.find(action=>action.key===item.key);
   assert.equal(item.cell,String.fromCharCode(68+index)+row,'Cellule normale déplacée');
   for(const field of ['actionId','sheet','sourceText'])assert.equal(item[field],action[field==='actionId'?'id':field],`Source normale altérée : ${item.key}/${field}`);
   for(const field of ['startup','active','recovery'])assert.equal(item[field],action.phaseTicks[field],'Timing normal altéré');
   const damage=/· dégâts (\d+) · coût 0 %/.exec(action.sourceText);
   const level=/Commande [^\n]+ · (Haut|Milieu(?: \/ anti-air)?|Bas) · Base de duel/.exec(action.sourceText);
   assert.ok(damage&&level,'Dégâts et hauteur source requis');
   assert.equal(item.damage,Number(damage[1]),'Dégâts source altérés');
   assert.equal(item.hitLevel,level[1]==='Haut'?'high':level[1]==='Bas'?'low':'mid','Hauteur source altérée');
   assert.equal(item.antiAir,level[1].includes('anti-air'),'Anti-air source altéré');
  });
 }
}

export async function verifyFinalProofsV104(workstreams){
 const proofs=workstreams.flatMap(item=>item.status==='VALIDE_CIBLE'?item.proof:[]);
 for(const proof of proofs)assert.equal(sha(await read(proof.path)),proof.sha256,`Preuve finale modifiée : ${proof.path}`);
 return proofs;
}

export function verifyCartographySourceV104(source,corpusBytes){
 assert.equal(source.sourceCorpusSha256,sha(corpusBytes),'Corpus V6 du cartographe modifié');
 const corpus=JSON.parse(corpusBytes);
 assert.equal(source.source.sha256,corpus.source.sha256,'Provenance du classeur V6 incohérente');
 assert.equal(source.sceneId,'D6-W-PNJ-ROLE-12');
 assert.deepEqual(source.sheets.map(sheet=>[sheet.name,sheet.rows.map(row=>row.number)]),[['Scènes de dialogue V6',[392]],['Répliques V6',[3255,3256,3257,3258,3259,3260,3261,3262]],['Choix et actions V6',[806,807]]],'Cellules de cartographie attendues');
 for(const sheet of source.sheets)for(const row of sheet.rows){
  const actual=corpus.sheets.find(item=>item.name===sheet.name)?.rows.find(item=>item.number===row.number);
  assert.deepEqual(row,actual,`Cellules V6 du cartographe altérées : ${sheet.name}/${row.number}`);
 }
}

const entry=`
export * from './app/game/systems/pitWorkbookNormalsV104';
export {PIT_WORKBOOK_NORMAL_REGISTRY_V104} from './app/game/pitWorkbookNormalRegistryV104';
export {createPitCombatState} from './app/game/systems/pitCombat';
export {recordPitReplay} from './app/game/systems/pitReplay';
export * from './app/game/systems/homeworldCartographyDefinitionV104';
export {createGameReserveV66,createGameReserveV104,gameReserveV66World,gameReserveV66Sectors} from './app/game/systems/gameReserveV66';
export * from './app/game/systems/gameReserveLookoutV104';
export {WAR_PLANETS_V96} from './app/game/systems/clanWarPlanetsV96';
export {WAR_PLANET_TERRITORY_COUNTS_V103,WAR_PLANET_REGION_COUNTS_V103,normalizeWarPlanetRecipeV103,validateWarPlanetRecipeV103} from './app/game/systems/clanWarPlanetGeneratorV103';`;
const compile=()=>build({stdin:{contents:entry,resolveDir:ROOT},absWorkingDir:ROOT,bundle:true,write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});

export async function collectFollowupV104(registry=undefined){
 registry??=await json(REGISTRY);verifyRegistryV104(registry);
 assert.equal(sha(await read(registry.baseline.path)),registry.baseline.sha256,'Base V100 modifiée : actualiser explicitement le SHA V104 après gel');
 const versions=['611','612','613'];
 const fixed=[REGISTRY,WRITER,'scripts/build-excel-followup-v104.mjs','scripts/build-excel-followup-v100.mjs','scripts/build-excel-followup-v100.py','scripts/build-excel-followup-v99.mjs','package.json','package-lock.json',registry.baseline.path,'docs/YAUTJA_V99_SUIVI.xlsx','docs/v100-workstreams.json',PLAN,'app/game/data/pitWorkbookAnimationsV100.json','public/game/dialogues/v85/bible-dialogues.json',MASTER,...versions.flatMap(version=>[`docs/suivi-production/v${version}/data/production-manifest.json`,`app/game/data/enforcerProductionV${version}.json`]),...registry.workstreams.flatMap(item=>item.implementation)];
 const first=await compile(),imports=Object.keys(first.metafile.inputs).filter(file=>file!=='<stdin>');
 const guarded=[...fixed,...imports],before=await fingerprint(guarded);
 const compiled=await compile();assert.deepEqual(Object.keys(compiled.metafile.inputs),Object.keys(first.metafile.inputs),'Imports modifiés pendant la collecte');
 const api=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
 const legacyCombat=api.createPitCombatState('feral-hunter','scar'),normalCombat=api.createPitCombatState('feral-hunter','scar',{normalMoves:api.PIT_WORKBOOK_NORMALS_RECIPE_V104});
 const legacyReplay=api.recordPitReplay([[{},{}]],{fighters:['feral-hunter','scar']}),normalReplay=api.recordPitReplay([[{},{}]],{fighters:['feral-hunter','scar'],rules:{mode:'match',normalMoves:api.PIT_WORKBOOK_NORMALS_RECIPE_V104}});
 const pitVersions={legacySnapshot:legacyCombat.version,normalSnapshot:normalCombat.version,legacyReplayEngine:legacyReplay.engineVersion,normalReplayEngine:normalReplay.engineVersion};
 assert.deepEqual(pitVersions,{legacySnapshot:11,normalSnapshot:12,legacyReplayEngine:11,normalReplayEngine:12},'Versions explicites des simulations et replays Pit');
 const plan=await json(PLAN),extractionBytes=await read(plan.source.extractionPath);
 verifyNormalRowsV104(api.PIT_WORKBOOK_NORMALS_V104,plan,JSON.parse(extractionBytes),sha(extractionBytes));
 const assets=new Map();
 async function asset(relative,expected){
  assert.ok(local(relative)&&relative.startsWith('public/game/'),'Asset public local attendu');assert.match(expected??'',/^[a-f0-9]{64}$/,'SHA asset source requis');
  if(!assets.has(relative)){const bytes=await read(relative);assert.equal(sha(bytes),expected,`PNG natif modifié : ${relative}`);assets.set(relative,{path:relative,sha256:expected,bytes:bytes.length});}
  else assert.equal(assets.get(relative).sha256,expected,'Empreintes contradictoires');
 }
 const admissions=await json('app/game/data/pitWorkbookAnimationsV100.json');
 const normals=[];
 for(const move of api.PIT_WORKBOOK_NORMALS_V104){
  const definition=api.PIT_WORKBOOK_NORMAL_REGISTRY_V104.find(item=>item.fighterId===move.fighterId&&item.atlas.id.endsWith('-normal-v104-'+move.key));
  assert.ok(definition&&!definition.variantId,'Atlas BODY normal requis');
  assert.equal(definition.atlas.clips.length,6,'Six phases natives par normale');
  const phases=[];
  for(const facing of ['right','left'])for(const phase of ['startup','active','recovery']){
   const clip=definition.atlas.clips.find(item=>item.id===`pit.${move.posture}.workbook-v104.${move.key}.${phase}`&&item.facing===facing);
   assert.ok(clip?.status==='validated'&&!clip.loop&&clip.frames.length,'Phase native manquante');
   phases.push({facing,phase,clipId:clip.id,frames:clip.frames.length,nativeFrameTicks:clip.frames.reduce((sum,frame)=>sum+frame.durationTicks,0)});
  }
  const admission=admissions.find(item=>item.fighterId===move.fighterId&&item.actionId===move.actionId);assert.ok(admission);
  for(const page of definition.atlas.pages)await asset(path.posix.join('public',page.src),admission.review.sourceHashes?.[page.src]??admission.review.sourceSha256);
  normals.push({...move,recipe:api.PIT_WORKBOOK_NORMALS_RECIPE_V104,mechanicsStatus:'RUNTIME_OPT_IN',artStatus:'BODY_NATIF_REUTILISE',sourceSha256:plan.source.workbookSha256,extractionSha256:plan.source.extractionSha256,nativePhases:phases.length,phases,remaining:'Portée/puissance/stuns/pushback/combos hérités ; spéciaux, projections, entités, finishers et variantes ouverts.'});
 }
 const carto=api.HOMEWORLD_CARTOGRAPHY_V104;
 verifyCartographySourceV104(api.HOMEWORLD_CARTOGRAPHY_SOURCE_V104,await read('public/game/dialogues/v85/bible-dialogues.json'));
 assert.equal(carto.sceneId,'D6-W-PNJ-ROLE-12');assert.equal(api.HOMEWORLD_CARTOGRAPHY_SCENE_V104.address,'Scènes de dialogue V6!A392:Q392');
 assert.equal(api.HOMEWORLD_CARTOGRAPHY_LINES_V104.length,8);assert.ok(api.HOMEWORLD_CARTOGRAPHY_OPTION_V104.address.includes('807'));
 const cartography=[{option:'B',status:'RUNTIME_PARTIEL',...api.HOMEWORLD_CARTOGRAPHY_OPTION_V104,sceneId:carto.sceneId,routeId:carto.routeId,levelId:carto.levelId,districtId:carto.districtId,waypoints:carto.waypoints,remaining:'Validation ciblée explicite requise ; aucun dévoilement ni récompense.'},{option:'A',status:'OUVERT',sceneId:carto.sceneId,action:'Observation depuis un point haut : non incarnée par le lot V104',conditions:'Objet/service physique et visibilité à implémenter',consequence:'Aucune clôture V104',address:'Choix et actions V6!A806:H806',remaining:'Option source distincte restant ouverte.'}];
 const preserve=[api.createGameReserveV66(104),api.createGameReserveV104(104)].map(state=>({version:state.version,reserveId:state.reserveId,width:api.gameReserveV66World(state).width,sectors:api.gameReserveV66Sectors(state).length,fighters:state.humans.length,sectorIds:api.gameReserveV66Sectors(state).map(item=>item.id),status:state.version===1?'HISTORIQUE_CONSERVE':'RUNTIME_V2_EXPLICITE',scope:state.version===1?'Identité, coordonnées et sauvegardes historiques conservées.':'Quatrième secteur original ; 4/80 secteurs, 8/100 combattants ; pas une conversion silencieuse.'}));
 assert.deepEqual(preserve.map(item=>[item.version,item.width,item.sectors,item.fighters]),[[1,4800,3,8],[2,6400,4,8]],'Identités et compteurs Preserve V1/V2');
 const planets=api.WAR_PLANETS_V96.map(planet=>({kind:'HISTORIQUE',id:planet.id,name:planet.name,biome:planet.landBiome,surface:planet.surface.kind,territories:planet.territories.length,regions:planet.regions.length,scope:'Monde historique original du projet ; version et archives conservées.'}));
 assert.equal(planets.length,30);let formatCount=0;
 for(const territories of api.WAR_PLANET_TERRITORY_COUNTS_V103)for(const regions of api.WAR_PLANET_REGION_COUNTS_V103){
  if(territories<3*regions)continue;
  assert.ok(api.validateWarPlanetRecipeV103(api.normalizeWarPlanetRecipeV103({territoryCount:territories,regionCount:regions})));
  planets.push({kind:'FORMAT_PROC_V103',id:`v103:${territories}/${regions}`,name:`${territories} sites / ${regions} régions`,territories,regions,scope:'Format compatible, pas une planète historique supplémentaire ; espace de graines uint32 fini.'});formatCount++;
 }
 assert.equal(formatCount,27,'Formats V103 compatibles');
 const variants=[];
 for(const version of versions){
  const manifest=await json(`docs/suivi-production/v${version}/data/production-manifest.json`),runtime=await json(`app/game/data/enforcerProductionV${version}.json`);
  assert.equal(manifest.assets.length,36);assert.equal(runtime.assets.length,36);
  for(const item of manifest.assets){
   const bound=runtime.assets.find(row=>row.identityId===item.id);assert.ok(bound&&'public'+bound.src===item.repoPngPath&&bound.sha256===item.sha256,'Raccord natif Enforcer absent');
   await asset(item.repoPngPath,item.sha256);
   variants.push({id:item.id,group:item.groupFR,variant:item.variant,label:item.nameFR,sourceRow:item.sourceWorkbookRow,version:`V6.${version.slice(1)}`,status:'PNG_DISPONIBLE',ledgerStatus:item.statusFR,png:item.repoPngPath,sha256:item.sha256,animated:item.animated===true,placed:item.newMapPlacement===true,canonical:item.canonicalFidelityCertified===true,remaining:'Pose fixe et disponibilité vérifiées ; animation, placement et canon 1:1 ne sont pas déduits de cette image.'});
  }
 }
 const master=JSON.parse(gunzipSync(await read(MASTER)));assert.equal(master.rows.length,5120);
 const pending=master.rows.filter(row=>row.values.A.endsWith('--enforcers-comics-10'));
 assert.equal(pending.length,18);assert.ok(pending.every(row=>row.values.E==='Pas faite'),'La variante 10 exige une nouvelle production documentée');
 variants.push(...pending.map(row=>({id:row.values.A,group:row.values.B,variant:10,label:row.values.I,sourceRow:row.rowNumber,version:'SOURCE_MASTER_V613',status:'MANQUANT_PNG',ledgerStatus:row.values.E,png:'',sha256:'',animated:false,placed:false,canonical:false,remaining:row.values.G})));
 const finalManifest=await json('docs/suivi-production/v613/data/production-manifest.json');
 const historicCounts={};for(const row of master.rows)historicCounts[row.values.E]=(historicCounts[row.values.E]??0)+1;
 const mergedCounts={...historicCounts},cohortIds=finalManifest.assets.map(item=>item.id),attestation=registry.enforcerMainReconciliation;
 assert.equal(cohortIds.length,attestation.cohortCount);assert.equal(attestation.cohortManifest,'docs/suivi-production/v613/data/production-manifest.json');
 for(const id of cohortIds){assert.equal(master.rows.find(row=>row.values.A===id)?.values.E,'Conservée hors main','Cohorte historique de réconciliation altérée');mergedCounts['Conservée hors main']--;mergedCounts['Présente dans main']++;}
 assert.deepEqual(mergedCounts,attestation.claimedCounts,'Compteurs de réconciliation main incohérents');
 const enforcerReconciliation={...attestation,historicCounts,mergedCounts,cohortIds,finalReceiptsRecovered:finalManifest.summary.matchingFinalReceiptsRecovered,finalReceiptsMissing:finalManifest.summary.finalReceiptsNotRecovered};
 assert.equal(enforcerReconciliation.finalReceiptsRecovered+enforcerReconciliation.finalReceiptsMissing,36);
 const historical=await json('docs/v100-workstreams.json');
 const openItems=[...historical.pitOpen.map(item=>({id:item.workbookId,domain:'The Pit',source:item.sourceCells,status:'OUVERT',remaining:item.note})),...historical.structures.filter(item=>item.status==='OUVERT').map(item=>({id:item.id,domain:'Guerre de clans',source:`${item.sheet}!${item.cells.join(',')}`,status:'OUVERT',remaining:item.remaining})),...pending.map(row=>({id:row.values.A,domain:'Enforcers',source:`Master V6.13 ligne ${row.rowNumber}`,status:'MANQUANT_PNG',remaining:row.values.G})),{id:'CARTOGRAPHE-OPTION-A',domain:'Homeworld',source:'Choix et actions V6!A806:H806',status:'OUVERT',remaining:'Point haut et observation physique non incarnés.'},{id:'PRESERVE-SECTEURS',domain:'Preserve Hunt',source:'PRESERVE-EXPANSION-80',status:'LIVRE_PARTIEL',remaining:'4/80 secteurs ; 76 encore à produire.'},{id:'PRESERVE-COMBATTANTS',domain:'Preserve Hunt',source:'PRESERVE-EXPANSION-80',status:'LIVRE_PARTIEL',remaining:'8/100 combattants ; 92 encore à produire.'},{id:'PIT-KITS-COMPLETS',domain:'The Pit',source:'05_MOVES_PROPOSES et 07_PRESENTATIONS, lignes Feral/Scar',status:'OUVERT',remaining:'Personnages complets, spéciaux, projections, entités, finishers et costumes non clos.'}];
 openItems.push({id:'ENFORCERS-V613-RECEIPTS',domain:'Provenance Enforcers',source:'V6.13 production-manifest.json / summary',status:'OUVERT',remaining:`${enforcerReconciliation.finalReceiptsMissing} prompts/reçus finaux non récupérés ; ${enforcerReconciliation.finalReceiptsRecovered} retrouvés. Les prompts planifiés ne sont pas des soumissions attestées.`},{id:'ENFORCERS-V610-TRACES',domain:'Provenance Enforcers',source:`Attestation de réconciliation ${attestation.mergeCommit}`,status:'OUVERT',remaining:`${attestation.unrecoveredV610TraceRecords} traces historiques V6.10 sans PNG récupéré ; zéro fichier produit ajouté à ce titre.`});
 const proofs=await verifyFinalProofsV104(registry.workstreams);
 const required=[...guarded,plan.source.extractionPath,...assets.keys(),...proofs.map(item=>item.path)];
 const inputs=await fingerprint(required),inputMap=new Map(inputs.map(item=>[item.path,item.sha256]));
 for(const item of [...assets.values(),...proofs])assert.equal(inputMap.get(item.path),item.sha256,`Asset ou preuve modifié pendant la collecte : ${item.path}`);
 assert.deepEqual(await fingerprint(guarded),before,'Entrées modifiées pendant la collecte V104 ; attendre le gel runtime');
 const facts={normalMoves:normals.length,normalOrientations:normals.length*2,nativeNormalPhases:normals.reduce((sum,item)=>sum+item.nativePhases,0),historicalBodyStudies:historical.facts.admittedActions,historicalBodyOrientations:historical.facts.admittedOrientations,cartographyImplementedOptions:1,cartographyOpenOptions:1,preserveHistoricalSectors:preserve[0].sectors,preserveSectors:preserve[1].sectors,preserveSectorTarget:80,preserveFighters:preserve[1].fighters,preserveFighterTarget:100,historicalPlanets:30,proceduralFormatsV103:formatCount,enforcerNativeV613:36,enforcerNativeCumulative:variants.filter(item=>item.status==='PNG_DISPONIBLE').length,enforcerVariant10Missing:pending.length,variantMasterIdentities:master.rows.length,openPitDossiers:historical.pitOpen.length,openWarStructures:historical.structures.filter(item=>item.status==='OUVERT').length};
 return {schemaVersion:1,release:'V104',asOf:registry.asOf,baseline:registry.baseline,baselineFreeze:registry.baselineFreeze,method:'Exports runtime compilés et comparés aux extractions épinglées ; SHA des fichiers réellement lus. Les statuts de preuve sont déclarés explicitement, aucun test exécuté par ce collecteur.',facts,delivery:{characters:'OUVERT',completeKits:'OUVERT',entities:'OUVERT',variantAnimations:'OUVERT',canonicalFidelity:'NON_CERTIFIE',scope:'18 normales opt-in, option B du cartographe, quatrième secteur V2, générateur V103 et poses natives : périmètres distincts.'},workstreams:registry.workstreams,normals,pitVersions,cartography,cartographyLines:api.HOMEWORLD_CARTOGRAPHY_LINES_V104,preserve,planets,variants,enforcerReconciliation,openItems,validations:registry.validations,inputs,assets:[...assets.values()].sort((a,b)=>a.path.localeCompare(b.path)),limits:registry.limits};
}

const column=(key,label,width=25)=>({key,label,width});
const text=value=>Array.isArray(value)?value.map(item=>typeof item==='string'?item:JSON.stringify(item)).join('\n'):value;
export function buildSheetsV104(snapshot){
 const sheet=(name,title,columns,rows)=>({name,title,subtitle:`V104 · ${snapshot.asOf} · sources, runtime, preuve et reste distincts`,columns,rows:rows.map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key,text(value)])))});
 const metric=(label,value,scope,formula)=>({label,value:formula?{formula,cached:value}:value,scope});
 const summary=[
  metric('Normales Feral et Scar',snapshot.facts.normalMoves,'Neuf commandes par personnage ; recette explicite.',"COUNTA('NormalesV104'!B5:B22)"),
  metric('Orientations natives des normales',snapshot.facts.normalOrientations,'Deux orientations admises existantes par normale.'),
  metric('Phases natives des normales',snapshot.facts.nativeNormalPhases,'Trois phases par sens ; aucun nouveau PNG.'),
  metric('Études BODY historiques V100',snapshot.facts.historicalBodyStudies,'52 études ; la nouvelle mécanique ne clôt pas les kits.'),
  metric('Snapshot Pit historique',snapshot.pitVersions.legacySnapshot,'Sans recette V104 : version historique conservée.'),
  metric('Snapshot Pit normales V104',snapshot.pitVersions.normalSnapshot,'Recette workbook-v104 explicite ; les anciens lecteurs refusent cette version.'),
  metric('Moteur replay historique',snapshot.pitVersions.legacyReplayEngine,'Replay créé sans recette V104.'),
  metric('Moteur replay normales V104',snapshot.pitVersions.normalReplayEngine,'Replay créé par le recorder réel avec la recette explicite.'),
  metric('Options cartographe incarnées partiellement',1,'Option B, marche entre repères connus.',"COUNTIF('CartographieV104'!A5:A6,\"B\")"),
  metric('Options cartographe ouvertes',1,'Option A du point haut.',"COUNTIF('CartographieV104'!B5:B6,\"OUVERT\")"),
  metric('Secteurs Preserve V2',snapshot.facts.preserveSectors,'4/80 ; ancienne V1 de trois secteurs conservée.'),
  metric('Combattants Preserve',snapshot.facts.preserveFighters,'8/100 ; aucune nouvelle animation déduite.'),
  metric('Planètes historiques',snapshot.facts.historicalPlanets,'Trente mondes distincts des formats de recette.',`COUNTIF('PlanetesV104'!A5:A${snapshot.planets.length+4},"HISTORIQUE")`),
  metric('Formats procéduraux V103',snapshot.facts.proceduralFormatsV103,'Couples compatibles territoires/régions.',`COUNTIF('PlanetesV104'!A5:A${snapshot.planets.length+4},"FORMAT_PROC_V103")`),
  metric('PNG Enforcers cumulés',snapshot.facts.enforcerNativeCumulative,'V6.11–V6.13 ; poses fixes.',`COUNTIF('VariantesV104'!G5:G${snapshot.variants.length+4},"PNG_DISPONIBLE")`),
  metric('Enforcers 10 sans PNG accepté',snapshot.facts.enforcerVariant10Missing,'Identités exactes du master de 5 120 lignes.',`COUNTIF('VariantesV104'!G5:G${snapshot.variants.length+4},"MANQUANT_PNG")`),
  ...Object.entries(snapshot.enforcerReconciliation.mergedCounts).map(([status,count])=>metric(`Lineage cumulatif · ${status}`,count,`Réconciliation déclarée de 5 120 identifiants, commit ${snapshot.enforcerReconciliation.mergeCommit} ; pas un nouveau lot de PNG certifiés.`)),
  metric('Reçus finaux V6.13 non récupérés',snapshot.enforcerReconciliation.finalReceiptsMissing,'15 récupérés / 21 manquants ; images et traçabilité restent distinctes.'),
  metric('Traces V6.10 sans PNG récupéré',snapshot.enforcerReconciliation.unrecoveredV610TraceRecords,'Historique uniquement ; aucun nouveau fichier compté.'),
  metric('Dossiers Pit historiques ouverts',snapshot.facts.openPitDossiers,'Aucun dossier renommé ou clôturé par les normales.'),
  metric('Ouvrages de clans ouverts',snapshot.facts.openWarStructures,'Six dossiers conservés ouverts.'),
  ...['EN_COURS','A_VALIDER','OUVERT','LIVRE_PARTIEL','VALIDE_CIBLE'].map(status=>metric(`Chantiers ${status}`,snapshot.workstreams.filter(item=>item.status===status).length,'Portée et preuves explicites.',`COUNTIF('ChantiersV104'!E5:E${snapshot.workstreams.length+4},"${status}")`)),
  metric('Feuilles V100 conservées',27,snapshot.baseline.path),metric('Application Excel native vérifiée','NON','Contrôle ZIP/XML et caches uniquement.'),
 ];
 return [
  sheet('SyntheseV104','YAUTJA · suivi actif V104',[column('label','Indicateur',52),column('value','Valeur',25),column('scope','Portée / limite',110)],summary),
  sheet('ChantiersV104','Chantiers et preuves V104',[column('id','ID',35),column('domain','Domaine'),column('title','Chantier',55),column('source','Source / cellules',90),column('status','Statut'),column('validationScope','Portée de validation',38),column('runtime','Runtime',110),column('tests','Tests déclarés',70),column('browser','Navigateur déclaré',70),column('proof','Preuves avec SHA',100),column('remaining','Reste ouvert',120),column('implementation','Implémentation',100)],snapshot.workstreams),
  sheet('NormalesV104','18 normales · source et recette de combat',[column('fighterId','Personnage'),column('actionId','ID source',30),column('key','Commande',16),column('sheet','Feuille',28),column('cell','Cellule',15),column('label','Libellé',45),column('startup','Préparation',18),column('active','Actif',16),column('recovery','Récupération',18),column('damage','Dégâts de base',20),column('hitLevel','Hauteur',18),column('antiAir','Anti-air',16),column('recipe','Recette explicite',28),column('mechanicsStatus','État mécanique',30),column('artStatus','État visuel',32),column('nativePhases','Phases natives',22),column('sourceText','Texte source exact',120),column('sourceSha256','SHA source V54',72),column('remaining','Reste / adaptation moteur',120)],snapshot.normals),
  sheet('CartographieV104','Cartographe V6 · options et répliques source',[column('option','Option',16),column('status','État',25),column('sceneId','Scène source',35),column('address','Cellules source',60),column('action','Action source / périmètre',115),column('conditions','Conditions',100),column('consequence','Conséquence',100),column('routeId','Route physique',40),column('waypoints','Repères connus',100),column('speaker','Locuteur source',30),column('text','Réplique source exacte',120),column('gesture','Geste source',90),column('remaining','Reste ouvert',100)],[...snapshot.cartography,...snapshot.cartographyLines.map(line=>({...line,option:line.option||'INTRO',status:'REPLIQUE_SOURCE',sceneId:'D6-W-PNJ-ROLE-12',remaining:'Texte documentaire exact ; sa présence ne valide pas une interaction jouée.'}))]),
  sheet('PreserveV104','Preserve · identités et terrains versionnés',[column('version','Version',18),column('reserveId','Identité de terrain',45),column('width','Largeur',18),column('sectors','Secteurs',18),column('fighters','Combattants',20),column('status','État',30),column('sectorIds','Secteurs réels',80),column('scope','Portée / limite',120)],snapshot.preserve),
  sheet('PlanetesV104','Mondes historiques et formats V103',[column('kind','Type',30),column('id','Identité',35),column('name','Monde / format',40),column('biome','Biome'),column('surface','Surface'),column('territories','Territoires',18),column('regions','Régions',18),column('scope','Portée',120)],snapshot.planets),
  sheet('VariantesV104','Enforcers · disponibilité et manquants',[column('id','Identité source',65),column('group','Groupe',40),column('variant','Variante',18),column('label','Nom',40),column('sourceRow','Ligne source',18),column('version','Lot source',28),column('status','État disponibilité',30),column('ledgerStatus','Statut historique master',35),column('animated','Animé',18),column('placed','Nouveau placement',24),column('canonical','Canon 1:1 certifié',25),column('png','PNG réel',100),column('sha256','SHA-256',72),column('remaining','Reste / limite',120)],snapshot.variants),
  sheet('ManquantsV104','Dossiers restant explicitement ouverts',[column('id','ID',65),column('domain','Domaine'),column('source','Source / cellules',95),column('status','État',28),column('remaining','Travail restant',130)],snapshot.openItems),
  sheet('SourcesV104','Sources, référence historique et images réellement vérifiées',[column('path','Fichier',110),column('sha256','SHA-256',72),column('scope','Portée',120)],[{...snapshot.baseline,scope:'Base V100 explicitement épinglée ; 27 feuilles conservées.'},...snapshot.assets.map(item=>({...item,scope:`Fichier natif disponible : ${item.bytes} octets ; aucune nouvelle preuve d’animation ou de canon.`}))]),
  sheet('ValidationsV104','Déclarations de validation explicites',[column('id','ID',40),column('status','État',25),column('scope','Portée',110),column('command','Commande / procédure',110),column('evidence','Preuves',110),column('limit','Limite',120)],snapshot.validations),
  sheet('EntreesV104','Manifeste des entrées réellement lues',[column('path','Fichier',110),column('sha256','SHA-256',72)],snapshot.inputs),
  sheet('JournalV104','Méthode et limites',[column('subject','Sujet',45),column('detail','Décision / limite',140)],[{subject:'Méthode',detail:snapshot.method},{subject:'Gel de la base',detail:snapshot.baselineFreeze},{subject:'Registre éditable',detail:REGISTRY},{subject:'Génération',detail:'node scripts/build-excel-followup-v104.mjs'},{subject:'Vérification',detail:'node scripts/build-excel-followup-v104.mjs --check'},...snapshot.limits.map((detail,index)=>({subject:`Limite ${index+1}`,detail}))]),
 ];
}

export async function generateFollowupV104({outputDir=path.join(ROOT,'docs'),check=false}={}){
 const snapshot=await collectFollowupV104(),sheets=buildSheetsV104(snapshot);
 const workbook=await writeWorkbookV104(snapshot.baseline,sheets),structural=await verifyWorkbookV104(workbook,snapshot.baseline);
 const qa={schemaVersion:1,release:'V104',result:'PASS_STRUCTURE',scope:'Contrôles exécutés : SHA des sources/images, cellules source, formats runtime, ZIP/XML, préservation des 27 feuilles et caches de formules. Aucun test de jeu ou navigateur n’est exécuté par le générateur.',workbook:'docs/YAUTJA_V104_SUIVI.xlsx',sha256:sha(workbook),bytes:workbook.length,inputFingerprintsVerified:snapshot.inputs.length,assetsVerified:snapshot.assets.length,facts:snapshot.facts,delivery:snapshot.delivery,...structural,nativeExcelApplicationVerified:false,nativeExcelCalculationEngineExecuted:false};
 const products=[Buffer.from(JSON.stringify(snapshot,null,2)+'\n'),workbook,Buffer.from(JSON.stringify(qa,null,2)+'\n')];
 if(!check)await fs.mkdir(outputDir,{recursive:true});
 for(const [index,name]of OUTPUTS.entries()){
  const target=path.join(outputDir,name);
  if(check){const current=await fs.readFile(target);if(!current.equals(products[index]))throw new Error(`Suivi V104 périmé : ${name}. Relancer node scripts/build-excel-followup-v104.mjs.`);}
  else await fs.writeFile(target,products[index]);
 }
 return {snapshot,qa,workbookSha256:sha(workbook),bytes:workbook.length,outputDir};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const args=process.argv.slice(2),at=args.indexOf('--output-dir');
 assert.ok(args.every((arg,index)=>['--check','--output-dir'].includes(arg)||at>=0&&index===at+1)&&(at<0||args[at+1]),'Usage : node scripts/build-excel-followup-v104.mjs [--check] [--output-dir chemin]');
 const result=await generateFollowupV104({check:args.includes('--check'),...(at>=0?{outputDir:path.resolve(args[at+1])}:{})});
 console.log(JSON.stringify({result:'PASS_STRUCTURE',mode:args.includes('--check')?'check':'generate',bytes:result.bytes,sha256:result.workbookSha256,inputs:result.snapshot.inputs.length,facts:result.snapshot.facts}));
}
