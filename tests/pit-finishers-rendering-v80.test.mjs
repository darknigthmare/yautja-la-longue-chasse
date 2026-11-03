import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';
const loader=homeworldSceneSsrV78();
const p=loader.load('app/game/systems/pitFinishersV80.ts');
const combat=loader.load('app/game/systems/pitCombat.ts');
const bitmap=loader.load('app/game/pitCombatBitmapArt.ts');
const render=loader.load('app/game/pitFinisherRenderingV80.ts');
const {PitFinisherHudV80:Hud}=loader.load('app/game/PitFinisherHudV80.tsx');
const options={mode:'stylized',reducedGore:false,reducedMotion:false,narrative:false,replay:false,cpuWinner:false};
function scene(choice=0,patch={}){return{...p.createPitFinisherViewV80(),phase:'signature',key:'render-only',profile:p.getPitFinisherProfileV80('jungle-hunter'),winnerSlot:0,choice,durationMs:2000,elapsedMs:1500,options,nonlethal:false,...patch};}
function context(){const calls=[],stack=[];return{calls,globalAlpha:1,save(){stack.push(this.globalAlpha);},restore(){this.globalAlpha=stack.pop();},translate(...args){calls.push(['translate',...args]);},rotate(...args){calls.push(['rotate',...args]);},scale(...args){calls.push(['scale',...args]);},drawImage(...args){calls.push(['drawImage',...args]);},beginPath(){},ellipse(...args){calls.push(['ellipse',...args]);},fill(){},stroke(){},moveTo(){},lineTo(){},quadraticCurveTo(){},arc(){},setLineDash(){},fillText(...args){calls.push(['text',...args]);}};}

test('HUD renders four actionable choices, CPU disables manual choices, skip and noncanonical policy stay visible without QA prose',()=>{
 for(const cpuWinner of [false,true]){
  const view=scene(0,{phase:'window',durationMs:5000,elapsedMs:200,options:{...options,cpuWinner},nonlethal:true});
  const html=renderToStaticMarkup(React.createElement(Hud,{view,onChoose(){throw Error('SSR is not input');},onSkip(){throw Error('SSR is not input');}}));
  assert.equal((html.match(/data-pit-finisher-choice=/g)||[]).length,4);assert.equal((html.match(/disabled=""/g)||[]).length,cpuWinner?4:0);
  assert.match(html,/NEUTRALISATION/);assert.match(html,/data-pit-finisher-skip/);assert.match(html,/J1/);
 }
 const html=renderToStaticMarkup(React.createElement(Hud,{view:scene(),onChoose(){},onSkip(){}}));
 assert.match(html,/Conclusion du duel en cours/);assert.match(html,/SIMULATION HORS CANON/);assert.doesNotMatch(html,/Chorégraphie|nouvelle planche|certifiée/);
 assert.equal(renderToStaticMarkup(React.createElement(Hud,{view:scene(0,{phase:'complete'}),onChoose(){},onSkip(){}})),'');
});

test('native renderer consumes actual delivered plate registrations and cannot mutate combat or fabricate a missing fighter',()=>{
 const c=combat.createPitCombatState('jungle-hunter','city-hunter'),before=combat.serializePitCombat(c),images=new Map();
 for(const fighter of c.fighters){
  const art=bitmap.getPitCombatBitmapArtDefinition(fighter.definitionId),bytes=fs.readFileSync('public'+art.src);
  assert.equal(bytes.subarray(1,4).toString(),'PNG');assert.equal(bytes.readUInt32BE(16),art.width);assert.equal(bytes.readUInt32BE(20),art.height);
  // Canvas command recorder references real bytes/dimensions, not a claim of
  // PNG decoding, raster output, browser visibility or newly authored poses.
  images.set(fighter.definitionId,{src:art.src,naturalWidth:art.width,naturalHeight:art.height,complete:true});
 }
 const bank={images,readyIds:new Set(images.keys()),requestedIds:new Set(images.keys()),failedIds:new Set(),cancelled:false};
 for(const choice of [0,1,2,3]){
  const ctx=context(),view=scene(choice);assert(render.drawPitFinisherActorsV80(ctx,c,view,bank));
  const draws=ctx.calls.filter(call=>call[0]==='drawImage');assert.equal(draws.length,2);assert.deepEqual(new Set(draws.map(call=>call[1].src)),new Set([...images.values()].map(image=>image.src)));
  assert(ctx.calls.some(call=>call[0]==='ellipse'&&call[2]===combat.PIT_ARENAS[c.arenaId].groundY+1));assert.equal(combat.serializePitCombat(c),before);
 }
 const missing=context();assert(render.drawPitFinisherActorsV80(missing,c,scene(),null));assert.equal(missing.calls.filter(call=>call[0]==='drawImage').length,0);assert.equal(missing.calls.filter(call=>call[0]==='text').length,2);
});

test('whole native envelope stays above unchanged floor after rigid rotation; reduced motion never rotates or translates actors',()=>{
 const c=combat.createPitCombatState('jungle-hunter','city-hunter'),g=combat.PIT_ARENAS[c.arenaId].groundY;
 for(const fighter of c.fighters)for(const angle of [-Math.PI/2,-.7,-.1,.1,.7,Math.PI/2]){
  const bounds=bitmap.getPitCombatBitmapVisualBounds(fighter,g),foot=g-fighter.y,lift=render.pitFinisherRotationLiftV80(bounds,fighter.x,foot,angle);
  for(const x of [bounds.x,bounds.x+bounds.width])for(const y of [bounds.y,bounds.y+bounds.height])assert((x-fighter.x)*Math.sin(angle)+(y-foot)*Math.cos(angle)-lift<=1e-9);
 }
 assert.equal(render.pitFinisherRotationLiftV80(null,0,430,1),0);
 const ctx=context();render.drawPitFinisherActorsV80(ctx,c,scene(1,{options:{...options,reducedMotion:true}}),null);
 assert.deepEqual(ctx.calls.filter(call=>call[0]==='rotate').map(call=>call[1]),[0,0]);
 const source=fs.readFileSync('app/game/PitCanvas.tsx','utf8');assert.match(source,/pitFinisherIsSceneV80\(finisherV80\)[\s\S]{0,120}advancePitPresentationCamera\(null, combat, \{ reducedMotion: true \}\)/);
});
