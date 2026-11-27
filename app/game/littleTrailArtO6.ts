import { YOUTH_ART_MANIFEST } from "./youthArtManifest";
import { LITTLE_TRAIL_O6 as route, littleTrailAnchorO6, littleTrailPreyX, type LittleTrailViewO6 } from "./systems/littleTrailRouteO6";

const background = YOUTH_ART_MANIFEST.scenes.desert!;
const props = YOUTH_ART_MANIFEST.desertProps!;
const grazer = YOUTH_ART_MANIFEST.patrolGrazer!;
type Sprite = { src: string; rect: readonly [number, number, number, number]; pivot: readonly [number, number] };
export type LittleTrailImagesO6 = ReadonlyMap<string, HTMLImageElement>;

export async function loadLittleTrailArtO6(): Promise<LittleTrailImagesO6> {
  const distinct = [...new Set([background.src, props.stone.src, props.branch.src, props.footprints.src, grazer.right.watch.src])];
  return new Map(await Promise.all(distinct.map(src => new Promise<readonly [string, HTMLImageElement]>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve([src, img]);
    img.onerror = () => reject(new Error("La planche de la lisière est indisponible."));
    img.src = src;
  }))));
}

export type LittleTrailPreyMotionO6 = { x: number; step: number; flee: boolean };

export function drawLittleTrailO6(ctx: CanvasRenderingContext2D, art: LittleTrailImagesO6, view: LittleTrailViewO6,
  preyMotion: LittleTrailPreyMotionO6 | null) {
  const image = art.get(background.src)!;
  const scale = Math.max(route.width / image.width, route.height / image.height);
  const prop = (sprite: Sprite, x: number, y: number, height: number, alpha = 1) => {
    const size = height / sprite.rect[3];
    ctx.globalAlpha = alpha;
    ctx.drawImage(art.get(sprite.src)!, ...sprite.rect, x - sprite.pivot[0] * size, y - sprite.pivot[1] * size, sprite.rect[2] * size, height);
    ctx.globalAlpha = 1;
  };
  ctx.clearRect(0, 0, route.width, route.height);
  ctx.drawImage(image, (route.width - image.width * scale) / 2, 0, image.width * scale, image.height * scale);
  const dusk = ctx.createLinearGradient(0, 0, 0, route.height);
  dusk.addColorStop(0, "#14232641");
  dusk.addColorStop(1, "#42281685");
  ctx.fillStyle = dusk;
  ctx.fillRect(0, 0, route.width, route.height);

  // The lower path remains continuous. The shoulder above it only connects at the marked roots.
  const rim = (y: number, start: number, end: number, face: string, edge: string) => {
    ctx.beginPath();
    ctx.moveTo(start, y); ctx.lineTo(end, y); ctx.lineTo(end + 10, y + 26); ctx.lineTo(start - 16, y + 33);
    ctx.closePath(); ctx.fillStyle = face; ctx.fill(); ctx.strokeStyle = edge; ctx.stroke();
  };
  rim(route.overlook, 66, route.climb + 4, "#493c36", "#bd986d");
  rim(route.bottom, 42, 838, "#46332a", "#b28a6c");
  ctx.strokeStyle = "#483124";
  ctx.lineWidth = 9;
  ctx.beginPath(); ctx.moveTo(route.climb - 15, route.bottom); ctx.lineTo(route.climb + 11, route.overlook); ctx.stroke();
  ctx.strokeStyle = "#ac8054"; ctx.lineWidth = 4;
  for (let y = route.overlook + 12; y < route.bottom - 4; y += 13) {
    const x = route.climb + 11 - (y - route.overlook) * .21;
    ctx.beginPath(); ctx.moveTo(x - 13, y); ctx.lineTo(x + 13, y - 3); ctx.stroke();
  }

  prop(props.stone, route.first, route.bottom, 38);
  prop(props.stone, route.pebble, route.bottom, 19);
  prop(props.branch, route.rub + 16, route.bottom, 64);
  prop(props.branch, route.far + 18, route.bottom, 89);
  prop(props.stone, 784, route.bottom, 56);
  prop(props.branch, 680, route.overlook, 31);
  if (view.loss) {
    prop(props.footprints, littleTrailAnchorO6(view), route.bottom, 14);
    if (view.stage !== "search-anchor") prop(props.footprints, route.old, route.bottom, 13, .78);
  }

  const x = preyMotion?.x ?? littleTrailPreyX(view);
  if (x !== null) {
    const sprite = preyMotion ? grazer.right.charge[Math.floor(preyMotion.step / 5) % 2] :
      view.stage === "far" ? grazer.left.watch : grazer.right.watch;
    prop(sprite, x, route.bottom, preyMotion?.flee ? 43 : 49);
  }
}
