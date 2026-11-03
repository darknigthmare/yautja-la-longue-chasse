"use client";
import { useEffect, useRef, useState } from "react";
import { JUSTICE_ORIGIN_CHOICES, JUSTICE_JURISDICTIONS, applyJusticeAction, getJusticeRouteControl, getJusticeStatus, normalizeJusticeProgress, type JusticeAction, type JusticeJurisdictionId, type JusticeOriginChoice, type JusticeProgress } from "./systems/justice";
import styles from "./JusticePanel.module.css";

export interface JusticePanelProps {
  progress: JusticeProgress;
  onProgress: (next: JusticeProgress) => boolean;
  onClose: () => void;
  onNotify?: (message: string) => void;
  jurisdictionId?: JusticeJurisdictionId;
  embedded?: boolean;
}
const evidenceNames: Record<string,string> = { "cargo-recording":"Enregistrement de l’intermédiaire", "forged-signature":"Signature mise en cause", "archive-alibi":"Attestation contradictoire des archives", "custody-record":"Rapport de sortie de détention" };
const incidentNames: Record<string,string> = { "ritual-trophy-resale":"Revente d’une prise rituelle", "false-accusation":"Accusation de marque falsifiée", "detention-escape":"Sortie clandestine de détention" };
export default function JusticePanel({ progress, onProgress, onClose, onNotify, jurisdictionId="homeworld", embedded=false }: JusticePanelProps) {
  const normalized = normalizeJusticeProgress(progress);
  const current = useRef(progress);
  const [message,setMessage]=useState("");
  const [pending,setPending]=useState<JusticeOriginChoice|"defy"|null>(null);
  useEffect(()=>{current.current=progress;},[progress]);
  const status=getJusticeStatus(normalized);
  const route=getJusticeRouteControl(normalized,jurisdictionId);
  const territory=JUSTICE_JURISDICTIONS.find(j=>j.id===jurisdictionId);
  const stage=normalized.intervention.stage;
  const perform=(action:JusticeAction)=>{
    const result=applyJusticeAction(current.current,action);
    if(result.changed){
      let accepted=false;try{accepted=onProgress(result.progress);}catch{/* The dossier remains unchanged until durable acknowledgement. */}
      if(!accepted){setMessage("Enregistrement non confirmé. Le choix n’est pas annoncé comme acquis ; les archives précédentes restent visibles.");return;}
      current.current=result.progress;
    }
    setMessage(result.message);onNotify?.(result.message);setPending(null);
  };
  return <section className={styles.panel} data-embedded={embedded} aria-labelledby="justice-heading">
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>BAD BLOOD · LA CHASSE INVERSÉE</p><h2 id="justice-heading">Dossier des Enforcers</h2><p>{territory?.label} · {status.label}</p></div>
      <button type="button" onClick={onClose}>Fermer le dossier</button>
    </header>
    <p className={styles.limit}>Procédures et choix persistants. Les poursuites terrestres, l’abordage et la détention physique restent à produire. L’honneur, les matchs THE PIT, l’équipement et l’apparence ne sont pas modifiés par ce panneau.</p>
    <dl className={styles.metrics}>
      <div><dt>Mandats actifs</dt><dd>{status.activeWarrantCount}</dd></div>
      <div><dt>Pression locale</dt><dd>{normalized.pressure[jurisdictionId]} / 5</dd></div>
      <div><dt>Notoriété clandestine</dt><dd>{status.notoriety} / 20</dd></div>
      <div><dt>Équipement</dt><dd>Conservé</dd></div>
    </dl>
    <p role="status" aria-live="polite" className={styles.message}>{message || route.label}</p>
    {!normalized.originChoice && <section className={styles.group} aria-labelledby="justice-origins"><h3 id="justice-origins">Première affaire · Un trophée de trop</h3><p>Cette tranche de procédure est une création du jeu. Choisir l’enquête n’impose pas de devenir criminel.</p><div className={styles.cards}>
      {JUSTICE_ORIGIN_CHOICES.map(choice=><article key={choice.id}><h4>{choice.label}</h4><p>{choice.description}</p><button type="button" onClick={()=>setPending(choice.id)}>Examiner ce choix</button></article>)}
    </div></section>}
    {pending && <section className={styles.confirm} aria-labelledby="justice-confirm-heading"><h3 id="justice-confirm-heading">Décision consciente</h3><p>{pending==="defy"?"Refuser publiquement le retour ordonné conduit cette autorité à te déclarer Bad Blood. Le relais public transmet tes mandats actifs aux routes des clans alliés : leurs contrôles pourront t’identifier et te sommer. La frontière, les stations neutres et les ports clandestins ne les reçoivent pas automatiquement. La capture vivante reste la doctrine ; cette décision n’efface aucune affaire.":JUSTICE_ORIGIN_CHOICES.find(c=>c.id===pending)?.description}</p><div className={styles.actions}><button type="button" onClick={()=>perform(pending==="defy"?{type:"defy-warrant"}:{type:"choose-origin",choice:pending})}>Confirmer ce choix</button><button type="button" onClick={()=>setPending(null)}>Annuler</button></div></section>}
    {normalized.incidents.length>0 && <section className={styles.group} aria-labelledby="justice-facts"><h3 id="justice-facts">Faits retenus et pièces du dossier</h3>
      <div className={styles.cards}>{normalized.incidents.map(incident=><article key={incident.id}><h4>{incidentNames[incident.kind]}</h4><p>{incident.resolved?("Affaire classée : "+incident.resolution):"Affaire ouverte"}. {incident.actualOffender==="unknown"?"Une accusation reste distincte de la culpabilité.":"Ce fait résulte d’un choix délibéré."}</p>
        {normalized.evidence.filter(e=>e.incidentId===incident.id).map(e=><div className={styles.evidence} key={e.id}><strong>{evidenceNames[e.id]}</strong><p>{e.transmittedTo.length?"Reçue par : "+e.transmittedTo.map(id=>JUSTICE_JURISDICTIONS.find(j=>j.id===id)?.label).join(", "):"Pièce locale ; pas encore transmise."}</p>{!e.transmittedTo.includes("homeworld")&&!incident.resolved&&<button type="button" onClick={()=>perform({type:"transmit-evidence",evidenceId:e.id,jurisdictionId:"homeworld"})}>Transmettre au relais de la cité</button>}</div>)}
        {incident.kind==="false-accusation"&&!incident.resolved&&!normalized.evidence.some(e=>e.id==="archive-alibi")&&<button type="button" onClick={()=>perform({type:"inspect-alibi"})}>Comparer les registres de la marque</button>}
      </article>)}</div>
      {!normalized.identifications.some(i=>i.jurisdictionId==="homeworld")&&<button type="button" onClick={()=>perform({type:"identify",jurisdictionId:"homeworld",source:"transponder"})}>Faire vérifier le transpondeur dans la cité</button>}
    </section>}
    <section className={styles.group} aria-labelledby="justice-route"><h3 id="justice-route">Contrôle de route · {territory?.label}</h3><p>{territory?.description}</p><p>{route.label}</p>
      {stage==="none"&&!normalized.detention&&<button type="button" disabled={normalized.intervention.cooldownTicks>0||normalized.intervention.remainingBudget===0} onClick={()=>perform({type:"request-control",jurisdictionId})}>Se présenter au contrôle</button>}
      {normalized.intervention.cooldownTicks>0&&<p>Repos entre interventions : {Math.ceil(normalized.intervention.cooldownTicks/60)} s de parcours. Les mandats restent conservés.</p>}
      {(stage==="identity-requested"||stage==="summoned")&&<div className={styles.actions}>
        <button type="button" onClick={()=>perform({type:"answer-control",response:"cooperate"})}>Présenter l’identité</button>
        <button type="button" onClick={()=>perform({type:"answer-control",response:"contest"})}>Contester avec les preuves</button>
        <button type="button" onClick={()=>perform({type:"answer-control",response:"surrender"})}>Se rendre au prévôt</button>
        <button type="button" onClick={()=>perform({type:"answer-control",response:"evade"})}>Prendre la route de repli · pression +1</button>
      </div>}
      {normalized.warrants.filter(w=>w.status==="active").map(w=><article key={w.id} className={styles.warrant}><h4>Mandat de capture vivante</h4><p>Autorité : Enforcers de la citadelle · {incidentNames[normalized.incidents.find(i=>i.id===w.incidentId)?.kind??""]}</p><p>Applicable : {w.jurisdictionIds.map(id=>JUSTICE_JURISDICTIONS.find(j=>j.id===id)?.label).join(", ")}.</p><p>Le camouflage et un changement de carte n’effacent pas le dossier.</p></article>)}
      {status.activeWarrantCount>0&&normalized.declaration!=="bad-blood"&&!normalized.detention&&<button type="button" onClick={()=>setPending("defy")}>Examiner une rupture avec le jugement</button>}
    </section>
    {normalized.detention&&<section className={styles.detention} aria-labelledby="justice-detention"><h3 id="justice-detention">Reddition acceptée · sortie sans attente</h3><p>Aucune saisie d’inventaire n’est simulée : ton équipement reste conservé. Cette interface de procédure ne représente pas encore une cellule jouable.</p>
      {normalized.incidents.filter(i=>!i.resolved&&normalized.warrants.some(w=>w.incidentId===i.id&&normalized.detention?.warrantIds.includes(w.id))).map(i=><article key={i.id}><h4>{incidentNames[i.kind]}</h4><div className={styles.actions}>
        {i.kind==="ritual-trophy-resale"&&<button type="button" onClick={()=>perform({type:"resolve-case",incidentId:i.id,method:"restitution"})}>Ordonner la restitution par l’intermédiaire</button>}
        {i.kind==="false-accusation"&&<button type="button" onClick={()=>perform({type:"resolve-case",incidentId:i.id,method:"exoneration"})}>Faire reconnaître l’attestation d’innocence</button>}
        <button type="button" onClick={()=>perform({type:"resolve-case",incidentId:i.id,method:"conditional-release"})}>Accepter une libération sous conditions</button>
      </div></article>)}
      {!normalized.incidents.some(i=>i.kind==="detention-escape")&&<button type="button" onClick={()=>perform({type:"escape"})}>Sortie clandestine · nouveau dossier d’évasion</button>}
    </section>}
    <footer className={styles.limit}>Une accusation ne modifie pas ton honneur. L’exil n’est pas automatiquement Bad Blood. La libération d’une affaire n’efface pas les autres mandats. La campagne complète « La Marque effacée » reste à produire.</footer>
  </section>;
}
