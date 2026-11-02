/** Level-design occlusion audit: props painted behind a building that covers them.
 *
 * HomeworldWorldSceneV77 sorts props by their ground y and buildings by the
 * y of their front edge (homeworldBuildingRenderDepthV76). A prop whose y is
 * smaller than a building's front edge is painted first; if that building's
 * opaque pixels also cover the prop's sprite on screen, the player cannot see
 * it. Cover is sampled on the building image's real alpha channel.
 * Sprite boxes use the scene's own prop() formula (project the anchor, scale
 * heightWorld to the art's alpha bounds, place by pivot). The prop sprite is
 * its alpha bounding box, so confirm findings on screen.
 *
 * Geometry evidence only. Usage:
 *   node scripts/audit-homeworld-occlusion-v113.mjs [--min-cover 0.6] [--out file]
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {homeworldSceneSsrV78} from '../tests/helpers/homeworld-scene-ssr-v78.mjs';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const images = new Map();
async function alphaOf(root, src) {
  if (!images.has(src)) images.set(src, sharp(path.join(root, 'public', src)).ensureAlpha().raw().toBuffer({resolveWithObject: true}));
  return images.get(src);
}
export async function auditHomeworldOcclusionV113({root = ROOT, minCover = .6} = {}) {
  const qa = homeworldSceneSsrV78(root), load = file => qa.load('app/game/systems/' + file + '.ts');
  const world = load('homeworldWorldV77'), city = load('homeworldCity'), geo = load('homeworldGeometryV64');
  const propArt = load('homeworldArtV64').HOMEWORLD_PROP_ART_V64, furnitureArt = load('homeworldFurnitureV72').HOMEWORLD_FURNITURE_ART_V72;
  const courtArt = load('homeworldCourtArtV80').HOMEWORLD_COURT_ART_V80, street = load('homeworldStreetModulesV78');
  const sprite = (layer, item, art, heightWorld) => {
    if (!art?.alphaBounds) return null;
    const p = geo.homeworldProjectGroundV64(item, world.homeworldLevelV77(item.levelId).elevation), scale = heightWorld / art.alphaBounds.height;
    return {layer, id: item.id, label: item.label ?? item.artId, levelId: item.levelId, x: item.x, y: item.y,
      box: {left: p.x + (art.alphaBounds.x - art.pivot.x) * scale, top: p.y + (art.alphaBounds.y - art.pivot.y) * scale,
        width: art.alphaBounds.width * scale, height: art.alphaBounds.height * scale}};
  };
  const props = [
    ...world.HOMEWORLD_PROPS_V77.filter(p => p.artId).map(p => sprite('prop-v77', p, propArt[p.artId], p.height)),
    ...[...world.HOMEWORLD_FRONTAGE_V77, ...world.HOMEWORLD_CONNECTION_FURNITURE_V77].map(p => {
      const a = furnitureArt[p.artId]; return sprite(p.id.startsWith('v75-frontage:') ? 'frontage-v75' : 'connection-v72', p, a, a ? a.heightWorld * (p.scale ?? 1) : 0);
    }),
    ...[...world.HOMEWORLD_EXTERIOR_V77, ...street.HOMEWORLD_URBAN_PROPS_V78].map(p => {
      const a = courtArt[p.artId]; return sprite(p.id.startsWith('exterior-v76') ? 'exterior-v76' : 'court-v78', p, a, a ? a.heightWorld * p.scale : 0);
    }),
  ].filter(Boolean);
  const findings = [];
  for (const prop of props) {
    const area = prop.box.width * prop.box.height; if (!(area > 0)) continue;
    for (const b of world.HOMEWORLD_BUILDINGS_V77) {
      if (b.levelId !== prop.levelId) continue;
      const depth = city.homeworldBuildingRenderDepthV76(b, prop);
      if (!(prop.y < depth)) continue; // painted after the building: visible over it
      const v = city.homeworldBuildingVisibleBoundsV72(b);
      const ix = Math.max(0, Math.min(prop.box.left + prop.box.width, v.left + v.width) - Math.max(prop.box.left, v.left));
      const iy = Math.max(0, Math.min(prop.box.top + prop.box.height, v.top + v.height) - Math.max(prop.box.top, v.top));
      if (ix * iy / area < minCover * .5) continue;
      // Sample the building image's own alpha over a 12x12 grid of the prop sprite.
      const place = geo.homeworldBuildingSpritePlacementV64(b), art = b.art, rect = art.sourceRect ?? {x: 0, y: 0, width: art.sourceWidth, height: art.sourceHeight};
      const scale = place.width / rect.width, {data, info} = await alphaOf(root, art.src);
      let opaque = 0, samples = 0;
      for (let gy = 0; gy < 12; gy++) for (let gx = 0; gx < 12; gx++) {
        const sx = prop.box.left + (gx + .5) / 12 * prop.box.width, sy = prop.box.top + (gy + .5) / 12 * prop.box.height; samples++;
        const px = Math.floor(rect.x + (sx - place.left) / scale * (info.width / art.sourceWidth)), py = Math.floor(rect.y + (sy - place.top) / scale * (info.height / art.sourceHeight));
        if (px >= 0 && py >= 0 && px < info.width && py < info.height && data[(py * info.width + px) * info.channels + 3] > 40) opaque++;
      }
      const cover = opaque / samples;
      if (cover >= minCover) findings.push({layer: prop.layer, id: prop.id, label: prop.label, levelId: prop.levelId, x: prop.x, y: prop.y,
        building: b.id, buildingFrontY: Math.round(depth), cover: Math.round(cover * 100) / 100});
    }
  }
  findings.sort((a, b) => b.cover - a.cover);
  return {schemaVersion: 1, release: 'V113', minCover,
    method: 'Scene prop() sprite boxes against building image bounds for buildings painted later (prop y < building front-edge depth). Bounding-box cover; confirm on screen.',
    props: props.length, findings};
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2), at = name => {const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined;};
  const result = await auditHomeworldOcclusionV113({minCover: Number(at('--min-cover') ?? .6)});
  const out = at('--out');
  if (out) {fs.mkdirSync(path.dirname(out), {recursive: true}); fs.writeFileSync(out, JSON.stringify(result, null, 2) + '\n');}
  console.log(JSON.stringify({props: result.props, occluded: result.findings.length}));
  for (const f of result.findings) console.log(`${f.layer} ${f.id} (${f.label}) L${f.levelId} y=${Math.round(f.y)} behind ${f.building} front=${f.buildingFrontY} cover=${f.cover}`);
}
