"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import type { SaveGame } from "./types";
import {
  CLAN_WAR_ENTRIES_V85, CLAN_WAR_SECTIONS_V85, CLAN_WAR_WORKBOOK_V85,
  WAR_FACTIONS_V85, WAR_UNITS_V85,
  clanWarEntryV85, warCompositionV85, warUnitV85,
  type ClanWarEntryV85,
} from "./systems/clanWarV85Data";
import {
  advanceWarTurnV85, cancelWarOrderV85, changeWarGarrisonV99, createWarSimulationV85,
  queueWarOrderV85, warBudgetV85, warFitCombatantsV85,
  warGarrisonV85, warOrderCostV85, warSuppliedV85, warUpkeepV85, warVeterancyV85,
  warTerritoriesForSimulationV96, warTerritoryForSimulationV96, warObjectiveCorridorV96,
  type WarGarrisonDraftV99, type WarOrderKindV85,
} from "./systems/clanWarV85";
import {
  CANYON_POSTS_V85, CANYON_PRESET_V85, canyonCompositionIssueV85,
  canyonPreparationV85, canyonXpV85, commitCanyonV85, createCanyonV85, engageCanyonV85,
  orderCanyonFormationV85, stepCanyonV85, withdrawCanyonV85,
  type CanyonOrderKindV85,
} from "./systems/clanWarCanyonV85";
import styles from "./ClanWarPanelV85.module.css";
import ClanWarBibleV6Panel from "./ClanWarBibleV6Panel";
import { importedYautjaArtVariantsV85 } from "./systems/recentSpriteLibraryV85";
import { createWarSessionV85 } from "./systems/clanWarSessionV85";
import ClanWarAtlasV95 from "./ClanWarAtlasV95";
import ClanWarPlanetsV96, { WAR_PLANET_SELECTION_KEY_V96 } from "./ClanWarPlanetsV96";
import ClanWarCommandV98, { ClanWarOrderPreviewV98 } from "./ClanWarCommandV98";
import ClanWarGarrisonV99 from "./ClanWarGarrisonV99";
import ClanWarEvacuationV100 from "./ClanWarEvacuationV100";
import { warEvacuationLeavesUnguardedV100, warEvacuationSelectionV100 } from "./systems/clanWarEvacuationV100";
import { warOrderPreviewV98, type WarOrderDraftV98 } from "./systems/clanWarCommandV98";
import { DEFAULT_WAR_PLANET_ID_V96, warPlanetV96 } from "./systems/clanWarPlanetsV96";
import { warAtlasIntelV95 } from "./systems/clanWarAtlasV95";
import { pageActivitySnapshotV94, serverPageActivityV94, subscribePageActivityV94 } from "./systems/pageActivityV94";

const fold = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const orderLabels: Record<WarOrderKindV85, string> = { move: "Déplacer", attack: "Assaut F02", recon: "Reconnaissance", cession: "Cession négociée", transit: "Droit de transit", logistics: "Convoi terrestre", heal: "Soins légers", evacuate: "Évacuer les blessés" };
const tacticalLabels: Record<CanyonOrderKindV85, string> = { hold: "Tenir", move: "Déplacer", observe: "Observer", cover: "Couvrir", secure: "Rétablir l’accès", rescue: "Évacuer le porteur", adopt: "Adopter Lecture récente", extract: "Rejoindre l’extraction" };
function Budget({ s, m, i }: { s: number; m: number; i: number }) { return <span className={styles.budget}>S <strong>{s}</strong> · M <strong>{m}</strong> · I <strong>{i}</strong></span>; }
function WarArt({ clanName, role }: { clanName?: string; role?: string }) {
  const art = importedYautjaArtVariantsV85({ clanName, role })[0];
  return art ? <figure className={styles.sourceArt} data-war-art={art.id}><Image src={art.src} width={art.width} height={art.height} unoptimized alt={`${art.label} · référence originale statique`} loading="lazy" decoding="async"/><figcaption>{art.label} · référence statique du {clanName ? "clan" : "rôle"}</figcaption></figure> : null;
}
const artRoles: Record<string, string> = { "RTS-U01": "patrouille", "RTS-U02": "pisteur", "RTS-U03": "tireur", "RTS-U13": "sapeur", "RTS-U15": "soigneur", "RTS-U18": "porteur" };
function preferredWarPlanetV96() {
  try {
    if (typeof window !== "undefined") return warPlanetV96(window.localStorage.getItem(WAR_PLANET_SELECTION_KEY_V96) ?? undefined)?.id ?? DEFAULT_WAR_PLANET_ID_V96;
  } catch { /* A denied preference store does not prevent a local game. */ }
  return DEFAULT_WAR_PLANET_ID_V96;
}
function Entry({ entry }: { entry: ClanWarEntryV85 }) {
  return <article className={styles.entry} data-war-source-id={entry.id}>
    <p className={styles.eyebrow}>{entry.id} · {entry.sheet} · ligne {entry.row}</p><h3>{entry.title}</h3>
    {entry.sheet === "Clans et guerre" && <WarArt clanName={String(entry.title)}/>}
    <dl>{entry.fields.map(field => <div key={field.cell}><dt>{field.label}</dt><dd>{String(field.value)}</dd></div>)}</dl>
  </article>;
}

/** Autonomous exercises and source dossier. Main campaign progress is read only. */
export default function ClanWarPanelV85({ save, onClose, suspended = false }: { save: SaveGame; onClose: () => void; suspended?: boolean }) {
  const root = useRef<HTMLElement>(null);
  const focusPlanetSelection = useRef(false);
  const pageActive = useSyncExternalStore(subscribePageActivityV94, pageActivitySnapshotV94, serverPageActivityV94);
  const [tab, setTab] = useState<"bible" | "canyon" | "composition" | "korthas" | "dossier">("korthas");
  const [sessionStore] = useState(() => createWarSessionV85(() => typeof window === "undefined" ? null : window.localStorage));
  const [activePlanetId, setActivePlanetId] = useState(preferredWarPlanetV96);
  const [planetSessions, setPlanetSessions] = useState<Record<string, ReturnType<typeof createWarSessionV85>>>(() => ({
    korthas: sessionStore,
    ...(activePlanetId === "korthas" ? {} : { [activePlanetId]: createWarSessionV85(() => typeof window === "undefined" ? null : window.localStorage, undefined, undefined, { planetId: activePlanetId }) }),
  }));
  const planetSession = planetSessions[activePlanetId];
  const shared = useSyncExternalStore(sessionStore.subscribe, sessionStore.getSnapshot, sessionStore.getServerSnapshot);
  const strategic = useSyncExternalStore(planetSession.subscribe, planetSession.getSnapshot, planetSession.getServerSnapshot);
  const { simulation, persistedWar } = strategic;
  const { canyon, selection, persistedCanyon } = shared;
  const loaded = shared.loaded && strategic.loaded;
  const pendingWrites = shared.pendingWrites + (planetSession === sessionStore ? 0 : strategic.pendingWrites);
  const storageMessage = [...new Set([shared.storageMessage, strategic.storageMessage].filter(Boolean))].join(" ");
  const canRetryPersistence = shared.canRetryPersistence || strategic.canRetryPersistence;
  const { setCanyon, setSelection } = sessionStore;
  const { setSimulation } = planetSession;
  const planet = warPlanetV96(activePlanetId)!;
  const corridorIds = planet.id === "korthas" ? ["CON-T01", "CON-T08", "CON-T14", "CON-T15", "CON-T21", "CON-T22"] : warObjectiveCorridorV96(simulation);
  const [message, setMessage] = useState("Choisissez une planète, un départ et une destination voisine pour préparer votre front.");
  const [query, setQuery] = useState(""), [section, setSection] = useState("Toutes les feuilles"), [page, setPage] = useState(0);
  const [selectedEntryId, setSelectedEntryId] = useState("OPS-01");
  const [territoryChoice, setTerritoryId] = useState<string | null>(null), [targetChoice, setTargetId] = useState<string | null>(null);
  const [requestedOrderKind, setOrderKind] = useState<WarOrderKindV85 | null>(null);
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [cargoS, setCargoS] = useState(0), [cargoM, setCargoM] = useState(0);
  const [confirmTurn, setConfirmTurn] = useState(false);
  const [evacuationConfirmation, setEvacuationConfirmation] = useState<string | null>(null);
  const [selectedFormation, setSelectedFormation] = useState("");
  const [tacticalOrder, setTacticalOrder] = useState<CanyonOrderKindV85>("move");
  const [tacticalX, setTacticalX] = useState(28), [tacticalLevel, setTacticalLevel] = useState<0 | 1>(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!loaded || !focusPlanetSelection.current) return;
    root.current?.querySelector<HTMLSelectElement>('[data-testid="war-planet-selector-v96"] select')?.focus({ preventScroll: true });
    focusPlanetSelection.current = false;
  }, [loaded, activePlanetId]);

  useEffect(() => {
    if (!running || canyon.phase !== "battle" || tab !== "canyon" || suspended || !pageActive) return;
    let active = true;
    const timer = window.setInterval(() => {
      // Recheck at delivery: focus may change before React cleans this effect.
      if (!active || !pageActivitySnapshotV94() || !root.current || root.current.closest('[inert],[hidden],[aria-hidden="true"]')) return;
      setCanyon(current => stepCanyonV85(current));
    }, 1000);
    return () => { active = false; window.clearInterval(timer); };
  }, [running, canyon.phase, tab, setCanyon, suspended, pageActive]);

  const composition = useMemo(() => warCompositionV85(selection), [selection]);
  const supplied = useMemo(() => warSuppliedV85(simulation), [simulation]);
  const budget = useMemo(() => warBudgetV85(simulation), [simulation]);
  // Derive defaults from the hydrated front. A newly opened world may already
  // have lost its original departure, and its routes need not include T02–T08.
  const definitions = warTerritoriesForSimulationV96(simulation);
  const controlled = definitions.filter(item => simulation.territories[item.id].controller === "CON-F01");
  const territory = (territoryChoice ? warTerritoryForSimulationV96(simulation, territoryChoice) : undefined)
    ?? controlled.find(item => item.id === "CON-T02") ?? controlled[0] ?? definitions[0];
  const territoryId = territory.id;
  const targetId = targetChoice && territory.neighbors.includes(targetChoice) ? targetChoice
    : territory.neighbors.find(id => simulation.territories[id].controller === "CON-F02") ?? territory.neighbors[0];
  const orderKind = requestedOrderKind ?? (simulation.territories[targetId].controller === "CON-F02" ? "attack" : simulation.territories[targetId].controller === "CON-F03" ? "cession" : "move");
  const candidates = simulation.combatants.filter(actor => actor.factionId === "CON-F01" && actor.territoryId === territoryId && (orderKind === "evacuate" ? actor.status === "fit" || actor.status === "wounded" : actor.status === (orderKind === "heal" ? "wounded" : "fit")) && actor.trainingUntilTurn === null);
  const evacuationConfirmationKey = JSON.stringify([planet.id, simulation.revision, territoryId, targetId, selectedPeople]);
  const filtered = useMemo(() => {
    const search = fold(query);
    return CLAN_WAR_ENTRIES_V85.filter(entry => (section === "Toutes les feuilles" || entry.sheet === section) &&
      (!search || fold(`${entry.id} ${entry.title} ${entry.sheet} ${entry.fields.map(field => field.value).join(" ")}`).includes(search)));
  }, [query, section]);
  const displayedEntries = filtered.slice(page * 24, page * 24 + 24);
  const currentEntry = clanWarEntryV85(selectedEntryId);
  const formation = canyon.formations.find(item => item.id === selectedFormation && !item.extraction) ?? canyon.formations.find(item => !item.extraction);
  const selectedCost = warOrderCostV85({ kind: orderKind, cargo: { s: cargoS, m: cargoM, i: 0 } });
  const reservedPeople = new Set(simulation.orders.flatMap(order => order.combatantIds));
  const draft: WarOrderDraftV98 = { kind: orderKind, fromId: territoryId, targetId: orderKind === "heal" ? territoryId : targetId, combatantIds: selectedPeople, cargo: { s: orderKind === "logistics" ? cargoS : 0, m: orderKind === "logistics" ? cargoM : 0, i: 0 } };
  const orderIssue = warOrderPreviewV98(simulation, draft).issue;
  function selectPlanet(id: string) {
    const nextPlanet = warPlanetV96(id);
    const liveWrites = sessionStore.getSnapshot().pendingWrites + (planetSession === sessionStore ? 0 : planetSession.getSnapshot().pendingWrites);
    if (!nextPlanet || id === activePlanetId || liveWrites > 0) return;
    const nextSession = planetSessions[id] ?? createWarSessionV85(() => typeof window === "undefined" ? null : window.localStorage, undefined, undefined, { planetId: id });
    if (!planetSessions[id]) setPlanetSessions(current => ({ ...current, [id]: nextSession }));
    focusPlanetSelection.current = true;
    setActivePlanetId(id); setTerritoryId(null); setTargetId(null);
    setSelectedPeople([]); setConfirmTurn(false); setRunning(false); setCargoS(0); setCargoM(0);
    setOrderKind(null);
    setMessage(`${nextPlanet.name} · front ouvert. Chaque planète conserve sa progression locale indépendante.`);
    try { window.localStorage.setItem(WAR_PLANET_SELECTION_KEY_V96, id); } catch { /* The selected front still remains available in memory. */ }
  }
  function selectTerritory(id: string) {
    const definition = warTerritoryForSimulationV96(simulation, id);
    if (!definition) return;
    setTerritoryId(id); setSelectedPeople([]); setConfirmTurn(false);
    const nextTarget = definition.neighbors.includes(targetId) ? targetId : definition.neighbors.find(neighbor => simulation.territories[neighbor].controller === "CON-F02") ?? definition.neighbors[0] ?? id;
    setTargetId(nextTarget);
    if (["attack", "move", "cession"].includes(orderKind)) setOrderKind(simulation.territories[nextTarget].controller === "CON-F02" ? "attack" : simulation.territories[nextTarget].controller === "CON-F03" ? "cession" : "move");
  }
  function selectTarget(id: string) {
    if (!territory.neighbors.includes(id)) {
      setMessage("Cette destination n’est pas voisine du départ. Choisissez une route affichée ou rapprochez votre détachement.");
      return;
    }
    setTargetId(id); setConfirmTurn(false);
    if (["attack", "move", "cession"].includes(orderKind)) setOrderKind(simulation.territories[id].controller === "CON-F02" ? "attack" : simulation.territories[id].controller === "CON-F03" ? "cession" : "move");
    setMessage(`Destination : ${warTerritoryForSimulationV96(simulation, id)!.name}. L’ordre prendra effet après confirmation du tour.`);
  }
  function queue(confirmEvacuation = false) {
    const live = planetSession.getSnapshot();
    if (suspended || !pageActivitySnapshotV94() || !live.loaded || live.pendingWrites > 0) return;
    const result = queueWarOrderV85(live.simulation, draft);
    if (!result.accepted) { setMessage(result.message); return; }
    const liveKey = JSON.stringify([planet.id, live.simulation.revision, draft.fromId, draft.targetId, draft.combatantIds]);
    if (draft.kind === "evacuate" && warEvacuationLeavesUnguardedV100(live.simulation, draft) && (!confirmEvacuation || evacuationConfirmation !== liveKey)) {
      setEvacuationConfirmation(liveKey);
      setMessage("Cette évacuation engage le dernier garde apte du départ. Confirmez avant de réserver le détachement.");
      window.requestAnimationFrame(() => {
        if (pageActivitySnapshotV94() && root.current && !root.current.closest('[inert],[hidden]')) root.current.querySelector<HTMLButtonElement>('[data-testid="war-evacuation-warning-v100"] button')?.focus({ preventScroll: true });
      });
      return;
    }
    setMessage(result.message); setSimulation(result.state); setSelectedPeople([]); setConfirmTurn(false); setEvacuationConfirmation(null);
    if (confirmEvacuation) restoreOrderFocus();
  }
  function restoreOrderFocus() {
    window.requestAnimationFrame(() => {
      if (!pageActivitySnapshotV94() || !root.current || root.current.closest('[inert],[hidden]')) return;
      const button = root.current?.querySelector<HTMLButtonElement>('[data-war-reserve-order-v100]');
      if (button && !button.disabled) button.focus({ preventScroll: true });
      else root.current?.querySelector<HTMLSelectElement>('[data-war-order-kind-v98]')?.focus({ preventScroll: true });
    });
  }
  function prepareSite(fromId: string, destination?: string, kind?: WarOrderKindV85) {
    selectTerritory(fromId);
    if (destination && kind !== "heal") setTargetId(destination);
    if (kind) setOrderKind(kind);
    setMessage(`${warTerritoryForSimulationV96(simulation, fromId)?.name} · préparez votre détachement et vérifiez l’ordre avant réservation.`);
    window.requestAnimationFrame(() => {
      root.current?.querySelector<HTMLElement>('[data-testid="war-order-panel-v98"]')?.scrollIntoView({ block: "start", behavior: "auto" });
      root.current?.querySelector<HTMLSelectElement>('[data-war-order-kind-v98]')?.focus({ preventScroll: true });
    });
  }
  function manageGarrisonSite(fromId: string) {
    selectTerritory(fromId);
    window.requestAnimationFrame(() => {
      const details = root.current?.querySelector<HTMLDetailsElement>('[data-testid="war-garrison-v99"]');
      if (!details) return;
      details.open = true; details.scrollIntoView({ block: "center", behavior: "auto" });
      details.querySelector<HTMLElement>("summary")?.focus({ preventScroll: true });
    });
  }
  function changeGarrison(draft: WarGarrisonDraftV99) {
    const live = planetSession.getSnapshot();
    if (suspended || !pageActivitySnapshotV94() || !live.loaded || live.pendingWrites > 0) return false;
    const result = changeWarGarrisonV99(live.simulation, draft);
    setMessage(result.message);
    if (result.accepted) { setSimulation(result.state); setSelectedPeople([]); setConfirmTurn(false); }
    return result.accepted;
  }
  function restartWar() {
    if (!window.confirm(`Recommencer le front de ${planet.name} et remplacer uniquement son archive locale ? Les autres planètes seront conservées.`)) return;
    setSimulation(createWarSimulationV85(undefined, planet.id)); planetSession.unlockWarAfterExplicitReset(); setTerritoryId(null); setTargetId(null); setOrderKind(null); setConfirmTurn(false); setSelectedPeople([]); setCargoS(0); setCargoM(0); setMessage(`Nouveau front de ${planet.name} ouvert.`);
  }
  function restartCanyon() {
    if (!window.confirm("Recommencer uniquement l’exercice libre du canyon ?")) return;
    setCanyon(createCanyonV85(`free-canyon-${Date.now()}`)); sessionStore.unlockCanyonAfterExplicitReset(); setRunning(false); setSelectedFormation(""); setMessage("Reconnaissance du canyon recommencée.");
  }
  function issueTactical() {
    if (!formation) return;
    const result = orderCanyonFormationV85(canyon, formation.id, tacticalOrder, tacticalX, tacticalLevel);
    setCanyon(result.state); setMessage(result.message);
  }

  if (!loaded) return <section className={styles.panel} aria-labelledby="clan-war-loading-title" data-clan-war-v85="loading" inert={suspended} ref={root}><h2 id="clan-war-loading-title">Archives des exercices</h2><p role="status">Vérification des archives et des écritures interrompues…</p><button type="button" onClick={onClose}>Retour</button></section>;

  return <section className={styles.panel} aria-labelledby="clan-war-v85-title" data-clan-war-v85="free-profile" data-war-campaign-write="none" inert={suspended} ref={root}>
    <header className={styles.header}><div><p className={styles.eyebrow}>TABLE DES MANDATS · GUERRES DE CLANS</p><h2 id="clan-war-v85-title">Guerres de territoire</h2><p>Trente planètes, des terres proches et trois factions. Préparez vos routes, reconnaissez le front et tenez vos conquêtes.</p></div><button type="button" onClick={onClose}>Retour</button></header>
    <div className={styles.notice}><strong>Fronts libres · archives locales indépendantes</strong><p>Chaque planète et le canyon possèdent leurs propres unités et archives sur cet appareil. Votre chasse conserve son matériel, ses rites et ses personnes.</p><p>{save.profile.hunterName} · rang {save.profile.rankId}. Ces exercices de conquête restent séparés du voyage et des récompenses de la campagne.</p></div>
    <nav className={styles.tabs} aria-label="Échelles des guerres de clans">{([["korthas", "Planètes · conquête"], ["bible", "Bible V6 · règles actuelles"], ["canyon", "Exercice V3 · canyon"], ["composition", "Exercice V3 · formations"], ["dossier", "Archive V3 · fiches et clans"]] as const).map(([id, label]) => <button type="button" key={id} aria-pressed={tab === id} onClick={() => { setTab(id); setRunning(false); }}>{label}</button>)}</nav>
    <p className={styles.status} role="status" aria-live="polite">{message}</p>
    {storageMessage && <p className={styles.storage} role="status">{storageMessage}</p>}
    {pendingWrites > 0 && <p className={styles.storage} role="status">Enregistrement des exercices en cours…</p>}
    {canRetryPersistence && <button type="button" disabled={pendingWrites > 0} onClick={() => { sessionStore.retryPersistence(); if (planetSession !== sessionStore) planetSession.retryPersistence(); }}>Réessayer la sauvegarde des exercices</button>}
    <div hidden={tab !== "bible"}><ClanWarBibleV6Panel/></div>

    {tab === "composition" && <div>
      <div className={styles.sectionHeader}><div><h3>Formations et limites de composition</h3><p>Le commandement compte aussi les réserves et les groupes en transit.</p></div><button type="button" onClick={() => { setSelection({ ...CANYON_PRESET_V85 }); setMessage("Effectif d’exemple du classeur : 12 commandement, 112 matériaux et 60 énergie."); }}>Effectif du classeur</button></div>
      <div className={styles.metrics}><p>Commandement <strong>{composition.used.command}/{composition.limits.command}</strong></p><p>Matériaux tactiques <strong>{composition.used.materials}/{composition.limits.materials}</strong></p><p>Énergie tactique <strong>{composition.used.energy}/{composition.limits.energy}</strong></p></div>
      <p className={composition.allowed ? styles.positive : styles.warning}>{composition.allowed ? "Manifeste de composition admissible." : "Ajustez les quantités pour respecter les trois limites."} Ces points de composition ne deviennent pas des lots S/M/I.</p>
      <div className={styles.units}>{WAR_UNITS_V85.map(unit => <article key={unit.id} className={styles.unit} data-war-unit={unit.id}><p className={styles.eyebrow}>{unit.id} · {unit.category}</p><h4>{unit.name}</h4>{artRoles[unit.id] && <WarArt role={artRoles[unit.id]}/>}<p>{unit.role}</p><p className={styles.cost}>C{unit.command} · M{unit.materials} · E{unit.energy}</p><label>Formations<input type="number" min={0} max={12} step={1} value={selection[unit.id] ?? 0} onChange={event => setSelection(current => ({ ...current, [unit.id]: Math.max(0, Math.min(12, Math.floor(Number(event.target.value) || 0))) }))} /></label><details><summary>Personnes, terrain et contres</summary><p>{unit.formation}</p><p><strong>Équipement :</strong> {unit.equipment}</p><p><strong>Comportement :</strong> {unit.behavior}</p><p><strong>Contre :</strong> {unit.counter}</p><p><strong>Faiblesse :</strong> {unit.weakness}</p><p><strong>Portée :</strong> {unit.range}</p><p>{unit.terrain}</p><p>{unit.evolution}</p></details></article>)}</div>
      <button type="button" onClick={() => setTab("canyon")}>Préparer ce détachement au canyon</button>
    </div>}

    {tab === "canyon" && <div>
      {running && !pageActive && <p role="status">Temps tactique suspendu hors de la fenêtre de jeu.</p>}
      <div className={styles.sectionHeader}><div><h3>Canyon des Deux Balises</h3><p>CON-T09 · territoire F03 · opération de convoyage sans annexion.</p></div><button type="button" onClick={restartCanyon}>Nouvel exercice</button></div>
      {canyon.phase === "preparation" && <div className={styles.preparation}>
        <div className={styles.route}><span data-active={canyon.heroSite === "approche"}>Approche</span><span data-active={canyon.heroSite === "corniche"}>Corniche</span><span data-active={canyon.heroSite === "maintenance"}>Maintenance</span><span data-active={canyon.heroSite === "mezzanine"}>Mezzanine</span><span data-active={canyon.heroSite === "poste"}>Poste RTS</span></div>
        <h4>Rejoindre le poste de transition</h4><p>Votre acteur parcourt les accès de l’exercice avant le changement de caméra. Le fond du canyon et la corniche offrent des informations et des expositions différentes.</p>
        {canyon.heroSite === "approche" && <div className={styles.actions}><button type="button" onClick={() => setCanyon(canyonPreparationV85(canyon, "corniche"))}>Grimper à la corniche · observer les signaux</button><button type="button" onClick={() => setCanyon(canyonPreparationV85(canyon, "fond"))}>Prendre le fond du canyon · détour instable</button></div>}
        {canyon.heroSite === "corniche" && <button type="button" onClick={() => setCanyon(canyonPreparationV85(canyon, "maintenance"))}>Rejoindre la maintenance par la rampe</button>}
        {canyon.heroSite === "maintenance" && <div className={styles.actions}><button type="button" onClick={() => setCanyon(canyonPreparationV85(canyon, "borrow"))}>Emprunter la batterie · refuge exposé</button><button type="button" onClick={() => setCanyon(canyonPreparationV85(canyon, "preserve"))}>Préserver le refuge · réserve propre et détour</button></div>}
        {canyon.heroSite === "mezzanine" && <button type="button" onClick={() => setCanyon(canyonPreparationV85(canyon, "poste"))}>Atteindre le poste et transmettre le renseignement</button>}
        {canyon.heroSite === "poste" && <div><p>Manifeste : {composition.used.command} commandement, {composition.used.materials} matériaux, {composition.used.energy} énergie.</p>{canyonCompositionIssueV85(selection) && <p className={styles.warning}>{canyonCompositionIssueV85(selection)}</p>}<button type="button" disabled={Boolean(canyonCompositionIssueV85(selection))} onClick={() => { const next = engageCanyonV85(canyon, selection); setCanyon(next); setSelectedFormation(next.formations[0]?.id ?? ""); setMessage("Commandement engagé. Sélectionnez une formation et donnez-lui un ordre."); }}>Sceller le manifeste et prendre le commandement</button><button type="button" onClick={() => setTab("composition")}>Modifier les formations</button></div>}
      </div>}
      {canyon.phase !== "preparation" && <div>
        <div className={styles.metrics}><p>Phase <strong>{canyon.phase === "battle" ? "Commandement" : "Retour"}</strong></p><p>Temps tactique <strong>{Math.floor(canyon.seconds)} s</strong></p><p>Postes observés <strong>{canyon.observedPosts.length}/3</strong></p><p>Convoi <strong>{canyon.cargoDelivered ? "Extrait" : "En route"}</strong></p></div>
        <div className={styles.battleView}>
          <svg viewBox="0 0 1000 390" role="img" aria-label="Canyon latéral : fond, corniche, rampe ouest, pont suspendu et escalier est">
            <defs><linearGradient id="war-canyon-sky" x2="0" y2="1"><stop stopColor="#182c36"/><stop offset="1" stopColor="#472c28"/></linearGradient></defs>
            <rect width="1000" height="390" fill="url(#war-canyon-sky)"/><path d="M0 65L90 36L130 104L250 72L330 110L385 65L475 105L530 48L605 118L695 67L820 113L915 47L1000 88V390H0Z" fill="#4e3e36"/><path d="M0 150H480M560 150H1000" stroke="#ad9174" strokeWidth="16"/><path d="M480 150L520 166L560 150" fill="none" stroke={canyon.bridgeSecured ? "#b9d58c" : "#bf6c51"} strokeWidth="5" strokeDasharray={canyon.bridgeSecured ? undefined : "6 5"}/><path d="M0 310H1000M120 310L190 150M865 150L940 310" stroke="#aa8b6c" strokeWidth="13"/>
            <text x="15" y="125" fill="#eee0bd" fontSize="19">N1 · Corniche nord</text><text x="15" y="365" fill="#eee0bd" fontSize="19">N0 · Fond du canyon et chariot</text><text x="440" y="205" fill="#f4d8ac" fontSize="15">Pont · ancrage {canyon.bridgeSecured ? "rétabli" : "à sécuriser"}</text><rect x="920" y="265" width="70" height="47" fill="#34533b" stroke="#c7d796"/><text x="898" y="250" fill="#d7e8aa" fontSize="16">Extraction</text>
            <rect x="637" y="283" width="33" height="27" rx="4" fill={canyon.porterRescued ? "#4b6250" : "#d69b60"}/><text x="610" y="337" fill="#ecd9b2" fontSize="15">{canyon.porterRescued ? "Caisse laissée" : "Porteur blessé"}</text>
            {CANYON_POSTS_V85.map((post, index) => canyon.observedPosts.includes(index) && <g key={post}><path d={`M${post * 10 - 12} 128L${post * 10} 103L${post * 10 + 12} 128Z`} fill={canyon.suppressedPosts.includes(index) ? "#7ea97f" : "#e0906a"}/><text x={post * 10 - 20} y="90" fill="#f3e0bd" fontSize="14">P{index + 1}</text></g>)}
            {canyon.formations.filter(item => !item.extraction).map((item, index) => <g key={item.id} transform={`translate(${item.x * 10},${item.level === 1 ? 128 : 287})`}><circle r={item.id === formation?.id ? 18 : 13} fill={item.id === formation?.id ? "#e7d48e" : "#a2c3a0"} stroke="#14241b" strokeWidth="3"/><text y="4" textAnchor="middle" fontSize="12" fill="#15231a">{index + 1}</text><text y="-24" textAnchor="middle" fontSize="11" fill="#f6efcf">{item.typeId.replace("RTS-", "")}</text></g>)}
          </svg>
        </div>
        {canyon.phase === "battle" && <div className={styles.commander}>
          <div className={styles.actions}><button type="button" onClick={() => setRunning(current => !current)}>{running ? "Pause tactique" : "Reprendre le temps"}</button><button type="button" disabled={running || !pageActive} onClick={() => setCanyon(stepCanyonV85(canyon))}>Avancer d’une seconde</button><button type="button" onClick={() => { setCanyon(withdrawCanyonV85(canyon)); setRunning(false); }}>Déclarer le repli</button></div>
          <div className={styles.controlGrid}><label>Formation<select value={formation?.id ?? ""} onChange={event => setSelectedFormation(event.target.value)}>{canyon.formations.filter(item => !item.extraction).map((item, index) => <option key={item.id} value={item.id}>{index + 1}. {warUnitV85(item.typeId)?.name}</option>)}</select></label><label>Ordre<select value={tacticalOrder} onChange={event => setTacticalOrder(event.target.value as CanyonOrderKindV85)}>{Object.entries(tacticalLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><label>Position visée<input type="number" min={6} max={96} value={tacticalX} onChange={event => setTacticalX(Math.max(6, Math.min(96, Number(event.target.value) || 6)))} /></label><label>Niveau<select value={tacticalLevel} onChange={event => setTacticalLevel(Number(event.target.value) as 0 | 1)}><option value={0}>N0 · Fond du canyon</option><option value={1}>N1 · Corniche</option></select></label></div>
          <button type="button" disabled={!formation || formation.extraction} onClick={issueTactical}>Transmettre l’ordre</button>
          {formation && <p>{warUnitV85(formation.typeId)?.name} · position {Math.round(formation.x)}, N{formation.level} · {tacticalLabels[formation.order]} · XP {formation.startingXp + canyonXpV85(formation)} · {formation.adopted ? "Lecture récente adoptée" : `adoption ${Math.floor(formation.adoptionSeconds)}/8 s`}</p>}
          <details><summary>Guide de commandement du canyon</summary><p>Déplacez le pisteur près des postes 34, 52 et 72, puis ordonnez Observer. Une escorte proche recevant Couvrir contient les postes observés et protège le chariot. À 46, un sapeur ou le technicien rétablit l’accès du pont ; les changements d’étage passent par la rampe 18 ou l’escalier 88. À 66, le soigneur ou les porteurs évacuent le blessé en laissant une caisse. L’extraction se trouve à 96.</p><p>Lecture récente demande 100 XP et huit secondes sans exposition. Cette carte exerce les routes et la coordination ; elle ne simule pas encore le combat complet, les munitions ni les blessures de chaque membre.</p></details>
        </div>}
        {canyon.phase === "debrief" && <div className={styles.debrief}><h4>{canyon.cargoDelivered ? "Convoyage achevé" : "Rapport de repli"}</h4><p>{canyon.porterRescued ? "Le porteur blessé a été évacué ; une caisse reste sur place." : "Le porteur attend encore son équipe d’évacuation."}</p><div className={styles.scrollTable}><table><thead><tr><th>Formation</th><th>Départ</th><th>Tâches</th><th>Objectifs</th><th>Extraction</th><th>Sauvetage</th><th>Menaces</th><th>Gain</th><th>Total</th></tr></thead><tbody>{canyon.formations.map(item => <tr key={item.id}><th>{warUnitV85(item.typeId)?.name}</th><td>{item.startingXp}</td><td>{item.roleEvents.length}</td><td>{item.objectives.length}</td><td>{item.extraction ? "Oui" : "Non"}</td><td>{item.rescued.length}</td><td>{item.threats.length}</td><td>{canyonXpV85(item)}</td><td>{item.startingXp + canyonXpV85(item)}</td></tr>)}</tbody></table></div><button type="button" disabled={canyon.committed} onClick={() => setCanyon(commitCanyonV85(canyon))}>{canyon.committed ? persistedCanyon ? "Résultat déjà archivé" : "Résultat en mémoire · sauvegarde non confirmée" : "Archiver le résultat une fois"}</button><p>{canyon.transitRecognized ? "Transit reconnu dans l’exercice. CON-T09 conserve son drapeau F03." : "Aucun territoire acquis par ce convoyage."}</p></div>}
      </div>}
      <ol className={styles.log} aria-label="Journal du canyon">{canyon.messages.slice(-9).map((text, index) => <li key={`${index}-${text}`}>{text}</li>)}</ol>
    </div>}

    {tab === "korthas" && <div>
      <ClanWarPlanetsV96 planet={planet} turn={simulation.turn} persisted={persistedWar} pending={pendingWrites > 0} onSelect={selectPlanet}/>
      <div className={styles.sectionHeader}><div><h3>{planet.name} · tour {simulation.turn}</h3><p>Routes du théâtre, détachements présents et informations adverses estimées.</p></div><button type="button" onClick={restartWar}>Nouvel exercice</button></div>
      <div className={styles.metrics}><p>Stock consolidé <Budget {...budget}/></p><p>Contrôle <strong>{controlled.length}/36</strong></p><p>Aptes <strong>{warFitCombatantsV85(simulation).length}</strong></p><p>Entretien prévu <strong>S{warUpkeepV85(simulation)}</strong></p></div>
      <div className={styles.objectives}><p>Région tenue : <strong>{Math.min(2, simulation.regionStability)}/2</strong> fins de tour.</p><p>Corridor des Haltes : <strong>{Math.min(2, simulation.corridorStability)}/2</strong>.</p><p>Contrôle total : <strong>{Math.min(2, simulation.totalStability)}/2</strong>.</p></div>
      <p>Domination : contrôlez les 36 sites intacts et ravitaillés, avec au moins une garnison apte dans chacune des six régions, pendant deux fins de tour avec entretien payé.</p>
      <details><summary>Conditions de la région et du corridor</summary><p>Pour tenir une région, chaque territoire de cette région doit rester intact, ravitaillé et occupé par une garnison apte pendant deux fins de tour avec entretien payé.</p><p>Sites du corridor à contrôler et garnir : {corridorIds.map(id => id.replace("CON-", "")).join(" · ")}. Maintenez leurs liaisons de ravitaillement et au moins un droit de transit actif auprès des Passes autonomes pendant deux fins de tour avec entretien payé.{planet.id === "korthas" ? " T02 doit également rester relié au ravitaillement." : ""}</p></details>
      {simulation.completedObjectives.includes("CON-O01") && <p className={styles.positive} role="status">{planet.name} maîtrisée · domination confirmée après deux fins de tour. {persistedWar ? "Victoire archivée sur cet appareil." : "Victoire en mémoire · sauvegarde à confirmer."}</p>}
      <ClanWarAtlasV95 key={`atlas:${planet.id}`} simulation={simulation} selectedTerritoryId={territoryId} targetTerritoryId={targetId} onSelectTerritory={selectTerritory} onSelectTarget={selectTarget}/>
      <ClanWarCommandV98 key={`command:${planet.id}`} simulation={simulation} selectedTerritoryId={territoryId} onPrepare={prepareSite} onManageGarrison={manageGarrisonSite}/>
      <div className={styles.strategicCommand}>
        <aside className={styles.orderPanel} aria-label="Commandement du territoire" data-testid="war-order-panel-v98"><p className={styles.eyebrow}>{territory.id} · {territory.region}</p><h4>{territory.name}</h4><p>{WAR_FACTIONS_V85[simulation.territories[territoryId].controller]}</p>{simulation.territories[territoryId].controller === "CON-F01" && <><p>Stock sur place <Budget {...simulation.stocks[territoryId]}/></p><p>{warGarrisonV85(simulation, territoryId).length} garde(s) · {supplied.has(territoryId) ? "liaison ouverte" : "liaison absente"}.</p></>}<p>{territory.terrain}</p>
          {simulation.territories[territoryId].controller === "CON-F01" ? <div>
            <ClanWarGarrisonV99 key={`garrison:${planet.id}:${territoryId}`} simulation={simulation} territoryId={territoryId} disabled={suspended || !pageActive || pendingWrites > 0} onChange={changeGarrison}/>
            <label>Ordre<select data-war-order-kind-v98 value={orderKind} onChange={event => { setOrderKind(event.target.value as WarOrderKindV85); setSelectedPeople([]); setConfirmTurn(false); }}>{Object.entries(orderLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
            {orderKind !== "heal" && <label>Route voisine<select value={targetId} onChange={event => selectTarget(event.target.value)}>{territory.neighbors.map(id => <option value={id} key={id}>{id.replace("CON-", "")} · {warTerritoryForSimulationV96(simulation, id)?.name}</option>)}</select></label>}
            <fieldset><legend>Personnes au départ · huit maximum</legend><div className={styles.actions}><button type="button" onClick={() => { setSelectedPeople(orderKind === "evacuate" ? warEvacuationSelectionV100(simulation, territoryId) : candidates.filter(actor => !reservedPeople.has(actor.id) && (orderKind === "heal" || !actor.garrison)).slice(0, 8).map(actor => actor.id)); setConfirmTurn(false); }}>{orderKind === "evacuate" ? "Préparer une évacuation sans dégarnir" : orderKind === "heal" ? "Sélectionner les blessés" : "Sélectionner les mobiles"}</button><button type="button" disabled={selectedPeople.length === 0} onClick={() => { setSelectedPeople([]); setConfirmTurn(false); }}>Tout effacer</button></div>{candidates.map(actor => <label className={styles.person} key={actor.id}><input type="checkbox" disabled={reservedPeople.has(actor.id) || selectedPeople.length >= 8 && !selectedPeople.includes(actor.id)} checked={selectedPeople.includes(actor.id)} onChange={event => { setSelectedPeople(current => event.target.checked ? current.length < 8 ? [...current, actor.id] : current : current.filter(id => id !== actor.id)); setConfirmTurn(false); }}/><span>{actor.id} · {warUnitV85(actor.unitTypeId)?.name} · {actor.status === "wounded" ? "blessé · patient" : orderKind === "evacuate" ? `apte · escorte${actor.garrison ? " · garde" : ""}` : actor.garrison ? "garde" : "mobile"}{reservedPeople.has(actor.id) ? " · déjà affecté à un ordre" : ""}<small>{actor.xp} XP · {warVeterancyV85(actor.xp).label}</small></span></label>)}{candidates.length === 0 && <p>Aucune personne disponible pour cet ordre.</p>}</fieldset>
            {orderKind === "evacuate" && <ClanWarEvacuationV100 simulation={simulation} draft={draft}/>}
            {orderKind === "logistics" && <div className={styles.controlGrid}><label>Lots S<input type="number" min={0} max={1000} value={cargoS} onChange={event => setCargoS(Math.max(0, Math.min(1000, Math.floor(Number(event.target.value) || 0))))}/></label><label>Lots M<input type="number" min={0} max={1000} value={cargoM} onChange={event => setCargoM(Math.max(0, Math.min(1000, Math.floor(Number(event.target.value) || 0))))}/></label></div>}
            <p>Réservation locale <Budget {...selectedCost}/></p><ClanWarOrderPreviewV98 simulation={simulation} draft={draft}/><button type="button" data-war-reserve-order-v100 disabled={!!orderIssue || pendingWrites > 0 || suspended || !pageActive} onClick={() => queue()}>Réserver l’ordre</button>
            {orderKind === "evacuate" && evacuationConfirmation === evacuationConfirmationKey && <div className={styles.confirm} role="group" aria-label="Confirmer une évacuation sans garde" data-testid="war-evacuation-warning-v100"><p>Cette évacuation engage le dernier garde apte du départ. Si le déplacement aboutit, le site reste contrôlé mais perd sa production jusqu’à une nouvelle garde. Réserver n’avance pas le tour.</p><div className={styles.actions}><button type="button" disabled={pendingWrites > 0 || suspended || !pageActive} onClick={() => queue(true)}>Confirmer l’évacuation sans garde</button><button type="button" onClick={() => { setEvacuationConfirmation(null); setMessage("Évacuation non réservée ; les personnes conservent leurs affectations."); restoreOrderFocus(); }}>Conserver la garde</button></div></div>}
          </div> : <p>{warAtlasIntelV95(simulation, territoryId).label}. Envoyez une reconnaissance depuis un territoire voisin pour actualiser le renseignement.</p>}
          <details><summary>Sites, capture et risques</summary><p>{territory.sites}</p><p>{territory.capture}</p><p>{territory.effect}</p><p>{territory.risk}</p></details>
        </aside>
        <aside className={styles.frontGuide} aria-label="Préparer le tour"><p className={styles.eyebrow}>COMMANDER LE FRONT</p><h4>Reconnaître, engager, tenir</h4><ol><li>Sélectionnez un territoire des Haltes comme départ, puis une destination reliée par une route.</li><li>Choisissez l’ordre et jusqu’à huit personnes présentes. Les réservations utilisent le stock local.</li><li>Relisez les ordres et confirmez le tour : les Forges agissent aussi, les positions et les couleurs évoluent.</li></ol><p>Les Passes autonomes se négocient. Un droit de transit donne accès à leurs routes sans en changer le drapeau.</p><p>Conservez une garnison et une liaison de ravitaillement pour que vos sites produisent. Les personnes gardent leurs blessures et leur expérience.</p><p className={persistedWar ? styles.positive : styles.storage} role="status">{persistedWar ? `Le front de ${planet.name} est archivé sur cet appareil. Changer de planète conserve cette partie.` : pendingWrites > 0 ? `Enregistrement du front de ${planet.name} en cours…` : `Le front de ${planet.name} est conservé en mémoire. La sauvegarde sur cet appareil reste à confirmer.`}</p></aside>
      </div>
      <div className={styles.orderQueue}><h4>Ordres réservés</h4><p>Deux opérationnels, un logistique et un diplomatique par tour. Le mode de résolution de cet exercice est automatique.</p>{simulation.orders.length === 0 && <p>Aucun ordre. Passer un tour fera agir les Forges et paiera l’entretien.</p>}{simulation.orders.map(order => <div key={order.id}><span>{orderLabels[order.kind]} · {order.fromId.replace("CON-", "")} → {order.targetId.replace("CON-", "")} · {order.combatantIds.join(", ") || "mandat local"}</span><button type="button" onClick={() => { setSimulation(cancelWarOrderV85(simulation, order.id)); setConfirmTurn(false); }}>Retirer</button></div>)}</div>
      {!confirmTurn ? <button type="button" onClick={() => setConfirmTurn(true)}>Fin de préparation · relire avant résolution</button> : <div className={styles.confirm}><p>Les ordres seront scellés, les détachements adverses agiront avec leurs effectifs présents et l’entretien sera prélevé. Les revenus du prochain tour dépendront des sites encore reliés.</p><div className={styles.actions}><button type="button" onClick={() => { const result = advanceWarTurnV85(simulation); setMessage(result.message); if (result.accepted) setSimulation(result.state); setConfirmTurn(false); setSelectedPeople([]); }}>Confirmer et résoudre le tour</button><button type="button" onClick={() => setConfirmTurn(false)}>Revenir aux ordres</button></div></div>}
      <details className={styles.roster}><summary>Registre individuel · aptes, blessés et mémorial</summary><div className={styles.scrollTable}><table><thead><tr><th>Personne</th><th>Lieu</th><th>État</th><th>Affectation</th><th>XP</th><th>Vétérance</th></tr></thead><tbody>{simulation.combatants.filter(actor => actor.factionId === "CON-F01").map(actor => <tr key={actor.id}><th>{actor.id}</th><td>{actor.territoryId.replace("CON-", "")}</td><td>{actor.status === "fit" ? "Apte" : actor.status === "wounded" ? "Blessé" : "Mort"}{actor.trainingUntilTurn !== null ? ` · soins jusqu’au tour ${actor.trainingUntilTurn}` : ""}</td><td>{actor.garrison ? "Garnison" : "Détachement"}</td><td>{actor.xp}</td><td>{warVeterancyV85(actor.xp).label}</td></tr>)}</tbody></table></div></details>
      <ol className={styles.log} aria-label="Journal stratégique">{simulation.reports.slice(-12).map(item => <li key={item.id}><strong>Tour {item.turn}</strong> · {item.text}</li>)}</ol>
      <details><summary>Règles de cet exercice stratégique</summary><p>Les ressources, effectifs Pxx de départ, entretien et plafonds d’XP reprennent l’exercice de Korthas. Pour rendre la domination possible avec ses 24 personnes, les 30 fronts utilisent une garnison apte par région : cette adaptation de l’exercice ne modifie pas la fiche source du classeur. Les autres planètes sont des théâtres du projet avec leurs propres terres, noms et routes. Le modèle automatique compare les effectifs présents à une résistance de même effectif, avec une variation déterministe de 0 ou 1. Il produit des blessures, un éventuel décès et un repli sans recréer les personnes.</p><p>La répartition initiale des stocks, le prix de transit I1, sa durée de deux tours, les soins légers S1 et les cessions au-delà de T07 sont des choix de cet exercice. Une cession y est toujours acceptée après paiement et affectation d’un garde. Les contre-offensives emploient des colonnes réelles ; ce modèle n’est pas encore la diplomatie narrative complète du projet.</p></details>
    </div>}

    {tab === "dossier" && <div>
      <h3>{CLAN_WAR_ENTRIES_V85.length} fiches · {CLAN_WAR_SECTIONS_V85.length} feuilles de règles</h3><p>Trois échelles, 15 sociétés, 30 formations, 36 territoires, 12 cartes RTS, diplomatie, technologies, variantes des six voies et suites de guerre.</p>
      <div className={styles.controlGrid}><label>Rechercher<input type="search" maxLength={120} value={query} onChange={event => { setQuery(event.target.value); setPage(0); }} placeholder="CL2, canyon, Blooded, corridor…"/></label><label>Feuille<select value={section} onChange={event => { setSection(event.target.value); setPage(0); }}><option>Toutes les feuilles</option>{CLAN_WAR_SECTIONS_V85.map(name => <option key={name}>{name}</option>)}</select></label></div>
      <p>{filtered.length} fiche(s) trouvée(s). Les créations du projet gardent leur statut original ; elles ne définissent pas une organisation universelle de la franchise.</p>
      <div className={styles.library}><div className={styles.entryList}>{displayedEntries.map(entry => <button type="button" key={`${entry.sheet}-${entry.id}`} aria-pressed={entry.id === selectedEntryId} onClick={() => setSelectedEntryId(entry.id)}><small>{entry.id} · {entry.sheet}</small><strong>{entry.title}</strong></button>)}<div className={styles.actions}><button type="button" disabled={page === 0} onClick={() => setPage(current => current - 1)}>Précédent</button><span>{page + 1}/{Math.max(1, Math.ceil(filtered.length / 24))}</span><button type="button" disabled={(page + 1) * 24 >= filtered.length} onClick={() => setPage(current => current + 1)}>Suivant</button></div></div><div>{currentEntry ? <Entry entry={currentEntry}/> : <p>Choisir une fiche.</p>}</div></div>
      <p className={styles.source}>Source : {CLAN_WAR_WORKBOOK_V85.workbook} · conception du 6 octobre 2026. Les fiches complètes sont conservées avec leurs cellules. Le classeur indique une extension autonome et l’absence de la V2 exacte.</p>
    </div>}
  </section>;
}
