#!/usr/bin/env node
'use strict';
// Mechanical extraction and transparent padding only. Never redraw, resample,
// remove backgrounds, replace endpoints, or synthesize animation frames.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
let sharp;
try { sharp = require('sharp'); }
catch (error) {
  if (!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES) throw error;
  sharp = require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, 'sharp'));
}
const GRID = 4, TRANSITION_FPS = 16, IDLE_FPS = 10;
const LABELS = {
  branch: 'Accroupi sur une branche',
  trunk_close: 'Embuscade contre le tronc',
  trunk_open: 'Affût ouvert sur le tronc',
  roar: 'Provocation — rugissement',
  victory_spear: 'Victoire — lance dressée',
  victory_trophy: 'Victoire — trophée brandi',
};
const PHASE_LABELS = {enter: 'entrée', idle: 'maintien animé', exit: 'sortie'};
const sha256 = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
async function readFirstJSON(candidates) {
  for (const filename of [...new Set(candidates)]) {
    try {return {filename, data: JSON.parse(await fs.readFile(filename, 'utf8'))};}
    catch (error) {if (error.code !== 'ENOENT') throw error;}
  }
  return null;
}
function inspectCell(raw, channels, imageWidth, rect, hasAlpha) {
  const out = {
    transparentPixels: 0, nonTransparentPixels: 0, semitransparentPixels: 0,
    visiblePixels: 0, borderNonTransparentPixels: 0, borderVisiblePixels: 0,
    borderTracePixels: 0, borderOpaquePixels: 0, borderWarningAlphaThreshold: 16,
    alphaMin: 255, alphaMax: 0,
  };
  for (let y = 0; y < rect.height; y++) for (let x = 0; x < rect.width; x++) {
    const a = hasAlpha ? raw[((rect.y + y) * imageWidth + rect.x + x) * channels + channels - 1] : 255;
    out.alphaMin = Math.min(out.alphaMin, a); out.alphaMax = Math.max(out.alphaMax, a);
    if (a === 0) out.transparentPixels++;
    if (a > 0) out.nonTransparentPixels++;
    if (a > 0 && a < 255) out.semitransparentPixels++;
    if (a >= 16) out.visiblePixels++;
    if (a > 0 && (x === 0 || y === 0 || x === rect.width - 1 || y === rect.height - 1)) {
      out.borderNonTransparentPixels++;
      if (a >= 16) out.borderVisiblePixels++; else out.borderTracePixels++;
      if (a >= 128) out.borderOpaquePixels++;
    }
  }
  return out;
}
function buildPlayback(clips, actions) {
  const byId = Object.fromEntries(clips.map(clip => [clip.id, clip]));
  const steps = (id, order, role) => order.map(index => ({clipId: id, index, frame: index + 1, durationMs: 1000 / byId[id].fps, role}));
  const forward = Array.from({length: 16}, (_, i) => i), reverse = [...forward].reverse();
  const pingPong = [...forward, ...forward.slice(1, -1).reverse()];
  const stances = {};
  for (const action of actions) {
    const enter = `${action.id}_enter`, idle = `${action.id}_idle`, exit = `${action.id}_exit`;
    const entry = steps(enter, forward, 'enter');
    const idlePingPong = steps(idle, pingPong, 'idle'), idleForward = steps(idle, forward, 'idle');
    const exitReversible = steps(enter, reverse, 'exit_reversible'), exitDedicated = steps(exit, forward, 'exit_dedicated');
    const fixedHold = [{clipId: enter, index: 15, frame: 16, durationMs: 3000, role: 'fixed_hold'}];
    const rest = {clipId: enter, index: 0, frame: 1, durationMs: 500, role: 'rest'};
    const dedicatedRest = {...rest, clipId: exit, index: 15, frame: 16};
    stances[action.id] = {
      entry, idlePingPong, idleForward, exitReversible, exitDedicated, fixedHold,
      cycleIdleReversible: [...entry, ...idlePingPong, ...exitReversible, rest],
      cycleIdleDedicated: [...entry, ...idlePingPong, ...exitDedicated, dedicatedRest],
      cycleFixedReversible: [...entry, ...fixedHold, ...exitReversible, rest],
      cycleFixedDedicated: [...entry, ...fixedHold, ...exitDedicated, dedicatedRest],
    };
  }
  return {
    version: '2.0', transitionFps: TRANSITION_FPS, idleFps: IDLE_FPS,
    idleOrderOneBased: pingPong.map(i => i + 1), idleCycleMs: 3000,
    sourceDrawings: clips.reduce((sum, clip) => sum + clip.frameCount, 0),
    timingNote: 'L’aller-retour, les poses tenues et les sorties réversibles réutilisent les dessins source; ils ne comptent pas comme de nouveaux sprites.',
    joinNote: 'Les atlas générés séparément peuvent présenter des variations de pose ou de proportions aux raccords.',
    stances,
  };
}
async function buildGuardedImportAtlas(outputDir, clip, guardPixels = 2) {
  const cellWidth = clip.frameWidth + guardPixels * 2, cellHeight = clip.frameHeight + guardPixels * 2;
  const width = cellWidth * GRID, height = cellHeight * GRID;
  const pixels = Buffer.alloc(width * height * 4, 0);
  const frames = [];
  for (const frame of clip.frames) {
    const {data: original, info} = await sharp(path.join(outputDir, frame.file)).ensureAlpha().raw().toBuffer({resolveWithObject: true});
    if (info.width !== clip.frameWidth || info.height !== clip.frameHeight || info.channels !== 4) throw new Error(`${clip.id}/${frame.number}: guarded import requires the original uniform RGBA frame.`);
    const column = frame.index % GRID, row = Math.floor(frame.index / GRID);
    const cellX = column * cellWidth, cellY = row * cellHeight;
    const contentX = cellX + guardPixels, contentY = cellY + guardPixels;
    for (let y = 0; y < info.height; y++) {
      original.copy(pixels, ((contentY + y) * width + contentX) * 4, y * info.width * 4, (y + 1) * info.width * 4);
    }
    const pivot = frame.pivot ? {x: frame.pivot.x + guardPixels, y: frame.pivot.y + guardPixels} : null;
    frames.push({
      index: frame.index, number: frame.number, originalFile: frame.file,
      atlasRect: {x: cellX, y: cellY, width: cellWidth, height: cellHeight},
      contentRect: {x: contentX, y: contentY, width: clip.frameWidth, height: clip.frameHeight},
      originalPivot: frame.pivot, pivot,
      normalizedPivot: pivot ? {x: pivot.x / cellWidth, y: pivot.y / cellHeight} : null,
      anchorTarget: frame.anchorTarget,
      drawOffset: pivot && frame.anchorTarget ? {x: frame.anchorTarget.x - pivot.x, y: frame.anchorTarget.y - pivot.y} : {x: -guardPixels, y: -guardPixels},
      durationMs: frame.durationMs,
    });
  }
  const file = `import_atlases/${clip.id}.png`;
  await fs.mkdir(path.join(outputDir, 'import_atlases'), {recursive: true});
  await sharp(pixels, {raw: {width, height, channels: 4}}).png({compressionLevel: 9}).toFile(path.join(outputDir, file));
  const decoded = await sharp(path.join(outputDir, file)).raw().toBuffer();
  if (!decoded.equals(pixels)) throw new Error(`${clip.id}: guarded atlas encoding changed RGBA pixels.`);
  let borderAlphaNonzero = 0;
  for (const frame of frames) {
    const rect = frame.atlasRect;
    for (let x = 0; x < rect.width; x++) {
      if (decoded[(rect.y * width + rect.x + x) * 4 + 3] !== 0) borderAlphaNonzero++;
      if (decoded[((rect.y + rect.height - 1) * width + rect.x + x) * 4 + 3] !== 0) borderAlphaNonzero++;
    }
    for (let y = 1; y < rect.height - 1; y++) {
      if (decoded[((rect.y + y) * width + rect.x) * 4 + 3] !== 0) borderAlphaNonzero++;
      if (decoded[((rect.y + y) * width + rect.x + rect.width - 1) * 4 + 3] !== 0) borderAlphaNonzero++;
    }
  }
  if (borderAlphaNonzero) throw new Error(`${clip.id}: guarded atlas cell borders are not exactly transparent.`);
  return {
    id: clip.id, file, atlasWidth: width, atlasHeight: height,
    columns: GRID, rows: GRID, cellWidth, cellHeight, guardPixels,
    originalAtlas: clip.atlas, originalAtlasSha256: clip.atlasSha256,
    originalFrameWidth: clip.frameWidth, originalFrameHeight: clip.frameHeight,
    frameCount: frames.length, fps: clip.fps, frames,
    validation: {sourceRgbaBytesPreserved: true, exactZeroAlphaCellBorders: true, nonzeroBorderAlphaPixels: 0, artisticStatus: 'draft_requires_human_review', runtimeIntegration: 'not_validated'},
  };
}
async function main() {
  const args = process.argv.slice(2), positional = args.filter(arg => !arg.startsWith('--'));
  const sourceFile = path.resolve(positional[0] || path.join(__dirname, 'sources.json'));
  const outputDir = path.resolve(positional[1] || path.join(__dirname, '../../../public/game/sprites/hunter-postures-emotes/v1'));
  const source = JSON.parse(await fs.readFile(sourceFile, 'utf8'));
  const buildImportAtlases = args.includes('--import-guards') || source.buildImportAtlases === true;
  const inputs = Array.isArray(source) ? source : source.clips;
  if (!Array.isArray(inputs) || !inputs.length || inputs.length % 3) throw new Error('Expected complete enter/idle/exit clip groups.');
  if (source.expectedClipCount && inputs.length !== source.expectedClipCount) throw new Error(`Expected ${source.expectedClipCount} clips, received ${inputs.length}.`);
  const ids = new Set();
  for (const clip of inputs) {
    const match = /^([a-z0-9_]+)_(enter|idle|exit)$/.exec(clip.id || '');
    if (!match || ids.has(clip.id) || !clip.path) throw new Error(`Invalid, duplicate, or missing clip: ${clip.id}`);
    clip.stance = match[1]; clip.phase = match[2]; ids.add(clip.id);
  }
  const actionIds = [...new Set(inputs.map(clip => clip.stance))];
  for (const action of actionIds) for (const phase of ['enter', 'idle', 'exit']) {
    if (!ids.has(`${action}_${phase}`)) throw new Error(`Missing ${action}_${phase}.`);
  }
  const actions = actionIds.map(id => ({id, label: source.actionLabels?.[id] || LABELS[id] || id}));
  const orderedInputs = actions.flatMap(action => ['enter', 'idle', 'exit'].map(phase => inputs.find(clip => clip.id === `${action.id}_${phase}`)));
  const baseCandidates = source.baseManifestPath
    ? [path.resolve(path.dirname(sourceFile), source.baseManifestPath)]
    : [path.join(__dirname, 'v1_baseline.json'), path.join(__dirname, '../yautja_stances_v1/animations.json')];
  const baseline = await readFirstJSON(baseCandidates);
  const anchorCandidates = source.anchorMeasurementsPath
    ? [path.resolve(path.dirname(sourceFile), source.anchorMeasurementsPath)]
    : [path.join(path.dirname(sourceFile), 'anchor_measurements.json'), path.join(path.dirname(sourceFile), 'qa_anchor_measurements.json')];
  const anchors = await readFirstJSON(anchorCandidates);
  await fs.mkdir(path.join(outputDir, 'atlases'), {recursive: true});
  await fs.mkdir(path.join(outputDir, 'stances'), {recursive: true});
  const clips = [], importAtlases = [], warnings = [];
  let preservedV1Frames = 0;
  for (const input of orderedInputs) {
    const inputPath = path.resolve(path.dirname(sourceFile), input.path);
    const bytes = await fs.readFile(inputPath), atlasHash = sha256(bytes);
    const oldClip = baseline?.data.clips?.find(clip => clip.id === input.id);
    if (oldClip && oldClip.atlasSha256 !== atlasHash) throw new Error(`${input.id}: the original V1 atlas changed; refusing to replace its artwork.`);
    const meta = await sharp(bytes).metadata();
    if (meta.format !== 'png' || !meta.width || !meta.height || meta.width < 4 || meta.height < 4 || (meta.pages || 1) !== 1) throw new Error(`${input.id}: expected one PNG atlas.`);
    const frameWidth = Math.ceil(meta.width / 4), frameHeight = Math.ceil(meta.height / 4);
    const xEdges = Array.from({length: 5}, (_, i) => Math.round(i * meta.width / 4));
    const yEdges = Array.from({length: 5}, (_, i) => Math.round(i * meta.height / 4));
    const {data: raw, info} = await sharp(bytes).raw().toBuffer({resolveWithObject: true});
    const fps = input.phase === 'idle' ? IDLE_FPS : TRANSITION_FPS;
    const clipAnchors = anchors?.data.clips?.[input.id];
    if (clipAnchors?.sourceSha256 && clipAnchors.sourceSha256 !== atlasHash) throw new Error(`${input.id}: anchor measurements refer to a different source image; refresh measurements before exporting.`);
    if (!clipAnchors && !oldClip) warnings.push(`${input.id}: ancrage non mesuré; placement à contrôler.`);
    const atlasPath = path.join(outputDir, 'atlases', `${input.id}.png`);
    if (inputPath !== atlasPath) await fs.copyFile(inputPath, atlasPath);
    const frameDir = path.join(outputDir, 'frames', input.id);
    await fs.mkdir(frameDir, {recursive: true});
    const frames = [];
    for (let index = 0; index < 16; index++) {
      const col = index % 4, row = Math.floor(index / 4);
      const atlasRect = {x: xEdges[col], y: yEdges[row], width: xEdges[col + 1] - xEdges[col], height: yEdges[row + 1] - yEdges[row]};
      const transparentPadding = {left: 0, top: 0, right: frameWidth - atlasRect.width, bottom: frameHeight - atlasRect.height};
      const filename = `${String(index + 1).padStart(3, '0')}.png`;
      const outputPath = path.join(frameDir, filename);
      const oldFrame = oldClip?.frames?.[index];
      if (oldFrame) {
        const oldPath = path.resolve(path.dirname(baseline.filename), oldFrame.file);
        await fs.access(oldPath);
        if (oldPath !== outputPath) await fs.copyFile(oldPath, outputPath);
        preservedV1Frames++;
      } else {
        let pipeline = sharp(bytes).extract({left: atlasRect.x, top: atlasRect.y, width: atlasRect.width, height: atlasRect.height});
        if (transparentPadding.right || transparentPadding.bottom) pipeline = pipeline.extend({...transparentPadding, background: {r: 0, g: 0, b: 0, alpha: 0}});
        await pipeline.png({compressionLevel: 9}).toFile(outputPath);
      }
      const measured = clipAnchors?.frames?.find(frame => frame.number === index + 1);
      const pivot = measured?.pivot || oldFrame?.pivot || null;
      const anchorTarget = clipAnchors?.target || oldFrame?.anchorTarget || null;
      frames.push({
        index, number: index + 1, file: `frames/${input.id}/${filename}`,
        atlasRect, exportedFrameSize: {width: frameWidth, height: frameHeight}, transparentPadding,
        pivot, anchorTarget, drawOffset: pivot && anchorTarget ? {x: anchorTarget.x - pivot.x, y: anchorTarget.y - pivot.y} : {x: 0, y: 0},
        anchorConfidence: measured?.confidence || oldFrame?.anchorConfidence || 'unmeasured', durationMs: 1000 / fps,
        provenance: oldFrame ? 'V1 PNG copied byte-for-byte; original atlas hash verified.' : 'Native cell mechanically extracted from a newly generated atlas.',
        alphaInspection: inspectCell(raw, info.channels, meta.width, atlasRect, !!meta.hasAlpha),
      });
    }
    const emptyFrames = frames.filter(frame => !frame.alphaInspection.visiblePixels).map(frame => frame.number);
    const borderFrames = frames.filter(frame => frame.alphaInspection.borderVisiblePixels).map(frame => frame.number);
    if (emptyFrames.length) warnings.push(`${input.id}: cellules vides au seuil alpha16: ${emptyFrames.join(', ')}.`);
    if (borderFrames.length) warnings.push(`${input.id}: pixels alpha≥16 au bord des cellules ${borderFrames.join(', ')}; contrôler le cadrage.`);
    if (!meta.hasAlpha) warnings.push(`${input.id}: source sans canal alpha; aucun fond retiré.`);
    const clip = {
      id: input.id, stance: input.stance, phase: input.phase,
      label: input.label || `${actions.find(action => action.id === input.stance).label} — ${PHASE_LABELS[input.phase]}`,
      atlas: `atlases/${input.id}.png`, atlasSha256: atlasHash,
      sourceFilename: input.generationFilename || path.basename(inputPath),
      provenance: oldClip ? 'Original generated V1 source retained.' : 'New generated image based on supplied references and hero stance.',
      atlasWidth: meta.width, atlasHeight: meta.height, frameWidth, frameHeight, frameCount: 16,
      columns: 4, rows: 4, order: 'row-major', fps, hasAlpha: !!meta.hasAlpha, channels: meta.channels,
      gridEdges: {x: xEdges, y: yEdges}, gridStrategy: 'round(i*atlasSize/4), exact crop, transparent right/bottom padding ≤1px; no resampling',
      anchorType: clipAnchors?.anchorType || oldClip?.anchorType || null,
      anchorTarget: clipAnchors?.target || oldClip?.anchorTarget || null,
      anchorNotes: clipAnchors?.notes || oldClip?.anchorNotes || [],
      sourceBorderChecks: {
        visualThreshold: 16,
        visualThresholdPass: borderFrames.length === 0,
        exactZeroAlphaPass: frames.every(frame => frame.alphaInspection.borderNonTransparentPixels === 0),
        traceBorderPixels: frames.reduce((sum,frame) => sum + frame.alphaInspection.borderTracePixels,0),
        note: 'Source image measurements only; no engine or human art validation.',
      },
      frames,
    };
    if (input.phase === 'enter') {
      clip.staticStance = {file: `stances/${input.stance}.png`, sourceFrame: 16};
      await fs.copyFile(path.join(frameDir, '016.png'), path.join(outputDir, clip.staticStance.file));
    }
    if (buildImportAtlases) {
      const guarded = await buildGuardedImportAtlas(outputDir, clip);
      importAtlases.push(guarded);
      clip.importAtlas = {file: guarded.file, manifest: 'import_atlases.json', cellWidth: guarded.cellWidth, cellHeight: guarded.cellHeight, guardPixels: guarded.guardPixels};
    }
    clips.push(clip);
    console.log(JSON.stringify({id: input.id, atlas: [meta.width, meta.height], frame: [frameWidth, frameHeight], frames: 16, v1Preserved: oldClip ? 16 : 0, measuredAnchors: frames.filter(frame => frame.pivot).length, emptyFrames, borderFramesAlpha16: borderFrames}));
  }
  const playbackSequences = buildPlayback(clips, actions);
  await fs.writeFile(path.join(outputDir, 'playback.json'), JSON.stringify(playbackSequences, null, 2) + '\n');
  if (baseline) await fs.writeFile(path.join(outputDir, 'v1_baseline.json'), JSON.stringify({version: '1.0', purpose: 'Original V1 atlas hashes and frame references for preservation during V2 re-export.', clips: baseline.data.clips.filter(clip => !clip.id.endsWith('_idle'))}, null, 2) + '\n');
  if (buildImportAtlases) await fs.writeFile(path.join(outputDir, 'import_atlases.json'), JSON.stringify({
    version: '2.0', purpose: 'Optional mechanical import packing with exactly transparent cell borders.',
    originalArtworkUnchanged: true, guardPixels: 2, order: 'row-major',
    pivotRule: 'guardedPivot = originalPivot + (2,2); drawOffset = originalAnchorTarget - guardedPivot',
    countNote: 'Guarded atlases reuse the original drawings and do not add new source sprites.',
    artisticStatus: 'draft_requires_human_review', runtimeIntegration: 'not_validated',
    atlases: importAtlases,
  }, null, 2) + '\n');
  const total = clips.reduce((sum, clip) => sum + clip.frameCount, 0);
  const manifest = {
    title: 'Yautja — Postures, respirations et célébrations', version: '2.0', generatedOn: new Date().toISOString(),
    productionStatus: 'draft',
    runtimeIntegration: {integrated: false, characterBinding: null, artisticApproval: false, reason: 'Reference-derived asset pack; source border alpha traces and cross-atlas joins require review before use in the game renderer.'},
    provenance: `${preservedV1Frames} dessins V1 conservés; ${total - preservedV1Frames} nouveaux dessins générés.`,
    status: 'Sources générées et exportées; intégration et fluidité dans le jeu non vérifiées.',
    artisticStatus: 'draft_requires_human_review', runtimeValidationState: 'not_validated',
    runtimeImportStatus: 'Brouillon pour revue visuelle; aucune validation moteur revendiquée. Les traces alpha source sont conservées; le seuil visuel alpha16 ne remplace pas une règle moteur exigeant des bords strictement transparents.',
    export: 'Découpe native 4×4, pixels et alpha source conservés; marge transparente éventuelle ≤1px à droite/en bas. Aucun redimensionnement, retouche de fond ou remplacement d’image.',
    actions, frameCount: total, preservedV1Frames, newSourceFrameCount: total - preservedV1Frames,
    idleSourceFrameCount: clips.filter(clip => clip.phase === 'idle').length * 16, staticStanceCount: actions.length,
    importAtlasManifest: buildImportAtlases ? 'import_atlases.json' : null, importAtlasCount: importAtlases.length,
    recommendedFps: TRANSITION_FPS, recommendedIdleFps: IDLE_FPS,
    anchorMeasurementMethod: anchors?.data.method || null,
    preview: {canvasWidth: Math.max(420, ...clips.map(clip => clip.frameWidth + 106)), canvasHeight: Math.max(420, ...clips.map(clip => clip.frameHeight + 106)), padding: 50, defaultExit: 'reversed-entry', defaultHold: 'idle-ping-pong', drawOffsetRule: 'anchorTarget − pivot, applied only at playback'},
    playback: {file: 'playback.json', default: 'Entry1→16 at16fps; idle1→16→2 at10fps; reversed entry16→1 at16fps; rest0.5s.', fixedHold: 'Fixed hold + reversed entry preserves identical V1 endpoint drawings.', sourceCountNote: 'Playback reuse does not add drawings.', joins: 'Cross-atlas pose/proportion drift can remain; offset registration only changes placement.'},
    clips, warnings,
  };
  await fs.writeFile(path.join(outputDir, 'animations.json'), JSON.stringify(manifest, null, 2) + '\n');
  const template = await fs.readFile(path.join(__dirname, 'preview_template.html'), 'utf8');
  if (!template.includes('__SPRITE_DATA__')) throw new Error('Preview template marker missing.');
  const makeHTML = imageClips => template.replace('__SPRITE_DATA__', () => JSON.stringify({...manifest, clips: imageClips, playbackSequences}).replace(/</g, '\\u003c'));
  const preview = makeHTML(clips);
  await fs.writeFile(path.join(outputDir, 'preview.html'), preview);
  console.log(JSON.stringify({outputDir, actions: actions.length, sourceFrames: total, preservedV1Frames, newSourceFrames: total - preservedV1Frames, previewBytes: Buffer.byteLength(preview), warnings}, null, 2));
}
main().catch(error => {console.error(error.stack || String(error)); process.exitCode = 1;});
