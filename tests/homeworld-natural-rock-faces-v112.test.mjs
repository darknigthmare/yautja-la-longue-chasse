import test from 'node:test';
import assert from 'node:assert/strict';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';

const qa=homeworldSceneSsrV78(),load=name=>qa.load('app/game/systems/'+name+'.ts');
const api=load('homeworldNaturalRockFacesV112');
const rectangle=(left,top,right,bottom)=>[{x:left,y:top},{x:right,y:top},{x:right,y:bottom},{x:left,y:bottom}];
const formation={id:'fixture',polygon:rectangle(0,0,100,100)};

test('V112 natural fronts remain attached to their source top edge and use no second piece below an intervening floor',()=>{
  const plain=api.homeworldNaturalRockFacesV112(formation,[],1,300);
  assert.equal(plain.length,1);assert.deepEqual(plain[0].top,[{x:0,y:100},{x:100,y:100}]);
  assert.deepEqual(plain[0].polygon,[{x:0,y:100},{x:100,y:100},{x:100,y:400},{x:0,y:400}]);
  const floor={polygon:rectangle(-10,180,110,260)};
  const clipped=api.homeworldNaturalRockFacesV112(formation,[floor],1,300);
  assert.equal(clipped.length,1);assert(clipped[0].polygon.every(point=>point.y<=180.00001));
  assert.deepEqual(clipped[0].top,plain[0].top);
  assert(!clipped.some(face=>face.polygon.some(point=>point.y>=260)),'a global mask must never reveal a second floating strip below the floor');
  assert.deepEqual(api.homeworldNaturalRockFacesV112(formation,[{polygon:rectangle(-10,90,110,150)}],1,300),[],'an occluded upper edge cannot produce a detached face');
});

test('V112 sweeps floor corners and sloping boundaries without exposing faces through the first paved surface',()=>{
  const floor={polygon:[{x:25,y:150},{x:75,y:200},{x:75,y:280},{x:25,y:230}]};
  const faces=api.homeworldNaturalRockFacesV112(formation,[floor],1,300);
  assert.equal(faces.length,3);
  const middle=faces.find(face=>Math.abs(face.top[0].x-25)<1e-7&&Math.abs(face.top[1].x-75)<1e-7);
  assert(middle);assert(Math.abs(middle.polygon[3].y-150)<.001);assert(Math.abs(middle.polygon[2].y-200)<.001);
  assert.equal(faces[0].drop,300);assert.equal(faces[2].drop,300);
  for (const face of faces) {
    assert.deepEqual(face.polygon.slice(0,2),face.top);
    assert.deepEqual(face.paintTop,[{x:0,y:100},{x:100,y:100}],'segments of one native edge must share one texture phase instead of repeating its first pillar');
    assert.equal(face.paintDrop,300);
    assert(face.polygon[3].y>=face.top[0].y&&face.polygon[2].y>=face.top[1].y);
  }
});

test('the real causeway witness has no retained old floating quad and every natural face paints from one local native source row',()=>{
  const history=load('homeworldNaturalSupportsV85'),natural=load('homeworldNaturalPlacementsV112'),geometry=load('homeworldGeometryV64');
  const old=history.HOMEWORLD_NATURAL_SUPPORT_TERRACES_V85.find(row=>row.id==='v75:threshold:thermal-caves');
  assert.equal(old.groundId,'urban-v78:port-court:4','record the legacy decorative anchor separately from the real canyon dock');
  const witness=natural.HOMEWORLD_NATURAL_SUPPORT_TERRACES_V112.find(row=>row.id==='v75:threshold:thermal-caves');
  assert.equal(witness.groundId,'rampart-low-causeway:1');
  const faces=api.homeworldNaturalRockFacesV112(witness,natural.HOMEWORLD_NATURAL_PUBLIC_GROUND_V112,geometry.HOMEWORLD_GEOMETRY_V64.depthScale);
  const oldTop=[{x:5903.194444444444,y:2812.4762493279526},{x:5720.75,y:2932.696353052986}];
  assert(!faces.some(face=>face.top.some(point=>Math.abs(point.x-oldTop[0].x)<.01)&&face.drop===300),'the old uncut front may not reappear through the viaduct');
  const world=load('homeworldWorldV77'),camera={x:4700,y:2450,viewWidth:1600,viewHeight:1100};
  const html=qa.render('app/game/HomeworldWorldSceneV77.tsx',{actor:{x:5500,y:5400},levelId:'0',camera,seconds:0,activeDoorId:null,activePointId:null});
  const patterns=[...html.matchAll(/<pattern[^>]*data-natural-face-paint-v112="[^"]+"[^>]*>/g)].map(match=>match[0]);
  assert(patterns.length>20);
  for (const pattern of patterns) {
    assert(pattern.includes('patternTransform="translate('));assert(pattern.includes('data-native-vertical-rows-v112="1"'));
    assert(!pattern.includes('rotate(')&&!pattern.includes('scale('),'native pixels must retain their uniform upright source orientation');
  }
  for (const face of faces) {
    const textured=html.indexOf('data-natural-rock-face-v112="'+face.id+'"');assert(textured>=0);
    const underlay=[...html.matchAll(/<polygon[^>]*data-natural-rock-underlay-v112="[^"]+"[^>]*>/g)].find(match=>match[0].includes('data-natural-rock-underlay-v112="'+face.id+'"'));
    assert(underlay,'native source transparency must not punch sky holes through the structural face');
    assert(underlay[0].includes('fill="#1c1510"'));
    assert(underlay[0].includes('points="'+face.polygon.map(point=>`${point.x},${point.y}`).join(' ')+'"'));
    assert(underlay.index<textured,'the unchanged native source must paint above its structural backing');
  }
  const groups=Map.groupBy(faces,face=>face.edgeIndex);
  for (const group of groups.values()) {
    const transforms=group.map(face=>patterns.find(pattern=>pattern.includes('data-natural-face-paint-v112="'+face.id+'"'))).map(pattern=>/patternTransform="([^"]+)"/.exec(pattern)?.[1]);
    assert.equal(new Set(transforms).size,1,'clipping one edge cannot restart the same native pillar at every pavement vertex');
  }
  assert.deepEqual(world.HOMEWORLD_REGIONAL_DOCKS_V77.find(dock=>dock.regionId==='thermal-caves').point,{x:460,y:3600});
});
