import { PIT_ARENAS, PIT_FIGHTERS, type PitCombatState } from './systems/pitCombat';
import { samplePitFinisherSceneV80, type PitFinisherViewV80 } from './systems/pitFinishersV80';
import { drawPitCombatBitmapFighter, getPitCombatGroundFootprint, getPitCombatBitmapVisualBounds, type PitCombatBitmapArtBank } from './pitCombatBitmapArt';
import { drawActorContactShadow } from './spriteContact';
import { drawPitCompanion, type PitCompanionArtBank } from './pitCompanionArt';
import { drawPitFalconerDrone, type PitFalconerDroneArtBank } from './pitFalconerDroneArt';
import { PIT_FALCONER_RECON_DRONE } from './systems/pitFalconerDrone';

/** Conservative native rectangle support, including every registered authored
 * pose. Transparent padding is retained, never cropped to manufacture an appui. */
export function pitFinisherRotationLiftV80(bounds: {x:number;y:number;width:number;height:number} | null,
  x: number, footY: number, rotation: number): number {
  if (!bounds || rotation === 0) return 0;
  return Math.max(0,...[bounds.x,bounds.x+bounds.width].flatMap(px=>[bounds.y,bounds.y+bounds.height]
    .map(py=>(px-x)*Math.sin(rotation)+(py-footY)*Math.cos(rotation))));
}

/** Reuses delivered character pixels. These transforms are choreography, not newly authored poses. */
export function drawPitFinisherActorsV80(context: CanvasRenderingContext2D, combat: PitCombatState,
  view: PitFinisherViewV80, bank: PitCombatBitmapArtBank | null, highContrast = false, engineVersion?: number,
  companionBank?: PitCompanionArtBank | null, droneBank?: PitFalconerDroneArtBank | null): boolean {
  const scene = samplePitFinisherSceneV80(view, combat);
  if (!scene) return false;
  const groundY = PIT_ARENAS[combat.arenaId].groundY;
  const frame = combat.frame + Math.floor(view.elapsedMs * .06);
  for (const fighter of scene.actors) {
    const definition = PIT_FIGHTERS[fighter.definitionId];
    const options = { combat, simulationFrame: frame, reducedMotion: scene.reducedMotion, engineVersion, highContrast };
    const contact = getPitCombatGroundFootprint(bank, fighter, options);
    const rotation = scene.rotation[fighter.slot];
    // A whole delivered plate/registered pose remains above the support plane.
    // This conservative padding is not claimed as an authored lying pose.
    const fallLift = pitFinisherRotationLiftV80(getPitCombatBitmapVisualBounds(fighter,groundY), fighter.x,groundY-fighter.y,rotation);
    drawActorContactShadow(context, contact.x, groundY, contact.halfWidth, fighter.y + fallLift);
    context.save();
    try {
      context.translate(fighter.x, groundY - fighter.y - fallLift);
      context.rotate(rotation);
      context.translate(-fighter.x, -(groundY - fighter.y));
      context.globalAlpha *= scene.alpha[fighter.slot];
      const painted = drawPitCombatBitmapFighter(context, bank, fighter, groundY, options);
      if (!painted) {
        context.font = '12px sans-serif'; context.textAlign = 'center'; context.fillStyle = '#eaf4e8';
        context.fillText('Visuel natif indisponible', fighter.x, groundY - definition.bodyHeight / 2);
      }
    } finally { context.restore(); }
  }
  if (scene.phase !== 'signature') return true;
  const winner = scene.actors[scene.winnerSlot], loser = scene.actors[scene.winnerSlot === 0 ? 1 : 0];
  const winnerHeight = PIT_FIGHTERS[winner.definitionId].bodyHeight;
  const loserHeight = PIT_FIGHTERS[loser.definitionId].bodyHeight;
  const from = { x: winner.x + winner.facing * 22, y: groundY - winnerHeight * .68 };
  const to = { x: loser.x, y: groundY - loserHeight * .55 - loser.y };
  const impactAge = Math.min(...scene.impacts.map(beat => Math.abs(scene.progress - beat)));
  if (scene.family === 'hound' || scene.family === 'drone') {
    // Disposable presentation clone. Never inserted into engine techniqueEffects,
    // replay events, hit detection, receipts or progression.
    const renderState = { ...combat, phase: 'round' as const, fighters: scene.actors };
    const p = scene.reducedMotion ? 0 : Math.sin(scene.progress * Math.PI);
    const effect = { id: -80, ownerSlot: scene.winnerSlot,
      techniqueId: scene.family === 'drone' ? PIT_FALCONER_RECON_DRONE.id : PIT_FIGHTERS.tracker.technique.id,
      x: winner.x + winner.facing * (70 + p * 90), y: winnerHeight * .72,
      direction: winner.facing, age: Math.floor(view.elapsedMs * .06),
      phase: 'returning' as const, hitCount: 0, rehitFrames: 0 };
    if (scene.family === 'hound') drawPitCompanion(context, renderState, effect, companionBank ?? null, groundY, highContrast, false, scene.reducedMotion);
    else drawPitFalconerDrone(context, renderState, effect, droneBank ?? null, groundY, highContrast, false);
  }
  // No strobe, screen flash, fabricated body, damage or device hitbox. Native
  // weapons stay in their character plate; these are clearly separate impact cues.
  context.save();
  try {
    context.strokeStyle = scene.nonlethal ? '#9bddc9' : '#e9bb75';
    context.lineWidth = 2;
    context.globalAlpha = scene.reducedMotion ? .6 : Math.max(0, 1 - impactAge / .09) * .75;
    if (scene.family === 'plasma' || scene.family === 'bolt') {
      context.beginPath(); context.moveTo(from.x, from.y); context.lineTo(to.x, to.y); context.stroke();
    } else if (scene.family === 'disc') {
      context.beginPath(); context.moveTo(from.x, from.y);
      context.quadraticCurveTo((from.x + to.x) / 2, to.y - 35, to.x, to.y); context.stroke();
    } else if (scene.family === 'capture') {
      context.setLineDash([4, 7]); context.beginPath(); context.ellipse(to.x, to.y, 30, 45, 0, 0, Math.PI * 2); context.stroke();
    } else if (scene.family !== 'ritual' && scene.family !== 'drone' && scene.family !== 'hound') {
      context.beginPath(); context.arc(to.x, to.y, scene.reducedMotion ? 13 : 7 + impactAge * 90, -.7, 2.4); context.stroke();
    }
  } finally { context.restore(); }
  return true;
}
