import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import HomeworldWorldMapV77 from '../../app/game/HomeworldWorldMapV77';
import type {SaveGame} from '../../app/game/types';
import type {HomeworldLevelV77} from '../../app/game/systems/homeworldWorldV77';

type Origin={actor:{x:number;y:number};levelId:HomeworldLevelV77;interiorId:string|null};
declare global {interface Window {__atlasFixturesV109:{save:SaveGame;groundChanged:SaveGame;foreign:SaveGame;origin:Origin;otherOrigin:Origin;targetId:string};__atlasFlushV113:(action:()=>void)=>void}}
window.__atlasFlushV113=flushSync;
const fixture=window.__atlasFixturesV109;
function Harness(){
 const[save,setSave]=useState(fixture.save),[origin,setOrigin]=useState(fixture.origin),[open,setOpen]=useState(true),[suspended,setSuspended]=useState(false),[mounted,setMounted]=useState(true);
 return <main data-atlas-open={open} data-atlas-suspended={suspended}><div aria-label="Commandes de fixture Atlas V109">
  <button onClick={()=>setSave(fixture.groundChanged)}>Changer les lots confirmés · fixture</button>
  <button onClick={()=>setSave(fixture.foreign)}>Changer de partie · fixture</button>
  <button onClick={()=>setOrigin(fixture.otherOrigin)}>Changer de lieu · fixture</button>
  <button onClick={()=>setSuspended(true)}>Suspendre le parent · fixture</button>
  <button onClick={()=>setSuspended(false)}>Reprendre le parent · fixture</button>
  <button onClick={()=>setOpen(false)}>Fermer depuis le parent · fixture</button>
  <button onClick={()=>setOpen(true)}>Ouvrir depuis le parent · fixture</button>
  <button onClick={()=>setMounted(false)}>Démonter le parent · fixture</button>
 </div><section style={{position:'relative',height:950,width:'100%',maxWidth:1200,overflow:'hidden'}} aria-label="Atlas React isolé">
  {mounted&&<HomeworldWorldMapV77 save={save} {...origin} open={open} disabled={false} routeSuspended={suspended} targetId={fixture.targetId} onOpenChange={setOpen}/>}
 </section></main>;
}
createRoot(document.getElementById('root')!).render(<Harness/>);
