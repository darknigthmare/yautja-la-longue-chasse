import {useLayoutEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import CampaignMainMenu,{type CampaignCatalogView} from '../../app/game/CampaignMainMenu';
import CampaignFrontEnd,{type CampaignSessionEntry} from '../../app/game/CampaignFrontEnd';
import GameVersionBadge from '../../app/game/GameVersionBadge';

type Call={action:string;args:unknown[]};
declare global {
 interface Window {
  __campaignMenuQa:{calls:Call[];setBusy:(busy:boolean)=>void;reset:()=>void;pad:{buttons:{pressed:boolean;value:number;touched:boolean}[]}};
 }
}
const pad={index:0,id:'campaign-menu-qa',connected:true,axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0,touched:false}))};
Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[pad]});
const calls:Call[]=[];
const catalog:CampaignCatalogView={activeSlotId:1,status:'ready',slots:[1,2,3,4,5].map(id=>id===1?{
 id,status:'ready',revision:7,ownerCreatedAt:'2026-10-01T12:00:00.000Z',hunterName:'Kaail',lastCheckpointId:'auto-1',
 checkpoints:[{id:'auto-1',kind:'auto',index:1,label:'Retour au clan',savedAt:'2026-10-02T12:00:00.000Z',hasActiveHunt:false,playTimeSeconds:420,resumeLocation:'homeworld'}],
}:{id,status:'empty',revision:0,ownerCreatedAt:null,hunterName:null,checkpoints:[],lastCheckpointId:null})};

function ComponentFixture(){
 const [busy,setBusy]=useState(false),[instance,setInstance]=useState(0);
 useLayoutEffect(()=>{window.__campaignMenuQa={calls,setBusy,reset(){calls.length=0;setBusy(false);setInstance(value=>value+1);},pad};},[]);
 const record=(action:string,...args:unknown[])=>calls.push({action,args});
 return <CampaignMainMenu key={instance} catalog={catalog} busy={busy} message={null}
  onRefresh={()=>record('refresh')} onCreate={(...args)=>record('create',...args)} onContinue={(...args)=>record('continue',...args)}
  onLoad={(...args)=>record('load',...args)} onRecover={(...args)=>record('recover',...args)}
  onOpenGameMode={(...args)=>record('mode',...args)} onOpenClanWar={()=>record('clan-war')}
  onMausoleum={()=>record('mausoleum')} onOpenSprites={()=>record('sprites')}
  onPrepareImport={()=>({ok:false,failure:'save-conflict',message:'Fixture de navigation : aucun import préparé.',preview:null})}
  onImport={(...args)=>record('import',...args)} />;
}

/** Only the launched session is a fixture. All menu, slot creation, transactions
 * and cancellation behavior come from the production FrontEnd and save system. */
function SessionFixture({entry,onMainMenu}:{entry:CampaignSessionEntry;onMainMenu:()=>void}){
 return <section data-qa-campaign-session={entry.slotId} data-owner={entry.ownerCreatedAt}>
  <GameVersionBadge/><h1>Session de test</h1><p>{entry.location}</p><button onClick={onMainMenu}>Retour au menu principal</button>
 </section>;
}
createRoot(document.getElementById('root')!).render(new URLSearchParams(location.search).has('frontend')
 ?<CampaignFrontEnd SessionComponent={SessionFixture}/>:<ComponentFixture/>);
