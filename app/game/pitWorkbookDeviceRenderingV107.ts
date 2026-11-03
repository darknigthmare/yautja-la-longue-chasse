import masks from './data/pitWorkbookMineMasksV107.json';
import anchors from './data/pitWorkbookDeviceAnchorsV107.json';
import {PIT_WORKBOOK_OBJECTIVE_REGISTRY_V107} from './pitWorkbookRegistryV107';
import {loadPitSpriteSheetAnimations, resolvePitSpriteSheetAnimation, resolvePitSpriteSheetInspectionV100,
  type PitSpriteSheetAnimationBank, type PitSpriteSheetAnimationOptions} from './pitSpriteSheetAnimation';
import {getSpriteContact} from './spriteContact';
import {getPitCombatFighterDefinition, type PitFighterState} from './systems/pitCombat';
import type {PitWorkbookDeviceStateV107} from './systems/pitWorkbookCombatV107';
import type {PitCombatBitmapArtBank} from './pitCombatBitmapArt';

export const PIT_WORKBOOK_MINE_MASKS_V107 = masks;
export interface PitWorkbookDeviceArtV107 {
  readonly mine: PitSpriteSheetAnimationBank; readonly shuriken: HTMLImageElement | null;
  readonly ready: boolean; readonly failed: boolean;
}
export async function loadPitWorkbookDeviceArtV107(signal?: AbortSignal): Promise<PitWorkbookDeviceArtV107> {
  const [mine, shuriken] = await Promise.all([
    loadPitSpriteSheetAnimations(['feral-hunter'], PIT_WORKBOOK_OBJECTIVE_REGISTRY_V107, {signal}),
    new Promise<HTMLImageElement | null>(resolve => {
      const sprite = new Image(); let settled = false;
      const timeout = setTimeout(() => finish(null), 12_000);
      const finish = (value: HTMLImageElement | null) => {if (!settled) {settled = true; clearTimeout(timeout); resolve(value);}};
      sprite.onload = () => finish(!signal?.aborted && sprite.naturalWidth === anchors.shuriken.entity.width &&
        sprite.naturalHeight === anchors.shuriken.entity.height ? sprite : null);
      sprite.onerror = () => finish(null);
      signal?.addEventListener('abort', () => finish(null), {once: true});
      if (signal?.aborted) finish(null); else sprite.src = anchors.shuriken.entity.path;
    }),
  ]);
  const ready = !signal?.aborted && !mine.cancelled && mine.readyClipCount === 2 && mine.failedAtlasIds.length === 0 && !!shuriken;
  return {mine, shuriken, ready, failed: !ready && !signal?.aborted};
}

type MineMask = typeof masks.masks[number];
/** Coordinates stay in the unchanged original page. This same polygon is used
 * for the BODY hole and the independent object, so no opaque material duplicates.
 * Alpha2..64 shadows near the toe remain an explicitly ambiguous source fringe. */
export function clipPitWorkbookMineV107(context: CanvasRenderingContext2D, mask: MineMask, exclude: boolean): void {
  context.beginPath();
  if (exclude) context.rect(...mask.frameRect as [number, number, number, number]);
  mask.sourcePolygon.forEach(([x,y], index) => index ? context.lineTo(x,y) : context.moveTo(x,y));
  context.closePath(); context.clip(exclude ? 'evenodd' : 'nonzero');
}

export function drawPitWorkbookDeviceBodyV107(context: CanvasRenderingContext2D, bank: PitCombatBitmapArtBank | null,
  fighter: PitFighterState, groundY: number, options: PitSpriteSheetAnimationOptions & {highContrast?: boolean; accent?: string}): boolean {
  if ((fighter.normalMovesRecipe !== 'workbook-v107' && fighter.normalMovesRecipe !== 'workbook-v109' && fighter.normalMovesRecipe !== 'workbook-v112') || fighter.definitionId !== 'feral-hunter' || fighter.variantId || fighter.action?.workbookMove !== 'S4') return false;
  const animation = resolvePitSpriteSheetAnimation(bank?.spriteSheets, fighter, options);
  if (!animation) return false;
  const {frame, page} = animation.resolved.frame;
  const mask = masks.masks.find(candidate => candidate.path === page.src && candidate.frameRect.every((value,index) => value === frame.rect[index]));
  if (!mask) return false;
  const reference = animation.definition.pageBodyHeightPx?.[page.id] ?? animation.definition.bodyHeightPx;
  const scale = getPitCombatFighterDefinition(fighter).bodyHeight / reference;
  const contact = getSpriteContact(animation.source, frame.rect, frame.pivot[1])?.offsetY ?? 0;
  context.save();
  try {
    context.translate(fighter.x - (frame.rect[0] + frame.pivot[0]) * scale,
      groundY - fighter.y - (frame.rect[1] + frame.pivot[1] - contact) * scale);
    context.scale(scale, scale); context.imageSmoothingEnabled = false; context.filter = 'none';
    if (fighter.cloakPhase !== 'inactive') context.globalAlpha *= fighter.cloakPhase === 'active' ? .38 : .65;
    if (options.highContrast) {context.shadowColor = options.accent ?? '#eaffed'; context.shadowBlur = 4 / scale;}
    clipPitWorkbookMineV107(context, mask, true);
    context.drawImage(animation.source, ...frame.rect, ...frame.rect);
    return true;
  } finally {context.restore();}
}

/** The device comes from the same owned runtime entity as its collision box.
 * No drawing creates a mine, replenishes inventory or changes possession. */
export function drawPitWorkbookDeviceV107(context: CanvasRenderingContext2D, art: PitWorkbookDeviceArtV107 | null,
  device: PitWorkbookDeviceStateV107, groundY: number): boolean {
  if (!art?.ready) return false;
  context.save();
  try {
    context.imageSmoothingEnabled = false;
    if (device.kind === 'shuriken') {
      if (!art.shuriken) return false;
      const entity = anchors.shuriken.entity, scale = entity.displaySize / entity.width;
      context.translate(device.x + 13, groundY - device.y - 13);
      context.rotate(device.direction * device.age * .3);
      context.drawImage(art.shuriken, -entity.pivot[0] * scale, -entity.pivot[1] * scale, entity.width * scale, entity.height * scale);
      return true;
    }
    const facing = device.direction === 1 ? 'right' : 'left';
    const index = device.phase === 'amber' ? device.age < 14 ? 2 : 3 : device.phase === 'armed' ? 5 : 4;
    const tick = index === 2 ? 20 : index === 3 ? 34 : index === 4 ? 64 : 94;
    const inspected = resolvePitSpriteSheetInspectionV100(art.mine, {fighterId:'feral-hunter', atlasId:'feral-workbook-s4-v100',
      clipId:'workbook.M_F006_S4', facing, elapsedTicks:tick});
    const maskId = index === 2 ? `a2-${facing}` : `b${index}-${facing}-${index === 3 ? 'amber' : index === 4 ? 'off' : 'red'}`;
    const mask = masks.masks.find(candidate => candidate.id === maskId);
    if (!inspected || !mask) return false;
    const bounds = mask.mineOpaqueBounds, scale = 22 / (bounds[2] - bounds[0] + 1);
    context.translate(device.x + 11 - (bounds[0] + bounds[2] + 1) / 2 * scale,
      groundY - device.y - (bounds[3] + 1) * scale);
    context.scale(scale,scale); clipPitWorkbookMineV107(context,mask,false);
    context.drawImage(inspected.source,...mask.cropRect as [number,number,number,number],...mask.cropRect as [number,number,number,number]);
    return true;
  } finally {context.restore();}
}
