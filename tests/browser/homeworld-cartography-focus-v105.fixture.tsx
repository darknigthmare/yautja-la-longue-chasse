/** Current real Hub in a small React host. This isolates focus/persistence from
 * the production GameClient; it is never evidence of a compiled app build. */
import {useCallback,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import HomeworldHub from '../../app/game/HomeworldHub';
import {defaultSave,normalizeSave,SAVE_STORAGE_KEY,writeSaveWithStatus} from '../../app/game/save';
import {GAME_CONTENT_VERSION} from '../../app/game/buildInfo';
import type {HomeworldProgress} from '../../app/game/systems/homeworld';
const noop=()=>{};
function Fixture(){
 const[entered,setEntered]=useState(false),[save,setSave]=useState(()=>defaultSave()),ref=useRef(save);
 const persist=useCallback((homeworld:HomeworldProgress)=>{
  const result=writeSaveWithStatus({...ref.current,homeworld});
  if(!result.persisted)return false;ref.current=result.save;setSave(result.save);return true;
 },[]);
 return entered?<HomeworldHub key={save.createdAt} save={save} selectedShipId="classic-predator-spaceship" suspended={false}
  onProgress={persist} onService={noop} onReturnShip={noop} onNotify={noop}/>
  :<main data-campaign-menu="main" data-game-content-version={GAME_CONTENT_VERSION}><button onClick={()=>{const next=normalizeSave(JSON.parse(localStorage.getItem(SAVE_STORAGE_KEY)??'null'));ref.current=next;setSave(next);setEntered(true);}}>Continuer</button></main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
