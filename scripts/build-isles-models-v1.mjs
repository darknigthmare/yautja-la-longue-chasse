#!/usr/bin/env node
/** The Isles V1 · runtime models from the Meshy sources in art-source/isles-meshy-20261128
 * (humans, first animals, altar) and art-source/isles-meshy-20261128b (vehicles, more animals).
 * Each GLB keeps its geometry, skin and animations; embedded textures are resized to 1024 px
 * JPEG so the whole set stays light for the browser. Writes public/game/isles/models/*.glb and
 * a manifest with sizes and SHA-256. `--check` verifies the outputs without writing. */
import {createHash} from 'node:crypto';
import {readFile, writeFile, mkdir, readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = path.join(root, 'public/game/isles/models');
const check = process.argv.includes('--check');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

/** Runtime files of the first set: id → [source file in the Meshy project, published name]. */
const PLAN = [
  ['braconnier', 'walking_glb.glb', 'braconnier.glb'], ['braconnier', 'running_armature_glb.glb', 'braconnier-course.glb'],
  ['unite-tactique', 'walking_glb.glb', 'unite-tactique.glb'], ['unite-tactique', 'running_armature_glb.glb', 'unite-tactique-course.glb'],
  ['archeologue', 'walking_glb.glb', 'archeologue.glb'],
  ['jaguar', 'model.glb', 'jaguar.glb'], ['chien', 'model.glb', 'chien.glb'], ['sanglier', 'model.glb', 'sanglier.glb'],
  ['crocodile', 'model.glb', 'crocodile.glb'], ['autel', 'model.glb', 'autel.glb'],
];

/** Second set: one static `model.glb` per id, published as `<id>.glb`. */
const PLAN_B = ['metro', 'train', 'train-fret', 'bus', 'camion', 'pickup', 'ferry', 'bateau', 'avion', 'avion-brousse', 'helicoptere', 'telepherique',
  'ours-brun', 'loup', 'cerf', 'lion', 'buffle', 'requin'].map(id => [id, 'model.glb', id + '.glb']);

/** Source sets in publication order. `maxBytes` is the per-file budget of a set (the first set predates it). */
const SETS = [
  {dir: 'art-source/isles-meshy-20261128', plan: PLAN},
  {dir: 'art-source/isles-meshy-20261128b', plan: PLAN_B, maxBytes: 1_200_000},
];

function readGlb(bytes) {
  if (bytes.readUInt32LE(0) !== 0x46546c67) throw new Error('not a GLB');
  let offset = 12, json = null, bin = Buffer.alloc(0);
  while (offset < bytes.length) {
    const length = bytes.readUInt32LE(offset), type = bytes.readUInt32LE(offset + 4);
    const chunk = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === 0x4e4f534a) json = JSON.parse(chunk.toString('utf8')); else if (type === 0x004e4942) bin = Buffer.from(chunk);
    offset += 8 + length;
  }
  return {json, bin};
}

function writeGlb(json, bin) {
  const pad = (buffer, fill) => Buffer.concat([buffer, Buffer.alloc((4 - buffer.length % 4) % 4, fill)]);
  const jsonChunk = pad(Buffer.from(JSON.stringify(json)), 0x20), binChunk = pad(bin, 0);
  const header = Buffer.alloc(12), jh = Buffer.alloc(8), bh = Buffer.alloc(8);
  header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + binChunk.length, 8);
  jh.writeUInt32LE(jsonChunk.length, 0); jh.writeUInt32LE(0x4e4f534a, 4);
  bh.writeUInt32LE(binChunk.length, 0); bh.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, jh, jsonChunk, bh, binChunk]);
}

/** Rebuilds the binary chunk with resized images; every other buffer view is copied unchanged. */
async function shrink(bytes) {
  const {json, bin} = readGlb(bytes);
  const imageViews = new Map((json.images ?? []).filter(image => image.bufferView !== undefined).map((image, i) => [image.bufferView, i]));
  const parts = [];
  let cursor = 0;
  for (let i = 0; i < (json.bufferViews ?? []).length; i++) {
    const view = json.bufferViews[i];
    let data = bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
    if (imageViews.has(i)) {
      data = await sharp(data).resize(1024, 1024, {fit: 'inside', withoutEnlargement: true}).jpeg({quality: 82, mozjpeg: true}).toBuffer();
      json.images[imageViews.get(i)].mimeType = 'image/jpeg';
    }
    const padding = (4 - cursor % 4) % 4;
    if (padding) { parts.push(Buffer.alloc(padding)); cursor += padding; }
    view.byteOffset = cursor; view.byteLength = data.length; view.buffer = 0;
    parts.push(data); cursor += data.length;
  }
  const newBin = Buffer.concat(parts);
  json.buffers = [{byteLength: newBin.length}];
  json.asset = {...json.asset, extras: {...(json.asset?.extras ?? {}), yautja: 'The Isles V1 · Meshy source, textures 1024 px'}};
  return writeGlb(json, newBin);
}

const manifest = {version: 1, source: SETS[0].dir, sources: SETS.map(set => set.dir), generator: 'Meshy text-to-3d (preview + refine), rigging for humans', models: {}};
if (!check) await mkdir(out, {recursive: true});
let failed = false;
for (const set of SETS) {
  const source = path.join(root, set.dir);
  const projects = (await readdir(source)).filter(name => /^\d{8}_\d{6}_/.test(name));
  /** state.json names the kept project when a retry left two folders for one id. */
  const state = JSON.parse(await readFile(path.join(source, 'state.json'), 'utf8'));
  const projectOf = id => {
    const named = projects.filter(name => name.split('_').slice(2, -1).join('_') === id);
    return named.length > 1 ? named.find(name => name === path.basename(state[id]?.project ?? '')) : named[0];
  };
  for (const [id, file, name] of set.plan) {
    const project = projectOf(id);
    if (!project) throw new Error('Projet Meshy absent : ' + id);
    const input = await readFile(path.join(source, project, file));
    const output = await shrink(input);
    manifest.models[name] = {id, ...(set === SETS[0] ? {} : {source: set.dir}), from: path.posix.join(project, file), bytes: output.length, sha256: sha(output), sourceSha256: sha(input)};
    if (set.maxBytes && output.length > set.maxBytes) { failed = true; process.stderr.write(name + ' dépasse ' + (set.maxBytes / 1e6).toFixed(1) + ' Mo.\n'); }
    if (check) {
      const current = await readFile(path.join(out, name)).catch(() => null);
      if (!current || sha(current) !== sha(output)) { failed = true; process.stderr.write(name + ' est à régénérer.\n'); }
    } else {
      await writeFile(path.join(out, name), output);
      process.stdout.write(name + ' · ' + (input.length / 1e6).toFixed(2) + ' → ' + (output.length / 1e6).toFixed(2) + ' Mo\n');
    }
  }
}
if (!check) await writeFile(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
if (failed) process.exitCode = 1;
