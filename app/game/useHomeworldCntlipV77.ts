"use client";
import {useCallback,useEffect,useRef,useState,type RefObject} from 'react';
import type {SaveGame} from './types';
import type {HomeworldProgress,HomeworldActor} from './systems/homeworld';
import type {HomeworldInteriorV64} from './systems/homeworldInteriorsV64';
import {homeworldCntlipContextV77,homeworldCntlipEligibleV77,homeworldCntlipReachedV77} from './systems/homeworldCntlipPhysicalV77';
import {cntlipSiteStockV77,createCntlipTransactionV77,defaultCntlipLedgerV77,normalizeCntlipLedgerV77,type CntlipLedgerActionV77} from './systems/cntlipLedgerV77';
import {cntlipEffectsV77,type CntlipSiteIdV77} from './systems/cntlipV77';

interface Options {save:SaveGame;actor:HomeworldActor;room:HomeworldInteriorV64|null;sceneReady:boolean;saveRef:RefObject<SaveGame>;progressRef:RefObject<HomeworldProgress>;actorRef:RefObject<HomeworldActor>;interiorRef:RefObject<HomeworldInteriorV64|null>;
 sceneAvailable:()=>boolean;onProgress:(next:HomeworldProgress)=>boolean;clearInputs:()=>void;onNotify:(message:string)=>void;}
export default function useHomeworldCntlipV77(options:Options) {
  const live=useRef(options);
  useEffect(()=>{live.current=options;});
  const [siteId,setSiteId]=useState<CntlipSiteIdV77|null>(null);
  const siteRef=useRef<CntlipSiteIdV77|null>(null);
  const seatedRef=useRef<CntlipSiteIdV77|null>(null);
  const [seated,setSeated]=useState(false);
  const [message,setMessage]=useState('');
  const [writePaused,setWritePaused]=useState(false);
  const writePausedRef=useRef(false);
  const [reducedMotion,setReducedMotion]=useState(true);
  useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setReducedMotion(media.matches);update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
  const transactionRef=useRef<ReturnType<typeof createCntlipTransactionV77>|null>(null);
  useEffect(()=>{transactionRef.current=createCntlipTransactionV77(()=>live.current.progressRef.current.cntlipV77,next=>{
    const current=live.current;
    if(current.saveRef.current.createdAt!==current.save.createdAt)return false;
    const homeworld={...current.progressRef.current,cntlipV77:next};
    if(!current.onProgress(homeworld))return false;
    // Preserve the exact location added by the city's durable wrapper.
    current.progressRef.current={...current.progressRef.current,cntlipV77:next};
    current.saveRef.current={...current.saveRef.current,homeworld:current.progressRef.current};return true;
  });},[]);
  const context=useCallback(()=>{
    const current=live.current,host=homeworldCntlipReachedV77(current.interiorRef.current,current.actorRef.current);
    return homeworldCntlipContextV77({save:current.saveRef.current,room:current.interiorRef.current,actor:current.actorRef.current,
      sceneActive:current.sceneAvailable()&&current.saveRef.current.createdAt===current.save.createdAt&&host?.siteId===siteRef.current,
      seatedSiteId:seatedRef.current,servingStock:cntlipSiteStockV77(current.progressRef.current.cntlipV77,host?.siteId??null)});
  },[]);
  const submit=useCallback((action:CntlipLedgerActionV77)=>{
    if(!transactionRef.current)return false;
    const result=transactionRef.current(action,context());
    // A failed storage write pauses the clock until an explicit retry. No RAF
    // retries, repeated reservations or success notice after uncertain storage.
    writePausedRef.current=!result.ok;setWritePaused(!result.ok);setMessage(result.message);
    if(action.type!=='advance-serving'||!result.ok||!result.ledger.state.pending)live.current.onNotify(result.message);
    return result.ok;
  },[context]);
  const open=useCallback((id:CntlipSiteIdV77)=>{
    const current=live.current,host=homeworldCntlipReachedV77(current.interiorRef.current,current.actorRef.current);
    if(!current.sceneAvailable()||!homeworldCntlipEligibleV77(current.saveRef.current)||host?.siteId!==id)return false;
    current.clearInputs();const stopped={...current.actorRef.current,vx:0,vy:0};current.actorRef.current=stopped;
    siteRef.current=id;setSiteId(id);
    const pending=normalizeCntlipLedgerV77(current.progressRef.current.cntlipV77)?.state.pending;
    seatedRef.current=pending?.siteId===id?id:null;setSeated(seatedRef.current===id);
    writePausedRef.current=false;setWritePaused(false);setMessage(pending?.siteId===id?'La portion réservée reprend ici ; aucune nouvelle coupe n’est consommée.':'Cette réception et son hôte sont des créations originales du clan.');return true;
  },[]);
  const leave=useCallback(()=>{siteRef.current=null;setSiteId(null);seatedRef.current=null;setSeated(false);},[]);
  const install=useCallback(()=>{
    if(!context().safe||!context().sceneActive)return;
    seatedRef.current=siteRef.current;setSeated(true);setMessage('Tu t’arrêtes auprès de la table. Les gestes natifs assis et de boisson ne sont pas encore produits.');
  },[context]);
  useEffect(()=>{
    let request=0,previous:number|null=null,accumulated=0;
    const frame=(time:number)=>{
      const current=live.current,ledger=normalizeCntlipLedgerV77(current.progressRef.current.cntlipV77),ctx=context();
      const active=!!ledger?.state.pending&&!!siteRef.current&&ctx.sceneActive&&ctx.safe&&ctx.seated&&!writePausedRef.current&&!document.hidden&&document.hasFocus();
      if(!active){previous=null;accumulated=0;}else{
        // Dropped or hidden frames are not added as a time catch-up.
        if(previous!==null)accumulated+=Math.min(100,Math.max(0,time-previous));previous=time;
        if(accumulated>=500){const elapsedMs=Math.min(1000,Math.floor(accumulated));accumulated=0;submit({type:'advance-serving',elapsedMs});}
      }
      request=requestAnimationFrame(frame);
    };request=requestAnimationFrame(frame);return()=>cancelAnimationFrame(request);
  },[context,submit]);
  // Render from React snapshots, never from mutable physical refs. Event and
  // clock handlers above still rebuild their trusted context from fresh refs.
  const ledger=normalizeCntlipLedgerV77(options.save.homeworld.cntlipV77)??defaultCntlipLedgerV77();
  const host=homeworldCntlipReachedV77(options.room,options.actor);
  const ctx=homeworldCntlipContextV77({save:options.save,room:options.room,actor:options.actor,
    sceneActive:options.sceneReady&&host?.siteId===siteId,seatedSiteId:seated?siteId:null,
    servingStock:cntlipSiteStockV77(ledger,host?.siteId??null)});
  const effects=cntlipEffectsV77(ledger.state,{safe:ctx.safe&&options.sceneReady,inCombat:false,reducedMotion,bioMaskWorn:options.save.appearance.biomaskId!==null});
  return {siteId,seated,message,writePaused,ledger,context:ctx,effects,open,leave,install,submit};
}
