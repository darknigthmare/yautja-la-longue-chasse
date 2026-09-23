import { NURSERY_ARENA, type NurseryPresentation } from "./systems/nurseryPrologue";

export const NURSERY_ART_POSES = ["idle", "walk", "ready", "jab", "blade", "throw", "dodge", "hurt", "thrown", "ko"] as const;
export type NurseryArtPose = typeof NURSERY_ART_POSES[number];
export interface NurseryArtFrame {
  rect: readonly [number, number, number, number];
  pivot: readonly [number, number];
  handAnchor: readonly [number, number];
  durationTicks: number;
}
export interface NurseryArtClip { loop: boolean; frames: readonly NurseryArtFrame[] }
export interface NurseryActorAtlas { src: string; bodyHeight: number; clips: Record<NurseryArtPose, NurseryArtClip> }
export interface NurseryArtManifest {
  version: 1;
  actorKind: "youngling";
  scenes: Record<"arena" | "village" | "redMoon", { src: string }>;
  blade: { src: string };
  actors: Record<"player" | "rival", Record<"right" | "left", NurseryActorAtlas>>;
}
export interface NurseryDecodedImage { width: number; height: number }
export interface NurseryArtBank { manifest: NurseryArtManifest; images: ReadonlyMap<string, HTMLImageElement> }
const goodNumber = (v: number) => Number.isFinite(v) && v >= 0;
export function nurseryArtSources(manifest: NurseryArtManifest): string[] {
  return [...new Set([...Object.values(manifest.scenes).map(scene => scene.src), manifest.blade.src,
    ...Object.values(manifest.actors).flatMap(actor => Object.values(actor).map(atlas => atlas.src))])];
}
/** Decoding alone is insufficient: every actually-used pose, direction and cell must exist. */
export function validateNurseryArt(manifest: NurseryArtManifest, images: ReadonlyMap<string, NurseryDecodedImage>): string[] {
  const errors: string[] = [];
  if (manifest.version !== 1 || manifest.actorKind !== "youngling") errors.push("Le manifeste doit décrire des Younglings.");
  for (const src of nurseryArtSources(manifest)) {
    const image = images.get(src);
    if (!src.startsWith("/game/prologue/") || !/\.png$/i.test(src)) errors.push(`Source du prologue invalide : ${src}`);
    if (!image || !Number.isFinite(image.width) || !Number.isFinite(image.height) || image.width <= 0 || image.height <= 0) errors.push(`Image non décodée : ${src}`);
  }
  for (const actorId of ["player", "rival"] as const) {
    const directions = manifest.actors[actorId];
    if (directions.left.src === directions.right.src) errors.push(`${actorId} : orientations natives distinctes requises.`);
    for (const direction of ["left", "right"] as const) {
      const atlas = directions[direction]; const image = images.get(atlas.src);
      if (!Number.isFinite(atlas.bodyHeight) || atlas.bodyHeight <= 0) errors.push(`${actorId} : échelle invalide.`);
      for (const pose of NURSERY_ART_POSES) {
        const clip = atlas.clips[pose];
        if (!clip || clip.frames.length < 2) { errors.push(`${actorId}/${direction}/${pose} : dessins manquants.`); continue; }
        if (clip.loop && !["idle", "walk", "ready"].includes(pose)) errors.push(`${actorId}/${direction}/${pose} : action non bouclable.`);
        const drawings = new Set<string>();
        for (const frame of clip.frames) {
          const [x, y, w, h] = frame.rect; drawings.add(frame.rect.join(","));
          if (!frame.rect.every(goodNumber) || w <= 0 || h <= 0 || image && (x + w > image.width || y + h > image.height)) errors.push(`${actorId}/${direction}/${pose} : cellule hors image.`);
          if (!Number.isInteger(frame.durationTicks) || frame.durationTicks <= 0 || frame.durationTicks > 120) errors.push(`${actorId}/${direction}/${pose} : durée invalide.`);
          if (![...frame.pivot, ...frame.handAnchor].every(goodNumber) || frame.pivot[0] > w || frame.pivot[1] > h || frame.handAnchor[0] > w || frame.handAnchor[1] > h) errors.push(`${actorId}/${direction}/${pose} : ancrage hors cellule.`);
        }
        if (drawings.size < 2) errors.push(`${actorId}/${direction}/${pose} : une pose répétée ne constitue pas deux dessins.`);
      }
    }
  }
  return errors;
}
export function nurseryClipFrame(clip: NurseryArtClip, tick: number): NurseryArtFrame {
  const duration = clip.frames.reduce((sum, frame) => sum + frame.durationTicks, 0);
  let cursor = Math.max(0, Math.floor(tick));
  cursor = clip.loop ? cursor % duration : Math.min(cursor, duration - 1);
  for (const frame of clip.frames) { if (cursor < frame.durationTicks) return frame; cursor -= frame.durationTicks; }
  return clip.frames[clip.frames.length - 1];
}
export async function loadNurseryArt(manifest: NurseryArtManifest): Promise<NurseryArtBank> {
  const images = new Map<string, HTMLImageElement>();
  await Promise.all(nurseryArtSources(manifest).map(src => new Promise<void>((resolve, reject) => {
    const image = new Image();
    const timeout = setTimeout(() => reject(new Error(`Délai de chargement dépassé : ${src}`)), 20000);
    image.onload = async () => {
      try { await image.decode(); images.set(src, image); clearTimeout(timeout); resolve(); }
      catch { clearTimeout(timeout); reject(new Error(`PNG illisible : ${src}`)); }
    };
    image.onerror = () => { clearTimeout(timeout); reject(new Error(`PNG indisponible : ${src}`)); };
    image.src = src;
  })));
  const errors = validateNurseryArt(manifest, images);
  if (errors.length) throw new Error(errors.join(" "));
  return { manifest, images };
}
const smooth = (t: number) => t * t * (3 - 2 * t);
function backdrop(ctx: CanvasRenderingContext2D, image: HTMLImageElement, zoom = 1, centerY = 0.5) {
  const w = NURSERY_ARENA.width, h = NURSERY_ARENA.height;
  const scale = Math.max(w / image.width, h / image.height) * zoom;
  ctx.drawImage(image, (w - image.width * scale) / 2, h / 2 - image.height * scale * centerY, image.width * scale, image.height * scale);
}
/** No CSS actors, mirrored costume, health HUD or substitute adult rig. */
export function drawNurseryScene(ctx: CanvasRenderingContext2D, presentation: NurseryPresentation, bank: NurseryArtBank | null, reducedMotion: boolean) {
  const { width, height } = NURSERY_ARENA;
  ctx.save(); ctx.clearRect(0, 0, width, height); ctx.fillStyle = "#080202"; ctx.fillRect(0, 0, width, height);
  if (!bank || presentation.camera.shot === "black") { ctx.restore(); return; }
  const { manifest, images } = bank;
  const scene = (name: keyof NurseryArtManifest["scenes"]) => images.get(manifest.scenes[name].src)!;
  if (presentation.camera.shot === "arena") {
    if (!reducedMotion) ctx.filter = `blur(${presentation.camera.blur * 12}px)`;
    backdrop(ctx, scene("arena"));
    const blade = images.get(manifest.blade.src)!;
    const bladeHeight = 20, bladeWidth = bladeHeight * blade.width / blade.height;
    if (presentation.groundBlade.visible) {
      ctx.save(); ctx.translate(presentation.groundBlade.x, presentation.groundBlade.y - 2); ctx.rotate(Math.PI / 2);
      ctx.drawImage(blade, -bladeWidth / 2, -bladeHeight / 2, bladeWidth, bladeHeight); ctx.restore();
    }
    for (const actor of presentation.actors) {
      const atlas = manifest.actors[actor.id][actor.facing === 1 ? "right" : "left"];
      const poseTick = actor.pose === "ready" ? Math.max(0, Math.floor(presentation.readyGestureProgress * 120) - 1) : actor.poseTick;
      const frame = nurseryClipFrame(atlas.clips[actor.pose], poseTick);
      const scale = NURSERY_ARENA.actorHeight / atlas.bodyHeight;
      const x = actor.x - frame.pivot[0] * scale, y = actor.y - frame.pivot[1] * scale;
      ctx.drawImage(images.get(atlas.src)!, ...frame.rect, x, y, frame.rect[2] * scale, frame.rect[3] * scale);
      if (actor.holdsDetachedBlade) ctx.drawImage(blade, x + frame.handAnchor[0] * scale - bladeWidth / 2, y + frame.handAnchor[1] * scale - bladeHeight * 0.92, bladeWidth, bladeHeight);
    }
    ctx.filter = "none";
  } else if (presentation.camera.shot === "village") {
    const progress = smooth(presentation.camera.progress);
    backdrop(ctx, scene("village"), reducedMotion ? 1 : 1.45 - 0.45 * progress, reducedMotion ? 0.5 : 0.61 - 0.11 * progress);
    if (progress < 0.15) { ctx.globalAlpha = 1 - progress / 0.15; backdrop(ctx, scene("arena")); ctx.globalAlpha = 1; }
  } else {
    backdrop(ctx, scene("redMoon"), reducedMotion ? 1 : 1.05 + 0.05 * smooth(presentation.camera.progress));
  }
  ctx.restore();
}
