import {useCallback,useLayoutEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import HuntRitesMenuV77 from '../../app/game/HuntRitesMenuV77';
import {defaultSave} from '../../app/game/save';
import {makeAnatomySpecimenV112} from '../../app/game/systems/anatomyHarvestV112';
import {normalizeHuntAccessibilityV112} from '../../app/game/systems/huntAccessibilityV112';
import {__harvestPreviewRuntime as r,__runHarvestPreviewRite} from 'harvest-preview-native-runtime';

// Explicitly constructed boundary fixtures. The body is created by actual
// damageEnemy; the browser performs flaying and harvesting through the real
// component callback. Seeded bags are not claimed as previously played hunts.
const pad={connected:true,index:0,id:'QA 20261109 emulated standard pad',axes:[0,0,0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0,touched:false}))};
Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[pad]});
const audit={};window.__harvestPreviewQa=audit;
function makeRuntime(scenario='empty'){
  pad.axes.fill(0);pad.buttons.forEach(button=>{button.pressed=false;button.value=0;});
  const save=defaultSave('2026-11-09T04:30:00.000Z');save.inventory.fieldToolIds=['flaying-tool'];
  save.settings.huntAccessibility=normalizeHuntAccessibilityV112(save.settings.huntAccessibility);
  if(scenario==='mass')save.loadout.armorId='scout';
  const mission=r.MISSION_BY_ID['jungle-vey'];
  const game=r.makeGameState(mission,save.loadout,save.inventory,'hunter',save.appearance,false,false,7,save.exploration);
  game.world={...game.world,platforms:[],hazards:[],covers:[],climbables:[]};
  Object.assign(game.player,{x:1100,y:game.world.floorY-game.player.height,previousY:game.world.floorY-game.player.height,grounded:true,climbing:false,velocityX:0,velocityY:0});
  const enemy=r.makeEnemy('qa-preview-body','hell-hound-stalker',mission.id,1120,game.world.width,80,10,0,1,1);
  Object.assign(enemy,{x:1120,y:game.world.floorY-60,width:40,height:60,health:80,maxHealth:80,scanned:true,active:true});
  game.enemies=[enemy];game.elapsed=1;r.damageEnemy(game,mission,enemy,80,'melee');
  if(game.huntRites.corpses.length!==1)throw Error('The native death did not produce its unique source body.');
  if(scenario==='mass')game.huntRites.specimensV112=Array.from({length:5},(_,index)=>makeAnatomySpecimenV112(game.huntRites.runId,'qa-seeded-croc-'+index,'naraka-delta--iron-croc','harvest-hide',100,true));
  if(scenario==='volume')game.huntRites.specimensV112=Array.from({length:8},(_,index)=>makeAnatomySpecimenV112(game.huntRites.runId,'qa-seeded-hound-'+index,'hell-hound-stalker','harvest-hide',100,true));
  if(scenario==='depot')game.harvestDepotFreeV112=0;
  const input={keyboardHeld:new Set(),touchHeld:new Set(),gamepadHeld:new Set(),pressed:new Set(),previousGamepadButtons:[],activeGamepadIndex:null,gamepadNeedsNeutral:true,gamepadDialogActions:[],pointerScreen:null,accessibility:save.settings.huntAccessibility};
  return{game,save,mission,input,scenario};
}
function menuFor(f){const context=r.riteContextV77(f.game);return r.huntRiteMenuSnapshotV77(f.game.huntRites,context.actor,f.game.riteMenuCorpseId,true,r.riteRuntimeOptionsV112(f.game));}
function Fixture(){
 const [engine]=useState(()=>makeRuntime()),current=useRef(engine),canvas=useRef(null);
 const [snapshot,setSnapshot]=useState(()=>menuFor(engine));
 const publish=useCallback(()=>setSnapshot(menuFor(current.current)),[]);
 const reset=useCallback((scenario='empty')=>{current.current=makeRuntime(scenario);publish();},[publish]);
 const tick=useCallback((frames=1)=>{
  const f=current.current;
  for(let i=0;i<frames;i++){f.game.elapsed+=1/120;r.updateHuntRitesV77(f.game,1/120);}
  publish();
 },[publish]);
 const nativeTick=useCallback((frames=1)=>{
  const f=current.current;
  for(let i=0;i<frames;i++)r.stepGame(f.game,f.mission,f.save.loadout,f.save.inventory,f.save.appearance,'hunter',f.input,1/120,()=>{});
  publish();
 },[publish]);
 useLayoutEffect(()=>{
  Object.assign(audit,{reset,tick,nativeTick,state:()=>JSON.parse(JSON.stringify({scenario:current.current.scenario,menu:menuFor(current.current),rites:current.current.game.huntRites,elapsed:current.current.game.elapsed})),
   pad(action,pressed){if(action==='down')pad.axes[1]=pressed?1:0;else if(action==='up')pad.axes[1]=pressed?-1:0;else{const button=current.current.save.settings.huntAccessibility.gamepadButtons[action];pad.buttons[button].pressed=pressed;pad.buttons[button].value=pressed?1:0;}}
  });
 },[reset,tick,nativeTick]);
 useLayoutEffect(()=>{
  const f=current.current;if(!f)return;
  r.flushCorpseRiteGamepadV112(f.game,f.input,document.querySelector('main'),publish,()=>canvas.current?.focus());
 },[snapshot,publish]);
 const act=action=>{const f=current.current;__runHarvestPreviewRite(f.game,f.mission,action);publish();};
 return <main><h1>Prélèvement · recette navigateur du 9 novembre</h1>
  <p>Composant et moteur réels, état initial de contrôle déclaré. Ce cadre ne représente pas une chasse complète ni une revue artistique.</p>
  <div style={{position:'relative',height:780,border:'1px solid #53635b',background:'#16231d'}}>
   <canvas ref={canvas} width={32} height={32} tabIndex={0} aria-label="Entrée native du menu de prélèvement" style={{position:'absolute',left:12,bottom:12}}/>
   <HuntRitesMenuV77 menu={snapshot} onOpen={()=>act('open')} onClose={()=>act('close')} onAction={act}/>
  </div>
 </main>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
