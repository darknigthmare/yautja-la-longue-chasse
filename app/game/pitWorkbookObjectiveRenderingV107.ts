import source from './data/pitWorkbookObjectiveArtV107.json';
import {resolvePitSpriteSheetInspectionV100, type PitSpriteSheetAnimationBank} from './pitSpriteSheetAnimation';
import type {PitFighterState} from './systems/pitCombat';
import type {PitWorkbookConclusionSessionV107} from './systems/pitWorkbookConclusionsV107';

export const PIT_WORKBOOK_OBJECTIVE_ART_V107 = source;

export function pitWorkbookObjectiveArtReadyV107(bank: PitSpriteSheetAnimationBank | null): boolean {
  return !!resolvePitSpriteSheetInspectionV100(bank, {fighterId: 'feral-hunter', atlasId: source.device.atlasId,
    clipId: source.device.clipId, facing: 'right', elapsedTicks: source.device.sourceTick});
}

/** Session objects exist from the initial duel setup. Only the independent
 * session can change their ownership; drawing never emits a pickup or receipt. */
export function drawPitWorkbookObjectivePropsV107(context: CanvasRenderingContext2D,
  bank: PitSpriteSheetAnimationBank | null, session: PitWorkbookConclusionSessionV107 | null,
  actors: readonly [PitFighterState, PitFighterState], groundY: number,
  options: {nativeObjectInHand?: boolean; highContrast?: boolean} = {}): number {
  if (!session || !Number.isFinite(groundY)) return 0;
  let painted = 0;
  const weapon = session.targetWeapon, owner = actors[weapon.ownerSlot], attachment = weapon.attachment;
  const inspected = resolvePitSpriteSheetInspectionV100(bank, {fighterId: 'feral-hunter', atlasId: source.device.atlasId,
    clipId: source.device.clipId, facing: 'right', elapsedTicks: source.device.sourceTick});
  if (inspected && weapon.sourceId === source.device.sourceId && weapon.poseId === source.device.poseId) {
    const x = weapon.state === 'held' ? owner.x + owner.facing * attachment.offsetX : weapon.x;
    const y = weapon.state === 'held' ? owner.y + attachment.offsetY - attachment.height / 2 : weapon.y;
    context.save();
    try {
      context.imageSmoothingEnabled = false;
      // An original session harness makes this attachment legible. It is never
      // presented as a pre-existing Feral costume part or an offensive weapon.
      if (weapon.state === 'held') {
        context.strokeStyle = options.highContrast ? '#eefcff' : '#8b7548'; context.lineWidth = 1.6;
        context.beginPath(); context.moveTo(x - 8, groundY - y - 12); context.lineTo(x + 8, groundY - y + 1); context.stroke();
      }
      context.drawImage(inspected.source, source.device.sourceRect[0], source.device.sourceRect[1],
        source.device.sourceRect[2], source.device.sourceRect[3], x - attachment.width / 2,
        groundY - y - attachment.height, attachment.width, attachment.height);
      painted++;
    } finally {context.restore();}
  }
  const object = session.missionObject;
  if (object.state === 'recovered') return painted;
  context.save();
  try {
    const x = object.x, y = groundY - object.y - 5;
    context.fillStyle = '#161d24'; context.strokeStyle = options.highContrast ? '#ffffff' : '#e0b394'; context.lineWidth = 1;
    context.beginPath(); context.arc(x, y, 5, 0, Math.PI * 2); context.fill(); context.stroke();
    context.fillStyle = '#e44845'; context.beginPath(); context.arc(x, y - 1, 3.5, Math.PI, Math.PI * 2); context.fill();
    context.strokeStyle = '#ffc27d'; context.beginPath(); context.moveTo(x - 2, y - 2); context.lineTo(x, y - 3); context.stroke();
    if (object.state === 'ground') {
      context.strokeStyle = '#efb378'; context.setLineDash([2, 3]); context.beginPath(); context.ellipse(x, groundY - object.y + 1, 10, 3, 0, 0, Math.PI * 2); context.stroke();
    }
    painted++;
  } finally {context.restore();}
  return painted;
}
