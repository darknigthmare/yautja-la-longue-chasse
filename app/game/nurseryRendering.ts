import { NURSERY_ARENA, type NurseryPresentation } from "./systems/nurseryPrologue";
import { NURSERY_CONTINUITY_V72 } from "./systems/nurseryContinuityV72";
import { YOUTH_ART_MANIFEST } from "./youthArtManifest";
import { homeworldCivilianArtV72, type HomeworldCivilianRoleV72 } from "./systems/homeworldIdentityV72";
import { drawActorContactShadow, getSpriteContact } from "./spriteContact";
import { NURSERY_VICTORY_COMPOSITION_V71, nurseryBackdropProjection, nurseryVictoryDrawingTicksV71,
  type NurseryBackdropProjection } from "./systems/nurseryVictoryCompositionV71";

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
export interface NurseryContinuityArtBankV72 {
  continuitySceneV72: HTMLImageElement;
  continuityCorridorV72: HTMLImageElement;
  continuityHallV72: HTMLImageElement;
  continuityImagesV72: ReadonlyMap<string, HTMLImageElement>;
}
export interface NurseryArtBank {
  manifest: NurseryArtManifest;
  images: ReadonlyMap<string, HTMLImageElement>;
  continuitySceneV72?: HTMLImageElement;
  continuityCorridorV72?: HTMLImageElement;
  continuityHallV72?: HTMLImageElement;
  continuityImagesV72?: ReadonlyMap<string, HTMLImageElement>;
}
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
/** Extra authored shot remains separate from the immutable V47 eight-image manifest. */
export function nurseryContinuityArtSourcesV72(): string[] {
  return [...new Set([NURSERY_CONTINUITY_V72.roadSrc, NURSERY_CONTINUITY_V72.corridorSrc, NURSERY_CONTINUITY_V72.hallSrc,
    NURSERY_CONTINUITY_V72.chiefSrc, NURSERY_CONTINUITY_V72.veilSrc,
    YOUTH_ART_MANIFEST.actors.player.left.src, YOUTH_ART_MANIFEST.actors.player.right.src,
    homeworldCivilianArtV72("guard").src, homeworldCivilianArtV72("herald").src])];
}
export async function loadNurseryContinuityArtV72(): Promise<NurseryContinuityArtBankV72> {
  const images = new Map<string, HTMLImageElement>();
  await Promise.all(nurseryContinuityArtSourcesV72().map(src => new Promise<void>((resolve, reject) => {
    const image = new Image();
    const timeout = setTimeout(() => reject(new Error("Une image de l'accueil du clan n'a pas pu être chargée.")), 20000);
    image.onload = async () => {
      try {
        await image.decode();
        if (image.width <= 0 || image.height <= 0) throw new Error("L'image est vide.");
        images.set(src, image); clearTimeout(timeout); resolve();
      } catch { clearTimeout(timeout); reject(new Error("Une image de l'accueil du clan est illisible.")); }
    };
    image.onerror = () => { clearTimeout(timeout); reject(new Error("Une image de l'accueil du clan est indisponible.")); };
    image.src = src;
  })));
  for (const src of [NURSERY_CONTINUITY_V72.roadSrc, NURSERY_CONTINUITY_V72.corridorSrc, NURSERY_CONTINUITY_V72.hallSrc]) {
    const image = images.get(src)!;
    if (image.width < 960 || image.height < 540 || image.width / image.height < 1.65 || image.width / image.height > 1.9) throw new Error("Le cadrage d'une scène d'accueil est invalide.");
  }
  return { continuitySceneV72: images.get(NURSERY_CONTINUITY_V72.roadSrc)!, continuityCorridorV72: images.get(NURSERY_CONTINUITY_V72.corridorSrc)!,
    continuityHallV72: images.get(NURSERY_CONTINUITY_V72.hallSrc)!, continuityImagesV72: images };
}
const smooth = (t: number) => t * t * (3 - 2 * t);
function backdrop(ctx: CanvasRenderingContext2D, image: HTMLImageElement, zoom = 1, centerY = 0.5) {
  const w = NURSERY_ARENA.width, h = NURSERY_ARENA.height;
  const projection = nurseryBackdropProjection(image.width, image.height, w, h, zoom, centerY);
  ctx.drawImage(image, projection.x, projection.y, image.width * projection.scale, image.height * projection.scale);
  return projection;
}
/** Independent native bitmap layers share the wide-shot floor and camera projection. */
function drawVillageVictory(ctx: CanvasRenderingContext2D, presentation: NurseryPresentation,
  bank: NurseryArtBank, scene: HTMLImageElement, projection: NurseryBackdropProjection, reducedMotion: boolean) {
  const tick = nurseryVictoryDrawingTicksV71(presentation, reducedMotion);
  if (tick === null) return;
  const composition = NURSERY_VICTORY_COMPOSITION_V71;
  for (const id of ["player", "rival"] as const) {
    const anchor = composition[id], atlas = bank.manifest.actors[id][anchor.direction];
    const clip = atlas.clips[anchor.clip];
    const frame = nurseryClipFrame(clip, id === "rival" ? Number.MAX_SAFE_INTEGER : tick);
    const image = bank.images.get(atlas.src)!;
    const contact = getSpriteContact(image, frame.rect, frame.pivot[1]);
    const scale = scene.height * composition.bodyHeightFraction * projection.scale / atlas.bodyHeight;
    const supportX = projection.x + scene.width * anchor.x * projection.scale;
    const supportY = projection.y + scene.height * anchor.supportY * projection.scale;
    const x = supportX - frame.pivot[0] * scale;
    const y = supportY - (frame.pivot[1] - (contact?.offsetY ?? 0)) * scale;
    const contactX = contact ? x + (contact.left + contact.right) * 0.5 * scale : supportX;
    drawActorContactShadow(ctx, contactX, supportY,
      contact ? Math.max(2, (contact.right - contact.left) * 0.5 * scale) : 4, 0);
    ctx.drawImage(image, ...frame.rect, x, y, frame.rect[2] * scale, frame.rect[3] * scale);
  }
}
/** The adolescent uses the same measured V48 native orientations as the city. */
function drawCeremonyUnbloodedV72(ctx: CanvasRenderingContext2D, bank: NurseryArtBank, x: number, supportY: number, ticks: number, moving: boolean, reducedMotion: boolean) {
  const atlas = YOUTH_ART_MANIFEST.actors.player.right, image = bank.continuityImagesV72?.get(atlas.src);
  if (!image) return;
  const frame = nurseryClipFrame(atlas.clips[moving && !reducedMotion ? "walk" : "idle"], reducedMotion ? 0 : ticks);
  const contact = getSpriteContact(image, frame.rect, frame.pivot[1]);
  const scale = NURSERY_CONTINUITY_V72.unbloodedHeight / atlas.bodyHeight;
  const left = x - frame.pivot[0] * scale, top = supportY - (frame.pivot[1] - (contact?.offsetY ?? 0)) * scale;
  drawActorContactShadow(ctx, contact ? left + (contact.left + contact.right) * .5 * scale : x, supportY,
    contact ? Math.max(8, (contact.right - contact.left) * .5 * scale) : 13, 0);
  ctx.drawImage(image, ...frame.rect, left, top, frame.rect[2] * scale, frame.rect[3] * scale);
}
function drawCeremonyCivilianV72(ctx: CanvasRenderingContext2D, bank: NurseryArtBank, role: HomeworldCivilianRoleV72,
  x: number, supportY: number, height: number, facingLeft: boolean) {
  const art = homeworldCivilianArtV72(role), image = bank.continuityImagesV72?.get(art.src);
  if (!image) return;
  const rect = art.sourceRect, scale = height / art.alphaBounds.height;
  const left = x - art.pivot.x * scale, top = supportY - art.pivot.y * scale;
  drawActorContactShadow(ctx, x, supportY, Math.max(8, art.alphaBounds.width * scale * .25), 0);
  ctx.save(); if (facingLeft) { ctx.translate(x * 2, 0); ctx.scale(-1, 1); }
  ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height, left, top, rect.width * scale, rect.height * scale); ctx.restore();
}
function drawClanAudienceV72(ctx: CanvasRenderingContext2D, presentation: NurseryPresentation, bank: NurseryArtBank, reducedMotion: boolean) {
  const hall = bank.continuityHallV72;
  if (!hall) return;
  const projection = backdrop(ctx, hall), worldPoint = (x: number, y: number) => [projection.x + hall.width * x * projection.scale, projection.y + hall.height * y * projection.scale] as const;
  // Distinct civilian occupations, two depth rows. They are independently
  // sampled from the same clan atlas used by the actual Homeworld population.
  for (const [index, role] of (["guard", "archivist", "healer", "herald", "rite-keeper"] as const).entries()) {
    const [x, y] = worldPoint(.09 + index * .11, .766);
    drawCeremonyCivilianV72(ctx, bank, role, x, y, 87, x > 430);
  }
  const chief = bank.continuityImagesV72?.get(NURSERY_CONTINUITY_V72.chiefSrc);
  if (chief) {
    const [seatX, seatY] = worldPoint(.635, .565), scale = 130 / 1401;
    // Seated source is independently redrawn from this clan chief. The pelvis
    // meets the painted seat; no standing sprite is bent to fake a seated pose.
    ctx.save(); ctx.translate(seatX * 2, 0); ctx.scale(-1, 1);
    ctx.drawImage(chief, 124, 53, 832, 1411, seatX - 388 * scale, seatY - 747 * scale, 832 * scale, 1411 * scale); ctx.restore();
  }
  const [mentorX, mentorY] = worldPoint(.43, NURSERY_CONTINUITY_V72.hallSupportY);
  drawCeremonyCivilianV72(ctx, bank, "instructor", mentorX, mentorY, 134, true);
  const progress = reducedMotion ? .9 : presentation.camera.progress;
  const heroX = presentation.phase === "clan-departure" ? 310 + progress * 555 : presentation.phase === "complete" ? 865 : 310;
  const [, supportY] = worldPoint(.3, NURSERY_CONTINUITY_V72.hallSupportY);
  drawCeremonyUnbloodedV72(ctx, bank, heroX, supportY, Math.floor(presentation.camera.progress * 240), presentation.phase === "clan-departure", reducedMotion);
  for (const [index, role] of (["artisan", "courier", "guard", "forge-master"] as const).entries()) {
    const [x, y] = worldPoint(.06 + index * .17, .885);
    drawCeremonyCivilianV72(ctx, bank, role, x, y, 136, x > 430);
  }
}
/** Younglings and the Unblooded have native directions. Original clan residents
 * may mirror their one facing; no adult rig substitutes the child fighters. */
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
      const image = images.get(atlas.src)!, contact = getSpriteContact(image, frame.rect, frame.pivot[1]);
      const x = actor.x - frame.pivot[0] * scale, y = actor.y - (frame.pivot[1] - (contact?.offsetY ?? 0)) * scale;
      const contactX = contact ? x + (contact.left + contact.right) * .5 * scale : actor.x;
      drawActorContactShadow(ctx, contactX, NURSERY_ARENA.groundY, contact ? Math.max(7, (contact.right - contact.left) * .5 * scale) : 13, NURSERY_ARENA.groundY - actor.y);
      ctx.drawImage(image, ...frame.rect, x, y, frame.rect[2] * scale, frame.rect[3] * scale);
      if (actor.holdsDetachedBlade) ctx.drawImage(blade, x + frame.handAnchor[0] * scale - bladeWidth / 2, y + frame.handAnchor[1] * scale - bladeHeight * 0.92, bladeWidth, bladeHeight);
    }
    ctx.filter = "none";
  } else if (presentation.camera.shot === "village") {
    const progress = smooth(presentation.camera.progress);
    const village = scene("village");
    const projection = backdrop(ctx, village, reducedMotion ? 1 : 1.45 - 0.45 * progress, reducedMotion ? 0.5 : 0.61 - 0.11 * progress);
    drawVillageVictory(ctx, presentation, bank, village, projection, reducedMotion);
    if (!reducedMotion && progress < 0.15) { ctx.globalAlpha = 1 - progress / 0.15; backdrop(ctx, scene("arena")); ctx.globalAlpha = 1; }
  } else if (presentation.camera.shot === "clan-road") {
    const road = bank.continuitySceneV72;
    if (road) {
      const projection = backdrop(ctx, road);
      // At this point the rival has recovered. Combat state stays untouched so
      // the authentic knockout remains verifiable by the save normalizer.
      if (presentation.phase === "walkout") for (const id of ["player", "rival"] as const) {
        const atlas = manifest.actors[id].right;
        const progress = reducedMotion ? .82 : presentation.camera.progress;
        const frame = nurseryClipFrame(atlas.clips[reducedMotion ? "idle" : "walk"], Math.floor(progress * NURSERY_CONTINUITY_V72.walkoutTicks));
        const image = images.get(atlas.src)!, contact = getSpriteContact(image, frame.rect, frame.pivot[1]);
        const scale = NURSERY_CONTINUITY_V72.roadActorHeight / atlas.bodyHeight;
        const supportX = 120 + progress * 745 - (id === "rival" ? 65 : 0);
        const supportY = projection.y + road.height * NURSERY_CONTINUITY_V72.roadSupportY * projection.scale;
        const x = supportX - frame.pivot[0] * scale, y = supportY - (frame.pivot[1] - (contact?.offsetY ?? 0)) * scale;
        const contactX = contact ? x + (contact.left + contact.right) * .5 * scale : supportX;
        drawActorContactShadow(ctx, contactX, supportY, contact ? Math.max(6, (contact.right - contact.left) * .5 * scale) : 11, 0);
        ctx.drawImage(image, ...frame.rect, x, y, frame.rect[2] * scale, frame.rect[3] * scale);
      }
    }
  } else if (presentation.camera.shot === "clan-corridor") {
    const corridor = bank.continuityCorridorV72;
    if (corridor) {
      const projection = backdrop(ctx, corridor);
      const progress = reducedMotion ? 1 : presentation.camera.progress;
      const veil = bank.continuityImagesV72?.get(NURSERY_CONTINUITY_V72.veilSrc);
      if (veil) {
        const opening = presentation.phase === "clan-entry" ? Math.min(1, progress / .3) : 0;
        const cx = projection.x + corridor.width * .793 * projection.scale;
        const top = projection.y + corridor.height * .278 * projection.scale;
        ctx.save(); ctx.beginPath(); ctx.rect(cx - 116, top, 232, 275); ctx.clip();
        // Real fabric pixels are split into two panels. Each slides outwards;
        // no geometric stand-in or invented sprite frames replace the veil.
        ctx.drawImage(veil, 198, 0, 526, 1083, cx - 116 - opening * 120, top, 116, 275);
        ctx.drawImage(veil, 724, 0, 527, 1083, cx + opening * 120, top, 116, 275);
        ctx.restore();
      }
      const x = presentation.phase === "clan-entry" ? 230 + progress * 565 : 230;
      const supportY = projection.y + corridor.height * NURSERY_CONTINUITY_V72.corridorSupportY * projection.scale;
      drawCeremonyUnbloodedV72(ctx, bank, x, supportY, Math.floor(progress * 240), presentation.phase === "clan-entry", reducedMotion);
    }
  } else if (presentation.camera.shot === "clan-hall") {
    drawClanAudienceV72(ctx, presentation, bank, reducedMotion);
  } else {
    backdrop(ctx, scene("redMoon"), reducedMotion ? 1 : 1.05 + 0.05 * smooth(presentation.camera.progress));
  }
  ctx.restore();
}
