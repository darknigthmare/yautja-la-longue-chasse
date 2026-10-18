/** One production pipeline for npm and Vercel; legacy vinext/desktop commands stay separate. */
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const require = createRequire(import.meta.url);
const projectRoot = fileURLToPath(new URL('..', import.meta.url));
function nextExecutable(root) {
  const manifestPath = require.resolve('next/package.json', {paths:[root]});
  const manifest = JSON.parse(readFileSync(manifestPath,'utf8'));
  const bin = typeof manifest.bin === 'string' ? manifest.bin : manifest.bin?.next;
  if (typeof bin !== 'string' || !bin) throw new Error('Le binaire Next.js installé est introuvable. Exécute npm ci.');
  return resolve(dirname(manifestPath),bin);
}
export function productionBuildStepsV94(root, nextCli) {
  return [
    ['audio', [resolve(root,'scripts/build-audio-manifest.mjs')]],
    ['next', [nextCli,'build','--webpack']],
    ['pit-css', [resolve(root,'scripts/verify-pit-built-css-v61.mjs')]],
    ['native-origin', [resolve(root,'scripts/vercel-native-origin-v89.mjs')]],
    ['static-output', [resolve(root,'scripts/compact-vercel-static-v87.mjs')]],
  ].map(([id,args]) => ({id,command:process.execPath,args}));
}
export function runProductionBuildV94({root=projectRoot,nextCli,spawn=spawnSync,log=console.log}={}) {
  for(const step of productionBuildStepsV94(root,nextCli ?? nextExecutable(root))) {
    log(`[production] ${step.id}`);
    const result=spawn(step.command,step.args,{cwd:root,stdio:'inherit',shell:false});
    if(result.error || result.signal || result.status !== 0) {
      log(`[production] Échec de ${step.id}; les étapes suivantes ne seront pas exécutées.`);
      return {ok:false,step:step.id,exitCode:Number.isInteger(result.status)&&result.status>0?result.status:1};
    }
  }
  return {ok:true,step:null,exitCode:0};
}
if(process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exitCode=runProductionBuildV94().exitCode; }
  catch(error) { console.error(error instanceof Error?error.message:'Build de production interrompu.');process.exitCode=1; }
}
