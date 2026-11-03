"use client";

import { useReducer, useState } from "react";
import { warTeamExperienceV6, warTeamTierV6, type WarRulesV6 } from "./systems/clanWarBibleV6";
import { applyWarExerciseV6, createWarExerciseV6, estimateWarExerciseV6, type WarExerciseActionV6, type WarExerciseV6 } from "./systems/clanWarExerciseV6";
import styles from "./ClanWarPanelV85.module.css";

/** A separate local exercise; no SaveGame, stock import, campaign reward or persistent browser storage. */
export default function ClanWarExerciseV6({ rules }: { rules: WarRulesV6 }) {
  type Session = { state: WarExerciseV6 | null; message: string };
  type Event = { kind: "command"; action: WarExerciseActionV6 } | { kind: "restart"; unitId: string; startingRav: number };
  const [session, dispatch] = useReducer((current: Session, event: Event): Session => {
    if (event.kind === "restart") {
      const next = createWarExerciseV6(event.unitId, event.startingRav, rules);
      return next ? { state: next, message: "Nouvel exercice : registre de reconnaissance et membres novices remis au départ." } : { ...current, message: "Choisissez une équipe admissible et un budget RAV dans les limites du classeur." };
    }
    if (!current.state) return current;
    const result = applyWarExerciseV6(current.state, event.action, rules);
    return { state: result.state, message: result.message };
  }, rules, currentRules => ({ state: createWarExerciseV6("W3-U01", 12, currentRules), message: "Préparez un trajet, exécutez les passages puis observez depuis la position de l’équipe." }));
  const { state, message } = session;
  const [unitId, setUnitId] = useState("W3-U01"), [startingRav, setStartingRav] = useState(12), [destinationId, setDestinationId] = useState("W3-K02");
  const [confirmReset, setConfirmReset] = useState(false), [confirmBranch, setConfirmBranch] = useState<"A" | "B" | null>(null);
  if (!state) return <p className={styles.warning}>Les règles chargées ne permettent pas de créer cet exercice.</p>;
  const unit = rules.units.find(item => item.id === state.team.unitId)!;
  const territory = rules.territories.find(item => item.id === state.territoryId)!;
  const specialty = rules.specializations.find(item => item.unitId === unit.id);
  const estimate = estimateWarExerciseV6(state, rules);
  const xp = warTeamExperienceV6(state.team);
  function act(action: WarExerciseActionV6) {
    // A pure reducer commits state and message together, including repeated clicks in one React batch.
    dispatch({ kind: "command", action });
    setConfirmBranch(null);
  }
  function restart() {
    dispatch({ kind: "restart", unitId, startingRav });
    setConfirmReset(false); setConfirmBranch(null); setDestinationId("W3-K02");
  }
  return <div data-war-exercise="V6">
    <h4>Exercice de reconnaissance V6</h4>
    <p>Déplacez une équipe réelle de cet exercice sur les passages de Korthas. Une observation nouvelle donne l’XP documentée aux membres présents. Cet exercice ne simule pas une conquête, des ennemis, les soins ou un combat complet ; il n’écrit rien dans votre campagne.</p>
    <p className={styles.notice}>Cadence du prototype : un passage, une observation ou un repos équipé consomme un tour et l’entretien de l’équipe. Le budget initial ci-dessous est votre hypothèse, sans revenu automatique. Les noms des membres désignent des participants d’exercice.</p>
    <div className={styles.controlGrid}><label>Équipe du prochain exercice<select value={unitId} onChange={event => setUnitId(event.target.value)}>{rules.units.filter(item => item.commandPoints <= rules.parameters.pc_cap_1).map(item => <option key={item.id} value={item.id}>{item.name} · {item.commandPoints} PC</option>)}</select></label><label>Budget initial choisi · RAV<input type="number" min={0} max={rules.parameters.rav_cap} value={startingRav} onChange={event => setStartingRav(Math.max(0, Math.min(rules.parameters.rav_cap, Math.floor(Number(event.target.value) || 0))))}/></label></div>
    <div className={styles.actions}><button type="button" onClick={() => setConfirmReset(true)}>Nouvel exercice avec ces valeurs</button>{confirmReset && <><span>L’exercice courant sera remplacé.</span><button type="button" onClick={restart}>Confirmer le nouveau départ</button><button type="button" onClick={() => setConfirmReset(false)}>Conserver celui-ci</button></>}</div>
    <div className={styles.metrics}><p>Position réelle <strong>{territory.id} · {territory.name}</strong></p><p>Tour <strong>{state.turn}</strong></p><p>Stock fini <strong>{state.ravStock}/{state.startingRav} RAV</strong></p><p>Fatigue <strong>{state.team.fatigue}/{rules.parameters.fatigue_max}</strong></p><p>XP d’équipe <strong>{xp} · {warTeamTierV6(xp, rules)}</strong></p><p>Estimation prochain tour <strong>{estimate.attack ?? "—"} attaque · {estimate.defense ?? "—"} défense</strong></p></div>
    {estimate.supplyFactor < rules.parameters.supply_factor_full && <p className={styles.warning}>RAV insuffisants pour le prochain entretien : efficacité ×{estimate.supplyFactor}. Aucun membre ne meurt automatiquement.</p>}
    <p role="status">{message}</p>
    <div className={styles.controlGrid}><label>Préparer une destination<select value={destinationId} onChange={event => setDestinationId(event.target.value)}>{rules.territories.map(item => <option key={item.id} value={item.id}>{item.id} · {item.name}</option>)}</select></label></div>
    <div className={styles.actions}><button type="button" onClick={() => act({ kind: "plan", destinationId })}>Préparer le trajet</button><button type="button" disabled={!state.route} onClick={() => act({ kind: "advance" })}>Exécuter le prochain passage</button><button type="button" disabled={!state.route} onClick={() => act({ kind: "cancel" })}>Annuler le trajet préparé</button><button type="button" disabled={state.observations.some(item => item.territoryId === state.territoryId)} onClick={() => act({ kind: "observe" })}>Observer ici · +{rules.parameters.xp_recon} XP une fois</button><button type="button" disabled={state.territoryId !== state.originId || state.team.fatigue === 0} onClick={() => act({ kind: "rest" })}>Repos équipé au départ</button></div>
    {state.route && <p className={styles.confirm}>Ordre en préparation : {state.route.territoryIds.join(" → ")} · coût de mouvement restant {state.route.cost}. Prochain passage : {state.route.passageIds[0]}.</p>}
    <div className={styles.scrollTable}><div className={`${styles.map} ${styles.v6Map}`} aria-label="Position et observations de l’exercice V6">{rules.territories.map(item => { const observed = state.observations.find(observation => observation.territoryId === item.id); return <button type="button" key={item.id} className={styles.territory} style={{ gridColumn: item.column, gridRow: item.row }} aria-pressed={item.id === state.territoryId} onClick={() => setDestinationId(item.id)}><span>{item.id}{item.id === state.territoryId ? " · équipe ici" : ""}</span><strong>{item.name}</strong><small>{observed ? `Observé au tour ${observed.turn}` : state.traversedIds.includes(item.id) ? "Traversé, non observé" : "Non traversé dans l’exercice"}</small></button>; })}</div></div>
    <article className={styles.entry}><h4>Reconnaissance de {territory.name}</h4><p>{territory.reconnaissance}</p><p><strong>Objectif local :</strong> {territory.objective}</p><p><strong>Condition de contrôle conservée :</strong> {territory.control}</p><p>Observer ici ne remplit pas automatiquement cette condition.</p></article>
    <div className={styles.units}><article className={styles.unit}><h4>{unit.name} · identité {state.team.id}</h4>{state.team.members.map(member => <p key={member.id}>{member.name} · {member.status === "fit" ? "apte" : member.status === "wounded" ? "blessé" : "mort"} · {member.xp} XP<small>{member.id}</small></p>)}</article>{specialty && <article className={styles.unit}><h4>Branche conservée : {state.team.specialization ?? "aucune"}</h4><p>A · {specialty.nameA} : {specialty.effectA}</p><p>B · {specialty.nameB} : {specialty.effectB}</p><p>{specialty.exclusivity}</p><p>Les gestes de ces spécialités restent descriptifs dans cet exercice de carte.</p>{state.team.specialization === null && xp >= specialty.threshold && <div className={styles.actions}><button type="button" onClick={() => setConfirmBranch("A")}>Choisir A</button><button type="button" onClick={() => setConfirmBranch("B")}>Choisir B</button></div>}{confirmBranch && <div className={styles.confirm}><p>Confirmer la branche {confirmBranch} ? Ce choix restera verrouillé pour cette équipe.</p><button type="button" onClick={() => act({ kind: "specialize", branch: confirmBranch })}>Confirmer {confirmBranch}</button><button type="button" onClick={() => setConfirmBranch(null)}>Revenir au choix</button></div>}</article>}</div>
    <details><summary>Ouvrages fermés dans l’exercice</summary><fieldset><legend>Une fermeture bloque aussi un ordre déjà préparé</legend>{rules.passages.map(item => <label className={styles.person} key={item.id}><input type="checkbox" checked={state.closedPassageIds.includes(item.id)} onChange={event => act({ kind: "close-passages", ids: event.target.checked ? [...state.closedPassageIds, item.id] : state.closedPassageIds.filter(id => id !== item.id) })}/><span>{item.id} · {item.name}</span></label>)}</fieldset></details>
    <details><summary>Journal et provenance des résultats</summary>{state.reports.slice(-20).reverse().map((report, index) => <p key={`${report.turn}-${index}`}>Tour {report.turn} · {report.text}<small>{report.sourceIds.join(" · ")}</small></p>)}</details>
  </div>;
}
