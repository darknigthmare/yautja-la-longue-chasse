import measured from './data/templeModularArtV70.json';

/** Original clan architecture, generated with the built-in OpenAI tool. Native
 * PNG bytes and alpha are preserved. Crops only address modules when rendering;
 * they do not modify or replace the supplied source image. */
export const TEMPLE_MODULAR_ATLAS_V70 = {
  src: '/game/homeworld/v70/temple-modules.png',
  sourceWidth: measured.sourceWidth, sourceHeight: measured.sourceHeight,
  sha256: measured.sha256, provenance: 'original-clan-interpretation',
  measurement: 'native-alpha16-bounds-and-visually-inspected-flat-base',
} as const;
export const TEMPLE_MODULAR_ART_V70 = measured.modules;
export type TempleModuleIdV70 = keyof typeof TEMPLE_MODULAR_ART_V70;

/** All elevations use a measured flat floor pivot and uniform pixel scale. */
export function drawTempleModuleV70(ctx: CanvasRenderingContext2D, image: HTMLImageElement, id: TempleModuleIdV70, x: number, groundY: number, heightWorld = TEMPLE_MODULAR_ART_V70[id].heightWorld) {
  const art = TEMPLE_MODULAR_ART_V70[id], scale = heightWorld / art.alphaBounds.height;
  ctx.drawImage(image, art.rect.x, art.rect.y, art.rect.width, art.rect.height,
    x - art.pivot.x * scale, groundY - art.pivot.y * scale, art.rect.width * scale, art.rect.height * scale);
}
