/** 32 independently addressable original planet details. Unlike a palette,
 * these are pixel textures generated from each immutable material description.
 * The V103 triplanar renderer handles globe poles and repeated seams. */
export type PlanetMaterialDomainV115 = "land" | "liquid";
export type PlanetMaterialPatternV115 = "strata" | "granular" | "veins" | "cells" | "waves" | "eddies" | "cracks" | "crystals";
export interface PlanetTextureDefinitionV115 {
  id: string;
  name: string;
  domain: PlanetMaterialDomainV115;
  origin: "earthlike" | "alien";
  pattern: PlanetMaterialPatternV115;
  description: string;
  frequency: number;
  detail: number;
  color: readonly [number, number, number];
}
const source = [
  ["Alluvions", "land", "earthlike", "strata", "Sédiments, couches et ravines", 5, .5, [155,140,115]],
  ["Basalte", "land", "earthlike", "cracks", "Dalles volcaniques refroidies", 8, .8, [95,97,103]],
  ["Granit", "land", "earthlike", "granular", "Granulats et inclusions minérales", 10, .45, [160,153,148]],
  ["Argile", "land", "earthlike", "cells", "Terres argileuses et retrait", 7, .7, [165,129,104]],
  ["Moraines", "land", "earthlike", "granular", "Pierres et dépôts glaciaires", 12, .65, [161,170,170]],
  ["Tourbe", "land", "earthlike", "strata", "Humus humide et lits organiques", 6, .52, [96,103,80]],
  ["Calcaire", "land", "earthlike", "veins", "Veines calcaires et fractures", 8, .6, [189,186,166]],
  ["Sables éoliens", "land", "earthlike", "waves", "Dunes et ondulations fines", 10, .75, [186,157,102]],
  ["Xéno-cellules", "land", "alien", "cells", "Plaques polygonales biominérales", 13, .75, [117,137,157]],
  ["Schiste spectral", "land", "alien", "veins", "Veines ramifiées de silicates froids", 16, .75, [122,102,167]],
  ["Racines de fer", "land", "alien", "strata", "Nervures métalliques torsadées", 7, .8, [137,112,111]],
  ["Écailles iridescentes", "land", "alien", "cells", "Écailles géologiques serrées", 18, .55, [113,156,170]],
  ["Géodes", "land", "alien", "crystals", "Clivages cristallins et aiguilles", 12, .95, [156,127,185]],
  ["Roche spongieuse", "land", "alien", "granular", "Bulles minérales et alvéoles", 9, .82, [142,159,129]],
  ["Fosses sulfuriques", "land", "alien", "cracks", "Fentes minérales et croûtes actives", 6, .8, [157,169,106]],
  ["Strates organiques", "land", "alien", "veins", "Filaments pétrifiés et dépôts fossiles", 11, .93, [118,146,111]],
  ["Houle froide", "liquid", "earthlike", "waves", "Crêtes de vagues océaniques", 9, .6, [105,151,173]],
  ["Lagune", "liquid", "earthlike", "eddies", "Tourbillons littoraux et faible houle", 5, .6, [116,175,169]],
  ["Océan profond", "liquid", "earthlike", "waves", "Ondulations larges et sillages ténus", 4, .35, [76,114,154]],
  ["Estuaire", "liquid", "earthlike", "eddies", "Mélanges de courants et sédiments", 8, .65, [118,143,138]],
  ["Marée sombre", "liquid", "earthlike", "waves", "Rides nocturnes et houle courte", 12, .52, [89,105,137]],
  ["Saumure saline", "liquid", "earthlike", "cells", "Précipités de sel et circulation", 8, .5, [175,150,171]],
  ["Boue fluide", "liquid", "earthlike", "eddies", "Vortex lourds et fines suspensions", 9, .7, [140,126,101]],
  ["Glace flottante", "liquid", "earthlike", "cracks", "Plaques et crêtes sur liquide gelé", 7, .75, [161,197,211]],
  ["Mercure fictionnel", "liquid", "alien", "waves", "Vagues métalliques et pellicules", 11, .7, [166,177,195]],
  ["Acide luminescent", "liquid", "alien", "eddies", "Courants corrosifs à filaments", 14, .85, [132,189,108]],
  ["Cryofluide", "liquid", "alien", "cells", "Cellules cryogéniques en mouvement", 12, .7, [132,185,210]],
  ["Magma visqueux", "liquid", "alien", "veins", "Veines incandescentes à circulation lente", 7, .95, [193,115,92]],
  ["Nappes de spores", "liquid", "alien", "cells", "Matrices microscopiques et floraisons", 16, .9, [153,133,177]],
  ["Liquide cristallin", "liquid", "alien", "crystals", "Facettes translucides et courants anguleux", 11, .85, [124,156,198]],
  ["Résine noire", "liquid", "alien", "eddies", "Coulées visqueuses à réseaux fins", 6, .8, [95,96,118]],
  ["Plasma fictif", "liquid", "alien", "veins", "Arcs lumineux et nœuds électrodynamiques", 14, .9, [149,124,189]],
] as const;
export const WAR_PLANET_TEXTURES_V115: readonly PlanetTextureDefinitionV115[] = Object.freeze(source.map((v, index) => Object.freeze({
  id: `${v[1]}-${String(index < 16 ? index + 1 : index - 15).padStart(2, "0")}`,
  name: v[0], domain: v[1], origin: v[2], pattern: v[3],
  description: v[4], frequency: v[5], detail: v[6], color: v[7],
})));
export const WAR_PLANET_LAND_TEXTURES_V115 = WAR_PLANET_TEXTURES_V115.slice(0, 16);
export const WAR_PLANET_LIQUID_TEXTURES_V115 = WAR_PLANET_TEXTURES_V115.slice(16);
export function planetTextureUriV115(domain: PlanetMaterialDomainV115, index: number): string {
  if (!Number.isInteger(index) || index < 0 || index >= 16) throw new RangeError("Matière planétaire inconnue.");
  return `yautja-v115:${domain}:${index}`;
}
function fraction(v: number) { return v - Math.floor(v); }
function hash(x: number, y: number, seed: number) {
  const a = Math.imul((x + 1) ^ seed, 374761393), b = Math.imul((y + 1) ^ (seed >>> 1), 668265263);
  let n = Math.imul(a ^ b, 1274126177); n ^= n >>> 13;
  return (n >>> 0) / 4294967295;
}
function noise(x: number, y: number, period: number, seed: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const h = (dx: number, dy: number) => hash(((xi + dx) % period + period) % period, ((yi + dy) % period + period) % period, seed);
  const a = h(0, 0) * (1 - sx) + h(1, 0) * sx, b = h(0, 1) * (1 - sx) + h(1, 1) * sx;
  return a * (1 - sy) + b * sy;
}
const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
/** Deterministic in CPU pixels; returns a genuine bitmap used by the shared
 * renderer rather than a decorative preview or an unregistered image. */
export function createPlanetTextureCanvasV115(uri: string, size: number): HTMLCanvasElement {
  const match = /^yautja-v115:(land|liquid):([0-9]|1[0-5])$/.exec(uri);
  if (!match || !Number.isInteger(size) || size < 16 || size > 1024) throw new RangeError("Texture planétaire V115 invalide.");
  const domain = match[1] as PlanetMaterialDomainV115, index = Number(match[2]);
  const material = domain === "land" ? WAR_PLANET_LAND_TEXTURES_V115[index] : WAR_PLANET_LIQUID_TEXTURES_V115[index];
  const canvas = document.createElement("canvas"); canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas de texture indisponible.");
  const pixels = ctx.createImageData(size, size), data = pixels.data;
  const seed = index + (domain === "liquid" ? 131 : 19), frequency = material.frequency;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size;
    const n1 = noise(u * frequency, v * frequency, frequency, seed);
    const n2 = noise(u * frequency * 2, v * frequency * 2, frequency * 2, seed + 42);
    const n3 = noise(u * frequency * 4, v * frequency * 4, frequency * 4, seed + 77);
    const fbm = n1 * .57 + n2 * .31 + n3 * .12;
    const phase = u * Math.PI * 2 * frequency + n1 * 5.0;
    let height = fbm;
    if (material.pattern === "strata") height = .58 * fbm + .42 * Math.sin(v * frequency * Math.PI * 2 + n1 * 3) * .5 + .21;
    if (material.pattern === "waves") height = .62 * fbm + .38 * Math.sin(phase + v * frequency * Math.PI + n2 * 5) * .5 + .19;
    if (material.pattern === "veins") height = Math.max(.13, Math.min(1, .48 * fbm + .52 * Math.pow(Math.abs(Math.sin(phase + n2 * 9)), 5)));
    if (material.pattern === "cells") height = .50 * fbm + .50 * Math.abs(Math.sin(phase) * Math.cos(v * frequency * 6.28 + n1 * 4));
    if (material.pattern === "eddies") height = .52 * fbm + .48 * Math.abs(Math.sin(phase + Math.atan2(v - .5, u - .5) * 4));
    if (material.pattern === "cracks") height = .55 * fbm + .45 * Math.pow(Math.abs(Math.sin(phase + n2 * 10)), 8);
    if (material.pattern === "crystals") height = .38 * fbm + .62 * Math.abs(Math.sin(phase * 1.5) * Math.cos(v * frequency * 4));
    const value = (height - .5) * 2 * material.detail;
    const pos = (y * size + x) * 4;
    for (let channel = 0; channel < 3; channel++) data[pos + channel] = clamp(material.color[channel] + value * 61 + (n3 - .5) * 19);
    data[pos + 3] = 255;
  }
  ctx.putImageData(pixels, 0, 0);
  return canvas;
}
