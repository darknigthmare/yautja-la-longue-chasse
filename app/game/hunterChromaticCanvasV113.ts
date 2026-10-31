/**
 * Runtime skinning layer for the ACTUAL hunting canvas.
 * Uses existing RGBA cutout as the source of the silhouette; textures tint
 * its pixels only. Source artwork, rig bones and body pivots are never changed.
 */
import { getChromaticMaterialV113, normalizeHunterChromaticsV113,
  CHROMATIC_PIGMENT_OVER_TEXTURE_V117,
  type HunterChromaticsV113, type ChromaticChannelV113,
  type ChromaticAtlasV125 } from "./hunterChromaticsV113.ts";

type Placement = { x: number; y: number; width: number; height: number };
const CANVAS_W = 256;
const CANVAS_H = 384;
const CHANNEL_FIELDS = {
  skin: {color:"skinHex",material:"skinMaterialId"},
  dreads: {color:"dreadHex",material:"dreadMaterialId"},
  outfit: {color:"outfitHex",material:"outfitMaterialId"},
  armor: {color:"armorHex",material:"armorMaterialId"},
  biomask: {color:"maskHex",material:"maskMaterialId"},
} as const satisfies Record<ChromaticChannelV113, {color:keyof HunterChromaticsV113;material:keyof HunterChromaticsV113}>;

type TextureLoad = { image: HTMLImageElement; status:"loading" | "ready" | "failed" };
const textures = new Map<string, TextureLoad>();
const MAX_RESIDENT_CHROMATIC_TEXTURES_V114 = 8;
const composed = new WeakMap<HTMLImageElement, Map<string, HTMLCanvasElement>>();

export function chromaticCanvasDescriptorV113(
  raw: unknown, channel: ChromaticChannelV113,
): { color: string | null; texturePath: string | null; opacity: number } {
  const value = normalizeHunterChromaticsV113(raw);
  const fields = CHANNEL_FIELDS[channel];
  const texturePath = getChromaticMaterialV113(channel, value[fields.material])?.src ?? null;
  return {color:value[fields.color],texturePath,opacity:channel==="skin"?.58:channel==="dreads"?.7:channel==="biomask"?.73:.78};
}
function textureForV113(src: string): HTMLImageElement | null {
  const existing = textures.get(src);
  if (existing) {
    // A small LRU avoids pinning every 1254px source in long customization sessions.
    textures.delete(src);
    textures.set(src, existing);
    return existing.status==="ready" ? existing.image : null;
  }
  if (textures.size >= MAX_RESIDENT_CHROMATIC_TEXTURES_V114) {
    const oldest = textures.keys().next().value;
    if (oldest !== undefined) textures.delete(oldest);
  }
  const image = new Image();
  const value:TextureLoad = {image,status:"loading"};
  textures.set(src,value);
  image.onload=()=>{value.status=image.naturalWidth>0&&image.naturalHeight>0?"ready":"failed";};
  image.onerror=()=>{value.status="failed";};
  image.decoding="async";
  image.src=src;
  return null;
}

function paintAtlasTileV125(
  ctx:CanvasRenderingContext2D, image:HTMLImageElement, atlas:ChromaticAtlasV125,
) {
  const sw=image.naturalWidth/atlas.columns, sh=image.naturalHeight/atlas.rows;
  const sx=sw*atlas.column, sy=sh*atlas.row;
  const scale=Math.max(CANVAS_W/sw,CANVAS_H/sh);
  const w=sw*scale,h=sh*scale;
  ctx.drawImage(image,sx,sy,sw,sh,(CANVAS_W-w)/2,(CANVAS_H-h)/2,w,h);
}
function paintCover(ctx:CanvasRenderingContext2D,image:HTMLImageElement) {
  const scale=Math.max(CANVAS_W/image.naturalWidth,CANVAS_H/image.naturalHeight);
  const w=image.naturalWidth*scale,h=image.naturalHeight*scale;
  ctx.drawImage(image,(CANVAS_W-w)/2,(CANVAS_H-h)/2,w,h);
}

/**
 * Maps one authored bitmap into the canonical 256x384 rig frame, recolors under
 * its source alpha, then caches the result. Only called for player rig assets.
 */
export function chromaticCanvasSourceV113(
  original:HTMLImageElement,
  chromatics:unknown,
  channel:ChromaticChannelV113,
  placement?:Placement,
  baseFilter = "none",
): HTMLCanvasElement | null {
  const material=chromaticCanvasDescriptorV113(chromatics,channel);
  const safe=normalizeHunterChromaticsV113(chromatics);
  const selected=getChromaticMaterialV113(channel,safe[CHANNEL_FIELDS[channel].material]);
  const atlas=selected?.atlas;
  const texture=material.texturePath ? textureForV113(material.texturePath) : null;
  if (!material.color && !texture) return null;

  const key=[
    channel, material.color ?? "", baseFilter,
    material.texturePath ?? "", texture?"ready":"pending",
    // All 12 studies share one image path; the tile must remain part of the
    // composition cache key or switching skins reuses the previous appearance.
    atlas ? [atlas.column,atlas.row,atlas.columns,atlas.rows].join(":") : "source",
    placement ? [placement.x,placement.y,placement.width,placement.height].join(":") : "full",
  ].join("|");
  let cache=composed.get(original);
  const hit=cache?.get(key);
  if(hit)return hit;
  const canvas=document.createElement("canvas");
  canvas.width=CANVAS_W;canvas.height=CANVAS_H;
  const ctx=canvas.getContext("2d");
  if(!ctx)return null;
  // Grade the original morphology before laying down custom paint. Previously
  // selecting any tint silently disabled the Super/Feral skin correction and
  // the existing armor filter in the active hunting Canvas.
  ctx.filter=baseFilter || "none";
  ctx.drawImage(original,placement?.x??0,placement?.y??0,placement?.width??CANVAS_W,placement?.height??CANVAS_H);
  ctx.filter="none";
  ctx.globalCompositeOperation="source-atop";
  ctx.globalAlpha=material.opacity;
  // Material first, then the user pigment. The old order painted an opaque
  // material over the tint, making custom swatches ineffective in live hunts.
  // source-atop is essential: neither pass may escape the original sprite alpha.
  if(texture) {
    if(atlas) paintAtlasTileV125(ctx,texture,atlas);
    else paintCover(ctx,texture);
  }
  if(material.color){
    ctx.globalAlpha=texture
      ? material.opacity * CHROMATIC_PIGMENT_OVER_TEXTURE_V117
      : material.opacity;
    ctx.fillStyle=material.color;
    ctx.fillRect(0,0,CANVAS_W,CANVAS_H);
  }
  ctx.globalCompositeOperation="source-over";
  ctx.globalAlpha=1;
  if(!cache){cache=new Map();composed.set(original,cache);}
  // Avoid unbounded user-driven color variations occupying GPU memory.
  if(cache.size>=16)cache.clear();
  cache.set(key,canvas);
  return canvas;
}
