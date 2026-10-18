import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as rules from '../app/game/systems/trainingDrill.ts';
import {DEFAULT_CONTROL_BINDINGS} from '../app/game/systems/controlBindings.ts';

// Actual checked-in hook and domain functions, with deterministic React/RAF/DOM.
// The browser suite separately executes native React and HTML controls.
const source=fs.readFileSync(process.env.TRAINING_RUNTIME_SOURCE ?? new URL('../app/game/useTrainingDrillRuntimeV94.ts',import.meta.url),'utf8');
const legacy=source.includes('function TrainingDrillSession');
const tree=ts.createSourceFile('training.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const main=tree.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===(legacy?'TrainingDrillSession':'useTrainingDrillRuntimeV94'));
assert.ok(main);
let code=main.getText(tree).replace(/^export /,'');
if(legacy){const ret=main.body.statements.findLast(ts.isReturnStatement);code=code.slice(0,ret.pos-main.getStart(tree))+`\nreturn {game,begin,submitAction,cancel:onCancel,recordResult:()=>onComplete(trainingDrillScore(game)),rootRef:panelRef,backdropRef};\n}`;}
const helper=tree.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='createTrainingPadV94');
const compiled=ts.transpileModule((helper?.getText(tree).replace(/^export /,'')??'')+'\n'+code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
function fixture(disciplineId='targeting'){
 let now=0,cursor=0,dirty=false,output,unmounted=false,nextId=1;
 const slots=[],effects=[],pending=[],frames=new Map(),listeners=new Map();
 const equal=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
 const window={requestAnimationFrame:fn=>{const id=nextId++;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id),
  addEventListener:(t,fn)=>{const set=listeners.get(t)??new Set();set.add(fn);listeners.set(t,set);},removeEventListener:(t,fn)=>listeners.get(t)?.delete(fn)};
 const document={hidden:false,focused:true,activeElement:null,hasFocus(){return this.focused;},addEventListener:window.addEventListener,removeEventListener:window.removeEventListener};
 class Element{constructor(){this.blocked=false;this.attrs=new Map();}closest(){return this.blocked?this:null;}focus(){document.activeElement=this;}hasAttribute(k){return this.attrs.has(k);}getAttribute(k){return this.attrs.get(k)??null;}setAttribute(k,v){this.attrs.set(k,v);}removeAttribute(k){this.attrs.delete(k);}}
 const root=new Element(),backdrop=new Element();backdrop.parentElement={children:[backdrop]};
 const pad={connected:true,index:2,id:'training-pad',axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false}))};
 const navigator={getGamepads:()=>[null,null,pad]},completed=[],cancellations=[];
 const props={disciplineId,seed:11,rootRef:{current:root},suspended:false,gamepadEnabled:true,autoFocus:false,onComplete:score=>completed.push(score),onCancel:()=>cancellations.push(now)};
 const env={...rules,window,document,navigator,HTMLElement:Element,HTMLButtonElement:class{},BLOCKED:'blocked',DEFAULT_CONTROL_BINDINGS,controlActionShortcut:()=>'',
  pageActivitySnapshotV94:()=>!document.hidden&&document.hasFocus(),subscribePageActivityV94:()=>()=>{},serverPageActivityV94:()=>false,
  useState:initial=>{const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],value=>{const next=typeof value==='function'?value(slots[i]):value;if(!Object.is(next,slots[i])){slots[i]=next;dirty=true;}}];},
  useRef:initial=>{const i=cursor++;if(!(i in slots))slots[i]={current:initial};return slots[i];},
  useCallback:(fn,deps)=>{const i=cursor++;if(!slots[i]||!equal(slots[i].deps,deps))slots[i]={value:fn,deps};return slots[i].value;},
  useSyncExternalStore:(_sub,get)=>{cursor++;return get();},
  useEffect:(fn,deps)=>{const i=cursor++;if(!effects[i]||!equal(effects[i].deps,deps))pending.push({i,fn,deps});}};
 const renderFunction=vm.runInNewContext(compiled+`;${main.name.text}`,env);
 function render(){cursor=0;dirty=false;output=renderFunction(props);if(legacy){output.rootRef.current=root;output.backdropRef.current=backdrop;}
  while(pending.length){const e=pending.shift();effects[e.i]?.cleanup?.();effects[e.i]={...e,cleanup:e.fn()};}}
 function flush(){let count=30;do{if(unmounted)return;render();assert.ok(--count,'no render loop');}while(dirty);}
 function tick(ms=20){now+=ms;for(const [id,fn] of [...frames])if(frames.delete(id))fn(now);if(dirty)flush();}
 function advance(ms){for(let t=0;t<ms;t+=20)tick(Math.min(20,ms-t));}
 function update(next){Object.assign(props,next);flush();}
 function event(name){for(const fn of listeners.get(name)??[])fn();flush();}
 function begin(){output.begin();flush();tick();}
 function win(){begin();while(output.game.status==='playing'){output.submitAction(output.game.sequence[output.game.cueIndex]);flush();}assert.equal(output.game.status,'complete');}
 function unmount(){unmounted=true;for(const e of effects)e?.cleanup?.();}
 function press(index){pad.buttons[index].pressed=false;tick();pad.buttons[index].pressed=true;tick();}
 flush();tick();
 return{get current(){return output;},root,pad,navigator,document,completed,cancellations,props,flush,tick,advance,update,event,begin,win,unmount,press,
  get frameCount(){return frames.size;},replayEffects(){for(const e of effects)if(e){e.cleanup?.();e.cleanup=e.fn();}if(dirty)flush();}};
}
for(const discipline of Object.keys(rules.TRAINING_DRILL_CONFIGS))test(`${discipline}: full real sequence remains explicit and records once with current callback`,()=>{
 const f=fixture(discipline);f.win();assert.equal(f.completed.length,0);let count=0,score;
 f.update({onComplete:s=>{count++;score=s;f.current.recordResult();}});f.current.recordResult();f.current.recordResult();f.flush();
 assert.equal(count,1);assert.equal(score,100);f.unmount();
});
for(const mode of ['hidden','blur','suspended','inert'])test(`${mode}: time and input freeze without catch-up`,()=>{
 const f=fixture();f.begin();f.advance(200);const before=JSON.stringify(f.current.game);
 if(mode==='hidden'){f.document.hidden=true;f.event('visibilitychange');}else if(mode==='blur'){f.document.focused=false;f.event('blur');}else if(mode==='suspended')f.update({suspended:true});else f.root.blocked=true;
 f.advance(2500);f.current.submitAction('primary');f.flush();assert.equal(JSON.stringify(f.current.game),before);
 f.document.hidden=false;f.document.focused=true;f.root.blocked=false;f.update({suspended:false});f.tick(5000);
 assert.equal(JSON.stringify(f.current.game),before);f.tick();assert.ok(f.current.game.cueElapsedSeconds>JSON.parse(before).cueElapsedSeconds);f.unmount();
});
test('StrictMode effect replay preserves one clock and one result claim',()=>{const f=fixture();f.replayEffects();f.begin();f.tick(100);assert.equal(f.current.game.cueElapsedSeconds,0.1);f.win();f.current.recordResult();f.replayEffects();f.current.recordResult();assert.equal(f.completed.length,1);f.unmount();});
test('cancel suppresses input and a captured result callback even if the parent keeps the panel mounted',()=>{const f=fixture();f.win();const stale=f.current.recordResult;f.current.cancel();f.current.cancel();stale();assert.equal(f.cancellations.length,1);assert.equal(f.completed.length,0);f.unmount();});
test('unmount cancels scheduled focus/frames and makes old callbacks inert',()=>{const f=fixture();f.win();const stale=f.current.recordResult;f.unmount();stale();f.advance(2000);assert.equal(f.completed.length,0);assert.equal(f.frameCount,0);});
test('holding A at entry cannot begin until release; its start press is not a cue',()=>{const f=fixture();f.navigator.getGamepads=()=>[];f.tick();f.pad.buttons[0].pressed=true;f.navigator.getGamepads=()=>[f.pad];f.tick();assert.equal(f.current.game.status,'ready');f.press(0);assert.equal(f.current.game.status,'playing');f.tick();assert.equal(f.current.game.cueIndex,0);f.unmount();});
test('B is the secondary drill gesture, never Cancel',()=>{const f=fixture();f.begin();while(f.current.game.sequence[f.current.game.cueIndex]!=='secondary'){f.current.submitAction(f.current.game.sequence[f.current.game.cueIndex]);f.flush();}const before=f.current.game.cueIndex;f.press(1);assert.equal(f.current.game.cueIndex,before+1);assert.equal(f.current.game.wrongInputs,0);assert.equal(f.cancellations.length,0);assert.ok(f.current.game.hits>0);f.unmount();});
test('View/Back cancels once, ahead of simultaneous gestures',()=>{const f=fixture();f.begin();f.tick();f.pad.buttons[0].pressed=true;f.pad.buttons[8].pressed=true;f.tick();f.tick();assert.equal(f.cancellations.length,1);assert.equal(f.current.game.cueIndex,0);f.unmount();});
test('the last A gesture cannot automatically record its completed score',()=>{const f=fixture();f.win();f.pad.buttons[0].pressed=true;f.tick();f.tick();assert.equal(f.completed.length,0);f.press(0);assert.equal(f.completed.length,1);f.unmount();});
for(const mode of ['missing','method','getter'])test(`gamepad ${mode} leaves clock/keyboard usable and requires neutral on recovery`,()=>{
 const f=fixture();f.begin();if(mode==='missing')f.navigator.getGamepads=undefined;
 if(mode==='method')f.navigator.getGamepads=()=>{throw Error('denied');};
 if(mode==='getter')Object.defineProperty(f.navigator,'getGamepads',{configurable:true,get(){throw Error('denied');}});
 f.advance(200);assert.ok(f.current.game.cueElapsedSeconds>0);f.pad.buttons[1].pressed=true;
 Object.defineProperty(f.navigator,'getGamepads',{configurable:true,value:()=>[f.pad]});f.tick();assert.equal(f.current.game.cueIndex,0);f.unmount();
});
test('new controller and a disconnect event between samples both require neutral',()=>{const f=fixture();f.begin();f.pad.id='new';f.pad.buttons[0].pressed=true;f.tick();assert.equal(f.current.game.cueIndex,0);f.pad.buttons[0].pressed=false;f.tick();f.event('gamepaddisconnected');f.pad.buttons[0].pressed=true;f.tick();assert.equal(f.current.game.cueIndex,0);f.unmount();});
test('disconnected controllers and nonfinite axes cannot create gestures',()=>{const f=fixture();f.begin();f.pad.axes=[Infinity,NaN];f.tick();assert.equal(f.current.game.cueIndex,0);f.pad.connected=false;f.pad.buttons[1].pressed=true;f.tick();assert.equal(f.current.game.cueIndex,0);f.unmount();});
test('ambiguous chords never consume multiple cues',()=>{const f=fixture();f.begin();f.tick();f.pad.buttons[0].pressed=true;f.pad.buttons[1].pressed=true;f.tick();assert.equal(f.current.game.cueIndex,0);f.unmount();});
test('gamepadEnabled false prevents gestures but keeps the clock running',()=>{const f=fixture();f.update({gamepadEnabled:false});f.begin();f.press(1);assert.equal(f.current.game.cueIndex,0);assert.ok(f.current.game.cueElapsedSeconds>0);f.unmount();});
test('an expired sequence scores zero and still needs explicit recording',()=>{const f=fixture();f.begin();f.advance(16000);assert.equal(f.current.game.status,'complete');assert.equal(f.completed.length,0);f.current.recordResult();assert.deepEqual(f.completed,[0]);f.unmount();});
test('a throwing receiver reports uncertainty without replaying the result',()=>{const f=fixture();f.win();let n=0;f.update({onComplete(){n++;throw Error('write unknown');}});f.current.recordResult();f.flush();f.current.recordResult();assert.equal(n,1);assert.match(f.current.deliveryError,/non confirmée/);f.current.cancel();assert.equal(f.cancellations.length,1);f.unmount();});
