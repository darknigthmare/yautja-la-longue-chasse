import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';

const variant = (id, nativeFacing = 'right') => ({ id, label: id, src: `/game/sprites/v44/${id}.png`, width: 8, height: 12, pivot: [4,11], bodyTopY: 1, nativeFacing, sha256: 'a'.repeat(64), sourceArchive:'fixture.zip',sourceEntry:`${id}.png` });
const fixture = {schemaVersion:1,fighters:[
 {id:'city-hunter',name:'City Hunter',sourceLabel:'Fixture canon name from supplied source',variants:[variant('city-masked'),variant('city-unmasked','left')]},
 {id:'user-test-hunter',name:'Test hunter',sourceLabel:'User supplied test',variants:[variant('user-mask'),variant('user-bare','left')]},
 {id:'user-other-hunter',name:'Other hunter',sourceLabel:'User supplied test',variants:[variant('other-mask','neutral')]},
],exclusions:[]};
const built = await build({stdin:{contents:[
 "export * from './app/game/systems/pitUserRoster';", "export * from './app/game/systems/pitCombat';",
 "export * from './app/game/systems/pitRosterExpansion';", "export * from './app/game/systems/pitReplay';",
 "export * from './app/game/systems/pitTrainingLessons';", "export * from './app/game/pitCombatBitmapArt';",
 "export * from './app/game/pitSpriteSheetAnimation';",
].join('\n'),resolveDir:process.cwd(),loader:'ts'},plugins:[{name:'user-fixture',setup(b){
 b.onResolve({filter:/pitUserHuntersV44\.json$/},()=>({path:'roster',namespace:'fixture'}));
 b.onResolve({filter:/pitSpriteSheetRegistry$/},()=>({path:'registry',namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},({path})=>path==='registry'?{contents:'export const PIT_SPRITE_SHEET_REGISTRY=[];',loader:'js'}:{contents:JSON.stringify(fixture),loader:'json'});
}}],bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const p=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));

test('one identity per supplied hunter; merged variants preserve original profile and progression restrictions',()=>{
 assert.equal(p.PIT_VERSUS_FIGHTER_IDS.filter(id=>id==='city-hunter').length,1);
 assert.deepEqual(p.PIT_USER_FIGHTER_IDS,['user-test-hunter','user-other-hunter']);
 assert.equal(p.getPitFighterVariants('city-hunter').length,2);
 assert.equal(p.PIT_FIGHTERS['city-hunter'].maxHealth,970);
 assert.equal(p.getPitUserVariant('user-test-hunter','other-mask'),null);
 assert.equal(p.isPitUserFighterId('user-missing'),false);
 for(const id of p.PIT_USER_FIGHTER_IDS){
  for(const mode of ['cpu','local','training'])assert(p.canPitFighterEnterMode(id,mode));
  for(const mode of ['arcade','circuit','descent'])assert.equal(p.canPitFighterEnterMode(id,mode),false);
  assert.equal(p.getPitFighterProfile(id).gameplayAdaptation,'shared-balanced-duel');
  assert.equal(p.PIT_FIGHTERS[id].technique.motion,'attached');
 }
});

test('creation, round transition, rematch, restore and training preserve owned variants',()=>{
 const options={variants:['user-bare','city-unmasked']};
 const initial=p.createPitCombatState('user-test-hunter','city-hunter',options);
 assert.deepEqual(initial.fighters.map(f=>f.variantId),options.variants);
 assert.deepEqual(p.rematchPitCombat(initial).fighters.map(f=>f.variantId),options.variants);
 assert.deepEqual(p.deserializePitCombat(p.serializePitCombat(initial)),initial);
 const unspecified=structuredClone(initial);delete unspecified.fighters[0].variantId;
 assert.equal(p.deserializePitCombat(JSON.stringify(unspecified)).fighters[0].variantId,'user-mask');
 const foreign=structuredClone(initial);foreign.fighters[0].variantId='city-masked';
 assert.throws(()=>p.deserializePitCombat(JSON.stringify(foreign)));
 assert.equal(p.createPitCombatState('user-test-hunter','city-hunter',{variants:['city-masked','user-mask']}).fighters[0].variantId,'user-mask');
 assert.equal(p.createPitCombatState().fighters[0].variantId,undefined);
 const round=structuredClone(initial);round.roundFramesRemaining=1;round.fighters[1].health=1;
 let next=p.stepPitCombat(round,[{},{}]);
 for(let i=0;i<121;i++)next=p.stepPitCombat(next,[{},{}]);
 assert.equal(next.round,2);assert.deepEqual(next.fighters.map(f=>f.variantId),options.variants);
 const lesson=p.preparePitTrainingLesson(p.createPitCombatState('user-test-hunter','city-hunter',{...options,mode:'training'}),'guard-low');
 assert.equal(lesson.state.fighters[0].variantId,'user-bare');
});

test('replays retain costume deterministically and reject foreign or tampered variants',()=>{
 const opts={fighters:['user-test-hunter','city-hunter'],variants:['user-bare','city-unmasked']};
 const recorder=p.createPitReplayRecorder(opts);let state=p.createPitCombatState(...opts.fighters,{variants:opts.variants});
 for(let tick=0;tick<300;tick++) {const inputs=tick%24===0?[{attack:'heavy'},{}]:[{right:true},{}];recorder.append(inputs);state=p.stepPitCombat(state,inputs);}
 const replay=recorder.finish();assert.deepEqual(replay.variants,opts.variants);
 const restored=p.deserializePitReplay(p.serializePitReplay(replay));
 assert.deepEqual(p.playPitReplay(restored),state);
 const tampered=structuredClone(replay);tampered.variants[0]='user-mask';assert.equal(p.normalizePitReplay(tampered),null);
 const foreign=structuredClone(replay);foreign.variants[0]='city-masked';assert.equal(p.normalizePitReplay(foreign),null);
 assert.throws(()=>p.createPitReplayRecorder({...opts,variants:['city-masked',null]}));
 assert.equal(p.recordPitReplay([[{},{}]]).variants,undefined);
});

function browser(mode='normal'){
 const old={Image:globalThis.Image,document:globalThis.document},requests=[];
 globalThis.Image=class{complete=true;naturalWidth=8;naturalHeight=12;set src(value){this.source=value;if(value){requests.push(value);queueMicrotask(()=>this.onload?.());}}get src(){return this.source;}};
 globalThis.document={createElement(){return{width:0,height:0,getContext(){return{drawImage(){},getImageData(){const data=new Uint8ClampedArray(8*12*4);if(mode==='opaque'){for(let i=3;i<data.length;i+=4)data[i]=255;}else if(mode!=='empty')data[3]=255;return{data};}};}};}};
 return{requests,restore(){globalThis.Image=old.Image;globalThis.document=old.document;}};
}

test('static variant loads only chosen images, accepts original edge alpha, never reuses stale costume',async()=>{
 const b=browser();try{
  const ids=['user-test-hunter','city-hunter'];const variants=['user-bare','city-unmasked'];
  const bank=await p.loadPitCombatBitmapArt(ids,{variants,spriteSheetRegistry:[]});
  assert.deepEqual(b.requests,variants.map(id=>`/game/sprites/v44/${id}.png`));
  assert(p.isPitCombatBitmapSelectionRequested(bank,ids[0],variants[0]));
  assert.equal(p.isPitCombatBitmapSelectionRequested(bank,ids[0],'user-mask'),false);
  assert.equal(p.getPitCombatBitmapArtStatus(bank,ids[0],'user-mask'),'loading');
  assert.equal(p.getPitCombatBitmapArtStatus(bank,ids[0],variants[0]),'static-bitmap');
  assert.equal(bank.spriteSheets.requestedIds.size,2);
  assert.equal(bank.spriteSheets.readyClipCount,0);
  const fighter=p.createPitCombatState(...ids,{variants}).fighters[0];
  assert.equal(p.resolvePitSpriteSheetAnimation(bank.spriteSheets,fighter),null);
  assert.equal(p.resolvePitSpriteSheetHold(bank.spriteSheets,fighter),null);
  assert.equal(p.getPitSpriteSheetAnimationVisualBounds(fighter,500,[]),null);
  const calls=[];const context={globalAlpha:1,save(){},restore(){},translate(){},scale(...args){calls.push(args)},drawImage(){}};
  assert(p.drawPitCombatBitmapFighter(context,bank,fighter,500));assert(calls[0][0]<0,'native left is mirrored for left slot facing right');
  fighter.facing=-1;p.drawPitCombatBitmapFighter(context,bank,fighter,500);assert(calls[1][0]>0,'right opponent preserves native left');
  assert.equal(p.drawPitCombatBitmapFighter(context,bank,{...fighter,variantId:'user-mask'},500),false);
 }finally{b.restore();}
});
for(const mode of ['empty','opaque'])test(`supplied ${mode} alpha cannot be advertised as loaded`,async()=>{const b=browser(mode);try{const bank=await p.loadPitCombatBitmapArt(['user-test-hunter'],{spriteSheetRegistry:[]});assert.equal(p.getPitCombatBitmapArtStatus(bank,'user-test-hunter'),'missing');assert.equal(bank.images.size,0);}finally{b.restore();}});