import test from 'node:test';
import assert from 'node:assert/strict';
import {homeworldQaModelV64} from '../scripts/homeworld-qa-model-v64.mjs';
const api=homeworldQaModelV64(process.cwd(),['homeworldGeometryV64.ts']);
const near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function fixture(degrees){
 const angle=degrees*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),depth=api.HOMEWORLD_GEOMETRY_V64.depthScale;
 const source=(u,v=0)=>({x:600+c*u-s*v,y:600+(s*u+c*v)*depth});
 return {id:'measured-fixture-'+degrees,x:1200,y:1800,width:570,height:350,footprint:{width:570,depth:340},
  art:{src:'unused-mathematical-fixture.png',sourceWidth:1200,sourceHeight:1000,alphaBounds:{x:100,y:100,width:1000,height:850},
   threshold:source(0),foundationFront:{left:source(-285,6).x,right:source(285,6).x,y:600+6*c*depth},
   doorway:{x:540,y:430,width:120,height:170},footprintWorld:{width:570,depth:340},wallHeightWorld:300,sha256:'fixture',
   groundFrame:{frontLeft:source(-285,6),frontRight:source(285,6),doorLeft:source(-50),doorRight:source(50),
    doorClearHeightPixels:150,yawDegrees:degrees}}};
}
for(const angle of [-25,25]){
 test(`native ${angle} degree floor measurements retain the true scale, doorway and one ground projection`,()=>{
  const b=fixture(angle),frame=api.homeworldBuildingGroundFrameV76(b),door=api.homeworldBuildingDoorwayV64(b);
  near(api.homeworldBuildingSpriteScaleV64(b),1);near(door.clearWidth,100);near(door.clearHeight,150);near(door.frontOffset,6);
  near(Math.hypot(door.approach.x-b.x,door.approach.y-b.y),70);
  near(frame.local(door.approach).u,0);near(frame.local(door.approach).v,70);
  const image=api.homeworldBuildingSpritePlacementV64(b),projected=api.homeworldProjectGroundV64(b);
  near(image.left+b.art.threshold.x,projected.x);near(image.top+b.art.threshold.y,projected.y);
  for(const [source,p] of [[b.art.groundFrame.frontLeft,frame.frontLeft],[b.art.groundFrame.frontRight,frame.frontRight]]){
   const q=api.homeworldProjectGroundV64(p);near(q.x,image.left+source.x);near(q.y,image.top+source.y);
  }
 });
 test(`the ${angle} degree solid uses SAT and leaves empty bounding-box corners physically open`,()=>{
  const b=fixture(angle),f=api.homeworldBuildingGroundFrameV76(b),box=api.homeworldBuildingFootprintV64(b);
  const point=(u,v)=>({x:b.x+f.tangent.x*u+f.normal.x*v,y:b.y+f.tangent.y*u+f.normal.y*v});
  const actor={halfWidth:24,halfDepth:14};
  assert(api.homeworldBuildingTouchesV76(b,point(0,-100),actor));
  assert(!api.homeworldBuildingTouchesV76(b,point(0,70),actor));
  assert(api.homeworldBuildingTouchesV76(b,point(284,-100),actor),'full actor feet must contact a side wall');
  const corners=[{x:box.left+2,y:box.top+2},{x:box.right-2,y:box.top+2},{x:box.left+2,y:box.bottom-2},{x:box.right-2,y:box.bottom-2}];
  assert(corners.filter(p=>!api.homeworldBuildingTouchesV76(b,p,{halfWidth:0,halfDepth:0})).length>=2);
  const other={...b,x:b.x+1000};assert(!api.homeworldBuildingFootprintsOverlapV76(b,other));
  assert(api.homeworldBuildingFootprintsOverlapV76(b,{...b,x:b.x+10}));
 });
}
