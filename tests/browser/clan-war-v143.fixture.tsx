import React,{useMemo} from "react";
import {createRoot} from "react-dom/client";
import ClanWarPanelV85 from "../../app/game/ClanWarPanelV85";
import {defaultSave} from "../../app/game/save";

/** V143 mounts the REAL strategic panel, war simulation and fenced browser
 * sessions. It is a seeded local QA campaign, not a complete GameClient flow. */
const OWNER="2026-10-31T22:10:00.000Z";
/** Test harness only: restrict selectable theatre to two real registered planets. */
const QA_PLANET=typeof window!=="undefined"&&new URLSearchParams(window.location.search).get("planet")==="thalassa"?"thalassa":"korthas";
function Fixture(){
  const save=useMemo(()=>{
    const record=defaultSave(OWNER);
    record.profile.rankId="elite";
    return record;
  },[]);
  return <main data-testid="real-clan-war-v143" style={{maxWidth:1440,margin:"auto",background:"#0d1d22",color:"#e7f7ed"}}>
    <ClanWarPanelV85 save={save} initialPlanetId={QA_PLANET} onClose={()=>{}}/>
  </main>;
}
const mount=document.getElementById("root");
if(!mount)throw Error("Missing real clan war fixture root");
createRoot(mount).render(<Fixture/>);
