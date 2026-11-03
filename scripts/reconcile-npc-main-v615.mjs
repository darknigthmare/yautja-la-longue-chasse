import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';

// Read immutable Git objects. V6.14 is still in PR 15, not merged into main.
const MAIN='92e7c824fd80d6b8152855b3d66560448f8c48c0';
const PREVIOUS='4a1b437eb60fa9d511722bf4930fd49ff7fb8f86';
const OUT='docs/suivi-production/v615';
const git=(...args)=>execFileSync('git',args,{maxBuffer:64*1024*1024});
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const blob=b=>crypto.createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
const write=(p,v)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');};
const tree=commit=>new Map(git('ls-tree','-r',commit).toString().trim().split('\n').map(line=>{
 const [meta,p]=line.split('\t');return[p,meta.split(' ')[2]];
}));
const main=tree(MAIN),previous=tree(PREVIOUS),at=new Date().toISOString();
git('merge-base','--is-ancestor',MAIN,PREVIOUS);
const paths=[...previous.keys()].filter(p=>p.endsWith('.xlsx')).sort();
if(paths.length!==17||[...main.keys()].filter(p=>p.endsWith('.xlsx')).length!==16)throw Error('Unexpected workbook inventory');
const workbooks=paths.map(repoPath=>{
 const bytes=fs.readFileSync(repoPath),gitBlobSha=blob(bytes);
 if(previous.get(repoPath)!==gitBlobSha)throw Error('Previous workbook changed: '+repoPath);
 const inMain=main.get(repoPath)===gitBlobSha;
 if(main.has(repoPath)&&!inMain)throw Error('Main workbook changed: '+repoPath);
 return {repoPath,bytes:bytes.length,sha256:sha(bytes),gitBlobSha,sourceCommit:inMain?MAIN:PREVIOUS,
  presentInMain:inMain,sourceStateFR:inMain?'Déjà dans main V106':'Classeur V6.14 dans la PR nº 15 non fusionnée',preservedByteIdentical:true};
});
const versions=['v611','v612','v613','v614'],assets=[];
for(const version of versions){
 const manifest=JSON.parse(fs.readFileSync(`docs/suivi-production/${version}/data/production-manifest.json`));
 for(const a of manifest.assets){
  const bytes=fs.readFileSync(a.repoPngPath),gitBlobSha=blob(bytes);
  if(a.sha256!==sha(bytes)||a.bytes!==bytes.length||previous.get(a.repoPngPath)!==gitBlobSha)throw Error('Prior native PNG changed: '+a.id);
  const inMain=main.get(a.repoPngPath)===gitBlobSha;
  if(inMain!==(version!=='v614'))throw Error('Unexpected main state: '+a.id);
  assets.push({id:a.id,version:manifest.version,repoPngPath:a.repoPngPath,sha256:a.sha256,bytes:a.bytes,gitBlobSha,
   existsInMain:inMain,sourceCommit:inMain?MAIN:PREVIOUS});
 }
}
if(assets.length!==126||assets.filter(a=>a.existsInMain).length!==108)throw Error('Unexpected cumulative native baseline');
write(OUT+'/data/base-workbooks.json',{verifiedAtUtc:at,sourceCommit:PREVIOUS,sourceMainCommit:MAIN,count:17,
 mainCount:16,previousUnmergedCount:1,workbooks});
write(OUT+'/data/main-reconciliation.json',{schemaVersion:'yautja-v615-main-reconciliation-1',verifiedAtUtc:at,
 currentMainCommit:MAIN,previousProductionCommit:PREVIOUS,previousProductionCommitIsAncestorOfMain:false,
 currentMainIsAncestorOfPreviousProduction:true,previousLotMerged:false,previousPullRequestNumber:15,
 successorPullRequestNumber:15,successorPullRequestUrl:'https://github.com/darknigthmare/yautja-la-longue-chasse/pull/15',
 newBranch:'codex/enforcers-v614-20261023',mainNativeAssetCount:108,previousBranchNativeAssetCount:126,
 priorUnmergedNativeAssetCount:18,priorWorkbookCount:17,assets,
 priorStatusCounts:{'Présente dans main':2197,'Produite — à vérifier':205,'Conservée hors main':18,'Pas faite':2700},
 statusCountsAfterReconciliationAndV615:{'Présente dans main':2197,'Produite — à vérifier':205,'Conservée hors main':36,'Pas faite':2682},
 promotedRows:0,defaultSelectionsProofPath:'docs/suivi-production/v614/data/default-selections-before.json',
 evidenceFR:'Main et PR nº 15 relus avant reprise. Les objets Git immuables confirment 108 PNG V6.11 à V6.13 dans main et 18 PNG V6.14 uniquement dans la PR. Aucune promotion de statut historique dans cette passe.'});
console.log(JSON.stringify({main:MAIN,previous:PREVIOUS,priorNativePngFiles:126,mainNativePngFiles:108,workbooks:17,unchangedMain:true}));
