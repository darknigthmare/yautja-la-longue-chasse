#!/usr/bin/env node
'use strict';
// Reproducible offline export/review. No game bindings or simulation data are edited.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const {exportPack} = require('./export_sprites.cjs');
const {build} = require('./build_runtime_manifests.cjs');
const {check: checkPack} = require('./check_pack.cjs');
const {check: checkPreview} = require('./check_preview_behavior.cjs');
const {buildStandalone} = require('./build_standalone.cjs');
const {render} = require('./render_preview.cjs');
const {renderContactSheet} = require('./render_contact_sheet.cjs');
const {renderContinuity} = require('./render_continuity.cjs');
const {applyGripRegistration} = require('./apply_grip_registration.cjs');
const {checkGripRegistration} = require('./check_grip_registration.cjs');
const {applyFloorRegistration} = require('./apply_floor_registration.cjs');
const {checkFloorRegistration} = require('./check_floor_registration.cjs');
const {assert} = require('./playback_core.js');
async function buildAll(folder, contract, registry) {
  folder = path.resolve(folder || __dirname);
  contract = path.resolve(contract || path.join(__dirname, '../../../app/game/hunterSpriteAtlas.ts'));
  await fs.access(contract);
  const sourceConfig = path.join(folder, 'sources.json');
  const report = {schemaVersion:1,packId:'hunter-support-actions',artisticStatus:'draft',artisticApproval:false,runtimeBinding:null,gameplayChanged:false,browserInteraction:false,inGameValidation:false,execution:{node:process.version,moduleScope:'commonjs for local tool files; the real TypeScript contract is imported as an ES module'}};
  let sharp;
  try { sharp = require('sharp'); } catch { sharp = require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || '/opt/node_modules','sharp')); }
  report.execution.sharp=sharp.versions.sharp;
  report.execution.rebuildWithoutGenerationRegistry=!registry;
  report.execution.ffmpeg=execFileSync('ffmpeg',['-version'],{encoding:'utf8'}).split('\n')[0];
  report.execution.ffprobe=execFileSync('ffprobe',['-version'],{encoding:'utf8'}).split('\n')[0];
  if (registry) report.ingestion = await require('./ingest_sources.cjs').ingest(path.resolve(registry),folder,path.join(folder,'hunt_support_state_map.json'));
  report.gripRegistration = await applyGripRegistration(folder);
  report.floorRegistration = await applyFloorRegistration(folder);
  report.export = await exportPack(sourceConfig,folder);
  report.runtimeManifests = await build(folder);
  report.pixelChecks = await checkPack(folder);
  report.gripRegistrationChecks = await checkGripRegistration(folder);
  report.floorRegistrationChecks = await checkFloorRegistration(folder);
  const frozen=JSON.parse(await fs.readFile(path.join(folder,'png_freeze_receipt.json'),'utf8'));
  for(const file of frozen.files) {
    const bytes=await fs.readFile(path.join(folder,file.path));
    assert(bytes.length===file.bytes && crypto.createHash('sha256').update(bytes).digest('hex')===file.sha256,`Registered export changed frozen PNG ${file.path}.`);
  }
  assert(frozen.files.length===report.export.sourceDrawings+report.export.sourceClips*2,'Frozen PNG inventory differs from the complete export.');
  report.pngFreezePreservation={status:'passed',pngFiles:frozen.files.length,sourceAtlases:frozen.sourceAtlases,individualSprites:frozen.sourceDrawings,guardedImportAtlases:frozen.guardedImportAtlases,byteForByteUnchanged:true,comparedWith:'png_freeze_receipt.json'};
  assert(report.pixelChecks.uniqueDecodedRgbaFrames === report.export.sourceDrawings,'Some source drawings have identical decoded RGBA content; review duplicates before delivery.');
  report.nativeContract = JSON.parse(execFileSync(process.execPath,['--experimental-strip-types',path.join(__dirname,'check_runtime_manifests.mjs'),folder,contract],{encoding:'utf8'}));
  report.relativePreview = await checkPreview(folder);
  report.standalone = await buildStandalone(folder,path.join(folder,'Yautja_Survie_Equipement_Canopee_V1_Apercu.html'),sourceConfig);
  report.standalonePreview = await checkPreview(folder,'Yautja_Survie_Equipement_Canopee_V1_Apercu.html');
  report.video = await render(folder,path.join(folder,'Yautja_Survie_Equipement_Canopee_V1.mp4'));
  report.continuityVideo = await renderContinuity(folder,path.join(folder,'Yautja_Survie_Equipement_Canopee_V1_Raccords.mp4'));
  report.contactSheet = await renderContactSheet(folder,path.join(folder,'Yautja_Survie_Equipement_Canopee_V1_Contact.png'));
  report.delivery = {actions:report.export.actions,sourceAtlases:report.export.sourceClips,individualSprites:report.export.sourceDrawings,guardedImportAtlases:report.export.guardAtlases,artPngFiles:report.export.sourceDrawings + report.export.sourceClips*2,contactSheetsCountedAsArt:false,reviewFps:report.export.reviewTicksPerSecond};
  report.limitations = ['All source drawings and runtime manifests remain draft; technical checks do not confer human artistic approval.','The relative and standalone preview scripts are executed with a simulated DOM, Image, Canvas and RAF in Node; no browser interaction is claimed.','MP4 coverage and raster placement checks are offline review only, not gameplay validation.','Whole-body equipped right-facing reference art does not implement modular gear or left-facing variants.','Review cadence does not modify cooldowns, health, energy, action windows, control availability or the death simulation pause.'];
  await fs.writeFile(path.join(folder,'verification_report.json'),JSON.stringify(report,null,2)+'\n');
  return report;
}
if(require.main === module) buildAll(process.argv[2],process.argv[3],process.argv[4]).then(report=>console.log(JSON.stringify(report,null,2))).catch(error=>{console.error(error.stack);process.exitCode=1;});
module.exports = {buildAll};
