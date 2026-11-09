import { CANOPY_PHYSICS_V112, canopySwingPointV112, isFlexibleCanopySupportV112, isCanopySwingSnapshotV112 } from './canopyTraversalV112.ts';
import type { CanopySwingV112 } from './canopyTraversalV112';
import type { WorldClimbable, WorldPlatform } from './worldBlueprints';
import type { CanopyNavigationMarkerV112 } from './canopyNavigationV112';

/** Rendering uses the exact physical anchor and grip, at rest and in motion.
 * Material detail never substitutes a new collision or attachment point. */
export interface CanopyStrandGeometryV112 {
  anchor: { x: number; y: number };
  grip: { x: number; y: number };
  length: number;
  angle: number;
  active: boolean;
  kind: 'vine' | 'rope' | 'chain';
}
export function canopyStrandGeometryV112(zone: WorldClimbable, swing: CanopySwingV112 | null): CanopyStrandGeometryV112 | null {
  if (!isFlexibleCanopySupportV112(zone) ||
    ![zone.x, zone.y, zone.width, zone.height].every(Number.isFinite) || zone.width <= 0 || zone.height <= 0) return null;
  const anchor = { x: zone.x + zone.width / 2, y: zone.y };
  const active = swing?.supportId === zone.id && isCanopySwingSnapshotV112(swing) &&
    swing.length <= Math.min(zone.height, CANOPY_PHYSICS_V112.maximumLength);
  const length = active ? swing.length : Math.min(zone.height, CANOPY_PHYSICS_V112.maximumLength);
  return { anchor, grip: active ? canopySwingPointV112(swing, zone) : { x: anchor.x, y: anchor.y + length },
    length, angle: active ? swing.angle : 0, active: Boolean(active), kind: zone.kind as CanopyStrandGeometryV112['kind'] };
}

export function drawFlexibleCanopySupportV112(
  context: CanvasRenderingContext2D, zone: WorldClimbable, swing: CanopySwingV112 | null,
  textures: { vine?: HTMLImageElement | null } = {},
): boolean {
  const strand = canopyStrandGeometryV112(zone, swing);
  if (!strand) return false;
  context.save(); context.translate(strand.anchor.x, strand.anchor.y); context.rotate(-strand.angle);
  context.lineCap = 'round';
  if (strand.kind === 'chain') {
    context.strokeStyle = '#302f2b'; context.lineWidth = 2; context.beginPath(); context.moveTo(0, 0); context.lineTo(0, strand.length); context.stroke();
    // Alternating edge/front links retain their material while the pendulum moves.
    for (let y = 4, index = 0; y < strand.length; y += 12, index++) {
      context.strokeStyle = index % 2 ? '#afb3a9' : '#747b75'; context.lineWidth = 2.4;
      context.beginPath(); context.ellipse(0, Math.min(y, strand.length - 2), index % 2 ? 2.4 : 4.8,
        Math.min(7, Math.max(2, strand.length - y)), 0, 0, Math.PI * 2); context.stroke();
    }
  } else {
    const vine = strand.kind === 'vine';
    context.strokeStyle = vine ? '#243c22' : '#413524'; context.lineWidth = vine ? 7 : 6;
    context.beginPath(); context.moveTo(0, 0); context.lineTo(0, strand.length); context.stroke();
    context.strokeStyle = vine ? '#8ea367' : '#c3ab7f'; context.lineWidth = vine ? 2 : 1.6;
    context.beginPath(); context.moveTo(-1, 1); context.lineTo(-1, strand.length); context.stroke();
    const image = textures.vine;
    if (vine && image && image.complete && image.naturalWidth > 0 && image.naturalHeight > 0) {
      // The existing authored vine-ladder's LEFT strand is sampled unmodified.
      // Repeat along its length instead of stretching leaves into giant shapes.
      const sourceX = image.naturalWidth * .11, sourceWidth = image.naturalWidth * .2;
      const drawWidth = 15, tileLength = drawWidth * image.naturalHeight / sourceWidth;
      for (let y = 0; y < strand.length; y += tileLength) {
        const height = Math.min(tileLength, strand.length - y);
        context.drawImage(image, sourceX, 0, sourceWidth, image.naturalHeight * height / tileLength,
          -drawWidth / 2, y, drawWidth, height);
      }
    } else {
      for (let y = 6; y < strand.length - 4; y += vine ? 25 : 10) {
        if (vine) {
          const side = Math.floor(y / 25) % 2 ? -1 : 1;
          context.fillStyle = '#668353'; context.beginPath(); context.ellipse(side * 5, y, 6, 2.4, side * -.5, 0, Math.PI * 2); context.fill();
        } else {
          context.strokeStyle = '#86704b'; context.lineWidth = 1;
          context.beginPath(); context.moveTo(-2, y); context.lineTo(2, Math.min(strand.length, y + 4)); context.stroke();
        }
      }
    }
  }
  // A material collar marks the shared top anchor. It does not flash or pulse.
  context.fillStyle = '#766a46'; context.strokeStyle = '#c8bb86'; context.lineWidth = 1;
  context.fillRect(-6, -3, 12, 7); context.strokeRect(-6, -3, 12, 7);
  if (strand.active) {
    context.strokeStyle = '#e4e7ca'; context.lineWidth = 1.5;
    context.beginPath(); context.arc(0, strand.length, 6, 0, Math.PI * 2); context.stroke();
  }
  context.restore(); return true;
}

/** Rest markings end at the true collision surface and leave all clearances
 * intact. This is an overlay over the original platform material, not a bridge. */
export function drawCanopyRestSurfaceV112(context: CanvasRenderingContext2D, platform: WorldPlatform, occupied = false): void {
  if (!platform.id.startsWith('v112-canopy-') || !platform.id.endsWith('-rest') ||
    ![platform.x, platform.y, platform.width, platform.height].every(Number.isFinite)) return;
  context.save(); context.strokeStyle = occupied ? '#dfedc1' : '#afbc82'; context.lineWidth = 2;
  context.beginPath(); context.moveTo(platform.x + 5, platform.y + 1); context.lineTo(platform.x + platform.width - 5, platform.y + 1); context.stroke();
  for (const x of [platform.x + 5, platform.x + platform.width - 5]) {
    context.beginPath(); context.moveTo(x, platform.y - 4); context.lineTo(x, platform.y + 5); context.stroke();
  }
  const center = platform.x + platform.width / 2;
  context.fillStyle = occupied ? '#dce9b5' : '#a9b785';
  context.beginPath(); context.ellipse(center - 4, platform.y + 7, 2, 3.5, -.2, 0, Math.PI * 2);
  context.ellipse(center + 4, platform.y + 7, 2, 3.5, .2, 0, Math.PI * 2); context.fill();
  context.restore();
}

/** At most four contextual symbols; only READY/HELD are filled. A distant
 * waypoint is deliberately hollow and never draws an invented ballistic arc. */
export function drawCanopyNavigationMarkersV112(context: CanvasRenderingContext2D, markers: readonly CanopyNavigationMarkerV112[]): void {
  for (const marker of markers.slice(0, 4)) {
    if (![marker.point.x, marker.point.y].every(Number.isFinite)) continue;
    const { x, y } = marker.point;
    const ready = marker.state === 'held' || marker.state === 'ready' || marker.state === 'resting';
    const blocked = marker.state === 'blocked' || marker.state === 'locked';
    context.save(); context.lineWidth = ready ? 2 : 1.5;
    context.strokeStyle = blocked ? '#ddad87' : ready ? '#e2edbf' : '#9ca89b'; context.fillStyle = ready ? '#789366aa' : '#0c1818aa';
    if (!ready) context.setLineDash([3, 3]);
    context.beginPath();
    if (marker.kind === 'rest') {
      context.moveTo(x - 7, y - 17); context.lineTo(x, y - 10); context.lineTo(x + 7, y - 17);
    } else context.arc(x, y, marker.state === 'held' ? 11 : 8, 0, Math.PI * 2);
    if (marker.kind === 'grip') context.fill(); context.stroke(); context.setLineDash([]);
    if (blocked) {
      context.beginPath(); context.moveTo(x - 3, y - 3); context.lineTo(x + 3, y + 3);
      context.moveTo(x + 3, y - 3); context.lineTo(x - 3, y + 3); context.stroke();
    } else if (marker.state === 'held') {
      context.beginPath(); context.moveTo(x - 4, y); context.lineTo(x - 1, y + 3); context.lineTo(x + 4, y - 3); context.stroke();
    }
    const text = marker.kind === 'rest' ? marker.state === 'resting' ? 'REPOS' : 'APPUI' :
      marker.state === 'held' ? 'PRISE TENUE' : marker.state === 'ready' ? 'À PORTÉE' :
        marker.state === 'blocked' ? 'OBSTACLE' : marker.state === 'exhausted' ? 'RÉCEPTION REQUISE' :
          marker.state === 'cooldown' ? 'REPRISE EN ATTENTE' : marker.state === 'low-stamina' ? 'ENDURANCE BASSE' :
            marker.state === 'locked' ? 'ACTION EN COURS' : 'PRISE DISTANTE';
    const labelY = marker.kind === 'rest' ? y - 24 : y - 17;
    context.font = '9px sans-serif'; context.textAlign = 'center';
    const width = context.measureText(text).width + 8;
    context.fillStyle = '#06100fdd'; context.fillRect(x - width / 2, labelY - 9, width, 12);
    context.fillStyle = ready ? '#e2edbf' : '#c2ccc1'; context.fillText(text, x, labelY);
    context.restore();
  }
}
