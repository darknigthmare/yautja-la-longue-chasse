import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
const ts=createRequire(import.meta.url)('typescript');
const source=fs.readFileSync('app/game/HuntCanvas.tsx','utf8');
const file=ts.createSourceFile('HuntCanvas.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const component=file.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='HuntCanvas');
assert(component?.body);
function expression(name){
  const found=[];
  const visit=node=>{
    if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.name.text===name&&
      (name!=='frame'||ts.isArrowFunction(node.initializer)))found.push(node.initializer.getText(file));
    if(name.includes('.')&&ts.isBinaryExpression(node)&&node.left.getText(file)===name&&
      node.operatorToken.kind===ts.SyntaxKind.EqualsToken&&ts.isArrowFunction(node.right)&&ts.isBlock(node.right.body))found.push(node.right.getText(file));
    ts.forEachChild(node,visit);
  };visit(component.body);assert.equal(found.length,1,name+' must have one actual implementation');return found[0];
}
function actual(name,context){
  const js=ts.transpileModule('this.actual='+expression(name)+';', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  runInNewContext(js,context);return context.actual;
}

test('fresh insertion gate refuses legacy/retry/passage checkpoint and dismissed encounter',()=>{
  const base={invalidResume:false,resumeSnapshot:null,resumeRetryCheckpoint:null,openingSeenRunRef:{current:null},openingRunId:'jungle-vey:3'};
  assert.equal(actual('openingActive',{...base}),true);
  for(const change of[{resumeSnapshot:{checkpoint:{elapsed:0}}},{resumeSnapshot:{checkpoint:{elapsed:127,worldScreenId:'passage'}}},
    {resumeRetryCheckpoint:{checkpoint:{elapsed:20}}},{invalidResume:true},{openingSeenRunRef:{current:'jungle-vey:3'}}]){
    assert.equal(actual('openingActive',{...base,...change}),false);
  }
});

test('actual briefing frame returns before AI, elapsed, objective and checkpoint stepping',()=>{
  let stepped=0,drawn=0,scheduled=0,persisted=0;
  const game={elapsed:0,paused:false,phase:'tracking',player:{health:100},enemies:[{id:'real-authored-enemy',x:600,health:20}],honor:0};
  const input={pressed:new Set(['weapon','jump']),gamepadDialogActions:[]};
  const runtime={alive:true,assetsLoaded:true,openingActive:true,lastTime:0,accumulator:.1,lastUiPush:0,frameId:0,lastObservedPaused:false,
    game,input,context:{},mission:{},loadout:{},appearance:{},assets:{},encounterRun:3,deviceScale:1,
    pollGamepad:()=>null,huntDialogRef:{current:null},navigateHuntDialogWithGamepad:()=>{},
    snapshot:state=>({elapsed:state.elapsed}),setUi:()=>{},renderGame:()=>drawn++,requestAnimationFrame:()=>++scheduled,
    stepGame:()=>{stepped++;game.elapsed++;game.enemies[0].x++;},emitPersistence:()=>persisted++,persistHuntRef:{current:null}};
  const frame=actual('frame',runtime);runtime.frame=frame;
  frame(1500);frame(3000);
  assert.equal(stepped,0);assert.equal(game.elapsed,0);assert.equal(game.enemies[0].x,600);
  assert.equal(game.player.health,100);assert.equal(game.honor,0);assert.equal(persisted,0);
  assert.equal(runtime.accumulator,0);assert.equal(runtime.lastTime,3000);
  assert.equal(input.pressed.size,0);assert.equal(drawn,2);assert.equal(scheduled,2);
});

test('consent clears held inputs and pending time without cancelling a real focus-loss pause',()=>{
  const input={pressed:new Set(['jump']),keyboardHeld:new Set(['right']),touchHeld:new Set(['left']),
    gamepadHeld:new Set(['jump']),previousGamepadButtons:[true],gamepadNeedsNeutral:false,gamepadDialogActions:['activate']};
  const game={paused:true,elapsed:0,jumpAssist:null};let opened=true;
  const runtime={openingActive:true,openingSeenRunRef:{current:null},openingRunId:'jungle-vey:3',
    missionOpeningActiveRef:{current:true},input,game,mission:{},lastTime:0,accumulator:.1,
    performance:{now:()=>3000},freshJumpAssistState:options=>options,snapshot:()=>({}),setUi:()=>{},
    setMissionOpeningOpen:value=>opened=value};
  actual('dismissMissionOpeningRef.current',runtime)();
  assert.equal(runtime.openingActive,false);assert.equal(runtime.missionOpeningActiveRef.current,false);assert.equal(opened,false);
  assert.equal(runtime.openingSeenRunRef.current,'jungle-vey:3');assert.equal(game.paused,true);assert.equal(game.elapsed,0);
  for(const set of ['pressed','keyboardHeld','touchHeld','gamepadHeld'])assert.equal(input[set].size,0);
  assert.equal(input.previousGamepadButtons.length,0);assert.equal(input.gamepadDialogActions.length,0);
  assert.equal(input.gamepadNeedsNeutral,true);assert.equal(game.jumpAssist.requireRelease,true);
  assert.equal(runtime.accumulator,0);assert.equal(runtime.lastTime,3000);
});

test('real keyboard dispatch gives the briefing native activation and then restores bindings',()=>{
  let invoked=0;const runtime={openingActive:true,onKeyDown:()=>invoked++};
  const handler=actual('onGameplayKeyDown',runtime);handler({key:'Enter'});handler({key:'j'});assert.equal(invoked,0);
  runtime.openingActive=false;handler({key:'j'});assert.equal(invoked,1);
});

test('new disclosure controls are interactive and do not queue a jump on native activation',()=>{
  class Element{closest(selector){return selector==='summary'?this:null;}}
  const runtime={Element};assert.equal(actual('isInteractiveControl',runtime)(new Element()),true);
});
