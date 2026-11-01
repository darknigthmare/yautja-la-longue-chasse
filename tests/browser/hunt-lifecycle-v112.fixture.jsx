import {useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import HuntCanvas,{__qaApiV112 as native} from 'hunt-lifecycle-native-v112';
import {makeGameClientCallbacksV112} from 'hunt-lifecycle-callbacks-v112';
import {useMenuGamepad} from '../../app/game/useMenuGamepad';
import ConservationPanelV112 from '../../app/game/ConservationPanelV112';
import {defaultSave,loadSaveWithStatus,replaceSaveWithStatus,writeSaveWithStatus,SAVE_STORAGE_KEY} from '../../app/game/save';
import {normalizeHuntAccessibilityV112} from '../../app/game/systems/huntAccessibilityV112';
import {MISSION_BY_ID} from '../../app/game/data';

const mission=MISSION_BY_ID['jungle-vey'];
const pad={connected:true,index:0,id:'V112 lifecycle emulated standard controller',mapping:'standard',timestamp:0,axes:[0,0,0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0,touched:false}))};
Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>pad.connected?[pad]:[]});
const audit={runtime:null,oldRuntime:null,mounts:0,clears:0,persisted:[],toasts:[],failWrites:false,failReadback:false,readbackArmed:false};
window.__huntLifecycleV112=audit;
const nativeSet=Storage.prototype.setItem,nativeGet=Storage.prototype.getItem;
Storage.prototype.setItem=function(key,value){
 if(this===localStorage&&key===SAVE_STORAGE_KEY&&audit.failWrites)throw new DOMException('QA refused write','QuotaExceededError');
 const result=nativeSet.call(this,key,value);
 if(this===localStorage&&key===SAVE_STORAGE_KEY&&audit.failReadback){audit.failReadback=false;audit.readbackArmed=true;}
 return result;
};
Storage.prototype.getItem=function(key){
 if(this===localStorage&&key===SAVE_STORAGE_KEY&&audit.readbackArmed){audit.readbackArmed=false;throw new DOMException('QA refused acknowledgement','SecurityError');}
 return nativeGet.call(this,key);
};
function fresh(){
 const save=defaultSave('2026-11-01T00:00:00.000Z');save.profile.clanMarks=100;save.inventory.fieldToolIds=['flaying-tool'];
 save.settings.huntAccessibility={...save.settings.huntAccessibility,ritualTiming:'unlimited',ritualConfirm:'press'};
 return save;
}
function Fixture(){
 const [save,setSave]=useState(()=>{const loaded=loadSaveWithStatus();if(loaded.loaded)return loaded.save;const written=replaceSaveWithStatus(fresh());if(!written.persisted)throw Error(written.failure);return written.save;});
 const menuRoot=useRef(null);
 const saveRef=useRef(save),[screen,setScreen]=useState(()=>save.inventory.harvestV112.specimens.length?'workshop':'hunt'),[generation,setGeneration]=useState(0),[status,setStatus]=useState(''),lastResult=useRef(null),sessionAliveRef=useRef(true);
 const callbacks=useRef(null),kindRef=useRef('rites'),resumeRef=useRef(null);
 const closeWorkshop=()=>{audit.menuBacks=(audit.menuBacks??0)+1;setScreen('menu');};
 useMenuGamepad(menuRoot,screen==='workshop','lifecycle:'+screen,closeWorkshop,{confirmButton:save.settings.huntAccessibility.gamepadButtons.jump,backButton:save.settings.huntAccessibility.gamepadButtons.interact});
 const recordSave=value=>{saveRef.current=value;setSave(value);};
 if(!callbacks.current)callbacks.current=makeGameClientCallbacksV112({
  saveRef,sessionAliveRef,setSave:recordSave,setScreen:value=>setScreen(value==='debrief'?'workshop':value),setToast:value=>{audit.toasts.push(value);setStatus(value);},
  setSaveFailure:value=>{audit.failure=value;},setLastResult:value=>{lastResult.current=value;},clearHuntSession:()=>{audit.clears++;},
 });
 window.__onHuntLifecycleMountV112=handle=>{
  audit.mounts++;audit.runtime=handle;
  if(resumeRef.current)return;
  const g=handle.game;
  // Deliberately authored fixture admission: no claim of traversing a mission.
  g.world={...g.world,platforms:[],hazards:[],covers:[],climbables:[]};
  g.enemies=[];g.recoveryNodes=[];
  Object.assign(g.player,{x:1100,y:g.world.floorY-g.player.height,previousY:g.world.floorY-g.player.height,velocityX:0,velocityY:0,grounded:true,climbing:false,climbZoneId:null});
  if(kindRef.current==='rites'){
   const enemy=native.makeEnemy('lifecycle-real-prey','hell-hound-stalker',mission.id,1120,g.world.width,80,10,0,1,1);
   Object.assign(enemy,{x:1120,y:g.world.floorY-60,width:40,height:60,health:80,maxHealth:80,knockbackRestY:g.world.floorY-60,scanned:true,active:true});
   g.enemies=[enemy];native.damageEnemy(g,mission,enemy,80,'melee');
   if(g.huntRites.corpses.length!==1)throw Error('Actual damage did not create one corpse');
  }
 };
 useEffect(()=>{
  Object.assign(audit,{
   save:()=>JSON.parse(JSON.stringify(saveRef.current)),disk:()=>JSON.parse(localStorage.getItem(SAVE_STORAGE_KEY)),result:()=>lastResult.current,
   state:()=>{const h=audit.runtime;if(!h)return null;const g=h.game;return JSON.parse(JSON.stringify({alive:h.alive,elapsed:g.elapsed,phase:g.phase,paused:g.paused,player:g.player,corpses:g.huntRites.corpses,operation:g.huntRites.operation,harvested:g.huntRites.specimensV112,events:g.huntRites.completedEventIds,ship:g.dropShip,inputs:{keyboard:[...h.input.keyboardHeld],touch:[...h.input.touchHeld],gamepad:[...h.input.gamepadHeld]}}));},
   menuPad(index,value){pad.buttons[index].pressed=!!value;pad.buttons[index].value=value?1:0;pad.timestamp++;},
   workshop(){setScreen('workshop');},
   remapWorkshop(){const current=saveRef.current,next={...current.settings.huntAccessibility.gamepadButtons};for(const [action,index]of [['jump',2],['interact',3]]){const previous=next[action],other=Object.keys(next).find(key=>key!==action&&next[key]===index);next[action]=index;if(other)next[other]=previous;}const settings={...current.settings,huntAccessibility:normalizeHuntAccessibilityV112({...current.settings.huntAccessibility,gamepadButtons:next})};const written=writeSaveWithStatus({...current,settings});if(!written.persisted)throw Error(written.failure);recordSave(written.save);},
   pad(direction,value){if(direction==='right')pad.axes[0]=value?1:0;else if(direction==='down')pad.axes[1]=value?1:0;else{const index=saveRef.current.settings.huntAccessibility.gamepadButtons[direction];pad.buttons[index].pressed=!!value;pad.buttons[index].value=value?1:0;}pad.timestamp++;},
   disconnect(){pad.connected=false;const event=new Event('gamepaddisconnected');Object.defineProperty(event,'gamepad',{value:pad});window.dispatchEvent(event);},
   reconnect(){pad.axes.fill(0);pad.buttons.forEach(b=>{b.pressed=false;b.value=0;});pad.connected=true;},
   remount(kind='rites'){audit.oldRuntime=audit.runtime;kindRef.current=kind;resumeRef.current=null;callbacks.current.resetSettlement();setScreen('hunt');setGeneration(x=>x+1);},
   unmount(){audit.oldRuntime=audit.runtime;setScreen('unmounted');},
   oldState:()=>audit.oldRuntime?{alive:audit.oldRuntime.alive,x:audit.oldRuntime.game.player.x,elapsed:audit.oldRuntime.game.elapsed}:null,
   prepareExtraction(){
    // Only missing Apex/mission prerequisites are seeded. The harvested part,
    // clocks, tool receipts, shuttle updates, boarding input and settlement are real.
    const g=audit.runtime.game;
    g.riteMenuCorpseId=null;g.huntRites={...g.huntRites,operation:null};g.riteOperationDamageStart=null;
    g.completedObjectives=new Set(mission.objectives.filter(o=>o.kind!=='extract').map(o=>o.id));
    g.phase='extraction';g.trophyQuality='worthy';g.trophyCarried=true;g.trophyVictory=null;
    g.trophyClaim={id:'jungle-vey:lifecycle-apex',definitionId:mission.trophy.id,targetName:mission.targetName,targetKind:mission.targetKind,partId:mission.trophy.partId,condition:'intact',quality:'worthy'};
    g.boss.active=false;g.boss.alive=false;g.boss.health=0;g.bossDefeatedAt=g.elapsed;
    g.world={...g.world,extraction:{...g.world.extraction,x:g.player.x+g.player.width/2}};
    g.dropShip=native.createDropShipArrival();
   },
   reloadSave(){const loaded=loadSaveWithStatus();if(!loaded.loaded)throw Error(loaded.failure);recordSave(loaded.save);return loaded.source;},
  });
 },[]);
 const finish=result=>callbacks.current.completeMission(result);
 const persist=payload=>{audit.persisted.push(payload);};
 return <main ref={menuRoot}><header><h1>Chasse V112 : cycle natif et persistance</h1><p>Insertion de contrôle, carcasse créée par dégâts réels, images de repli. Les prérequis Apex sont amorcés avant le seul segment d’extraction ; aucune campagne complète ni appareil physique qualifié.</p></header>
 {screen==='hunt'&&<HuntCanvas key={generation} mission={mission} encounterRun={0} loadout={save.loadout} inventory={save.inventory} appearance={save.appearance} difficulty={save.settings.difficultyId} controlBindings={save.settings.controlBindings} huntAccessibility={save.settings.huntAccessibility} reducedGore={true} screenShake={false} highContrastVision={false} explorationProgress={save.exploration} onFinish={finish} onAbort={finish} onPersistHunt={persist} onSuspendHunt={persist}/>}
 {screen==='workshop'&&<ConservationPanelV112 onClose={closeWorkshop} gamepadButtons={save.settings.huntAccessibility.gamepadButtons} inventory={save.inventory} clanMarks={save.profile.clanMarks} onAction={(action,id)=>callbacks.current.performConservationActionV112(action,id)}/>}
 <p role="status" id="lifecycle-status">{status}</p></main>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
