import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';

// Reconcile the two already merged lots against an immutable main tree.
// This command reads Git objects and never merges or changes a branch.
const out='docs/suivi-production/v613/data';
const main='017f3bd8d37457ee56d0cfeb78da9835c6388b8f';
const previous='842bc7e69ab5aed086d0fbbfcafd1d86a14e9f38';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const blob=b=>crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const git=(...args)=>execFileSync('git',args,{maxBuffer:16*1024*1024});
git('merge-base','--is-ancestor',previous,main);
const tree=git('rev-parse',main+'^{tree}').toString().trim();
const entries=new Map(git('ls-tree','-r',main,'public/game/production','app/game/data').toString().trim().split('\n').map(line=>{
 const [meta,repoPath]=line.split('\t');return[repoPath,meta.split(' ')[2]];
}));
const assets=[];
const registries=[];
for(const version of ['v611','v612']){
 const manifest=read(`docs/suivi-production/${version}/data/production-manifest.json`);
 for(const a of manifest.assets){
  const bytes=fs.readFileSync(a.repoPngPath),gitBlobSha=blob(bytes);
  if(sha(bytes)!==a.sha256||bytes.length!==a.bytes||entries.get(a.repoPngPath)!==gitBlobSha)throw Error('Main asset mismatch: '+a.id);
  assets.push({id:a.id,version:manifest.version,repoPath:a.repoPngPath,sha256:a.sha256,bytes:a.bytes,gitBlobSha,existsInMain:true});
 }
 const repoPath=`app/game/data/enforcerProduction${version.toUpperCase()}.json`;
 const bytes=fs.readFileSync(repoPath),gitBlobSha=blob(bytes);
 if(entries.get(repoPath)!==gitBlobSha)throw Error('Main registry mismatch: '+repoPath);
 registries.push({repoPath,sha256:sha(bytes),bytes:bytes.length,gitBlobSha,existsInMain:true});
}
if(assets.length!==72)throw Error('Expected the 72 already published native assets');
const proof={schemaVersion:'yautja-main-reconciliation-v613-1',verifiedAtUtc:new Date().toISOString(),
 repository:'darknigthmare/yautja-la-longue-chasse',previousAuditedMainCommit:'dbd7625ade2c83d133875138516fb21fae2aa7bf',
 currentMainCommit:main,currentMainTree:tree,previousProductionCommit:previous,previousProductionCommitIsAncestorOfMain:true,
 mergedPullRequest:9,mergedPullRequestUrl:'https://github.com/darknigthmare/yautja-la-longue-chasse/pull/9',mergedAtUtc:'2026-10-22T06:31:48Z',
 mergeMetadataEvidenceFR:'Fusion de la PR nº 9 constatée pendant la reprise ; présence des blobs et ascendance revérifiées par cette commande.',
 mergePerformedByThisDelivery:false,newBranch:'codex/enforcers-v613-20261022',successorPullRequestNumber:10,
 successorPullRequestUrl:'https://github.com/darknigthmare/yautja-la-longue-chasse/pull/10',
 mainV611AssetCount:36,mainV612AssetCount:36,mainNativeAssetCount:72,
 correctedUsageFieldsFR:'Pour les 72 PNG V6.11/V6.12 : Usage dans main = Galerie et codex ; Galerie = Oui ; SHA256 déclaré — main = empreinte réelle. Aucun placement ni portrait ajouté.',
 statusCountsAfterReconciliationAndV613:{'Présente dans main':2161,'Produite — à vérifier':205,'Conservée hors main':36,'Pas faite':2718},
 evidenceUrls:['https://api.github.com/repos/darknigthmare/yautja-la-longue-chasse/git/commits/'+main,
  'https://api.github.com/repos/darknigthmare/yautja-la-longue-chasse/pulls/9'],assets,runtimeRegistriesInMain:registries};
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'main-reconciliation.json'),JSON.stringify(proof,null,2)+'\n');
console.log(JSON.stringify({main,assets:assets.length,registries:registries.length}));
