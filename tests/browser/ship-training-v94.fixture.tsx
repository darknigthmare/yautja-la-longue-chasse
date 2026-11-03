import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import ShipHub from '../../app/game/ShipHub';
import { defaultSave, SAVE_STORAGE_KEY } from '../../app/game/save';
import { createDefaultShipProgression, SHIP_PROGRESSION_STORAGE_KEY, type ShipProgressionState } from '../../app/game/systems/progression';
import {createShipTrainingRecoveryPortV94, SHIP_TRAINING_RECOVERY_DB_V94, SHIP_TRAINING_RECOVERY_STORE_V94} from '../../app/game/systems/shipTrainingRecoveryV94';
import { DEFAULT_CONTROL_BINDINGS } from '../../app/game/systems/controlBindings';
const save=defaultSave('2026-10-16T00:00:00.000Z');
const base=createDefaultShipProgression(save,save.updatedAt);
const originalSet=Storage.prototype.setItem,originalGet=Storage.prototype.getItem;
let fault='none',failRead=false;
const api={fault(value:string){fault=value;},writes:[] as string[],notifications:[] as string[],adopted:[] as ShipProgressionState[],
  pause:(_v:boolean)=>{},show:(_v:boolean)=>{},padEnabled:(_v:boolean)=>{},controlled:(_v:boolean)=>{},external:(_v:boolean)=>{},
  resolve:(_v:number)=>{},reject:()=>{},externalCalls:0,throwNotifications:false,sidecarKey:SHIP_PROGRESSION_STORAGE_KEY,recoveryDB:SHIP_TRAINING_RECOVERY_DB_V94,recoveryStore:SHIP_TRAINING_RECOVERY_STORE_V94,owner:save.createdAt,recovery:()=>createShipTrainingRecoveryPortV94()};
Storage.prototype.setItem=function(k,v){if(k===SHIP_PROGRESSION_STORAGE_KEY){api.writes.push(v);if(fault==='drop')return;if(fault==='quota')throw new DOMException('Fixture quota','QuotaExceededError');}
 originalSet.call(this,k,v);if(k===SHIP_PROGRESSION_STORAGE_KEY&&fault==='readback'){fault='none';failRead=true;}};
Storage.prototype.getItem=function(k){if(k===SHIP_PROGRESSION_STORAGE_KEY&&failRead){failRead=false;throw new DOMException('Fixture readback','SecurityError');}return originalGet.call(this,k);};
if(!originalGet.call(localStorage,SAVE_STORAGE_KEY))originalSet.call(localStorage,SAVE_STORAGE_KEY,JSON.stringify(save));
if(!originalGet.call(localStorage,SHIP_PROGRESSION_STORAGE_KEY))originalSet.call(localStorage,SHIP_PROGRESSION_STORAGE_KEY,JSON.stringify(base));
const pad={connected:true,index:0,id:'QA',axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false}))};
Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[pad]});
Object.assign(window,{__shipQa:api,__shipPad:pad});
function Fixture(){
 const[shown,setShown]=useState(true),[paused,setPaused]=useState(false),[enabled,setEnabled]=useState(true),[external,setExternal]=useState(false),[controlled,setControlled]=useState(false),[progression,setProgression]=useState(base),[epoch,setEpoch]=useState(0);
 useEffect(()=>{const timer=setInterval(()=>setEpoch(n=>n+1),50);return()=>clearInterval(timer);},[]);
 // The test bridge must return after React commits the requested pause,
 // so the timer assertion measures suspension rather than pending rendering.
 useEffect(()=>{api.show=setShown;api.pause=value=>flushSync(()=>setPaused(value));api.external=setExternal;api.controlled=setControlled;api.padEnabled=setEnabled;},[]);
 return <main><output data-rerenders>{epoch}</output>{shown&&<ShipHub save={save} initialRoomId="training" suspended={paused}
   gamepadEnabled={enabled} dialogueSource={undefined} progression={controlled?progression:undefined}
   controlBindings={{...DEFAULT_CONTROL_BINDINGS,'training.left':['KeyF'],'training.right':['KeyG'],'training.primary':['KeyH'],'training.secondary':['KeyI']}}
   onProgressionChange={value=>{api.adopted.push(value);if(controlled)setProgression(value);}} onNotify={message=>{api.notifications.push(message);if(api.throwNotifications)throw Error('Fixture HUD observer unavailable');}}
   onOpenMap={()=>{}} onOpenArmory={()=>{}} onOpenTrophies={()=>{}} onOpenArchives={()=>{}} onOpenCustomization={()=>{}}
   onTrainingRequested={external?()=>{api.externalCalls++;return new Promise<number>((resolve,reject)=>{api.resolve=resolve;api.reject=()=>reject(Error('late'));});}:undefined}/>}</main>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><Fixture/></StrictMode>);
