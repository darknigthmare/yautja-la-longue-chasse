import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import TrainingDrill from '../../app/game/TrainingDrill';
import { DEFAULT_CONTROL_BINDINGS } from '../../app/game/systems/controlBindings';
import type { TrainingDisciplineId } from '../../app/game/systems/progression';

declare global { interface Window { __trainingQa: {
  reset(discipline?:TrainingDisciplineId,held?:boolean):void;
  pause(value:boolean):void;unmount():void;block(value:boolean):void;deny(value:boolean):void;enablePad(value:boolean):void;failReceiver(value:boolean):void;
  pad(button:number,value:boolean):void;
  completed:Array<{score:number;generation:number}>;cancels:number;
} } }
const pad={connected:true,index:2,id:'training-qa',axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0,touched:false}))};
let denied=false, receiverFailure=false;
Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>{if(denied)throw new DOMException('Fixture denied','SecurityError');return[null,null,pad];}});
const bindings={...DEFAULT_CONTROL_BINDINGS,'training.left':['KeyF'],'training.right':['KeyG'],'training.primary':['KeyH'],'training.secondary':['KeyI'],'training.cancel':['KeyP']};
function Fixture(){
  const [discipline,setDiscipline]=useState<TrainingDisciplineId>('targeting'),[session,setSession]=useState(0);
  const [paused,setPaused]=useState(false),[shown,setShown]=useState(true),[blocked,setBlocked]=useState(false),[enabled,setEnabled]=useState(true),[generation,setGeneration]=useState(0);
  useEffect(()=>{const id=window.setInterval(()=>setGeneration(value=>value+1),35);return()=>clearInterval(id);},[]);
  useEffect(()=>{
    window.__trainingQa={
      reset(next='targeting',held=false){denied=false;receiverFailure=false;pad.buttons.forEach(button=>button.pressed=false);pad.buttons[0].pressed=held;this.completed=[];this.cancels=0;setDiscipline(next);setPaused(false);setShown(true);setBlocked(false);setEnabled(true);setSession(value=>value+1);},
      pause:setPaused,unmount:()=>setShown(false),block:setBlocked,deny:value=>{denied=value;},enablePad:setEnabled,failReceiver:value=>{receiverFailure=value;},
      pad(index,value){pad.buttons[index].pressed=value;},completed:[],cancels:0,
    };
  },[]);
  return <main data-session={session} inert={blocked}>
    <output>{generation}</output>
    {shown&&<TrainingDrill key={session} disciplineId={discipline} seed={11} controlBindings={bindings}
      suspended={paused} gamepadEnabled={enabled} onComplete={score=>{window.__trainingQa.completed.push({score,generation});if(receiverFailure)throw new Error("Fixture receiver failed after attempt");}}
      onCancel={()=>window.__trainingQa.cancels++}/>}
  </main>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><Fixture/></StrictMode>);
