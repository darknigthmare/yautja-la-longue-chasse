import {useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {useMenuGamepad} from '../../app/game/useMenuGamepad';

type Outcome={name:string;status:'PASS'|'FAIL';error?:string};
declare global {interface Window {__runMenuControlsQaV94:()=>Promise<Outcome[]>}}
const pad={index:0,id:'menu-controls-fixture',connected:true,axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0,touched:false}))};
Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[pad]});
function Fixture(){
  const root=useRef<HTMLDivElement>(null);
  useMenuGamepad(root,true,'fixture',()=>{});
  return <div ref={root}>
    <button id="disabled-button" disabled tabIndex={0}>Disabled button</button>
    <fieldset id="fieldset"><input aria-label="Range" id="range" type="range" min="0" max="10" step="1" defaultValue="5" tabIndex={0}/></fieldset>
    <select aria-label="Selection" id="select" defaultValue="one">
      <option value="one">One</option><optgroup label="Unavailable" disabled><option value="two">Two</option></optgroup><option value="three">Three</option>
    </select>
    <button id="enabled-button">Enabled button</button>
  </div>;
}
const frame=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
async function frames(){await frame();await frame();await frame();}
const check=(condition:unknown,message:string)=>{if(!condition)throw Error(message);};
window.__runMenuControlsQaV94=async()=>{
  const results:Outcome[]=[];
  const range=document.querySelector<HTMLInputElement>('#range')!,select=document.querySelector<HTMLSelectElement>('#select')!;
  const fieldset=document.querySelector<HTMLFieldSetElement>('#fieldset')!,enabled=document.querySelector<HTMLButtonElement>('#enabled-button')!;
  let changes=0,inputs=0;
  range.addEventListener('input',()=>inputs++);range.addEventListener('change',()=>changes++);select.addEventListener('change',()=>changes++);
  async function press(button=15){pad.buttons[button].pressed=true;await frame();pad.buttons[button].pressed=false;await frames();}
  async function reset(){
    pad.buttons.forEach(b=>b.pressed=false);range.disabled=false;fieldset.disabled=false;
    range.removeAttribute('aria-disabled');fieldset.removeAttribute('aria-disabled');fieldset.hidden=false;
    select.hidden=false;select.innerHTML='<option value="one">One</option><optgroup label="Unavailable" disabled><option value="two">Two</option></optgroup><option value="three">Three</option>';
    range.value='5';select.value='one';enabled.focus();await frames();changes=0;inputs=0;
  }
  async function scenario(name:string,run:()=>Promise<void>){try{await reset();await run();results.push({name,status:'PASS'});}catch(e){results.push({name,status:'FAIL',error:String(e)});}}
  await scenario('an enabled slider adjusts once and emits native events',async()=>{range.focus();await press();check(range.value==='6','range did not increment once');check(changes===1&&inputs===1,'event count');});
  await scenario('an aria-disabled focused slider cannot change',async()=>{range.focus();range.setAttribute('aria-disabled','true');await press();check(range.value==='5'&&changes===0&&inputs===0,'disabled slider changed');});
  await scenario('a disabled ARIA ancestor prevents slider adjustment',async()=>{range.focus();fieldset.setAttribute('aria-disabled','true');await press();check(range.value==='5'&&changes===0,'ancestor-disabled slider changed');});
  await scenario('disabled tabindex controls cannot trap initial focus',async()=>{fieldset.hidden=true;select.hidden=true;enabled.blur();await press(0);check(document.activeElement===enabled,'disabled tabindex stole initial focus');});
  await scenario('a disabled fieldset does not make its slider focusable',async()=>{fieldset.disabled=true;select.hidden=true;enabled.blur();await press(0);check(document.activeElement===enabled,'inherited disabled state bypassed');});
  await scenario('selection skips disabled optgroups',async()=>{select.focus();await press();check(select.value==='three'&&changes===1,'selected an unavailable group');});
  await scenario('selection skips hidden choices',async()=>{select.innerHTML='<option value="one">One</option><option value="two" hidden>Two</option><option value="three">Three</option>';select.value='one';select.focus();await press();check(select.value==='three','selected a hidden choice');});
  await scenario('slider at its bound emits no spurious save events',async()=>{range.value='10';range.focus();await press();check(range.value==='10'&&changes===0&&inputs===0,'unchanged slider emitted events');});
  await scenario('selection at its bound emits no spurious save events',async()=>{select.value='three';select.focus();await press();check(select.value==='three'&&changes===0,'unchanged select emitted change');});
  await scenario('left selection uses the previous available option',async()=>{select.value='three';select.focus();await press(14);check(select.value==='one'&&changes===1,'reverse navigation selected unavailable group');});
  return results;
};
createRoot(document.getElementById('root')!).render(<Fixture/>);
