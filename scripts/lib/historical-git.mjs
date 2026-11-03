/** Reuse immutable local Git objects without losing a shallow checkout's graph boundaries. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const externalGitPaths=new Set([
 'GIT_DIR','GIT_COMMON_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_OBJECT_DIRECTORY',
 'GIT_ALTERNATE_OBJECT_DIRECTORIES','GIT_SHALLOW_FILE','GIT_GRAFT_FILE','GIT_QUARANTINE_PATH',
 'GIT_CONFIG','GIT_CONFIG_GLOBAL','GIT_CONFIG_SYSTEM','GIT_TEMPLATE_DIR',
 'GIT_CONFIG_PARAMETERS','GIT_CONFIG_COUNT',
]);

/** `git -C` does not override inherited Git paths. Reject these before creating
 * a capsule or running a child, rather than letting init/config/fetch target
 * the caller's repository. Inherited config pairs can set core.worktree or
 * include an external config too. Report names only: values may hold secrets.
 * Fetch authentication is added explicitly to a private env after this guard. */
export function assertNoExternalGitPathOverrides(env=process.env){
 const names=Object.keys(env).filter(name=>env[name]!==undefined&&
  (externalGitPaths.has(name.toUpperCase())||/^GIT_CONFIG_(?:KEY|VALUE)_\d+$/i.test(name))).sort();
 if(names.length){
  const failure=Error('Historical Git isolation refuses external path overrides: '+names.join(', '));
  failure.code='ERR_HISTORICAL_GIT_PATH_OVERRIDE';throw failure;
 }
}

export function historicalGitEnvironment(){
 assertNoExternalGitPathOverrides();
 return{...process.env,GIT_TERMINAL_PROMPT:'0',GIT_OPTIONAL_LOCKS:'0',GIT_NO_LAZY_FETCH:'1'};
}

export function historicalGitFailure(error,{operation,label='Historical',env=process.env}={}){
 let diagnostic=String(error.stderr??'').trim();
 // A transport may echo a URL or header. Never retain credentials in diagnostics,
 // including the Basic value built by the historical runners' fetch environment.
 for(const token of [env.GH_TOKEN,env.GITHUB_TOKEN].filter(Boolean)){
  for(const value of [token,Buffer.from('x-access-token:'+token).toString('base64')])
   diagnostic=diagnostic.split(value).join('[REDACTED]');
 }
 diagnostic=diagnostic.replace(/(https?:\/\/)[^\s/@]+(?::[^\s/@]*)?@/gi,'$1[REDACTED]@')
  .replace(/(authorization:\s*(?:basic|bearer)\s+)\S+/gi,'$1[REDACTED]').slice(0,16384);
 const failure=Error(label+' Git operation failed: '+operation+' (exit '+(error.status??error.signal??'unavailable')+')'+
  (diagnostic?'\n'+diagnostic:''));
 failure.code=error.code;
 return failure;
}

export async function attachHistoricalGitObjects({root,objectRepository}){
 const env=historicalGitEnvironment();
 const gitPath=name=>execFileSync('git',['-C',objectRepository,'rev-parse','--path-format=absolute','--git-path',name],
  {env,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:45000}).trim();
 let sourceObjects,sourceShallow;
 try{sourceObjects=gitPath('objects');sourceShallow=gitPath('shallow');}
 catch(error){
  if(error.status===128)return{alternate:null,inheritedShallowCommits:[]};
  throw historicalGitFailure(error,{operation:'rev-parse',env});
 }
 const objects=await fs.realpath(sourceObjects);
 assert.ok((await fs.stat(objects)).isDirectory(),'Historical Git alternate must be an object directory');
 const target=path.join(root,'.git/objects/info/alternates');
 const bytes=objects+'\n';
 await fs.writeFile(target,bytes,{mode:0o444});await fs.chmod(target,0o444);

 // Git follows the alternate repository's refs while negotiating a fetch. Object
 // alternates alone do not carry its shallow metadata: without this private copy,
 // missing parents are mistaken for corrupt history and fetch exits with status 1.
 const shallow=await fs.readFile(sourceShallow,'utf8').catch(error=>{
  if(error.code==='ENOENT')return null;
  throw error;
 });
 const inheritedShallowCommits=shallow?.trim().split('\n').filter(Boolean)??[];
 for(const commit of inheritedShallowCommits)assert.match(commit,/^[a-f0-9]{40}$/,'Invalid inherited shallow boundary');
 if(shallow!==null)await fs.writeFile(path.join(root,'.git/shallow'),shallow);
 return{alternate:{path:target,bytes},inheritedShallowCommits};
}
