/** Native component harness: real reducer, real campaign writer, real localStorage.
 * This is not the full GameClient/Homeworld journey; that integration has separate QA. */
import React,{useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import Garage from '../../app/game/MobilityGarage';
import {defaultSave,loadSaveWithStatus,writeSaveWithStatus,reconcileSaveWrite} from '../../app/game/save';
import type {SaveWriteResult} from '../../app/game/save';
import {actMobility,type MobilityCommand} from '../../app/game/systems/mobility/ledger';
import type {MobilityReceipt} from '../../app/game/systems/mobility/controller';

import {actMountsV153,type MountCommandV153,type MountReceiptV153} from '../../app/game/systems/mobility/mountsV153';
import {actMountRideV156,type MountRideCommandV156,type MountRideReceiptV156} from '../../app/game/systems/mobility/mountRidingV156';

const OWNER='2026-11-08T10:00:00.000Z';
function initial(){
 if(!localStorage.getItem('yautja-long-hunt.save')){
  const seed=defaultSave(OWNER);
  seed.profile.honor=300;
  seed.profile.rankId='blooded';
  seed.profile.acquiredRankIdV166='blooded';
  seed.profile.clanMarks=10000;
  seed.settings.masterVolume=0;const w=writeSaveWithStatus(seed);if(!w.persisted)throw new Error(w.failure??'seed');
 }
 return loadSaveWithStatus().save;
}
function App(){
 const [save,setSave]=useState(initial),[closed,setClosed]=useState(false),current=useRef(save);
 const pending=useRef<{attempt:SaveWriteResult;command:string}|null>(null);
 const order=(command:MobilityCommand):MobilityReceipt=>{
  if(pending.current){
   const recovered=reconcileSaveWrite(pending.current.attempt,current.current.createdAt);
   if(recovered.status==='refused')return {accepted:false,state:current.current.mobilityV1??null,message:'Écriture non confirmée'};
   const same=pending.current.command===JSON.stringify(command);pending.current=null;
   if(recovered.status==='confirmed'){current.current=recovered.save;setSave(recovered.save);if(same)return {accepted:true,state:recovered.save.mobilityV1??null,message:'Écriture récupérée'};}
  }
  const r=actMobility(current.current,command);if(!r.accepted||!r.state)return r;
  const next={...current.current,mobilityV1:r.state,profile:{...current.current.profile,clanMarks:r.clanMarks}};
  const w=writeSaveWithStatus(next);
  if(!w.persisted){if(w.failure==='write-failed')pending.current={attempt:w,command:JSON.stringify(command)};return {accepted:false,state:current.current.mobilityV1??null,message:'Écriture non confirmée'};}
  current.current=w.save;setSave(w.save);return {accepted:true,state:w.save.mobilityV1??null,message:r.message};
 };

 const mountOrder=(command:MountCommandV153):MountReceiptV153=>{
  const value=current.current;
  const result=actMountsV153(value,command);
  if(!result.accepted||!result.state) return {...result,state:value.mountsV153??null};
  const written=writeSaveWithStatus({...value,mountsV153:result.state,profile:{...value.profile,clanMarks:result.clanMarks}});
  if(!written.persisted)return {accepted:false,state:value.mountsV153??null,message:written.failure??'write rejected'};
  current.current=written.save;
  setSave(written.save);
  return {accepted:true,state:written.save.mountsV153??null,message:result.message};
 };
 const rideOrder=(command:MountRideCommandV156):MountRideReceiptV156=>{
  const value=current.current;
  const result=actMountRideV156(value,command);
  if(!result.accepted||!result.rides)return {accepted:false,state:value.mountRidesV156??null,message:result.message};
  const next={...value,mountRidesV156:result.rides,...(result.mounts?{mountsV153:result.mounts}:{})};
  const written=writeSaveWithStatus(next);
  if(!written.persisted)return {accepted:false,state:value.mountRidesV156??null,message:written.failure??'write rejected'};
  current.current=written.save;
  setSave(written.save);
  return {accepted:true,state:written.save.mountRidesV156??null,message:result.message};
 };

 return <><div style={{color:'#cdd4d1',padding:12}}>Recette native du composant · sauvegarde de test distincte · aucun son généré</div>{closed?<button onClick={()=>setClosed(false)}>Rouvrir</button>:<Garage save={save} onCommand={order} onMountCommand={mountOrder} onRideCommand={rideOrder} onClose={()=>setClosed(true)}/>}</>;
}
createRoot(document.getElementById('root')!).render(<App/>);
