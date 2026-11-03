import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {DEFAULT_CONTROL_BINDINGS, matchesControlAction} from '../app/game/systems/controlBindings.ts';
import {preloadSceneImagesV94} from '../app/game/systems/nativeImagePreloadV94.ts';

// Execute actual component callbacks, not a copied implementation. This does not
// claim to mount the complete scene or to play a route through its world geometry.
async function callbacks(kind) {
 const name=kind==='region'?'HomeworldRegionV68':'HomeworldPassageV67';
 const source=await readFile(new URL(`../app/game/${name}.tsx`,import.meta.url),'utf8');
 const tree=ts.createSourceFile(name,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),found={};
 function walk(node){
  if(ts.isVariableDeclaration(node)){
   const id=node.name.getText(tree);
   if(id===(kind==='region'?'down':'keydown'))found.key=node.initializer;
   if(id==='resume')found.resume=node.initializer.arguments[0];
   if(id==='tab')found.tab=node.initializer;
  }
  if(ts.isCallExpression(node)&&node.expression.getText(tree)==='useEffect'&&node.arguments[0]?.getText(tree).includes('const urls ='))found.images=node.arguments[0];
  ts.forEachChild(node,walk);
 }
 walk(tree);
 return Object.fromEntries(Object.entries(found).map(([key,value])=>[key,ts.transpileModule(`(${value.getText(tree)})`,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText]));
}
const implementations={region:await callbacks('region'),passage:await callbacks('passage')};
const microtasks=()=>new Promise(resolve=>setImmediate(resolve));
function keyboard(kind) {
 const held={current:new Set()}, paused={current:false}, interacted={current:false};
 const log=[], state={status:kind==='region'?'walking':'travelling',regionId:'ash-marches'};
 const env={
  document:{hidden:false,hasFocus:()=>true},HTMLElement:class {},
  latest:{current:{save:{settings:{controlBindings:DEFAULT_CONTROL_BINDINGS}},suspended:false}},
  held,interact:interacted,pausedRef:paused,pauseRef:paused,codexRef:{current:false},
  matchesControlAction,actions:['hunt.moveLeft','hunt.moveRight','hunt.moveUp','hunt.moveDown'],
  movementActions:['hunt.moveLeft','hunt.moveRight','hunt.moveUp','hunt.moveDown'],
  clear(){held.current.clear();interacted.current=false;},pause(){paused.current=true;log.push('pause');},resume(){log.push('resume');},closeCodex(){log.push('codex');},
  current:{current:state},stateRef:{current:state},readyRef:{current:true},persist(){log.push('persist');return true;},
  bibleOpenRef:{current:false},canEnterHomeworldRegionV68:()=>({allowed:true}),canEnterHomeworldPassageV67:()=>({allowed:true}),
  noticeRef:{current:''},setNotice(){},setNoticeFromGuide(){},setLocalPanel(){},setNavigationError(){},setPaused(v){paused.current=v;},setCodex(){},
  viewport:{current:{focus(){}}},requestAnimationFrame(){log.push('frame');},
 };
 return {env,log,held,paused,interacted,
  key(code,extra={}){return runInNewContext(implementations[kind].key,env)({code,key:code==='Escape'?'Escape':'',preventDefault(){},repeat:false,...extra});},
  resume(){runInNewContext(implementations[kind].resume,env)();},
 };
}
for(const kind of ['region','passage']){
 test(`${kind}: an old repeated movement cannot resurrect a cleared hold`,()=>{
  const f=keyboard(kind);f.key('KeyD');assert(f.held.current.has('KeyD'));f.env.clear();f.key('KeyD',{repeat:true});assert.equal(f.held.current.size,0);
  f.key('KeyD');f.key('KeyD',{repeat:true});assert(f.held.current.has('KeyD'),'fresh press and its normal repeats are accepted');
 });
 for(const reason of ['hidden','unfocused']){
  test(`${kind}: ${reason} keyboard input cannot move, interact or resume`,()=>{
   const f=keyboard(kind);if(reason==='hidden')f.env.document.hidden=true;else f.env.document.hasFocus=()=>false;
   f.key('KeyD');f.key('KeyE');f.key('Escape');assert.equal(f.held.current.size,0);assert.equal(f.interacted.current,false);assert.deepEqual(f.log,[]);
  });
  test(`${kind}: ${reason} resume cannot write a checkpoint or clear the pause`,()=>{
   const f=keyboard(kind);f.paused.current=true;if(reason==='hidden')f.env.document.hidden=true;else f.env.document.hasFocus=()=>false;
   f.resume();assert.equal(f.paused.current,true);assert.deepEqual(f.log,[]);
  });
 }
 test(`${kind}: a focused explicit resume still confirms the checkpoint`,()=>{
  const f=keyboard(kind);f.paused.current=true;f.resume();assert.equal(f.paused.current,false);assert.equal(f.log.filter(x=>x==='persist').length,1);
 });
}
test('region: Shift+Tab from the dialog container targets the final enabled button',()=>{
 const buttons=Array.from({length:3},(_,id)=>({focus(){chosen=id;}}));let chosen=-1;
 const env={latest:{current:{suspended:false}},document:{activeElement:null},HTMLButtonElement:class{},buttons:()=>buttons,dialog:{focus(){chosen=99;}}};
 runInNewContext(implementations.region.tab,env)({key:'Tab',shiftKey:true,preventDefault(){}});assert.equal(chosen,2);
});

async function imageEffect(kind,check,{retry=false}={}) {
 const oldImage=globalThis.Image,oldFetch=globalThis.fetch,images=[],handles=[],reports=[];
 class ImageFixture{
  naturalWidth=20;naturalHeight=30;src='';decoding='';
  constructor(){images.push(this);}
  decode(){return new Promise(resolve=>{this.finish=resolve;});}
  removeAttribute(){this.detached=true;this.src='';}
  complete(){this.onload?.();this.finish?.();}
 }
 globalThis.Image=ImageFixture;
 const refreshes=[];globalThis.fetch=async(src,options)=>{refreshes.push({src,...options});return {ok:true,arrayBuffer:async()=>new ArrayBuffer(0)};};
 const asset=src=>({src}),props=Object.fromEntries(Array.from({length:9},(_,i)=>[`p${i}`,asset(`/prop-${i}.png`)]));props.beacon=asset('/beacon.png');
 const readyRef={current:true};let ready=true,error='old error';
 const env={Image:ImageFixture,definition:{panorama:'/panorama.png'},regionId:'ash-marches',artAttempt:retry?1:0,youthWelcome:false,
  HOMEWORLD_YOUTH_PLATE_V69:asset('/youth.png'),HOMEWORLD_GROUND_ART_V64:asset('/ground.png'),HOMEWORLD_INTERIOR_ART_V64:{north:asset('/wall.png')},
  HOMEWORLD_PASSAGE_BRIDGE_V67:asset('/bridge.png'),HOMEWORLD_BUILDING_ART_V64:{hall:asset('/hall.png')},HOMEWORLD_PROP_ART_V64:props,REGION_FAUNA_ART_V68:{},
  homeworldFaunaSourceUrlsV77:()=>[],homeworldFaunaDimensionsV77:(_src,w,h)=>w===20&&h===30,
  scene:{current:{querySelectorAll:()=>Array.from({length:10},(_,i)=>asset(`/visible-${i}.png`))}},readyRef,
  setReady(value){ready=value;reports.push(value);},setArtError(value){error=value;},
  preloadSceneImagesV94(options){const h=preloadSceneImagesV94({...options,timeoutMs:1000});handles.push(h);return h;},
 };
 const cleanup=runInNewContext(implementations[kind].images,env)();
 try{await check({images,cleanup,env,refreshes,reports,get ready(){return ready;},get error(){return error;}});}
 finally{cleanup();for(const h of handles)h.cancel();await Promise.all(handles.map(h=>h.done));globalThis.Image=oldImage;globalThis.fetch=oldFetch;}
}
for(const kind of ['region','passage']){
 test(`${kind}: starting or retrying images immediately clears the stale ready/error UI`,()=>imageEffect(kind,async f=>{
  assert.equal(f.ready,false);assert.equal(f.env.readyRef.current,false);assert.equal(f.error,'');
 }));
 test(`${kind}: the scene starts at most six image decoders`,()=>imageEffect(kind,async f=>{
  assert.equal(f.images.length,6);
 }));
 test(`${kind}: cleanup detaches every pending image and ignores late completion`,()=>imageEffect(kind,async f=>{
  f.cleanup();assert(f.images.every(i=>i.detached));const count=f.reports.length;f.images.forEach(i=>i.complete());await microtasks();assert.equal(f.reports.length,count);assert.equal(f.env.readyRef.current,false);
 }));
 test(`${kind}: explicit retry refreshes the same source URLs rather than reusing the failed cache`,()=>imageEffect(kind,async f=>{
  await microtasks();assert.equal(f.refreshes.length,6);assert(f.refreshes.every(call=>call.cache==='reload'));assert.deepEqual(f.images.map(i=>i.src),f.refreshes.map(i=>i.src));
 },{retry:true}));
}
