import {StrictMode, useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import TrophyWorkshop from '../../app/game/TrophyWorkshop';
import type {TrophyWorkshopAction, TrophyWorkshopResult} from '../../app/game/systems/trophyWorkshop';

declare global {interface Window {__workshopQa: {
  reset(action:TrophyWorkshopAction,held?:boolean):void;pause(value:boolean):void;unmount():void;
  pad(button:number,value:boolean):void;deny(value:boolean):void;
  completions:Array<{result:TrophyWorkshopResult;generation:number}>;cancels:number;
}}}
const pad={connected:true,index:2,id:'workshop-test-pad',axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0,touched:false}))};
let denied=false;
Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>{if(denied)throw new DOMException('Test denied','SecurityError');return[null,null,pad];}});
function Fixture(){
  const [action,setAction]=useState<TrophyWorkshopAction>('clean'),[session,setSession]=useState(0);
  const [paused,setPaused]=useState(false),[hidden,setHidden]=useState(false),[generation,setGeneration]=useState(0);
  // Deliberately recreate both parent callbacks throughout the attempt.
  useEffect(()=>{const id=window.setInterval(()=>setGeneration(value=>value+1),35);return()=>clearInterval(id);},[]);
  useEffect(()=>{
    window.__workshopQa={
      reset(next,held=false){denied=false;pad.buttons.forEach(button=>button.pressed=false);pad.buttons[0].pressed=held;
        this.completions=[];this.cancels=0;setAction(next);setPaused(false);setHidden(false);setSession(value=>value+1);},
      pause:setPaused,unmount:()=>setHidden(true),
      pad(button,value){pad.buttons[button].pressed=value;},deny(value){denied=value;},completions:[],cancels:0,
    };
  },[]);
  return <main data-session={session}>
    <output id="generation">{generation}</output>
    {!hidden&&<TrophyWorkshop key={session} action={action} trophyId={`qa-${action}`} trophyName="Prise de test"
      suspended={paused} onComplete={result=>window.__workshopQa.completions.push({result,generation})}
      onCancel={()=>window.__workshopQa.cancels++}/>}
  </main>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><Fixture/></StrictMode>);
