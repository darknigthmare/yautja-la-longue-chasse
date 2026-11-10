#!/usr/bin/env node
'use strict';
// Temporary synthetic data tests. No fixture is placed in the deliverable.
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const {exportPack,alphaInspection} = require('./export_sprites.cjs');
const {build} = require('./build_runtime_manifests.cjs');
const {check: checkPack} = require('./check_pack.cjs');
const {check: checkPreview} = require('./check_preview_behavior.cjs');
const {render} = require('./render_preview.cjs');
const {buildStandalone} = require('./build_standalone.cjs');
const core = require('./playback_core.js');
let sharp;
try { sharp = require('sharp'); } catch { sharp = require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || '/opt/node_modules', 'sharp')); }
const json = (filename, value) => fs.writeFile(filename, JSON.stringify(value, null, 2));
async function main() {
  // A real 313px source edge is interior after padding to 314px. Check the
  // source rectangle with its original dimensions and the padded row stride.
  const edgeFixture=Buffer.alloc(314*314*4);
  edgeFixture[(20*314+312)*4+3]=128;
  const edgeBefore=Buffer.from(edgeFixture);
  assert.equal(alphaInspection(edgeFixture,314,314).edgeVisiblePixelsAtAlpha16,0);
  assert.equal(alphaInspection(edgeFixture,313,313,314).edgeVisiblePixelsAtAlpha16,1);
  assert.ok(edgeFixture.equals(edgeBefore),'Alpha inspection must not alter source bytes.');
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'hunt-animation-pipeline-'));
  try {
    const size = 46, ids = ['part_a','part_b','flow','raise','breathe','lower'], clips = [];
    const sourceHashes = new Map();
    for (const [clipIndex, id] of ids.entries()) {
      const raw = Buffer.alloc(size * size * 4);
      for (let cell = 0; cell < 16; cell++) {
        const x = Math.round((cell % 4) * size / 4) + 3, y = Math.round(Math.floor(cell / 4) * size / 4) + 3;
        const offset = (y * size + x) * 4;
        raw[offset] = 20 + clipIndex * 30; raw[offset + 1] = 20 + cell * 10; raw[offset + 2] = 80; raw[offset + 3] = cell % 2 ? 255 : 180;
      }
      const png = await sharp(raw, {raw:{width:size,height:size,channels:4}}).png().toBuffer();
      await fs.writeFile(path.join(folder, `${id}.png`), png);
      sourceHashes.set(id, crypto.createHash('sha256').update(png).digest('hex'));
      clips.push({id, path:`${id}.png`, fps:id === 'breathe' ? 10 : 16, anchorPolicy:'fixed-root'});
    }
    const config = {artisticStatus:'draft',expectedClipCount:6,expectedSourceFrameCount:96,clips,actions:[
      {id:'strike',kind:'one-shot',phases:{action:{clips:['part_a','part_b'],order:'forward'}}},
      {id:'run',kind:'loop',phases:{loop:{clips:['flow'],order:'forward'}}},
      {id:'aim',kind:'sustained',phases:{enter:{clips:['raise']},loop:{clips:['breathe'],order:'ping-pong'},exit:{clips:['lower']}}}
    ]};
    const sourceFile = path.join(folder, 'sources.json'), output = path.join(folder, 'export');
    await json(sourceFile, config);
    const exported = await exportPack(sourceFile, output);
    assert.equal(exported.reviewTicksPerSecond, 80);
    const native = await build(output);
    assert.equal(native.frameReferences, 110);
    const pixels = await checkPack(output), preview = await checkPreview(output);
    const standalone=await buildStandalone(output,path.join(output,'standalone.html'),sourceFile);
    const standalonePreview=await checkPreview(output,'standalone.html');
    assert.equal(standalonePreview.embeddedAtlasImages,6); assert.equal(standalonePreview.externalImageRequests,0);
    assert.equal(preview.multiPageActions, 1); assert.equal(preview.sustained, 1);
    assert.equal(core.resolve([{durationTicks:5},{durationTicks:5}], 5, false).index, 1);
    assert.equal(core.resolve([{durationTicks:5},{durationTicks:5}], 10, false).ended, true);
    assert.equal(core.resolve([{durationTicks:5},{durationTicks:5}], 10, true).index, 0);
    const invalid = structuredClone(config); invalid.actions[0].phases.idle = {clips:['flow']};
    assert.throws(() => core.checkActions(invalid.actions, invalid.clips), /phases must/);
    invalid.actions[0] = {id:'strike',kind:'one-shot',phases:{action:{clips:['part_a','part_b'],order:'ping-pong'}}};
    assert.throws(() => core.checkActions(invalid.actions, invalid.clips), /ping-pong/);
    const measured = structuredClone(config); measured.clips[0].anchorPolicy = 'measured'; measured.anchorMeasurementsPath = 'anchors.json';
    await json(path.join(folder, 'anchors.json'), {clips:{part_a:{sourceSha256:'wrong-source',target:{x:6,y:10},frames:Array.from({length:16},(_,index)=>({number:index+1,pivot:{x:6,y:10}}))}}});
    await json(sourceFile, measured);
    await assert.rejects(exportPack(sourceFile, path.join(folder, 'invalid')), /SHA mismatch/);
    const anchors = {clips:{part_a:{sourceSha256:sourceHashes.get('part_a'),target:{x:6,y:10},frames:Array.from({length:16},(_,index)=>({number:index+1,pivot:{x:6.25,y:9.5},confidence:'fixture-only'}))}}};
    await json(path.join(folder, 'anchors.json'), anchors);
    await exportPack(sourceFile, path.join(folder, 'measured'));
    await checkPack(path.join(folder, 'measured'));
    const contract = process.argv.slice(2).find(value => !value.startsWith('--'));
    let nativeContract = null;
    if (contract) nativeContract = JSON.parse(execFileSync(process.execPath, ['--experimental-strip-types',path.join(__dirname,'check_runtime_manifests.mjs'),output,path.resolve(contract)], {encoding:'utf8'}));
    const video = process.argv.includes('--video') ? await render(output) : null;
    for (const id of ids) assert.equal(crypto.createHash('sha256').update(await fs.readFile(path.join(folder,`${id}.png`))).digest('hex'), sourceHashes.get(id));
    console.log(JSON.stringify({status:'passed',fixtureDirectoryRemoved:true,exported,native,pixels,preview,standalone,standalonePreview,nativeContract,video,checks:['16/32 frame explicit one-shots','sustained enter/loop/exit','10/16 fps shared timebase','half-open timeline boundaries','terminal hold and restart','multi-page transition','real RGBA and transparent guards','source read-only','measured anchor SHA rejection','no fabricated idle','embedded original atlas SHA and exact native crop','standalone no external image requests']},null,2));
  } finally { await fs.rm(folder, {recursive:true,force:true}); }
}
main().catch(error => {console.error(error.stack); process.exitCode = 1;});

