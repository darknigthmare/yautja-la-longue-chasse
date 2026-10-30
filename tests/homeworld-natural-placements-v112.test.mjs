import test from 'node:test';
import assert from 'node:assert/strict';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';

const qa=homeworldSceneSsrV78(),load=name=>qa.load('app/game/systems/'+name+'.ts');
const prior=load('homeworldNaturalPlacementsV80'),natural=load('homeworldNaturalPlacementsV112');
const outskirts=load('homeworldOutskirtsV71'),urban=load('homeworldUrbanLayoutV78'),world=load('homeworldWorldV77');
const original=JSON.stringify(prior.HOMEWORLD_NATURAL_MODULES_V80);
const polygon=item=>{const b=outskirts.homeworldOutskirtsFootprintV71(item);return urban.homeworldUrbanRectV78(b.left,b.top,b.right,b.bottom);};

test('V112 reproduces 77 natural contacts on later public paving and admits the other 315 unchanged sources without relocating or shrinking anything',()=>{
  assert.equal(prior.HOMEWORLD_NATURAL_MODULES_V80.length,392);
  const before=prior.HOMEWORLD_NATURAL_MODULES_V80.filter(item=>natural.HOMEWORLD_NATURAL_PUBLIC_GROUND_V112.some(ground=>urban.homeworldUrbanOverlapV78(polygon(item),ground.polygon)));
  assert.equal(before.length,77);
  assert.deepEqual(new Set(before.map(item=>item.id)),new Set(natural.HOMEWORLD_NATURAL_PLACEMENT_REFUSALS_V112.map(item=>item.id)));
  assert.equal(natural.HOMEWORLD_NATURAL_MODULES_V112.length,315);
  for (const item of natural.HOMEWORLD_NATURAL_MODULES_V112) {
    assert.equal(prior.HOMEWORLD_NATURAL_MODULES_V80.find(old=>old.id===item.id),item,'an admission must retain the exact source object');
    assert(!natural.HOMEWORLD_NATURAL_PUBLIC_GROUND_V112.some(ground=>urban.homeworldUrbanOverlapV78(polygon(item),ground.polygon)),item.id+' natural contact on paving');
  }
  for (const refused of natural.HOMEWORLD_NATURAL_PLACEMENT_REFUSALS_V112) {
    assert.equal(refused.reason,'NATIVE_SUPPORT_ON_PUBLIC_PAVING');assert(refused.groundIds.length>0);
    assert.equal(refused.source,prior.HOMEWORLD_NATURAL_MODULES_V80.find(item=>item.id===refused.id));
    assert.deepEqual(refused.physicalSupport,outskirts.homeworldOutskirtsFootprintV71(refused.source));
  }
  assert.equal(JSON.stringify(prior.HOMEWORLD_NATURAL_MODULES_V80),original);
  assert.deepEqual(new Set(natural.HOMEWORLD_NATURAL_MODULES_V112.map(item=>item.artId)),new Set(['basalt','resinwood','vent','retaining','thicket','marker']));
});

test('all 39 drawing formations and material masks derive solely from admitted roots, preserving deliberate native civic planters',()=>{
  assert.equal(natural.HOMEWORLD_NATURAL_SUPPORT_TERRACES_V112.length,39);
  const ids=natural.HOMEWORLD_NATURAL_SUPPORT_TERRACES_V112.flatMap(item=>item.ids);
  assert.equal(ids.length,315);assert.equal(new Set(ids).size,315);
  for (const item of natural.HOMEWORLD_NATURAL_MODULES_V112) assert(ids.includes(item.id));
  for (const item of natural.HOMEWORLD_NATURAL_PLACEMENT_REFUSALS_V112) assert(!ids.includes(item.id),'a refused root cannot leave a ghost support');
  const props=load('homeworldPublicPlacesMountV112').HOMEWORLD_PUBLIC_PLACES_V112;
  assert.equal(props.filter(item=>item.artId==='basalt-planter-left').length,2,'cultivated civic planters belong to the solid furniture provider');
  const ecotones=load('homeworldEcotonesV112');
  assert.equal(ecotones.HOMEWORLD_ECOTONES_V112.length,11);assert.equal(ecotones.HOMEWORLD_ECOTONE_REFUSALS_V112.length,3);
  for (const patch of ecotones.HOMEWORLD_ECOTONES_V112) for (const id of patch.formationIds) assert(natural.HOMEWORLD_NATURAL_SUPPORT_TERRACES_V112.some(item=>item.id===id));
  const camera={x:-2500,y:-2500,viewWidth:18000,viewHeight:18000};
  const html=qa.render('app/game/HomeworldEcotonesV112.tsx',{camera});
  const tags=[...html.matchAll(/<polygon[^>]*data-ecotone-formation-v112="([^"]+)"[^>]*>/g)];
  assert.equal(tags.length,39);
  const depth=load('homeworldGeometryV64').HOMEWORLD_GEOMETRY_V64.depthScale;
  for (const formation of natural.HOMEWORLD_NATURAL_SUPPORT_TERRACES_V112) {
    const tag=tags.find(match=>match[1]===formation.id)?.[0];assert(tag);
    assert(tag.includes('points="'+formation.polygon.map(point=>`${point.x},${point.y*depth}`).join(' ')+'"'));
  }
});

test('the current scene renders all 315 native roots exactly once, no refused sprite, and no natural plane on other floors',()=>{
  const camera={x:-2500,y:-2500,viewWidth:18000,viewHeight:18000};
  const props={actor:{x:5500,y:5400},levelId:'0',camera,seconds:0,activeDoorId:null,activePointId:null};
  const html=qa.render('app/game/HomeworldWorldSceneV77.tsx',props);
  assert(html.includes('data-homeworld-natural-admission-v112="315"'));
  const ids=[...html.matchAll(/data-homeworld-prop-id="([^"]+)"/g)].map(match=>match[1]);
  for (const item of natural.HOMEWORLD_NATURAL_MODULES_V112) assert.equal(ids.filter(id=>id===item.id).length,1,item.id);
  for (const item of natural.HOMEWORLD_NATURAL_PLACEMENT_REFUSALS_V112) assert(!ids.includes(item.id),'refused old root still rendered '+item.id);
  const formations=[...html.matchAll(/data-homeworld-natural-formation-v112="([^"]+)"/g)].map(match=>match[1]);
  assert.deepEqual(new Set(formations),new Set(natural.HOMEWORLD_NATURAL_SUPPORT_TERRACES_V112.map(item=>item.id)));
  assert.equal(formations.length,39);
  for (const levelId of ['+1','+2','-1A','-1B','-1C']) assert(!qa.render('app/game/HomeworldWorldSceneV77.tsx',{...props,levelId}).includes('data-homeworld-natural-admission-v112='));
  assert.deepEqual(world.HOMEWORLD_REGIONAL_DOCKS_V77.find(item=>item.regionId==='thermal-caves').point,{x:460,y:3600});
});

test('the live codex marks refused placements as authoring with no world footprint and retains exact admitted roots',()=>{
  const records=load('homeworldContextCodexV71').HOMEWORLD_ALL_ELEMENT_CODEX_V71;
  for (const decision of natural.HOMEWORLD_NATURAL_PLACEMENT_DECISIONS_V112) {
    const record=records.find(item=>item.id===decision.id||item.id==='prop:'+decision.id);assert(record,decision.id);
    if (decision.status==='REFUSED') {
      assert.equal(record.spaceId,'authoring:natural-refusals-v112');assert.equal(record.footprint,null);
      assert(record.constraints.some(line=>line.includes('V112 — non monté')));
    } else {
      assert.equal(record.position.x,decision.source.x);assert.equal(record.position.y,decision.source.y);
      assert.deepEqual(record.footprint,decision.physicalSupport);
    }
  }
  assert.equal(JSON.stringify(prior.HOMEWORLD_NATURAL_MODULES_V80),original,'reading the current codex must not mutate a published source collection');
});
