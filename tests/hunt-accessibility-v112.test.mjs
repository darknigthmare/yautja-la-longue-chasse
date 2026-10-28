import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";
import {readFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
import {runInNewContext} from "node:vm";
import ts from "typescript";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
const source=await readFile(new URL("../app/game/HuntCanvas.tsx",import.meta.url),"utf8");
const built=await build({stdin:{contents:source.replace("export default function HuntCanvas","function HuntCanvas")+`
export {pollGamepad,stepGame,updatePlayer,isHeld,makeGameState,snapshot,resultFor,makeEnemy,damageEnemy,riteContextV77,routeCorpseRiteGamepadV112,flushCorpseRiteGamepadV112};
export {default as HuntRitualMeterV112} from "./HuntRitualMeterV112";
export {default as HuntRitesMenuV77} from "./HuntRitesMenuV77";
export {huntRiteMenuSnapshotV77} from "./systems/huntRitesRuntimeV77";
export {createRitesOfHuntV77,registerRitePreyV77,startHuntRiteV77,stepHuntRiteV77,RITE_DURATIONS_V77} from "./systems/ritesOfHuntV77";
export {flayingToolWorkMultiplierV112} from "./systems/harvestInventoryV112";
export * from "./systems/huntAccessibilityV112";
export * from "./systems/trophyRitual";
export {defaultSave,normalizeSave,parseSaveImport} from "./save";
export {MISSION_BY_ID} from "./data";
`,resolveDir:fileURLToPath(new URL("../app/game/",import.meta.url)),loader:"tsx"},
  bundle:true,write:false,platform:"node",format:"cjs",jsx:"automatic",loader:{".module.css":"empty"},
  external:["react","react/jsx-runtime","react-dom"],logLevel:"silent"});
const browser={focused:true,hidden:false,pads:[]},module={exports:{}};
runInNewContext(built.outputFiles[0].text,{module,exports:module.exports,require:createRequire(import.meta.url),
  document:{get hidden(){return browser.hidden},hasFocus:()=>browser.focused},navigator:{getGamepads:()=>browser.pads},TextEncoder,TextDecoder});
const api=module.exports;
const plain=value=>JSON.parse(JSON.stringify(value));
const profile=patch=>({...api.normalizeHuntAccessibilityV112(undefined),...patch});
function input(settings=profile()){
  return {accessibility:settings,keyboardHeld:new Set(),touchHeld:new Set(),gamepadHeld:new Set(),pressed:new Set(),previousGamepadButtons:[],activeGamepadIndex:null,gamepadNeedsNeutral:false,gamepadDialogActions:[],pointerScreen:null};
}
function fixture(settings=profile(),{fieldToolOwned=false}={}){
  browser.focused=true;browser.hidden=false;browser.pads=[];
  const save=api.defaultSave("2026-10-28T00:00:00.000Z"),mission=api.MISSION_BY_ID["jungle-vey"];
  if(fieldToolOwned)save.inventory.fieldToolIds=["flaying-tool"];
  const game=api.makeGameState(mission,save.loadout,save.inventory,"hunter",save.appearance,false,false,"a11y-v112",save.exploration);
  game.world={...game.world,platforms:[],climbables:[],hazards:[]};game.enemies=[];game.boss.active=false;
  Object.assign(game.player,{x:100,y:508,previousY:508,velocityX:0,velocityY:0,grounded:true,climbing:false});
  game.huntAccessibility=settings;
  const controls=input(settings);
  return {save,mission,game,input:controls,step:()=>api.stepGame(game,mission,save.loadout,save.inventory,save.appearance,"hunter",controls,1/60,()=>{})};
}
function advance(state,seconds,mode="normal",action=null){return api.stepTrophyRitual(state,seconds,action,mode);}
function assist(state,patch={}){return api.stepRitualAssistV112(state,{cueKey:"seed:0",phase:"cue",cueElapsedSeconds:.5,deltaSeconds:.05,mode:"press",timing:"normal",event:null,...patch});}
test("old and future profiles receive safe defaults without input latches or grants",()=>{
  for(const value of [undefined,null,[],{}, {version:2,ritualTiming:"unlimited"}]){
    const settings=api.normalizeHuntAccessibilityV112(value);
    assert.deepEqual(plain(settings),plain(api.DEFAULT_HUNT_ACCESSIBILITY_V112));
  }
  const save=api.defaultSave();delete save.settings.huntAccessibility;
  const normalized=api.normalizeSave(save);
  assert.deepEqual(plain(normalized.settings.huntAccessibility),plain(profile()));
  assert.deepEqual(plain(normalized.inventory),plain(save.inventory));
});
test("accessibility settings survive ordinary save export/import",()=>{
  const save=api.defaultSave();save.settings.huntAccessibility=profile({ritualTiming:"unlimited",ritualConfirm:"toggle",gripInput:"toggle",aimInput:"toggle",fieldGuide:false});
  const imported=api.parseSaveImport(JSON.stringify(save));
  assert.equal(imported.failure,null);assert.ok(imported.save);
  assert.deepEqual(plain(imported.save.settings.huntAccessibility),plain(save.settings.huntAccessibility));
});
test("malformed flags and duplicate/out-of-range gamepad buttons normalize safely",()=>{
  for(const mapping of [{jump:0},{...api.DEFAULT_HUNT_GAMEPAD_V112,jump:2},{...api.DEFAULT_HUNT_GAMEPAD_V112,jump:12},{...api.DEFAULT_HUNT_GAMEPAD_V112,jump:NaN}]){
    const result=api.normalizeHuntAccessibilityV112({version:1,gamepadButtons:mapping,fieldGuide:"yes",largeGlyphs:0,ritualTiming:"cheat"});
    assert.deepEqual(plain(result.gamepadButtons),plain(api.DEFAULT_HUNT_GAMEPAD_V112));assert.equal(result.fieldGuide,true);assert.equal(result.largeGlyphs,true);assert.equal(result.ritualTiming,"normal");
  }
});
test("every controller rebind is a permutation retaining all twelve actions",()=>{
  let settings=profile();
  for(const action of api.HUNT_GAMEPAD_ACTIONS_V112)for(let button=0;button<12;button++){
    const before=settings,oldButton=settings.gamepadButtons[action],other=api.HUNT_GAMEPAD_ACTIONS_V112.find(id=>settings.gamepadButtons[id]===button);
    settings=api.rebindHuntGamepadV112(settings,action,button);
    assert.equal(settings.gamepadButtons[action],button);assert.equal(settings.gamepadButtons[other],oldButton);
    assert.equal(new Set(Object.values(settings.gamepadButtons)).size,12);assert.notEqual(settings,before);
  }
});
test("hold latches use rising edges, release cleanly and reset while a physical button remains held",()=>{
  let state=api.stepHoldTogglesV112(undefined,{up:true,aim:true});assert.equal(state.upLatched,true);assert.equal(state.aimLatched,true);
  state=api.stepHoldTogglesV112(state,{up:true,aim:true});assert.equal(state.upLatched,true);
  state=api.stepHoldTogglesV112(state,{up:false,aim:false});state=api.stepHoldTogglesV112(state,{up:true,aim:true});assert.equal(state.upLatched,false);
  state=api.stepHoldTogglesV112(state,{up:true,aim:true},true);state=api.stepHoldTogglesV112(state,{up:true,aim:true});assert.equal(state.upLatched,false);
  state=api.stepHoldTogglesV112(state,{up:false,aim:false});state=api.stepHoldTogglesV112(state,{up:true,aim:true});assert.equal(state.upLatched,true);
});
test("standard timing is unchanged, generous timing accepts later, unlimited timing still requires correct glyph",()=>{
  let base=api.createTrophyRitual("a11y",3);base=advance(base,1.8).state;
  assert.equal(advance(base,1.2,"normal",base.sequence[0]).accepted,false);
  assert.equal(advance(base,1.2,"generous",base.sequence[0]).accepted,true);
  assert.equal(advance(base,500,"unlimited",null).state.mistakes,0);
  const late=advance(base,500,"unlimited",base.sequence[0]);assert.equal(late.accepted,true);
  assert.equal(late.state.cueIndex,1);
  const wrong=base.sequence[0]==="left"?"right":"left";
  assert.equal(advance(base,500,"unlimited",wrong).mistakeAdded,true);
});
test("press confirmation is one explicit event, never an automatic stream",()=>{
  let result=assist(api.freshRitualAssistV112(),{event:"press"});assert.equal(result.confirm,true);
  result=assist(result.state);assert.equal(result.confirm,false);
  result=assist(result.state,{cueKey:"seed:1"});assert.equal(result.confirm,false);
});
test("hold confirmation needs sustained input and never carries into next glyph",()=>{
  let state=api.freshRitualAssistV112(),confirmed=false;
  for(let i=0;i<8;i++){const result=assist(state,{mode:"hold",event:i===0?"down":null});state=result.state;confirmed||=result.confirm;if(i<6)assert.equal(result.confirm,false);}
  assert.equal(confirmed,true);
  assert.equal(assist(state,{mode:"hold",cueKey:"seed:1"}).confirm,false);
  let released=assist(api.freshRitualAssistV112(),{mode:"hold",event:"down"}).state;
  released=assist(released,{mode:"hold",event:"up"}).state;
  for(let i=0;i<30;i++){const result=assist(released,{mode:"hold"});released=result.state;assert.equal(result.confirm,false);}
});
test("toggle confirmation can disarm and requires a fresh arm on every glyph",()=>{
  let result=assist(api.freshRitualAssistV112(),{mode:"toggle",event:"press",cueElapsedSeconds:.1});assert.equal(result.state.armed,true);assert.equal(result.confirm,false);
  result=assist(result.state,{mode:"toggle",event:"press",cueElapsedSeconds:.2});assert.equal(result.state.armed,false);
  result=assist(result.state,{mode:"toggle",event:"press",cueElapsedSeconds:.5});assert.equal(result.confirm,true);
  result=assist(result.state,{mode:"toggle",cueKey:"seed:1",cueElapsedSeconds:1});assert.equal(result.confirm,false);
  result=assist(result.state,{mode:"toggle",event:"press",cueElapsedSeconds:.1});
  result=assist(result.state,{mode:"toggle",event:"cancel",cueElapsedSeconds:1});assert.equal(result.confirm,false);assert.equal(result.state.armed,false);
});
test("ready phase never advances a confirmation, even when armed",()=>{
  const result=assist(api.freshRitualAssistV112(),{phase:"ready",mode:"toggle",event:"press",cueElapsedSeconds:99});
  assert.equal(result.confirm,false);assert.equal(result.state.armed,true);
});
test("production controller polling uses remapped actions and held jump/aim",()=>{
  const settings=api.rebindHuntGamepadV112(profile(),"jump",2),controls=input(settings);
  const pad={index:1,connected:true,axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};
  browser.pads=[pad];api.pollGamepad(controls);controls.gamepadNeedsNeutral=false;
  pad.buttons[2]={pressed:true,value:1};api.pollGamepad(controls);
  assert.equal(controls.pressed.has("jump"),true);assert.equal(controls.pressed.has("melee"),false);assert.equal(controls.gamepadHeld.has("jump"),true);
  controls.pressed.clear();api.pollGamepad(controls);assert.equal(controls.pressed.size,0);
  pad.buttons[2]={pressed:false,value:0};pad.buttons[settings.gamepadButtons.aim]={pressed:true,value:1};api.pollGamepad(controls);
  assert.equal(controls.gamepadHeld.has("aim"),true);
  browser.pads=[];
});
test("real fixed-step input keeps vertical axes physical while grip and aim can latch",()=>{
  const f=fixture(profile({gripInput:"toggle",aimInput:"toggle"}));
  f.input.keyboardHeld.add("up");f.input.keyboardHeld.add("aim");f.step();
  assert.equal(f.input.holdTogglesV112.upLatched,true);assert.equal(api.isHeld(f.input,"aim"),true);
  f.input.keyboardHeld.clear();f.step();
  assert.equal(api.isHeld(f.input,"up"),false);assert.equal(api.isHeld(f.input,"aim"),true);
  f.input.keyboardHeld.add("up");f.step();assert.equal(f.input.holdTogglesV112.upLatched,false);assert.equal(f.input.gripReleaseV112,true);
});
test("pause and focus loss disarm production hold toggles and pending confirmations",()=>{
  for(const reason of ["pause","blur"]){
    const f=fixture(profile({gripInput:"toggle",aimInput:"toggle",ritualConfirm:"toggle"}));
    f.input.keyboardHeld.add("up");f.input.keyboardHeld.add("aim");f.step();assert.equal(f.input.holdTogglesV112.upLatched,true);
    f.input.ritualAssistEventV112="press";
    if(reason==="pause")f.input.pressed.add("pause");else browser.focused=false;
    f.step();assert.equal(f.game.paused,true);assert.equal(f.input.holdTogglesV112.upLatched,false);assert.equal(f.input.holdTogglesV112.aimLatched,false);assert.equal(f.input.ritualAssistEventV112,null);
    browser.focused=true;
  }
});

test("production snapshot uses the selected timing scale and unlimited meter stays static",()=>{
  const f=fixture(profile({ritualTiming:"generous"}));
  f.game.trophyExtracting=true;
  f.game.trophyRitual=advance(advance(api.createTrophyRitual("meter",3),1.8).state,.54,"generous").state;
  assert.ok(Math.abs(api.snapshot(f.game,f.mission).trophyCueTiming-.25)<1e-9);
  f.game.huntAccessibility=profile({ritualTiming:"normal"});
  assert.ok(Math.abs(api.snapshot(f.game,f.mission).trophyCueTiming-.5)<1e-9);
  f.game.huntAccessibility=profile({ritualTiming:"unlimited"});
  const first=api.snapshot(f.game,f.mission).trophyCueTiming;
  f.game.trophyRitual.cueElapsedSeconds=999;
  assert.equal(first,1);assert.equal(api.snapshot(f.game,f.mission).trophyCueTiming,first);
});
test("real cue meter distinguishes finite progress from an explicitly unlimited static band",()=>{
  const timed=renderToStaticMarkup(createElement(api.HuntRitualMeterV112,{progress:.5,mode:"generous"}));
  assert.match(timed,/role="progressbar"/);assert.match(timed,/aria-valuenow="50"/);assert.match(timed,/fenêtre large/);
  const unlimited=renderToStaticMarkup(createElement(api.HuntRitualMeterV112,{progress:.01,mode:"unlimited"}));
  assert.match(unlimited,/Sans limite par glyphe/);assert.match(unlimited,/width:100%/);
  assert.doesNotMatch(unlimited,/aria-valuenow/);assert.doesNotMatch(unlimited,/role="progressbar"/);
});
test("real settings callback preserves freshly confirmed inventory and successive preference patches before React rerenders",async()=>{
  const client=await readFile(new URL("../app/game/GameClient.tsx",import.meta.url),"utf8");
  const ast=ts.createSourceFile("GameClient.tsx",client,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let declaration;
  const visit=node=>{if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==="updateSettings")declaration=node;else ts.forEachChild(node,visit);};
  visit(ast);assert.ok(declaration&&ts.isCallExpression(declaration.initializer));
  const callbackSource=declaration.initializer.arguments[0].getText(ast);
  const js=ts.transpileModule("const callback="+callbackSource+";",{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
  const stale=api.defaultSave("2026-10-28T00:00:00.000Z"),confirmed=structuredClone(stale);
  confirmed.profile.clanMarks=17;confirmed.inventory.fieldToolIds=["flaying-tool"];
  confirmed.inventory.harvestV112={...confirmed.inventory.harvestV112,toolCondition:40};
  const saveRef={current:confirmed},calls=[];
  const callback=runInNewContext("(()=>{"+js+";return callback;})()",{save:stale,saveRef,persist(next){calls.push(next);saveRef.current=next;}});
  callback({huntAccessibility:profile({ritualTiming:"unlimited"})});
  callback({effectsVolume:.2});
  assert.equal(calls.length,2);assert.equal(saveRef.current.profile.clanMarks,17);
  assert.deepEqual(plain(saveRef.current.inventory),plain(confirmed.inventory));
  assert.equal(saveRef.current.settings.huntAccessibility.ritualTiming,"unlimited");assert.equal(saveRef.current.settings.effectsVolume,.2);
});

test("flaying duration preview and real menu match the timed operation for sharp, worn and blunt tools",()=>{
  for(const condition of [100,40,0]){
    const multiplier=api.flayingToolWorkMultiplierV112(condition);
    const proof={id:"duration-prey",sourceEnemyId:"hell-hound-stalker",label:"Proie de contrôle",kind:"beast",
      x:400,y:600,health:0,defeated:true,active:true,worthy:true,protectedPrey:false,defeatedAt:0,integrity:100,massKg:70};
    let state=api.createRitesOfHuntV77("jungle-vey:duration-test","jungle-vey");
    const context={runId:state.runId,missionId:state.missionId,actor:{x:400,y:600},health:160,suspended:false,
      grounded:true,climbing:false,flayingToolOwned:true,toolWorkMultiplier:multiplier,prey:[proof],supports:[],acceptSpecimen:()=>true};
    const registered=api.registerRitePreyV77(state,proof,context);assert.equal(registered.accepted,true);state=registered.state;
    const preview=api.huntRiteMenuSnapshotV77(state,context.actor,proof.id,true,
      {flayingToolOwned:true,toolWorkMultiplier:multiplier,acceptSpecimen:()=>true});
    assert.ok(preview);assert.equal(preview.open,true);assert.equal(preview.canFlay,true);
    const expected=api.RITE_DURATIONS_V77.flay*Math.max(1,Math.min(1.65,multiplier));
    assert.ok(Math.abs(preview.flaySeconds-expected)<1e-9,"preview must expose the actual worn-tool duration");
    const markup=renderToStaticMarkup(createElement(api.HuntRitesMenuV77,{menu:preview,onOpen(){},onClose(){},onAction(){}}));
    const label=/Dépecer · (\d+(?:[,.]\d+)?) s/.exec(markup);
    assert.ok(label,"the real corpse menu must display the flaying duration");
    assert.equal(Number(label[1].replace(",",".")),Number(expected.toFixed(1)));
    const started=api.startHuntRiteV77(state,proof.id,"flay",context);assert.equal(started.accepted,true,started.message);state=started.state;
    const step=.01;let elapsed=0;
    while(state.operation&&elapsed<7){
      if(elapsed+step<expected-1e-8)assert.equal(state.corpses[0].flayed,false);
      state=api.stepHuntRiteV77(state,step,context).state;elapsed+=step;
    }
    assert.equal(state.operation,null);assert.equal(state.corpses[0].flayed,true);
    assert.ok(elapsed+1e-8>=preview.flaySeconds&&elapsed<=preview.flaySeconds+step+1e-8,
      "completion must occur at the previewed duration within one fixed tick");
    assert.equal(state.completedEventIds.filter(id=>id==="flay:"+proof.id).length,1);
  }
});

test("the native score formula has no direct accessibility modifier and still counts elapsed hunt time",()=>{
  // This probes synthetic result inputs, not completion of a campaign hunt.
  const scoreAt=(settings,timeMultiplier)=>{
    const f=fixture(settings),state=f.game;
    state.elapsed=f.mission.parTimeSeconds*timeMultiplier;
    state.player.health=state.player.maxHealth*.7;
    state.damageTaken=state.player.maxHealth-state.player.health;
    state.kills=2;state.scans=1;state.honor=12;state.trophyQuality="blooded";
    state.completedObjectives=new Set([f.mission.objectives[0].id]);
    const {completedAt,...result}=api.resultFor(state,f.mission,"hunter","success");
    assert.equal(typeof completedAt,"string");
    return plain(result);
  };
  const baseline=scoreAt(profile(),2),baselineSlower=scoreAt(profile(),4);
  assert.ok(baselineSlower.score<baseline.score,"the existing formula must retain its elapsed-time effect");
  for(const ritualTiming of ["normal","generous","unlimited"])for(const ritualConfirm of ["press","hold","toggle"]){
    const settings=profile({ritualTiming,ritualConfirm});
    const actual=scoreAt(settings,2),slower=scoreAt(settings,4);
    assert.deepEqual(actual,baseline,"identical mission facts must give the same result under "+ritualTiming+"/"+ritualConfirm);
    assert.deepEqual(slower,baselineSlower);
    assert.ok(slower.elapsedSeconds>actual.elapsedSeconds);
    assert.ok(slower.score<actual.score,"spending more real hunt time still affects the announced time score");
  }
});

function corpsePadFixture(settings=profile()){
  const f=fixture(settings,{fieldToolOwned:true});
  f.game.world={...f.game.world,covers:[]};
  const enemy=api.makeEnemy("pad-real-prey","hell-hound-stalker",f.mission.id,110,f.game.world.width,80,10,0,1,1);
  Object.assign(enemy,{x:110,y:564,width:40,height:60,health:80,maxHealth:80,knockbackRestY:564,scanned:true,active:true});
  f.game.enemies=[enemy];api.damageEnemy(f.game,f.mission,enemy,80,"melee");
  const pad={index:3,connected:true,axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};
  browser.pads=[pad];f.step();
  const action=(name,on)=>{const index=settings.gamepadButtons[name];pad.buttons[index]={pressed:on,value:on?1:0};};
  const release=()=>{pad.axes.fill(0);pad.buttons.forEach(button=>{button.pressed=false;button.value=0;});f.step();};
  const open=()=>{pad.axes[1]=1;action("interact",true);f.step();};
  return {...f,pad,action,release,open,corpseId:enemy.id};
}
test("native down+remapped interact opens a real corpse without dropping a carried body or starting its trophy",()=>{
  const remapped=api.rebindHuntGamepadV112(api.rebindHuntGamepadV112(profile(),"interact",7),"jump",2);
  for(const settings of [profile(),remapped]){
    const f=corpsePadFixture(settings);
    const started=api.startHuntRiteV77(f.game.huntRites,f.corpseId,"flay",api.riteContextV77(f.game));
    assert.equal(started.accepted,true,started.message);f.game.huntRites=started.state;f.game.riteOperationDamageStart=f.game.damageTaken;
    for(let frame=0;frame<210;frame++)f.step();
    assert.equal(f.game.huntRites.corpses[0].flayed,true);
    const carried=api.startHuntRiteV77(f.game.huntRites,f.corpseId,"carry",api.riteContextV77(f.game));
    assert.equal(carried.accepted,true,carried.message);f.game.huntRites=carried.state;
    const before=f.game.elapsed;f.open();
    assert.equal(f.game.riteMenuCorpseId,f.corpseId);assert.equal(f.game.huntRites.carryingCorpseId,f.corpseId);
    assert.equal(f.game.player.climbing,false);assert.equal(f.game.player.grounded,true);
    assert.equal(f.game.trophyExtracting,false);assert.equal(f.game.paused,false);assert.ok(f.game.elapsed>before);
    for(let frame=0;frame<3;frame++)f.step();
    assert.equal(f.game.huntRites.carryingCorpseId,f.corpseId);assert.equal(f.game.trophyExtracting,false);
    assert.deepEqual(plain(f.input.gamepadRiteActionsV112),[]);
  }
});
test("corpse pad navigation is edge-triggered while the real rite, clock and enemy keep advancing",()=>{
  const f=corpsePadFixture();f.open();f.release();
  const observer=api.makeEnemy("pad-live-observer","rifle-soldier",f.mission.id,1000,f.game.world.width,100,10,0,1,1);
  observer.active=true;observer.attackCooldown=1;f.game.enemies.push(observer);
  const started=api.startHuntRiteV77(f.game.huntRites,f.corpseId,"flay",api.riteContextV77(f.game));
  assert.equal(started.accepted,true,started.message);f.game.huntRites=started.state;f.game.riteOperationDamageStart=f.game.damageTaken;
  const before=f.game.elapsed,x=f.game.player.x,stamina=f.game.player.stamina;
  f.pad.axes[0]=1;f.action("melee",true);f.step();
  assert.equal(f.game.player.x,x);assert.equal(f.game.player.melee.phase,"idle");assert.ok(f.game.player.stamina>=stamina);
  assert.equal(f.game.paused,false);assert.ok(f.game.elapsed>before);assert.ok(observer.attackCooldown<1);
  assert.equal(f.game.huntRites.operation.action,"flay");assert.ok(f.game.huntRites.operation.elapsed>0);
  f.release();f.pad.axes[1]=1;f.step();f.step();
  assert.deepEqual(plain(f.input.gamepadRiteActionsV112),["next"],"holding the pad direction must not repeat menu navigation");
  f.input.gamepadRiteActionsV112.length=0;f.release();f.action("jump",true);f.step();
  assert.deepEqual(plain(f.input.gamepadRiteActionsV112),["activate"]);
  assert.equal(f.game.player.grounded,true);assert.equal(f.game.huntRites.operation.action,"flay");
});
test("corpse menu close cancels safely, requires controller release and preserves ordinary trophy interaction",()=>{
  const f=corpsePadFixture();assert.ok(f.game.regularTrophyDrops.length>0,"the real defeated source has a physical secondary trophy");
  f.open();f.release();
  const started=api.startHuntRiteV77(f.game.huntRites,f.corpseId,"flay",api.riteContextV77(f.game));
  f.game.huntRites=started.state;f.game.riteOperationDamageStart=f.game.damageTaken;
  f.action("interact",true);f.step();
  assert.equal(f.game.riteMenuCorpseId,null);assert.equal(f.game.huntRites.operation,null);assert.equal(f.game.trophyExtracting,false);
  assert.equal(f.input.gamepadNeedsNeutral,true);
  f.step();assert.equal(f.game.trophyExtracting,false,"holding close must not harvest behind the menu");
  f.release();assert.equal(f.input.gamepadNeedsNeutral,false);
  f.action("interact",true);f.step();
  assert.equal(f.game.riteMenuCorpseId,null);assert.equal(f.game.trophyExtracting,true,"interact alone retains the existing physical trophy priority");
});
test("corpse pad suppression keeps simultaneous keyboard and touch actions, including overlapping fresh edges",()=>{
  const f=corpsePadFixture();f.open();f.release();
  f.pad.axes[0]=-1;f.input.keyboardHeld.add("right");f.step();assert.ok(f.game.player.velocityX>0);
  f.input.keyboardHeld.clear();f.pad.axes[0]=1;f.input.touchHeld.add("left");f.game.player.velocityX=0;f.step();assert.ok(f.game.player.velocityX<0);
  f.input.touchHeld.clear();f.pad.axes[0]=0;f.input.pressed.add("melee");f.action("melee",true);f.step();
  assert.notEqual(f.game.player.melee.phase,"idle","a keyboard/touch edge already present is not owned or deleted by the pad");
  for(const origin of ["keyboard","touch","pad"]){
    const toggled=corpsePadFixture(profile({aimInput:"toggle"}));
    if(origin==="pad")toggled.action("aim",true);else toggled.input[origin==="keyboard"?"keyboardHeld":"touchHeld"].add("aim");
    toggled.step();assert.equal(toggled.input.holdTogglesV112.aimLatched,true);
    if(origin==="pad")toggled.action("aim",false);else toggled.input[origin==="keyboard"?"keyboardHeld":"touchHeld"].delete("aim");
    toggled.step();toggled.open();
    assert.equal(toggled.game.player.aiming,origin!=="pad","only controller-owned toggles are suppressed in the corpse menu");
    toggled.release();toggled.action("interact",true);toggled.step();
    assert.equal(toggled.input.holdTogglesV112.aimLatched,origin!=="pad","closing disarms only the controller toggle");
  }
});
test("opening requires a real nearby corpse and focus loss still pauses before any corpse UI action",()=>{
  const f=fixture(),pad={index:3,connected:true,axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};
  browser.pads=[pad];f.step();pad.axes[1]=1;pad.buttons[f.input.accessibility.gamepadButtons.interact]={pressed:true,value:1};f.step();
  assert.equal(f.game.riteMenuCorpseId,null);assert.deepEqual(plain(f.game.huntRites.corpses),[]);
  const real=corpsePadFixture();real.open();const elapsed=real.game.elapsed;
  browser.focused=false;real.step();assert.equal(real.game.paused,true);assert.equal(real.game.elapsed,elapsed);
  browser.focused=true;
});
