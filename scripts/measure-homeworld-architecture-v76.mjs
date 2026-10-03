import fs from 'node:fs/promises';
import sharp from 'sharp';
import {inspectHomeworldArchitecturePngV75} from './measure-homeworld-architecture-v75.mjs';

const depthScale=Math.sin(35*Math.PI/180);
/** Read-only metrology of a native angled bitmap. This code never transforms,
 * crops or modifies an image. Human-observed support/jamb coordinates remain
 * distinct from the alpha scan, which proves actual contact and transparency. */
export async function inspectHomeworldArchitecturePngV76(path,art,measurement){
 const base=await inspectHomeworldArchitecturePngV75(path);
 const{data,info}=await sharp(path).raw().toBuffer({resolveWithObject:true});
 const pixel=(x,y)=>{x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=info.width||y>=info.height)throw new Error('Probe outside native source');return Array.from(data.subarray((y*info.width+x)*4,(y*info.width+x)*4+4));};
 const bottomAt=x=>{for(let y=info.height-1;y>=0;y--)if(pixel(x,y)[3]>200)return y;return-1;};
 const f=art.groundFrame,dx=f.frontRight.x-f.frontLeft.x,dy=(f.frontRight.y-f.frontLeft.y)/depthScale;
 const sourceGroundSpan=Math.hypot(dx,dy),scale=art.footprintWorld.width/sourceGroundSpan;
 const supportPoints=['frontLeft','frontRight','doorLeft','doorRight'].map(name=>({name,...f[name],rgba:pixel(f[name].x,f[name].y),bottomAlphaY:bottomAt(f[name].x)}));
 const opaqueCavityProbes=[];
 for(const heightFraction of [.25,.5,.75])for(const acrossFraction of [.25,.5,.75]){
  const left={x:f.doorLeft.x+(measurement.jambTops[0].x-f.doorLeft.x)*heightFraction,y:f.doorLeft.y-(f.doorLeft.y-measurement.jambTops[0].y)*heightFraction};
  const right={x:f.doorRight.x+(measurement.jambTops[1].x-f.doorRight.x)*heightFraction,y:f.doorRight.y-(f.doorRight.y-measurement.jambTops[1].y)*heightFraction};
  const point={x:Math.round(left.x+(right.x-left.x)*acrossFraction),y:Math.round(left.y+(right.y-left.y)*acrossFraction)};
  opaqueCavityProbes.push({...point,rgba:pixel(point.x,point.y)});
 }
 const floorEdgeProbes=[.1,.25,.5,.75,.9].map(t=>{const x=Math.round(f.doorLeft.x+(f.doorRight.x-f.doorLeft.x)*t),expectedY=f.doorLeft.y+(f.doorRight.y-f.doorLeft.y)*t,y=bottomAt(x);return{x,y,expectedY,deviation:Math.abs(y-expectedY),inside:pixel(x,y-4),outside:pixel(x,y+4)};});
 return{...base,sourceGroundSpan,scale,yawDegrees:Math.atan2(dy,dx)*180/Math.PI,
  clearWidthWorld:Math.hypot(f.doorRight.x-f.doorLeft.x,(f.doorRight.y-f.doorLeft.y)/depthScale)*scale,
  clearHeightWorld:f.doorClearHeightPixels*scale,supportPoints,opaqueCavityProbes,floorEdgeProbes};
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/measure-homeworld-architecture-v76.mjs')){
 const records=JSON.parse(await fs.readFile('app/game/data/homeworldArchitectureArtV76.json','utf8'));
 for(const[id,record]of Object.entries(records)){
  const result=await inspectHomeworldArchitecturePngV76('public'+record.art.src,record.art,record.measurement);
  delete result.bottomRows;
  console.log(JSON.stringify({id,...result}));
 }
}
