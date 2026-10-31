import React,{useMemo,useRef,useState} from "react";
import {createRoot} from "react-dom/client";
import ClanWarPanelV85 from "../../app/game/ClanWarPanelV85";
import {defaultSave,loadSaveWithStatus,writeSaveWithStatus} from "../../app/game/save";
import {MISSION_BY_ID} from "../../app/game/data";
import type {SaveGame,TrophyRecord} from "../../app/game/types";
import {
  GAUNTLET_STUDIES_V134,gauntletCampaignClaimV134,gauntletCampaignEquipV134,
} from "../../app/game/systems/gauntletCampaignV134";

/** V144 browser fixture: the actual clan-war panel and SAVE V13 writer.
 * The trophy/scan/rank facts below are artificially seeded for QA ONLY.
 * Do not confuse this fixture with an actual played campaign or a granted
 * film prop. No campaign rewards are written to an ordinary user account. */
const OWNER="2026-10-31T22:44:00.000Z";
const study=GAUNTLET_STUDIES_V134.find(x=>x.rank==="blooded"&&!x.workshop&&x.completions===1);
if(!study)throw Error("V144 QA requires one existing blooded study without workshop");
const other=GAUNTLET_STUDIES_V134.find(x=>x.id!==study.id && x.missionId!==study.missionId);
if(!other)throw Error("V144 requires a locked control item");
export const V144_STUDY_ID=study.id;
export const V144_UNEARNED_ID=other.id;

function seedSave():SaveGame{
  const storage=window.localStorage;
  const current=loadSaveWithStatus(storage);
  if(current.loaded&&current.save.createdAt===OWNER)return current.save;
  const fresh=defaultSave(OWNER);
  fresh.profile={...fresh.profile,honor:730,rankId:"elite"};
  const previous=fresh.missionProgress[study.missionId];
  fresh.missionProgress[study.missionId]={
    ...previous,status:"completed",attempts:2,
    completions:study.completions,bestScore:100,
    bestDifficultyId:"hunter",lastPlayedAt:OWNER,
  };
  fresh.statistics={...fresh.statistics,totalScans:100,missionsCompleted:1,missionsStarted:2};
  const mission=MISSION_BY_ID[study.missionId];
  const trophy:TrophyRecord={
    id:mission.trophy.id,definitionId:mission.trophy.id,
    targetName:mission.targetName,targetKind:mission.targetKind,
    partId:mission.trophy.partId,condition:"pristine",quality:"flawless",
    missionId:study.missionId,difficultyId:"hunter",score:100,claimedAt:OWNER,
  };
  fresh.trophies=[trophy];
  const written=writeSaveWithStatus(fresh,storage);
  if(!written.persisted)throw Error("V144 seeded QA save failed: "+written.failure);
  return written.save;
}
function Fixture(){
  const [save,setSave]=useState<SaveGame>(seedSave);
  const saveRef=useRef(save);
  const [result,setResult]=useState("QA archive loaded");
  const [writeCount,setWriteCount]=useState(0);
  function updateArchive(next:SaveGame["gauntletV134"],label:string):boolean{
    if(!next)return false;
    const record=writeSaveWithStatus({...saveRef.current,gauntletV134:next},window.localStorage);
    if(!record.persisted){setResult("REFUSED: "+record.failure);return false;}
    saveRef.current=record.save;setSave(record.save);
    setWriteCount(x=>x+1);
    setResult(label);return true;
  }
  function claim(id:string):boolean{
    const result=gauntletCampaignClaimV134(saveRef.current,id);
    if(!result.ok)return (setResult("REFUSED: "+result.reason),false);
    return updateArchive(result.archive,"Research claim "+id);
  }
  function equip(id:string):boolean{
    const result=gauntletCampaignEquipV134(saveRef.current,id);
    if(!result.ok)return (setResult("REFUSED: "+result.reason),false);
    return updateArchive(result.archive,"Equipped "+id);
  }
  const studyLabel=useMemo(()=>study.id,[]);
  return <main data-testid="v144-clan-war-campaign-fixture" style={{maxWidth:1440,margin:"auto",background:"#0d1d22",color:"#f1f8eb"}}>
    <div aria-label="Données de test V144" data-testid="v144-fixture-state" data-study-id={studyLabel}
      data-other-id={other.id} data-qa-owner={OWNER} data-gauntlet-save={save.gauntletV134?.equippedId}
      data-claims={save.gauntletV134?.claimedStudies.length??0} data-writes={writeCount}>
      <strong>Fixture de campagne V144 – trophée simulé pour QA uniquement</strong>
      <p role="status">{result}</p>
    </div>
    <ClanWarPanelV85 save={save} initialPlanetId="korthas" onClose={()=>{}}
      onClaimGauntletStudy={claim} onEquipGauntlet={equip}/>
  </main>;
}
const root=document.getElementById("root");
if(!root)throw Error("Missing V144 test mount");
createRoot(root).render(<Fixture/>);
