import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import sharp from 'sharp';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';

const qa=homeworldSceneSsrV78(),load=id=>qa.load('app/game/systems/'+id+'.ts');
const world=load('homeworldWorldV77'),back=load('homeworldBackdropV81'),native=load('homeworldNativeArchitectureV81');
const foundation=native.HOMEWORLD_NATIVE_CATALOGUE_V81.assets['basalt-city-foundation'].art;
const bytes=fs.readFileSync('public'+foundation.src),scene='app/game/HomeworldBackdropV81.tsx';
const camera={x:-480,y:692,viewWidth:2500,viewHeight:2200};
const render=c=>qa.render(scene,{camera:c,levelId:'0',paintedLevels:['0'],seconds:0,reducedMotion:true});
const attrs=tag=>Object.fromEntries([...tag.matchAll(/\b([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
const patterns=html=>[...html.matchAll(/<pattern\b[^>]*data-homeworld-foundation-paint-v90="([^"]*)"[^>]*>[\s\S]*?<\/pattern>/g)].map(m=>({id:m[1],node:m[0],attrs:attrs(m[0].slice(0,m[0].indexOf('>')+1))}));
const group=(html,id)=>[...html.matchAll(/<g\b[^>]*data-homeworld-exposed-ground-edge-v81="([^"]*)"[^>]*>[\s\S]*?<\/g>/g)].find(m=>m[1]===id)?.[0];
const origin=pattern=>{
 const values=/^translate\(([-\d.e]+) ([-\d.e]+)\)$/.exec(pattern.attrs.patternTransform);
 assert(values,'translation only, no image shear or rotation');return{x:Number(values[1]),y:Number(values[2])};
};
const near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);

test('the observed lower market bridge now samples native rock, not a second global cornice row',()=>{
 const html=render(camera),pattern=patterns(html).find(p=>p.id==='market:4:1');assert(pattern);
 const p=origin(pattern),image=attrs(pattern.node.match(/<image\b[^>]*>/)[0]);
 // Real capture point (800,917), camera(-480,692), zoom.405 is near
 // world(1451,2156). Its old global 525px row sampled source Y~95 (cornice).
 const observedWorldY=2156,oldSourceY=(observedWorldY%525)*foundation.sourceHeight/525;
 const actualSourceY=(observedWorldY-p.y)*foundation.sourceHeight/Number(image.height);
 assert(oldSourceY<130);assert(actualSourceY>300&&actualSourceY<450,'lower cornice phase remains');
 assert(observedWorldY<p.y+Number(pattern.attrs.height),'another vertical row must start outside the face');
 near(p.y,1929.2243436667434);near(p.x,1250);
});

test('actual market face retains its exact V81 quad, floor-edge stroke, depth and immutable native pixels',()=>{
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),foundation.sha256);
 assert.equal(bytes.readUInt32BE(16),1774);assert.equal(bytes.readUInt32BE(20),887);
 const html=render(camera),node=group(html,'market:4:1');assert(node);
 const points='2230,2000.3478217742731 1250,1929.2243436667434 1250,2229.224343666743 2230,2300.347821774273';
 assert.equal((node.match(new RegExp('points="'+points+'"','g'))??[]).length,2);
 assert(node.includes('fill="#1c1510"'));assert(node.includes('d="M2230 2000.3478217742731L1250 1929.2243436667434"'));
 assert(html.includes('z-index:-11500'));
});

test('all six floor levels paint one local vertical row at uniform native scale without changing exposed edges',()=>{
 let checked=0;
 for(const level of world.HOMEWORLD_LEVELS_V77){
  const c={x:-3000,y:-3000,viewWidth:18000,viewHeight:14000};
  const html=qa.render(scene,{camera:c,levelId:level.id,paintedLevels:[level.id],seconds:0,reducedMotion:true});
  const actual=patterns(html),edges=back.HOMEWORLD_EXPOSED_EDGES_V81[level.id];assert.equal(actual.length,edges.length);
  for(const edge of edges){
   const pattern=actual.find(p=>p.id===edge.id);assert(pattern);const p=origin(pattern),[a,b]=back.homeworldProjectEdgeV81(edge);
   near(p.x,Math.min(a.x,b.x));near(p.y,Math.min(a.y,b.y));
   const rowHeight=Number(pattern.attrs.height),drop=back.homeworldFoundationDepthV81(level.id);
   assert(rowHeight>Math.abs(b.y-a.y)+drop,'repeat period falls inside a tall/sloped face');
   assert(rowHeight>525,'native previous row must not overlap the actual face');
   const image=attrs(pattern.node.match(/<image\b[^>]*>/)[0]);
   near(Number(image.width)/1774,Number(image.height)/887);assert.equal(Number(image.width),1050);
   assert.equal(Number(image.height),525);assert.equal(image.href,foundation.src);
   assert.equal(image.x,'0');assert.equal(image.y,'0');assert.equal(pattern.attrs.patternUnits,'userSpaceOnUse');
   assert.equal((pattern.node.match(/<image\b/g)??[]).length,1);assert(group(html,edge.id));checked++;
  }
 }
 assert(checked>100,'actual exposed faces, not a lone synthetic rectangle');
});

test('a moving observation camera neither scrolls nor rephases the same native foundation face',()=>{
 const first=patterns(render(camera)).find(p=>p.id==='market:4:1');
 const second=patterns(render({...camera,x:camera.x+100,y:camera.y+80})).find(p=>p.id==='market:4:1');
 assert(first&&second);assert.deepEqual(first.attrs,second.attrs);assert.equal(first.node,second.node);
});

test('the actual SSR paint server rasterizes its locally anchored source rock at the captured lower-bridge point',async()=>{
 const html=render(camera),pattern=patterns(html).find(p=>p.id==='market:4:1'),face=group(html,'market:4:1');assert(pattern&&face);
 const dataUrl='data:image/png;base64,'+bytes.toString('base64');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="1375 2100 200 100"><defs>${pattern.node.replace(foundation.src,dataUrl)}</defs>${face}</svg>`;
 // This is a librsvg raster of the real emitted SVG, not a browser screenshot.
 const {data,info}=await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 assert.equal(info.width,200);assert.equal(info.height,100);
 const i=(56*info.width+75)*4,actual=[data[i],data[i+1],data[i+2],data[i+3]];
 const p=origin(pattern),sourceX=Math.floor((1450-p.x)*1774/1050),sourceY=Math.floor((2156-p.y)*887/525);
 const expected=await sharp(bytes).extract({left:sourceX,top:sourceY,width:1,height:1}).ensureAlpha().raw().toBuffer();
 assert.equal(actual[3],255);assert(expected[3]>=240,'retained source rock, not a transparent gap');
 const base=[28,21,16],alpha=expected[3]/255;
 for(let channel=0;channel<3;channel++){
  const composite=expected[channel]*alpha+base[channel]*(1-alpha);
  assert(Math.abs(actual[channel]-composite)<20,'SVG content did not follow face-local origin');
 }
});
