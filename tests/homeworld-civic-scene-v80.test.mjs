import test from 'node:test';
import assert from 'node:assert/strict';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';

const qa=homeworldSceneSsrV78(),load=id=>qa.load('app/game/systems/'+id+'.ts');
const world=load('homeworldWorldV77'),civic=load('homeworldCivicDecorV80'),layers=load('homeworldVisualLayersV78');
const camera={x:-5000,y:-10000,viewWidth:25000,viewHeight:25000};
const props={actor:world.createHomeworldWorldActorV77(),camera,seconds:0,activeDoorId:null,activePointId:null};
const tags=(html,attr)=>[...html.matchAll(new RegExp('<[^>]+\\b'+attr+'="([^"]*)"[^>]*>','g'))];
const styleOf=tag=>Object.fromEntries((/style="([^"]*)"/.exec(tag)?.[1]??'').split(';').filter(Boolean).map(s=>{const i=s.indexOf(':');return[s.slice(0,i),s.slice(i+1)];}));

test('real SSR paints exactly the occupied floor ground and each actual civic source uniformly, with no related-floor floating facade',()=>{
 for(const level of world.HOMEWORLD_LEVELS_V77){
  const html=qa.render('app/game/HomeworldWorldSceneV77.tsx',{...props,levelId:level.id});
  assert.deepEqual(tags(html,'data-homeworld-level-ground-v77').map(m=>m[1]),[level.id]);
  assert.deepEqual(tags(html,'data-homeworld-ground-union-v80').map(m=>m[1]),[level.id]);
  for(const ground of tags(html,'data-world-ground-id-v77')){assert(ground[0].includes('stroke="none"'));assert(ground[0].includes('opacity="1"'));}
  for(const building of tags(html,'data-building-id'))assert.equal(/data-world-level-v77="([^"]+)"/.exec(building[0])?.[1],level.id);
  // V81 preserves the civic renderer/provider but authors new frontage IDs.
  // Select the mounted art family so historical ID spellings cannot hide it.
  const actual=tags(html,'data-homeworld-prop-id').filter(m=>/data-homeworld-art-id="civic-native-v80:/.test(m[0]));
  const expected=civic.HOMEWORLD_CIVIC_PROPS_V80.filter(p=>p.levelId===level.id);
  assert.equal(actual.length,expected.length,'each civic source mounts exactly once on its occupied floor');
  assert.deepEqual(new Set(actual.map(m=>m[1])),new Set(expected.map(p=>p.id)));
  for(const item of expected){const tag=actual.find(m=>m[1]===item.id)[0],s=styleOf(tag),paint=civic.homeworldCivicPaintV80(item),art=civic.HOMEWORLD_CIVIC_ART_V80[item.artId];
   assert.equal(parseFloat(s.left),paint.left);assert.equal(parseFloat(s.top),paint.top);
   assert.equal(parseFloat(s.width),paint.width);assert.equal(parseFloat(s.height),paint.height);
   assert(Math.abs(parseFloat(s.width)/art.sourceRect.width-parseFloat(s.height)/art.sourceRect.height)<1e-12,'native civic cells scale uniformly');
   assert.equal(Number(s['z-index']),layers.homeworldSceneDepthV78(item.y,level.elevation));
   const start=html.indexOf(tag),node=html.slice(start,html.indexOf('</span>',start));assert(node.includes('src="'+art.src+'"'));
   assert(node.includes('data-native-source-rect="'+[art.sourceRect.x,art.sourceRect.y,art.sourceRect.width,art.sourceRect.height].join(',')+'"'));
   assert.doesNotMatch(node,/rotate\(|scaleX\(-1\)/);
  }
 }
});

test('real physical transit paints exactly its two endpoint floors and keeps their civic solids above source-aligned support',()=>{
 for(const connector of world.HOMEWORLD_CONNECTORS_V77){
  const actor={...world.createHomeworldWorldActorV77(),...connector.from.point},transit=world.beginHomeworldTransitV77(connector.from.levelId,actor);assert(transit,connector.id);
  assert.equal(transit.connectorId,connector.id);
  const html=qa.render('app/game/HomeworldWorldSceneV77.tsx',{...props,actor,levelId:connector.from.levelId,transit:{...transit,elapsed:connector.duration/2}});
  assert.deepEqual(new Set(tags(html,'data-homeworld-level-ground-v77').map(m=>m[1])),new Set([connector.from.levelId,connector.to.levelId]));
  for(const item of civic.HOMEWORLD_CIVIC_PROPS_V80){const visible=item.levelId===connector.from.levelId||item.levelId===connector.to.levelId;
   assert.equal(html.includes('data-homeworld-prop-id="'+item.id+'"'),visible,connector.id+' '+item.id);
  }
 }
});
