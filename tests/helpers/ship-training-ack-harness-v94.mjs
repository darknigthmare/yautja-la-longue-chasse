import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {build} from 'esbuild';
import {webcrypto} from 'node:crypto';
const b=await build({stdin:{contents:`export * from './app/game/useShipTrainingV94'; export * from './app/game/systems/progression'; export * from './app/game/save';`,resolveDir:process.cwd()},bundle:true,write:false,format:'cjs',platform:'node',external:['react'],logLevel:'silent'});
const code=b.outputFiles[0].text;
export function fixture(extra={}){
 const slots=[],effects=[],pending=[];let cursor=0,dirty=false,out;
 const eq=(a,b)=>a&&b&&a.length===b.length&&a.every((x,i)=>Object.is(x,b[i]));
 const react={
  useRef(initial){const n=cursor++;return slots[n]??=( {current:initial} );},
  useState(initial){const n=cursor++;if(!(n in slots))slots[n]=typeof initial==='function'?initial():initial;return[slots[n],v=>{const next=typeof v==='function'?v(slots[n]):v;if(!Object.is(next,slots[n])){slots[n]=next;dirty=true;}}];},
  useCallback(fn,deps){const n=cursor++;if(!slots[n]||!eq(slots[n].deps,deps))slots[n]={deps,fn};return slots[n].fn;},
  useEffect(fn,deps){const n=cursor++;if(!effects[n]||!eq(effects[n].deps,deps))pending.push({n,fn,deps});},
 };
 const data=new Map(),writes=[],confirmed=[],messages=[],fault={drop:false};
 const storage={getItem:k=>data.get(k)??null,setItem(k,v){writes.push([k,v]);if(!fault.drop)data.set(k,v);},removeItem:k=>data.delete(k)};
 const document={visibilityState:'visible',focused:true,hasFocus(){return this.focused;}},root={blocked:false,closest(){return this.blocked?this:null;}};
 const module={exports:{}};runInNewContext(code,{module,exports:module.exports,require:name=>{assert.equal(name,'react');return react;},window:{localStorage:storage,confirm:()=>true},document,TextEncoder,TextDecoder,Date,console,crypto:webcrypto,setTimeout,clearTimeout});
 const a=module.exports,save=a.defaultSave('2026-10-16T00:00:00.000Z'),base=a.createDefaultShipProgression(save,save.updatedAt);
 data.set(a.SAVE_STORAGE_KEY,JSON.stringify(save));data.set(a.SHIP_PROGRESSION_STORAGE_KEY,JSON.stringify(base));
 let options={save,progression:base,controlled:false,suspended:false,rootRef:{current:root},onConfirmed:s=>{confirmed.push(s);options={...options,progression:s};dirty=true;},notify:m=>messages.push(m),...extra};
 function render(){cursor=0;dirty=false;out=a.useShipTrainingV94({...options});while(pending.length){const e=pending.shift();effects[e.n]?.cleanup?.();effects[e.n]={...e,cleanup:e.fn()};}}
 function flush(){let budget=30;do{render();assert.ok(--budget,'render loop');}while(dirty);}
 function update(values){options={...options,...values};flush();}
 function unmount(){for(const e of effects)e?.cleanup?.();}
 async function start(id='targeting'){const promise=out.requestTraining(id);flush();await promise;flush();}
 flush();return{a,data,writes,confirmed,messages,fault,document,root,flush,update,unmount,start,get current(){return out;},get options(){return options;},replay(){for(const e of effects)if(e){e.cleanup?.();e.cleanup=e.fn();}flush();}};
}
export const deferred=()=>{let resolve,reject;return{promise:new Promise((r,j)=>{resolve=r;reject=j;}),resolve:v=>resolve(v),reject:e=>reject(e)};};
