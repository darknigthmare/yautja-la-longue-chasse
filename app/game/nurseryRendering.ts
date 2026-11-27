import { NURSERY_OPENING, nurseryOpeningNetX, nurseryOpeningWindow } from "./systems/nurseryOpening";
import { getNurseryPresentation, NURSERY_ARENA, type NurseryActorId, type NurseryPresentation, type NurseryState } from "./systems/nurseryPrologue";
import { FIRST_SHOCK_HAREK_O6, firstShockCourtO6, type FirstShockRecordO6 } from "./systems/originFirstShockO6";
import { COHORT_COURSE_O6, COHORT_RALLY_X_O6 } from "./systems/cohortRaceCourseO6";
import { COHORT_CHOICE_POSTS_O6, cohortRaceViewO6, type CohortRaceRecordO6 } from "./systems/originCohortRaceO6";
import { NURSERY_COHORT_STOPS, NURSERY_COHORT_RADIUS } from "./systems/nurseryCohortV172";
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
function drawCohortNet(ctx: CanvasRenderingContext2D, center: number, floor: number) {
  ctx.strokeStyle = "#8f6142";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(center - 34, floor + 3); ctx.lineTo(center - 34, floor - 66);
  ctx.lineTo(center + 34, floor - 66); ctx.lineTo(center + 34, floor + 3);
  ctx.stroke();

  ctx.strokeStyle = "#be9065";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const x = center - 30 + 12 * i;
    ctx.moveTo(x, floor - 63); ctx.quadraticCurveTo(x + 6, floor - 29, x - 1, floor - 8);
  }
  for (let i = 1; i <= 4; i++) {
    const y = floor - 66 + i * 11;
    ctx.moveTo(center - 31, y); ctx.quadraticCurveTo(center, y + 9, center + 33, y);
  }
  ctx.stroke();
}

function drawNurseryCohort(ctx: CanvasRenderingContext2D, presentation: NurseryPresentation, bank: NurseryArtBank, reducedMotion: boolean) {
  const cohort = presentation.cohort;
  if (!cohort) return;
  const floor = NURSERY_ARENA.groundY;
  const [, gate, harek, yena, tov, saar, exit] = NURSERY_COHORT_STOPS;

  ctx.save();
  ctx.fillStyle = "#220c05bf";
  ctx.fillRect(0, floor + 23, NURSERY_ARENA.width, 52);

  ctx.strokeStyle = "#8f6142";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(gate.x - 26, floor + 5); ctx.lineTo(gate.x - 26, floor - 43);
  ctx.moveTo(gate.x + 26, floor + 5); ctx.lineTo(gate.x + 26, floor - 43);
  for (const h of [19, 34]) {
    ctx.moveTo(gate.x - 26, floor - h);
    ctx.lineTo(gate.x + (cohort.steps >= 2 ? 26 : -2), floor - h - (cohort.steps >= 2 ? 0 : 9));
  }
  ctx.stroke();
  drawCohortNet(ctx, yena.x, floor);

  ctx.fillStyle = "#573522";
  ctx.fillRect(tov.x + 16, floor - 23, 27, 23);
  ctx.strokeStyle = "#bd8354";
  ctx.strokeRect(tov.x + 16, floor - 23, 27, 23);
  ctx.beginPath(); ctx.moveTo(tov.x + 17, floor - 22); ctx.lineTo(tov.x + 42, floor - 1); ctx.stroke();
  ctx.fillRect(exit.x - 18, floor - 17, 37, 17);
  ctx.strokeRect(exit.x - 18, floor - 17, 37, 17);

  const player = presentation.actors[0];
  const poseTick = reducedMotion ? 0 : player.poseTick;
  function actor(id: "player" | "rival", x: number, facing: -1 | 1, pose: NurseryArtPose, tint = "") {
    const atlas = bank.manifest.actors[id][facing === 1 ? "right" : "left"];
    const frame = nurseryClipFrame(atlas.clips[pose], reducedMotion ? 0 : poseTick);
    const image = bank.images.get(atlas.src)!;
    const contact = getSpriteContact(image, frame.rect, frame.pivot[1]);
    const scale = NURSERY_ARENA.actorHeight / atlas.bodyHeight;
    const left = x - frame.pivot[0] * scale;
    const top = floor - (frame.pivot[1] - (contact?.offsetY ?? 0)) * scale;
    drawActorContactShadow(ctx, x, floor, 13, 0);
    ctx.save();
    if (tint) ctx.filter = tint;
    ctx.drawImage(image, ...frame.rect, left, top, frame.rect[2] * scale, frame.rect[3] * scale);
    ctx.restore();
  }
  actor("rival", harek.x, -1, cohort.steps <= 2 && !reducedMotion ? "ready" : "idle");
  actor("rival", yena.x, -1, cohort.steps <= 3 && !reducedMotion ? "ready" : "idle", "sepia(.38) hue-rotate(13deg)");
  actor("player", tov.x, 1, "idle", "saturate(.48) brightness(.84)");
  drawCeremonyCivilianV72(ctx, bank, "instructor", saar.x, floor, 122, true);
  actor("player", cohort.x, cohort.facing, player.pose === "walk" && !reducedMotion ? "walk" : "idle");

  const blade = bank.images.get(bank.manifest.blade.src)!;
  const toolX = cohort.steps === 0 ? NURSERY_COHORT_STOPS[0].x : cohort.x + 16 * cohort.facing;
  const toolY = cohort.steps === 0 ? floor - 12 : floor - 43;
  const toolHeight = 20;
  const toolWidth = toolHeight * blade.width / blade.height;
  ctx.drawImage(blade, toolX - toolWidth / 2, toolY, toolWidth, toolHeight);

  ctx.font = "600 13px system-ui, sans-serif";
  ctx.textAlign = "center";
  for (const [index, stop] of NURSERY_COHORT_STOPS.entries()) {
    const optional = index === 2 || index === 3;
    const available = index === cohort.steps || cohort.steps === 6 && !cohort.choice && optional;
    const nearby = available && Math.abs(stop.x - cohort.x) <= NURSERY_COHORT_RADIUS;
    ctx.fillStyle = nearby ? "#fff3c5" : available ? "#ffd08a" : "#b8a088";
    ctx.beginPath(); ctx.arc(stop.x, floor + 12, nearby ? 6 : 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillText(stop.label, stop.x, floor + 44);
  }
  ctx.restore();
}

function drawOpeningAnimal(ctx: CanvasRenderingContext2D, opening: NonNullable<NurseryPresentation["opening"]>, floor: number, reducedMotion: boolean) {
  const captured = opening.openingResolved;
  const retreat = opening.motion === "recover";
  const gait = reducedMotion ? 0 : Math.sin(opening.ticks * (opening.motion === "charge" ? .74 : .28));
  const stride = captured ? 0 : (opening.motion === "charge" ? 9 : retreat || opening.stage === "latch" ? 5 : 2) * gait;
  drawActorContactShadow(ctx, opening.beastX, floor, 31, 0);
  ctx.save();
  ctx.translate(opening.beastX, floor - (captured ? 11 : 26));
  ctx.strokeStyle = "#211715"; ctx.lineWidth = 5; ctx.lineCap = "round";
  for (let leg = 0; leg < 4; leg++) {
    const x = (leg - 1.5) * 16;
    const shift = stride * (leg % 2 === 0 ? 1 : -1);
    ctx.beginPath(); ctx.moveTo(x, 3); ctx.lineTo(x + 4 - shift, 14);
    ctx.lineTo(x - 5 + shift, captured ? 11 : 25); ctx.stroke();
  }
  ctx.fillStyle = "#322721";
  ctx.beginPath();
  ctx.moveTo(-35, -6); ctx.quadraticCurveTo(-10, -29, 26, -17);
  ctx.quadraticCurveTo(48, -9, 44, 5); ctx.quadraticCurveTo(20, 16, -22, 9);
  ctx.quadraticCurveTo(-47, 17, -46, 4); ctx.closePath(); ctx.fill();
  for (let plate = 0; plate < 4; plate++) {
    const x = plate * 11 - 23;
    ctx.fillStyle = plate % 2 === 0 ? "#a57852" : "#725740";
    ctx.beginPath(); ctx.ellipse(x, -13 - Math.sin(plate) * 4, 12, 6, -.15, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = "#d6ae7c";
  ctx.beginPath(); ctx.moveTo(-34, -6); ctx.lineTo(-47, -16); ctx.lineTo(-43, 2); ctx.fill();
  ctx.fillStyle = "#ffdd9f";
  ctx.beginPath(); ctx.ellipse(-39, 0, 2.2, 1.4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawNurseryOpening(ctx: CanvasRenderingContext2D, opening: NonNullable<NurseryPresentation["opening"]>,
  bank: NurseryArtBank, reducedMotion: boolean) {
  const floor = NURSERY_ARENA.groundY;
  const gateX = NURSERY_OPENING.gateX;
  const broken = opening.stage !== "latch" || opening.ticks > NURSERY_OPENING.latchTicks - 24;
  const netX = nurseryOpeningNetX(opening);
  ctx.save();
  ctx.fillStyle = "#130f11";
  ctx.fillRect(gateX - 27, floor - 100, 85, 100);
  ctx.lineWidth = 7; ctx.strokeStyle = "#79533b";
  ctx.strokeRect(gateX - 29, floor - 101, 87, 100);
  ctx.strokeStyle = "#483029"; ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(gateX - 18, floor - 85);
  ctx.lineTo(gateX + (broken ? 49 : -18), floor - 7);
  ctx.moveTo(gateX + 25, floor - 87);
  ctx.lineTo(gateX + 24, floor - 6);
  ctx.stroke();
  ctx.fillStyle = "#efae69";
  if (!broken) ctx.fillRect(gateX - 19, floor - 42, 27, 7);
  else for (let shard = 0; shard < 3; shard++) {
    const distance = opening.stage === "latch" && !reducedMotion ? (opening.ticks - 48) * (shard + 1) * .46 : shard * 3;
    ctx.fillRect(gateX - 17 - distance, floor - (opening.stage === "latch" && !reducedMotion ? 38 - distance : 4), 4, 3);
  }

  const shelters = NURSERY_OPENING.shelterX;
  ctx.strokeStyle = "#664533"; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(shelters - 16, floor); ctx.lineTo(shelters - 16, floor - 96);
  ctx.lineTo(shelters + 36, floor - 96); ctx.stroke();
  if (opening.stage === "tactic") {
    ctx.fillStyle = "#b1684a";
    ctx.beginPath(); ctx.ellipse(NURSERY_OPENING.baitX, floor - 8, 14, 7, -.17, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#edc693"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(NURSERY_OPENING.ropeX, floor - 7, 17, 8, 0, 0, Math.PI * 2); ctx.stroke();
  }

  ctx.strokeStyle = "#896447"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(netX - 31, floor); ctx.lineTo(netX - 31, floor - 66);
  ctx.moveTo(netX + 31, floor); ctx.lineTo(netX + 31, floor - 66); ctx.stroke();
  if (nurseryOpeningWindow(opening)) {
    ctx.fillStyle = opening.motion === "charge" ? "#ac5031aa" : "#e59a4d69";
    ctx.fillRect(Math.max(112, opening.beastX - 86), floor - 3, Math.min(86, opening.beastX - 112), 4);
    if (!reducedMotion && opening.motion === "charge") {
      ctx.fillStyle = "#dbb988ad";
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(opening.beastX + (i + 2) * 7 + (opening.ticks * 3 + i * 8) % 14, floor - (i % 2 + 1) * 3, 2 + i * .5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  drawOpeningAnimal(ctx, opening, floor, reducedMotion);
  const pull = opening.openingResolved && !reducedMotion ? Math.sin(opening.ticks * .78) * Math.max(0, 6 - opening.ticks / 8) : 0;
  ctx.strokeStyle = opening.openingResolved ? "#efd4a1" : "#b89a7dbb";
  ctx.lineWidth = opening.openingResolved ? 1.6 : 1;
  ctx.beginPath();
  for (let n = 0; n <= 6; n++) {
    const x = netX - 30 + n * 10, y = floor - 65 + n * 10;
    ctx.moveTo(x, floor - 65); ctx.quadraticCurveTo(x + pull, floor - 31, x, floor - 5);
    ctx.moveTo(netX - 30, y); ctx.quadraticCurveTo(netX, y + pull, netX + 30, y);
  }
  ctx.stroke();

  const child = (id: NurseryActorId, x: number, facing: -1 | 1, pose: "idle" | "walk" | "ko") => {
    const atlas = bank.manifest.actors[id][facing === 1 ? "right" : "left"];
    const frame = nurseryClipFrame(atlas.clips[pose], reducedMotion ? 0 : opening.ticks);
    const image = bank.images.get(atlas.src)!;
    const contact = getSpriteContact(image, frame.rect, frame.pivot[1]);
    const scale = NURSERY_ARENA.actorHeight / atlas.bodyHeight;
    drawActorContactShadow(ctx, x, floor, 13, 0);
    ctx.drawImage(image, ...frame.rect, x - frame.pivot[0] * scale,
      floor - (frame.pivot[1] - (contact?.offsetY ?? 0)) * scale, frame.rect[2] * scale, frame.rect[3] * scale);
  };
  if (opening.coverTicks < NURSERY_OPENING.coverTicks) {
    child("rival", NURSERY_OPENING.allyX - opening.coverTicks * 2.8, -1,
      opening.coverTicks > 0 ? "walk" : "idle");
  }
  const rescue: number = opening.stage === "rescue" ? Math.min(1, opening.ticks / 42) : 0;
  const saarX = opening.stage === "rescue"
    ? NURSERY_OPENING.instructorX + (Math.max(116, opening.beastX - 24) - NURSERY_OPENING.instructorX) * rescue
    : NURSERY_OPENING.instructorX;
  drawCeremonyCivilianV72(ctx, bank, "instructor", saarX, floor, 122, false);
  child("player", opening.x, opening.facing, opening.stage === "rescue" && opening.ticks < 54 ? "ko" : opening.walking ? "walk" : "idle");
  if (opening.stage !== "latch") {
    const held = opening.stage !== "tool";
    ctx.save();
    ctx.translate(held ? opening.x + opening.facing * 14 : NURSERY_OPENING.toolX, floor - (held ? 42 : 7));
    ctx.rotate(held && opening.motion === "recover" ? -.42 * opening.facing : -.09);
    ctx.fillStyle = "#c4905e"; ctx.fillRect(-14, -3, 28, 5);
    ctx.fillStyle = "#694736"; ctx.fillRect(-6, -3, 8, 5); ctx.restore();
  }
  const markers: readonly (readonly [number, string])[] = opening.stage === "tactic" ? [[NURSERY_OPENING.baitX, "Appât"], [NURSERY_OPENING.ropeX, "Corde du filet"]] :
    opening.stage === "tool" ? [[NURSERY_OPENING.toolX, "Outil en bois"]] :
      opening.stage === "cover" ? [[shelters, "Abri de Tov"]] : [];
  ctx.font = "600 14px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = "#fce4b9";
  for (const [x, label] of markers) ctx.fillText(label, x, floor + 30);
  ctx.restore();
}


/** Draw the O6 courtyard with the same native ground, prop and youngling atlases as the prologue. */
export function drawFirstShockCourtyardO6(ctx: CanvasRenderingContext2D, checkpoint: NurseryState, bank: NurseryArtBank,
  record: FirstShockRecordO6, position: { x: number; facing: -1 | 1; ticks: number }, reducedMotion: boolean) {
  const { x, facing, ticks } = position;
  const floor = NURSERY_ARENA.groundY;
  const court = firstShockCourtO6(record, x);
  const base = getNurseryPresentation(checkpoint);
  drawNurseryScene(ctx, { ...base, cohort: undefined, opening: undefined, camera: { shot: "arena", progress: 0, blur: 0 },
    groundBlade: { visible: court.stage === "retrieve", x: record.netX + 12, y: floor },
    actors: [
      { id: "rival", actorKind: "youngling", x: FIRST_SHOCK_HAREK_O6, y: floor, facing: 1,
        pose: "idle", poseTick: 0, holdsDetachedBlade: false },
      { id: "player", actorKind: "youngling", x, y: floor, facing,
        pose: reducedMotion || ticks === 0 ? "idle" : "walk", poseTick: reducedMotion ? 0 : ticks, holdsDetachedBlade: court.held },
    ],
  }, bank, reducedMotion);
  drawCeremonyCivilianV72(ctx, bank, "instructor", court.saarX, floor, 122, court.stage === "escort");
  ctx.save();
  drawCohortNet(ctx, record.netX, floor);
  ctx.font = "600 14px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffe5a1";
  ctx.beginPath(); ctx.arc(court.targetX, floor + 14, 5, 0, Math.PI * 2); ctx.fill();
  const marker = court.stage === "drill" ? "Appui" :
    court.stage === "escort" || court.stage === "choice" ? "Harek" : "Filet";
  ctx.fillText(marker, court.targetX, floor + 37);
  ctx.restore();
}


function drawCohortRaceYounglingO6(ctx: CanvasRenderingContext2D, bank: NurseryArtBank,
  actor: { id: "player" | "rival"; x: number; y: number; facing: -1 | 1; pose: NurseryArtPose; ticks: number; tint?: string }) {
  const atlas = bank.manifest.actors[actor.id][actor.facing === 1 ? "right" : "left"];
  const frame = nurseryClipFrame(atlas.clips[actor.pose], actor.ticks);
  const image = bank.images.get(atlas.src)!;
  const contact = getSpriteContact(image, frame.rect, frame.pivot[1]);
  const scale = NURSERY_ARENA.actorHeight / atlas.bodyHeight;
  drawActorContactShadow(ctx, actor.x, actor.y, 12, 0);
  ctx.save();
  if (actor.tint) ctx.filter = actor.tint;
  ctx.drawImage(image, ...frame.rect, actor.x - frame.pivot[0] * scale,
    actor.y - (frame.pivot[1] - (contact?.offsetY ?? 0)) * scale, frame.rect[2] * scale, frame.rect[3] * scale);
  ctx.restore();
}

function drawCohortBagO6(ctx: CanvasRenderingContext2D, bag: { left: number; right: number; y: number }, active: boolean) {
  const { left, right, y } = bag;
  const width = right - left;
  ctx.save();
  ctx.strokeStyle = active ? "#b99973" : "#77513a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(left + 11, 156); ctx.lineTo(left + 11, y + 8);
  ctx.moveTo(right - 11, 156); ctx.lineTo(right - 11, y + 8);
  ctx.stroke();

  const hide = ctx.createLinearGradient(0, y, 0, y + 29);
  hide.addColorStop(0, active ? "#b8875d" : "#77523c");
  hide.addColorStop(1, "#482918");
  ctx.fillStyle = hide;
  ctx.strokeStyle = "#2a170e";
  ctx.beginPath();
  ctx.moveTo(left, y); ctx.lineTo(right, y);
  ctx.quadraticCurveTo(right + 3, y + 20, right - 13, y + 30);
  ctx.quadraticCurveTo(left + width / 2, y + 37, left + 13, y + 30);
  ctx.quadraticCurveTo(left - 3, y + 20, left, y);
  ctx.fill(); ctx.stroke();
  ctx.strokeStyle = "#dec5a37f";
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  ctx.moveTo(left + 12, y + 10); ctx.quadraticCurveTo(left + width / 2, y + 16, right - 12, y + 10);
  ctx.stroke();
  ctx.restore();
}

/** Native nursery art with two physical levels, leather bags and a secured final rope. */
export function drawCohortRaceO6(ctx: CanvasRenderingContext2D, checkpoint: NurseryState, bank: NurseryArtBank,
  record: CohortRaceRecordO6, player: { x: number; y: number; facing: -1 | 1; ticks: number; air: boolean }, reducedMotion: boolean) {
  const floor = NURSERY_ARENA.groundY;
  const arena = getNurseryPresentation(checkpoint);
  drawNurseryScene(ctx, { ...arena, opening: undefined, cohort: undefined, actors: [],
    groundBlade: { visible: false, x: 0, y: floor }, camera: { shot: "arena", progress: 0, blur: 0 },
  }, bank, reducedMotion);

  const { stage, platform, signalled, signalPartner, helpPartner } = cohortRaceViewO6(record);
  const { lower, upper, finish } = COHORT_COURSE_O6;
  const group = stage === "choice" || stage === "rally";
  const tether = stage === "finish" || stage === "done" || signalled;
  ctx.save();
  ctx.strokeStyle = "#523321";
  ctx.lineWidth = 10;
  ctx.beginPath(); ctx.moveTo(245, 156); ctx.lineTo(829, 156); ctx.stroke();
  ctx.fillStyle = "#ab83564d";
  ctx.fillRect(97, floor + 2, 126, 8);
  drawCohortBagO6(ctx, lower, true); drawCohortBagO6(ctx, upper, true);
  drawCohortBagO6(ctx, tether ? finish : { ...finish, y: finish.y + 25 }, tether);
  if (!record.opening.success) {
    ctx.strokeStyle = "#f2bd75";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(199, floor - 5); ctx.quadraticCurveTo(235, floor - 9, lower.left + 16, lower.y);
    ctx.stroke();
  }
  const sides = {
    yena: group ? { x: 180, y: floor } : stage === "finish" && helpPartner === "yena"
      ? { x: 779, y: finish.y } : (stage === "upper" && signalPartner === "yena" ? { x: 518, y: upper.y } : { x: 348, y: lower.y }),
    tov: group ? { x: 217, y: floor } : { x: signalPartner === "tov" ? 518 : 452, y: upper.y },
    harek: group ? { x: 137, y: floor } : stage === "finish" && helpPartner === "harek"
      ? { x: 779, y: finish.y } : { x: record.opening.success && record.choice === "observe" ? 211 : 137, y: floor },
  };
  const roster = [
    { key: "yena", label: "Yena", id: "rival", tint: "sepia(.38) hue-rotate(13deg)" },
    { key: "tov", label: "Tov", id: "player", tint: "saturate(.48) brightness(.84)" },
    { key: "harek", label: "Harek", id: "rival", tint: "" },
  ] as const;
  ctx.font = "600 13px system-ui, sans-serif";
  ctx.textAlign = "center";
  for (const actor of roster) {
    const at = sides[actor.key];
    const givesSignal = stage === "upper" && actor.key === signalPartner;
    drawCohortRaceYounglingO6(ctx, bank, { ...at, id: actor.id, facing: at.x < player.x ? 1 : -1,
      pose: givesSignal && signalled ? "ready" : "idle", ticks: 0, tint: actor.tint });
    ctx.fillStyle = givesSignal && signalled ? "#fff6b0" : "#f3cda4";
    ctx.fillText(givesSignal && signalled ? actor.label + " · Signal" : actor.label, at.x, at.y - 97);
  }
  drawCohortRaceYounglingO6(ctx, bank, { ...player, id: "player",
    pose: player.air ? "ready" : !reducedMotion && player.ticks ? "walk" : "idle",
    ticks: reducedMotion ? 0 : player.ticks });
  for (const [x, y, label] of [[155, floor + 35, "Protection"], [315, lower.y + 46, "Puissance"],
      [467, upper.y + 46, "Technique"], [732, finish.y + 51, "Exploration"]] as const) {
    ctx.fillStyle = "#f5d59b";
    ctx.fillText(label, x, y);
  }
  const markerY = COHORT_COURSE_O6[platform].y;
  const markers = stage === "choice" ? [COHORT_CHOICE_POSTS_O6.observe, COHORT_CHOICE_POSTS_O6.lead]
    : [stage === "rally" ? COHORT_RALLY_X_O6 : COHORT_COURSE_O6[platform].launch];
  ctx.fillStyle = "#ffe6a1";
  for (const x of markers) {
    ctx.beginPath(); ctx.ellipse(x, markerY + 1, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
  }
  if (stage === "choice") {
    ctx.fillText("Arrière", COHORT_CHOICE_POSTS_O6.observe, markerY + 18);
    ctx.fillText("Tête", COHORT_CHOICE_POSTS_O6.lead, markerY + 18);
  }
  ctx.restore();
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
    if (presentation.opening) {
      ctx.filter = "none";
      drawNurseryOpening(ctx, presentation.opening, bank, reducedMotion);
      ctx.restore();
      return;
    }
    if (presentation.cohort) {
      ctx.filter = "none";
      drawNurseryCohort(ctx, presentation, bank, reducedMotion);
      ctx.restore();
      return;
    }
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
    // Crossfade only after a real knockout; intro cards show a clean village.
    if (!reducedMotion && presentation.phase === "village-reveal" && progress < 0.15) {
      ctx.globalAlpha = 1 - progress / 0.15; backdrop(ctx, scene("arena")); ctx.globalAlpha = 1;
    }
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
