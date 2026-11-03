"use client";

import { useRef, useState } from "react";
import { warTerritoriesForSimulationV96, type WarSimulationV85, type WarUpdateV85 } from "./systems/clanWarV85";
import { exportWarFrontV105, planWarConvoyV105, queueWarConvoyLegV105, readWarFrontV105, removeWarConvoyV105, warConvoyLegDraftV105, warConvoyPathV105, warConvoyRouteIssueV105 } from "./systems/clanWarConvoyRouteV105";
import { warOrderPreviewV98 } from "./systems/clanWarCommandV98";
import styles from "./ClanWarConvoyRouteV105.module.css";

const short = (id: string) => id.replace("CON-", "");
const resources = (stock: { s: number; m: number; i: number }) => `S${stock.s} · M${stock.m} · I${stock.i}`;

export default function ClanWarConvoyRouteV105({ simulation, fromId, disabled, onUpdate, onInspect }: {
  simulation: WarSimulationV85; fromId: string; disabled: boolean;
  onUpdate: (operation: (current: WarSimulationV85) => WarUpdateV85, expectedRevision?: number) => boolean;
  onInspect: (territoryId: string) => void;
}) {
  const definitions = warTerritoriesForSimulationV96(simulation);
  const [destination, setDestination] = useState("");
  const [people, setPeople] = useState<string[]>([]);
  const [cargo, setCargo] = useState({ s: 0, m: 1, i: 0 });
  const [archiveMessage, setArchiveMessage] = useState("");
  const [importPreview, setImportPreview] = useState<{ state: WarSimulationV85; revision: number } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const importReadToken = useRef(0);
  const route = simulation.convoyRouteV105;
  const completed = route?.completedOrderIds.length ?? 0;
  const finished = Boolean(route && completed === route.territoryIds.length - 1);
  const routeIssue = route ? warConvoyRouteIssueV105(simulation) : null;
  const nextDraft = route ? warConvoyLegDraftV105(route) : null;
  const warnings = nextDraft ? warOrderPreviewV98(route?.pendingOrderId ? { ...simulation, orders: simulation.orders.filter(order => order.id !== route.pendingOrderId) } : simulation, nextDraft).warnings : [];
  const controlled = definitions.filter(site => simulation.territories[site.id].controller === "CON-F01");
  const reserved = new Set(simulation.orders.flatMap(order => order.combatantIds));
  const candidates = simulation.combatants.filter(person => person.factionId === "CON-F01" && person.territoryId === fromId && person.status === "fit" && person.trainingUntilTurn === null);
  const selected = people.filter(id => candidates.some(person => person.id === id));
  const path = warConvoyPathV105(simulation, fromId, destination);
  const draft = { territoryIds: path ?? [], combatantIds: selected, cargo };
  const preview = !route && path ? planWarConvoyV105(simulation, draft) : null;
  const name = (id: string) => `${short(id)} · ${definitions.find(site => site.id === id)?.name ?? id}`;

  function exportFront() {
    try {
      const raw = exportWarFrontV105(simulation);
      const url = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = `front-${simulation.planetId ?? "korthas"}-tour-${simulation.turn}.json`; anchor.click(); URL.revokeObjectURL(url);
      setArchiveMessage("Front exporté avec ses positions, stocks, ordres et trajet. La recette de planète seule ne contient pas cette progression.");
    } catch (error) { setArchiveMessage(error instanceof Error ? error.message : "Export du front refusé."); }
  }

  return <section className={styles.convoy} aria-labelledby="war-convoy-title-v105" data-testid="war-convoy-v105">
    <header><div><p className={styles.eyebrow}>LIAISONS TERRESTRES</p><h4 id="war-convoy-title-v105">Acheminer un convoi</h4></div><span>1 route voisine par tour · 8 porteurs maximum</span></header>
    <p>Préparez une suite de dépôts contrôlés. À chaque étape, les mêmes personnes livrent les lots dans le stock local ; réservez ensuite l’étape suivante. L’entretien peut consommer les fournitures déposées.</p>
    {route ? <div data-testid="war-convoy-active-v105">
      <p className={styles.status} data-state={finished ? "delivered" : routeIssue ? "blocked" : route.pendingOrderId ? "reserved" : "ready"} role="status"><strong>{finished ? "Trajet livré" : routeIssue ? "Convoi en pause" : route.pendingOrderId ? "Étape réservée · attente de fin de tour" : "Prêt pour la prochaine étape"}</strong><span>{completed}/{route.territoryIds.length - 1} étapes livrées</span></p>
      <ol className={styles.steps} aria-label="Étapes du convoi">{route.territoryIds.map((id, index) => <li key={id} data-state={index < completed ? "delivered" : index === completed ? "current" : "planned"}><button type="button" onClick={() => onInspect(id)} aria-label={`Inspecter ${name(id)}`}>{index < completed ? "✓" : index === completed ? "●" : index + 1} {name(id)}{index === completed ? " · dernier point atteint" : ""}</button></li>)}</ol>
      <p><strong>Porteurs :</strong> {route.combatantIds.join(", ")} · <strong>Lots à chaque étape :</strong> {resources(route.cargo)}</p>
      {routeIssue && <p className={styles.issue}>{routeIssue}</p>}
      {warnings.length > 0 && !finished && <ul className={styles.warnings}>{warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>}
      <div className={styles.actions}><button type="button" data-testid="war-convoy-reserve-v105" disabled={disabled || finished || !!routeIssue || !!route.pendingOrderId} onClick={() => onUpdate(queueWarConvoyLegV105)}>Réserver l’étape suivante</button><button type="button" disabled={disabled} onClick={() => onUpdate(removeWarConvoyV105)}>{finished ? "Archiver la fin du trajet" : "Retirer le trajet et sa réservation"}</button></div>
      <p className={styles.note}>Le retrait conserve les positions et les lots déjà livrés. Une étape réservée occupe le créneau logistique du tour ; les étapes suivantes restent à préparer.</p>
    </div> : <div className={styles.preparation}>
      <div className={styles.fields}><p><strong>Départ dans l’atlas</strong><span>{name(fromId)}</span></p><label>Destination du convoi<select data-testid="war-convoy-destination-v105" value={destination} disabled={disabled} onChange={event => setDestination(event.target.value)}><option value="">Choisir un dépôt contrôlé</option>{controlled.filter(site => site.id !== fromId).map(site => <option key={site.id} value={site.id}>{name(site.id)}</option>)}</select></label></div>
      {destination && <p data-testid="war-convoy-path-v105">{path ? `${path.map(short).join(" → ")} · ${path.length - 1} tour(s) de déplacement au minimum` : "Aucune suite de dépôts contrôlés ne relie ces deux sites. Reprenez le contrôle de la liaison avant le départ."}</p>}
      <fieldset disabled={disabled}><legend>Porteurs présents au départ</legend><button type="button" onClick={() => setPeople(candidates.filter(person => !person.garrison && !reserved.has(person.id)).slice(0, 8).map(person => person.id))}>Choisir les mobiles disponibles</button><div className={styles.people}>{candidates.map(person => <label key={person.id}><input type="checkbox" checked={selected.includes(person.id)} disabled={reserved.has(person.id) || selected.length >= 8 && !selected.includes(person.id)} onChange={event => setPeople(current => event.target.checked ? [...current, person.id] : current.filter(id => id !== person.id))}/>{person.id}{person.garrison ? " · garde" : " · mobile"}{reserved.has(person.id) ? " · déjà affecté" : ""}</label>)}</div>{candidates.length === 0 && <p>Aucun porteur apte à ce départ. Choisissez un site contrôlé avec des personnes présentes.</p>}</fieldset>
      <fieldset className={styles.cargo} disabled={disabled}><legend>Lots à transférer entre chaque dépôt</legend>{(["s", "m", "i"] as const).map(key => <label key={key}>{key.toUpperCase()}<input type="number" min="0" max="1000000" step="1" value={cargo[key]} onChange={event => setCargo(current => ({ ...current, [key]: Math.min(1000000, Math.max(0, Math.trunc(Number(event.target.value) || 0))) }))}/></label>)}</fieldset>
      {preview && !preview.accepted && <p className={styles.issue} role="status">{preview.message}</p>}
      <button type="button" data-testid="war-convoy-plan-v105" disabled={disabled || !preview?.accepted} onClick={() => onUpdate(current => planWarConvoyV105(current, draft))}>Enregistrer ce trajet</button>
      <p className={styles.note}>L’enregistrement ne dépense aucun lot et ne réserve personne. La première étape vérifie les stocks et les créneaux ; chaque départ suivant sera vérifié de nouveau.</p>
    </div>}
    <details className={styles.archive} data-testid="war-front-archive-v105"><summary>Exporter ou reprendre ce front</summary><p>Le fichier contient uniquement l’exercice libre de cette planète, avec son convoi et ses ordres. Un import remplace le front affiché après vérification.</p><div className={styles.actions}><button type="button" disabled={disabled} onClick={exportFront}>Exporter le front</button><button type="button" disabled={disabled} onClick={() => fileInput.current?.click()}>Choisir un front à importer</button></div><input ref={fileInput} type="file" accept=".json,application/json" aria-label="Fichier du front libre" disabled={disabled} onChange={async event => {
      const token = ++importReadToken.current;
      const file = event.target.files?.[0]; event.target.value = ""; setImportPreview(null);
      if (!file) return;
      if (file.size > 4 * 1024 * 1024) { setArchiveMessage("Fichier trop volumineux : limite de 4 Mio."); return; }
      try { const raw = await file.text(); if (token !== importReadToken.current) return; const result = readWarFrontV105(raw, simulation.planetId ?? "korthas"); setArchiveMessage(result.message); if (result.state) setImportPreview({ state: result.state, revision: simulation.revision }); } catch { if (token === importReadToken.current) setArchiveMessage("Lecture du fichier impossible. Le front courant est conservé."); }
    }}/><p role="status">{archiveMessage}</p>{importPreview && <div className={styles.importPreview}><p>Le front courant est au tour {simulation.turn}. Le fichier vérifié est au tour {importPreview.state.turn}. Les positions, stocks et réservations du front courant seront remplacés.</p><div className={styles.actions}><button type="button" disabled={disabled || importPreview.revision !== simulation.revision} onClick={() => { if (onUpdate(() => ({ state: importPreview.state, accepted: true, message: "Front libre importé. Ses ordres et son trajet sont conservés." }), importPreview.revision)) { setImportPreview(null); setArchiveMessage("Front repris et enregistrement local demandé."); } }}>Remplacer ce front par le fichier vérifié</button><button type="button" onClick={() => { setImportPreview(null); setArchiveMessage("Import annulé ; le front courant est conservé."); }}>Conserver le front courant</button></div>{importPreview.revision !== simulation.revision && <p>Le front a changé depuis la lecture du fichier. Choisissez de nouveau le fichier pour vérifier le remplacement.</p>}</div>}</details>
  </section>;
}
