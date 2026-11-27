#!/usr/bin/env node
/** The Isles V1 · writes the two prototype maps as data (app/game/data/islesMaps*.json).
 * Deterministic: the same seed always gives the same rows. `--check` fails when the
 * committed JSON differs from what this script would write. */
import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

/** Tile legend shared by both maps. Height is the top of the column in metres. */
const LEGEND = {
  '~': {kind: 'water', height: -1.2},
  'f': {kind: 'ford', height: -0.35},
  '.': {kind: 'sand', height: 0},
  ',': {kind: 'grass', height: 0},
  'j': {kind: 'jungle', height: 0},
  'm': {kind: 'mud', height: 0},
  '=': {kind: 'road', height: 0},
  'b': {kind: 'bush', height: 0},
  'c': {kind: 'crate', height: 1},
  'r': {kind: 'rock', height: 3},
  'R': {kind: 'rock', height: 6},
  'T': {kind: 'tree', height: 7},
  '#': {kind: 'wall', height: 5},
  'H': {kind: 'roof', height: 3.5},
  'P': {kind: 'pillar', height: 10},
  'p': {kind: 'ruin', height: 2},
  'q': {kind: 'ruin', height: 4},
  '^': {kind: 'ruin', height: 6.5},
};

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function grid(width, depth, fill) {
  return Array.from({length: depth}, () => Array.from({length: width}, () => fill));
}
const inside = (g, x, z) => z >= 0 && z < g.length && x >= 0 && x < g[0].length;
function paint(g, x, z, char) { if (inside(g, x, z)) g[z][x] = char; }
function rect(g, x0, z0, x1, z1, char) { for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) paint(g, x, z, char); }
function ellipse(g, cx, cz, rx, rz, char, only) {
  for (let z = Math.floor(cz - rz); z <= Math.ceil(cz + rz); z++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      if (((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2 <= 1 && inside(g, x, z) && (!only || only.includes(g[z][x]))) g[z][x] = char;
    }
  }
}
function island(g, cx, cz, radius, random, wobble) {
  const phases = [random() * 6.28, random() * 6.28, random() * 6.28];
  for (let z = 0; z < g.length; z++) {
    for (let x = 0; x < g[0].length; x++) {
      const angle = Math.atan2(z - cz, x - cx), d = Math.hypot(x - cx, z - cz);
      const edge = radius + wobble * (Math.sin(3 * angle + phases[0]) * .5 + Math.sin(5 * angle + phases[1]) * .3 + Math.sin(8 * angle + phases[2]) * .2);
      if (d < edge - 2) g[z][x] = ','; else if (d < edge) g[z][x] = '.';
    }
  }
}
function line(g, points, width, char, only) {
  for (let i = 0; i + 1 < points.length; i++) {
    const [ax, az] = points[i], [bx, bz] = points[i + 1];
    const steps = Math.ceil(Math.hypot(bx - ax, bz - az) * 2);
    for (let s = 0; s <= steps; s++) {
      const x = ax + (bx - ax) * s / steps, z = az + (bz - az) * s / steps;
      ellipse(g, x, z, width / 2, width / 2, char, only);
    }
  }
}
function scatter(g, random, count, char, only, box = [0, 0, g[0].length - 1, g.length - 1]) {
  for (let i = 0; i < count; i++) {
    const x = box[0] + Math.floor(random() * (box[2] - box[0] + 1)), z = box[1] + Math.floor(random() * (box[3] - box[1] + 1));
    if (inside(g, x, z) && only.includes(g[z][x])) g[z][x] = char;
  }
}
const rows = g => g.map(row => row.join(''));

/** Small test island for the view prototype and the network test (step 1 and 2). */
function testIsland() {
  const random = rng(1121);
  const g = grid(48, 48, '~');
  island(g, 24, 24, 21, random, 1.6);
  ellipse(g, 35, 14, 6.5, 5, 'r', [',', '.']);
  ellipse(g, 36, 13, 3.2, 2.6, 'R', ['r']);
  for (const [x, z] of [[12, 29], [15, 31], [13, 33], [17, 28], [10, 32], [16, 34], [19, 31], [11, 27]]) ellipse(g, x, z, 1.2, 1.2, 'T', [',', '.']);
  scatter(g, random, 40, 'b', [','], [6, 22, 22, 40]);
  rect(g, 20, 34, 28, 40, '#');
  rect(g, 21, 35, 27, 39, ',');
  paint(g, 24, 34, ','); paint(g, 28, 37, ',');
  rect(g, 9, 12, 13, 15, 'H');
  for (const [x, z] of [[22, 36], [26, 38], [30, 30], [31, 30], [31, 31], [18, 18]]) paint(g, x, z, 'c');
  rect(g, 27, 25, 27, 26, 'P');
  line(g, [[6, 24], [24, 24], [24, 33]], 1, '=', [',', '.']);
  return {
    id: 'isles-test-island-v1', name: 'Île de test', seed: 1121, legend: LEGEND, rows: rows(g),
    markers: {
      spawn: [[24, 27]],
      prey: [[18, 21]],
      netSpawns: [[22, 27], [26, 27], [22, 29], [26, 29], [20, 25], [28, 23], [18, 26], [24, 30]],
    },
  };
}

/** Verdant map for the reverse hunt: river, falls, poacher camp, airstrip, coastal village, pyramid. */
function verdant() {
  const random = rng(7);
  const g = grid(96, 96, '~');
  island(g, 48, 47, 44, random, 2.4);
  for (let z = 0; z < 96; z++) for (let x = 0; x < 96; x++) if (g[z][x] === ',') g[z][x] = 'j';
  // Jungle canopy, dense but with understorey corridors.
  scatter(g, random, 2300, 'T', ['j']);
  scatter(g, random, 900, 'b', ['j']);
  // Falls and the cliff line on the north-west, the river down to the east coast.
  line(g, [[14, 18], [30, 12], [44, 10]], 3, 'R', ['j', 'T', 'b', '.']);
  line(g, [[12, 22], [30, 16], [44, 14]], 2, 'r', ['j', 'T', 'b']);
  const river = [[30, 13], [33, 24], [42, 34], [55, 40], [68, 42], [80, 48], [93, 50]];
  line(g, river, 4, '~', ['j', 'T', 'b', 'r', 'R', '.']);
  line(g, [[62, 41], [72, 44]], 7, '~', ['j', 'T', 'b', '.']); // pool of the seaplane
  for (const [x, z] of [[37, 29], [50, 39]]) ellipse(g, x, z, 2.6, 2.6, 'f', ['~']); // two fords
  // Pyramid of the altar above the canopy, north-east.
  ellipse(g, 70, 18, 6, 6, 'p', ['j', 'T', 'b']);
  ellipse(g, 70, 18, 4, 4, 'q', ['p']);
  ellipse(g, 70, 18, 2, 2, '^', ['q']);
  // Poacher camp clearing, west of the river.
  ellipse(g, 20, 46, 8, 7, 'm', ['j', 'T', 'b']);
  rect(g, 16, 42, 19, 44, 'H'); rect(g, 23, 48, 26, 50, 'H'); rect(g, 14, 50, 16, 52, 'H');
  for (const [x, z] of [[21, 44], [22, 44], [18, 49], [25, 45]]) paint(g, x, z, 'c');
  // Hidden airstrip with the generator shed, north of the river.
  rect(g, 44, 24, 62, 26, '=');
  for (let z = 22; z <= 28; z++) for (let x = 42; x <= 64; x++) if (['T', 'b'].includes(g[z][x])) g[z][x] = 'j';
  rect(g, 58, 21, 60, 22, 'H');
  // Coastal village on the south shore, where the humans land.
  ellipse(g, 46, 82, 11, 6, ',', ['j', 'T', 'b', '.']);
  rect(g, 40, 80, 42, 82, 'H'); rect(g, 48, 79, 50, 81, 'H'); rect(g, 52, 83, 54, 85, 'H');
  // Trails that the human team can follow.
  line(g, [[46, 88], [46, 70], [38, 58], [24, 50]], 2, 'm', ['j', 'T', 'b']);
  line(g, [[46, 70], [52, 52], [50, 40]], 2, 'm', ['j', 'T', 'b']);
  line(g, [[50, 38], [52, 27]], 2, 'm', ['j', 'T', 'b']);
  line(g, [[56, 54], [66, 46]], 2, 'm', ['j', 'T', 'b']);
  line(g, [[60, 26], [68, 24]], 2, 'm', ['j', 'T', 'b']);
  const keep = [[46, 88], [21, 45], [17, 47], [24, 43], [59, 23], [47, 25], [56, 27], [44, 81], [51, 82], [47, 85], [66, 46], [70, 25], [24, 52]];
  for (const [x, z] of keep) if (['T', 'b', 'H', 'c', '~'].includes(g[z][x])) g[z][x] = 'm';
  return {
    id: 'isles-verdant-reverse-v1', name: 'Verdant · Chasse inversée', seed: 7, legend: LEGEND, rows: rows(g),
    markers: {
      humanArrival: [[46, 88]],
      yautjaDrop: [[70, 25]],
      'piece:radio': [[21, 45], [17, 47], [24, 43]],
      'piece:battery': [[59, 23], [47, 25], [56, 27]],
      'piece:flares': [[44, 81], [51, 82], [47, 85]],
      extraction: [[66, 46]],
      radioMast: [[24, 52]],
    },
  };
}

const outputs = [['app/game/data/islesMapTestV1.json', testIsland()], ['app/game/data/islesMapVerdantV1.json', verdant()]];
let stale = false;
for (const [file, map] of outputs) {
  const text = JSON.stringify(map, null, 1) + '\n';
  if (process.argv.includes('--check')) {
    const current = await readFile(root + file, 'utf8').catch(() => '');
    if (current !== text) { stale = true; process.stderr.write(file + ' est à régénérer.\n'); }
  } else {
    await writeFile(root + file, text);
    process.stdout.write(file + ' · ' + map.rows[0].length + ' × ' + map.rows.length + '\n');
  }
}
if (stale) process.exitCode = 1;
