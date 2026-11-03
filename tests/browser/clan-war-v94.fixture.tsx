import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import ClanWarPanelV85 from '../../app/game/ClanWarPanelV85';
import * as session from '../../app/game/systems/clanWarSessionV85';
import * as war from '../../app/game/systems/clanWarV85';
import * as canyon from '../../app/game/systems/clanWarCanyonV85';
import type {SaveGame} from '../../app/game/types';
// Only the two read-only profile fields consumed by this surface are supplied.
// This harness has no campaign completion, rank progression or installed DLC.
const save = {profile:{hunterName:'QA exercise',rankId:'blooded'}} as SaveGame;
function Harness() {
  const [mounted,setMounted]=useState(true),[suspended,setSuspended]=useState(false),[inert,setInert]=useState(false),[epoch,setEpoch]=useState(0);
  Object.assign(window, {__warUiV94:{unmount:()=>setMounted(false),suspend:setSuspended,overlay:setInert,remount:()=>{setMounted(true);setEpoch(n=>n+1);}}});
  return <div inert={inert}>{mounted && <ClanWarPanelV85 key={epoch} save={save} suspended={suspended} onClose={()=>setMounted(false)}/>}</div>;
}
Object.assign(window,{__warApiV94:{...session,...war,...canyon}});
createRoot(document.getElementById('root')!).render(<Harness/>);
