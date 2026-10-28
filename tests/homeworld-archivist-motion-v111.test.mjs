import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {buildArchivistArtV111,inspectArchivistDrawingV111} from '../scripts/build-homeworld-archivist-art-v111.mjs';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';
import {archivePlaqueRouteV109} from './helpers/archive-plaque-v109-route.mjs';
const qa=homeworldSceneSsrV78(),api=qa.load('app/game/systems/homeworldArchivistMotionV111.ts');
const manifest=api.HOMEWORLD_ARCHIVIST_MOTION_V111;

test('four independent native whole-body PNGs retain their untouched raw bytes and measured alpha registration',async()=>{
  assert.deepEqual(await buildArchivistArtV111(),manifest);
  assert.equal(manifest.frames.length,4);assert.equal(new Set(manifest.frames.map(f=>f.pixelSha256)).size,4);
  assert.deepEqual(manifest.closedCatalogue354Ids,[]);assert.equal(manifest.sourceCompletion,false);
  const receipt=JSON.parse(await fs.readFile(manifest.generationReceipt,'utf8'));
  const review=JSON.parse(await fs.readFile(manifest.visualReview,'utf8'));
  assert.equal(receipt.receipts.length,5);assert.equal(receipt.receipts.filter(row=>row.status==='selected').length,4);
  assert.equal(review.selectedImagesOpened,4);assert.equal(review.allGeneratedOutputsOpened,5);assert.equal(review.browserVerification,false);
  for(const frame of manifest.frames){
    const bytes=await fs.readFile('public'+frame.src);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),frame.sha256);
    assert.equal(frame.sourceWidth,1024);assert.equal(frame.sourceHeight,1536);assert.equal(frame.alpha.visibleBorderPixels,0);
    assert.deepEqual(bytes,await fs.readFile(frame.raw));
  }
  // The first indication was not padded or alpha-corrected to pass admission.
  await assert.rejects(inspectArchivistDrawingV111('art-source/v111/archivist-conversation/rejected/indicate-gutter-r1.png'),/entire native figure/);
});

test('local decorative clock is bounded, suspends without catch-up and never advances while inactive or hidden',()=>{
  let clock=api.createArchivistClockV111();
  clock=api.sampleArchivistClockV111(clock,100,true);assert.equal(clock.elapsedMs,0);
  clock=api.sampleArchivistClockV111(clock,125,true);assert.equal(clock.elapsedMs,25);
  clock=api.sampleArchivistClockV111(clock,10000,true);assert.equal(clock.elapsedMs,75,'long elapsed gaps are capped at50ms');
  clock=api.sampleArchivistClockV111(clock,11000,false);assert.equal(clock.elapsedMs,75);assert.equal(clock.previousTimestamp,null);
  clock=api.sampleArchivistClockV111(clock,20000,true);assert.equal(clock.elapsedMs,75,'resuming establishes a fresh timestamp');
  clock=api.suspendArchivistClockV111(clock);clock=api.sampleArchivistClockV111(clock,50000,true);assert.equal(clock.elapsedMs,75);
  clock=api.sampleArchivistClockV111(clock,NaN,true);assert.equal(clock.previousTimestamp,null);assert.equal(clock.elapsedMs,75);
  for(let i=0;i<100;i++)clock=api.sampleArchivistClockV111(clock,60000+i*50,true);
  assert.equal(clock.elapsedMs,1200);
  const times=[0,219,220,519,520,819,820,1099,1100,1200,Infinity];
  assert.deepEqual(times.map(t=>api.homeworldArchivistFrameV111(t).id),['listen','listen','explain','explain','indicate','indicate','return','return','listen','listen','listen']);
  assert.equal(api.homeworldArchivistFrameV111(700,false).id,'listen');assert.equal(api.homeworldArchivistFrameV111(700,true,true).id,'listen');
});

test('actual drawing renders the entire native canvas at one uniform positive scale with its measured foot pivot',()=>{
  const Drawing=qa.load('app/game/HomeworldArchivistMotionV111.tsx').HomeworldArchivistDrawingV111;
  for(const [index,elapsedMs] of [0,220,520,820].entries()){
    const f=manifest.frames[index],p=api.homeworldArchivistPlacementV111(f.id,148),scale=148/manifest.nativeHeight;
    assert(Math.abs(p.width/f.sourceWidth-p.height/f.sourceHeight)<1e-14);assert.equal(p.width,1024*scale);
    assert.equal(p.left,-f.pivot.x*scale);assert.equal(p.top,-f.pivot.y*scale);
    const html=renderToStaticMarkup(React.createElement(Drawing,{elapsedMs,heightWorld:148}));
    assert(html.includes('data-homeworld-archivist-frame-v111="'+f.id+'"'));
    assert(html.includes('width="1024" height="1536"'));assert(html.includes('data-native-mirror-v111="false"'));
    assert(!/transform:|filter:|clip-path:|object-fit:|background-position:/.test(html));
  }
  assert.equal(api.homeworldArchivistPlacementV111('missing'),null);assert.equal(api.homeworldArchivistPlacementV111('listen',-1),null);
});

test('situated K-17 preserves physical pieces and only reveals the fragment after the real source reprise',()=>{
  const route=archivePlaqueRouteV109(),render=()=>route.qa.render('app/game/HomeworldArchivePlaqueWorldV111.tsx',{levelId:'0',ledger:route.state().ledger,seconds:0,archivistActiveV111:true,archivistPausedV111:false,archivistSequenceV111:'actual-line'});
  const initial=render();assert(initial.includes('data-plaque-host-v109'));assert(initial.includes('data-plaque-object-v109="plaque"'));assert(initial.includes('data-plaque-object-v109="trace"'));assert(!initial.includes('data-plaque-object-v109="fragment"'));
  assert(initial.includes('data-archivist-native-ready="false"'),'SSR cannot pretend a browser has decoded a PNG');
  assert(initial.includes('data-archivist-active-v111="true"'));assert(initial.includes('data-archivist-paused-v111="false"'));
  route.beforeMismatch();assert(!render().includes('data-plaque-object-v109="fragment"'));
  route.action('interrupt',{active:false});route.action('resume');const html=render();assert(html.includes('data-plaque-object-v109="fragment"'));
  for(const o of route.state().ledger.receipt.objects){assert(html.includes('data-plaque-object-v109="'+o.id+'" data-plaque-placement-v109="'+o.place+'" data-world-x="'+o.x+'" data-world-y="'+o.y+'"'));}
  assert.equal(route.qa.render('app/game/HomeworldArchivePlaqueWorldV111.tsx',{levelId:'interior',ledger:route.state().ledger,seconds:0}),'');
});

test('dialogue portrait reuses the same native component and keeps an honest original fallback before decode',()=>{
  const html=qa.render('app/game/HomeworldArchivistPortraitV111.tsx',{active:true,paused:false,reducedMotion:false,sequenceKey:'D6-W-PNJ-ROLE-03-REPONSE---01'});
  assert(html.includes('aria-hidden="true" data-homeworld-archivist-portrait-v111'));
  assert(html.includes('width:160px;height:188px'));assert(html.includes('data-archivist-native-ready="false"'));
  assert(!html.includes('data-homeworld-archivist-frame-v111='));
  assert.equal(api.HOMEWORLD_ARCHIVIST_SCENE_SOURCES_V111.length,4,'world and portrait do not create eight assets');
});

test('V111 source note describes the four conversation drawings while the rest of the source UI stays exact',()=>{
  const route=archivePlaqueRouteV109();route.action('open');route.action('choose-a');route.action('reply');
  const props={ledger:route.state().ledger,disabled:false,message:'',onAction:()=>false,onClose(){}};
  const old=route.qa.render('app/game/HomeworldArchivePlaqueV109.tsx',props),current=route.qa.render('app/game/HomeworldArchivePlaqueV111.tsx',props);
  const previous='Le corps de l’archiviste réutilise les dessins existants. Aucun nouveau geste de main, de parole ou de manipulation du PNJ n’est certifié.';
  const note='Quatre dessins natifs de discussion ont été réalisés pour l’archiviste : écoute, explication, désignation des surfaces séparées et conclusion. Ils gardent une seule orientation et ne montrent aucune marche ni manipulation d’objet par le PNJ.';
  assert(old.includes(previous));assert(current.includes(note));assert(!current.includes(previous));assert.equal(current,old.replace(previous,note));
});
