import { PIT_STAGE_COMPOSITION_V65 } from './pitStageCompositionV65';
import type { PitArenaProductionAsset, PitArenaProductionKit, PitArenaProductionPlacement } from './pitArenaProduction';

interface Rect {readonly x:number;readonly y:number;readonly width:number;readonly height:number}
interface Transform {readonly scale:number;readonly translateX:number;readonly translateY:number}
interface Arena {readonly width:number;readonly height:number;readonly groundY:number}

/** Original presentation adaptation:46u behind the existing430u contact line.
 * This is not a new collision plane or an exact measurement of the CQC art. */
export const PIT_STAGE_REAR_GROUND_DEPTH_V79=46;

/** Height is authoritative only for a V65 composition actually applied by its
 * provenance-checked resolver. Historical crops retain their tile-width size. */
export function getPitFloorTileSizeV79(asset:PitArenaProductionAsset,placement:PitArenaProductionPlacement,source:Rect,kit?:PitArenaProductionKit){
 if(![source.width,source.height,placement.width,placement.height].every(n=>Number.isFinite(n)&&n>0))return null;
 const corrected=asset.mode==='repeat-x'&&Boolean(asset.sourceCrop)
  && kit?.planes.some(p=>p.id==='P0'&&p.assets.some(a=>a.id==='v65-p0'))
  && PIT_STAGE_COMPOSITION_V65.stages.find(s=>s.stageId===kit?.catalogueId)?.floorCorrections.some(c=>
   c.assetId===asset.id&&c.height===placement.height&&c.sourceCrop.x===source.x&&c.sourceCrop.y===source.y
   &&c.sourceCrop.width===source.width&&c.sourceCrop.height===source.height);
 const heightAuthority=asset.mode==='strip-x'?'strip-height':corrected?'v65-height':'legacy-width';
 const width=heightAuthority==='legacy-width'?placement.width:placement.height*source.width/source.height;
 return {width,height:width*source.height/source.width,heightAuthority};
}

/** All coordinates are canvas presentation units. The supplied transform must
 * be the exact P4 world transform, shared with fighters and contact shadows. */
export function getPitStageRearGroundBandV79(arena:Arena,transform:Transform){
 if(![arena.width,arena.height,arena.groundY,transform.scale,transform.translateY].every(Number.isFinite)
  ||arena.width<=0||arena.height<=0||transform.scale<=0)return null;
 const top=(arena.groundY-PIT_STAGE_REAR_GROUND_DEPTH_V79)*transform.scale+transform.translateY;
 const bottom=arena.groundY*transform.scale+transform.translateY;
 const clippedTop=Math.max(0,top),clippedBottom=Math.min(arena.height,bottom);
 return {top,bottom,height:bottom-top,clip:{x:0,y:clippedTop,width:arena.width,height:Math.max(0,clippedBottom-clippedTop)}};
}

/** Reuse the actual material crop uniformly, without stretching axes or adding
 * source pixels. The world band clips this decorative material, not any actor. */
export function getPitStageRearGroundMaterialSizeV79(source:Rect,height:number){
 if(![source.width,source.height,height].every(n=>Number.isFinite(n)&&n>0))return null;
 return {width:height*source.width/source.height,height};
}
