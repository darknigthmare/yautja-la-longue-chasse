import type { WarAtlasPointV95, WarAtlasRegionV95, WarAtlasTerritoryV95 } from "./clanWarAtlasV95";
import type { WarLandmassV97 } from "./clanWarCoastlinesV97";
import type { WarPlanetHydrologyFeatureV103, WarPlanetRecipeV103, WarPlanetRouteV103 } from "./clanWarPlanetGeneratorV103";
import { shapedRadiusV115, warShapeTemplateV115 } from "./clanWarShapeAtlasV115";
export interface WarPlanetShapeSelectionV115 {
  islandShape: number; continentShape: number; regionShape: number;
}

type Point = readonly [number, number];
interface Box { x0: number; x1: number; y0: number; y1: number }
interface RegionPart { region: number; count: number }
interface Plan { box: Box; parts: RegionPart[] }
interface Cell { id: string; index: number; region: number; macro: number; center: Point; points: Point[] }
interface Edge { a: Point; b: Point; owners: number[] }
interface Macro {
  id: string; index: number; center: Point; xScale: number; yScale: number;
  target: Point[]; cells: Cell[]; edges: Edge[];
  map: (point: Point) => WarAtlasPointV95;
  outline: (points: readonly Point[]) => WarAtlasPointV95[];
}
const TAU = Math.PI * 2, RAD = Math.PI / 180, FAN = 128;
const round = (value: number) => Math.round(value * 1e6) / 1e6;
const quantize = ([x, y]: Point): Point => [Math.round(x * 1e8) / 1e8, Math.round(y * 1e8) / 1e8];
const circle: Point[] = Array.from({ length: FAN }, (_, index) => quantize([Math.cos(index * TAU / FAN), Math.sin(index * TAU / FAN)]));
const rayAngles = circle.map(([x, y]) => (Math.atan2(y, x) + TAU) % TAU);
const key = (point: Point) => `${point[0]},${point[1]}`;
const cross = (a: Point, b: Point) => a[0] * b[1] - a[1] * b[0];
const subtract = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1]];
const distance2 = (a: Point, b: Point) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
const lerp = (a: Point, b: Point, t: number): Point => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const random = (seed: number, salt: number) => {
  let value = Math.imul(seed ^ Math.imul(salt + 1, 0x9e3779b1), 0x85ebca6b);
  value = Math.imul(value ^ value >>> 13, 0xc2b2ae35);
  return ((value ^ value >>> 16) >>> 0) / 4294967296;
};
function area(points: readonly Point[]): number { return Math.abs(points.reduce((sum, p, i) => sum + cross(p, points[(i + 1) % points.length]), 0)) / 2; }
function centroid(points: readonly Point[]): Point {
  let weight = 0, x = 0, y = 0;
  points.forEach((a, i) => { const b = points[(i + 1) % points.length], w = cross(a, b); weight += w; x += (a[0] + b[0]) * w; y += (a[1] + b[1]) * w; });
  return Math.abs(weight) > 1e-12 ? [x / (3 * weight), y / (3 * weight)] : points[0];
}
function cleaned(points: readonly Point[]): Point[] {
  const result: Point[] = [];
  for (const raw of points) { const p = quantize(raw); if (!result.length || distance2(p, result[result.length - 1]) > 1e-16) result.push(p); }
  if (result.length > 1 && distance2(result[0], result[result.length - 1]) <= 1e-16) result.pop();
  return result;
}
function clip(points: readonly Point[], normal: Point, limit: number): Point[] {
  const result: Point[] = [];
  const signed = (p: Point) => p[0] * normal[0] + p[1] * normal[1] - limit;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length], da = signed(a), db = signed(b);
    if (da <= 1e-12) result.push(a);
    if ((da < 0 && db > 0) || (da > 0 && db < 0)) result.push(lerp(a, b, da / (da - db)));
  }
  return result;
}
function voronoi(domain: readonly Point[], sites: readonly Point[]): Point[][] {
  return sites.map((site, index) => {
    let polygon = [...domain];
    for (let other = 0; other < sites.length; other++) if (other !== index) {
      const next = sites[other], normal = subtract(next, site), limit = (next[0] ** 2 + next[1] ** 2 - site[0] ** 2 - site[1] ** 2) / 2;
      polygon = clip(polygon, normal, limit);
    }
    return cleaned(polygon);
  });
}
/** Uniform samples in a convex polygon via its triangle fan. */
function sampler(domain: readonly Point[], seed: number, salt: number) {
  const center = centroid(domain), weights = domain.map((p, i) => Math.abs(cross(subtract(p, center), subtract(domain[(i + 1) % domain.length], center))));
  const total = weights.reduce((sum, value) => sum + value, 0);
  let serial = 0;
  return (): Point => {
    const offset = salt + serial++ * 3;
    let target = random(seed, offset) * total, index = 0;
    while (index < weights.length - 1 && target > weights[index]) target -= weights[index++];
    const radius = Math.sqrt(random(seed, offset + 1)), ratio = random(seed, offset + 2), a = domain[index], b = domain[(index + 1) % domain.length];
    return [center[0] * (1 - radius) + radius * (a[0] * (1 - ratio) + b[0] * ratio), center[1] * (1 - radius) + radius * (a[1] * (1 - ratio) + b[1] * ratio)];
  };
}
function seeds(domain: readonly Point[], count: number, seed: number, salt: number, compact: boolean): Point[] {
  if (count === 1) return [centroid(domain)];
  const sample = sampler(domain, seed, salt), result = [lerp(centroid(domain), sample(), .35)];
  for (let index = 1; index < count; index++) {
    let best = sample(), score = -1;
    for (let attempt = 0; attempt < (compact ? 40 : 14); attempt++) {
      const point = sample(), candidate = Math.min(...result.map(other => distance2(point, other)));
      if (candidate > score) { score = candidate; best = point; }
    }
    result.push(best);
  }
  for (let iteration = 0; iteration < (compact ? 2 : 1); iteration++) {
    const polygons = voronoi(domain, result);
    for (let index = 0; index < result.length; index++) result[index] = lerp(result[index], centroid(polygons[index]), compact ? .8 : .22);
  }
  return result.map(quantize);
}
function allocate(total: number, weights: readonly number[], minimum: number, capacities: readonly number[] = weights.map(() => Infinity)): number[] {
  const result = weights.map(() => minimum);
  for (let left = total - minimum * weights.length; left > 0; left--) {
    let chosen = -1, best = -1;
    weights.forEach((weight, index) => { const score = weight / (result[index] - minimum + 1); if (result[index] < capacities[index] && score > best) { chosen = index; best = score; } });
    if (chosen < 0) throw new Error("V103 partition capacity exhausted");
    result[chosen]++;
  }
  return result;
}
function partitionBoxes(box: Box, weights: readonly number[], seed: number, salt: number): Box[] {
  if (weights.length === 1) return [box];
  const cut = Math.max(1, Math.min(weights.length - 1, Math.floor(weights.length / 2) + (weights.length > 4 && random(seed, salt) > .7 ? 1 : 0)));
  const sum = weights.reduce((total, weight) => total + weight, 0), fraction = Math.max(.2, Math.min(.8, weights.slice(0, cut).reduce((total, weight) => total + weight, 0) / sum + (random(seed, salt + 1) - .5) * .08));
  const physicalWidth = (box.x1 - box.x0) * Math.cos((box.y0 + box.y1) * RAD / 2);
  const axisX = physicalWidth > (box.y1 - box.y0) * (.8 + random(seed, salt + 2) * .4);
  const value = axisX ? box.x0 + (box.x1 - box.x0) * fraction : box.y0 + (box.y1 - box.y0) * fraction;
  const first = axisX ? { ...box, x1: value } : { ...box, y1: value }, second = axisX ? { ...box, x0: value } : { ...box, y0: value };
  return [...partitionBoxes(first, weights.slice(0, cut), seed, salt * 2 + 3), ...partitionBoxes(second, weights.slice(cut), seed, salt * 2 + 4)];
}
function arrange(weights: readonly number[], recipe: WarPlanetRecipeV103): Box[] {
  const seed = recipe.seed, shift = (random(seed, 201) - .5) * 10;
  if (recipe.arrangement === "equatorial") return partitionBoxes({ x0: -173, x1: 173, y0: -39 + shift, y1: 39 + shift }, weights, seed, 210);
  if (recipe.arrangement === "polar" && weights.length === 1) return [{ x0: -168, x1: 168, y0: random(seed, 202) > .5 ? 22 : -79, y1: random(seed, 202) > .5 ? 79 : -22 }];
  if (recipe.arrangement === "hemispheres" || recipe.arrangement === "polar") {
    if (weights.length === 1) return [{ x0: -165, x1: 165, y0: -61, y1: 61 }];
    const cut = Math.ceil(weights.length / 2), polar = recipe.arrangement === "polar";
    const left = polar ? { x0: -171, x1: 171, y0: -79, y1: -24 } : { x0: -174, x1: -7, y0: -72, y1: 72 };
    const right = polar ? { x0: -171, x1: 171, y0: 24, y1: 79 } : { x0: 7, x1: 174, y0: -72, y1: 72 };
    return [...partitionBoxes(left, weights.slice(0, cut), seed, 220), ...partitionBoxes(right, weights.slice(cut), seed, 230)];
  }
  return partitionBoxes({ x0: -174, x1: 174, y0: -76, y1: 76 }, weights, seed, 240);
}
function plans(recipe: WarPlanetRecipeV103): { plans: Plan[]; regionSizes: number[] } {
  const { seed, territoryCount: count, regionCount } = recipe;
  const regionSizes = allocate(count, Array.from({ length: regionCount }, (_, index) => recipe.regionBalance === "balanced" ? 1 : .35 + random(seed, 260 + index) ** 2 * 2.3), 3);
  const masses = recipe.landform === "supercontinent" ? 1 : recipe.landform === "continents" ? 3 + Math.floor(random(seed, 280) * 3)
    : recipe.landform === "archipelago" ? Math.min(count, Math.max(6, Math.round(Math.sqrt(count) * 1.5) + Math.floor(random(seed, 280) * 3) - 1))
      : Math.min(32, count, Math.max(10, Math.round(count * .42) + Math.floor(random(seed, 280) * 3) - 1));
  if (masses <= regionCount) {
    const distribution = allocate(regionCount, Array.from({ length: masses }, (_, i) => .8 + random(seed, 290 + i) * .4), 1);
    let offset = 0;
    const groups = distribution.map(size => { const result = Array.from({ length: size }, (_, i) => ({ region: offset + i, count: regionSizes[offset + i] })); offset += size; return result; });
    const boxes = arrange(groups.map(group => group.reduce((total, part) => total + part.count, 0)), recipe);
    return { plans: groups.map((parts, index) => ({ box: boxes[index], parts })), regionSizes };
  }
  const distribution = allocate(masses, regionSizes, 1, regionSizes), regions = arrange(regionSizes, recipe);
  const result: Plan[] = [];
  regionSizes.forEach((size, region) => {
    const sizes = allocate(size, Array.from({ length: distribution[region] }, (_, i) => .6 + random(seed, 310 + region * 31 + i)), 1);
    const boxes = partitionBoxes(regions[region], sizes, seed, 400 + region * 5);
    sizes.forEach((count, index) => result.push({ box: boxes[index], parts: [{ region, count }] }));
  });
  return { plans: result, regionSizes };
}
function radius(angle: number, phase: number, coast: WarPlanetRecipeV103["coast"], bays: readonly { center: number; width: number; depth: number }[]): number {
  const fjordDepth = coast === "fjords" ? bays.reduce((sum, bay) => {
    const delta = Math.atan2(Math.sin(angle - bay.center), Math.cos(angle - bay.center));
    return sum + bay.depth * Math.exp(-.5 * (delta / bay.width) ** 2);
  }, 0) : 0;
  const value = coast === "smooth" ? .78 + .07 * Math.sin(2 * angle + phase) + .035 * Math.cos(3 * angle - phase)
    : coast === "rugged" ? .76 + .12 * Math.sin(3 * angle + phase) + .075 * Math.cos(7 * angle - phase) + .035 * Math.sin(17 * angle + phase)
      : coast === "fjords" ? .82 + .055 * Math.sin(2 * angle + phase) + .065 * Math.cos(3 * angle - phase) + .03 * Math.sin(5 * angle + phase * .7) - fjordDepth
        : coast === "peninsulas" ? .64 + .27 * Math.max(0, Math.cos(3 * angle + phase)) ** 4 + .065 * Math.sin(5 * angle - phase)
          : .65 + .25 * Math.cos(2 * angle + phase) + .045 * Math.sin(5 * angle - phase);
  return Math.max(.28, Math.min(.98, value));
}
function createMacro(plan: Plan, index: number, recipe: WarPlanetRecipeV103, id: string, shape?: WarPlanetShapeSelectionV115): Macro {
  const { box } = plan, width = box.x1 - box.x0, height = box.y1 - box.y0, phase = random(recipe.seed, 600 + index) * TAU, rotation = random(recipe.seed, 700 + index) * TAU;
  const massSize = plan.parts.reduce((sum, part) => sum + part.count, 0);
  const continental = recipe.landform === "supercontinent" || massSize >= Math.max(6, Math.round(recipe.territoryCount / 10));
  const template = shape ? warShapeTemplateV115(continental ? "continent" : "island", continental ? shape.continentShape : shape.islandShape) : null;
  const bayCount = 5 + Math.floor(random(recipe.seed, 120000 + index * 64) * 4);
  const bays = Array.from({ length: bayCount }, (_, i) => ({
    center: phase + (i + .1 + random(recipe.seed, 120001 + index * 64 + i * 3) * .8) * TAU / bayCount,
    width: .045 + random(recipe.seed, 120002 + index * 64 + i * 3) * .095,
    depth: .16 + random(recipe.seed, 120003 + index * 64 + i * 3) * .3,
  }));
  const coverage = recipe.landCoverage === "low" ? .64 : recipe.landCoverage === "balanced" ? .82 : 1;
  // Center displacement plus maximum radius stay below half the box width.
  // Disjoint layout boxes therefore give disjoint actual landmass polygons.
  const center: Point = [(box.x0 + box.x1) / 2 + (random(recipe.seed, 800 + index) - .5) * width * .08, (box.y0 + box.y1) / 2 + (random(recipe.seed, 900 + index) - .5) * height * .08];
  const target: Point[] = circle.map((p, i) => {
    const angle = i * TAU / FAN;
    const original = radius(angle, phase, recipe.coast, bays);
    const r = template ? shapedRadiusV115(original, angle, template, index) : original;
    return [r * (p[0] * Math.cos(rotation) - p[1] * Math.sin(rotation)), r * (p[0] * Math.sin(rotation) + p[1] * Math.cos(rotation))];
  });
  const footprint = template ? template.scale : 1;
  const xScale = width * .46 * coverage * footprint, yScale = height * .46 * coverage * footprint, pointCache = new Map<string, WarAtlasPointV95>(), edgeCache = new Map<string, WarAtlasPointV95[]>();
  const map = (point: Point): WarAtlasPointV95 => {
    const cacheKey = key(point), previous = pointCache.get(cacheKey);
    if (previous) return previous;
    const angle = (Math.atan2(point[1], point[0]) + TAU) % TAU;
    let low = 0, high = FAN;
    while (low + 1 < high) { const middle = (low + high) >>> 1; if (rayAngles[middle] <= angle) low = middle; else high = middle; }
    const sector = low;
    const a = circle[sector], b = circle[(sector + 1) % FAN], determinant = cross(a, b), first = cross(point, b) / determinant, second = cross(a, point) / determinant;
    const aa = target[sector], bb = target[(sector + 1) % FAN];
    const value: WarAtlasPointV95 = [round(center[0] + (aa[0] * first + bb[0] * second) * xScale), round(center[1] + (aa[1] * first + bb[1] * second) * yScale)];
    pointCache.set(cacheKey, value); return value;
  };
  const edge = (a: Point, b: Point): WarAtlasPointV95[] => {
    const reverse = key(a) > key(b), aa = reverse ? b : a, bb = reverse ? a : b, cacheKey = `${key(aa)}|${key(bb)}`;
    let result = edgeCache.get(cacheKey);
    if (!result) {
      const direction = subtract(bb, aa), times = [0, 1];
      for (const ray of circle) {
        const denominator = cross(direction, ray);
        if (Math.abs(denominator) < 1e-12) continue;
        const t = -cross(aa, ray) / denominator, p = lerp(aa, bb, t), u = p[0] * ray[0] + p[1] * ray[1];
        if (t > 1e-10 && t < 1 - 1e-10 && u > 1e-10 && u <= 1 + 1e-8) times.push(t);
      }
      times.sort((a, b) => a - b);
      result = times.filter((t, i) => i === 0 || t - times[i - 1] > 1e-9).map(t => map(lerp(aa, bb, t)));
      edgeCache.set(cacheKey, result);
    }
    return reverse ? [...result].reverse() : result;
  };
  const outline = (points: readonly Point[]) => {
    const mapped = points.flatMap((p, i) => edge(p, points[(i + 1) % points.length]).slice(0, -1));
    return mapped.filter((point, index) => key(point) !== key(mapped[(index + mapped.length - 1) % mapped.length]));
  };
  return { id: `${id}-land-${index + 1}`, index, center, xScale, yScale, target, cells: [], edges: [], map, outline };
}
function refineSharedEdges(macro: Macro) {
  // Independent clipping orders can round a shared Voronoi corner to adjacent
  // 1e-8 source coordinates. Weld those copies once, for the entire landmass,
  // before splitting edges. Otherwise rounding the mapped coordinates could
  // leave a microscopic loop at a nominally shared corner.
  const raw = [...new Map(macro.cells.flatMap(cell => cell.points.map(point => [key(point), point] as const))).values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const vertices: Point[] = [], canonical = new Map<string, Point>();
  for (const point of raw) {
    const existing = vertices.find(candidate => distance2(point, candidate) < 1e-14);
    canonical.set(key(point), existing ?? point);
    if (!existing) vertices.push(point);
  }
  macro.cells.forEach(cell => { cell.points = cleaned(cell.points.map(point => canonical.get(key(point))!)); });
  const edges = new Map<string, Edge>();
  for (const cell of macro.cells) {
    const refined: Point[] = [];
    cell.points.forEach((a, i) => {
      const b = cell.points[(i + 1) % cell.points.length], d = subtract(b, a), length2 = distance2(a, b);
      const points = vertices.map(p => ({ p, t: ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) / length2 }))
        .filter(({ p, t }) => t >= -1e-8 && t <= 1 + 1e-8 && Math.abs(cross(subtract(p, a), d)) <= 1e-7 * Math.sqrt(length2))
        .sort((a, b) => a.t - b.t).filter((item, j, items) => j === 0 || distance2(item.p, items[j - 1].p) > 1e-15);
      for (let j = 0; j < points.length - 1; j++) {
        const first = points[j].p, second = points[j + 1].p, cacheKey = key(first) < key(second) ? `${key(first)}|${key(second)}` : `${key(second)}|${key(first)}`;
        refined.push(first);
        const existing = edges.get(cacheKey);
        if (existing) { if (!existing.owners.includes(cell.index)) existing.owners.push(cell.index); }
        else edges.set(cacheKey, { a: first, b: second, owners: [cell.index] });
      }
    });
    cell.points = refined;
  }
  macro.edges = [...edges.values()];
}
const vector = ([lon, lat]: Point): [number, number, number] => [Math.cos(lat * RAD) * Math.cos(lon * RAD), Math.cos(lat * RAD) * Math.sin(lon * RAD), Math.sin(lat * RAD)];
const dot = (a: readonly number[], b: readonly number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
function angularDistance(a: Point, b: Point) { return Math.acos(Math.min(1, Math.max(-1, dot(vector(a), vector(b))))) / RAD; }
export function sphericalPolygonAreaV103(points: readonly Point[]) {
  return Math.abs(points.reduce((sum, p, i) => { const next = points[(i + 1) % points.length]; return sum + (next[0] - p[0]) * RAD * (Math.sin(p[1] * RAD) + Math.sin(next[1] * RAD)) / 2; }, 0));
}
function contains(point: Point, polygon: readonly Point[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}
function lineDistance(point: Point, a: Point, b: Point) { return Math.abs(cross(subtract(b, a), subtract(point, a))) / Math.sqrt(distance2(a, b)); }
function segmentDistance(point: Point, a: Point, b: Point) {
  const d = subtract(b, a), t = Math.max(0, Math.min(1, ((point[0] - a[0]) * d[0] + (point[1] - a[1]) * d[1]) / distance2(a, b)));
  return Math.sqrt(distance2(point, lerp(a, b, t)));
}
function hydrology(macros: Macro[], cells: Cell[], recipe: WarPlanetRecipeV103, id: string): WarPlanetHydrologyFeatureV103[] {
  if (recipe.hydrology === "none") return [];
  const features: WarPlanetHydrologyFeatureV103[] = [], used = new Set<number>();
  const append = (kind: "lake" | "river", source: Point[], members: Cell[]) => {
    const macro = macros[members[0].macro], points = macro.outline(source);
    if (points.length < 3 || sphericalPolygonAreaV103(points) < 1e-10) return false;
    features.push({ id: `${id}-hydro-${features.length + 1}`, kind, name: "", description: "", landmassId: macro.id, regionIds: [...new Set(members.map(cell => `CON-REG${String(cell.region + 1).padStart(2, "0")}`))], points });
    members.forEach(cell => used.add(cell.index)); return true;
  };
  for (let region = 0; region < recipe.regionCount; region++) {
    const candidates = cells.filter(cell => cell.region === region).sort((a, b) => area(b.points) - area(a.points) || a.index - b.index);
    if (recipe.hydrology === "rivers" || recipe.hydrology === "mixed") {
      const shared = macros.flatMap(macro => macro.edges.filter(edge => edge.owners.length === 2 && edge.owners.every(owner => cells[owner].region === region && !used.has(owner))).map(edge => ({ macro, edge })))
        .sort((a, b) => distance2(b.edge.a, b.edge.b) - distance2(a.edge.a, a.edge.b));
      let placed = false;
      for (const { edge } of shared) {
        const members = edge.owners.map(owner => cells[owner]), a = lerp(edge.a, edge.b, .18), b = lerp(edge.a, edge.b, .82), d = subtract(b, a), length = Math.sqrt(distance2(a, b));
        if (length < .025) continue;
        const normal: Point = [-d[1] / length, d[0] / length];
        let clearance = Math.min(.085, ...members.map(cell => segmentDistance(cell.center, a, b) * .6));
        for (const cell of members) for (let i = 0; i < cell.points.length; i++) {
          const first = cell.points[i], second = cell.points[(i + 1) % cell.points.length];
          if (lineDistance(first, edge.a, edge.b) < 1e-7 && lineDistance(second, edge.a, edge.b) < 1e-7) continue;
          clearance = Math.min(clearance, lineDistance(a, first, second), lineDistance(b, first, second));
        }
        if (clearance < .002) continue;
        const shore = (side: number) => Array.from({ length: 17 }, (_, i): Point => {
          const t = i / 16, p = lerp(a, b, t), shift = clearance * (.31 * Math.sin(t * TAU + random(recipe.seed, 1500 + region) * 2) * Math.sin(Math.PI * t) + side * .18);
          return [p[0] + normal[0] * shift, p[1] + normal[1] * shift];
        });
        if (append("river", [...shore(1), ...shore(-1).reverse()], members)) { placed = true; break; }
      }
      if (!placed) {
        const cell = candidates[0], center = centroid(cell.points);
        const inner = cell.points.map(point => lerp(point, center, .3));
        let a = inner[0], b = inner[1], best = -1;
        for (let i = 0; i < inner.length; i++) for (let j = i + 1; j < inner.length; j++) {
          const score = distance2(inner[i], inner[j]);
          if (score > best && segmentDistance(cell.center, inner[i], inner[j]) > Math.sqrt(area(cell.points)) * .12) { a = inner[i]; b = inner[j]; best = score; }
        }
        const d = subtract(b, a), length = Math.sqrt(distance2(a, b));
        const margin = Math.min(.08, segmentDistance(cell.center, a, b) * .4, ...cell.points.flatMap((p, i) => [lineDistance(a, p, cell.points[(i + 1) % cell.points.length]), lineDistance(b, p, cell.points[(i + 1) % cell.points.length])])) * .25;
        const normal: Point = [-d[1] / length * margin, d[0] / length * margin];
        const shore = (side: number) => Array.from({ length: 13 }, (_, i): Point => { const t = i / 12, p = lerp(a, b, t), shift = side + .6 * Math.sin(t * TAU); return [p[0] + normal[0] * shift, p[1] + normal[1] * shift]; });
        append("river", [...shore(1), ...shore(-1).reverse()], [cell]);
      }
    }
    if (recipe.hydrology === "lakes" || recipe.hydrology === "mixed") {
      const cell = candidates.find(candidate => !used.has(candidate.index));
      if (!cell) continue;
      const corners = cell.points.slice().sort((a, b) => distance2(b, cell.center) - distance2(a, cell.center)), center = lerp(cell.center, corners[0], .57);
      const radius = Math.min(.13, Math.sqrt(distance2(center, cell.center)) * .43, ...cell.points.map((p, i) => lineDistance(center, p, cell.points[(i + 1) % cell.points.length]) * .74));
      const phase = random(recipe.seed, 1700 + region) * TAU;
      append("lake", Array.from({ length: 32 }, (_, i): Point => { const a = i * TAU / 32, r = radius * (.82 + .12 * Math.sin(3 * a + phase) + .05 * Math.cos(5 * a - phase)); return [center[0] + r * Math.cos(a), center[1] + r * Math.sin(a)]; }), [cell]);
    }
  }
  return features;
}
function greatCircle(a: Point, b: Point): Point[] {
  const first = vector(a), second = vector(b), angle = Math.acos(Math.max(-1, Math.min(1, dot(first, second)))), steps = Math.max(3, Math.ceil(angle / RAD / 1.5)), sine = Math.sin(angle);
  const path = Array.from({ length: steps + 1 }, (_, i): Point => {
    if (Math.abs(sine) < 1e-10) return lerp(a, b, i / steps);
    const t = i / steps, left = Math.sin((1 - t) * angle) / sine, right = Math.sin(t * angle) / sine;
    const x = first[0] * left + second[0] * right, y = first[1] * left + second[1] * right, z = first[2] * left + second[2] * right;
    return [Math.atan2(y, x) / RAD, Math.atan2(z, Math.hypot(x, y)) / RAD];
  });
  // Keep one continuous world copy at the antimeridian. The renderer can draw
  // translated copies of this path; intersections use the same coordinates.
  return path.map((point, index): Point => {
    if (index === 0) return [round(a[0]), round(a[1])];
    let longitude = point[0];
    while (longitude - path[index - 1][0] > 180) longitude -= 360;
    while (longitude - path[index - 1][0] < -180) longitude += 360;
    path[index] = [round(longitude), round(point[1])];
    return path[index];
  });
}
function intersects(a: Point, b: Point, c: Point, d: Point) {
  const ab = subtract(b, a), cd = subtract(d, c), first = cross(ab, subtract(c, a)), second = cross(ab, subtract(d, a)), third = cross(cd, subtract(a, c)), fourth = cross(cd, subtract(b, c));
  return first * second < -1e-12 && third * fourth < -1e-12;
}

export function generatedPlanetGeographyV103(recipe: WarPlanetRecipeV103, id: string, regionNames: readonly string[], shape?: WarPlanetShapeSelectionV115) {
  const planning = plans(recipe), macros = planning.plans.map((plan, index) => createMacro(plan, index, recipe, id, shape));
  const offsets = planning.regionSizes.map((_, index) => planning.regionSizes.slice(0, index).reduce((sum, value) => sum + value, 0)), counters = planning.regionSizes.map(() => 0), cells: Cell[] = [];
  planning.plans.forEach((plan, macroIndex) => {
    const regionSalt = shape ? (shape.regionShape + 1) * 517 : 0;
    const regionSites = seeds(circle, plan.parts.length, recipe.seed, 2000 + macroIndex * 3101 + regionSalt, true), regionPolygons = voronoi(circle, regionSites);
    plan.parts.forEach((part, partIndex) => {
      const sites = seeds(regionPolygons[partIndex], part.count, recipe.seed,
          10000 + macroIndex * 1703 + part.region * 967 + (shape ? (shape.regionShape + 1) * 263 : 0),
          recipe.territoryStyle === "compact"), polygons = voronoi(regionPolygons[partIndex], sites);
      sites.forEach((center, local) => {
        const index = offsets[part.region] + counters[part.region]++, cell: Cell = { id: `CON-T${String(index + 1).padStart(2, "0")}`, index, region: part.region, macro: macroIndex, center, points: polygons[local] };
        cells.push(cell); macros[macroIndex].cells.push(cell);
      });
    });
    refineSharedEdges(macros[macroIndex]);
  });
  cells.sort((a, b) => a.index - b.index);
  const territories: WarAtlasTerritoryV95[] = cells.map(cell => { const macro = macros[cell.macro], center = macro.map(cell.center); return { id: cell.id, regionId: `CON-REG${String(cell.region + 1).padStart(2, "0")}`, landmassId: macro.id, longitude: center[0], latitude: center[1], points: macro.outline(cell.points) }; });
  const landmasses: WarLandmassV97[] = macros.map(macro => ({ id: macro.id, territoryIds: macro.cells.map(cell => cell.id), longitude: round(macro.center[0]), latitude: round(macro.center[1]), points: macro.outline(circle) }));
  const regions: WarAtlasRegionV95[] = regionNames.map((name, index) => { const members = territories.filter(territory => territory.regionId === `CON-REG${String(index + 1).padStart(2, "0")}`), marker = members[Math.floor(members.length / 2)]; return { id: marker.regionId, name, territoryIds: members.map(member => member.id), longitude: marker.longitude, latitude: marker.latitude }; });
  const neighbors = new Map(cells.map(cell => [cell.id, new Set<string>()])), routes: WarPlanetRouteV103[] = [];
  const connect = (first: number, second: number, kind: "land" | "crossing", distance?: number) => {
    const a = cells[first].id, b = cells[second].id;
    if (neighbors.get(a)!.has(b)) return;
    neighbors.get(a)!.add(b); neighbors.get(b)!.add(a);
    routes.push({ fromId: a, toId: b, kind, distanceDegrees: round(distance ?? angularDistance([territories[first].longitude, territories[first].latitude], [territories[second].longitude, territories[second].latitude])), hydrologyIds: [], points: [] });
  };
  for (const macro of macros) for (const edge of macro.edges) if (edge.owners.length === 2) connect(edge.owners[0], edge.owners[1], "land");
  const coasts = macros.map(macro => {
    const unique = new Map<string, { owner: number; vector: [number, number, number] }>();
    for (const edge of macro.edges) if (edge.owners.length === 1) for (const point of [edge.a, lerp(edge.a, edge.b, .5), edge.b]) {
      const mapped = macro.map(point), pointKey = key(mapped);
      if (!unique.has(pointKey)) unique.set(pointKey, { owner: edge.owners[0], vector: vector(mapped) });
    }
    return [...unique.values()];
  });
  const candidates: { first: number; second: number; a: number; b: number; distance: number }[] = [];
  for (let first = 0; first < macros.length; first++) for (let second = first + 1; second < macros.length; second++) {
    let best = -2, a = -1, b = -1;
    for (const aa of coasts[first]) for (const bb of coasts[second]) { const score = dot(aa.vector, bb.vector); if (score > best) { best = score; a = aa.owner; b = bb.owner; } }
    candidates.push({ first, second, a, b, distance: Math.acos(Math.max(-1, Math.min(1, best))) / RAD });
  }
  candidates.sort((a, b) => a.distance - b.distance || a.a - b.a || a.b - b.b);
  const parents = macros.map((_, index) => index), root = (index: number): number => { while (parents[index] !== index) index = parents[index]; return index; };
  const join = (edge: typeof candidates[number]) => { const first = root(edge.first), second = root(edge.second); if (first !== second) { connect(edge.a, edge.b, "crossing", edge.distance); parents[first] = second; } };
  // When a region spans several islands its own spanning tree comes first,
  // guaranteeing each region is connected without transiting another region.
  for (let region = 0; region < recipe.regionCount; region++) {
    const members = new Set(cells.filter(cell => cell.region === region).map(cell => cell.macro));
    for (const edge of candidates) if (members.has(edge.first) && members.has(edge.second)) join(edge);
  }
  candidates.forEach(join);
  for (const edge of candidates) if (edge.distance < 16 && neighbors.get(cells[edge.a].id)!.size < 6 && neighbors.get(cells[edge.b].id)!.size < 6) connect(edge.a, edge.b, "crossing", edge.distance);
  const features = hydrology(macros, cells, recipe, id);
  const byId = new Map(territories.map((territory, index) => [territory.id, index]));
  for (const route of routes) {
    const first = byId.get(route.fromId)!, second = byId.get(route.toId)!, a = territories[first], b = territories[second], path = greatCircle([a.longitude, a.latitude], [b.longitude, b.latitude]);
    route.points = path;
    route.hydrologyIds = features.filter(feature => [-360, 0, 360].some(shift => {
      const polygon = feature.points.map(([x, y]): Point => [x + shift, y]);
      return path.some(point => contains(point, polygon)) || path.some((point, index) => index > 0 && polygon.some((p, j) => intersects(path[index - 1], point, p, polygon[(j + 1) % polygon.length])));
    })).map(feature => feature.id);
    if (route.hydrologyIds.length || (cells[first].macro === cells[second].macro && path.some(([x, y]) => ![-360, 0, 360].some(shift => contains([x + shift, y], landmasses[cells[first].macro].points))))) route.kind = "crossing";
  }
  return { territories, landmasses, regions, neighbors, routes, hydrology: { features, coveredFraction: features.reduce((sum, feature) => sum + sphericalPolygonAreaV103(feature.points), 0) / (4 * Math.PI) } };
}
