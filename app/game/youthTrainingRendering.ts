import { YOUTH_ARENA, getYouthObstacles, getYouthObjective, YOUTH_DESERT_CLUES, type YouthState } from "./systems/youthTraining";

export const YOUTH_ART_POSES = ["idle", "walk", "jump", "jab", "blade", "throw", "dodge", "hurt", "thrown", "ko"] as const;
export type YouthArtPose = typeof YOUTH_ART_POSES[number];
export interface YouthArtFrame { rect: readonly [number, number, number, number]; pivot: readonly [number, number]; handAnchor: readonly [number, number]; durationTicks: number }
export interface YouthArtClip { loop: boolean; frames: readonly YouthArtFrame[] }
export interface YouthActorAtlas { src: string; bodyHeight: number; clips: Record<YouthArtPose, YouthArtClip> }
export interface YouthPropSprite { src: string; rect: readonly [number, number, number, number]; pivot: readonly [number, number] }
export type YouthPropId = "trainingTarget" | "platform" | "marker" | "bladeRack" | "maskPedestal" | "cot" | "door" | "brazier";
export interface YouthArtManifest {
  version: 1; actorKind: "unblooded";
  scenes: Record<"dojo" | "camp" | "quarters", { src: string; groundY?: number }> & { desert?: { src: string; groundY?: number } };
  desertProps?: Record<"footprints" | "branch" | "stone", YouthPropSprite>;
  blade: { src: string }; props: Record<YouthPropId, YouthPropSprite>;
  actors: Record<"player" | "rival", Record<"left" | "right", YouthActorAtlas>>;
}
export interface YouthArtBank { manifest: YouthArtManifest; images: ReadonlyMap<string, HTMLImageElement> }
export function youthArtSources(manifest: YouthArtManifest) {
  return [...new Set([...Object.values(manifest.scenes).map(scene => scene.src), manifest.blade.src, ...Object.values(manifest.props).map(prop => prop.src), ...Object.values(manifest.desertProps ?? {}).map(prop => prop.src),
    ...Object.values(manifest.actors).flatMap(actor => [actor.left.src, actor.right.src])])];
}
export function validateYouthArt(manifest: YouthArtManifest, images: ReadonlyMap<string, { width: number; height: number }>): string[] {
  const errors: string[] = [];
  if (manifest.version !== 1 || manifest.actorKind !== "unblooded") errors.push("Le manifeste doit décrire un Unblooded.");
  for (const src of youthArtSources(manifest)) {
    const image = images.get(src);
    if (!src.startsWith("/game/") || !/\.(png|webp)$/i.test(src)) errors.push(`Source jeunesse invalide : ${src}`);
    if (!image || !Number.isFinite(image.width) || !Number.isFinite(image.height) || image.width <= 0 || image.height <= 0) errors.push(`Image non décodée : ${src}`);
  }
  for (const [name, scene] of Object.entries(manifest.scenes)) {
    const image = images.get(scene.src);
    if (scene.groundY !== undefined && (!Number.isFinite(scene.groundY) || scene.groundY <= 0 || image && scene.groundY > image.height)) errors.push(`Sol du décor ${name} hors image.`);
  }
  for (const [name, prop] of Object.entries({ ...manifest.props, ...manifest.desertProps })) {
    const image = images.get(prop.src); const [x, y, w, h] = prop.rect;
    if (!prop.rect.every(value => Number.isFinite(value) && value >= 0) || w <= 0 || h <= 0 || image && (x + w > image.width || y + h > image.height) || !prop.pivot.every(value => Number.isFinite(value) && value >= 0) || prop.pivot[0] > w || prop.pivot[1] > h) errors.push(`Accessoire ${name} hors atlas.`);
  }
  for (const actor of Object.values(manifest.actors)) {
  if (actor.left.src === actor.right.src) errors.push("Deux orientations natives sont requises.");
  for (const direction of ["left", "right"] as const) {
    const atlas = actor[direction]; const image = images.get(atlas.src);
    if (!Number.isFinite(atlas.bodyHeight) || atlas.bodyHeight <= 0) errors.push("Échelle Unblooded invalide.");
    for (const pose of YOUTH_ART_POSES) {
      const clip = atlas.clips[pose];
      if (!clip || clip.frames.length < 2) { errors.push(`${direction}/${pose} : dessins manquants.`); continue; }
      if (clip.loop && !["idle", "walk"].includes(pose)) errors.push(`${direction}/${pose} : action non bouclable.`);
      const drawings = new Set<string>();
      for (const frame of clip.frames) {
        const [x, y, w, h] = frame.rect; drawings.add(frame.rect.join(","));
        if (!frame.rect.every(value => Number.isFinite(value) && value >= 0) || w <= 0 || h <= 0 || image && (x + w > image.width || y + h > image.height)) errors.push(`${direction}/${pose} : cellule hors image.`);
        if (!Number.isInteger(frame.durationTicks) || frame.durationTicks <= 0 || frame.durationTicks > 120) errors.push(`${direction}/${pose} : durée invalide.`);
        if (![...frame.pivot, ...frame.handAnchor].every(value => Number.isFinite(value) && value >= 0) || frame.pivot[0] > w || frame.pivot[1] > h || frame.handAnchor[0] > w || frame.handAnchor[1] > h) errors.push(`${direction}/${pose} : ancrage hors cellule.`);
      }
      if (drawings.size < 2) errors.push(`${direction}/${pose} : deux dessins distincts sont nécessaires.`);
    }
  }
  }
  return errors;
}
export function youthClipFrame(clip: YouthArtClip, tick: number): YouthArtFrame {
  const duration = clip.frames.reduce((sum, frame) => sum + frame.durationTicks, 0);
  let cursor = Math.max(0, Math.floor(tick)); cursor = clip.loop ? cursor % duration : Math.min(cursor, duration - 1);
  for (const frame of clip.frames) { if (cursor < frame.durationTicks) return frame; cursor -= frame.durationTicks; }
  return clip.frames[clip.frames.length - 1];
}
export async function loadYouthArt(manifest: YouthArtManifest): Promise<YouthArtBank> {
  const images = new Map<string, HTMLImageElement>();
  await Promise.all(youthArtSources(manifest).map(src => new Promise<void>((resolve, reject) => {
    const image = new Image(); let settled = false;
    const finish = (error?: Error) => { if (settled) return; settled = true; clearTimeout(timer); image.onload = null; image.onerror = null; if (error) reject(error); else { images.set(src, image); resolve(); } };
    const timer = setTimeout(() => finish(new Error(`Délai de chargement dépassé : ${src}`)), 20000);
    image.onload = () => { image.decode().then(() => finish()).catch(() => finish(new Error(`Image illisible : ${src}`))); };
    image.onerror = () => finish(new Error(`Image indisponible : ${src}`)); image.src = src;
  })));
  const errors = validateYouthArt(manifest, images); if (errors.length) throw new Error(errors.join(" "));
  return { manifest, images };
}
export function youthActorPose(state: YouthState): YouthArtPose {
  if (state.player.action !== "idle") return state.player.action;
  if (state.player.y < YOUTH_ARENA.groundY - 1) return "jump";
  return Math.abs(state.player.vx) > 0.1 ? "walk" : "idle";
}
export function drawYouthScene(ctx: CanvasRenderingContext2D, state: YouthState, bank: YouthArtBank | null, reducedMotion: boolean) {
  const { width, height, groundY, actorHeight } = YOUTH_ARENA;
  ctx.save(); ctx.clearRect(0, 0, width, height); ctx.fillStyle = "#090705"; ctx.fillRect(0, 0, width, height);
  if (!bank) { ctx.restore(); return; }
  const { manifest, images } = bank;
  const desert = state.phase.startsWith("desert-");
  const room = desert ? "desert" : state.phase.startsWith("camp") ? "camp" : ["armory", "barracks", "rest", "morning"].includes(state.phase) ? "quarters" : "dojo";
  const scene = manifest.scenes[room]; if (!scene) { ctx.restore(); return; }
  const backdrop = images.get(scene.src)!;
  const scale = Math.max(width / backdrop.width, height / backdrop.height, groundY / (scene.groundY ?? backdrop.height));
  const top = scene.groundY === undefined ? (height - backdrop.height * scale) / 2 : 0;
  ctx.drawImage(backdrop, (width - backdrop.width * scale) / 2, top, backdrop.width * scale, backdrop.height * scale);
  const prop = (id: YouthPropId, x: number, y: number, h: number, explicitWidth?: number) => {
    const sprite = manifest.props[id]; const image = images.get(sprite.src)!; const ratio = h / sprite.rect[3];
    const w = explicitWidth ?? sprite.rect[2] * ratio; const sx = w / sprite.rect[2];
    ctx.drawImage(image, ...sprite.rect, x - sprite.pivot[0] * sx, y - sprite.pivot[1] * ratio, w, h);
  };
  // Modular bitmap props share the exact collision size; yellow landing edges are readable even over detailed art.
  for (const obstacle of getYouthObstacles(state)) {
    const sprite = desert ? manifest.desertProps?.stone : manifest.props.platform;
    if (sprite) {
      const image = images.get(sprite.src)!;
      ctx.drawImage(image, ...sprite.rect, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    }
    ctx.strokeStyle = "#ffdc98"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(obstacle.x, obstacle.y); ctx.lineTo(obstacle.x + obstacle.width, obstacle.y); ctx.stroke();
  }
  if (state.phase === "blade-award") prop("bladeRack", 680, groundY, 108);
  if (state.phase === "armory") prop("maskPedestal", 680, groundY, 100);
  if (["barracks", "rest", "morning"].includes(state.phase)) prop("cot", 680, groundY, 70);
  if (!desert) { prop("brazier", 905, groundY, 96); prop("door", 105, groundY, 166); }
  else {
    prop("marker", 110, groundY, 32);
    if (state.phase === "desert-tracks" && manifest.desertProps) {
      for (let i = 0; i < YOUTH_DESERT_CLUES.length; i++) {
        const sprite = manifest.desertProps[(["footprints", "branch", "stone"] as const)[i]], h = i === 0 ? 24 : i === 1 ? 45 : 52, ratio = h / sprite.rect[3];
        ctx.drawImage(images.get(sprite.src)!, ...sprite.rect, YOUTH_DESERT_CLUES[i].x - sprite.pivot[0] * ratio, groundY - sprite.pivot[1] * ratio, sprite.rect[2] * ratio, h);
        if (i < (state.desert?.clues ?? 0)) { ctx.strokeStyle = "#91d59c"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(YOUTH_DESERT_CLUES[i].x - 6, groundY - h - 8); ctx.lineTo(YOUTH_DESERT_CLUES[i].x - 1, groundY - h - 3); ctx.lineTo(YOUTH_DESERT_CLUES[i].x + 8, groundY - h - 13); ctx.stroke(); }
      }
    }
  }
  const objective = getYouthObjective(state);
  if (objective.targetX !== null && state.phase !== "rest" && state.phase !== "morning") {
    if (["dojo-move", "dojo-jump", "camp-run"].includes(state.phase)) prop("marker", objective.targetX, groundY, 32);
    ctx.strokeStyle = "#ffd086"; ctx.lineWidth = 3; ctx.setLineDash([7, 5]); ctx.beginPath(); ctx.moveTo(objective.targetX - 26, groundY); ctx.lineTo(objective.targetX + 26, groundY); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#ffe5af"; ctx.beginPath(); ctx.moveTo(objective.targetX - 7, groundY + 17); ctx.lineTo(objective.targetX + 7, groundY + 17); ctx.lineTo(objective.targetX, groundY + 8); ctx.fill();
  }
  const drawActor = (id: "player" | "rival", height: number) => {
    const actor = state[id]; const atlas = manifest.actors[id][actor.facing === 1 ? "right" : "left"];
    const pose: YouthArtPose = actor.action !== "idle" ? actor.action : actor.y < groundY - 1 ? "jump" : Math.abs(actor.vx) > .1 ? "walk" : "idle";
    const poseTick = pose === "jump" ? actor.vy < 0 ? 0 : atlas.clips.jump.frames[0].durationTicks : ["idle", "walk"].includes(pose) ? state.tick : actor.actionTick;
    const frame = youthClipFrame(atlas.clips[pose], poseTick); const actorScale = height / atlas.bodyHeight;
    const x = actor.x - frame.pivot[0] * actorScale, y = actor.y - frame.pivot[1] * actorScale;
    ctx.drawImage(images.get(atlas.src)!, ...frame.rect, x, y, frame.rect[2] * actorScale, frame.rect[3] * actorScale);
    if (pose === "blade") {
      const blade = images.get(manifest.blade.src)!; const h = 30, w = h * blade.width / blade.height;
      ctx.save(); ctx.translate(x + frame.handAnchor[0] * actorScale, y + frame.handAnchor[1] * actorScale); ctx.rotate(actor.facing * Math.PI / 2);
      ctx.drawImage(blade, -w / 2, -h, w, h); ctx.restore();
    }
  };
  if (["dojo-strike", "dojo-throw"].includes(state.phase)) {
    ctx.save(); ctx.translate(state.rival.x, state.rival.y);
    if (state.rival.action === "thrown") ctx.rotate(state.rival.facing * Math.PI / 3);
    if (!reducedMotion && state.rival.action === "hurt") ctx.globalAlpha = .72;
    prop("trainingTarget", 0, 0, 119); ctx.restore();
  } else if (["dojo-dodge", "camp-duel", "camp-defeat"].includes(state.phase) || desert) {
    drawActor("rival", 150);
    if (state.rival.action === "jab" && state.rival.actionTick < 32) {
      ctx.strokeStyle = "#ffe2a2"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(state.rival.x, state.rival.y - 168, 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * state.rival.actionTick / 32); ctx.stroke();
    }
  }
  drawActor("player", actorHeight);
  if (state.phase === "rest") { ctx.fillStyle = "#080506d9"; ctx.fillRect(0, 0, width, height); }
  ctx.restore();
}

export function getYouthDemonstration(phase: YouthState["phase"], tick: number) {
  const pose: YouthArtPose = phase === "dojo-move" ? "walk" : phase === "dojo-jump" ? "jump" : phase === "dojo-dodge" ? "dodge" : phase === "dojo-strike" ? "jab" : "throw";
  const t = Math.max(0, tick - 20), duration = pose === "walk" ? 45 : pose === "jump" ? 44 : pose === "dodge" ? 30 : pose === "jab" ? 50 : 42;
  const active = tick >= 20 && t < duration;
  const x = pose === "walk" ? 60 + Math.min(t, duration) * 1.65 : pose === "dodge" ? 104 - Math.min(t, duration) * 1.3 : 75;
  const y = pose === "jump" && active ? 112 - 44 * Math.sin(Math.PI * t / duration) : 112;
  return { pose: active ? pose : "idle" as YouthArtPose, poseTick: active ? pose === "jump" ? t < 22 ? 0 : 120 : t : 0, x, y, done: tick >= duration + 55 };
}
/** One complete demonstration then a resting pose. It never enters the training simulation or grants progress. */
export function drawYouthDemonstration(ctx: CanvasRenderingContext2D, phase: YouthState["phase"], bank: YouthArtBank | null, tick: number, staticOnly: boolean) {
  ctx.clearRect(0, 0, 220, 128); ctx.fillStyle = "#151109"; ctx.fillRect(0, 0, 220, 128); if (!bank) return;
  const demo = getYouthDemonstration(phase, staticOnly ? 0 : tick), atlas = bank.manifest.actors.rival.right;
  const frame = youthClipFrame(atlas.clips[demo.pose], demo.poseTick); const scale = 80 / atlas.bodyHeight;
  if (["dojo-strike", "dojo-throw"].includes(phase)) {
    const sprite = bank.manifest.props.trainingTarget, image = bank.images.get(sprite.src)!; const ratio = 63 / sprite.rect[3];
    ctx.save(); ctx.translate(153, 112);
    if (!staticOnly && phase === "dojo-throw" && tick >= 34 && tick < 84) ctx.rotate(Math.min(1, (tick - 34) / 20) * Math.PI / 2);
    ctx.drawImage(image, ...sprite.rect, -sprite.pivot[0] * ratio, -sprite.pivot[1] * ratio, sprite.rect[2] * ratio, sprite.rect[3] * ratio); ctx.restore();
  }
  ctx.drawImage(bank.images.get(atlas.src)!, ...frame.rect, demo.x - frame.pivot[0] * scale, demo.y - frame.pivot[1] * scale, frame.rect[2] * scale, frame.rect[3] * scale);
  ctx.strokeStyle = "#8b7245"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(15, 114); ctx.lineTo(205, 114); ctx.stroke();
}
