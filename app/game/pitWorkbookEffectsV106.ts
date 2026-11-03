import {getPitCombatFighterDefinition, type PitCombatState} from './systems/pitCombat';
import {getPitWorkbookChargeAnchorV106, projectPitWorkbookAnchorV106} from './systems/pitWorkbookProjectileSourceV106';

/** A cosmetic light at the measured forward aperture during the final six
 * aiming ticks. It is painted before the native BODY, so the mask and dreads
 * really occlude it. This never creates a projectile, a hitbox or extra ticks. */
export function drawPitWorkbookChargeV106(
  context: CanvasRenderingContext2D, state: PitCombatState, groundY: number, highContrast: boolean,
): number {
  let count = 0;
  for (const fighter of state.fighters) {
    const action = fighter.action;
    if (fighter.normalMovesRecipe !== 'workbook-v106' || fighter.definitionId !== 'scar' || fighter.variantId ||
      fighter.phase !== 'startup' || !action || action.workbookMove !== 'S3' || action.frame < 14 || action.frame >= 20) continue;
    const anchor = getPitWorkbookChargeAnchorV106(fighter.facing);
    const point = anchor && projectPitWorkbookAnchorV106(anchor, fighter.x, fighter.y, getPitCombatFighterDefinition(fighter).bodyHeight);
    if (!point) continue;
    const progress = (action.frame - 13) / 6, radius = 1.2 + progress * 3.8;
    const x = point.x, y = groundY - point.y;
    context.save();
    try {
      context.globalAlpha *= .35 + progress * .5;
      context.shadowColor = highContrast ? '#ffffff' : '#ff8062';
      context.shadowBlur = 2 + progress * 5;
      const glow = context.createRadialGradient(x, y, 0, x, y, radius);
      glow.addColorStop(0, '#ffffff');
      glow.addColorStop(.3, highContrast ? '#ffffff' : '#ffaf83');
      glow.addColorStop(1, 'rgba(255,100,65,0)');
      context.fillStyle = glow;
      context.beginPath(); context.arc(x, y, radius, 0, Math.PI * 2); context.fill();
      count++;
    } finally {context.restore();}
  }
  return count;
}
