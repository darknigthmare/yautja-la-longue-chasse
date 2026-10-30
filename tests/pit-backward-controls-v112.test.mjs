import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
import {build} from 'esbuild';
const r=await build({stdin:{contents:["export * from './app/game/systems/pitCombat';","export * from './app/game/systems/pitThrowControlsV112';","export * from './app/game/systems/controlBindings';"].join('\n'),resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm'});
const p=await import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text).toString('base64'));
const source=ts.createSourceFile('PitCanvas.tsx',await fs.readFile('app/game/PitCanvas.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const declarations=[];
const visit=node=>{if(ts.isVariableDeclaration(node)&&node.name.getText(source)==='sourceCommand')declarations.push(node);ts.forEachChild(node,visit);};visit(source);
assert.equal(declarations.length,1,'Test the one actual public input closure, not a copied implementation');
const code=ts.transpileModule('module.exports='+declarations[0].initializer.getText(source),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
function close(slot,direction){
 const state=p.createPitCombatState('feral-hunter','scar',{normalMoves:'workbook-v112',mode:'training'});
 state.fighters[slot].x=direction===1?400:460;state.fighters[1-slot].x=state.fighters[slot].x+direction*60;
 state.fighters[slot].facing=direction;state.fighters[1-slot].facing=-direction;return state;
}
function closure(state,{slot=0,button,keys=[],pad}={}){
 const context={sourceFighters:state.fighters,pressedKeysRef:{current:new Set(keys)},touchInputsRef:{current:[new Set(),new Set()]},controlBindings:p.DEFAULT_CONTROL_BINDINGS,
  combatGamepadReadyRef:{current:[slot===0&&!!pad,slot===1&&!!pad]},gamepads:[slot===0?pad:null,slot===1?pad:null],
  workbookBackwardThrowsRefV112:{current:[button==='backward'&&slot===0,button==='backward'&&slot===1]},
  workbookThrowsRefV109:{current:[button==='forward'&&slot===0,button==='forward'&&slot===1]},workbookCommandsRefV105:{current:[undefined,undefined]},pitThrowInputV112:p.pitThrowInputV112,
  PIT_WORKBOOK_COMBAT_RECIPE_V105:'workbook-v105',PIT_WORKBOOK_COMBAT_RECIPE_V106:'workbook-v106',PIT_WORKBOOK_COMBAT_RECIPE_V107:'workbook-v107',PIT_WORKBOOK_COMBAT_RECIPE_V109:'workbook-v109',PIT_WORKBOOK_COMBAT_RECIPE_V112:'workbook-v112'};
 const compiled={exports:{}};new Function(...Object.keys(context),'module',code)(...Object.values(context),compiled);return{run:compiled.exports,context};
}
const step=(s,slot,input)=>p.stepPitCombat(s,slot===0?[input,{}]:[{},input]);
test('actual public forward button staysTH_F while either fighter holds retreat in either native facing',()=>{
 for(const slot of [0,1])for(const direction of [-1,1]){
  const s=close(slot,direction),{run,context}=closure(s,{slot,button:'forward'}),input=run(slot,{[direction===1?'left':'right']:true});
  assert.equal(input.left,false);assert.equal(input.right,false);assert.equal(input.throw,true);
  assert.equal(step(s,slot,input).fighters[slot].action.workbookMove,'TH_F');assert.equal(context.workbookThrowsRefV109.current[slot],false);
 }
});
test('actual backward button forces4 from the current fighter facing even with a forward direction held',()=>{
 for(const slot of [0,1])for(const direction of [-1,1]){
  const s=close(slot,direction),{run}=closure(s,{slot,button:'backward'}),input=run(slot,{[direction===1?'right':'left']:true});
  assert.equal(step(s,slot,input).fighters[slot].action.workbookMove,'TH_B');
 }
});
test('public keyboard and pad4+L+M remain contextual and preserve their held retreat direction',()=>{
 for(const slot of [0,1])for(const direction of [-1,1])for(const controller of ['keyboard','pad']){
  const s=close(slot,direction),keys=slot===0?['KeyJ','KeyK']:['Numpad1','Numpad3'];
  const options=controller==='keyboard'?{keys}:{pad:{buttons:Array.from({length:16},(_,index)=>({pressed:index===2||index===3}))}};
  const {run}=closure(s,{slot,...options}),input=run(slot,{attack:'light',[direction===1?'left':'right']:true});
  assert.equal(input[direction===1?'left':'right'],true);assert.equal(input.attack,undefined);
  assert.equal(step(s,slot,input).fighters[slot].action.workbookMove,'TH_B');
 }
});
test('actual forward button during a backward capture remains a fresh successful tech, including held retreat',()=>{
 for(const attacker of [0,1]){
  let s=close(attacker,1);s=step(s,attacker,{throw:true,left:true});for(let n=0;n<14&&!s.sourceThrowV112;n++)s=p.stepPitCombat(s);
  assert(s.sourceThrowV112);const defender=1-attacker,life=s.fighters.map(f=>f.health),{run}=closure(s,{slot:defender,button:'forward'});
  s=step(s,defender,run(defender,{left:true}));assert.equal(s.sourceThrowV112,null);assert.deepEqual(s.fighters.map(f=>f.health),life);assert(s.events.some(e=>e.type==='throw-tech'));
 }
});
test('the independentV16 public forward option keeps its historical input shape and forward action',()=>{
 const s=p.createPitCombatState('feral-hunter','scar',{normalMoves:'workbook-v109',mode:'training'}),{run}=closure(s,{button:'forward'});
 const input=run(0,{left:true});assert.equal(input.left,true);assert.equal(input.right,undefined);
 assert.equal(step(s,0,input).fighters[0].action.workbookMove,'TH_F');
});
