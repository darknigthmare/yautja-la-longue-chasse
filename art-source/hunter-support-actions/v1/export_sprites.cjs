#!/usr/bin/env node
'use strict';
// Only exact crops, transparent padding and guard packing. Source artwork is never repainted.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const playbackCore = require('./playback_core.js');
const {assert} = playbackCore;
let sharp;
try { sharp = require('sharp'); } catch { sharp = require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || '/opt/node_modules', 'sharp')); }
const digest = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
const json = async (file, value) => fs.writeFile(file, JSON.stringify(value, null, 2) + '\n');
const relative = value => value.replaceAll(path.sep, '/');
async function writePng(file,bytes) {
  try {if((await fs.readFile(file)).equals(bytes))return;} catch(error) {if(error.code!=='ENOENT')throw error;}
  const temporary=path.join(path.dirname(file),`.${path.basename(file)}.tmp-${process.pid}`);
  try {await fs.writeFile(temporary,bytes);await fs.rename(temporary,file);} finally {await fs.rm(temporary,{force:true});}
}

function alphaInspection(raw, width, height, stride = width) {
  let zero = 0, nonzero = 0, visible = 0, semitransparent = 0, edgeVisible = 0, edgeTrace = 0, edgeAbove2 = 0, edgeMaximum = 0;
  let left = width, top = height, right = -1, bottom = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const alpha = raw[(y * stride + x) * 4 + 3];
    if (alpha === 0) zero++; else nonzero++;
    if (alpha > 0 && alpha < 255) semitransparent++;
    if (alpha >= 16) { visible++; left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y); }
    if (x === 0 || y === 0 || x === width - 1 || y === height - 1) { if (alpha >= 16) edgeVisible++; else if (alpha > 0) edgeTrace++; if(alpha>2)edgeAbove2++; edgeMaximum=Math.max(edgeMaximum,alpha); }
  }
  return {transparentPixels: zero, nontransparentPixels: nonzero, visiblePixelsAtAlpha16: visible, semitransparentPixels: semitransparent, edgeVisiblePixelsAtAlpha16: edgeVisible, edgeTracePixelsBelowAlpha16: edgeTrace,edgePixelsAboveAlpha2:edgeAbove2,edgeMaximumAlpha:edgeMaximum,visibleBounds: right < 0 ? null : {x: left, y: top, width: right - left + 1, height: bottom - top + 1}};
}

async function exportPack(sourceFile, outputDir) {
  sourceFile = path.resolve(sourceFile); outputDir = path.resolve(outputDir);
  const config = JSON.parse(await fs.readFile(sourceFile, 'utf8'));
  assert(config.artisticStatus === 'draft', 'New generated assets must remain draft.');
  assert(Array.isArray(config.clips) && config.clips.length > 0, 'No source clips.');
  assert(config.clips.length === config.expectedClipCount, 'Unexpected source clip count.');
  assert(config.clips.length * 16 === config.expectedSourceFrameCount, 'Unexpected source drawing count.');
  playbackCore.checkActions(config.actions, config.clips);
  const measurements = config.anchorMeasurementsPath ? JSON.parse(await fs.readFile(path.resolve(path.dirname(sourceFile), config.anchorMeasurementsPath), 'utf8')) : {clips: {}};
  const warnings = [], sourceChecks = [], clips = [], importedPages = [];
  const sourceRoot = path.dirname(sourceFile);
  await fs.mkdir(outputDir, {recursive: true});
  for (const input of config.clips) {
    assert(/^[a-z0-9_]+$/.test(input.id), `Unsafe source identifier: ${input.id}`);
    assert(typeof input.path === 'string', `${input.id}: missing source path.`);
    const fps = input.fps ?? 16;
    playbackCore.timebase([fps]);
    const inputPath = path.resolve(sourceRoot, input.path);
    const sourceBuffer = await fs.readFile(inputPath), sourceSha256 = digest(sourceBuffer);
    if (input.sourceSha256) assert(input.sourceSha256 === sourceSha256, `${input.id}: ingested source SHA mismatch.`);
    const metadata = await sharp(sourceBuffer).metadata();
    assert(metadata.format === 'png' && metadata.hasAlpha, `${input.id}: a PNG with actual alpha is required.`);
    assert(metadata.width >= 16 && metadata.height >= 16, `${input.id}: invalid source dimensions.`);
    const decoded = await sharp(sourceBuffer).ensureAlpha().raw().toBuffer({resolveWithObject: true});
    assert(decoded.info.channels === 4, `${input.id}: expected RGBA.`);
    const frameWidth = Math.ceil(metadata.width / 4), frameHeight = Math.ceil(metadata.height / 4);
    const xEdges = Array.from({length: 5}, (_, i) => Math.round(i * metadata.width / 4));
    const yEdges = Array.from({length: 5}, (_, i) => Math.round(i * metadata.height / 4));
    const policy = input.anchorPolicy || 'fixed-root';
    assert(['fixed-root', 'measured'].includes(policy), `${input.id}: invalid anchor policy.`);
    const measured = measurements.clips?.[input.id];
    if (policy === 'measured') {
      assert(measured?.sourceSha256 === sourceSha256, `${input.id}: measured anchor source SHA mismatch or missing.`);
      assert(measured.frames?.length === 16, `${input.id}: 16 measured pivots required.`);
      if (measured.registration?.referenceSource) {
        const reference = measured.registration.referenceSource;
        assert(config.clips.find(clip => clip.id === reference.clip)?.sourceSha256 === reference.sourceSha256, `${input.id}: calibration reference source SHA mismatch.`);
      }
    }
    const normalized = input.anchorNormalized || [0.5, 0.9];
    assert(normalized.length === 2 && normalized.every(value => Number.isFinite(value) && value >= 0 && value <= 1), `${input.id}: invalid fixed root.`);
    const target = policy === 'measured' ? measured.target : {x: normalized[0] * frameWidth, y: normalized[1] * frameHeight};
    assert(target && Number.isFinite(target.x) && Number.isFinite(target.y), `${input.id}: invalid anchor target.`);
    const atlasFile = `atlases/${input.id}.png`;
    const atlasPath = path.join(outputDir, atlasFile);
    await fs.mkdir(path.dirname(atlasPath), {recursive: true});
    if (inputPath !== atlasPath) await writePng(atlasPath, sourceBuffer);
    const clip = {id: input.id, label: input.label || input.id, atlas: atlasFile, sourceSha256, sourceDimensions: {width: metadata.width, height: metadata.height}, frameWidth, frameHeight, fps, grid: {columns: 4, rows: 4}, gridEdges: {x: xEdges, y: yEdges}, anchorPolicy: policy, anchorMethod: policy === 'measured' ? measured.method || 'measured-pivots' : 'fixed-cell-root-assumption', anchorTarget: target, anchorNotes: policy === 'fixed-root' ? 'Layout assumption: a constant cell-space root. No foot or contact registration has been inferred; authored movement inside each cell is preserved.' : measured.notes || 'Measured pivots, tied to the exact source SHA-256.', registration: policy === 'measured' ? measured.registration || null : null, frames: []};
    const guardPixels = 2, cellWidth = frameWidth + 4, cellHeight = frameHeight + 4;
    const guardedWidth = cellWidth * 4, guardedHeight = cellHeight * 4;
    const guarded = Buffer.alloc(guardedWidth * guardedHeight * 4);
    const imported = {id: input.id, file: `import_atlases/${input.id}.png`, sourceSha256, guardPixels, cellWidth, cellHeight, atlasWidth: guardedWidth, atlasHeight: guardedHeight, frames: []};
    await fs.mkdir(path.join(outputDir, 'frames', input.id), {recursive: true});
    for (let index = 0; index < 16; index++) {
      const col = index % 4, row = Math.floor(index / 4), number = index + 1;
      const rect = {x: xEdges[col], y: yEdges[row], width: xEdges[col + 1] - xEdges[col], height: yEdges[row + 1] - yEdges[row]};
      const raw = Buffer.alloc(frameWidth * frameHeight * 4);
      for (let y = 0; y < rect.height; y++) decoded.data.copy(raw, y * frameWidth * 4, ((rect.y + y) * metadata.width + rect.x) * 4, ((rect.y + y) * metadata.width + rect.x + rect.width) * 4);
      const alpha = alphaInspection(raw, frameWidth, frameHeight);
      const sourceAlpha = alphaInspection(raw, rect.width, rect.height, frameWidth);
      assert(sourceAlpha.visiblePixelsAtAlpha16 > 0, `${input.id} #${number}: empty source cell.`);
      assert(sourceAlpha.transparentPixels > 0, `${input.id} #${number}: no real transparent source pixels.`);
      if (sourceAlpha.edgeVisiblePixelsAtAlpha16) warnings.push({clip: input.id, number, code: 'visible-source-cell-edge', count: sourceAlpha.edgeVisiblePixelsAtAlpha16, note: 'Actual source cell boundary before padding. Inspect possible clipping or adjacent-cell contamination; no pixels were removed.'});
      if (sourceAlpha.edgeTracePixelsBelowAlpha16) warnings.push({clip: input.id, number, code: 'source-alpha-trace-at-edge', count: sourceAlpha.edgeTracePixelsBelowAlpha16, note: 'Very faint alpha on the actual source cell boundary before padding is retained unchanged.'});
      const measure = measured?.frames?.find(frame => frame.number === number);
      const pivot = policy === 'measured' ? measure?.pivot : target;
      assert(pivot && Number.isFinite(pivot.x) && Number.isFinite(pivot.y), `${input.id} #${number}: invalid pivot.`);
      const file = `frames/${input.id}/${String(number).padStart(2, '0')}.png`;
      const png = await sharp(raw, {raw: {width: frameWidth, height: frameHeight, channels: 4}}).png({compressionLevel: 9}).toBuffer();
      const roundtrip = await sharp(png).ensureAlpha().raw().toBuffer();
      assert(roundtrip.equals(raw), `${input.id} #${number}: RGBA export changed pixels.`);
      await writePng(path.join(outputDir, file), png);
      const frame = {index, number, file, sha256: digest(png), rgbaSha256: digest(raw), atlasRect: rect, exportedFrameSize: {width: frameWidth, height: frameHeight}, transparentPadding: {right: frameWidth - rect.width, bottom: frameHeight - rect.height}, pivot, anchorTarget: target, drawOffset: {x: target.x - pivot.x, y: target.y - pivot.y}, anchorConfidence: policy === 'measured' ? measure.confidence || 'manual-measurement' : 'unverified-layout-assumption', ...(policy==='measured'?{registrationMethod:measured.method || 'measured-pivots'}:{}), durationMs: 1000 / fps, alphaInspection: alpha,sourceCellAlphaInspection:sourceAlpha};
      clip.frames.push(frame);
      for (let y = 0; y < frameHeight; y++) raw.copy(guarded, ((row * cellHeight + guardPixels + y) * guardedWidth + col * cellWidth + guardPixels) * 4, y * frameWidth * 4, (y + 1) * frameWidth * 4);
      imported.frames.push({number, sourceFile: file, atlasRect: {x: col * cellWidth, y: row * cellHeight, width: cellWidth, height: cellHeight}, pivot: {x: pivot.x + guardPixels, y: pivot.y + guardPixels}, anchorTarget: target, drawOffset: {x: target.x - pivot.x - guardPixels, y: target.y - pivot.y - guardPixels}, durationMs: frame.durationMs, rgbaSha256: frame.rgbaSha256});
    }
    await fs.mkdir(path.join(outputDir, 'import_atlases'), {recursive: true});
    const guardedPng = await sharp(guarded, {raw: {width: guardedWidth, height: guardedHeight, channels: 4}}).png({compressionLevel: 9}).toBuffer();
    assert((await sharp(guardedPng).ensureAlpha().raw().toBuffer()).equals(guarded), `${input.id}: guard atlas RGBA mismatch.`);
    imported.sha256 = digest(guardedPng);
    await writePng(path.join(outputDir, imported.file), guardedPng);
    clips.push(clip); importedPages.push(imported);
    sourceChecks.push({id: input.id, inputPath, sourceSha256, generationFilename: input.generationFilename || null, generator: input.generator || config.generator || 'image_gen', promptRef: input.promptRef || null});
  }
  const playback = playbackCore.build(config.actions, clips, config.preview);
  const maxWidth = Math.max(...clips.map(clip => clip.frameWidth)), maxHeight = Math.max(...clips.map(clip => clip.frameHeight));
  const manifest = {schemaVersion: 1, version: config.version || '1.0', packId: config.packId || 'hunter-support-actions', artisticStatus: 'draft', characterId: config.characterId || 'reference-yautja', rosterBinding: null, publicBase: config.publicBase || '/game/sprites/hunter-support-actions/v1', facing: config.facing || 'right', facingReview: config.facingNotes || 'Right-facing source only; asymmetric equipment requires separate review before mirrored use.', actions: config.actions, clipCount: clips.length, frameCount: clips.length * 16, clips, preview: {stageWidth: Math.max(420,maxWidth+100),stageHeight:Math.max(420,maxHeight+100),padding:50}, playbackOptions: config.preview || {}, timing: {reviewTicksPerSecond: playback.ticksPerSecond, gameplayTimingChanged: false}, technicalChecks: {exactRgbaExports: true, transparentGuards: 2, sourceFilesUnchanged: true,sourceEdgeInspection:'Actual source cell rectangle before transparent padding',warnings: warnings.length}, limitations: ['Artistic continuity, silhouettes, contacts and identity require human review.', 'Fixed roots are layout assumptions unless a source-SHA-bound measurement is supplied.', 'Review frame timing is not a replacement for gameplay move timing.','Documented sequence issues are recorded in ART_REVIEW_LIMITATIONS.md.']};
  const imports = {schemaVersion: 1, artisticStatus: 'draft', guardPixels: 2, packing: 'Exact decoded source RGBA, with transparent padding and 2px outer guards; no resizing or repainting.', atlases: importedPages};
  for (const check of sourceChecks) assert(digest(await fs.readFile(check.inputPath)) === check.sourceSha256, `${check.id}: source changed during export.`);
  await json(path.join(outputDir, 'animations.json'), manifest);
  await json(path.join(outputDir, 'playback.json'), playback);
  await json(path.join(outputDir, 'import_atlases.json'), imports);
  await json(path.join(outputDir, 'provenance.json'), {schemaVersion: 1, artisticStatus: 'draft', sourceDrawingCount: manifest.frameCount, sourceAtlases: sourceChecks.map(({inputPath, ...check}) => check), operations: ['4x4 row-major exact RGBA cropping', 'Transparent right/bottom padding where rounded source grid widths differ', 'Exact RGBA copy into atlas with 2px transparent guards'], sourceReadOnly: true});
  await json(path.join(outputDir, 'technical_review.json'), {schemaVersion: 1, artisticStatus: 'draft', approvalGranted: false, warnings, artisticReviewNotes:clips.filter(clip=>clip.registration?.residualSeam).map(clip=>({clip:clip.id,note:clip.registration.residualSeam,evidence:clip.registration.evidence,review:clip.registration.review})), browserValidation: 'Not performed; offline behavior and composition checks only.'});
  const template = await fs.readFile(path.join(__dirname, 'preview_template.html'), 'utf8');
  const core = await fs.readFile(path.join(__dirname, 'playback_core.js'), 'utf8');
  const html = template.replace('__PLAYBACK_CORE__', () => core).replace('__SPRITE_DATA__', () => JSON.stringify({manifest, playback}).replaceAll('<', '\\u003c'));
  await fs.writeFile(path.join(outputDir, 'preview.html'), html);
  return {sourceClips: clips.length, sourceDrawings: manifest.frameCount, actions: config.actions.length, guardAtlases: importedPages.length, warnings: warnings.length, reviewTicksPerSecond: playback.ticksPerSecond, status: 'draft'};
}
if (require.main === module) exportPack(process.argv[2] || path.join(__dirname, 'sources.json'), process.argv[3] || __dirname).then(result => console.log(JSON.stringify(result))).catch(error => {console.error(error.stack); process.exitCode = 1;});
module.exports = {exportPack, alphaInspection};

