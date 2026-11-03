import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as rules from '../app/game/systems/trophyWorkshop.ts';
import {DEFAULT_CONTROL_BINDINGS} from '../app/game/systems/controlBindings.ts';

// Executes the checked-in hook/handlers with deterministic React scheduling and
// DOM/RAF doubles. Native React/browser coverage lives in the dedicated runner.
const sourceFile=process.env.WORKSHOP_RUNTIME_SOURCE ?? new URL('../app/game/useTrophyWorkshopRuntimeV94.ts',import.meta.url);
const source=fs.readFileSync(sourceFile,'utf8');
const tree=ts.createSourceFile('runtime.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const legacy=source.includes('function TrophyWorkshopSession');
const name=legacy?'TrophyWorkshopSession':'useTrophyWorkshopRuntimeV94';
function declaration(name){return tree.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);}
const main=declaration(name);assert.ok(main);
let body=main.getText(tree).replace(/^export /,'');
if(legacy){const ret=main.body.statements.findLast(ts.isReturnStatement);body=body.slice(0,ret.pos-main.getStart(tree))+`\nreturn {game,result,begin,restart,submitInput,cancel:onCancel,rootRef,backdropRef};\n}`;}
const helper=declaration(legacy?'gamepadInputs':'createWorkshopPadV94');
const compiled=ts.transpileModule(helper.getText(tree).replace(/^export /,'')+'\n'+body,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;

function fixture(action='clean'){
 let now=0,cursor=0,dirty=false,output,unmounted=false;
 const slots=[],effects=[],pending=[],frames=new Map(),timers=new Map(),listeners=new Map();let nextId=1;
 const equal=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
 const window={requestAnimationFrame:fn=>{const id=nextId++;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id),
  setTimeout:(fn,ms)=>{const id=nextId++;timers.set(id,{fn,at:now+ms});return id;},clearTimeout:id=>timers.delete(id),
  addEventListener:(t,fn)=>{const v=listeners.get(t)??new Set();v.add(fn);listeners.set(t,v);},removeEventListener:(t,fn)=>listeners.get(t)?.delete(fn)};
 const document={visibilityState:'visible',hidden:false,focused:true,hasFocus(){return this.focused;},activeElement:null,
  addEventListener:window.addEventListener,removeEventListener:window.removeEventListener};
 class Element{constructor(){this.blocked=false;this.attrs=new Map();this.isConnected=true;}closest(){return this.blocked?this:null;}focus(){document.activeElement=this;}hasAttribute(k){return this.attrs.has(k);}getAttribute(k){return this.attrs.get(k)??null;}setAttribute(k,v){this.attrs.set(k,v);}removeAttribute(k){this.attrs.delete(k);}}
 const root=new Element(),backdrop=new Element();backdrop.parentElement={children:[backdrop]};
 const pad={connected:true,index:2,id:'test-pad',axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false}))};
 const navigator={getGamepads:()=>[pad]},completed=[],cancellations=[];
 const props={action,trophyId:'test-claim',rootRef:{current:root},gamepadEnabled:true,suspended:false,autoFocus:false,
  onComplete:r=>completed.push(r),onCancel:()=>cancellations.push(now)};
 const env={...rules,window,document,navigator,HTMLElement:Element,HTMLButtonElement:class{},performance:{now:()=>now},
  DEFAULT_CONTROL_BINDINGS,controlActionShortcut:()=>'',BLOCKED:'blocked',COMPLETION_DELAY_MS:520,
  pageActivitySnapshotV94:()=>document.visibilityState==='visible'&&document.hasFocus(),serverPageActivityV94:()=>false,subscribePageActivityV94:()=>()=>{},
  useState:initial=>{const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],value=>{const next=typeof value==='function'?value(slots[i]):value;if(!Object.is(next,slots[i])){slots[i]=next;dirty=true;}}];},
  useRef:initial=>{const i=cursor++;if(!(i in slots))slots[i]={current:initial};return slots[i];},
  useMemo:(fn,deps)=>{const i=cursor++;if(!slots[i]||!equal(slots[i].deps,deps))slots[i]={value:fn(),deps};return slots[i].value;},
  useCallback:(fn,deps)=>env.useMemo(()=>fn,deps),
  useSyncExternalStore:(_sub,get)=>{cursor++;return get();},
  useEffect:(fn,deps)=>{const i=cursor++;if(!effects[i]||!equal(effects[i].deps,deps))pending.push({i,fn,deps});}};
 const renderFunction=vm.runInNewContext(compiled+`;${name}`,env);
 function render(){cursor=0;dirty=false;output=renderFunction(props);if(legacy){output.rootRef.current=root;output.backdropRef.current=backdrop;}
  while(pending.length){const e=pending.shift();effects[e.i]?.cleanup?.();effects[e.i]={...e,cleanup:e.fn()};}}
 function flush(){let limit=30;do{if(unmounted)return;render();if(--limit===0)throw Error('render loop');}while(dirty);}
 function tick(ms=20){now+=ms;for(const [id,fn] of [...frames]){if(frames.delete(id))fn(now);}for(const [id,t] of [...timers])if(t.at<=now&&timers.delete(id))t.fn();if(dirty)flush();}
 function advance(ms){for(let t=0;t<ms;t+=20)tick(Math.min(20,ms-t));}
 function update(next){Object.assign(props,next);flush();}
 function event(kind){for(const fn of listeners.get(kind)??[])fn();flush();}
 function begin(){output.begin();flush();tick();while(output.game.phase==='countdown')tick();}
 function win(){begin();while(output.game.status==='playing'){advance(660);output.submitInput(output.game.sequence[output.game.cueIndex]);flush();}assert.equal(output.game.status,'success');}
 function unmount(){unmounted=true;for(const e of effects)e?.cleanup?.();}
 flush();tick();
 return{get current(){return output;},root,pad,navigator,document,props,completed,cancellations,flush,tick,advance,update,event,begin,win,unmount,
 replayEffects(){for(const e of effects)if(e){e.cleanup?.();e.cleanup=e.fn();}if(dirty)flush();}};
}

for(const action of ['clean','prepare','display','rite'])test(`${action}: full authored sequence completes once despite parent callback refreshes`,()=>{
 const f=fixture(action);f.win();let calls=0;
 for(let i=0;i<8;i++){f.update({onComplete:r=>{calls++;assert.equal(r.action,action);}});f.advance(100);}
 assert.equal(calls,1);assert.equal(f.completed.length,0);f.unmount();
});
test('StrictMode effect replay cannot consume the completion before delivery',()=>{const f=fixture();f.win();f.replayEffects();f.advance(600);assert.equal(f.completed.length,1);f.unmount();});
for(const mode of ['hidden','blur','suspended','inert'])test(`${mode}: live cue and mistakes remain frozen, with no catch-up`,()=>{
 const f=fixture();f.begin();f.advance(400);const before=JSON.stringify(f.current.game);
 if(mode==='hidden'){f.document.hidden=true;f.document.visibilityState='hidden';f.event('visibilitychange');}
 if(mode==='blur'){f.document.focused=false;f.event('blur');}
 if(mode==='suspended')f.update({suspended:true});if(mode==='inert')f.root.blocked=true;
 f.advance(4000);assert.equal(JSON.stringify(f.current.game),before);
 f.document.hidden=false;f.document.visibilityState='visible';f.document.focused=true;f.root.blocked=false;f.update({suspended:false});f.tick();
 assert.equal(f.current.game.mistakes,0);f.advance(100);assert.ok(f.current.game.cueElapsedSeconds<0.7);f.unmount();
});
test('success delivery preserves its remaining active time across suspension',()=>{const f=fixture();f.win();f.advance(200);f.update({suspended:true});f.advance(5000);assert.equal(f.completed.length,0);f.update({suspended:false});f.advance(200);assert.equal(f.completed.length,0);f.advance(200);assert.equal(f.completed.length,1);f.unmount();});
test('Cancel before delivery prevents a late reward even when the parent keeps the dialog mounted',()=>{const f=fixture();f.win();f.current.cancel();f.current.cancel();f.advance(2000);assert.equal(f.completed.length,0);assert.equal(f.cancellations.length,1);f.unmount();});
test('unmount cancels completion and pending frames',()=>{const f=fixture();f.win();f.unmount();f.advance(1000);assert.equal(f.completed.length,0);});
test('held confirm at mount cannot start the workshop until neutral',()=>{const f=fixture();f.navigator.getGamepads=()=>[];f.tick();f.pad.buttons[0].pressed=true;f.navigator.getGamepads=()=>[f.pad];f.tick();assert.equal(f.current.game.phase,'ready');f.pad.buttons[0].pressed=false;f.tick();f.pad.buttons[0].pressed=true;f.tick();assert.equal(f.current.game.phase,'countdown');f.unmount();});
test('native B cancels once and takes precedence over simultaneous A',()=>{const f=fixture();f.pad.buttons[0].pressed=true;f.pad.buttons[1].pressed=true;f.tick();f.tick();assert.equal(f.cancellations.length,1);assert.equal(f.current.game.phase,'ready');f.unmount();});
test('failed attempt restarts with A but requires release before starting again',()=>{const f=fixture();f.begin();f.advance(4000);assert.equal(f.current.game.status,'failed');f.pad.buttons[0].pressed=true;f.tick();assert.equal(f.current.game.phase,'ready');f.tick();assert.equal(f.current.game.phase,'ready');f.pad.buttons[0].pressed=false;f.tick();f.pad.buttons[0].pressed=true;f.tick();assert.equal(f.current.game.phase,'countdown');f.unmount();});
for(const mode of ['missing','method','getter'])test(`controller ${mode} keeps time and keyboard, then requires neutral on recovery`,()=>{
 const f=fixture();f.begin();if(mode==='missing')f.navigator.getGamepads=undefined;
 if(mode==='method')f.navigator.getGamepads=()=>{throw Error('denied');};
 if(mode==='getter')Object.defineProperty(f.navigator,'getGamepads',{configurable:true,get(){throw Error('denied');}});
 f.advance(400);assert.ok(f.current.game.cueElapsedSeconds>0);f.pad.buttons[14].pressed=true;
 Object.defineProperty(f.navigator,'getGamepads',{configurable:true,value:()=>[f.pad]});const before=f.current.game.mistakes;f.tick();assert.equal(f.current.game.mistakes,before);f.unmount();
});
test('nonfinite axes do not create gestures',()=>{const f=fixture();f.begin();f.pad.axes=[Infinity,-Infinity];f.advance(400);assert.equal(f.current.game.mistakes,0);f.unmount();});
test('disconnected pads cannot contribute gestures',()=>{const f=fixture();f.begin();f.pad.connected=false;f.pad.buttons[14].pressed=true;f.tick();assert.equal(f.current.game.mistakes,0);f.unmount();});
test('blocked keyboard or touch cannot advance a suspended attempt',()=>{const f=fixture();f.update({suspended:true});f.current.begin();f.current.submitInput('confirm');f.flush();assert.equal(f.current.game.phase,'ready');f.unmount();});
