import { YOUTH_ART_MANIFEST } from './youthArtManifest';
import { TEMPLE_MODULAR_ATLAS_V70, drawTempleModuleV70 } from './templeModularArtV70';
import { loadYouthArt, youthClipFrame, type YouthArtBank, type YouthArtPose, type YouthPropSprite } from './youthTrainingRendering';
import { getSpriteContact, drawActorContactShadow } from './spriteContact';
import { SOLO_V90_POSTS, SOLO_V90_WORLD_WIDTH, soloV90Objective, soloV90ObservationPostReady, type SoloV90State } from './systems/firstHuntSoloV90';
export const TRAINING_DRONE_V90 = '/game/sprites/v7/enemies/flora-other/xeno-drone-sheet.png';
export async function loadTrainingArtV90(): Promise<YouthArtBank> {
  const bank = await loadYouthArt(YOUTH_ART_MANIFEST), images = new Map(bank.images);
  await Promise.all([TEMPLE_MODULAR_ATLAS_V70.src, TRAINING_DRONE_V90].map(src => new Promise<void>((resolve, reject) => {
    const image = new Image(); image.onload = () => { images.set(src, image); resolve(); };
    image.onerror = () => reject(new Error('Image native de l’entraînement indisponible : ' + src)); image.src = src;
  })));
  return { ...bank, images };
}
/** Portrait keeps native scale and shows the distant demonstration directly.
 * This changes framing only: no actor, physics, receipt or progress is moved. */
export function soloV90CameraFrame(s: SoloV90State, width: number) {
  const remote = soloV90ObservationPostReady(s);
  return { remote, x: Math.max(0, Math.min(SOLO_V90_WORLD_WIDTH - width, remote ? s.drone.x - width / 2 : s.player.x - width * .45)) };
}
/** Sources remain untouched. Player/partners use the independently authored
 * left/right cells; the drone keeps its native left-facing guard, never flips. */
export function drawFirstHuntSoloV90(ctx: CanvasRenderingContext2D, s: SoloV90State, bank: YouthArtBank | null, reducedMotion: boolean) {
  const width = ctx.canvas.width;
  ctx.save(); ctx.clearRect(0, 0, width, 540); ctx.fillStyle = '#101416'; ctx.fillRect(0, 0, width, 540);
  if (!bank) { ctx.restore(); return; }
  const { images, manifest } = bank, frame = soloV90CameraFrame(s, width), camera = frame.x;
  const backdrop = images.get(manifest.scenes.dojo.src)!, ground = 733, scale = 430 / ground;
  ctx.drawImage(backdrop, -Math.min(camera * .065, Math.max(0, backdrop.width * scale - width)), 0, backdrop.width * scale, backdrop.height * scale);
  ctx.drawImage(backdrop, 0, ground, backdrop.width, backdrop.height - ground, 0, 430, width, 110);
  ctx.fillStyle = '#0710198c'; ctx.fillRect(0, 0, width, 430);
  const native = images.get(TEMPLE_MODULAR_ATLAS_V70.src)!;
  ctx.save(); ctx.translate(-camera * .35, 0);
  for (let x = 30; x < 2100; x += 370) drawTempleModuleV70(ctx, native, 'pillar', x, 430, 420);
  ctx.restore(); ctx.translate(-camera, 0);
  const prop = (p: YouthPropSprite, x: number, y: number, h: number) => { const k = h / p.rect[3]; ctx.drawImage(images.get(p.src)!, ...p.rect, x - p.pivot[0] * k, y - p.pivot[1] * k, p.rect[2] * k, h); };
  const text = (label: string, x: number, y: number, color = '#eed4a7', size = 12) => { ctx.fillStyle = color; ctx.font = `bold ${size}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText(label, x, y); };
  for (const x of [35, 1150, 1470, 1830, 2120, 3400]) drawTempleModuleV70(ctx, native, 'pillar', x, 430, 350);
  for (const x of [400, 1500, 1950]) { ctx.save(); ctx.globalAlpha = .7; drawTempleModuleV70(ctx, native, 'arch', x, 430, 310); ctx.restore(); }
  prop(manifest.props.brazier, 270, 430, 60); prop(manifest.props.brazier, 1050, 430, 60);
  prop(manifest.props.bladeRack, 780, 430, 110); text('RÂTELIER DE PRÊT · OUTILS MÉCANIQUES', 780, 280, '#c5b18c', 11);
  text('GALERIE DE PRÉPARATION', 1690, 185, '#b7c6c3', 15);
  [2220, ...SOLO_V90_POSTS, 2590].forEach(x => { prop(manifest.props.marker, x, 430, 28); ctx.strokeStyle = '#cead69'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 25, 432); ctx.lineTo(x + 25, 432); ctx.stroke(); });
  text('REPLI', 2220, 320, '#c5b18c', 11); text('SAAR · APPROCHE', 2360, 276, '#c5b18c', 11); text('FRAPPE', 2590, 276, '#c5b18c', 11); text('VEK · OUVERTURE', 2800, 276, '#c5b18c', 11);
  text('COMBAT DE SEUIL · ENTRAÎNEMENT AVANT LE RITE', 2890, 80, '#f0d9a9', 14);
  if (s.acid.ttl > 0) { ctx.fillStyle = '#cce06d55'; ctx.beginPath(); ctx.ellipse(s.acid.x, 428, 42, 8, 0, 0, Math.PI * 2); ctx.fill(); text('ACIDE', s.acid.x, 405, '#dbea95', 10); }
  const d = s.drone, image = images.get(TRAINING_DRONE_V90)!, cell = image.width / 6;
  const index = d.mode === 'dead' ? 5 : d.mode === 'recover' ? 4 : d.mode === 'lunge' ? 2 + Math.floor(d.age / 6) % 2 : d.mode === 'telegraph' ? 1 : 0;
  const rect = [cell * index, 0, cell, image.height] as const, k = 130 / (image.height - 8), pivot = image.height - 3, contact = getSpriteContact(image, rect, pivot);
  drawActorContactShadow(ctx, d.x, 430, 25, 0); ctx.drawImage(image, ...rect, d.x - cell * k / 2, 430 - (pivot - (contact?.offsetY ?? 0)) * k, cell * k, image.height * k);
  text(d.mode === 'telegraph' ? 'CHARGE ANNONCÉE' : d.mode === 'dead' ? 'DRONE NEUTRALISÉ' : `DRONE ${d.hp}/8`, d.x, 250, d.mode === 'telegraph' ? '#ffa37a' : '#cfd6c5');
  const actor = (kind: 'player' | 'rival', x: number, y: number, facing: -1 | 1, h: number, pose: YouthArtPose, label?: string) => {
    const atlas = manifest.actors[kind][facing === 1 ? 'right' : 'left'], frame = youthClipFrame(atlas.clips[pose], reducedMotion && pose === 'idle' ? 0 : s.tick);
    const source = images.get(atlas.src)!, scale = h / atlas.bodyHeight, contact = getSpriteContact(source, frame.rect, frame.pivot[1]);
    drawActorContactShadow(ctx, x, 430, 15, 430 - y); ctx.drawImage(source, ...frame.rect, x - frame.pivot[0] * scale, y - (frame.pivot[1] - (contact?.offsetY ?? 0)) * scale, frame.rect[2] * scale, frame.rect[3] * scale);
    if (label) text(label, x, y - h - 12, '#d0c9b1', 11);
  };
  actor('rival', 160, 430, 1, 145, 'idle', 'VÉTÉRAN');
  s.companions.forEach((c, i) => { const target = s.health === 0 && i === 0 ? s.player.x + 18 : s.roleMode === 'posts' ? SOLO_V90_POSTS[i] : Math.max(65, s.player.x - 65 * (i + 1)); actor('rival', c.x, 430, target < c.x ? -1 : 1, 110, Math.abs(c.x - target) > 3 ? 'walk' : 'idle', i === 0 ? 'SAAR' : 'VEK'); });
  const a = s.player, carried = s.health === 0 && Math.abs(s.companions[0].x - a.x) <= 38;
  actor('player', a.x, carried ? 370 : a.y, a.facing, 112, s.health === 0 ? 'ko' : s.hurtTimer > 65 ? 'hurt' : s.attackTimer ? 'blade' : a.vy ? 'jump' : a.vx ? 'walk' : 'idle', carried ? 'EXTRACTION AIDÉE' : undefined);
  const goal = soloV90Objective(s); ctx.strokeStyle = '#e4cf96'; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(goal.targetX - 25, 442); ctx.lineTo(goal.targetX + 25, 442); ctx.stroke(); ctx.setLineDash([]);
  if (s.scan) { ctx.fillStyle = '#e4cf96'; ctx.fillRect(goal.targetX - 25, 450, 50 * s.scan / 60, 4); }
  if (frame.remote) {
    ctx.save(); ctx.translate(camera, 0); ctx.fillStyle = '#101820ed'; ctx.fillRect(0, 0, width, 49);
    ctx.textAlign = 'center'; ctx.fillStyle = '#ebd7ac'; ctx.font = 'bold 13px sans-serif'; ctx.fillText('OBSERVATION À DISTANCE', width / 2, 19);
    ctx.font = '11px sans-serif'; ctx.fillText('Joueur au repère · marche pour retrouver sa vue', width / 2, 37, width - 20); ctx.restore();
  }
  ctx.restore();
}
