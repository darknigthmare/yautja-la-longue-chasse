/** Explicit native inputs for the bounded V112 Homeworld and Pit recipes. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {homeworldSceneSsrV78} from '../tests/helpers/homeworld-scene-ssr-v78.mjs';
import {fingerprintV112} from './snapshot-runtime-v112.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
async function walk(directory) {
  try {
    const entries = await fs.readdir(path.join(ROOT, directory), {withFileTypes: true});
    return (await Promise.all(entries.map(entry => entry.isDirectory() ? walk(directory + '/' + entry.name) : entry.isFile() ? [directory + '/' + entry.name] : []))).flat();
  } catch (error) {if (error.code === 'ENOENT') return []; throw error;}
}
export async function buildRuntimePublicInputsV112() {
  const qa = homeworldSceneSsrV78(ROOT), load = file => qa.load('app/game/systems/' + file + '.ts');
  const world = load('homeworldWorldV77'), places = load('homeworldPublicPlacesV112');
  load('homeworldPublicPlacesMountV112');
  const life = load('homeworldPublicLifeV112'), motion = load('homeworldCivilianMotionV74');
  const sourcePaths = new Set();
  const add = src => {assert.ok(typeof src === 'string' && src.startsWith('/game/')); sourcePaths.add('public' + src);};
  for (const item of places.HOMEWORLD_PUBLIC_PLACES_V112) add(places.HOMEWORLD_PUBLIC_PLACE_ART_V112[item.artId].src);
  for (const inhabitant of life.HOMEWORLD_PUBLIC_LIFE_V112) {
    for (const frame of Object.values(motion.HOMEWORLD_CIVILIAN_MOTION_V74.roles[inhabitant.civilianRole].clips).flat()) {
      add(motion.HOMEWORLD_CIVILIAN_MOTION_V74.sources[frame.sourceId].src);
    }
  }
  for (const building of world.HOMEWORLD_BUILDINGS_V77.filter(row => load('homeworldFoundationSupportsV112').HOMEWORLD_FOUNDATION_BUILDING_IDS_V112.includes(row.id))) add(building.art.src);
  const architecture = JSON.parse(await fs.readFile(path.join(ROOT, 'app/game/data/homeworldNativeArchitectureV81.json'), 'utf8'));
  for (const id of ['basalt-city-foundation', 'paving-undercity', 'paving-council', 'paving-civic']) add(architecture.assets[id].art.src);
  add(load('homeworldOutskirtsArtV71').HOMEWORLD_OUTSKIRTS_GROUND_V71.src);
  const natural = load('homeworldNaturalPlacementsV112'), naturalArt = load('homeworldOutskirtsArtV71').HOMEWORLD_OUTSKIRTS_ART_V71;
  for (const item of natural.HOMEWORLD_NATURAL_MODULES_V112) add(naturalArt[item.artId].src);
  for (const material of Object.values(load('homeworldLandscapeV75').HOMEWORLD_LANDSCAPE_MATERIALS_V75)) add(material.src);
  const assets = (await walk('public/game')).filter(file => /\/v112\//.test(file)).sort();
  const provenance = [...await walk('art-source/v112'), ...await walk('art-source/v112-pit-backward'),
    ...await walk('docs/suivi-production/v112-pit-backward')].sort();
  return {schemaVersion: 1, release: 'V112',
    scope: 'Unedited new V112 native sources and original receipts; explicitly reused civilian motion, public furniture, six facades and foundation/paving images. Reuse does not close an artistic target.',
    assets: await Promise.all(assets.map(file => fingerprintV112(ROOT, file))),
    provenance: await Promise.all(provenance.map(file => fingerprintV112(ROOT, file))),
    runtimeAssets: [...sourcePaths].sort()};
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  assert.ok(process.argv.length === 2 || process.argv.length === 3 && process.argv[2] === '--check');
  const file = path.join(ROOT, 'docs/v112-runtime-public-inputs.json');
  const bytes = Buffer.from(JSON.stringify(await buildRuntimePublicInputsV112(), null, 2) + '\n');
  if (process.argv[2] === '--check') assert.deepEqual(await fs.readFile(file), bytes, 'V112 native inventory changed');
  else await fs.writeFile(file, bytes);
  console.log(JSON.stringify({status: process.argv[2] ? 'PASS' : 'WRITTEN', path: 'docs/v112-runtime-public-inputs.json', bytes: bytes.length}));
}
