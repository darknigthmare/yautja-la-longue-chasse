import React,{useMemo,useRef,useState} from "react";
import {createRoot} from "react-dom/client";
import HuntCanvas from "../../app/game/HuntCanvas";
import {MISSION_BY_ID} from "../../app/game/data";
import {defaultSave} from "../../app/game/save";
import {
 ACTIVE_HUNT_SAVE_VERSION,ACTIVE_HUNT_RUNTIME_REVISION,
 loadActiveHuntSave,writeActiveHuntSave,claimActiveHuntSave,
} from "../../app/game/systems/activeHuntSave";
import {
 captureHuntGauntletV142,resumeHuntGauntletV142,
} from "../../app/game/systems/huntGauntletIdentityV142";

/** Real production HuntCanvas, real V1 sidecar and a seeded QA campaign.
 * Deliberately NOT the full GameClient navigation/quest-gating flow. */
const OWNER="2026-10-31T15:45:00.000Z",PREF="v142-qa-next-hunt";
const mission=MISSION_BY_ID["jungle-vey"];
if(!mission)throw Error("Missing real jungle mission");
const audit={events:[],errors:[]};
window.__huntGauntletV142Audit=audit;
function Fixture(){
  const save=useMemo(()=>{
    const next=defaultSave(OWNER);
    next.profile.rankId="elite"; // Exactly enough for Wolf/Feral, no study receipts.
    return next;
  },[]);
  const [stage,setStage]=useState(()=>{
    return loadActiveHuntSave().save?"suspended":"mission";
  });
  const [selected,setSelected]=useState(()=>localStorage.getItem(PREF)||"wolf");
  const [resume,setResume]=useState(null);
  const [runNumber,setRunNumber]=useState(0);
  const [error,setError]=useState("");
  const session=useRef({
    runId:"qa-v142-original-"+Date.now().toString(36),
    startedAt:new Date().toISOString(),sequence:0,
    configuration:null,
  });
  function persist(payload){
    const state=session.current;
    state.configuration??={
      inventory:save.inventory,loadout:save.loadout,appearance:save.appearance,
      gauntletVariantId:captureHuntGauntletV142(selected,save.profile.rankId,[]),
      visualOptions:{screenShake:false,reducedGore:true,highContrastVision:false},
      elapsedSeconds:0,
    };
    state.configuration={
      ...state.configuration,
      elapsedSeconds:Math.max(0,payload.elapsed),
    };
    const sidecar={
      version:ACTIVE_HUNT_SAVE_VERSION,runtimeRevision:ACTIVE_HUNT_RUNTIME_REVISION,
      ownerSaveCreatedAt:save.createdAt,missionId:mission.id,
      difficultyId:save.settings.difficultyId,encounterRun:0,
      runId:state.runId,sequence:state.sequence+1,
      startedAt:state.startedAt,savedAt:new Date().toISOString(),
      configuration:state.configuration,
      snapshot:payload.snapshot,retryCheckpoint:payload.retryCheckpoint,
    };
    const write=writeActiveHuntSave(sidecar);
    if(write.persisted){state.sequence++;audit.events.push({type:"persist",sequence:state.sequence,gauntletId:state.configuration.gauntletVariantId});}
    else {setError("Persist fail: "+write.failure);audit.errors.push(write.failure);}
    return write.save;
  }
  const suspend=payload=>{
    const sidecar=persist(payload);
    if(!sidecar)return;
    audit.events.push({type:"suspend",gauntletId:sidecar.configuration.gauntletVariantId,sequence:sidecar.sequence});
    setStage("suspended");
  };
  const resumeHunt=()=>{
    const prior=loadActiveHuntSave().save;
    if(!prior){setError("Saved hunt unavailable");return;}
    const current=selected;
    const locked=resumeHuntGauntletV142(
      prior.configuration,current,save.profile.rankId,save.gauntletV134?.claimedStudies??[],
    );
    const claimed=claimActiveHuntSave(prior,"qa-v142-resume-"+Date.now().toString(36));
    if(!claimed.persisted||!claimed.save){setError("Claim failed: "+claimed.failure);return;}
    session.current={
      runId:claimed.save.runId,
      startedAt:claimed.save.startedAt,
      sequence:claimed.save.sequence,
      configuration:claimed.save.configuration,
    };
    setResume({snapshot:claimed.save.snapshot,retryCheckpoint:claimed.save.retryCheckpoint,locked});
    audit.events.push({type:"resume",savedId:prior.configuration.gauntletVariantId,
      currentlyEquipped:current,locked,previousSequence:prior.sequence});
    setRunNumber(n=>n+1);
    setStage("mission");
  };
  const equipFeral=()=>{
    localStorage.setItem(PREF,"feral");setSelected("feral");
    audit.events.push({type:"other-preference",model:"feral"});
  };
  const currentVisualId=resume?.locked??captureHuntGauntletV142(selected,save.profile.rankId,[]);
  return <main data-testid="real-hunt-v142-fixture" data-stage={stage}
      data-equipped={selected} data-canvas-variant={currentVisualId}
      style={{maxWidth:1200,margin:"auto",padding:14,background:"#0f2025",color:"#d9fae9"}}>
    <h1>V142 · véritable moteur de chasse + sauvegarde V1</h1>
    <p>Chasse jungle réelle montée sur une campagne d'essai isolée. Pas de validation de toute la navigation du jeu.</p>
    <nav style={{display:"flex",gap:10,flexWrap:"wrap"}}>
      <button type="button" onClick={equipFeral}>Équiper Feral pour la prochaine chasse</button>
      {stage==="suspended"&&<button type="button" onClick={resumeHunt}>Reprendre la mission suspendue</button>}
    </nav>
    {error&&<p role="alert">{error}</p>}
    <p role="status">État : {stage} · gauntlet cosmétique {currentVisualId}</p>
    {stage==="mission"&&<HuntCanvas
      key={runNumber}
      mission={mission}
      encounterRun={0}
      loadout={save.loadout}
      inventory={save.inventory}
      difficulty={save.settings.difficultyId}
      appearance={save.appearance}
      gauntletVariantId={currentVisualId}
      reducedGore={true} screenShake={false} highContrastVision={false}
      resumeSnapshot={resume?.snapshot??null}
      resumeRetryCheckpoint={resume?.retryCheckpoint??null}
      onPersistHunt={persist}
      onSuspendHunt={suspend}
      onFinish={()=>{audit.events.push({type:"finished"});setStage("completed");}}
      onAbort={()=>{audit.events.push({type:"aborted"});setStage("completed");}}
      onResumeFailure={()=>{audit.errors.push("resume-failed");setError("Resume rejected");}}
    />}
  </main>;
}
createRoot(document.getElementById("root")).render(<Fixture/>);
