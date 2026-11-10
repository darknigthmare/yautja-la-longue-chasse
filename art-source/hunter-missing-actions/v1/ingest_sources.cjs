#!/usr/bin/env node
'use strict';
// Ingest final image-generation outputs byte for byte. The full action registry is retained.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const {assert} = require('./playback_core.js');
const sha = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
async function ingest(registryFile, folder, auditFile) {
  assert(registryFile, 'Pass the final generation registry JSON path.');
  folder = path.resolve(folder || __dirname);
  const sourceFile = path.join(folder, 'sources.json');
  const [registry, sources] = await Promise.all([registryFile, sourceFile].map(async file => JSON.parse(await fs.readFile(file, 'utf8'))));
  const promptsFile = path.join(folder, 'prompts.json');
  let prompts;
  try { prompts = JSON.parse(await fs.readFile(promptsFile, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; prompts = {schemaVersion:1, artisticStatus:'draft', clips:{}}; }
  const known = new Map(sources.clips.map(clip => [clip.id, clip]));
  const ingested = [];
  await fs.mkdir(path.join(folder, 'atlases'), {recursive:true});
  for (const [id, entry] of Object.entries(registry)) {
    const clip = known.get(id); assert(clip, `Unknown source clip ${id}.`);
    assert(entry.id === id && typeof entry.path === 'string' && typeof entry.prompt === 'string', `Incomplete generation record: ${id}`);
    const bytes = await fs.readFile(entry.path), sourceSha256 = sha(bytes);
    const destination = path.join(folder, 'atlases', `${id}.png`);
    let previousSha = null;
    try { previousSha = sha(await fs.readFile(destination)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (previousSha !== sourceSha256) await fs.writeFile(destination, bytes);
    assert(sha(await fs.readFile(destination)) === sourceSha256, `${id}: source copy mismatch.`);
    clip.path = `atlases/${id}.png`;
    clip.generationFilename = path.basename(entry.path);
    clip.generator = entry.mode || 'image_gen';
    clip.promptRef = `prompts.json#/clips/${id}`;
    clip.sourceSha256 = sourceSha256;
    clip.generationStatus = 'generated-awaiting-art-review';
    prompts.clips[id] = {prompt:entry.prompt, generator:clip.generator, generationFilename:clip.generationFilename, sourceSha256, transparentBackground:entry.transparentBackground === true,...(entry.references?{references:entry.references}:{}),supersededAttempts:(entry.supersededAttempts || []).map(attempt=>({generationFilename:path.basename(attempt.path),reason:attempt.reason,prompt:attempt.prompt,selected:false}))};
    ingested.push({id,file:clip.path,sourceSha256,changed:previousSha !== sourceSha256});
  }
  for (const clip of sources.clips) {
    if (/^(air_strike_|jump_|climb_)/.test(clip.id)) clip.anchorNormalized = [0.5,0.55];
    if (!clip.generationStatus) clip.generationStatus = 'generation-pending';
  }
  if (auditFile) {
    const audit = JSON.parse(await fs.readFile(auditFile, 'utf8'));
    for (const action of sources.actions) {
      const match = audit.actions.find(item => item.artActionId === action.id);
      assert(match, `Audit entry missing for production ID ${action.id}.`);
      const evidence = match.evidenceKeys.map(key => { assert(audit.evidence[key], `Unknown evidence ${key}.`); return {key,...audit.evidence[key]}; });
      action.gameplayTiming = {domain:'Hunt',unit:'seconds',status:'unretimed-review',auditedCommit:audit.auditedCommit,source:evidence.map(({path,url,startLine,endLine})=>({path,url,startLine,endLine})),parameters:match.timing,retimingApplied:false};
      action.gameCoverage = {auditedCommit:audit.auditedCommit,source:'hunt_animation_state_map.json',evidence,enginePredicate:match.enginePredicate,engineIdsAreExisting:match.engineIdsAreExisting,artIdIsNewEngineEnum:match.artIdIsNewEngineEnum || false,sourceStatusAtAudit:match.sourceStatusAtAudit,currentPresentation:match.currentPresentation,newPresentationClockNeeded:match.newPresentationClockNeeded,presentationClockNote:match.presentationClockNote,anchor:match.anchor,...(match.weaponVariant?{weaponVariant:match.weaponVariant}:{}),...(match.otherWeaponVariantStillMissing?{otherWeaponVariantStillMissing:match.otherWeaponVariantStillMissing}:{}),hookStatus:action.id === 'landing' ? 'future-nonblocking-presentation-event' : 'draft-art-only'};
      const declaredDrawings = Object.values(action.phases).reduce((total, phase) => total + phase.clips.length * 16, 0);
      assert(declaredDrawings === match.plannedDrawings, `${action.id}: production count differs from audit.`);
    }
    sources.coverageAudit = {auditedCommit:audit.auditedCommit,source:'hunt_animation_state_map.json',runtimeBinding:null,gameplayChanged:false};
  }
  await fs.writeFile(sourceFile, JSON.stringify(sources,null,2)+'\n');
  await fs.writeFile(promptsFile, JSON.stringify(prompts,null,2)+'\n');
  return {expectedClips:sources.expectedClipCount,availableClips:ingested.length,expectedSourceDrawings:sources.expectedSourceFrameCount,availableSourceDrawings:ingested.length*16,registryComplete:ingested.length === sources.expectedClipCount,ingested};
}
if (require.main === module) ingest(process.argv[2],process.argv[3],process.argv[4]).then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.error(error.stack);process.exitCode=1;});
module.exports={ingest};
