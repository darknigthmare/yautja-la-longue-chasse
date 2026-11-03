import {PIT_ARENAS, type PitCombatState} from './systems/pitCombat';
import {createPitWorkbookConclusionSessionV107} from './systems/pitWorkbookConclusionsV107';
import art from './data/pitWorkbookObjectiveArtV107.json';

export function ownsPitWorkbookObjectiveV107(leftId: string, rightId: string,
  leftVariant?: string | null, rightVariant?: string | null): boolean {
  return !leftVariant && !rightVariant && (leftId === 'scar' && rightId === 'feral-hunter' ||
    leftId === 'feral-hunter' && rightId === 'scar');
}

/** Called before the entrance ceremony and the first simulation tick. The
 * objective belongs to this explicit alternative duel, never campaign stock. */
export function createPitWorkbookObjectiveSessionV107(combat: PitCombatState, sessionId: string) {
  if (!ownsPitWorkbookObjectiveV107(combat.fighters[0].definitionId, combat.fighters[1].definitionId,
    combat.fighters[0].variantId, combat.fighters[1].variantId) || combat.rules.mode === 'training' || combat.rules.stageJourney) return null;
  const arena = PIT_ARENAS[combat.arenaId];
  return createPitWorkbookConclusionSessionV107(combat, {sessionId,
    targetSlot: combat.fighters[0].definitionId === 'feral-hunter' ? 0 : 1, sourceWeaponAvailable: true,
    targetWeapon: {id: sessionId + ':device', sourceId: art.device.sourceId, poseId: art.device.poseId,
      offensiveMechanicId: null, disarmedPoseAdmitted: false,
      attachment: {offsetX: 16, offsetY: 90, width: 20, height: 13}},
    missionObject: {id: sessionId + ':beacon', sourceId: art.beacon.sourceId, appearance: 'scar-red-beacon-v100',
      x: (arena.leftWall + arena.rightWall) / 2, y: 0},
  });
}
