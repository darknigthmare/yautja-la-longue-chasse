"use client";
import {useEffect,useRef,useState} from 'react';
import {createPitCombatState} from './systems/pitCombat';
import type {PitExpansionFighterId} from './systems/pitRosterExpansion';
import {loadPitSpriteSheetAnimations,drawPitSpriteSheetHold} from './pitSpriteSheetAnimation';
import {PIT_SPRITE_SHEET_REGISTRY} from './pitSpriteSheetRegistry';

/** The selected side uses its own authored idle drawing, never a mirrored plate. */
export default function PitExtensionPortrait({fighterId,facing}:{fighterId:PitExpansionFighterId;facing:'left'|'right'}) {
 const canvasRef=useRef<HTMLCanvasElement>(null),[status,setStatus]=useState('loading');
 useEffect(()=>{const abort=new AbortController();const canvas=canvasRef.current;const ctx=canvas?.getContext('2d');if(!canvas||!ctx)return;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  void loadPitSpriteSheetAnimations([fighterId],PIT_SPRITE_SHEET_REGISTRY,{signal:abort.signal}).then(bank=>{if(abort.signal.aborted)return;const fighter=createPitCombatState(fighterId,'jungle-hunter').fighters[0];fighter.x=80;fighter.facing=facing==='right'?1:-1;ctx.save();ctx.scale(2,2);const drawn=drawPitSpriteSheetHold(ctx,bank,fighter,150);ctx.restore();setStatus(drawn?'authored-idle-pose':'missing');}).catch(()=>{if(!abort.signal.aborted)setStatus('missing');});
  return()=>abort.abort();
 },[fighterId,facing]);
 return <><canvas ref={canvasRef} width={320} height={320} style={{position:'absolute',inset:0,display:'block',width:'100%',height:'100%',minWidth:0,minHeight:0,objectFit:'contain'}} role="img" aria-label={`${fighterId}, pose dessinée vers la ${facing==='right'?'droite':'gauche'}`} data-pit-extension-portrait={status} data-native-facing={facing}/>{status==='missing'?<small>Pose orientée indisponible</small>:null}</>;
}
