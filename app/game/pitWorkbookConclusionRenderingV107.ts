import {PIT_ARENAS, PIT_FIGHTERS, type PitCombatState, type PitFighterState} from './systems/pitCombat';
import {drawActorContactShadow, getSpriteContact} from './spriteContact';
import {resolvePitSpriteSheetInspectionV100, resolvePitSpriteSheetPresentation, type PitSpriteSheetInspectionFrameV100, type PitSpriteSheetAnimationBank} from './pitSpriteSheetAnimation';
import {getPitWorkbookConclusionDefinitionV107, PIT_WORKBOOK_CONCLUSION_SCENE_REGISTRY_V107, type PitWorkbookConclusionBodyKeyV107} from './pitWorkbookRegistryV107';
import {drawPitCombatBitmapFighter, getPitCombatBitmapVisualBounds, type PitCombatBitmapArtBank} from './pitCombatBitmapArt';
import {samplePitWorkbookConclusionV107, type PitWorkbookConclusionStateV107} from './systems/pitWorkbookConclusionsV107';
import {advancePitPresentationCamera, type PitPresentationCamera} from './systems/pitCamera';

/** Exact authored pose selected by the independent conclusion clock. This does
 * not change a combat action, a replay cursor, a native pixel or an appearance. */
export function resolvePitWorkbookConclusionBodyV107(bank: PitSpriteSheetAnimationBank | null,
  fighter: PitFighterState, key: PitWorkbookConclusionBodyKeyV107, clipTick: number) {
  if (fighter.definitionId !== 'scar' || fighter.variantId || !Number.isSafeInteger(clipTick) || clipTick < 0 || clipTick >= 300 ||
      (fighter.facing !== -1 && fighter.facing !== 1)) return null;
  const definition = getPitWorkbookConclusionDefinitionV107(key);
  if (!definition) return null;
  return resolvePitSpriteSheetInspectionV100(bank, {fighterId: 'scar', atlasId: definition.atlas.id,
    clipId: 'workbook.CIN_F003_' + key, facing: fighter.facing === 1 ? 'right' : 'left', elapsedTicks: clipTick});
}

export function pitWorkbookConclusionBodyReadyV107(bank: PitSpriteSheetAnimationBank | null, fighter: PitFighterState): boolean {
  return (['FATALITE_2', 'CLEMENCE'] as const).every(key => ([-1, 1] as const).every(facing =>
    !!resolvePitWorkbookConclusionBodyV107(bank, {...fighter, facing}, key, 0)));
}

export function pitWorkbookConclusionActorsReadyV107(bank: PitCombatBitmapArtBank | null): boolean {
  if (!bank || bank.cancelled) return false;
  const required = [
    {fighterId: 'feral-hunter' as const, atlasId: 'feral-hunter-pit-v34', ids: ['idle', 'walk', 'walk-backward', 'high-guard', 'pit.stand.hitstun']},
    {fighterId: 'scar' as const, atlasId: 'scar-pit-v34', ids: ['idle', 'walk', 'walk-backward']},
    {fighterId: 'feral-hunter' as const, atlasId: 'feral-workbook-defaite-v100-presentation-v105-DEFAITE', ids: ['pit.presentation.workbook-v105.defeat']},
  ];
  return required.every(entry => entry.ids.every(clipId => (['left', 'right'] as const).every(facing =>
    !!resolvePitSpriteSheetInspectionV100(bank.spriteSheets, {...entry, clipId, facing, elapsedTicks: 0}))));
}

export function getPitWorkbookConclusionBodyBoundsV107(bank: PitSpriteSheetAnimationBank | null,
  fighter: PitFighterState, key: PitWorkbookConclusionBodyKeyV107, clipTick: number, groundY: number) {
  if (![fighter.x, fighter.y, groundY].every(Number.isFinite)) return null;
  const inspected = resolvePitWorkbookConclusionBodyV107(bank, fighter, key, clipTick);
  if (!inspected) return null;
  return nativePlacement(fighter, groundY, inspected);
}

function nativePlacement(fighter: PitFighterState, groundY: number, inspected: PitSpriteSheetInspectionFrameV100) {
  const {rect, pivot} = inspected.frame.frame;
  const reference = inspected.definition.pageBodyHeightPx?.[inspected.frame.page.id] ?? inspected.definition.bodyHeightPx;
  const scale = PIT_FIGHTERS[fighter.definitionId].bodyHeight / reference;
  const contactOffsetPx = getSpriteContact(inspected.source, rect, pivot[1])?.offsetY ?? 0;
  return {x: fighter.x - pivot[0] * scale, y: groundY - fighter.y - (pivot[1] - contactOffsetPx) * scale,
    width: rect[2] * scale, height: rect[3] * scale, scale, contactOffsetPx, inspected};
}

/** A KO's health stays zero. The sidecar explicitly selects its independent
 * native reaction; it never invents positive health to fool combat animation. */
export function resolvePitWorkbookConclusionVictimV107(bank: PitSpriteSheetAnimationBank | null,
  combat: PitCombatState, state: PitWorkbookConclusionStateV107) {
  const scene = samplePitWorkbookConclusionV107(state);
  if (!scene) return null;
  const victim = scene.actors[scene.winnerSlot === 0 ? 1 : 0];
  if (victim.definitionId !== 'feral-hunter' || victim.variantId) return null;
  const thrust = scene.contacts.find(contact => contact.type === 'thrust-contact');
  if (thrust) return resolvePitSpriteSheetPresentation(bank, victim, {reducedMotion: scene.reducedMotion,
    presentation: {phase: 'match-result', round: combat.round, winnerSlot: scene.winnerSlot,
      elapsedMs: Math.max(0, scene.clipTick - thrust.tick) * 1000 / 60, durationMs: 5000, blocksSimulation: false, resultVisible: false}});
  const reaction = scene.contacts.filter(contact => contact.targetSlot === victim.slot && contact.type !== 'object-recovered').at(-1);
  const clipId = victim.guard ? 'high-guard' : victim.phase === 'hitstun' ? 'pit.stand.hitstun' :
    victim.velocityX ? victim.velocityX * victim.facing > 0 ? 'walk' : 'walk-backward' : 'idle';
  const elapsedTicks = scene.phase === 'approach' ? state.approachTick :
    victim.phase === 'hitstun' && reaction ? Math.max(0, scene.clipTick - reaction.tick) : scene.clipTick;
  return resolvePitSpriteSheetInspectionV100(bank, {fighterId: victim.definitionId,
    atlasId: 'feral-hunter-pit-v34', clipId, facing: victim.facing === 1 ? 'right' : 'left', elapsedTicks});
}

export function drawPitWorkbookConclusionBodyV107(context: CanvasRenderingContext2D,
  bank: PitSpriteSheetAnimationBank | null, fighter: PitFighterState,
  key: PitWorkbookConclusionBodyKeyV107, clipTick: number, groundY: number,
  options: {highContrast?: boolean; silhouette?: boolean} = {}): boolean {
  const bounds = getPitWorkbookConclusionBodyBoundsV107(bank, fighter, key, clipTick, groundY);
  if (!bounds) return false;
  context.save();
  try {
    context.imageSmoothingEnabled = false;
    if (options.silhouette) context.filter = 'brightness(0.15)';
    if (options.highContrast) {context.shadowColor = '#eaffed'; context.shadowBlur = 3;}
    context.drawImage(bounds.inspected.source, ...bounds.inspected.frame.frame.rect,
      bounds.x, bounds.y, bounds.width, bounds.height);
    return true;
  } finally {context.restore();}
}

/** One static envelope covers both native directions at both arena limits.
 * Source weapon tips and transparent support rectangles remain inside it.
 * Moving actors or changing poses never pumps a reduced-motion camera. */
export function getPitWorkbookConclusionCameraV107(combat: PitCombatState): PitPresentationCamera {
  const baseline = advancePitPresentationCamera(null, combat, {reducedMotion: true});
  const arena = PIT_ARENAS[combat.arenaId];
  const bounds = combat.fighters.flatMap(fighter => ([-1, 1] as const).flatMap(facing =>
    [arena.leftWall, arena.rightWall].map(x => getPitCombatBitmapVisualBounds({...fighter, x, y: 0, facing}, arena.groundY, PIT_WORKBOOK_CONCLUSION_SCENE_REGISTRY_V107)))).filter(bound => bound !== null);
  if (!bounds.length) return baseline;
  const left = Math.min(baseline.centerX - arena.width / (2 * baseline.zoom), 0, ...bounds.map(bound => bound.x)) - 12;
  const right = Math.max(baseline.centerX + arena.width / (2 * baseline.zoom), arena.width, ...bounds.map(bound => bound.x + bound.width)) + 12;
  const top = Math.min(baseline.centerY - arena.height / (2 * baseline.zoom), 0, ...bounds.map(bound => bound.y)) - 12;
  const bottom = Math.max(baseline.centerY + arena.height / (2 * baseline.zoom), arena.height, ...bounds.map(bound => bound.y + bound.height)) + 12;
  const zoom = Math.min(baseline.zoom, arena.width / (right - left), arena.height / (bottom - top));
  return {...baseline, mode: 'fixed', centerX: (left + right) / 2, centerY: (top + bottom) / 2, zoom, targetZoom: zoom};
}

export function drawPitWorkbookConclusionActorsV107(context: CanvasRenderingContext2D,
  combat: PitCombatState, state: PitWorkbookConclusionStateV107, bodyBank: PitSpriteSheetAnimationBank | null,
  fighterBank: PitCombatBitmapArtBank | null, highContrast = false): boolean {
  const scene = samplePitWorkbookConclusionV107(state);
  if (!scene) return false;
  const groundY = PIT_ARENAS[combat.arenaId].groundY;
  const victimSlot = scene.winnerSlot === 0 ? 1 : 0;
  // The victim is independently selected from the actual losing appearance.
  // No source partner is pasted, hidden or substituted over that actor.
  const victim = scene.actors[victimSlot], winner = scene.actors[scene.winnerSlot];
  const victimNative = resolvePitWorkbookConclusionVictimV107(fighterBank?.spriteSheets ?? null, combat, state);
  if (!victimNative || scene.phase !== 'approach' && !resolvePitWorkbookConclusionBodyV107(bodyBank, winner, scene.actionKey, scene.clipTick)) return false;
  drawActorContactShadow(context, victim.x, groundY, PIT_FIGHTERS[victim.definitionId].bodyWidth * .48, victim.y);
  if (victimNative) {
    const bounds = nativePlacement(victim, groundY, victimNative);
    context.save();
    try {
      context.imageSmoothingEnabled = false;
      if (scene.actionKey === 'FATALITE_2' && scene.clipTick >= 120 && scene.clipTick < 180) context.filter = 'brightness(0.15)';
      if (highContrast) {context.shadowColor = '#eaffed'; context.shadowBlur = 3;}
      context.drawImage(victimNative.source, ...victimNative.frame.frame.rect, bounds.x, bounds.y, bounds.width, bounds.height);
    } finally {context.restore();}
  }
  drawActorContactShadow(context, winner.x, groundY, PIT_FIGHTERS[winner.definitionId].bodyWidth * .48, winner.y);
  if (scene.phase === 'approach') {
    const renderFrame = combat.frame + state.approachTick;
    drawPitCombatBitmapFighter(context, fighterBank, winner, groundY, {simulationFrame: renderFrame,
      combat: {frame: renderFrame, pendingThrow: null, events: []}, reducedMotion: scene.reducedMotion, highContrast});
  } else {
    drawPitWorkbookConclusionBodyV107(context, bodyBank, winner, scene.actionKey, scene.clipTick, groundY,
      {highContrast, silhouette: scene.actionKey === 'FATALITE_2' && scene.clipTick >= 120 && scene.clipTick < 180});
  }
  return true;
}
