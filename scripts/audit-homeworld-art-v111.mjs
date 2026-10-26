#!/usr/bin/env node
/** Current family candidates are not completed sprites or native animations. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath, pathToFileURL} from 'node:url';
import ts from 'typescript';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const OUTPUT_V111 = 'docs/v111-homeworld-art-inventory.json';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const BASE_ART_COMMIT_V111='dff1f6734284891b5a24238f890070616a8325cc';
const execute=promisify(execFile);
const local = file => typeof file === 'string' && file && !path.isAbsolute(file) && !file.split('/').some(s => !s || s === '.' || s === '..');
const relative = (root, file) => path.relative(root, file).split(path.sep).join('/');
const pin = (root, file) => {assert(local(file)); const bytes = fs.readFileSync(path.join(root, file)); return {path:file,bytes:bytes.length,sha256:sha(bytes)};};

/** Same relative-module transpilation as the existing QA loader, with every
 * actual read recorded. No rendering, source replacement or runtime writes. */
function model(root) {
  const cache = new Map(), inputs = new Set();
  function load(file) {
    const absolute = path.resolve(root, file); assert(absolute.startsWith(root + path.sep));
    if (cache.has(absolute)) return cache.get(absolute).exports;
    const item = {exports:{}}; cache.set(absolute,item); inputs.add(relative(root,absolute));
    const bytes = fs.readFileSync(absolute);
    if (absolute.endsWith('.json')) return item.exports = JSON.parse(bytes);
    const javascript = ts.transpileModule(bytes.toString('utf8'), {fileName:absolute,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true,resolveJsonModule:true}}).outputText;
    const requireRelative = specifier => {
      assert(specifier.startsWith('.'),'Only actual relative project modules are admitted');
      const candidate = path.resolve(path.dirname(absolute),specifier), next = [candidate,candidate+'.ts',candidate+'.json'].find(p=>fs.existsSync(p)&&fs.statSync(p).isFile());
      assert(next,'Missing QA dependency: '+candidate); return load(relative(root,next));
    };
    new Function('require','module','exports',javascript)(requireRelative,item,item.exports); return item.exports;
  }
  return {api:Object.assign({},load('app/game/systems/homeworldAssetCatalogueV81.ts'),load('app/game/systems/homeworldContextCodexV71.ts')),inputs};
}
function imageFiles(root, directory) {
  return fs.readdirSync(path.join(root,directory),{withFileTypes:true}).flatMap(entry=>{
    const file=directory+'/'+entry.name;
    return entry.isDirectory()?imageFiles(root,file):entry.isFile()&&/\.(png|webp|jpe?g|svg)$/i.test(file)?[file]:[];
  }).sort();
}

export function validateArtInventoryV111(report) {
  assert.equal(report.schemaVersion,1); assert.equal(report.release,'V111');
  assert.equal(report.entries.length,354); assert.equal(new Set(report.entries.map(row=>row.id)).size,354);
  assert.deepEqual([...new Set(report.entries.map(row=>row.section))],Array.from({length:22},(_,i)=>55+i));
  assert.deepEqual(report.sourceClosures,[]); assert.equal(report.sourceCompletion,false);
  assert(report.entries.every(row=>row.status!=='EXISTING_GOOD'&&row.currentAssessment==='FAMILY_CANDIDATES_NOT_VISUALLY_CERTIFIED'));
  assert.deepEqual(report.counts.byCandidateStatus,{EXISTING_NEEDS_VARIANT:313,MISSING:40,MISSING_ANIMATION:1});
  assert.equal(report.installedFiles.length,790);assert.equal(report.nativeDrawingAssets.length,4);
  assert.equal(report.counts.installedHomeworldImages,794);assert.equal(report.counts.newInstalledImages,4);
  assert.equal(report.counts.missingReferencedFiles,0);assert.deepEqual(report.missingReferencedFiles,[]);
  assert.equal(new Set(report.installedFiles.map(row=>row.path)).size,790);
  assert(report.installedFiles.every(row=>local(row.path)&&/^[a-f0-9]{64}$/.test(row.sha256)&&Number.isSafeInteger(row.bytes)&&row.bytes>0&&/^[a-f0-9]{40}$/.test(row.gitBlobOid)&&row.gitSourceCommit===BASE_ART_COMMIT_V111));
  assert.deepEqual(report.nativeDrawingAssets.map(row=>row.id),['listen','explain','indicate','return']);
  assert(report.nativeDrawingAssets.every(row=>row.actual&&row.actual.path==='public'+row.source&&/^[a-f0-9]{64}$/.test(row.actual.sha256)&&Number.isSafeInteger(row.actual.bytes)&&row.actual.bytes>0&&!row.actual.gitBlobOid));
  assert(report.nativeDrawingAssets.every(row=>!report.installedFiles.some(old=>old.path===row.actual.path)));
  for(const row of report.entries) {
    assert(row.id&&row.family&&row.label&&row.assessment);
    assert.equal(row.consumerIds.length,Math.min(row.consumerCount,8));
    assert(row.candidateEvidence.every(p=>local(p.path)&&/^[a-f0-9]{64}$/.test(p.sha256)&&Number.isSafeInteger(p.bytes)&&p.bytes>0));
    if(row.status==='MISSING') assert.equal(row.candidateEvidence.length,0);
  }
  assert.equal(report.extraArtNeeds[0].id,'HW111-K17-NATIVE-CONVERSATION');
  assert.equal(report.extraArtNeeds[0].catalogue354Id,null,'NPC conversation must not close a prop target');
  assert(report.extraArtNeeds[0].remaining.includes('manipulation'));
  return report;
}

/** Sparse CI can check a recorded old blob's repository identity without
 * pretending to have read its pixels. Newly delivered PNGs never use that path. */
export async function verifyArtInventoryIdentityV111(report, root=ROOT) {
  validateArtInventoryV111(report); root=path.resolve(root);
  const tree=new Map((await execute('git',['ls-tree','-r','--full-tree','HEAD'],{cwd:root,maxBuffer:32*1024*1024})).stdout.trim().split('\n').flatMap(line=>{const m=line.match(/^[0-7]+ blob ([a-f0-9]{40})\t(.+)$/);return m?[[m[2],m[1]]]:[];}));
  let oldBytesVerified=0;
  for(const row of report.installedFiles){
    assert(local(row.path));assert.equal(row.gitSourceCommit,BASE_ART_COMMIT_V111);assert.match(row.gitBlobOid,/^[a-f0-9]{40}$/);
    assert.equal(tree.get(row.path),row.gitBlobOid,'Current repository tree differs: '+row.path);
    const file=path.join(root,row.path);
    if(fs.existsSync(file)){
      const bytes=fs.readFileSync(file);assert.equal(bytes.length,row.bytes);assert.equal(sha(bytes),row.sha256);
      assert.equal(createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex'),row.gitBlobOid);oldBytesVerified++;
    }
  }
  const verifyBytes=row=>{assert(local(row.path));const bytes=fs.readFileSync(path.join(root,row.path));assert.equal(bytes.length,row.bytes);assert.equal(sha(bytes),row.sha256,'Recorded bytes changed: '+row.path);};
  report.sourceInputs.forEach(verifyBytes);
  for(const row of report.nativeDrawingAssets){assert(row.actual,'A new native image must have measured delivery bytes');verifyBytes(row.actual);}
  return{oldGitTreeIdentitiesVerified:report.installedFiles.length,oldBytesVerified,newNativeBytesVerified:report.nativeDrawingAssets.length,sourceInputsVerified:report.sourceInputs.length,visualCompletionVerified:false};
}

export async function buildArtInventoryV111(root = ROOT) {
  root=path.resolve(root); const {api,inputs}=model(root), installedFiles=imageFiles(root,'public/game/homeworld');
  const tree = new Map((await execute('git',['ls-tree','-r','--full-tree',BASE_ART_COMMIT_V111,'--','public/game/homeworld'],{cwd:root,maxBuffer:8*1024*1024})).stdout.trim().split('\n').flatMap(line=>{const match=line.match(/^[0-7]+ blob ([a-f0-9]{40})\t(.+)$/);return match?[[match[2],match[1]]]:[];}));
  const pins = new Map();
  const actualPin = file => {
    if(pins.has(file))return pins.get(file);
    const bytes=fs.readFileSync(path.join(root,file)),row={path:file,bytes:bytes.length,sha256:sha(bytes)};
    if(tree.has(file)){
      const actualOid=createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
      assert.equal(actualOid,tree.get(file),'Old installed pixels differ from their recorded Git tree: '+file);
      row.gitBlobOid=actualOid;row.gitSourceCommit=BASE_ART_COMMIT_V111;
    }
    pins.set(file,row);return row;
  };
  const historicalInstalledFiles=installedFiles.filter(file=>tree.has(file));
  const installedSources=installedFiles.map(file=>'/'+file.slice('public/'.length));
  const allRecords=api.HOMEWORLD_ALL_ELEMENT_CODEX_V71, candidates=api.auditHomeworldAssetCatalogueV81(allRecords,installedSources);
  const assetPaths=[...new Set(allRecords.map(row=>row.asset).filter(value=>typeof value==='string'&&value.startsWith('/')&&!value.startsWith('//')))];
  const missing=assetPaths.filter(src=>!fs.existsSync(path.join(root,'public'+src)));
  const evidenceFor = source => {const file='public'+source; return fs.existsSync(path.join(root,file))?actualPin(file):null;};
  const catalogue=candidates.map(row=>({...row,currentAssessment:'FAMILY_CANDIDATES_NOT_VISUALLY_CERTIFIED',candidateEvidence:[...new Set([...row.sourceCandidates,...row.installedOnlyCandidates])].map(evidenceFor).filter(Boolean)}));
  const walkingFile='app/game/data/homeworldCivilianMotionV74.json',variantsFile='app/game/data/homeworldNpcVariantsV84.json',world='app/game/HomeworldArchivePlaqueWorldV109.tsx',brief='docs/specifications/homeworld-v81/mission-homeworld-original.txt';
  const walking=JSON.parse(fs.readFileSync(path.join(root,walkingFile),'utf8')),archivist=walking.roles.archivist,variants=JSON.parse(fs.readFileSync(path.join(root,variantsFile),'utf8')).variants.filter(row=>row.role==='archivist');
  const motionSourceIds=[...new Set([...archivist.clips.left,...archivist.clips.right].map(frame=>frame.sourceId))];
  const motionSources=motionSourceIds.map(id=>{const source=walking.sources[id];return{id,src:source.src,width:source.width,height:source.height,actual:evidenceFor(source.src)};});
  const bodyManifest='app/game/data/homeworldArchivistMotionV111.json';
  let body=null;
  if(fs.existsSync(path.join(root,bodyManifest))) {
    const data=JSON.parse(fs.readFileSync(path.join(root,bodyManifest),'utf8'));
    body={manifest:pin(root,bodyManifest),status:data.status,sources:(data.frames??[]).map(frame=>({id:frame.id,source:frame.src,actual:evidenceFor(frame.src)})),browserCertified:false};
  }
  const extraArtNeeds=[{
    id:'HW111-K17-NATIVE-CONVERSATION',catalogue354Id:null,
    source:{path:brief,section:15,lines:[757,770],bibleScene:'D6-W-PNJ-ROLE-03',bibleLines:[3183,3190]},
    historicalHostV109:{path:world,component:'HomeworldModularHunter',morphId:'classic',headStyleId:'reference',skinId:'ashen-mottle',status:'STATIC_BITMAP_COMPOSITION_NOT_NATIVE_TALK'},
    currentBinding:{path:'app/game/HomeworldWorldSceneV77.tsx',component:fs.readFileSync(path.join(root,'app/game/HomeworldWorldSceneV77.tsx'),'utf8').includes('HomeworldArchivePlaqueWorldV111')?'HomeworldArchivePlaqueWorldV111':'HomeworldArchivePlaqueWorldV109',browserCertified:false},
    relatedHistoricalArt:{walking:{role:'archivist',leftDrawings:archivist.clips.left.length,rightDrawings:archivist.clips.right.length,sources:motionSources},staticVariants:{count:variants.length,motionStatuses:[...new Set(variants.map(v=>v.motionStatus))],manifest:pin(root,variantsFile)}},
    nativeConversationV111:body,
    proposedDelivery:'Four independent native whole-body conversation key drawings for K-17 only, fixed authored facing and uniform scale; never remote object grasping.',
    remaining:'La manipulation corporelle d’objets, la marche du K-17, les autres métiers/PNJ et les orientations supplémentaires restent ouverts. Le poste et ses supports sont distants ; une désignation n’est pas une prise réelle.',
  }];
  [walkingFile,variantsFile,world,'app/game/HomeworldWorldSceneV77.tsx',brief,'app/game/data/homeworldAssetCatalogueTargetV81.json','scripts/audit-homeworld-art-v111.mjs',...(body?[
    bodyManifest,'scripts/build-homeworld-archivist-art-v111.mjs','app/game/HomeworldArchivePlaqueWorldV111.tsx','app/game/HomeworldArchivePlaqueV111.tsx',
    'app/game/HomeworldArchivistMotionV111.tsx','app/game/HomeworldArchivistPortraitV111.tsx','app/game/systems/homeworldArchivistMotionV111.ts',
    'art-source/v111/archivist-conversation/generation-receipts.json','art-source/v111/archivist-conversation/visual-review.json',
  ]:[])].forEach(file=>inputs.add(file));
  const counts=catalogue.reduce((out,row)=>(out[row.status]=(out[row.status]??0)+1,out),{});
  return validateArtInventoryV111({schemaVersion:1,release:'V111',asOf:'2026-10-26',status:missing.length?'FAIL_REFERENCED_FILES':'PASS_INVENTORY_WITH_OPEN_ART_NEEDS',
    method:'Actual current V81 family matcher and current codex consumers, current installed files and exact hashes. A matching family, static variant or walking drawing never certifies all requested native silhouettes, orientations or job animations. This audit does not render pixels, calculate gameplay completion or run a browser.',
    counts:{targetEntries:354,targetFamilies:22,installedHomeworldImages:installedFiles.length,historicalInstalledImages:historicalInstalledFiles.length,newInstalledImages:installedFiles.length-historicalInstalledFiles.length,codexRecords:allRecords.length,referencedLocalAssets:assetPaths.length,missingReferencedFiles:missing.length,byCandidateStatus:counts,newlyClosed354Targets:0},
    sourceCompletion:false,sourceClosures:[],missingReferencedFiles:missing,entries:catalogue,
    installedFiles:historicalInstalledFiles.map(file=>actualPin(file)),nativeDrawingAssets:body?.sources??[],sourceInputs:[...inputs].sort().map(file=>pin(root,file)),extraArtNeeds,
    limits:['No EXISTING_GOOD or source closure is inferred automatically.','The354 target families and NPC BODY/activity requirements are distinct inventories.','Old790image bytes are SHA256-verified locally and bound to their exact Git blob OIDs. A sparse CI may verify those OIDs against its HEAD tree without fetching absent PNGs; this is repository identity, not a repeated pixel/quality inspection. New admitted PNGs always require actual byte/SHA verification.','Related source hashes prove identity and presence, not current visual adequacy or browser admission.','V84 static portraits and V74 walking drawings are kept separate from a K-17 conversation sequence.','No canonical identity or universal Yautja institution is created by this local role.']});
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const args=process.argv.slice(2);assert(args.length===1&&['--write','--check'].includes(args[0]),'Usage: node scripts/audit-homeworld-art-v111.mjs --write|--check');
  const report=await buildArtInventoryV111(),bytes=Buffer.from(JSON.stringify(report,null,2)+'\n');
  if(args[0]==='--write')fs.writeFileSync(path.join(ROOT,OUTPUT_V111),bytes);else assert.deepEqual(fs.readFileSync(path.join(ROOT,OUTPUT_V111)),bytes,'Current artistic inventory changed');
  console.log(JSON.stringify({status:report.status,path:OUTPUT_V111,sha256:sha(bytes),bytes:bytes.length,counts:report.counts}));
  if(report.missingReferencedFiles.length)process.exitCode=1;
}
