#!/usr/bin/env node
/** Optional native-simulation pilot for the open loaded ground-route criterion.
 * Reuses the preserved input controller with a genuinely earned campaign save.
 * It neither changes production sources nor qualifies REM112-08 by itself. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const args=Object.fromEntries(process.argv.slice(2).map(argument=>{
  assert.match(argument,/^--(?:mission|seconds|output)=.+$/,'known --key=value pilot option');
  return argument.slice(2).split(/=(.*)/s).slice(0,2);
}));
const missionIds=(args.mission??'fungal-hivemind').split(',');
const seconds=Number(args.seconds??180);
assert.ok(Number.isFinite(seconds)&&seconds>0&&seconds<=300,'bounded native simulation budget:1..300s');
const output=path.resolve(root,args.output??'outputs/qa-ground-admissible-pilot-20261109');
assert.ok(output.startsWith(root+'outputs/'),'pilot evidence must use a fresh outputs directory');
await mkdir(output,{recursive:false});
const fingerprint=bytes=>({bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
const basePath='docs/qa/v112-ground-campaign/campaign-origin-save.json';
const provenancePath='docs/qa/v112-ground-campaign/campaign-origin-provenance.json';
const baseBytes=await readFile(path.join(root,basePath)),save=JSON.parse(baseBytes);
const provenanceBytes=await readFile(path.join(root,provenancePath)),provenance=JSON.parse(provenanceBytes);
const allMissions=['jungle-vey','ice-cryostalker','volcano-bad-blood','swamp-hydra','desert-sandmaw',
  'ocean-leviathan','fungal-hivemind','ruins-ancient-guardian'];
assert.ok(missionIds.length>0&&missionIds.every(id=>allMissions.includes(id)),'known authored mission');
assert.ok(allMissions.every(id=>save.missionProgress[id].status==='completed'),'only the genuine completed campaign replay admission');
assert.equal(save.loadout.armorId,'hunter');
// The reused historical runner assigns this same array. Verify it is already
// earned, so this assignment introduces no additional armor ownership.
assert.deepEqual(save.inventory.unlockedArmorIds,['hunter','scout','berserker']);
assert.ok(save.loadout.weaponIds.every(id=>save.inventory.unlockedWeaponIds.includes(id)));
assert.equal(save.inventory.fieldToolIds.includes('flaying-tool'),false,'the runner must really purchase its tool');
assert.ok(save.profile.clanMarks>=120,'earned marks fund the native120mark purchase');
assert.equal(provenance.attempts.filter(attempt=>attempt.status==='NATIVE_SIMULATION_SUCCESS').length,8);
const sourceFiles=['app/game/HuntCanvas.tsx','app/game/systems/ritesOfHuntV77.ts','app/game/systems/huntRitesRuntimeV77.ts',
  'app/game/systems/anatomyHarvestV112.ts','app/game/systems/harvestInventoryV112.ts',
  'scripts/qa-hunt-ground-campaign-v112.mjs','scripts/lib/qa-hunt-ground-policy-v112.mjs',
  'scripts/qa-hunt-ground-admissible-pilot-20261109.mjs'];
const sources=Object.fromEntries(await Promise.all(sourceFiles.map(async file=>[file,fingerprint(await readFile(path.join(root,file)))])));
const command=['scripts/qa-hunt-ground-campaign-v112.mjs','--mission='+missionIds.join(','),'--armor=hunter',
  '--baseSave='+basePath,'--harvest=true','--seconds='+seconds,'--replay=true','--output='+path.relative(root,output)];
const receipt={schemaVersion:1,classification:'PRELIMINARY_NATIVE_GROUND_PILOT_NOT_A_GLOBAL_QUALIFICATION',
  startedAt:new Date().toISOString(),checkoutCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),
  workingTreeDirty:execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim().length>0,
  node:process.version,sourceFiles:sources,command:[process.execPath,...command],
  admission:{baseSave:{path:basePath,...fingerprint(baseBytes)},provenance:{path:provenancePath,...fingerprint(provenanceBytes),
    sourceCommit:provenance.sourceCommit,nativeCampaignSuccesses:8},armor:'hunter',ownedArmorIds:save.inventory.unlockedArmorIds,
    loadout:save.loadout,clanMarksBefore:save.profile.clanMarks,toolPurchaseCost:120,
    priorRunnerArmorAssignmentAddsOwnership:false,initialCarriedAnatomy:[],acquisition:'Only actual prey defeated and harvested during this attempt.'},
  rules:{teleport:false,invulnerabilityOverride:false,healthOverride:false,enemyRemoval:false,geometryOverride:false,
    objectiveInjection:false,phaseInjection:false,forcedResult:false,groundRouteMustNotClimbSwingOrUseCanopyRests:true},
  scope:'Actual stepGame via existing input policy and verbatim extracted native rite callback. All world actors, dangers and objectives remain. Replay compares recorded inputs and terminal state. No browser or mounted GameClient.',
  qualification:'ATTEMPT_ONLY_REM112_08_STILL_OPEN'};
await writeFile(path.join(output,'pilot-admission.json'),JSON.stringify(receipt,null,2)+'\n');
const child=spawnSync(process.execPath,command,{cwd:root,encoding:'utf8',timeout:60000,maxBuffer:8*1024*1024});
const log=(child.stdout??'')+(child.stderr??'');await writeFile(path.join(output,'execution.log'),log);
receipt.finishedAt=new Date().toISOString();receipt.exitCode=child.status;
receipt.executionError=child.error?{code:child.error.code,message:child.error.message}:null;
receipt.log=fingerprint(Buffer.from(log));
for(const file of sourceFiles){
  const after=fingerprint(await readFile(path.join(root,file)));
  assert.equal(after.sha256,sources[file].sha256,'source changed during pilot:'+file);
}
const reportPath=path.join(output,'report.json');
const report=await readFile(reportPath,'utf8').then(raw=>JSON.parse(raw),()=>null);
for(const outcome of report?.outcomes??[]){
  assert.equal(outcome.armorId,'hunter');
  assert.deepEqual(outcome.admission.inventory.unlockedArmorIds,save.inventory.unlockedArmorIds,'no new armor is admitted');
  assert.deepEqual(outcome.admission.inventory.unlockedWeaponIds,save.inventory.unlockedWeaponIds,'no new weapon is admitted');
  assert.equal(outcome.admission.toolOrigin.spentClanMarks,120,'native tool purchase paid its actual cost');
  assert.equal(outcome.admission.toolOrigin.balanceBefore,save.profile.clanMarks);
  assert.equal(outcome.admission.toolOrigin.balanceAfter,save.profile.clanMarks-120);
  // The original brief omits load before its first native calculation. This
  // absence is not rewritten into a measured zero-load observation.
  assert.ok(outcome.admission.initial.load===undefined||outcome.admission.initial.load.ratio===0,'a computed initial load must be empty');
}
receipt.outcomes=(report?.outcomes??[]).map(outcome=>({missionId:outcome.missionId,armorId:outcome.armorId,
  success:outcome.success,phase:outcome.terminal.phase,health:outcome.terminal.health,simulationSeconds:outcome.terminal.t,
  loadedAtLeastOnce:outcome.peakLoadRatio>0,peakLoadRatio:outcome.peakLoadRatio,
  deliveredAnatomy:outcome.result?.specimensV112??[],toolOrigin:outcome.admission.toolOrigin,
  initialLoadObservation:outcome.admission.initial.load??null,
  status:outcome.success?'NATIVE_EXTRACTION':outcome.terminal.phase==='dead'?'CONTROLLER_DIED':'CONTROLLER_BUDGET_EXHAUSTED',
  terminal:outcome.terminal,
  climbFrames:outcome.climbFrames,swingFrames:outcome.swingFrames,canopyRestContactFrames:outcome.authoredCanopyContactFrames,
  replay:outcome.replay??null}));
await writeFile(path.join(output,'pilot-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({receipt:path.relative(root,path.join(output,'pilot-receipt.json')),exitCode:receipt.exitCode,
  outcomes:receipt.outcomes,qualification:receipt.qualification},null,2));
assert.equal(child.status,0,'the native pilot must finish its fidelity/replay assertions');
assert.equal(receipt.outcomes.length,missionIds.length,'every admitted pilot result is preserved');
