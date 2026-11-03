"use client";
import {useEffect,useRef,useState} from 'react';
import {createPitCombatState} from './systems/pitCombat';
import type {PitExpansionFighterId} from './systems/pitRosterExpansion';
import {loadPitSpriteSheetAnimations,drawPitSpriteSheetHold,resolvePitSpriteSheetHold} from './pitSpriteSheetAnimation';
import {PIT_SPRITE_SHEET_REGISTRY} from './pitSpriteSheetRegistry';
import {pitPortraitAnimationRegistry} from './pitPortraitArt';

/** The selected side uses its own authored idle drawing, never a mirrored plate. */
export default function PitExtensionPortrait({fighterId,facing,framing='selection'}:{fighterId:PitExpansionFighterId;facing:'left'|'right';framing?:'selection'|'full-body'}) {
 const identity=`${fighterId}:${facing}:${framing}`;
 const canvasRef=useRef<HTMLCanvasElement>(null),[result,setResult]=useState({identity,status:'loading'});
 const status=result.identity===identity?result.status:'loading';
 useEffect(()=>{const abort=new AbortController();const canvas=canvasRef.current;const ctx=canvas?.getContext('2d');if(!canvas||!ctx){queueMicrotask(()=>{if(!abort.signal.aborted)setResult({identity,status:'missing'});});return()=>abort.abort();}
  ctx.clearRect(0,0,canvas.width,canvas.height);
  void loadPitSpriteSheetAnimations([fighterId],pitPortraitAnimationRegistry(fighterId,facing,PIT_SPRITE_SHEET_REGISTRY),{signal:abort.signal}).then(bank=>{if(abort.signal.aborted)return;const fighter=createPitCombatState(fighterId,'jungle-hunter').fighters[0];fighter.x=80;fighter.facing=facing==='right'?1:-1;let drawn=false;ctx.save();
   if(framing==='full-body'){
    // Fit the actual authored frame, including its weapons. Reading a story
    // must not shrink an atlas portrait to the old selection canvas body size.
    const hold=resolvePitSpriteSheetHold(bank,fighter);
    if(hold){const rect=hold.frame.frame.rect,scale=Math.min((canvas.width-24)/rect[2],(canvas.height-24)/rect[3]);ctx.imageSmoothingEnabled=true;ctx.drawImage(hold.source,...rect,(canvas.width-rect[2]*scale)/2,(canvas.height-rect[3]*scale)/2,rect[2]*scale,rect[3]*scale);drawn=true;}
   }else{ctx.scale(2,2);drawn=drawPitSpriteSheetHold(ctx,bank,fighter,150);}
   ctx.restore();setResult({identity,status:drawn?'authored-idle-pose':'missing'});}).catch(()=>{if(!abort.signal.aborted)setResult({identity,status:'missing'});});
  return()=>abort.abort();
 },[fighterId,facing,identity,framing]);
 return <><canvas ref={canvasRef} width={320} height={framing==='full-body'?480:320} style={{position:'absolute',inset:0,display:'block',width:'100%',height:'100%',minWidth:0,minHeight:0,objectFit:'contain',visibility:status==='authored-idle-pose'?'visible':'hidden'}} role="img" aria-label={`${fighterId}, pose dessinée vers la ${facing==='right'?'droite':'gauche'}`} data-pit-extension-portrait={status} data-native-facing={facing}/>{status==='loading'?<small role="status" style={{position:'absolute',inset:0,display:'grid',placeItems:'center',fontSize:'.65rem'}}>Chargement du portrait…</small>:null}{status==='missing'?<small>Pose orientée indisponible</small>:null}</>;
}
