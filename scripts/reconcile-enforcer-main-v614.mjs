import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {homeworldSceneSsrV78} from '../tests/helpers/homeworld-scene-ssr-v78.mjs';

// Read immutable Git objects. This script never moves or merges a Git ref.
const base='docs/suivi-production/v614';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const write=(p,v)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const blob=b=>crypto.createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
const git=(...args)=>execFileSync('git',args,{maxBuffer:32*1024*1024});
const plan=read(base+'/references/production-plan-v614.json');
const main=plan.sourceMainCommit,previous=plan.sourceBranchCommit;
const pr=Number(process.argv.find(a=>a.startsWith('--pr='))?.slice(5));
if(!Number.isInteger(pr)||pr<=14)throw Error('Supply the actual new PR number with --pr=...');
git('merge-base','--is-ancestor',previous,main);
const entries=new Map(git('ls-tree','-r',main).toString().trim().split('\n').map(line=>{const [meta,p]=line.split('\t');return[p,meta.split(' ')[2]];}));
const verifiedAtUtc=new Date().toISOString(),assets=[],registries=[];
for(const version of ['v611','v612','v613']){
 for(const a of read(`docs/suivi-production/${version}/data/production-manifest.json`).assets){
  const bytes=fs.readFileSync(a.repoPngPath);
  if(bytes.length!==a.bytes||sha(bytes)!==a.sha256||entries.get(a.repoPngPath)!==blob(bytes))throw Error('Prior PNG differs from immutable main: '+a.id);
  assets.push({id:a.id,version:version.toUpperCase(),repoPath:a.repoPngPath,sha256:a.sha256,bytes:a.bytes,gitBlobSha:blob(bytes),existsInMain:true});
 }
 const repoPath=`app/game/data/enforcerProduction${version.toUpperCase()}.json`,bytes=fs.readFileSync(repoPath);
 if(entries.get(repoPath)!==blob(bytes))throw Error('Prior registry changed: '+repoPath);
 registries.push({repoPath,sha256:sha(bytes),bytes:bytes.length,gitBlobSha:blob(bytes),existsInMain:true});
}
if(assets.length!==108)throw Error('Expected 108 already merged native PNGs');
const workbooks=[...entries.keys()].filter(p=>p.endsWith('.xlsx')).map(repoPath=>{
 const bytes=fs.readFileSync(repoPath);
 if(blob(bytes)!==entries.get(repoPath))throw Error('Prior workbook changed: '+repoPath);
 return {repoPath,bytes:bytes.length,sha256:sha(bytes),gitBlobSha:blob(bytes),sourceCommit:main,preservedByteIdentical:true};
});
if(workbooks.length!==16)throw Error('Expected all 16 existing project workbooks');
write(base+'/data/base-workbooks.json',{verifiedAtUtc,sourceCommit:main,count:workbooks.length,workbooks});

// Evaluate the actual V106 selector in isolation, using its unchanged JSON
// inputs, before checking the new pack against these 973 existing queries.
const runtimePath='app/game/systems/recentSpriteLibraryV85.ts';
const runtimeSource=git('show',main+':'+runtimePath);
const temporaryPath='app/game/systems/recentSpriteBaselineV614.ts';
if(fs.existsSync(temporaryPath))throw Error('Refusing to overwrite baseline temporary source');
let defaults;
fs.writeFileSync(temporaryPath,runtimeSource);
try{
 const library=homeworldSceneSsrV78().load(temporaryPath);
 const old=read('docs/suivi-production/v613/data/default-selections-before.json');
 if(old.queries.length!==973)throw Error('Unexpected historical query coverage');
 defaults=old.queries.map(r=>({query:r.query,assetId:library.findImportedYautjaArtV85(r.query)?.assetId??null}));
 if(defaults.some((r,i)=>r.assetId!==old.queries[i].assetId))throw Error('V106 changed historical automatic choices; inspect before continuing');
}finally{fs.unlinkSync(temporaryPath);}
write(base+'/data/default-selections-before.json',{commit:main,capturedAtUtc:verifiedAtUtc,runtimeSourcePath:runtimePath,runtimeSourceSha256:sha(runtimeSource),queries:defaults});
write(base+'/data/main-reconciliation.json',{
 schemaVersion:'yautja-main-reconciliation-v614-1',verifiedAtUtc,repository:'darknigthmare/yautja-la-longue-chasse',
 currentMainCommit:main,currentMainTree:git('rev-parse',main+'^{tree}').toString().trim(),previousProductionCommit:previous,
 previousProductionCommitIsAncestorOfMain:true,mergedPullRequest:10,mergedPullRequestUrl:'https://github.com/darknigthmare/yautja-la-longue-chasse/pull/10',
 mergedAtUtc:'2026-10-22T19:38:35Z',mergePerformedByThisDelivery:false,
 mergeMetadataEvidenceFR:'PR nº 10 fusionnée avant cette livraison ; ascendance, 108 blobs PNG et trois registres contrôlés sur le main V106.',
 newBranch:'codex/enforcers-v614-20261023',successorPullRequestNumber:pr,successorPullRequestUrl:`https://github.com/darknigthmare/yautja-la-longue-chasse/pull/${pr}`,
 mainV611AssetCount:36,mainV612AssetCount:36,mainV613AssetCount:36,mainNativeAssetCount:108,
 correctedUsageFieldsFR:'Les 36 V6.13 sont maintenant dans main : Galerie et codex, galerie Oui, empreinte réelle. Les placements, animations et dates historiques sont conservés.',
 statusCountsAfterReconciliationAndV614:{'Présente dans main':2197,'Produite — à vérifier':205,'Conservée hors main':18,'Pas faite':2700},
 assets,runtimeRegistriesInMain:registries,priorWorkbooksCount:16,gameFollowupVersion:'V106',
 evidenceUrls:[`https://github.com/darknigthmare/yautja-la-longue-chasse/commit/${main}`,'https://github.com/darknigthmare/yautja-la-longue-chasse/pull/10']
});
console.log(JSON.stringify({main,nativePngs:assets.length,workbooks:workbooks.length,unchangedDefaultChoices:defaults.length,pr}));
