"use client";

import { useMemo, useReducer, useState } from "react";
import { warTeamExperienceV6, warTeamTierV6, type WarRulesV6 } from "./systems/clanWarBibleV6";
import {
  applyWarWorksV6, createWarWorksV6, estimateWarWorksTeamV6, warWorkOccupiedV6,
  warWorksCommandPointsV6, warWorksDefinitionsV6, warWorksUpkeepV6,
  warWorksDepotV87, warWorksCarriedRavV87, warWorksCacheRavV87, warWorksSupplyPreviewV87,
  warWorksGuardV88, warExtractionAvailableV88, warKitSiteV88,
  exportWarWorksV87, importWarWorksV87,
  type WarWorksActionV6, type WarWorksSessionV6,
} from "./systems/clanWarWorksV6";
import styles from "./ClanWarPanelV85.module.css";

const phaseNames = { reserved: "Kit au départ", carried: "Kit transporté", delivered: "Pièces livrées", building: "Chantier en cours", ready: "Ouvrage installé" };
type CheckpointPasteV87 = { draft: string; message: string; exportText: string };

/** Isolated exercise with an explicit standalone checkpoint. No campaign save, asset ownership, automatic
 * income or external message is read or written by this controller. */
export default function ClanWarWorksV6({ rules }: { rules: WarRulesV6 }) {
  type Session = { state: WarWorksSessionV6 | null; message: string };
  type Event = { kind: "command"; action: WarWorksActionV6 } | { kind: "restart"; budget: number; unitId: string; supplyMode: "front" | "local" } | { kind: "import"; text: string };
  const definitions = useMemo(() => warWorksDefinitionsV6(rules), [rules]);
  const [session, dispatch] = useReducer((current: Session, event: Event): Session => {
    if (event.kind === "restart") {
      const state = createWarWorksV6(event.budget, event.unitId, rules, event.supplyMode);
      return state ? { state, message: "Nouvel exercice d’ouvrages, avec une équipe novice équipée et le budget choisi." }
        : { ...current, message: "Les valeurs ou les cinq fiches d’ouvrage V87 requises ne permettent pas ce départ. S16 reste optionnel." };
    }
    if (event.kind === "import") { const result = importWarWorksV87(event.text, rules); return { state: result.state ?? current.state, message: result.message }; }
    if (!current.state) return current;
    const result = applyWarWorksV6(current.state, event.action, rules);
    return { state: result.state, message: result.message };
  }, rules, current => ({ state: createWarWorksV6(Math.min(80, current.parameters.rav_cap), "W3-U19", current, "local"), message: "Récupérateurs présents au dépôt. Reconnaissez votre site, construisez sa cache puis apportez-y des RAV réels." }));
  const [budget, setBudget] = useState(Math.min(80, rules.parameters.rav_cap)), [startingUnitId, setStartingUnitId] = useState("W3-U19");
  const [supplyMode, setSupplyMode] = useState<"front" | "local">("local"), [ravLoad, setRavLoad] = useState(20);
  const [checkpoint, setCheckpoint] = useState(""), [confirmImport, setConfirmImport] = useState(false), [checkpointMessage, setCheckpointMessage] = useState<string | CheckpointPasteV87>("");
  const [teamId, setTeamId] = useState("v6-works-team-1"), [destinationId, setDestinationId] = useState("W3-K02");
  const [structureId, setStructureId] = useState("W3-S03"), [siteId, setSiteId] = useState("W3-K02"), [passageId, setPassageId] = useState("");
  const [recruitUnitId, setRecruitUnitId] = useState("W3-U20"), [confirmReset, setConfirmReset] = useState(false), [confirmBranch, setConfirmBranch] = useState<"A" | "B" | null>(null);
  const { state, message } = session;
  if (!state) return <p className={styles.warning} role="status">L’exercice demande les cinq fiches numériques valides W3-S02, S03, S04, S05 et S07 et leurs opérateurs. S16 reste optionnel et exige ses propres sources attestées.</p>;
  const group = state.teams.find(item => item.team.id === teamId) ?? state.teams[0];
  const selectedTeamId = group.team.id, unit = rules.units.find(item => item.id === group.team.unitId)!;
  const specialty = rules.specializations.find(item => item.unitId === unit.id), xp = warTeamExperienceV6(group.team);
  const def = definitions.find(item => item.id === structureId) ?? definitions[0];
  const adjacent = rules.passages.filter(item => (item.fromId === siteId || item.toId === siteId)
    && (def.kind !== "hoist" || rules.entries.find(entry => entry.id === item.id && entry.sheet === "Passages de Korthas")?.fields.find(field => field.column === "E")?.value === "Liaison de relief"));
  const selectedPassageId = adjacent.some(item => item.id === passageId) ? passageId : adjacent[0]?.id;
  const defenseWork = state.works.find(work => work.structureId === "W3-S07" && work.territoryId === group.territoryId);
  const estimate = estimateWarWorksTeamV6(state, selectedTeamId, defenseWork?.passageId ?? null, rules)!;
  const operators = rules.units.filter(item => definitions.some(work => work.operatorUnitId === item.id));
  const act = (action: WarWorksActionV6) => { dispatch({ kind: "command", action }); setConfirmBranch(null); };
  const supply = warWorksSupplyPreviewV87(state, rules), shortages = supply.filter(item => item.paid < item.need);
  const guard = warWorksGuardV88(state, selectedTeamId), carrier = group.team.members.find(member => member.status === "fit");
  const guardPassages = rules.passages.filter(passage => [passage.fromId, passage.toId].includes(group.territoryId));
  const selectedGuardPassageId = guardPassages.some(passage => passage.id === passageId) ? passageId : guardPassages[0]?.id;
  const downloadCheckpoint = () => {
    const text = exportWarWorksV87(state, rules);
    if (!text) { setCheckpointMessage("État incompatible : aucun fichier exporté."); return; }
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = "yautja-ouvrages-v87.json";
    document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    setCheckpointMessage("Fichier de reprise préparé ; téléchargement demandé au navigateur. Si aucun fichier n’apparaît, affichez le JSON de reprise.");
  };
  const showCheckpointJson = () => {
    const text = exportWarWorksV87(state, rules);
    if (!text) { setCheckpointMessage("État incompatible : aucun JSON affiché."); return; }
    setCheckpoint(text); setConfirmImport(false);
    setCheckpointMessage("JSON de reprise affiché. Sélectionnez le texte pour le copier ; il conserve cet exercice et ne contient aucune sauvegarde de campagne.");
  };
  const checkpointPaste = typeof checkpointMessage === "string" ? null : checkpointMessage;
  const checkpointStatus = typeof checkpointMessage === "string" ? checkpointMessage : checkpointMessage.message;
  const checkpointJsonVisible = typeof checkpointMessage === "string" ? checkpointMessage.startsWith("JSON de reprise affiché.") : !!checkpointMessage.exportText;
  const checkpointExportText = checkpointPaste?.exportText ?? checkpoint;
  const openCheckpointPaste = () => {
    setCheckpointMessage({ draft: "", message: "Collez un point de reprise de cet exercice, puis validez-le. Aucun remplacement avant confirmation.", exportText: checkpointJsonVisible ? checkpointExportText : "" });
    setCheckpoint(""); setConfirmImport(false);
  };
  const validateCheckpointPaste = () => {
    if (!checkpointPaste) return;
    const result = importWarWorksV87(checkpointPaste.draft, rules);
    setCheckpoint(result.state ? checkpointPaste.draft : ""); setConfirmImport(false);
    setCheckpointMessage({ ...checkpointPaste, message: result.state ? "JSON collé compatible, prêt à remplacer cet exercice après confirmation." : result.message });
  };
  const prepareCheckpointImport = () => {
    const result = importWarWorksV87(checkpoint, rules);
    setConfirmImport(!!result.state);
    if (!result.state) {
      setCheckpoint("");
      setCheckpointMessage(checkpointPaste ? { ...checkpointPaste, message: result.message } : result.message);
    }
  };
  return <section data-war-works="V6" aria-label="Exercice de logistique et ouvrages V6">
    <h4>Du kit au poste réellement occupé</h4>
    <p className={styles.notice}>Exercice indépendant. Une équipe équipée, le budget et les droits de passage sont des hypothèses choisies. {definitions.length} ouvrages du classeur sont raccordés ; extraction, relais et treuil exigent les stocks locaux et leurs sources propres. Mode actuel : {state.supplyMode === "local" ? "stocks locaux et convois identifiés" : "comptabilité globale V86"}. Aucun gain de bataille, maison, armée ou ressource de campagne.</p>
    <ol className={styles.workSteps}><li>Traverser et reconnaître le site.</li><li>Réserver les pièces, puis charger le kit au départ.</li><li>Suivre une route autorisée aux RAV et livrer au bon site.</li><li>Travailler chaque tour avec le bon opérateur, puis occuper l’ouvrage.</li></ol>
    <details><summary>Budget et équipe du prochain exercice</summary><div className={styles.controlGrid}>
      <label>Équipe équipée au départ<select value={startingUnitId} onChange={event => setStartingUnitId(event.target.value)}>{operators.map(item => <option key={item.id} value={item.id}>{item.name} · {item.commandPoints} PC</option>)}</select></label>
      <label>Budget choisi · RAV<input type="number" min={0} max={rules.parameters.rav_cap} value={budget} onChange={event => setBudget(Math.max(0, Math.min(rules.parameters.rav_cap, Math.floor(Number(event.target.value) || 0))))}/></label>
      <label>Ravitaillement<select value={supplyMode} onChange={event => setSupplyMode(event.target.value as "front" | "local")}><option value="local">Stocks locaux et transport réel</option><option value="front">Comptabilité globale V86</option></select></label>
    </div><button type="button" onClick={() => setConfirmReset(true)}>Préparer un nouvel exercice</button>{confirmReset && <div className={styles.confirm}><p>Remplacer les équipes, kits et chantiers de cet exercice ? Exportez d’abord une reprise si vous souhaitez le conserver. La campagne reste intacte.</p><div className={styles.actions}><button type="button" onClick={() => { dispatch({ kind: "restart", budget, unitId: startingUnitId, supplyMode }); setTeamId("v6-works-team-1"); setConfirmReset(false); }}>Confirmer le nouveau départ</button><button type="button" onClick={() => setConfirmReset(false)}>Conserver cet exercice</button></div></div>}</details>
    <div className={styles.metrics}><p>Tour <strong>{state.turn}</strong></p><p>RAV disponibles <strong>{state.ravStock}/{state.startingRav}</strong></p><p>Équipes et formations réservées <strong>{warWorksCommandPointsV6(state, rules)}/{rules.parameters.pc_cap_1} PC</strong></p><p>Prochain entretien <strong>{warWorksUpkeepV6(state, rules)} RAV</strong></p><p>Dernier entretien payé <strong>{state.lastTurnPaid}/{state.lastTurnNeed} RAV</strong></p></div>
    <p className={state.ravStock < warWorksUpkeepV6(state, rules) ? styles.warning : styles.status} role="status" aria-live="polite">{message}{state.ravStock < warWorksUpkeepV6(state, rules) ? " Rationnement pour le prochain calcul ; aucun décès automatique." : ""}</p>
    {state.supplyMode === "local" && <article className={styles.ravLogistics} aria-label="Stocks locaux et convois RAV"><h4>Réserves par lieu</h4><p>Dépôt {state.originId} : <strong>{warWorksDepotV87(state)} RAV</strong>. Les {state.ravStock} RAV restants du front incluent les lots distants et ne sont pas tous disponibles au départ.</p><div className={styles.ravStocks}>{state.lots.filter(lot => lot.location !== "depot").map(lot => <p key={lot.id}><strong>{lot.rav} RAV</strong> · {lot.location === "carrier" ? `transport ${lot.teamId} à ${state.teams.find(item => item.team.id === lot.teamId)?.territoryId}` : `cache ${lot.workId} à ${state.works.find(item => item.id === lot.workId)?.territoryId}`}<small className={styles.memberId}>{lot.id}</small>{lot.steps.length > 0 && <small className={styles.memberId}>Étapes : {lot.steps.map(step => `${step.passageId} ${step.fromId} → ${step.toId} (tour ${step.turn})`).join(" ; ")}</small>}</p>)}</div><p>Prochain tour : priorité aux équipes, puis aux ouvrages. Une équipe consomme son lot porté ou une réserve présente au même site. Une cache isolée s’épuise sans produire.</p>{shortages.length > 0 ? shortages.map(item => <p className={styles.warning} key={item.teamId}>{item.teamId} à {item.territoryId} : {item.paid}/{item.need} RAV accessibles, facteur logistique 0,70. Aucun mort automatique.</p>) : <p className={styles.positive}>Toutes les équipes présentes peuvent être ravitaillées au prochain tour.</p>}<div className={styles.controlGrid}><label>Quantité pour l’équipe sélectionnée<input type="number" min={1} max={20} value={ravLoad} onChange={event => setRavLoad(Math.max(1, Math.min(20, Math.floor(Number(event.target.value) || 1))))}/></label></div><div className={styles.actions}><button type="button" onClick={() => act({ kind: "load-rav", teamId: selectedTeamId, rav: ravLoad })}>Charger les RAV au dépôt</button><button type="button" onClick={() => act({ kind: "return-rav", teamId: selectedTeamId })}>Restituer le reliquat au dépôt</button></div><p className={styles.source}>U19, ligne 24 : portage borné. Limite d’exercice : un lot de 20 RAV maximum par équipe, sans autre kit porté simultanément. Aucun poids ni tonnage absent du classeur n’est inventé.</p></article>}
    <div className={styles.controlGrid}><label>Équipe à commander<select value={selectedTeamId} onChange={event => { setTeamId(event.target.value); setConfirmBranch(null); }}>{state.teams.map(item => <option key={item.team.id} value={item.team.id}>{rules.units.find(unit => unit.id === item.team.unitId)?.name} · {item.team.id} · {item.territoryId}</option>)}</select></label><label>Destination de cette équipe<select value={destinationId} onChange={event => setDestinationId(event.target.value)}>{rules.territories.map(item => <option key={item.id} value={item.id}>{item.id} · {item.name}</option>)}</select></label></div>
    <div className={styles.actions}><button type="button" onClick={() => act({ kind: "plan", teamId: selectedTeamId, destinationId })}>Préparer le trajet{group.payloadWorkId ? " du kit" : ""}</button><button type="button" disabled={!group.route || !!group.dutyWorkId} onClick={() => act({ kind: "advance", teamId: selectedTeamId })}>Exécuter un passage</button><button type="button" disabled={state.observed.some(item => item.territoryId === group.territoryId)} onClick={() => act({ kind: "observe", teamId: selectedTeamId })}>Reconnaître ici · {rules.parameters.xp_recon} XP une fois</button><button type="button" disabled={!group.dutyWorkId && !guard} onClick={() => act({ kind: "release", teamId: selectedTeamId })}>Libérer les opérateurs ou la garde</button><button type="button" onClick={() => act({ kind: "wait" })}>Écouler un tour sans travaux</button></div>
    {state.supplyMode === "local" && <article className={styles.ravLogistics} aria-label="Extraction simulée S16">
      <h4>Dépôt de retour · extraction de l’exercice</h4>
      <p className={styles.notice}>La blessure ci-dessous est une hypothèse explicitement déclarée sur un membre de cet exercice, jamais le résultat d’un combat ou une perte de campagne. Son équipe peut partir, mais le blessé reste à sa vraie position jusqu’au transport. Aucun soin, objet, XP ou mandat accordé.</p>
      <p>Construisez S16 avec U17 : 14 RAV de kit, trois tours de travaux, puis 2 RAV d’entretien local. Préparez des lanciers U07 sur chaque passage emprunté, rejoignez le patient avec U17, puis transportez-le jusqu’au dépôt installé.</p>
      {!warExtractionAvailableV88(rules) && <p className={styles.warning}>Fiches ou préconditions sources manquantes : aucune extraction activée.</p>}
      <details><summary>Déclarer une blessure de simulation</summary><p>Le membre conserve son identité et son XP. Déclaration au lieu réel, sur une équipe libre, sans kit, lot RAV, garde ni ordre en cours. Il reste indisponible après l’arrivée.</p><div className={styles.actions}>{group.team.members.filter(member => member.status !== "dead").map(member => <button type="button" key={member.id} disabled={state.extraction?.patients.some(patient => patient.memberId === member.id)} onClick={() => act({ kind: "declare-patient", teamId: selectedTeamId, memberId: member.id })}>Déclarer blessé d’exercice · {member.id}</button>)}</div></details>
      <div className={styles.controlGrid}><label>Passage à garder depuis {group.territoryId}<select value={selectedGuardPassageId ?? ""} onChange={event => setPassageId(event.target.value)}>{guardPassages.map(passage => <option key={passage.id} value={passage.id}>{passage.id} · {passage.name}</option>)}</select></label></div>
      <button type="button" disabled={unit.id !== "W3-U07" || !selectedGuardPassageId} onClick={() => act({ kind: "guard-route", teamId: selectedTeamId, passageId: selectedGuardPassageId! })}>Affecter les lanciers à ce passage</button>
      <p>Garde de l’équipe choisie : {guard ? `${guard.passageId} depuis ${guard.territoryId}` : "aucune"}. Couverture topologique d’exercice : une équipe U07 complète, affectée à un lien adjacent, garde ce lien. La portée de tirs et les ennemis ne sont pas simulés.</p>
      <p>Gabarit d’exercice : un patient par équipe U17 complète et un porteur identifié ; pas de kit, travail ou observation simultané. Ce nombre n’est pas une capacité canonique. L’inventaire personnel et les soins médicaux ne sont pas modélisés ; aucun consommable n’est créé.</p>
      <div className={styles.workGrid}>{state.extraction?.patients.map(patient => { const owner = state.teams.find(team => team.team.id === patient.teamId)!, member = owner.team.members.find(item => item.id === patient.memberId)!; return <article className={styles.unit} key={patient.memberId} data-patient-phase={patient.arrival ? "arrived" : patient.carrierId ? "carried" : "waiting"}>
        <h4>{member.name} · blessé</h4><p>{patient.memberId} · équipe d’origine {patient.teamId} · {member.xp} XP conservés.</p><p>Position réelle : {patient.territoryId} · porteur : {patient.carrierId ?? "aucun"}. {patient.arrival ? `Arrivé à ${patient.arrival.workId} au tour ${patient.arrival.turn}, toujours indisponible.` : "Arrivée non validée ; aucun retour automatique."}</p>
        <p className={styles.memberId}>Étapes : {patient.steps.map(step => `${step.passageId} ${step.fromId} → ${step.toId}, tour ${step.turn}, garde ${step.guardTeamId}, porteur ${step.carrierId}`).join(" ; ") || "aucune traversée"}</p>
        <div className={styles.actions}>{!patient.arrival && !patient.carrierId && <button type="button" disabled={unit.id !== "W3-U17" || !carrier} onClick={() => act({ kind: "load-patient", teamId: selectedTeamId, memberId: patient.memberId, carrierId: carrier!.id })}>Prendre le patient avec {carrier?.id ?? "un porteur U17"}</button>}{patient.carrierTeamId === selectedTeamId && <><button type="button" onClick={() => act({ kind: "put-down-patient", teamId: selectedTeamId, memberId: patient.memberId })}>Déposer le patient ici sans extraction</button>{state.works.filter(work => work.structureId === "W3-S16").map(work => <button type="button" key={work.id} disabled={work.phase !== "ready" || work.territoryId !== group.territoryId} onClick={() => act({ kind: "return-patient", teamId: selectedTeamId, memberId: patient.memberId, workId: work.id })}>Valider l’arrivée au dépôt {work.territoryId}</button>)}</>}</div>
      </article>; })}</div>
      <p className={styles.source}>Sources : S16 D21:J21 ; U17 D22:H22 et N22 ; U07 C12:H12 ; W3-OBJ04 D9:E9 et W3-R20 C25:D25. S11 D16:I16/U18 décrit une stabilisation future avec consommables : ni dose ni durée de guérison n’étant fournies, aucun poste de soin ou traitement n’est construit dans ce lot.</p>
    </article>}
    {group.route && <p className={styles.confirm}>Intention : {group.route.territoryIds.join(" → ")} · prochain passage {group.route.passageIds[0]} · mouvement restant {group.route.cost}. Le kit suit la même équipe, pas un second transport.</p>}
    <div className={styles.workGrid}><article className={styles.unit}><h4>{unit.name}</h4><p>{group.territoryId} · fatigue {group.team.fatigue} · {xp} XP · {warTeamTierV6(xp, rules)}.</p><p>Estimation : {estimate.attack} attaque, {estimate.defense} défense de terrain.{estimate.defensePercent > 0 ? ` Au passage ${defenseWork?.passageId}, seuil occupé : +${estimate.defensePercent}% sur cette défense estimée, soit ${estimate.protectedDefense}.` : " Aucun seuil occupé ne renforce ce passage."}</p><p>Kit transporté : {group.payloadWorkId ?? "aucun"} · RAV portés : {warWorksCarriedRavV87(state, selectedTeamId)} · poste : {group.dutyWorkId ?? "libre"}.</p>{group.team.members.map(member => <p key={member.id}><strong>{member.name}</strong> · {member.status} · {member.xp} XP<small className={styles.memberId}>{member.id}</small></p>)}
      {specialty && <details><summary>Voie militaire conservée</summary><p>A · {specialty.nameA} : {specialty.effectA}</p><p>B · {specialty.nameB} : {specialty.effectB}</p><p>{specialty.exclusivity} Les gestes tactiques restent descriptifs ici.</p>{group.team.specialization ? <p>Branche {group.team.specialization} verrouillée.</p> : xp >= specialty.threshold && <div className={styles.actions}><button type="button" onClick={() => setConfirmBranch("A")}>Préparer A</button><button type="button" onClick={() => setConfirmBranch("B")}>Préparer B</button></div>}{confirmBranch && <div className={styles.confirm}><p>Confirmer la voie {confirmBranch} pour cette équipe ?</p><button type="button" onClick={() => act({ kind: "specialize", teamId: selectedTeamId, branch: confirmBranch })}>Confirmer {confirmBranch}</button><button type="button" onClick={() => setConfirmBranch(null)}>Conserver le choix ouvert</button></div>}</details>}
    </article><article className={styles.unit}><h4>Volontaires d’exercice</h4><p>Le RAV réserve matériel et formation ; la personne arrive seulement après le délai. Une arrivée n’est jamais une copie des vétérans présents.</p><label>Profil d’opérateur<select value={recruitUnitId} onChange={event => setRecruitUnitId(event.target.value)}>{operators.map(item => <option key={item.id} value={item.id}>{item.name} · {item.recruitmentRav} RAV · {item.delayTurns} tours · {item.commandPoints} PC</option>)}</select></label><button type="button" onClick={() => act({ kind: "recruit", unitId: recruitUnitId })}>Réserver une formation volontaire</button>{state.recruits.map(order => <p key={order.id}>{order.teamId} · {order.status === "arrived" ? "arrivée au départ" : `attendue au tour ${order.readyTurn}`} · {order.costRav} RAV réservés.</p>)}</article></div>
    <article className={styles.preparation}><h4>Préparer un ouvrage sur un site reconnu</h4><div className={styles.controlGrid}><label>Ouvrage<select value={def.id} onChange={event => setStructureId(event.target.value)}>{definitions.map(item => <option key={item.id} value={item.id}>{item.id} · {item.name}</option>)}</select></label><label>Site du chantier<select value={siteId} onChange={event => setSiteId(event.target.value)}>{rules.territories.map(item => <option key={item.id} value={item.id}>{item.id} · {item.name}{state.observed.some(known => known.territoryId === item.id) ? " · reconnu" : " · reconnaissance requise"}</option>)}</select></label>{["defense", "relay", "hoist"].includes(def.kind) && <label>Passage précis de l’ouvrage<select value={selectedPassageId} onChange={event => setPassageId(event.target.value)}>{adjacent.map(item => <option key={item.id} value={item.id}>{item.id} · {item.name}</option>)}</select></label>}</div><p>{def.costRav} RAV pour le kit · {def.delayTurns} tours de travaux · {def.upkeepRav} RAV d’entretien après mise en service.</p><p>Opérateurs requis : {rules.units.find(item => item.id === def.operatorUnitId)?.name} ({def.operatorUnitId}), complets et présents dans cet exercice.</p><p>{def.effect} {def.limit}</p><button type="button" onClick={() => act({ kind: "reserve-kit", structureId: def.id, territoryId: siteId, passageId: selectedPassageId })}>Réserver le kit au départ</button><p className={styles.source}>Structures de guerre · {def.id}, ligne {def.sourceRow} · cellules {def.sourceCells.join(", ")}. Réserver ne construit pas.</p></article>
    <div className={styles.workGrid}>{state.works.map(work => {
      const definition = definitions.find(item => item.id === work.structureId)!;
      const occupied = warWorkOccupiedV6(state, work, rules), kitSite = warKitSiteV88(state, work);
      const passage = rules.passages.find(item => item.id === work.passageId);
      const remote = passage && (passage.fromId === work.territoryId ? passage.toId : passage.fromId);
      return <article className={styles.unit} key={work.id} data-work-phase={work.phase}>
        <p className={styles.eyebrow}>{work.id} · {work.kitId}</p><h4>{definition.name} · {work.territoryId}</h4>
        <p>{work.phase === "reserved" && kitSite !== state.originId ? `Kit déposé à ${kitSite}` : phaseNames[work.phase]} · travail {work.workedTurns}/{definition.delayTurns} tours.{work.passageId ? ` Passage ${work.passageId}.` : ""}</p>
        <p>Emplacement réel du kit : {kitSite}. Transport : {work.carrierTeamId ?? "aucun"} · opérateurs : {work.operatorTeamId ?? "non affectés"} · {occupied ? (["relay", "hoist"].includes(definition.kind) ? "opérateurs présents ; conditions du geste à vérifier" : "effet occupé disponible") : "effet occupé indisponible"}.</p>
        <div className={styles.actions}>
          {work.phase === "reserved" && <button type="button" onClick={() => act({ kind: "load", workId: work.id, teamId: selectedTeamId })}>Charger avec l’équipe choisie</button>}
          {work.phase === "carried" && <><button type="button" onClick={() => act({ kind: "unload", workId: work.id, teamId: selectedTeamId })}>Livrer avec le vrai porteur</button>{state.infrastructure && <button type="button" onClick={() => act({ kind: "put-down-kit", workId: work.id, teamId: selectedTeamId })}>Déposer ce kit au sol sans l’installer</button>}</>}
          {["delivered", "building"].includes(work.phase) && <button type="button" onClick={() => act({ kind: "work", workId: work.id, teamId: selectedTeamId })}>Accomplir un tour de travaux</button>}
          {work.phase === "ready" && !occupied && <button type="button" onClick={() => act({ kind: "assign", workId: work.id, teamId: selectedTeamId })}>Affecter l’équipe choisie</button>}
          {work.phase === "ready" && definition.kind === "rest" && <button type="button" onClick={() => act({ kind: "rest", workId: work.id, teamId: selectedTeamId })}>Reposer l’équipe choisie ici</button>}
        </div>
        {definition.kind === "stock" && work.phase === "ready" && <div className={styles.ravCache}><p>Cache installée : {warWorksCacheRavV87(state, work.id)}/{definition.capacityRav} RAV. Elle ne produit jamais de revenu.</p>{state.supplyMode === "local" ? <div className={styles.actions}><button type="button" onClick={() => act({ kind: "deposit-rav", teamId: selectedTeamId, workId: work.id })}>Livrer le lot RAV dans cette cache</button><button type="button" onClick={() => act({ kind: "withdraw-rav", teamId: selectedTeamId, workId: work.id, rav: ravLoad })}>Retirer {ravLoad} RAV de cette cache</button></div> : <p>Les transferts de ration demandent un nouvel exercice en mode stocks locaux.</p>}</div>}
        {definition.kind === "repair" && work.phase === "ready" && <p className={styles.warning}>Atelier installé. Aucune passerelle réparée par cette mise en service : il manque une fiche de pièces et un chantier de réparation distinct sur le lien réel. Les tirs et le bruit ne sont pas simulés.</p>}
        {definition.kind === "navigation" && occupied && <p className={styles.positive}>Balise occupée au site reconnu ; le repère et l’âge de l’observation restent visibles sur la carte. Elle ne révèle aucun ennemi ni raccourci gratuit.</p>}
        {definition.kind === "relay" && <div className={styles.infrastructureEffect} aria-label={`Relais ${work.id}`}>
          <p>Liaison d’exercice {work.territoryId} → {remote}. Le messager doit parcourir l’aller et le retour après ouverture du carnet, puis revenir occuper ce relais alimenté. Une fermeture coupe la transmission. Les relevés gardent leur date ; aucune personne ni RAV ne voyage par le signal.</p>
          {work.phase === "ready" && state.teams.filter(receiver => receiver.team.id !== work.operatorTeamId && receiver.territoryId === remote).map(receiver => <button type="button" key={receiver.team.id} onClick={() => act({ kind: "relay-intel", workId: work.id, teamId: selectedTeamId, recipientTeamId: receiver.team.id })}>Transmettre les relevés à {receiver.team.id}</button>)}
          <p className={styles.source}>S12 D17:I17 ; U28 D33:H33 et N33. La portée est limitée à ce lien reconnu dans l’exercice ; aucun calcul radio ou sabotage autonome.</p>
        </div>}
        {definition.kind === "hoist" && <div className={styles.infrastructureEffect} aria-label={`Treuil ${work.id}`}>
          <p>Levage d’un kit existant de {work.territoryId} vers {remote} par {work.passageId}. Deux artisans occupent le treuil ; leur équipe reste au pied. Le destinataire doit réellement atteindre le kit, le reprendre et le livrer pour construire.</p>
          {work.phase === "ready" && state.works.filter(kit => kit.id !== work.id && kit.phase === "reserved" && warKitSiteV88(state, kit) === work.territoryId).map(kit => <button type="button" key={kit.id} onClick={() => act({ kind: "lift-kit", workId: work.id, kitWorkId: kit.id, teamId: selectedTeamId })}>Lever {kit.kitId} vers {remote}</button>)}
          <p className={styles.source}>S17 D22:J22 ; U20 D25:H25 et N25. Un kit par levage et un tour sont des limites de simulation ; masse et tonnage ne sont pas fournis. Aucune réparation de chaîne, pièce nouvelle ou transport de personnes.</p>
        </div>}
      </article>;
    })}</div>
    {state.infrastructure && <details className={styles.infrastructureLedger} open>
      <summary>Relevés remis et charges levées</summary>
      <p>Le carnet commence à la première réservation d’un relais ou treuil. Les trajets antérieurs ne sont pas inventés. {state.infrastructure.traversals.length} franchissement(s) réellement exécuté(s) enregistré(s).</p>
      <div className={styles.workGrid}>{state.infrastructure.relayReceipts.map(receipt => <article className={styles.unit} key={receipt.id} data-relay-receipt={receipt.id}>
        <h4>Relevés remis à {receipt.recipientTeamId}</h4><p>Tour {receipt.turn} · {receipt.fromId} → {receipt.toId} · {receipt.senderTeamId} par {receipt.relayWorkId}.</p>
        {receipt.observations.map(observation => <p key={observation.territoryId}>{observation.territoryId} · observé au tour {observation.turn} par {observation.teamId} · âge actuel {state.turn - observation.turn} tour(s). Situation cachée depuis : inconnue.</p>)}
      </article>)}</div>
      {state.infrastructure.lifts.map(lift => <p key={lift.id} data-kit-lift={lift.id}>Tour {lift.turn} : {lift.kitWorkId} · {lift.fromId} → {lift.toId} par {lift.hoistWorkId}, deux opérateurs {lift.memberIds.join(" et ")}. Équipe conservée sur place.</p>)}
      {!state.infrastructure.relayReceipts.length && !state.infrastructure.lifts.length && <p>Aucun relevé remis ni charge levée ; installer l’ouvrage seul ne valide pas son effet.</p>}
    </details>}
    <div className={styles.scrollTable}><div className={`${styles.map} ${styles.v6Map}`} aria-label="Équipes, kits et ouvrages réellement présents">{rules.territories.map(zone => { const known = state.observed.find(item => item.territoryId === zone.id), teams = state.teams.filter(item => item.territoryId === zone.id); const beacon = state.works.some(work => work.structureId === "W3-S05" && work.territoryId === zone.id && warWorkOccupiedV6(state, work, rules)); return <button type="button" className={styles.territory} key={zone.id} style={{ gridColumn: zone.column, gridRow: zone.row }} aria-pressed={zone.id === group.territoryId} onClick={() => { setDestinationId(zone.id); setSiteId(zone.id); }}><span>{zone.id}{beacon ? " · balise occupée" : ""}</span><strong>{zone.name}</strong><small>{teams.length} équipe(s) · {state.works.filter(work => work.territoryId === zone.id).length} ordre(s)<br/>{known ? `Reconnu au tour ${known.turn}` : "Site non reconnu"}</small></button>; })}</div></div>
    <details><summary>Passages fermés dans l’hypothèse</summary><fieldset><legend>Les ordres déjà préparés relisent les fermetures avant exécution</legend>{rules.passages.map(item => <label className={styles.person} key={item.id}><input type="checkbox" checked={state.closedPassageIds.includes(item.id)} onChange={event => act({ kind: "close-passages", ids: event.target.checked ? [...state.closedPassageIds, item.id] : state.closedPassageIds.filter(id => id !== item.id) })}/><span>{item.id} · {item.name}<small>{item.permitsRav ? "RAV autorisés" : "Aucun transport RAV"} · {item.capacityPc} PC</small></span></label>)}</fieldset></details>
    <details><summary>Comptes et journal du front d’exercice</summary><p>{state.accounts.recruitmentReserved} RAV engagés en formation, {state.accounts.kitsReserved} en kits identifiés, {state.accounts.upkeepConsumed} consommés en entretien. Aucun revenu ni restitution automatique.</p>{state.reports.slice(-20).reverse().map((report, index) => <p key={`${report.turn}-${index}`}>Tour {report.turn} · {report.text}<small className={styles.memberId}>{report.sourceIds.join(" · ")}</small></p>)}</details>
    <details><summary>Exporter ou reprendre cet exercice</summary>
      <p>Point de reprise indépendant, version 2 ; extensions extraction et relais/treuil 1 si utilisées. Personnes, XP, blessures, kits, routes, lots et comptes restent dans ce fichier. Une sauvegarde de campagne ou une autre source ne peut pas être importée ici.</p>
      <div className={styles.actions}><button type="button" onClick={downloadCheckpoint}>Exporter le point de reprise</button><button type="button" onClick={showCheckpointJson}>Afficher le JSON de reprise</button><button type="button" onClick={openCheckpointPaste}>Coller un JSON de reprise</button></div>
      {checkpointJsonVisible && <label className={styles.checkpointText}>JSON de reprise copiable<textarea readOnly rows={12} spellCheck={false} value={checkpointExportText}/></label>}
      {checkpointPaste && <div>
        <label className={styles.checkpointText}>JSON de reprise à coller<textarea rows={12} spellCheck={false} maxLength={12000000} value={checkpointPaste.draft} onChange={event => { setCheckpointMessage({ ...checkpointPaste, draft: event.target.value, message: "Texte modifié. Validez le JSON collé avant toute reprise." }); setCheckpoint(""); setConfirmImport(false); }}/></label>
        <button type="button" onClick={validateCheckpointPaste}>Valider le JSON collé</button>
      </div>}
      <label>Fichier de reprise JSON<input type="file" accept="application/json,.json" onChange={async event => { const file = event.target.files?.[0]; setConfirmImport(false); if (!file) return; if (file.size > 12000000) { setCheckpointMessage("Fichier trop volumineux ; exercice conservé."); setCheckpoint(""); return; } try { const text = await file.text(); const parsed = importWarWorksV87(text, rules); setCheckpoint(parsed.state ? text : ""); setCheckpointMessage(parsed.state ? "Reprise compatible, prête à remplacer cet exercice après confirmation." : parsed.message); } catch { setCheckpoint(""); setCheckpointMessage("Lecture impossible ; exercice conservé."); } }}/></label>
      {checkpoint && <button type="button" onClick={prepareCheckpointImport}>Préparer la reprise sélectionnée</button>}
      {confirmImport && <div className={styles.confirm}><p>Remplacer seulement l’exercice actuel par ce point de reprise ? La campagne et ses slots ne sont pas concernés.</p><div className={styles.actions}><button type="button" onClick={() => { dispatch({ kind: "import", text: checkpoint }); setTeamId("v6-works-team-1"); setConfirmImport(false); }}>Confirmer la reprise de l’exercice</button><button type="button" onClick={() => setConfirmImport(false)}>Conserver l’exercice présent</button></div></div>}
      <p role="status">{checkpointStatus}</p>
    </details>
    <p className={styles.source}>Cadence de prototype : chaque passage, observation, tour travaillé, repos ou attente avance un tour global ; préparation, chargement, livraison et affectation n’en créent pas. Le mode comptable V86 garde son budget global ; le mode local prélève les lots présents et montre les équipes rationnées. Les droits de passage restent une hypothèse autorisée de l’exercice. Un seul kit porté par équipe et une équipe reposée par ordre sont des limites d’exercice, pas des tonnages du lore. Les {18 - definitions.length} autres structures, les réparations de liens, ennemis, habitats, soins majeurs et batailles ne sont pas simulés ici. Relais et levage avancent aussi un tour, avec entretien local ; ils ne donnent aucune XP. Les liaisons graphiques représentent la simulation topologique, sans prétendre à une scène de combat 2D déjà jouable.</p>
  </section>;
}
