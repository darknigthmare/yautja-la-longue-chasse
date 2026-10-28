import {useLayoutEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import HuntAccessibilityPanelV112 from '../../app/game/HuntAccessibilityPanelV112';
import HuntFieldGuideV112 from '../../app/game/HuntFieldGuideV112';
import ConservationPanelV112 from '../../app/game/ConservationPanelV112';
import HuntRitesMenuV77 from '../../app/game/HuntRitesMenuV77';
import {defaultSave} from '../../app/game/save';
import {emptyHarvestInventoryV112,startConservationV112,workConservationV112,repairFieldToolV112,archiveMountedSpecimenV112} from '../../app/game/systems/harvestInventoryV112';
import {normalizeHuntAccessibilityV112} from '../../app/game/systems/huntAccessibilityV112';
import {matchingControlActions} from '../../app/game/systems/controlBindings';
import {__huntRuntimeQaV112 as r,__runRiteMenuQaV112} from 'hunt-runtime-v112';

const fresh=()=>{
 const save=defaultSave('2026-10-28T00:00:00.000Z');
 save.profile.clanMarks=50;save.inventory.fieldToolIds=['flaying-tool'];
 save.settings.huntAccessibility=normalizeHuntAccessibilityV112(undefined);
 save.inventory.harvestV112={...emptyHarvestInventoryV112(),toolCondition:40,specimens:[{
  id:'jungle-vey:0:qa-beast:hide',sourceId:'jungle-vey:0:qa-beast',speciesId:'vey-beast',partId:'hide',label:'Peau de la proie de contrôle',
  quality:86,massKg:4,volumeUnits:3,stage:'raw',
 }]};
 return save;
};
const blankAssets={
 background:null,farLake:null,hunterBodyFull:null,hunterBodyParts:{},hunterNetParts:{},hunterDreads:null,hunterMask:null,
 hunterArmor:{},hunterPlasma:{},hunterGauntlet:{},hunterWristblades:{},hunterWeapons:{},hunterGear:{},hunterTrophies:{},
 treeTrunk:null,vineLadder:null,platformRoot:null,platformStone:null,pilotModule:null,iceRegionTextures:{},expansionDeviceTextures:{},
 platformCrown:null,platformExpedition:null,foregroundFerns:null,foregroundVines:null,foregroundReeds:null,enemyV4:{},enemyV7:{},enemyV8:{},
 enemyTrophies:{},campaignTrophies:{},mercenary:null,cryostalker:null,badBlood:null,shipsAtlas:null,preyAtlas:null,masksTrophiesAtlas:null,ranksLasersAtlas:null,environmentProps:{},
};
const pad={connected:true,index:0,id:'V112 browser emulated standard pad',axes:[0,0,0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0,touched:false}))};
Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[pad]});
const audit={failWrites:false,events:[],show(){},reset(){},save(){},settings(){},guide(){},tick(){},resetCanopy(){},state(){},pad(){},resetRites(){}};
window.__huntMechanicsQaV112=audit;
function Fixture(){
 const [save,setSave]=useState(fresh),saveRef=useRef(save),[view,setView]=useState('accessibility'),[revision,bump]=useState(0);
 const canvas=useRef(null),runtime=useRef(null),[guide,setGuide]=useState({phase:'tracking',gripExhausted:false});
 const commit=next=>{localStorage.setItem('v112-browser-confirmed-save',JSON.stringify(next));saveRef.current=JSON.parse(localStorage.getItem('v112-browser-confirmed-save'));setSave(saveRef.current);};
 const newRuntime=(kind='canopy')=>{
  const current=saveRef.current,mission=r.MISSION_BY_ID['jungle-vey'];
  const game=r.makeGameState(mission,current.loadout,current.inventory,'hunter',current.appearance,false,false,'v112-browser-native',current.exploration);
  game.huntAccessibility=current.settings.huntAccessibility;game.enemies=[];game.recoveryNodes=[];
  const input={keyboardHeld:new Set(),touchHeld:new Set(),gamepadHeld:new Set(),pressed:new Set(),previousGamepadButtons:[],activeGamepadIndex:null,gamepadNeedsNeutral:true,gamepadDialogActions:[],pointerScreen:null,accessibility:current.settings.huntAccessibility};
  if(kind==='canopy'){
   const support=game.world.climbables.find(s=>s.id.startsWith('v112-canopy-')&&s.kind==='vine');if(!support)throw Error('No authored flexible canopy support');
   Object.assign(game.player,{x:support.x+support.width/2-game.player.width/2,y:support.y+180-game.player.height*.28,velocityX:0,velocityY:0,grounded:false,climbing:true,climbZoneId:support.id,stamina:100});
  }else{
   game.world={...game.world,platforms:[],hazards:[],covers:[],climbables:[{id:'v112-browser-real-tree',x:1000,y:248,width:132,height:376,kind:'tree',routeId:'canopy',climbSpeedMultiplier:1,staminaPerSecond:3,dismounts:[]}]};
   const enemy=r.makeEnemy('v112-browser-real-prey','hell-hound-stalker',mission.id,1120,game.world.width,80,10,0,1,1);
   Object.assign(enemy,{x:1120,y:564,width:40,height:60,health:80,maxHealth:80,knockbackRestY:564,scanned:true,active:true});
   game.enemies=[enemy];Object.assign(game.player,{x:1100,y:game.world.floorY-game.player.height,previousY:game.world.floorY-game.player.height,velocityX:0,velocityY:0,grounded:true,climbing:false,climbZoneId:null});
   r.damageEnemy(game,mission,enemy,80,'melee');if(!game.huntRites.corpses.length)throw Error('Native death produced no corpse');
  }
  runtime.current={game,input,mission};return runtime.current;
 };
 const tick=(frames=1)=>{
  const f=runtime.current;if(!f)return;
  for(let index=0;index<frames;index++){
   r.pollGamepad(f.input);f.game.elapsed+=1/120;
   r.updatePlayer(f.game,f.mission,saveRef.current.loadout,saveRef.current.inventory,saveRef.current.appearance,'hunter',f.input,1/120,()=>{});
   r.updateHuntRitesV77(f.game,1/120);
  }bump(v=>v+1);
 };
 useLayoutEffect(()=>{
  Object.assign(audit,{
   show:value=>setView(value),save:()=>JSON.parse(JSON.stringify(saveRef.current)),settings:()=>saveRef.current.settings.huntAccessibility,
   reset(){audit.failWrites=false;audit.events=[];pad.axes.fill(0);pad.buttons.forEach(b=>{b.pressed=false;b.value=0;});commit(fresh());newRuntime('canopy');setView('accessibility');bump(v=>v+1);},
   guide:(phase,gripExhausted=false)=>setGuide({phase,gripExhausted}),tick,
   resetCanopy(){pad.axes.fill(0);pad.buttons.forEach(b=>{b.pressed=false;b.value=0;});newRuntime('canopy');setView('canopy');bump(v=>v+1);},
   resetRites(){newRuntime('rites');setView('rites');bump(v=>v+1);},
   state:()=>{const f=runtime.current;return f?JSON.parse(JSON.stringify({player:f.game.player,corpses:f.game.huntRites.corpses,operation:f.game.huntRites.operation,menu:menuFor(f)})):null;},
   pad(action,value){if(action==='right')pad.axes[0]=value?1:0;else{const button=saveRef.current.settings.huntAccessibility.gamepadButtons[action];pad.buttons[button].pressed=!!value;pad.buttons[button].value=value?1:0;}},
  });
  if(!runtime.current)newRuntime('canopy');
 },[]);
 function menuFor(f){const context=r.riteContextV77(f.game);return r.huntRiteMenuSnapshotV77(f.game.huntRites,context.actor,f.game.riteMenuCorpseId,true,r.riteRuntimeOptionsV112(f.game));}
 useLayoutEffect(()=>{
  if(!canvas.current||!runtime.current)return;const f=runtime.current;
  f.game.cameraX=Math.max(0,f.game.player.x+f.game.player.width/2-r.VIEW_WIDTH/2);
  const context=canvas.current.getContext('2d');r.renderGame(context,f.game,f.mission,saveRef.current.loadout,saveRef.current.appearance,blankAssets,0,1);
 },[view,revision]);
 const onConservation=(action,id)=>{
  if(audit.failWrites){audit.events.push({action,id,ok:false});return {ok:false,message:'Travail non confirmé : sauvegarde de contrôle refusée.'};}
  const fn={start:startConservationV112,work:workConservationV112,repair:repairFieldToolV112,archive:archiveMountedSpecimenV112}[action];
  const result=fn(saveRef.current,id);audit.events.push({action,id,ok:result.ok});
  if(result.ok)commit(result.save);return {ok:result.ok,message:result.message};
 };
 const key=(event,down)=>{
  if(event.target!==canvas.current)return;
  const f=runtime.current;if(!f)return;
  const actions=matchingControlActions('hunt',event.nativeEvent,saveRef.current.settings.controlBindings).map(id=>r.HUNT_CONTROL_ACTIONS[id]).filter(Boolean);
  if(actions.length)event.preventDefault();
  for(const action of actions)if(down){if(r.isHeldKeyboardAction(action))f.input.keyboardHeld.add(action);if(!event.repeat)f.input.pressed.add(action);}else f.input.keyboardHeld.delete(action);
 };
 const touch=(action,down)=>{const f=runtime.current;if(!f)return;if(down){f.input.touchHeld.add(action);f.input.pressed.add(action);}else f.input.touchHeld.delete(action);};
 const f=runtime.current,menu=f?menuFor(f):null;
 return <main><header><h1>Qualification V112 · composants réels</h1><p>Scènes de contrôle : état initial de fixture, images de repli natives, manette émulée. Ce parcours ne remplace pas une partie de campagne complète.</p></header>
 <nav aria-label="Scènes de contrôle">{['accessibility','workshop','rites','canopy'].map(name=><button type="button" key={name} onClick={()=>setView(name)}>{name}</button>)}</nav>
 {view==='accessibility'&&<><HuntAccessibilityPanelV112 value={save.settings.huntAccessibility} onChange={value=>commit({...saveRef.current,settings:{...saveRef.current.settings,huntAccessibility:value}})}/>
 <HuntFieldGuideV112 bindings={save.settings.controlBindings} gamepadButtons={save.settings.huntAccessibility.gamepadButtons} phase={guide.phase} climbing={false} grounded={!guide.gripExhausted} stamina={guide.gripExhausted?0:100} corpseNearby={false} gripExhausted={guide.gripExhausted}/></>}
 {view==='workshop'&&<ConservationPanelV112 inventory={save.inventory} clanMarks={save.profile.clanMarks} onAction={onConservation}/>}
 {view==='rites'&&<div style={{position:'relative',minHeight:480}}><canvas ref={canvas} width={r.VIEW_WIDTH} height={r.VIEW_HEIGHT} tabIndex={0} aria-label="Simulation native de chasse" onKeyDown={event=>key(event,true)} onKeyUp={event=>key(event,false)}/><HuntRitesMenuV77 menu={menu} onOpen={()=>{__runRiteMenuQaV112(f.game,f.mission,'open');bump(v=>v+1);}} onClose={()=>{__runRiteMenuQaV112(f.game,f.mission,'close');bump(v=>v+1);}} onAction={action=>{__runRiteMenuQaV112(f.game,f.mission,action);bump(v=>v+1);}}/>
 <p role="status">Corps réels : {f?.game.huntRites.corpses.length??0} · Préparation : {f?.game.huntRites.corpses[0]?.flayed?'terminée':'non terminée'}</p></div>}
 {view==='canopy'&&<><canvas ref={canvas} width={r.VIEW_WIDTH} height={r.VIEW_HEIGHT} tabIndex={0} aria-label="Simulation native de chasse" onKeyDown={event=>key(event,true)} onKeyUp={event=>key(event,false)}/>
 {view==='canopy'&&<div role="group" aria-label="Commandes tactiles de contrôle">{[['right','Droite'],['up','Haut'],['jump','Saut']].map(([action,label])=><button type="button" key={action} onPointerDown={()=>touch(action,true)} onPointerUp={()=>touch(action,false)} onPointerCancel={()=>touch(action,false)}>QA {label}</button>)}</div>}</>}
 </main>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
