import type { WarAtlasPointV95, WarAtlasRegionV95, WarAtlasTerritoryV95 } from "./clanWarAtlasV95";
import type { WarLandmassV97 } from "./clanWarCoastlinesV97";
import type { WarPlanetRecipeV102, WarPlanetProceduralV102 } from "./clanWarPlanetGeneratorV102";

interface Rect { x: number; y: number; width: number; height: number }
interface Cell { id: string; regionId: string; x: number; y: number; macro: number }
interface Macro extends Rect { id: string; phase: number; longitude: number; latitude: number; lonWidth: number; latHeight: number }
interface Mesh { macro: Macro; points: WarAtlasPointV95[]; columns: number }
const SAMPLES = 16, RAD = Math.PI / 180, TAU = Math.PI * 2;
const MACRO_GAP = 2.8, LONGITUDE_WARP = 1.1, LATITUDE_WARP = .9;
const round = (number: number) => Math.round(number * 1e6) / 1e6;
const random = (seed: number, salt: number) => {
  let value = Math.imul(seed ^ Math.imul(salt + 1, 0x9e3779b1), 0x85ebca6b);
  value = Math.imul(value ^ value >>> 13, 0xc2b2ae35);
  return ((value ^ value >>> 16) >>> 0) / 4294967296;
};
function partitions(recipe: WarPlanetRecipeV102): Rect[] {
  const count = recipe.landform === "supercontinent" ? 1 : recipe.landform === "continents" ? 3 + Math.floor(random(recipe.seed, 1) * 3)
    : recipe.landform === "archipelago" ? 8 + Math.floor(random(recipe.seed, 1) * 3) : 12 + Math.floor(random(recipe.seed, 1) * 5);
  const rects: Rect[] = [{ x: 0, y: 0, width: 6, height: 6 }];
  while (rects.length < count) {
    const candidates = rects.map((rect, index) => ({ index, score: rect.width * rect.height * (.8 + random(recipe.seed, index + rects.length * 31) * .4) }))
      .filter(({ index }) => rects[index].width > 1 || rects[index].height > 1).sort((a, b) => b.score - a.score || a.index - b.index);
    const selected = candidates[0].index, rect = rects[selected];
    const preferredX = rect.width > rect.height * (.65 + random(recipe.seed, rects.length * 7) * .7);
    const axisX = preferredX ? rect.width > 1 : rect.height === 1;
    const length = axisX ? rect.width : rect.height;
    const cut = Math.max(1, Math.min(length - 1, Math.round(length * (.32 + random(recipe.seed, rects.length * 11) * .36))));
    const parts = axisX ? [{ ...rect, width: cut }, { ...rect, x: rect.x + cut, width: rect.width - cut }]
      : [{ ...rect, height: cut }, { ...rect, y: rect.y + cut, height: rect.height - cut }];
    rects.splice(selected, 1, ...parts);
  }
  return rects;
}
/** All pieces share the same smooth global deformation. Twice either maximum
 * displacement is below MACRO_GAP, so distinct macro boxes stay separated even
 * after straight-line sampling and rounding of their coastlines. */
function deform(lon: number, lat: number, seed: number): WarAtlasPointV95 {
  const phase = random(seed, 21) * TAU;
  return [round(lon + LONGITUDE_WARP * Math.sin(lat * RAD * 1.4 + phase) * Math.cos(lon * RAD / 2)), round(lat + LATITUDE_WARP * Math.sin(lon * RAD + phase) * Math.cos(lat * RAD))];
}
function pointAt(x: number, y: number, macro: Macro, recipe: WarPlanetRecipeV102, relief = 1): WarAtlasPointV95 {
  const u = (x - macro.x) / macro.width * 2 - 1, v = (y - macro.y) / macro.height * 2 - 1;
  const extent = Math.max(Math.abs(u), Math.abs(v)), radial = Math.hypot(u, v);
  const angle = Math.atan2(v, u), phase = macro.phase;
  const smooth = .105 * Math.sin(angle * 2 + phase) + .055 * Math.sin(angle * 3 - phase * .7);
  const detail = recipe.coast === "smooth" ? 0 : recipe.coast === "rugged"
    ? .055 * Math.sin(angle * 7 + phase * 1.7) + .035 * Math.sin(angle * 13 - phase)
    : -.24 * Math.max(0, Math.sin(angle * 7 + phase)) ** 6 + .025 * Math.sin(angle * 15 - phase);
  const coverage = recipe.landCoverage === "low" ? .64 : recipe.landCoverage === "balanced" ? .82 : 1;
  const coastRadius = Math.max(.3, Math.min(.99, .81 + relief * (smooth + detail))) * coverage;
  const squareRadius = extent < 1e-12 ? 1 : radial / extent;
  const k = coastRadius / squareRadius;
  // Along each ray r(t)=t*k/(k+(1-k)*t) is strictly increasing. This maps
  // the shared rectangular mesh bijectively into a positive star-shaped coast.
  const scale = extent < 1e-12 ? 1 : k / (k + (1 - k) * extent);
  return deform(macro.longitude + u * scale * macro.lonWidth / 2, macro.latitude - v * scale * macro.latHeight / 2, recipe.seed);
}
const orientation = (a: WarAtlasPointV95, b: WarAtlasPointV95, c: WarAtlasPointV95) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
function meshPoint(mesh: Mesh, x: number, y: number): WarAtlasPointV95 {
  return mesh.points[Math.round((y - mesh.macro.y) * SAMPLES) * mesh.columns + Math.round((x - mesh.macro.x) * SAMPLES)];
}
function simpleBoundary(mesh: Mesh): boolean {
  const points = nodes(mesh.macro).map(([x, y]) => meshPoint(mesh, x, y));
  const onSegment = (a: WarAtlasPointV95, b: WarAtlasPointV95, p: WarAtlasPointV95) => Math.abs(orientation(a, b, p)) < 1e-9
    && p[0] >= Math.min(a[0], b[0]) && p[0] <= Math.max(a[0], b[0]) && p[1] >= Math.min(a[1], b[1]) && p[1] <= Math.max(a[1], b[1]);
  for (let i = 0; i < points.length; i++) for (let j = i + 2; j < points.length; j++) {
    if (i === 0 && j === points.length - 1) continue;
    const a = points[i], b = points[(i + 1) % points.length], c = points[j], d = points[(j + 1) % points.length];
    if (Math.max(a[0], b[0]) < Math.min(c[0], d[0]) || Math.max(c[0], d[0]) < Math.min(a[0], b[0])
      || Math.max(a[1], b[1]) < Math.min(c[1], d[1]) || Math.max(c[1], d[1]) < Math.min(a[1], b[1])) continue;
    if ((orientation(a, b, c) * orientation(a, b, d) < 0 && orientation(c, d, a) * orientation(c, d, b) < 0)
      || onSegment(a, b, c) || onSegment(a, b, d) || onSegment(c, d, a) || onSegment(c, d, b)) return false;
  }
  return true;
}
function safeMesh(macro: Macro, recipe: WarPlanetRecipeV102): Mesh {
  const columns = macro.width * SAMPLES + 1, rows = macro.height * SAMPLES + 1;
  // A continuous radial map can still fold after straight-line sampling at a
  // sharp fjord. Check every triangle of the actual shared mesh, including its
  // rounded coordinates. A consistently oriented disk with a simple boundary
  // is an embedding, so its territory pieces cannot overlap or leave gaps.
  for (const relief of [1, .75, .5, .25, 0]) {
    const mesh: Mesh = { macro, columns, points: Array.from({ length: columns * rows }, (_, i) => pointAt(macro.x + i % columns / SAMPLES, macro.y + Math.floor(i / columns) / SAMPLES, macro, recipe, relief)) };
    let valid = true;
    for (let y = 0; valid && y < rows - 1; y++) for (let x = 0; valid && x < columns - 1; x++) {
      const index = y * columns + x, a = mesh.points[index], b = mesh.points[index + 1], c = mesh.points[index + columns + 1], d = mesh.points[index + columns];
      // A small coastal quad may be concave while remaining perfectly simple.
      // Accept either valid diagonal; fixing one diagonal would unnecessarily
      // erase bays whenever that diagonal falls outside a concave quad.
      valid = (orientation(a, b, c) < -1e-8 && orientation(a, c, d) < -1e-8)
        || (orientation(a, b, d) < -1e-8 && orientation(b, c, d) < -1e-8);
    }
    if (valid && simpleBoundary(mesh)) return mesh;
  }
  // The bounded final construction is an affine grid inside the macro box.
  // The global deformation has positive diagonal derivatives >= .984 and
  // off-diagonal magnitudes <= .027, preserving these rectangle triangles.
  const coverage = recipe.landCoverage === "low" ? .64 : recipe.landCoverage === "balanced" ? .82 : 1;
  return { macro, columns, points: Array.from({ length: columns * rows }, (_, i) => deform(
    macro.longitude + (i % columns / (columns - 1) - .5) * macro.lonWidth * .8 * coverage,
    macro.latitude - (Math.floor(i / columns) / (rows - 1) - .5) * macro.latHeight * .8 * coverage, recipe.seed)) };
}
function nodes(rect: Rect): WarAtlasPointV95[] {
  const output: WarAtlasPointV95[] = [];
  for (let i = 0; i < rect.width * SAMPLES; i++) output.push([rect.x + i / SAMPLES, rect.y]);
  for (let i = 0; i < rect.height * SAMPLES; i++) output.push([rect.x + rect.width, rect.y + i / SAMPLES]);
  for (let i = 0; i < rect.width * SAMPLES; i++) output.push([rect.x + rect.width - i / SAMPLES, rect.y + rect.height]);
  for (let i = 0; i < rect.height * SAMPLES; i++) output.push([rect.x, rect.y + rect.height - i / SAMPLES]);
  return output;
}
const vector = ([lon, lat]: WarAtlasPointV95) => [Math.cos(lat * RAD) * Math.cos(lon * RAD), Math.cos(lat * RAD) * Math.sin(lon * RAD), Math.sin(lat * RAD)];
function angularDistance(a: WarAtlasPointV95, b: WarAtlasPointV95) {
  const aa = vector(a), bb = vector(b);
  return Math.acos(Math.min(1, Math.max(-1, aa[0] * bb[0] + aa[1] * bb[1] + aa[2] * bb[2]))) / RAD;
}

export function generatedPlanetGeographyV102(recipe: WarPlanetRecipeV102, id: string, regionNames: readonly string[]) {
  const macros: Macro[] = partitions(recipe).map((rect, index) => ({ ...rect, id: `${id}-land-${index + 1}`, phase: random(recipe.seed, 30 + index) * TAU,
    longitude: -172 + (rect.x + rect.width / 2) / 6 * 344, latitude: 76 - (rect.y + rect.height / 2) / 6 * 152,
    lonWidth: rect.width / 6 * 344 - MACRO_GAP, latHeight: rect.height / 6 * 152 - MACRO_GAP }));
  const cells: Cell[] = Array.from({ length: 36 }, (_, index) => {
    const region = Math.floor(index / 6), local = index % 6;
    const x = region % 3 * 2 + local % 2, y = Math.floor(region / 3) * 3 + Math.floor(local / 2);
    return { id: `CON-T${String(index + 1).padStart(2, "0")}`, regionId: `CON-REG${String(region + 1).padStart(2, "0")}`, x, y,
      macro: macros.findIndex(macro => x >= macro.x && x < macro.x + macro.width && y >= macro.y && y < macro.y + macro.height) };
  });
  const meshes = macros.map(macro => safeMesh(macro, recipe));
  const territories: WarAtlasTerritoryV95[] = cells.map(cell => {
    const mesh = meshes[cell.macro], center = meshPoint(mesh, cell.x + .5, cell.y + .5);
    return { id: cell.id, regionId: cell.regionId, landmassId: mesh.macro.id, longitude: center[0], latitude: center[1], points: nodes({ ...cell, width: 1, height: 1 }).map(([x, y]) => meshPoint(mesh, x, y)) };
  });
  const landmasses: WarLandmassV97[] = macros.map((macro, index) => ({ id: macro.id, territoryIds: cells.filter(cell => cell.macro === index).map(cell => cell.id), longitude: deform(macro.longitude, macro.latitude, recipe.seed)[0], latitude: deform(macro.longitude, macro.latitude, recipe.seed)[1], points: nodes(macro).map(([x, y]) => meshPoint(meshes[index], x, y)) }));
  const regions: WarAtlasRegionV95[] = regionNames.map((name, index) => {
    const members = territories.slice(index * 6, index * 6 + 6), marker = members[2];
    return { id: marker.regionId, name, territoryIds: members.map(member => member.id), longitude: marker.longitude, latitude: marker.latitude };
  });
  const neighbors = new Map(cells.map(cell => [cell.id, new Set<string>()]));
  const routes: WarPlanetProceduralV102["routes"] = [];
  function connect(a: number, b: number, kind: "land" | "crossing", distance: number) {
    const first = cells[a].id, second = cells[b].id;
    if (neighbors.get(first)!.has(second)) return;
    neighbors.get(first)!.add(second); neighbors.get(second)!.add(first);
    routes.push({ fromId: first, toId: second, kind, distanceDegrees: round(distance) });
  }
  for (let a = 0; a < cells.length; a++) for (let b = a + 1; b < cells.length; b++) {
    if (cells[a].macro === cells[b].macro && Math.abs(cells[a].x - cells[b].x) + Math.abs(cells[a].y - cells[b].y) === 1) connect(a, b, "land", angularDistance([territories[a].longitude, territories[a].latitude], [territories[b].longitude, territories[b].latitude]));
  }
  const coastVectors = cells.map(cell => {
    const macro = macros[cell.macro];
    return nodes({ ...cell, width: 1, height: 1 }).filter(([x, y]) => x === macro.x || x === macro.x + macro.width || y === macro.y || y === macro.y + macro.height)
      .map(([x, y]) => vector(meshPoint(meshes[cell.macro], x, y)));
  });
  const edges: { a: number; b: number; firstMacro: number; secondMacro: number; distance: number }[] = [];
  for (let firstMacro = 0; firstMacro < macros.length; firstMacro++) for (let secondMacro = firstMacro + 1; secondMacro < macros.length; secondMacro++) {
    let nearest: typeof edges[number] | undefined;
    cells.forEach((first, a) => {
      if (first.macro !== firstMacro || !coastVectors[a].length) return;
      cells.forEach((second, b) => {
        if (second.macro !== secondMacro || !coastVectors[b].length) return;
        let dot = -1;
        for (const av of coastVectors[a]) for (const bv of coastVectors[b]) dot = Math.max(dot, av[0] * bv[0] + av[1] * bv[1] + av[2] * bv[2]);
        const distance = Math.acos(Math.min(1, Math.max(-1, dot))) / RAD;
        if (!nearest || distance < nearest.distance) nearest = { a, b, firstMacro, secondMacro, distance };
      });
    });
    if (nearest) edges.push(nearest);
  }
  edges.sort((a, b) => a.distance - b.distance || a.a - b.a || a.b - b.b);
  const parents = macros.map((_, index) => index);
  const root = (index: number): number => { while (parents[index] !== index) index = parents[index]; return index; };
  // The minimum spanning tree guarantees no isolated front. Extra nearby
  // straits provide alternate routes; every crossing uses actual coast pairs.
  for (const edge of edges) {
    const first = root(edge.firstMacro), second = root(edge.secondMacro);
    if (first !== second) { connect(edge.a, edge.b, "crossing", edge.distance); parents[first] = second; }
  }
  for (const edge of edges) if (edge.distance < 24 && neighbors.get(cells[edge.a].id)!.size < 5 && neighbors.get(cells[edge.b].id)!.size < 5) connect(edge.a, edge.b, "crossing", edge.distance);
  return { regions, territories, landmasses, neighbors, routes };
}
