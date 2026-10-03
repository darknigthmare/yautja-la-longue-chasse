/** One orthographic camera and one physical unit system for exterior/interior scenes.
 * Ground coordinates are never CSS pixel positions. Vertical sprite heights are
 * not compressed by the ground projection. Yautja scale is a project convention. */
export const HOMEWORLD_GEOMETRY_V64 = {
  yawDegrees: 0, pitchDegrees: 35, depthScale: Math.sin(35 * Math.PI / 180),
  zoom: .96, adultHeight: 100, adultMetres: 2.3,
  minimumDoorWidth: 80, minimumDoorHeight: 128, doorApproachDistance: 70,
  planDepthExpansion: 1.55, minimumPrimaryStreetWidth: 160,
} as const;
export interface HomeworldGroundPointV64 { readonly x: number; readonly y: number }
export interface HomeworldPixelRectV64 { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
export interface HomeworldNativeBuildingArtV64 {
  readonly src: string; readonly sourceWidth: number; readonly sourceHeight: number;
  /** Optional atlas window. All socket/bounds coordinates are local to this window. */
  readonly sourceRect?: HomeworldPixelRectV64;
  readonly alphaBounds: HomeworldPixelRectV64;
  /** Native alpha>=24 row runs, local to sourceRect (or the complete source).
   * Each row stores start-inclusive/end-exclusive pairs, retaining alpha holes. */
  readonly opaqueRowsV76?: readonly (readonly number[])[];
  readonly foundationFront: { readonly left: number; readonly right: number; readonly y: number };
  readonly threshold: HomeworldGroundPointV64;
  readonly doorway: HomeworldPixelRectV64;
  readonly footprintWorld: { readonly width: number; readonly depth: number };
  readonly wallHeightWorld: number;
  readonly sha256: string;
  readonly measurementStatus?: string;
  /** V76 measured ground segments for a genuinely angled native drawing.
   * Coordinates stay local to the source cell. No renderer rotation is used. */
  readonly groundFrame?: {
    readonly frontLeft: HomeworldGroundPointV64; readonly frontRight: HomeworldGroundPointV64;
    readonly doorLeft: HomeworldGroundPointV64; readonly doorRight: HomeworldGroundPointV64;
    readonly doorClearHeightPixels: number; readonly yawDegrees: number;
  };
}
export interface HomeworldGeometryBuildingV64 extends HomeworldGroundPointV64 {
  readonly id: string; readonly width: number; readonly height: number;
  readonly footprint?: { readonly width: number; readonly depth: number };
  readonly art?: HomeworldNativeBuildingArtV64;
}
interface HomeworldBuildingGroundFrameV76 {
  tangent:HomeworldGroundPointV64;normal:HomeworldGroundPointV64;polygon:HomeworldGroundPointV64[];
  frontLeft:HomeworldGroundPointV64;frontRight:HomeworldGroundPointV64;uMin:number;uMax:number;vFront:number;vBack:number;
  local:(point:HomeworldGroundPointV64)=>{u:number;v:number};angled:boolean;
}
const groundFrameCacheV76=new WeakMap<HomeworldGeometryBuildingV64,HomeworldBuildingGroundFrameV76>();
export function homeworldProjectGroundV64(point: HomeworldGroundPointV64, elevation = 0): HomeworldGroundPointV64 {
  return { x: point.x, y: point.y * HOMEWORLD_GEOMETRY_V64.depthScale - elevation };
}
export function homeworldUnprojectGroundV64(point: HomeworldGroundPointV64, elevation = 0): HomeworldGroundPointV64 {
  return { x: point.x, y: (point.y + elevation) / HOMEWORLD_GEOMETRY_V64.depthScale };
}
export function homeworldBuildingSpriteScaleV64(building: HomeworldGeometryBuildingV64): number {
  if (!building.art) return 1;
  const frame = building.art.groundFrame;
  const nativeGroundWidth = frame ? Math.hypot(frame.frontRight.x-frame.frontLeft.x,
    (frame.frontRight.y-frame.frontLeft.y)/HOMEWORLD_GEOMETRY_V64.depthScale)
    : building.art.foundationFront.right - building.art.foundationFront.left;
  return (building.footprint?.width ?? building.width) / nativeGroundWidth;
}
/** The same measured façade plane drives approach, solid masonry and codex.
 * The unchanged physical depth extends behind the measured native front edge. */
export function homeworldBuildingGroundFrameV76(building: HomeworldGeometryBuildingV64) {
  const cached=groundFrameCacheV76.get(building);if(cached)return cached;
  const art=building.art, frame=art?.groundFrame, scale=homeworldBuildingSpriteScaleV64(building);
  const dx=frame ? frame.frontRight.x-frame.frontLeft.x : 1;
  const dy=frame ? (frame.frontRight.y-frame.frontLeft.y)/HOMEWORLD_GEOMETRY_V64.depthScale : 0;
  const length=Math.hypot(dx,dy),tangent={x:dx/length,y:dy/length},normal={x:-dy/length,y:dx/length};
  const pixelToGround=(p:HomeworldGroundPointV64)=>({x:building.x+(p.x-art!.threshold.x)*scale,
    y:building.y+(p.y-art!.threshold.y)*scale/HOMEWORLD_GEOMETRY_V64.depthScale});
  const halfWidth=(building.footprint?.width??building.width)/2;
  const frontOffset=art ? Math.max(0,(art.foundationFront.y-art.threshold.y)*scale/HOMEWORLD_GEOMETRY_V64.depthScale) : 0;
  const frontLeft=frame ? pixelToGround(frame.frontLeft) : {x:building.x-halfWidth,y:building.y+frontOffset};
  const frontRight=frame ? pixelToGround(frame.frontRight) : {x:building.x+halfWidth,y:building.y+frontOffset};
  const depth=building.footprint?.depth??340;
  const solidDepth=frame ? depth : depth+frontOffset;
  const polygon=[frontLeft,frontRight,{x:frontRight.x-normal.x*solidDepth,y:frontRight.y-normal.y*solidDepth},
    {x:frontLeft.x-normal.x*solidDepth,y:frontLeft.y-normal.y*solidDepth}];
  const local=(p:HomeworldGroundPointV64)=>({u:(p.x-building.x)*tangent.x+(p.y-building.y)*tangent.y,
    v:(p.x-building.x)*normal.x+(p.y-building.y)*normal.y});
  const left=local(frontLeft),right=local(frontRight);
  const result={tangent,normal,polygon,frontLeft,frontRight,uMin:Math.min(left.u,right.u),uMax:Math.max(left.u,right.u),
    vFront:(left.v+right.v)/2,vBack:(left.v+right.v)/2-solidDepth,local,angled:!!frame};
  groundFrameCacheV76.set(building,result);return result;
}
/** SAT against the actual oriented solid, including the full actor rectangle.
 * A broad-phase box alone would add invisible walls in the rotated corners. */
export function homeworldBuildingTouchesV76(building:HomeworldGeometryBuildingV64,point:HomeworldGroundPointV64,
  actor:{halfWidth:number;halfDepth:number}) {
  const frame=homeworldBuildingGroundFrameV76(building);
  for(const axis of [{x:1,y:0},{x:0,y:1},frame.tangent,frame.normal]){
    const values=frame.polygon.map(p=>p.x*axis.x+p.y*axis.y),centre=point.x*axis.x+point.y*axis.y;
    const radius=Math.abs(axis.x)*actor.halfWidth+Math.abs(axis.y)*actor.halfDepth;
    if(centre+radius<=Math.min(...values)||centre-radius>=Math.max(...values))return false;
  }
  return true;
}
export function homeworldBuildingFootprintsOverlapV76(a:HomeworldGeometryBuildingV64,b:HomeworldGeometryBuildingV64) {
  const first=homeworldBuildingGroundFrameV76(a),second=homeworldBuildingGroundFrameV76(b);
  for(const axis of [first.tangent,first.normal,second.tangent,second.normal]){
    const left=first.polygon.map(p=>p.x*axis.x+p.y*axis.y),right=second.polygon.map(p=>p.x*axis.x+p.y*axis.y);
    if(Math.max(...left)<=Math.min(...right)||Math.max(...right)<=Math.min(...left))return false;
  }
  return true;
}
/** Absolute projected image rectangle, aligned on the measured painted threshold. */
export function homeworldBuildingSpritePlacementV64(building: HomeworldGeometryBuildingV64) {
  const p = homeworldProjectGroundV64(building), art = building.art;
  if (!art) return { left: p.x - building.width / 2, top: p.y - building.height, width: building.width, height: building.height };
  const scale = homeworldBuildingSpriteScaleV64(building);
  return { left: p.x - art.threshold.x * scale, top: p.y - art.threshold.y * scale, width: (art.sourceRect?.width ?? art.sourceWidth) * scale, height: (art.sourceRect?.height ?? art.sourceHeight) * scale };
}
/** Whether the actual upright painting covers a ground point or a body's screen
 * rectangle. This is opacity metadata, never masonry collision or permission.
 * No DOM/canvas reads, decoded-image cache, CSS rotation or double projection. */
export function homeworldBuildingCoversPaintV76(building:HomeworldGeometryBuildingV64,
  worldPoint:HomeworldGroundPointV64,body:{halfWidth:number;height:number}={halfWidth:0,height:0}):boolean {
  if(!Number.isFinite(worldPoint.x)||!Number.isFinite(worldPoint.y)
    ||!Number.isFinite(body.halfWidth)||!Number.isFinite(body.height))return false;
  const position=homeworldBuildingSpritePlacementV64(building),scale=homeworldBuildingSpriteScaleV64(building);
  if(!Number.isFinite(scale)||scale<=0)return false;
  const point=homeworldProjectGroundV64(worldPoint),x=(point.x-position.left)/scale,y=(point.y-position.top)/scale;
  const halfWidth=Math.max(0,body.halfWidth)/scale,height=Math.max(0,body.height)/scale;
  const left=x-halfWidth,right=x+halfWidth,top=y-height,bottom=y,art=building.art;
  const width=art?.sourceRect?.width??art?.sourceWidth??position.width/scale;
  const imageHeight=art?.sourceRect?.height??art?.sourceHeight??position.height/scale;
  if(right<0||left>=width||bottom<0||top>=imageHeight)return false;
  if(!art?.opaqueRowsV76){
    // Existing sources without native runs keep their historical alpha bounds.
    const bounds=art?.alphaBounds??{x:0,y:0,width,height:imageHeight};
    return right>=bounds.x&&left<bounds.x+bounds.width
      &&bottom>=bounds.y&&top<bounds.y+bounds.height;
  }
  const firstRow=Math.max(0,Math.floor(top)),lastRow=Math.min(imageHeight-1,Math.floor(bottom));
  for(let row=firstRow;row<=lastRow;row++){
    const runs=art.opaqueRowsV76[row]??[];
    for(let pair=0;pair<runs.length;pair+=2){
      if(runs[pair]>right)break;
      if(runs[pair+1]>left)return true;
    }
  }
  return false;
}
/** Logical threshold, traversal approach and measured source socket stay together. */
export function homeworldBuildingDoorwayV64(building: HomeworldGeometryBuildingV64) {
  const art = building.art, scale = homeworldBuildingSpriteScaleV64(building);
  const frame=art?.groundFrame ? homeworldBuildingGroundFrameV76(building) : null;
  const clearWidth=art?.groundFrame ? Math.hypot(art.groundFrame.doorRight.x-art.groundFrame.doorLeft.x,
    (art.groundFrame.doorRight.y-art.groundFrame.doorLeft.y)/HOMEWORLD_GEOMETRY_V64.depthScale)*scale
    : art ? art.doorway.width*scale : HOMEWORLD_GEOMETRY_V64.minimumDoorWidth;
  return {
    threshold: { x: building.x, y: building.y },
    approach: { x: building.x+(frame?.normal.x??0)*HOMEWORLD_GEOMETRY_V64.doorApproachDistance,
      y: building.y+(frame?.normal.y??1)*HOMEWORLD_GEOMETRY_V64.doorApproachDistance },
    clearWidth,
    clearHeight: art ? (art.groundFrame?.doorClearHeightPixels??art.doorway.height)*scale : HOMEWORLD_GEOMETRY_V64.minimumDoorHeight,
    paintedSocket: art ? { ...art.doorway, threshold: art.threshold, units: 'source-pixels' as const } : null,
    // Measured foot projections form side volumes, not an invisible passage.
    frontOffset: frame ? Math.max(0,frame.vFront) : art ? Math.max(0, (art.foundationFront.y - art.threshold.y) * scale / HOMEWORLD_GEOMETRY_V64.depthScale) : 0,
    ...(frame && art?.groundFrame ? {normal:frame.normal,groundOpening:{
      left:{x:building.x+(art.groundFrame.doorLeft.x-art.threshold.x)*scale,
        y:building.y+(art.groundFrame.doorLeft.y-art.threshold.y)*scale/HOMEWORLD_GEOMETRY_V64.depthScale},
      right:{x:building.x+(art.groundFrame.doorRight.x-art.threshold.x)*scale,
        y:building.y+(art.groundFrame.doorRight.y-art.threshold.y)*scale/HOMEWORLD_GEOMETRY_V64.depthScale},
    }} : {}),
  };
}
export function homeworldBuildingFootprintV64(building: HomeworldGeometryBuildingV64) {
  const width = building.footprint?.width ?? building.width, depth = building.footprint?.depth ?? 340;
  const door = homeworldBuildingDoorwayV64(building);
  if(building.art?.groundFrame){
    const polygon=homeworldBuildingGroundFrameV76(building).polygon;
    return {left:Math.min(...polygon.map(p=>p.x)),right:Math.max(...polygon.map(p=>p.x)),top:Math.min(...polygon.map(p=>p.y)),
      bottom:Math.max(...polygon.map(p=>p.y)),thresholdFront:building.y,
      doorLeft:building.x-door.clearWidth/2,doorRight:building.x+door.clearWidth/2,polygon};
  }
  return { left: building.x - width / 2, right: building.x + width / 2, top: building.y - depth,
    bottom: building.y + door.frontOffset, thresholdFront: building.y,
    doorLeft: building.x - door.clearWidth / 2, doorRight: building.x + door.clearWidth / 2,
  };
}
