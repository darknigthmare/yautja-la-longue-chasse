import test from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {build} from 'esbuild';

// Exercise the actual atlas JSX callbacks, lifecycle and response admission.
// Hooks, Worker delivery and animation frames are controlled; no route solver,
// browser rendering, actor movement or persistence is exercised by this test.
const compiled=await build({stdin:{contents:`
 export {default as Component} from './app/game/HomeworldWorldMapV77';
 export {defaultSave} from './app/game/save';
 export {homeworldDestinationKeyV109,homeworldRouteResponseCurrentV111} from './app/game/systems/homeworldWayfindingV111';
 export {homeworldAtlasLandmarksV111} from './app/game/systems/homeworldObjectivesV111';
 export {homeworldInteriorForBuildingV64} from './app/game/systems/homeworldInteriorsV64';
`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'cjs',target:'es2022',jsx:'automatic',
 external:['react','react/jsx-runtime'],define:{'import.meta.url':'"file:///homeworld-atlas-test.tsx"'},logLevel:'silent',
 plugins:[{name:'atlas-css-only',setup(build){build.onLoad({filter:/\.module\.css$/},()=>({contents:'export default {};',loader:'js'}));}}]});

function nodes(tree){
 if(Array.isArray(tree))return tree.flatMap(nodes);
 if(!tree||typeof tree!=='object')return[];
 return[tree,...nodes(tree.props?.children)];
}
function text(tree){
 if(Array.isArray(tree))return tree.map(text).join('');
 if(!tree||typeof tree!=='object')return tree??'';
 return text(tree.props?.children);
}
function fixture(){
 const slots=[],effects=[],layouts=[],pending=[],pendingLayouts=[];
 let cursor=0,dirty=false,tree,props,requestedOpen,nextFrame=0;
 const same=(a,b)=>a&&b&&a.length===b.length&&a.every((value,index)=>Object.is(value,b[index]));
 const hooks={
  useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],value=>{const next=typeof value==='function'?value(slots[i]):value;if(!Object.is(next,slots[i])){slots[i]=next;dirty=true;}}];},
  useRef(initial){const i=cursor++;return slots[i]??={current:initial};},
  useMemo(calculate,deps){const i=cursor++;if(!slots[i]||!same(slots[i].deps,deps))slots[i]={value:calculate(),deps};return slots[i].value;},
  useCallback(callback,deps){return hooks.useMemo(()=>callback,deps);},
  useEffect(callback,deps){const i=cursor++;if(!effects[i]||!same(effects[i].deps,deps))pending.push({i,callback,deps});},
  useLayoutEffect(callback,deps){const i=cursor++;if(!layouts[i]||!same(layouts[i].deps,deps))pendingLayouts.push({i,callback,deps});},
 };
 const frames=new Map(),workers=[],openRequests=[];
 class ControlledWorker{
  constructor(){this.listeners={message:[],error:[]};this.terminated=false;workers.push(this);}
  addEventListener(type,callback,options){this.listeners[type].push({callback,once:options?.once});}
  removeEventListener(type,callback){this.listeners[type]=this.listeners[type].filter(entry=>entry.callback!==callback);}
  postMessage(request){assert.ok(!this.terminated);this.request=structuredClone(request);}
  terminate(){this.terminated=true;}
  // Allow an already queued delivery after termination to check ownership too.
  emit(type,event){for(const entry of [...this.listeners[type]]){if(entry.once)this.removeEventListener(type,entry.callback);entry.callback(event);}}
 }
 const pad={connected:true,id:'controlled-atlas-pad',index:0,axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false}))};
 const document={activeElement:null,focused:false,hasFocus(){return this.focused;}};
 const dialog={focus(){document.activeElement=this;},contains(node){return node===this;},querySelectorAll(){return[];}};
 const module={exports:{}};
 runInNewContext(compiled.outputFiles[0].text,{
  module,exports:module.exports,require:name=>{
   if(name==='react')return hooks;
   assert.equal(name,'react/jsx-runtime');
   return{Fragment:'fragment',jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
  },URL,Worker:ControlledWorker,console,TextEncoder,TextDecoder,
  requestAnimationFrame:callback=>{frames.set(++nextFrame,callback);return nextFrame;},cancelAnimationFrame:id=>frames.delete(id),
  window:{setInterval:()=>1,clearInterval(){}},document,navigator:{getGamepads:()=>[pad]},
 });
 const api=module.exports,save=api.defaultSave('2026-10-29T00:00:00.000Z');
 const officer=api.homeworldAtlasLandmarksV111(save).find(target=>target.id==='point:dock-officer-point');
 const room=api.homeworldInteriorForBuildingV64(officer.buildingId);
 assert.ok(room);
 const destinationId='building:'+room.buildingId;
 props={save,actor:{...room.spawn},levelId:officer.levelId,interiorId:room.buildingId,open:true,targetId:destinationId,
  routeSuspended:false,onOpenChange(open){openRequests.push(open);requestedOpen=open;}};
 function runEffects(queue,store){while(queue.length){const effect=queue.shift();store[effect.i]?.cleanup?.();store[effect.i]={...effect,cleanup:effect.callback()};}}
 function render(){
  let budget=25;
  do{
   assert.ok(budget--,'bounded atlas rerender');cursor=0;dirty=false;tree=api.Component(props);
   for(const node of nodes(tree))if(node.props?.ref)node.props.ref.current=dialog;
   runEffects(pendingLayouts,layouts);runEffects(pending,effects);
  }while(dirty);
 }
 function one(predicate){const matches=nodes(tree).filter(predicate);assert.equal(matches.length,1,'one actual JSX control');return matches[0];}
 function button(label){return one(node=>node.type==='button'&&text(node)===label);}
 function click(label,commit=true){const node=button(label);assert.ok(!node.props.disabled,label+' is enabled');node.props.onClick();if(commit)render();}
 function update(values){props={...props,...values};render();}
 function commitOpen(){if(requestedOpen!==undefined){const open=requestedOpen;requestedOpen=undefined;update({open});}else render();}
 function frame(commit=true){for(const[id,callback]of [...frames])if(frames.delete(id))callback();if(commit)render();}
 function guide(){return nodes(tree).find(node=>typeof node.type==='function'&&typeof node.props?.onRecalculate==='function');}
 function plan(worker,marker='current response'){
  const request=worker.request,target=api.homeworldAtlasLandmarksV111(request.save).find(target=>target.id===request.destinationId);
  assert.equal(request.origin.interiorId,target.buildingId);
  assert.equal(target.pointId,null);
  // This is the one-point "already in this building" response contract. Its
  // owner, destination, room and geometry use real production data/admission.
  const response={ownerCreatedAt:request.save.createdAt,destinationId:target.id,geometryKey:request.geometryKey,
   destinationKey:api.homeworldDestinationKeyV109(target),status:'reachable',reason:target.reason,distance:0,
   stages:[{levelId:request.origin.levelId,interiorId:request.origin.interiorId,points:[{...request.origin.actor}],distance:0,kind:'building',radius:24,instruction:marker}]};
  assert.equal(api.homeworldRouteResponseCurrentV111({...request,ownerCreatedAt:response.ownerCreatedAt,destinationKey:response.destinationKey},response,request.save,request.origin),true);
  return response;
 }
 function deliver(worker,response){worker.emit('message',{data:{plan:response}});render();}
 function follow(){click('Suivre ce repère à pied');return workers.at(-1);}
 function recalculate(){const current=guide();assert.ok(current);assert.equal(current.props.suspended,false);assert.equal(current.props.calculating,false);current.props.onRecalculate();render();return workers.at(-1);}
 function install(){const worker=follow(),response=plan(worker,'confirmed route');deliver(worker,response);commitOpen();assert.equal(props.open,false);assert.equal(guide()?.props.guidance.stage,response.stages[0]);return response;}
 function close(method){
  if(method==='button')click('Fermer la carte',false);
  else if(method==='Escape')one(node=>node.props?.role==='dialog').props.onKeyDown({key:'Escape',stopPropagation(){}});
  else{assert.equal(method,'gamepad');pad.buttons[1].pressed=true;frame(false);}
 }
 render();frame();
 return{api,workers,openRequests,button,click,update,commitOpen,frame,guide,plan,deliver,follow,recalculate,install,close,
  get props(){return props;},get notice(){return nodes(tree).filter(node=>node.props?.role==='status').map(text).join('');},
  armGamepad(){document.focused=true;document.activeElement=dialog;frame();},
  choose(){one(node=>node.props?.['data-map-landmark-v83']===destinationId).props.onClick();render();},
  queuedFrames(){return[...frames.values()];},
  unmount(){for(const effect of [...layouts,...effects])effect?.cleanup?.();},
 };
}

for(const method of ['button','Escape','gamepad'])test(`atlas ${method} cancels the request before the parent closes or a frame runs`,()=>{
 const ui=fixture();if(method==='gamepad')ui.armGamepad();
 const worker=ui.follow(),response=ui.plan(worker);
 ui.close(method);
 assert.equal(ui.openRequests.at(-1),false);
 ui.deliver(worker,response);ui.commitOpen();
 assert.equal(ui.guide(),undefined,'the late result must not install a guide');
 assert.equal(worker.terminated,true);
 ui.frame();assert.equal(ui.guide(),undefined);ui.unmount();
});

test('an external atlas close rejects a response before the cancellation UI frame',()=>{
 const ui=fixture(),worker=ui.follow(),response=ui.plan(worker);
 ui.update({open:false});ui.deliver(worker,response);
 assert.equal(ui.guide(),undefined);assert.equal(worker.terminated,true);
 ui.frame();assert.equal(ui.guide(),undefined);ui.unmount();
});

test('reopening before the cancellation frame cannot revive the old request or leave planning stuck',()=>{
 const ui=fixture(),worker=ui.follow(),response=ui.plan(worker);
 ui.update({open:false});ui.update({open:true});ui.deliver(worker,response);ui.commitOpen();
 assert.equal(ui.props.open,true,'the obsolete response must not close the reopened atlas');
 ui.frame();assert.equal(ui.button('Suivre ce repère à pied').props.disabled,false);
 ui.update({open:false});assert.equal(ui.guide(),undefined);ui.unmount();
});

test('cancelling a replacement keeps the previously confirmed route',()=>{
 const ui=fixture(),confirmed=ui.install();ui.update({open:true});
 const worker=ui.follow(),response=ui.plan(worker,'obsolete replacement');
 ui.close('button');ui.deliver(worker,response);ui.commitOpen();ui.frame();
 assert.equal(ui.guide()?.props.guidance.stage,confirmed.stages[0]);
 assert.equal(ui.guide()?.props.calculating,false);ui.unmount();
});

test('suspension invalidates a pending replacement before RAF and preserves the confirmed route after resuming',()=>{
 const ui=fixture(),confirmed=ui.install(),worker=ui.recalculate(),response=ui.plan(worker,'suspended replacement');
 ui.update({routeSuspended:true});ui.deliver(worker,response);
 assert.equal(ui.guide()?.props.guidance.stage,confirmed.stages[0]);assert.equal(worker.terminated,true);
 ui.update({routeSuspended:false});ui.frame();
 assert.equal(ui.guide()?.props.guidance.stage,confirmed.stages[0]);assert.equal(ui.guide()?.props.calculating,false);ui.unmount();
});

test('an old cancellation frame cannot stop or clear a newer request after reopening',()=>{
 const ui=fixture(),oldWorker=ui.follow(),oldResponse=ui.plan(oldWorker,'old response');
 ui.update({open:false});const staleFrames=ui.queuedFrames();assert.ok(staleFrames.length);
 ui.update({open:true});ui.choose();const currentWorker=ui.follow(),currentResponse=ui.plan(currentWorker,'new response');
 // Replay a callback already taken from the frame queue, even if its timer was
 // cancelled later. The revision must protect the newer request and its UI.
 for(const callback of staleFrames)callback();
 ui.update({});assert.equal(currentWorker.terminated,false);
 assert.equal(ui.button('Suivre ce repère à pied').props.disabled,true);
 ui.deliver(oldWorker,oldResponse);ui.deliver(currentWorker,currentResponse);ui.commitOpen();
 assert.equal(ui.guide()?.props.guidance.stage,currentResponse.stages[0]);assert.equal(ui.guide()?.props.calculating,false);ui.unmount();
});

test('voluntary recalculation while the atlas is closed still installs its current result',()=>{
 const ui=fixture(),confirmed=ui.install(),worker=ui.recalculate(),response=ui.plan(worker,'new voluntary route');
 assert.equal(ui.props.open,false);assert.equal(ui.guide()?.props.guidance.stage,confirmed.stages[0]);
 assert.equal(ui.guide()?.props.calculating,true);ui.deliver(worker,response);ui.frame();
 assert.equal(ui.props.open,false);assert.equal(ui.guide()?.props.guidance.stage,response.stages[0]);
 assert.equal(ui.guide()?.props.calculating,false);ui.unmount();
});

test('late worker errors after cancellation cannot replace a new request notice or prevent retry',()=>{
 const ui=fixture(),oldWorker=ui.follow();ui.close('button');ui.commitOpen();
 ui.update({open:true});ui.choose();const currentWorker=ui.follow(),notice=ui.notice;
 oldWorker.emit('error',new Error('obsolete worker failure'));ui.update({});
 assert.equal(ui.notice,notice);assert.equal(currentWorker.terminated,false);
 const response=ui.plan(currentWorker);ui.deliver(currentWorker,response);ui.commitOpen();
 assert.equal(ui.guide()?.props.guidance.stage,response.stages[0]);ui.unmount();
});
