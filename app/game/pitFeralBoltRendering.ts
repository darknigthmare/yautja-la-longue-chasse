import { getPitTechniqueBox, type PitCombatState, type PitTechniqueEffectState } from './systems/pitCombat';

/** Readable physical-projectile feedback, not a certified reproduction of the film prop.
 * The separate launcher/bolt drawing and firing body animation are still outstanding.
 */
export function drawPitFeralBolt(
  context: CanvasRenderingContext2D,
  state: PitCombatState,
  effect: PitTechniqueEffectState,
  groundY: number,
  highContrast: boolean,
  showHitboxes: boolean,
): void {
  const box = getPitTechniqueBox(state, effect);
  const centerX = box.x + box.width / 2;
  const centerY = groundY - box.y - box.height / 2;
  const vx = effect.bolt?.velocityX ?? effect.direction;
  const vy = effect.bolt?.velocityY ?? 0;
  const magnitude = Math.hypot(vx, vy) || 1;
  const dx = vx / magnitude * box.width / 2;
  const dy = -vy / magnitude * box.width / 2;
  context.save();
  try {
    context.globalAlpha = 1;
    context.shadowBlur = 0;
    context.setLineDash([]);
    context.lineCap = 'butt';
    context.lineWidth = 3;
    context.strokeStyle = highContrast ? '#ffffff' : '#596168';
    context.beginPath();
    context.moveTo(centerX - dx, centerY - dy);
    context.lineTo(centerX + dx, centerY + dy);
    context.stroke();
    context.lineWidth = 1;
    context.strokeStyle = highContrast ? '#ffffff' : '#d5d9d8';
    context.beginPath();
    context.moveTo(centerX - dx, centerY - dy - 1);
    context.lineTo(centerX + dx, centerY + dy - 1);
    context.stroke();
    if (showHitboxes) {
      context.strokeStyle = '#d888ff';
      context.strokeRect(box.x, groundY - box.y - box.height, box.width, box.height);
    }
  } finally {
    context.restore();
  }
}
