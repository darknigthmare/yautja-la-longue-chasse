#!/usr/bin/env node
'use strict';

// Mechanical atlas export only: no drawing, resampling, background removal,
// image interpolation, color correction, or generated intermediate poses.
// Fractional grids use rounded source edges and at most one transparent pixel
// of padding on the right/bottom, so exported frame canvases have equal sizes.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
let sharp;
try { sharp = require('sharp'); }
catch (e) {
  if (!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES) throw e;
  sharp = require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, 'sharp'));
}

const GRID = 4;
const FPS = 16;
const CLIP_IDS = [
  'branch_enter', 'branch_exit',
  'trunk_close_enter', 'trunk_close_exit',
  'trunk_open_enter', 'trunk_open_exit',
];
const STANCES = {
  branch: 'Accroupi sur une branche',
  trunk_close: 'Embuscade contre le tronc',
  trunk_open: 'Affût ouvert sur le tronc',
};
const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

function inspectCell(raw, channels, imageWidth, x, y, width, height, hasAlpha) {
  const result = {
    nonTransparentPixels: 0, transparentPixels: 0, semitransparentPixels: 0,
    visiblePixels: 0, borderNonTransparentPixels: 0,
    borderVisiblePixels: 0, borderTracePixels: 0, borderOpaquePixels: 0,
    borderWarningAlphaThreshold: 16, alphaMin: 255, alphaMax: 0,
    occupiedBounds: null,
  };
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let yy = 0; yy < height; yy++) {
    for (let xx = 0; xx < width; xx++) {
      const a = hasAlpha ? raw[((y + yy) * imageWidth + x + xx) * channels + channels - 1] : 255;
      result.alphaMin = Math.min(result.alphaMin, a);
      result.alphaMax = Math.max(result.alphaMax, a);
      if (a === 0) result.transparentPixels++;
      if (a > 0 && a < 255) result.semitransparentPixels++;
      if (a >= 16) result.visiblePixels++;
      if (a > 0) {
        result.nonTransparentPixels++;
        minX = Math.min(minX, xx); minY = Math.min(minY, yy);
        maxX = Math.max(maxX, xx); maxY = Math.max(maxY, yy);
        if (xx === 0 || xx === width - 1 || yy === 0 || yy === height - 1) {
          result.borderNonTransparentPixels++;
          if (a >= 16) result.borderVisiblePixels++;
          else result.borderTracePixels++;
          if (a >= 128) result.borderOpaquePixels++;
        }
      }
    }
  }
  if (maxX >= 0) result.occupiedBounds = {x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1};
  return result;
}

async function main() {
  const sourceFile = path.resolve(process.argv[2] || path.join(__dirname, 'sources.json'));
  const outputDir = path.resolve(process.argv[3] || path.join(__dirname, '../../../public/game/sprites/hunter-postures-emotes/v1'));
  const sourceData = JSON.parse(await fs.readFile(sourceFile, 'utf8'));
  const sourceClips = Array.isArray(sourceData) ? sourceData : sourceData.clips;
  const anchorCandidates = sourceData.anchorMeasurementsPath
    ? [path.resolve(path.dirname(sourceFile), sourceData.anchorMeasurementsPath)]
    : [path.join(path.dirname(sourceFile), 'qa_anchor_measurements.json'), path.join(__dirname, '..', 'qa_anchor_measurements.json')];
  let anchorMeasurements = null;
  for (const candidate of [...new Set(anchorCandidates)]) {
    try {anchorMeasurements = JSON.parse(await fs.readFile(candidate, 'utf8')); break;}
    catch (error) {if (error.code !== 'ENOENT') throw error;}
  }
  if (!Array.isArray(sourceClips) || sourceClips.length !== 6) throw new Error('sources.json must contain exactly six clips.');
  if (new Set(sourceClips.map(c => c.id)).size !== 6 || CLIP_IDS.some(id => !sourceClips.some(c => c.id === id))) {
    throw new Error('Clip ids must be branch_enter/exit, trunk_close_enter/exit, trunk_open_enter/exit.');
  }
  await fs.mkdir(path.join(outputDir, 'atlases'), {recursive: true});
  await fs.mkdir(path.join(outputDir, 'stances'), {recursive: true});
  const clips = [];
  const previewClips = [];
  const warnings = [];
  if (!anchorMeasurements) warnings.push('No anchor measurements were found. Preview placement remains unregistered.');
  for (const id of CLIP_IDS) {
    const source = sourceClips.find(c => c.id === id);
    if (!source.path) throw new Error(`Missing atlas path for ${id}.`);
    const inputPath = path.resolve(path.dirname(sourceFile), source.path);
    const imageBytes = await fs.readFile(inputPath);
    const meta = await sharp(imageBytes).metadata();
    if (meta.format !== 'png') throw new Error(`${id}: input must be an original PNG atlas.`);
    if (!meta.width || !meta.height || meta.width < GRID || meta.height < GRID) {
      throw new Error(`${id}: atlas dimensions ${meta.width}x${meta.height} are too small for a four-by-four grid.`);
    }
    if (meta.pages && meta.pages > 1) throw new Error(`${id}: animated or multipage input is unsupported.`);
    const width = Math.ceil(meta.width / GRID), height = Math.ceil(meta.height / GRID);
    const xEdges = Array.from({length: GRID + 1}, (_, i) => Math.round(i * meta.width / GRID));
    const yEdges = Array.from({length: GRID + 1}, (_, i) => Math.round(i * meta.height / GRID));
    const {data: raw, info} = await sharp(imageBytes).raw().toBuffer({resolveWithObject: true});
    const hasAlpha = !!meta.hasAlpha;
    const clipDir = path.join(outputDir, 'frames', id);
    await fs.mkdir(clipDir, {recursive: true});
    const atlasPath = path.join(outputDir, 'atlases', `${id}.png`);
    if (inputPath !== atlasPath) await fs.copyFile(inputPath, atlasPath);
    const frames = [];
    const clipAnchor = anchorMeasurements?.clips?.[id];
    if (anchorMeasurements && !clipAnchor) warnings.push(`${id}: no anchor measurements; review placement before integration.`);
    for (let index = 0; index < GRID * GRID; index++) {
      const row = Math.floor(index / GRID), column = index % GRID;
      const x = xEdges[column], y = yEdges[row];
      const cellWidth = xEdges[column + 1] - x, cellHeight = yEdges[row + 1] - y;
      const padding = {top: 0, left: 0, right: width - cellWidth, bottom: height - cellHeight};
      const name = `${String(index + 1).padStart(3, '0')}.png`;
      const outPath = path.join(clipDir, name);
      const measuredAnchor = clipAnchor?.frames?.find(frame => frame.number === index + 1);
      const pivot = measuredAnchor?.pivot || null;
      const target = clipAnchor?.target || null;
      const drawOffset = pivot && target ? {x: target.x - pivot.x, y: target.y - pivot.y} : {x: 0, y: 0};
      let framePipeline = sharp(imageBytes).extract({left: x, top: y, width: cellWidth, height: cellHeight});
      if (padding.right || padding.bottom) framePipeline = framePipeline.extend({...padding, background: {r: 0, g: 0, b: 0, alpha: 0}});
      await framePipeline.png({compressionLevel: 9}).toFile(outPath);
      frames.push({
        index, number: index + 1, file: `frames/${id}/${name}`,
        atlasRect: {x, y, width: cellWidth, height: cellHeight},
        exportedFrameSize: {width, height}, transparentPadding: padding,
        pivot, anchorTarget: target, drawOffset,
        anchorConfidence: measuredAnchor?.confidence || 'unmeasured',
        durationMs: 1000 / FPS,
        alphaInspection: inspectCell(raw, info.channels, meta.width, x, y, cellWidth, cellHeight, hasAlpha),
      });
    }
    const stance = id.replace(/_(enter|exit)$/, '');
    const phase = id.endsWith('_enter') ? 'enter' : 'exit';
    if (source.stance && source.stance !== stance) warnings.push(`${id}: inferred stance '${stance}' used instead of supplied '${source.stance}'.`);
    if (source.phase && source.phase !== phase) warnings.push(`${id}: inferred phase '${phase}' used instead of supplied '${source.phase}'.`);
    if (!hasAlpha) warnings.push(`${id}: source has no alpha channel; no background was removed.`);
    const emptyFrames = frames.filter(f => !f.alphaInspection.visiblePixels).map(f => f.number);
    if (emptyFrames.length) warnings.push(`${id}: empty alpha cells: ${emptyFrames.join(', ')}.`);
    const touchingFrames = frames.filter(f => f.alphaInspection.borderVisiblePixels).map(f => f.number);
    if (touchingFrames.length) warnings.push(`${id}: pixels with alpha ≥16 touch cell boundaries in frames ${touchingFrames.join(', ')}; inspect for cropping/grid alignment.`);
    const clip = {
      id, label: source.label || `${STANCES[stance]} — ${phase === 'enter' ? 'entrée' : 'sortie'}`,
      stance, phase, atlas: `atlases/${id}.png`, atlasSha256: sha256(imageBytes),
      atlasWidth: meta.width, atlasHeight: meta.height,
      frameWidth: width, frameHeight: height, frameCount: frames.length,
      columns: GRID, rows: GRID, order: 'row-major', fps: FPS,
      gridEdges: {x: xEdges, y: yEdges},
      gridStrategy: 'round(i * atlasSize / 4); pad right/bottom with transparent pixels to ceil(atlasSize / 4), no resampling',
      hasAlpha, channels: meta.channels,
      anchorType: clipAnchor?.anchorType || null,
      anchorTarget: clipAnchor?.target || null,
      anchorNotes: clipAnchor?.notes || [],
      anchorStatus: clipAnchor ? 'Décalages de lecture mesurés; appuis des pieds ou de la main à vérifier avec la géométrie du moteur cible. PNG source non déplacés.' : 'Ancrages non mesurés; placement à vérifier dans le moteur cible.',
      frames,
    };
    if (phase === 'enter') {
      const stanceFile = `stances/${stance}.png`;
      await fs.copyFile(path.join(clipDir, '016.png'), path.join(outputDir, stanceFile));
      clip.staticStance = {file: stanceFile, sourceFrame: 16};
    }
    clips.push(clip);
    previewClips.push(clip);
    console.log(JSON.stringify({id, atlas: `${meta.width}x${meta.height}`, exportedCanvas: `${width}x${height}`, gridEdges: {x: xEdges, y: yEdges}, paddedFrames: frames.filter(f => f.transparentPadding.right || f.transparentPadding.bottom).length, frames: frames.length, measuredAnchors: frames.filter(f => f.pivot).length, hasAlpha, emptyFrames, borderTouchingFramesAlpha16: touchingFrames, traceBorderPixels: frames.reduce((sum, f) => sum + f.alphaInspection.borderTracePixels, 0)}));
  }
  const manifest = {
    title: 'Yautja — Postures arboricoles', version: '1.0',
    productionStatus: 'draft',
    runtimeIntegration: {integrated: false, characterBinding: null, artisticApproval: false, reason: 'Reference-derived asset pack; source border alpha traces and cross-atlas joins require review before use in the game renderer.'},
    generatedOn: new Date().toISOString(),
    provenance: 'Nouveaux sprites générés à partir des trois références fournies par l’utilisateur.',
    status: 'Assets exportés; intégration et fluidité dans le jeu non vérifiées.',
    export: 'Découpage mécanique en grille 4×4 aux limites arrondies; pixels source et alpha conservés, sans redimensionnement ni retouche du fond. Ajout éventuel d’au plus un pixel transparent à droite/en bas pour uniformiser les canevas.',
    frameCount: clips.reduce((n, c) => n + c.frameCount, 0),
    staticStanceCount: clips.filter(c => c.phase === 'enter').length,
    recommendedFps: FPS,
    anchorMeasurementMethod: anchorMeasurements?.method || null,
    preview: {canvasWidth: 420, canvasHeight: 420, padding: 50, defaultExit: 'reversed-entry', drawOffsetRule: 'anchorTarget minus measured pivot; applied during playback only'},
    playback: {
      default: 'Entry frames 1→16; hold16; the same entry frames16→1; hold1. The reversible exit reuses the original entry drawings and guarantees identical endpoint images.',
      alternate: 'Dedicated exit frames1→16 remain independently drawn. Small differences of proportions and pose can remain at the joins even after anchor translation.',
      sourceFramePolicy: 'All96 original generated transition frames are included; no endpoints are replaced and no new drawings are synthesized.',
    },
    clips, warnings,
  };
  await fs.writeFile(path.join(outputDir, 'animations.json'), JSON.stringify(manifest, null, 2) + '\n');
  const template = await fs.readFile(path.join(__dirname, 'preview_template.html'), 'utf8');
  const dataJSON = JSON.stringify({...manifest, clips: previewClips}).replace(/</g, '\\u003c');
  if (!template.includes('__SPRITE_DATA__')) throw new Error('Preview template data marker is missing.');
  await fs.writeFile(path.join(outputDir, 'preview.html'), template.replace('__SPRITE_DATA__', () => dataJSON));
  console.log(JSON.stringify({outputDir, totalFrames: manifest.frameCount, staticStances: manifest.staticStanceCount, warnings}, null, 2));
}

main().catch(error => {console.error(error.stack || String(error)); process.exitCode = 1;});
