import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import React from 'react';
import sharp from 'sharp';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';

const qa=homeworldSceneSsrV78(),art=qa.load('app/game/systems/homeworldRegionalWatchArtV86.ts');
const region=qa.load('app/game/systems/homeworldRegionsV68.ts');
const geometry=qa.load('app/game/systems/homeworldGeometryV64.ts');
const life=qa.load('app/game/systems/homeworldVillageLifeV69.ts');
const source=art.HOMEWORLD_REGIONAL_WATCH_ART_V86;
const before=JSON.stringify(region.HOMEWORLD_REGIONS_V68);
const query=(id,resident=region.HOMEWORLD_REGIONS_V68[id].residents.find(n=>n.id==='watcher-b'))=>
 ({regionId:id,clanName:region.HOMEWORLD_REGIONS_V68[id].clan,resident});

test('actual clan and watch job bindings apply only to stationary classic adults, without changing any resident',()=>{
 let assigned=0;
 for(const[id,definition]of Object.entries(region.HOMEWORLD_REGIONS_V68))for(const resident of definition.residents){
  const choices=art.regionalWatchVariantsV86(query(id,resident));
  if(resident.id==='watcher-b'){
   assigned++;assert.equal(choices.length,2);assert.equal(choices[0].sourceRole,'sentinelle');
   for(const candidate of choices){assert.equal(candidate.clanName,definition.clan);assert.equal(candidate.regionId,id);assert.equal(candidate.lifeStage,'adult');assert.equal(candidate.morphId,resident.morphId);assert.equal(candidate.kind,'npc');}
  }else assert.deepEqual(choices,[],id+'/'+resident.id+' must retain its original body');
 }
 assert.equal(assigned,source.bindings.length);assert.equal(assigned,Object.keys(region.HOMEWORLD_REGIONS_V68).length);
 assert.equal(JSON.stringify(region.HOMEWORLD_REGIONS_V68),before);
});

test('a walking-route pause, mismatched role/clan/morphology and foreign variants never borrow a static guard',()=>{
 const good=query('storm-chain'),variants=art.regionalWatchVariantsV86(good);
 assert(art.regionalWatchArtV86(good));
 for(const changed of[
  {...good,moving:true},{...good,clanName:'Maisons des Braises'},
  {...good,resident:{...good.resident,morphId:'super'}},{...good,resident:{...good.resident,morphId:'young'}},
  {...good,resident:{...good.resident,role:'Soigneuse'}},
  {...good,resident:{...good.resident,route:[good.resident.route[0],{x:500,y:2800}]},moving:false},
  {...good,assetId:source.profiles.find(p=>p.regionId==='ash-marches').assetId},
  {...good,assetId:'not-installed'},
 ])assert.equal(art.regionalWatchArtV86(changed),null);
 assert.equal(art.regionalWatchArtV86({...good,assetId:variants[1].assetId}),variants[1]);
 const html=qa.render('app/game/HomeworldRegionalWatchV86.tsx',{query:{...good,moving:true},children:React.createElement('span',{'data-preserved-body':'classic'})});
 assert.match(html,/data-preserved-body="classic"/);assert.doesNotMatch(html,/data-homeworld-regional-watch-v86/);
});

test('installed native PNGs retain exact bytes, RGBA transparency, full figure margins and the documented sole socket',async()=>{
 const manifest=JSON.parse(fs.readFileSync('.work-local/recent-sprites-v85/source-metadata/guards-v4/YAUTJA_CLANS_V4_100_GARDES/MANIFESTE.json','utf8'));
 for(const profile of source.profiles){
  const bytes=fs.readFileSync('public'+profile.src),original=manifest.sprites.find(p=>p.id===profile.identityId);
  assert(original);assert.equal(createHash('sha256').update(bytes).digest('hex'),profile.sha256);assert.equal(profile.sha256,original.sha256);
  const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.equal(info.width,profile.width);assert.equal(info.height,profile.height);assert.equal(info.channels,4);
  let left=info.width,top=info.height,right=0,bottom=0,transparent=0,min=255,max=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
   const alpha=data[(y*info.width+x)*4+3];min=Math.min(min,alpha);max=Math.max(max,alpha);if(alpha===0)transparent++;
   if(alpha>=16){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x+1);bottom=Math.max(bottom,y+1);}
  }
  assert.deepEqual({left,top,right,bottom},profile.boundsAlpha16);assert.deepEqual([min,max],profile.alphaRange);assert.equal(min,0);
  assert(left>0&&top>0&&right<info.width&&bottom<info.height,'no significant figure pixel clipped at a canvas edge: '+profile.assetId);
  assert.equal(Number((transparent/(info.width*info.height)).toFixed(6)),profile.fullyTransparentFraction);
  assert.deepEqual(profile.pivotPixels,original.pivotPixels);assert.equal(profile.bodyHeightPixels,original.soleY-original.bodyTopY);
 }
});

test('full source canvas has one uniform scale, unchanged sole origin and no simulated walk or facing mirror',()=>{
 const q=query('storm-chain'),profile=art.regionalWatchArtV86(q),p=art.regionalWatchPlacementV86(profile);
 assert.equal(p.left+profile.pivotPixels.x*p.scale,0);assert.equal(p.top+profile.soleY*p.scale,0);
 assert(Math.abs(p.width/p.height-profile.width/profile.height)<1e-10);assert(Math.abs(p.top+profile.bodyTopY*p.scale+100)<1e-10);
 const html=qa.render('app/game/HomeworldRegionalWatchV86.tsx',{query:q,children:React.createElement('span',{'data-preserved-body':'classic'})});
 assert.match(html,/data-native-clip="single-pose-static"/);assert.match(html,/data-native-frame="0"/);
 assert(html.includes(profile.src));assert(html.includes(profile.sha256));assert.doesNotMatch(html,/walk-|background-position|scaleX|data-preserved-body/);
 const explicit=qa.render('app/game/HomeworldRegionalWatchV86.tsx',{query:{...q,assetId:'not-installed'},children:React.createElement('span',{'data-preserved-body':'classic'})});
 assert.match(explicit,/data-preserved-body="classic"/);assert.doesNotMatch(explicit,/data-homeworld-regional-watch-v86/);
});

test('the genuine regional renderer mounts one native static watcher at the existing ground origin and preserves player/mobile actors',()=>{
 const save=qa.load('app/game/save.ts').defaultSave('2026-10-07T18:00:00.000Z');
 for(const[id,definition]of Object.entries(region.HOMEWORLD_REGIONS_V68)){
  const watcher=definition.residents.find(n=>n.id==='watcher-b');
  const checkpoint=region.createHomeworldRegionV68(id,'QA-native-watch',true);
  // In the shore layouts the eastern side belongs to a house foundation.
  // Use the unchanged public northern approach, not an invalid save fixture.
  checkpoint.actor={...checkpoint.actor,x:watcher.x,y:watcher.y-120};
  assert(region.isHomeworldRegionWalkableV68(id,'village',checkpoint.actor,checkpoint.tick));
  assert(region.normalizeHomeworldRegionV68(checkpoint),'genuine checkpoint must survive readback');
  const html=qa.render('app/game/HomeworldRegionV68.tsx',{save,regionId:id,checkpoint,onCheckpoint:()=>true,onReachCity:()=>true});
  assert.equal((html.match(/data-homeworld-regional-watch-v86=/g)??[]).length,1,id);
  assert.match(html,/data-homeworld-regional-watch-v86="watcher-b"/);assert.match(html,/data-region-player/);
  assert(html.includes('data-region-resident="watcher-b" style="left:'+watcher.x+'px;top:'+watcher.y*geometry.HOMEWORLD_GEOMETRY_V64.depthScale+'px;z-index:'+Math.round(watcher.y)));
  assert(html.includes('data-region-resident="watcher-a"'));assert(html.includes('data-body-morph="super"'));
  assert(html.includes('data-modular-homeworld-character'));
  // The watcher sits at the village's western edge. The dynamic community is
  // culled outside that camera; inspect it from its actual first resident pose.
  const citizen=life.HOMEWORLD_VILLAGE_LIFE_V69[id].residents[0];
  const pose=life.homeworldVillageResidentPoseV69(id,citizen,checkpoint.tick);
  const citizenView={...checkpoint,actor:{...checkpoint.actor,x:pose.x+100,y:pose.y}};
  const nearby=qa.render('app/game/HomeworldRegionV68.tsx',{save,regionId:id,checkpoint:citizenView,onCheckpoint:()=>true,onReachCity:()=>true});
  assert(nearby.includes('data-region-village-resident-v69="'+citizen.id+'"'));
  assert(nearby.includes('data-life-moving="true"'));assert(nearby.includes('data-modular-homeworld-character'));
 }
 assert.equal(JSON.stringify(region.HOMEWORLD_REGIONS_V68),before);
});
