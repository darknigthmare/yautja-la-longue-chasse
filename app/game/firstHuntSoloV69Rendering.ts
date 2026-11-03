import { youthClipFrame, type YouthArtBank, type YouthPropSprite, type YouthArtPose } from './youthTrainingRendering';
import { drawActorContactShadow, getSpriteContact } from './spriteContact';
import { SOLO_V69_ROCKS, SOLO_V69_GATES, SOLO_V69_POSTS, soloV69Support, soloV69Objective, soloV69CameraX, soloV69Hazard, type SoloV69State } from './systems/firstHuntSoloV69';

/** Native existing camp/dojo, separate prop crops and independently authored facings. No creature reskin or Temple claim. */
export function drawFirstHuntSoloV69(ctx: CanvasRenderingContext2D, s: SoloV69State, bank: YouthArtBank | null, reducedMotion: boolean) {
  const width = ctx.canvas.width; ctx.save(); ctx.clearRect(0, 0, width, 540); ctx.fillStyle = '#17110c'; ctx.fillRect(0, 0, width, 540);
  if (!bank) { ctx.restore(); return; }
  const { images, manifest } = bank, camera = soloV69CameraX(s, width), indoor = s.player.x > 2280 && s.player.x < 4210;
  const scene = manifest.scenes[indoor ? 'dojo' : 'camp'], backdrop = images.get(scene.src)!, groundY = indoor ? scene.groundY ?? 733 : 780;
  const scale = 430 / groundY, panoramaWidth = backdrop.width * scale, offset = Math.min(camera * .08, Math.max(0, panoramaWidth - width));
  ctx.drawImage(backdrop, -offset, 0, panoramaWidth, backdrop.height * scale);
  // Preserve the actual scene's contact plane and sample its native front floor
  // for the continuous route; no CSS actor or painted replacement architecture.
  ctx.drawImage(backdrop, 0, groundY, backdrop.width, Math.max(1, backdrop.height - groundY), 0, 430, width, 110);
  if (s.phase === 'observation' && Math.abs(s.player.x - 820) < 40) { ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ecd6a3'; ctx.fillText('VUE DU POSTE D’OBSERVATION', width / 2, 30); }
  ctx.translate(-camera, 0);
  const prop = (sprite: YouthPropSprite, x: number, y: number, height: number) => { const k = height / sprite.rect[3]; ctx.drawImage(images.get(sprite.src)!, ...sprite.rect, x - sprite.pivot[0] * k, y - sprite.pivot[1] * k, sprite.rect[2] * k, height); };
  const label = (text: string, x: number, y: number, color = '#f4d49a', size = 14) => { ctx.font = `bold ${size}px sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = color; ctx.fillText(text, x, y); };
  const marker = (x: number, text?: string) => { prop(manifest.props.marker, x, 430, 32); if (text) label(text, x, 300); };
  for (const r of SOLO_V69_ROCKS) { const sprite = manifest.desertProps!.stone; ctx.drawImage(images.get(sprite.src)!, ...sprite.rect, r.x, r.y, r.width, r.height); }
  marker(820, s.phase === 'observation' ? 'OBSERVER LE VÉTÉRAN' : undefined); marker(1070, s.phase === 'signals' ? 'LIRE LE SIGNAL' : undefined);
  SOLO_V69_POSTS.forEach((x, i) => marker(x, s.phase === 'stealth' ? `POSTE ${i + 1}${s.shadowPosts > i ? ' · REÇU' : ''}` : undefined));
  for (let i = 0; i < 3; i++) {
    const g = SOLO_V69_GATES[i], open = s.gatesCrossed > i || s.gateTimers[i] > 0;
    marker(g.leverX, s.phase.startsWith('gate-') && s.gatesCrossed === i ? 'COMMANDE' : undefined); marker(g.x + 45); marker(g.exitX);
    // A practice obstacle made of the already-authored modular platform slabs.
    // Its signalling overlay is gameplay HUD; this is not an AVP pyramid door.
    if (!open) for (let y = 430; y >= 170; y -= 17) prop(manifest.props.platform, g.x, y, 17);
    else { prop(manifest.props.platform, g.x, 135, 17); label('OUVERT', g.x, 185, '#b8e3c1'); }
    ctx.strokeStyle = open ? '#91cba5' : '#d39873'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(g.x - 26, 433); ctx.lineTo(g.x + 26, 433); ctx.stroke();
    if (s.phase.startsWith('gate-') && s.gatesCrossed === i) label(g.label, g.x, 105);
  }
  prop(manifest.props.cot, 4300, 430, 28); marker(4560, s.phase === 'escort' && !s.waitingSignal ? 'ATTENTE À COUVERT' : undefined); marker(5050, s.phase === 'escort' && !s.scouted ? 'POSTE DE RECONNAISSANCE' : undefined); prop(manifest.props.cot, 5460, 430, 28); marker(5460);
  if (s.phase === 'escort') {
    const phase = soloV69Hazard(s.tick), color = phase === 'active' ? '#f49777' : phase === 'warning' ? '#e8cf79' : '#a4d9b2';
    marker(4650); marker(4870); ctx.fillStyle = phase === 'active' ? '#d959303d' : phase === 'warning' ? '#dba54130' : '#72ab722a'; ctx.fillRect(4650, 414, 220, 16);
    ctx.strokeStyle = color; ctx.setLineDash([7, 5]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(4650, 430); ctx.lineTo(4870, 430); ctx.stroke(); ctx.setLineDash([]);
    label(phase === 'active' ? 'PASSAGE FERMÉ' : phase === 'warning' ? 'FERMETURE ANNONCÉE' : 'ACCALMIE', 4760, 302, color);
  }
  const actor = (kind: 'player' | 'rival', x: number, y: number, facing: -1 | 1, height: number, pose: YouthArtPose, caption?: string) => {
    const atlas = manifest.actors[kind][facing === 1 ? 'right' : 'left'], frame = youthClipFrame(atlas.clips[pose], reducedMotion && pose === 'idle' ? 0 : s.tick);
    const image = images.get(atlas.src)!, k = height / atlas.bodyHeight, contact = getSpriteContact(image, frame.rect, frame.pivot[1]), floor = soloV69Support({ x, y });
    drawActorContactShadow(ctx, x, floor, kind === 'rival' && height > 120 ? 19 : 15, floor - y);
    ctx.drawImage(image, ...frame.rect, x - frame.pivot[0] * k, y - (frame.pivot[1] - (contact?.offsetY ?? 0)) * k, frame.rect[2] * k, frame.rect[3] * k);
    if (caption) label(caption, x, y - height - 12, '#e7cf9e', 12);
  };
  actor('rival', 160, 430, 1, 150, 'idle', 'VÉTÉRAN');
  if (['observation', 'signals', 'stealth'].includes(s.phase)) {
    const b = s.veteran; ctx.fillStyle = s.alarm ? '#e77e542e' : '#e8d29420'; ctx.beginPath(); ctx.moveTo(b.x, 336); ctx.lineTo(b.x + b.facing * 315, 430); ctx.lineTo(b.x + b.facing * 315, 294); ctx.closePath(); ctx.fill();
    actor('rival', b.x, 430, b.facing, 144, 'walk', 'REGARD / PATROUILLE');
  }
  if (['evacuation', 'escort', 'return', 'debrief', 'recognition', 'complete'].includes(s.phase)) actor('rival', s.trainee.x, 430, s.trainee.following && s.player.x < s.trainee.x ? -1 : 1, 106, s.trainee.following && Math.abs(s.player.x - 90 - s.trainee.x) > 5 ? 'walk' : 'idle', s.trainee.reached ? 'NOVICE · AU REFUGE' : s.trainee.following ? 'NOVICE · SUIT' : 'NOVICE · ATTEND');
  const a = s.player; actor('player', a.x, a.y, a.facing, 112, a.vy ? 'jump' : Math.abs(a.vx) > .01 ? 'walk' : 'idle');
  if (a.crouched) label('À COUVERT', a.x, a.y - 130, '#c6dfce', 12);
  const target = soloV69Objective(s).targetX;
  if (target !== null) { ctx.strokeStyle = '#eed198'; ctx.lineWidth = 3; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(target - 30, 434); ctx.lineTo(target + 30, 434); ctx.stroke(); ctx.setLineDash([]); if (s.scan) { ctx.fillStyle = '#ead090'; ctx.fillRect(target - 28, 447, 56 * s.scan / (s.phase === 'recognition' ? 90 : s.phase === 'escort' ? 30 : 45), 5); } }
  ctx.restore();
}
