import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import ShipHub from '../../app/game/ShipHub';
import { defaultSave, SAVE_STORAGE_KEY } from '../../app/game/save';
import { createDefaultShipProgression, SHIP_PROGRESSION_STORAGE_KEY, writeShipProgressionWithStatus, type ShipProgressionState } from '../../app/game/systems/progression';
import type { ShipTrainingAcknowledgementV94 } from '../../app/game/systems/shipTrainingAcknowledgementV94';
const save=defaultSave('2026-10-16T00:00:00.000Z'),base=createDefaultShipProgression(save,save.updatedAt);
const originalSet=Storage.prototype.setItem;
const api={ready:false,calls:0,writes:[] as string[],notifications:[] as string[],reply:(_mode:string)=>{},show:(_shown:boolean)=>{},sidecarKey:SHIP_PROGRESSION_STORAGE_KEY};
Storage.prototype.setItem=function(key,value){if(key===SHIP_PROGRESSION_STORAGE_KEY)api.writes.push(value);originalSet.call(this,key,value);};
originalSet.call(localStorage,SAVE_STORAGE_KEY,JSON.stringify(save));originalSet.call(localStorage,SHIP_PROGRESSION_STORAGE_KEY,JSON.stringify(base));
Object.assign(window,{__ackQa:api});
function Fixture(){
 const[shown,setShown]=useState(true),[progression,setProgression]=useState(base);
 useEffect(()=>{api.show=setShown;api.ready=true;return()=>{api.ready=false;};},[]);
 function receive(state:ShipProgressionState):Promise<ShipTrainingAcknowledgementV94>{
  api.calls++;
  return new Promise((resolve,reject)=>{api.reply=mode=>{
   if(mode==='reject'){reject(Error('Host refused acknowledgement'));return;}
   if(mode==='void'){resolve();return;}
   if(mode==='invalid'){const wrong=structuredClone(state);wrong.training.mobility.attempts++;resolve({state:wrong,persisted:true,failure:null});return;}
   const result=writeShipProgressionWithStatus(state,save);
   if(result.persisted)setProgression(result.state);
   if(mode==='write-then-reject')reject(Error('Host wrote, acknowledgement interrupted'));else resolve(result);
  };});
 }
 return <main>{shown&&<ShipHub save={save} initialRoomId="training" progression={progression} gamepadEnabled={false}
  onProgressionChange={receive} onNotify={message=>api.notifications.push(message)}
  onOpenMap={()=>{}} onOpenArmory={()=>{}} onOpenTrophies={()=>{}} onOpenArchives={()=>{}} onOpenCustomization={()=>{}}/>}</main>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><Fixture/></StrictMode>);
