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
export {pollGamepad,stepGame,updatePlayer,isHeld,makeGameState,snapshot};
export {default as HuntRitualMeterV112} from "./HuntRitualMeterV112";
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
function fixture(settings=profile()){
  browser.focused=true;browser.hidden=false;browser.pads=[];
  const save=api.defaultSave("2026-10-28T00:00:00.000Z"),mission=api.MISSION_BY_ID["jungle-vey"];
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
