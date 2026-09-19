"use client";
import {useEffect,useRef,useState} from 'react';
import {createPitCombatState} from './systems/pitCombat';
import type {PitExpansionFighterId} from './systems/pitRosterExpansion';
import {loadPitSpriteSheetAnimations,drawPitSpriteSheetHold} from './pitSpriteSheetAnimation';
import {PIT_SPRITE_SHEET_REGISTRY} from './pitSpriteSheetRegistry';
import {pitPortraitAnimationRegistry} from './pitPortraitArt';

/** The selected side uses its own authored idle drawing, never a mirrored plate. */
export default function PitExtensionPortrait({fighterId,facing}:{fighterId:PitExpansionFighterId;facing:'left'|'right'}) {
 const identity=`${fighterId}:${facing}`;
 const canvasRef=useRef<HTMLCanvasElement>(null),[result,setResult]=useState({identity,status:'loading'});
 const status=result.identity===identity?result.status:'loading';
 useEffect(()=>{const abort=new AbortController();const canvas=canvasRef.current;const ctx=canvas?.getContext('2d');if(!canvas||!ctx){queueMicrotask(()=>{if(!abort.signal.aborted)setResult({identity,status:'missing'});});return()=>abort.abort();}
  ctx.clearRect(0,0,canvas.width,canvas.height);
  void loadPitSpriteSheetAnimations([fighterId],pitPortraitAnimationRegistry(fighterId,facing,PIT_SPRITE_SHEET_REGISTRY),{signal:abort.signal}).then(bank=>{if(abort.signal.aborted)return;const fighter=createPitCombatState(fighterId,'jungle-hunter').fighters[0];fighter.x=80;fighter.facing=facing==='right'?1:-1;ctx.save();ctx.scale(2,2);const drawn=drawPitSpriteSheetHold(ctx,bank,fighter,150);ctx.restore();setResult({identity,status:drawn?'authored-idle-pose':'missing'});}).catch(()=>{if(!abort.signal.aborted)setResult({identity,status:'missing'});});
  return()=>abort.abort();
 },[fighterId,facing,identity]);
 return <><canvas ref={canvasRef} width={320} height={320} style={{position:'absolute',inset:0,display:'block',width:'100%',height:'100%',minWidth:0,minHeight:0,objectFit:'contain',visibility:status==='authored-idle-pose'?'visible':'hidden'}} role="img" aria-label={`${fighterId}, pose dessinée vers la ${facing==='right'?'droite':'gauche'}`} data-pit-extension-portrait={status} data-native-facing={facing}/>{status==='loading'?<small role="status" style={{position:'absolute',inset:0,display:'grid',placeItems:'center',fontSize:'.65rem'}}>Chargement du portrait…</small>:null}{status==='missing'?<small>Pose orientée indisponible</small>:null}</>;
}
