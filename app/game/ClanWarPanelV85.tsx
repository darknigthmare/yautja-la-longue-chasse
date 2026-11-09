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
  warTerritoriesForSimulationV96, warTerritoryForSimulationV96, warObjectiveCorridorV96, warHeadquartersV103,
  type WarGarrisonDraftV99, type WarOrderKindV85, type WarSimulationV85, type WarUpdateV85,
} from "./systems/clanWarV85";
import {
  CANYON_POSTS_V85, CANYON_PRESET_V85, canyonCompositionIssueV85,
  canyonPreparationV85, canyonXpV85, commitCanyonV85, createCanyonV85, engageCanyonV85,
  orderCanyonFormationV85, stepCanyonV85, withdrawCanyonV85,
  type CanyonOrderKindV85,
} from "./systems/clanWarCanyonV85";
import styles from "./ClanWarPanelV85.module.css";
import ClanWarBibleV6Panel from "./ClanWarBibleV6Panel";
import ClanWarCommandOverlay from "./ClanWarCommandOverlay";
import { importedYautjaArtVariantsV85 } from "./systems/recentSpriteLibraryV85";
import { createWarSessionV85 } from "./systems/clanWarSessionV85";
import {DEFAULT_WAR_RULES_V6} from "./systems/clanWarBibleV6";
import {WAR_OPERATIONS_STORAGE_V115} from "./systems/clanWarOperationsV115";
import {reviewWarProvenanceV152} from "./systems/clanWarProvenanceGateV152";
import {reviewWarProofSyncV145,importWarProofV145} from "./systems/clanWarProofSyncV145";
import {inspectWarSourcesV146} from "./systems/clanWarSourceAuditV146";
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
import ClanWarConvoyRouteV105 from "./ClanWarConvoyRouteV105";
import ClanWarAssaultV106 from "./ClanWarAssaultV106";
import ClanWarMissionsV114 from "./ClanWarMissionsV114";
import { queuePreparedWarAssaultV106, type WarAssaultPlanV106 } from "./systems/clanWarAssaultV106";
import ClanWarGauntletV131 from "./ClanWarGauntletV131";
import gauntletStyles from "./ClanWarGauntletV131.module.css";
import ClanWarGauntletLockerV132 from "./ClanWarGauntletLockerV132";
import {
  DEFAULT_GAUNTLET_ID_V132, GAUNTLET_READOUT_LABELS_V132,
  gauntletByIdV132, gauntletUnlockedV132, type GauntletThemeV132,
} from "./systems/clanWarGauntletCatalogV132";
import { useHunterGauntletV133 } from "./systems/useHunterGauntletV133";
import {inspectWarTurnGateV143,WAR_TURN_GATE_MESSAGES_V143} from "./systems/clanWarTurnGateV143";
import {
  DEFAULT_WAR_PRESENTATION_V131, WAR_PRESENTATION_KEY_V131, parseClanWarPresentationV131,
  type ClanWarPresentationV131,
} from "./systems/clanWarViewV131";

type WarPanelTab = "bible" | "canyon" | "composition" | "korthas" | "operations" | "dossier";
type CommandLayer = "worlds" | "settings" | "archives" | "help" | "territory" | "orders" | "forces" | "convoy" | "journal" | "sources";

function CommandMark({ kind }: { kind: string }) {
  return <svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
    {kind === "korthas" ? <><circle cx="12" cy="12" r="8"/><ellipse cx="12" cy="12" rx="3.5" ry="8"/><path d="M4 12h16M6 7h12M6 17h12"/></> : kind === "bible" ? <><path d="m12 3 8 5v8l-8 5-8-5V8Z"/><path d="m4 8 8 5 8-5M12 13v8"/></> : kind === "operations" ? <><path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z"/><circle cx="12" cy="12" r="3"/></> : <><path d="M4 6h16v14H4ZM7 3h10M8 10h8M8 14h8M8 17h5"/></>}
  </svg>;
}

const fold = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const orderLabels: Record<WarOrderKindV85, string> = { move: "Déplacer", attack: "Assaut F02", recon: "Reconnaissance", cession: "Cession négociée", transit: "Droit de transit", logistics: "Convoi terrestre", heal: "Soins légers", evacuate: "Évacuer les blessés" };
const tacticalLabels: Record<CanyonOrderKindV85, string> = { hold: "Tenir", move: "Déplacer", observe: "Observer", cover: "Couvrir", secure: "Rétablir l’accès", rescue: "Évacuer le porteur", adopt: "Adopter Lecture récente", extract: "Rejoindre l’extraction" };
function Budget({ s, m, i }: { s: number; m: number; i: number }) { return <span className={styles.budget}>S <strong>{s}</strong> · M <strong>{m}</strong> · I <strong>{i}</strong></span>; }
function WarArt({ clanName, role }: { clanName?: string; role?: string }) {
  const art = importedYautjaArtVariantsV85({ clanName, role })[0];
  return art ? <figure className={styles.sourceArt} data-war-art={art.id}><Image src={art.src} width={art.width} height={art.height} unoptimized alt={`${art.label} · référence originale statique`} loading="lazy" decoding="async"/><figcaption>{art.label} · référence statique du {clanName ? "clan" : "rôle"}</figcaption></figure> : null;
}
const artRoles: Record<string, string> = { "RTS-U01": "patrouille", "RTS-U02": "pisteur", "RTS-U03": "tireur", "RTS-U13": "sapeur", "RTS-U15": "soigneur", "RTS-U18": "porteur" };
function preferredWarPlanetV96(initialPlanetId?: string) {
  if (initialPlanetId && warPlanetV96(initialPlanetId)) return initialPlanetId;
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
export default function ClanWarPanelV85({ save, onClose, suspended = false, initialPlanetId, onGauntletSound,onEquipGauntlet,onClaimGauntletStudy }: { save: SaveGame; onClose: () => void; suspended?: boolean; initialPlanetId?: string; onGauntletSound?: (theme: GauntletThemeV132) => void; onEquipGauntlet?: (id:string)=>boolean; onClaimGauntletStudy?: (id:string)=>boolean }) {
  const root = useRef<HTMLElement>(null);
  const focusPlanetSelection = useRef(Boolean(initialPlanetId));
  const pageActive = useSyncExternalStore(subscribePageActivityV94, pageActivitySnapshotV94, serverPageActivityV94);
  const [tab, setTab] = useState<WarPanelTab>("korthas");
  const [commandLayer, setCommandLayer] = useState<CommandLayer | null>(initialPlanetId ? "worlds" : null);
  const closeCommandLayer = () => setCommandLayer(null);
  function navigateCommand(next: WarPanelTab) { setTab(next); setRunning(false); setCommandLayer(null); }
  // Presentation is independent from the war archive. Server and first client render match.
  const [presentation, setPresentation] = useState<ClanWarPresentationV131>(DEFAULT_WAR_PRESENTATION_V131);
  const presentationTouched = useRef(false);
  const { equippedId: equippedGauntletId, equip, storageWarning: gauntletStorageWarning } = useHunterGauntletV133(save.createdAt, save.profile.rankId,save.gauntletV134);
  const [sessionStore] = useState(() => createWarSessionV85(() => typeof window === "undefined" ? null : window.localStorage));
  const [activePlanetId, setActivePlanetId] = useState(() => preferredWarPlanetV96(initialPlanetId));
  const [planetSessions, setPlanetSessions] = useState<Record<string, ReturnType<typeof createWarSessionV85>>>(() => ({
    korthas: sessionStore,
    ...(activePlanetId === "korthas" ? {} : { [activePlanetId]: createWarSessionV85(() => typeof window === "undefined" ? null : window.localStorage, undefined, undefined, { planetId: activePlanetId }) }),
  }));
  const retainedPlanetIds = useMemo(() => Object.keys(planetSessions), [planetSessions]);
  const planetSession = planetSessions[activePlanetId];
  /** V144: passively invalidate stale exercises when a sibling tab updates
   * their local archive; never import foreign turns into a live renderer. */
  useEffect(()=>{
    const refresh=(key:string|null)=>{
      for(const session of new Set(Object.values(planetSessions)))session.observeExternalStorageChange(key);
    };
    const onStorage=(event:StorageEvent)=>{
      try{if(event.storageArea!==window.localStorage)return;}catch{return;}
      refresh(event.key);
    };
    const onFocus=()=>{if(document.visibilityState==="visible")refresh(null);};
    window.addEventListener("storage",onStorage);
    window.addEventListener("focus",onFocus);
    document.addEventListener("visibilitychange",onFocus);
    return ()=>{
      window.removeEventListener("storage",onStorage);
      window.removeEventListener("focus",onFocus);
      document.removeEventListener("visibilitychange",onFocus);
    };
  },[planetSessions]);

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
  const modularStrategy = planet.procedural && "strategy" in planet.procedural ? planet.procedural.strategy : null;
  const corridorIds = planet.id === "korthas" ? ["CON-T01", "CON-T08", "CON-T14", "CON-T15", "CON-T21", "CON-T22"] : warObjectiveCorridorV96(simulation);
  const [message, setMessage] = useState("");
  const [evidenceRawV152,setEvidenceRawV152]=useState<string|null>(null);
  const evidenceRawRefV152=useRef<string|null>(null);
  const [evidenceStaleV152,setEvidenceStaleV152]=useState(false);
  const evidenceV152=useMemo(()=>evidenceRawV152?
    reviewWarProvenanceV152(evidenceRawV152,simulation,DEFAULT_WAR_RULES_V6):null,
    [evidenceRawV152,simulation]);
  // The separate V115 archive is read only on an explicit action; no
  // hidden auto-transfer from one exercise to another.
  const [warProofSource,setWarProofSource]=useState<string|null>(null);
  const warProofPreview=useMemo(()=>warProofSource?
    reviewWarProofSyncV145(warProofSource,simulation,DEFAULT_WAR_RULES_V6):null,
    [warProofSource,simulation]);
  const sourceAuditV146=useMemo(()=>warProofSource?
    inspectWarSourcesV146(warProofSource,simulation,DEFAULT_WAR_RULES_V6):null,
    [warProofSource,simulation]);
  useEffect(()=>{
    // A storage event does not grant permission to import new bytes: discard
    // the old conclusion and wait for an explicit new inspection instead.
    const changed=(event:StorageEvent)=>{
      if(evidenceRawRefV152.current===null)return;
      if(event.storageArea!==window.localStorage)return;
      if(event.key===null||(event.key===WAR_OPERATIONS_STORAGE_V115&&
        event.newValue!==evidenceRawRefV152.current))setEvidenceStaleV152(true);
    };
    window.addEventListener("storage",changed);
    return ()=>window.removeEventListener("storage",changed);
  },[]);
  useEffect(()=>{
    // The V115 exercise can write in this very tab while another panel is
    // open; storage events only notify other documents. Require a new read
    // after leaving the evidence view, without reading the archive in effect.
    if(tab!=="korthas"&&evidenceRawRefV152.current!==null)setEvidenceStaleV152(true);
  },[tab]);
  const [query, setQuery] = useState(""), [section, setSection] = useState("Toutes les feuilles"), [page, setPage] = useState(0);
  const [selectedEntryId, setSelectedEntryId] = useState("OPS-01");
  const [territoryChoice, setTerritoryId] = useState<string | null>(null), [targetChoice, setTargetId] = useState<string | null>(null);
  const [requestedOrderKind, setOrderKind] = useState<WarOrderKindV85 | null>(null);
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [cargoS, setCargoS] = useState(0), [cargoM, setCargoM] = useState(0);
  const [confirmTurn, setConfirmTurn] = useState(false);
  // Revision visible when the player began reviewing this end-turn decision.
  // A different order, tab or renderer cannot re-use a stale confirmation.
  const confirmTurnRevision = useRef<number | null>(null);
  const [evacuationConfirmation, setEvacuationConfirmation] = useState<string | null>(null);
  const [selectedFormation, setSelectedFormation] = useState("");
  const [tacticalOrder, setTacticalOrder] = useState<CanyonOrderKindV85>("move");
  const [tacticalX, setTacticalX] = useState(28), [tacticalLevel, setTacticalLevel] = useState<0 | 1>(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (presentationTouched.current) return;
      let stored: string | null = null;
      try { stored = window.localStorage.getItem(WAR_PRESENTATION_KEY_V131); }
      catch { /* The hologram remains usable without preference storage. */ }
      setPresentation(parseClanWarPresentationV131(stored));
    });
    const onPreferenceFromOtherTab = (event: StorageEvent) => {
      if (event.key === WAR_PRESENTATION_KEY_V131 || event.key === null) {
        setPresentation(parseClanWarPresentationV131(event.newValue));
      }
    };
    window.addEventListener("storage", onPreferenceFromOtherTab);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("storage", onPreferenceFromOtherTab);
    };
  }, []);

  function equipGauntlet(id: string) {
    if (suspended || !pageActive || !gauntletUnlockedV132(id, save.profile.rankId,save.gauntletV134?.claimedStudies??[])) return;
    if (onEquipGauntlet?onEquipGauntlet(id):equip(id)) {
      if(!onEquipGauntlet)onGauntletSound?.(gauntletByIdV132(id)?.theme ?? "classic");
      setMessage(`Gauntlet ${gauntletByIdV132(id)?.name ?? id} équipé. Le front et ses ordres restent inchangés.`);
    }
  }
  function choosePresentation(next: ClanWarPresentationV131) {
    presentationTouched.current = true;
    setPresentation(next);
    if (next === "gauntlet") onGauntletSound?.(gauntletByIdV132(equippedGauntletId)?.theme ?? "classic");
    try { window.localStorage.setItem(WAR_PRESENTATION_KEY_V131, next); }
    catch { /* Preference may remain temporary; no war save or order is touched. */ }
  }

  useEffect(() => {
    if (!loaded || !focusPlanetSelection.current) return;
    if (commandLayer === "worlds") root.current?.querySelector<HTMLSelectElement>('[data-testid="war-planet-selector-v96"] select')?.focus({ preventScroll: true });
    else root.current?.querySelector<HTMLButtonElement>('[data-command-open="worlds"]')?.focus({ preventScroll: true });
    focusPlanetSelection.current = false;
  }, [loaded, activePlanetId, commandLayer]);

  useEffect(() => {
    if (!running || canyon.phase !== "battle" || tab !== "canyon" || suspended || !pageActive || commandLayer) return;
    let active = true;
    const timer = window.setInterval(() => {
      // Recheck at delivery: focus may change before React cleans this effect.
      if (!active || !pageActivitySnapshotV94() || !root.current || root.current.closest('[inert],[hidden],[aria-hidden="true"]') || root.current.querySelector('dialog[open]')) return;
      setCanyon(current => stepCanyonV85(current));
    }, 1000);
    return () => { active = false; window.clearInterval(timer); };
  }, [running, canyon.phase, tab, setCanyon, suspended, pageActive, commandLayer]);

  const composition = useMemo(() => warCompositionV85(selection), [selection]);
  const supplied = useMemo(() => warSuppliedV85(simulation), [simulation]);
  const effectiveGauntlet=gauntletUnlockedV132(equippedGauntletId,save.profile.rankId,save.gauntletV134?.claimedStudies??[])
    ? gauntletByIdV132(equippedGauntletId) : gauntletByIdV132(DEFAULT_GAUNTLET_ID_V132);
  const gauntletReadout=effectiveGauntlet?.readout??"intel";
  const gauntletReadoutValue =
    gauntletReadout==="routes" ? `${warTerritoriesForSimulationV96(simulation).length} sites · ${simulation.orders.filter(o=>o.kind==="move").length} déplacements réservés` :
    gauntletReadout==="medical" ? `${simulation.combatants.filter(c=>c.factionId==="CON-F01"&&c.status==="wounded").length} blessés · ${simulation.combatants.filter(c=>c.factionId==="CON-F01"&&c.status==="fit").length} aptes` :
    gauntletReadout==="command" ? `${simulation.orders.length} ordres réservés · tour ${simulation.turn}` :
    gauntletReadout==="supply" ? `${supplied.size} sites ravitaillés` :
    `${simulation.observations.length} observations · ${simulation.reports.length} rapports historiques`;
  const budget = useMemo(() => warBudgetV85(simulation), [simulation]);
  // Derive defaults from the hydrated front. A newly opened world may already
  // have lost its original departure, and its routes need not include T02–T08.
  const definitions = warTerritoriesForSimulationV96(simulation);
  const controlled = definitions.filter(item => simulation.territories[item.id].controller === "CON-F01");
  const territory = (territoryChoice ? warTerritoryForSimulationV96(simulation, territoryChoice) : undefined)
    ?? controlled.find(item => item.id === (modularStrategy ? warHeadquartersV103(simulation) : "CON-T02")) ?? controlled[0] ?? definitions[0];
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
    if (!nextPlanet || liveWrites > 0) return false;
    if (id === activePlanetId) { setCommandLayer(null); return true; }
    let releasedId: string | undefined;
    if (!planetSessions[id] && Object.keys(planetSessions).filter(key => key !== "korthas").length >= 24) {
      // Keep the shared Korthas exercise, and bound other live sessions. A code
      // can rebuild an archived front; modified unsaved progress cannot.
      const candidates = Object.entries(planetSessions).filter(([key]) => key !== "korthas");
      candidates.sort(([left], [right]) => Number(left === activePlanetId) - Number(right === activePlanetId));
      releasedId = candidates.find(([, session]) => {
        const snapshot = session.getSnapshot();
        const pristine = snapshot.simulation.turn === 1 && snapshot.simulation.revision === 0 && snapshot.simulation.orders.length === 0;
        return snapshot.pendingWrites === 0 && (snapshot.persistedWar || pristine);
      })?.[0];
      if (!releasedId) {
        setMessage("Les fronts gardés en mémoire contiennent des progrès non enregistrés. Réessayez leur enregistrement avant d’ouvrir un autre front. Vous pouvez continuer à explorer et exporter de nouveaux mondes.");
        return false;
      }
    }
    const nextSession = planetSessions[id] ?? createWarSessionV85(() => typeof window === "undefined" ? null : window.localStorage, undefined, undefined, { planetId: id });
    if (!planetSessions[id]) setPlanetSessions(current => {
      const next = { ...current, [id]: nextSession };
      if (releasedId) delete next[releasedId];
      return next;
    });
    focusPlanetSelection.current = true;
    setActivePlanetId(id); setTerritoryId(null); setTargetId(null);
    setSelectedPeople([]); setConfirmTurn(false); setRunning(false); setCargoS(0); setCargoM(0);
    setOrderKind(null);
    setCommandLayer(null);
    setMessage(`${nextPlanet.name} · front ouvert. Chaque planète conserve sa progression locale indépendante.`);
    try { window.localStorage.setItem(WAR_PLANET_SELECTION_KEY_V96, id); } catch { /* The selected front still remains available in memory. */ }
    return true;
  }
  function selectTerritory(id: string) {
    const definition = warTerritoryForSimulationV96(simulation, id);
    if (!definition) return;
    setTerritoryId(id); setSelectedPeople([]); setConfirmTurn(false); setCommandLayer("territory");
    const nextTarget = definition.neighbors.includes(targetId) ? targetId : definition.neighbors.find(neighbor => simulation.territories[neighbor].controller === "CON-F02") ?? definition.neighbors[0] ?? id;
    setTargetId(nextTarget);
    if (["attack", "move", "cession"].includes(orderKind)) setOrderKind(simulation.territories[nextTarget].controller === "CON-F02" ? "attack" : simulation.territories[nextTarget].controller === "CON-F03" ? "cession" : "move");
  }
  function selectTarget(id: string) {
    if (!territory.neighbors.includes(id)) {
      setMessage("Cette destination n’est pas voisine du départ. Choisissez une route affichée ou rapprochez votre détachement.");
      return;
    }
    setTargetId(id); setConfirmTurn(false); setCommandLayer("territory");
    if (["attack", "move", "cession"].includes(orderKind)) setOrderKind(simulation.territories[id].controller === "CON-F02" ? "attack" : simulation.territories[id].controller === "CON-F03" ? "cession" : "move");
    setMessage(`Destination : ${warTerritoryForSimulationV96(simulation, id)!.name}. L’ordre prendra effet après confirmation du tour.`);
  }
  function queue(confirmEvacuation = false, assaultPlan: WarAssaultPlanV106 | null = null): boolean {
    const live = planetSession.getSnapshot();
    if (suspended || !pageActivitySnapshotV94() || !live.loaded || live.pendingWrites > 0 || live.staleWar) return false;
    const result = draft.kind === "attack" ? queuePreparedWarAssaultV106(live.simulation, draft, assaultPlan) : queueWarOrderV85(live.simulation, draft);
    if (!result.accepted) { setMessage(result.message); return false; }
    const liveKey = JSON.stringify([planet.id, live.simulation.revision, draft.fromId, draft.targetId, draft.combatantIds]);
    if (draft.kind === "evacuate" && warEvacuationLeavesUnguardedV100(live.simulation, draft) && (!confirmEvacuation || evacuationConfirmation !== liveKey)) {
      setEvacuationConfirmation(liveKey);
      setMessage("Cette évacuation engage le dernier garde apte du départ. Confirmez avant de réserver le détachement.");
      window.requestAnimationFrame(() => {
        if (pageActivitySnapshotV94() && root.current && !root.current.closest('[inert],[hidden]')) root.current.querySelector<HTMLButtonElement>('[data-testid="war-evacuation-warning-v100"] button')?.focus({ preventScroll: true });
      });
      return false;
    }
    setMessage(result.message); setSimulation(result.state); setSelectedPeople([]); setConfirmTurn(false); setEvacuationConfirmation(null);
    if (confirmEvacuation) restoreOrderFocus();
    return true;
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
    if (suspended || !pageActivitySnapshotV94() || !live.loaded || live.pendingWrites > 0 || live.staleWar) return false;
    const result = changeWarGarrisonV99(live.simulation, draft);
    setMessage(result.message);
    if (result.accepted) { setSimulation(result.state); setSelectedPeople([]); setConfirmTurn(false); }
    return result.accepted;
  }
  function updateConvoy(operation: (current: WarSimulationV85) => WarUpdateV85, expectedRevision?: number) {
    const live = planetSession.getSnapshot();
    if (suspended || !pageActivitySnapshotV94() || !live.loaded || !live.writableWar || live.pendingWrites > 0 || live.staleWar) return false;
    if (expectedRevision !== undefined && live.simulation.revision !== expectedRevision) {
      setMessage("Le front a changé depuis la vérification du fichier. Relisez le fichier avant le remplacement."); return false;
    }
    const result = operation(live.simulation);
    setMessage(result.message);
    if (result.accepted) { setSimulation(result.state); setSelectedPeople([]); setConfirmTurn(false); }
    return result.accepted;
  }
  function requestWarTurnReview() {
    const live=planetSession.getSnapshot();
    const gate=inspectWarTurnGateV143(live,live.simulation.revision,pageActivitySnapshotV94(),suspended);
    if(!gate.allowed){setMessage(WAR_TURN_GATE_MESSAGES_V143[gate.reason]);setConfirmTurn(false);return;}
    confirmTurnRevision.current=live.simulation.revision;
    setConfirmTurn(true); setCommandLayer("orders");
  }
  function resolveReviewedWarTurn() {
    const live=planetSession.getSnapshot();
    const gate=inspectWarTurnGateV143(live,confirmTurnRevision.current,pageActivitySnapshotV94(),suspended);
    if(!gate.allowed){
      setMessage(WAR_TURN_GATE_MESSAGES_V143[gate.reason]);
      setConfirmTurn(false);confirmTurnRevision.current=null;return;
    }
    // The session store updates synchronously and starts a write fence. A
    // second click therefore sees pendingWrites>0 or a different revision.
    const result=advanceWarTurnV85(live.simulation);
    setMessage(result.message);
    if(result.accepted)setSimulation(result.state);
    confirmTurnRevision.current=null;
    setConfirmTurn(false);setSelectedPeople([]);setCommandLayer(null);
  }
  function removeReservedWarOrder(orderId:string) {
    const live=planetSession.getSnapshot();
    if(suspended||!pageActivitySnapshotV94()||!live.loaded||live.pendingWrites>0||live.staleWar){
      setMessage(live.staleWar ? WAR_TURN_GATE_MESSAGES_V143.conflict
        : "Une archive est en cours d'enregistrement ou le front est inactif : aucun ordre retiré.");
      return;
    }
    if(!live.simulation.orders.some(order=>order.id===orderId)){
      setMessage("Cet ordre a déjà changé ; relisez les réservations avant de le retirer.");
      return;
    }
    setSimulation(cancelWarOrderV85(live.simulation,orderId));
    confirmTurnRevision.current=null;setConfirmTurn(false);
  }
  function inspectWarProofV145(){
    if(suspended||!pageActivitySnapshotV94()||!loaded||planet.id!=="korthas"){
      setMessage("Le registre documentaire V145 n'est accessible que sur Korthas, pendant un exercice actif.");return;
    }
    try{
      const raw=window.localStorage.getItem(WAR_OPERATIONS_STORAGE_V115);
      if(!raw){setWarProofSource(null);setMessage("Aucune archive libre V115 enregistrée dans ce navigateur.");return;}
      const review=reviewWarProofSyncV145(raw,simulation,DEFAULT_WAR_RULES_V6);
      setWarProofSource(raw);
      setMessage(review.reason??("Dossiers V115 vérifiés : "+review.eligible.length+
        " proposition(s), "+review.rejectedIds.length+" invalide(s) ; import volontaire uniquement."));
    }catch{
      setWarProofSource(null);
      setMessage("Accès à l'archive locale V115 impossible : aucune sauvegarde modifiée.");
    }
  }
  function archiveWarProofV145(receiptKey:string){
    const live=planetSession.getSnapshot();
    if(!warProofSource||suspended||!pageActivitySnapshotV94()||
       planet.id!=="korthas"||!live.loaded||!live.writableWar||
       live.pendingWrites>0){
      setMessage("Archive V85 en cours d'écriture, indisponible ou planète incorrecte. Aucun reçu transféré.");return;
    }
    const review=reviewWarProofSyncV145(warProofSource,live.simulation,DEFAULT_WAR_RULES_V6);
    const offer=review.eligible.find(x=>x.receiptKey===receiptKey&&!x.alreadyImported);
    if(!offer){setMessage("Preuve introuvable ou déjà enregistrée. Aucun doublon.");return;}
    // Guard against the source archive changing after the preview was opened.
    try{
      if(window.localStorage.getItem(WAR_OPERATIONS_STORAGE_V115)!==warProofSource){
        setWarProofSource(null);setMessage("Les missions V115 ont changé depuis la lecture. Réinspectez les preuves.");return;
      }
    }catch{setMessage("Sauvegarde source inaccessible ; enregistrement refusé.");return;}
    if(!window.confirm("Archiver la preuve "+receiptKey+" dans le journal local V85 ? "+
      "Ceci n'accorde AUCUN territoire, personnage, XP, soin ou ressource."))return;
    const latest=planetSession.getSnapshot();
    if(!latest.loaded||!latest.writableWar||latest.pendingWrites>0||
       latest.simulation.revision!==live.simulation.revision){
      setMessage("Le front V85 a changé pendant la confirmation. Réinspectez la preuve.");return;
    }
    try{
      if(window.localStorage.getItem(WAR_OPERATIONS_STORAGE_V115)!==warProofSource){
        setWarProofSource(null);setMessage("Source modifiée pendant la confirmation ; annulation sans écriture.");return;
      }
    }catch{setMessage("Source locale devenue inaccessible ; aucun transfert.");return;}
    const result=importWarProofV145(latest.simulation,warProofSource,receiptKey,
      latest.simulation.revision,DEFAULT_WAR_RULES_V6);
    setMessage(result.message);
    if(result.accepted){
      setSimulation(result.state);
      setWarProofSource(null);
    }
  }
  function restartWar() {
    if (strategic.staleWar) {setMessage(WAR_TURN_GATE_MESSAGES_V143.conflict);return;}
    if (!window.confirm(`Recommencer le front de ${planet.name} et remplacer uniquement son archive locale ? Les autres planètes seront conservées.`)) return;
    setSimulation(createWarSimulationV85(undefined, planet.id)); planetSession.unlockWarAfterExplicitReset(); setTerritoryId(null); setTargetId(null); setOrderKind(null); setConfirmTurn(false); setSelectedPeople([]); setCargoS(0); setCargoM(0); setMessage(`Nouveau front de ${planet.name} ouvert.`);
  }
  function issueTactical() {
    if (!formation) return;
    const result = orderCanyonFormationV85(canyon, formation.id, tacticalOrder, tacticalX, tacticalLevel);
    setCanyon(result.state); setMessage(result.message);
  }

  const commandStatus = <p className={message ? styles.status : styles.emptyCommandStatus} role="status" aria-live="polite">{message}</p>;

  if (!loaded) return <section className={styles.panel} aria-labelledby="clan-war-loading-title" data-clan-war-v85="loading" inert={suspended} ref={root}><h2 id="clan-war-loading-title">Archives des exercices</h2><p role="status">Vérification des archives et des écritures interrompues…</p><button type="button" onClick={onClose}>Retour</button></section>;

  return <section className={`${styles.panel} ${styles.commandShell} ${presentation === "gauntlet" ? gauntletStyles.holoPanel : ""}`} aria-labelledby="clan-war-v85-title" data-clan-war-v85="free-profile" data-war-campaign-write="none" data-war-presentation={presentation} inert={suspended} ref={root}>
    <header className={styles.commandHeader}>
      <div className={styles.commandIdentity}><span className={styles.commandSigil} aria-hidden="true">╱╲<br/>╲╱</span><div><p className={styles.eyebrow}>CONSEIL DE GUERRE · LIAISON DU CLAN</p><h2 id="clan-war-v85-title">Guerres de territoire</h2></div></div>
      <div className={styles.commandOperator}><strong>{save.profile.hunterName}</strong><span>{save.profile.rankId} · {persistedWar ? "Archive locale confirmée" : pendingWrites > 0 ? "Transmission…" : "Front en mémoire"}</span></div>
      <button type="button" className={styles.exitCommand} onClick={onClose}><span aria-hidden="true">↶</span> Quitter le conseil</button>
    </header>
    <div className={styles.commandLayout}>
      <nav className={styles.commandRail} aria-label="Échelles des guerres de clans">
        <p className={styles.railCaption}>COMMANDER</p>
        {([
          ["korthas", "Planètes · conquête", "Carte du front", "01"],
          ["bible", "Bible V6 · règles actuelles", "Mandats du clan", "02"],
          ["operations", "Opérations multi-modes V114", "Opérations", "03"],
        ] as const).map(([id, label, short, number]) => <button type="button" key={id} aria-label={label} aria-pressed={tab === id} data-command-section={id} onClick={() => navigateCommand(id)}><CommandMark kind={id}/><span><small>{number}</small>{short}</span></button>)}
        <div className={styles.railSecondary}>
          <button type="button" aria-expanded={commandLayer === "archives"} aria-pressed={["canyon", "composition", "dossier"].includes(tab)} data-command-open="archives" onClick={() => setCommandLayer("archives")}><CommandMark kind="archive"/><span>Archives du conseil<small>Exercices et anciennes fiches</small></span></button>
          <button type="button" aria-expanded={commandLayer === "settings"} data-command-open="settings" onClick={() => setCommandLayer("settings")}><span className={styles.railSettingIcon} aria-hidden="true">◈</span><span>Projection<small>Gauntlet et affichage</small></span></button>
          <button type="button" aria-expanded={commandLayer === "help"} data-command-open="help" onClick={() => setCommandLayer("help")}><span className={styles.railSettingIcon} aria-hidden="true">?</span><span>Doctrine<small>Règles et objectifs</small></span></button>
        </div>
        <div className={styles.railSignal}><i aria-hidden="true"/><span>FRONT LOCAL<br/><small>Campagne indépendante</small></span></div>
      </nav>
      <div className={styles.commandViewport} data-command-viewport>
      {["canyon", "composition", "dossier"].includes(tab) && <div className={styles.archiveBanner}><span>ARCHIVES TACTIQUES · V3</span><button type="button" onClick={() => navigateCommand("korthas")}>Revenir au front</button></div>}
    {tab !== "korthas" && commandStatus}
    {storageMessage && <p className={styles.storage} role="status">{storageMessage}</p>}
    {strategic.staleWar && <p className={styles.warning} role="alert" data-testid="clan-war-foreign-tab-conflict-v144">
      Front modifié dans un autre onglet : les commandes de ce front sont verrouillées pour éviter d&apos;écraser l&apos;archive. Fermez et rouvrez cet écran pour relire la version enregistrée.
    </p>}
    {gauntletStorageWarning && <p className={styles.storage} role="status">{gauntletStorageWarning}</p>}
    {pendingWrites > 0 && <p className={styles.storage} role="status">Enregistrement des exercices en cours…</p>}
    {canRetryPersistence && <button type="button" disabled={pendingWrites > 0} onClick={() => { sessionStore.retryPersistence(); if (planetSession !== sessionStore) planetSession.retryPersistence(); }}>Réessayer la sauvegarde des exercices</button>}
    <div hidden={tab !== "bible"}><ClanWarBibleV6Panel active={tab === "bible" && !suspended && pageActive && commandLayer === null} gauntletId={equippedGauntletId} holographic={presentation==="gauntlet"}/></div>
    {tab === "operations" && <ClanWarMissionsV114 key={planet.id} simulation={simulation} planetName={planet.name} active={!suspended && pageActive && commandLayer === null && pendingWrites === 0 && strategic.writableWar} onPrepareSite={(from, to, kind) => { setTab("korthas"); prepareSite(from, to, kind); }}/>}

    {tab === "composition" && <div>
      <div className={styles.sectionHeader}><div><h3>Formations et limites de composition</h3><p>Le commandement compte aussi les réserves et les groupes en transit.</p></div><button type="button" onClick={() => { setSelection({ ...CANYON_PRESET_V85 }); setMessage("Effectif d’exemple du classeur : 12 commandement, 112 matériaux et 60 énergie."); }}>Effectif du classeur</button></div>
      <div className={styles.metrics}><p>Commandement <strong>{composition.used.command}/{composition.limits.command}</strong></p><p>Matériaux tactiques <strong>{composition.used.materials}/{composition.limits.materials}</strong></p><p>Énergie tactique <strong>{composition.used.energy}/{composition.limits.energy}</strong></p></div>
      <p className={composition.allowed ? styles.positive : styles.warning}>{composition.allowed ? "Manifeste de composition admissible." : "Ajustez les quantités pour respecter les trois limites."} Ces points de composition ne deviennent pas des lots S/M/I.</p>
      <div className={styles.units}>{WAR_UNITS_V85.map(unit => <article key={unit.id} className={styles.unit} data-war-unit={unit.id}><p className={styles.eyebrow}>{unit.id} · {unit.category}</p><h4>{unit.name}</h4>{artRoles[unit.id] && <WarArt role={artRoles[unit.id]}/>}<p>{unit.role}</p><p className={styles.cost}>C{unit.command} · M{unit.materials} · E{unit.energy}</p><label>Formations<input type="number" min={0} max={12} step={1} value={selection[unit.id] ?? 0} onChange={event => setSelection(current => ({ ...current, [unit.id]: Math.max(0, Math.min(12, Math.floor(Number(event.target.value) || 0))) }))} /></label><details><summary>Personnes, terrain et contres</summary><p>{unit.formation}</p><p><strong>Équipement :</strong> {unit.equipment}</p><p><strong>Comportement :</strong> {unit.behavior}</p><p><strong>Contre :</strong> {unit.counter}</p><p><strong>Faiblesse :</strong> {unit.weakness}</p><p><strong>Portée :</strong> {unit.range}</p><p>{unit.terrain}</p><p>{unit.evolution}</p></details></article>)}</div>
      <button type="button" onClick={() => setTab("canyon")}>Préparer ce détachement au canyon</button>
    </div>}

    {tab === "canyon" && <div>
      {running && !pageActive && <p role="status">Temps tactique suspendu hors de la fenêtre de jeu.</p>}
      <div className={styles.sectionHeader}><div><h3>Canyon des Deux Balises</h3><p>CON-T09 · territoire F03 · opération de convoyage sans annexion.</p></div><button type="button" onClick={() => { if (!window.confirm("Recommencer uniquement l’exercice libre du canyon ?")) return;
    setCanyon(createCanyonV85(`free-canyon-${Date.now()}`)); sessionStore.unlockCanyonAfterExplicitReset(); setRunning(false); setSelectedFormation(""); setMessage("Reconnaissance du canyon recommencée."); }}>Nouvel exercice</button></div>
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
      <div className={styles.frontHeading}>
        <div><p className={styles.eyebrow}>THÉÂTRE ACTIF · CYCLE {String(simulation.turn).padStart(2, "0")}</p><h3>{planet.name}</h3><p>{planet.subtitle}</p></div>
        <button type="button" className={styles.changeTheater} data-command-open="worlds" aria-expanded={commandLayer === "worlds"} onClick={() => setCommandLayer("worlds")}><span aria-hidden="true">◎</span> Changer de théâtre <small>30 mondes et découvertes</small></button>
      </div>
      <div className={styles.metrics}><p>Stock consolidé <span className={styles.stockReadout}><span>S<strong>{budget.s}</strong></span><span>M<strong>{budget.m}</strong></span><span>I<strong>{budget.i}</strong></span></span></p><p>Contrôle <strong>{controlled.length}/{definitions.length}</strong></p><p>Aptes <strong>{warFitCombatantsV85(simulation).length}</strong></p><p>Entretien prévu <strong>S{warUpkeepV85(simulation)}</strong></p></div>
      {simulation.completedObjectives.includes("CON-O01") && <p className={styles.positive} role="status">{planet.name} maîtrisée · domination confirmée après deux fins de tour. {persistedWar ? "Victoire archivée sur cet appareil." : "Victoire en mémoire · sauvegarde à confirmer."}</p>}
      <ClanWarGauntletV131 compactCommand view={presentation} planetName={planet.name} turn={simulation.turn}
        departure={territory.name} destination={warTerritoryForSimulationV96(simulation, targetId)?.name ?? targetId}
        controlled={controlled.length} territories={definitions.length} queuedOrders={simulation.orders.length}
        persisted={persistedWar} pending={pendingWrites > 0}
        gauntletId={effectiveGauntlet?.id??DEFAULT_GAUNTLET_ID_V132}
        readoutLabel={GAUNTLET_READOUT_LABELS_V132[gauntletReadout]}
        readoutValue={gauntletReadoutValue}>
        <ClanWarAtlasV95 compactCommand key={`atlas:${planet.id}`} simulation={simulation} selectedTerritoryId={territoryId} targetTerritoryId={targetId} onSelectTerritory={selectTerritory} onSelectTarget={selectTarget}/>
      </ClanWarGauntletV131>
      {commandStatus}
      <div className={styles.frontActionBar}>
        <div className={styles.contextTarget}><span>POINT D&apos;APPUI SÉLECTIONNÉ</span><strong>{territory.name}</strong><small>{WAR_FACTIONS_V85[simulation.territories[territoryId].controller]}</small></div>
        <div className={styles.contextActions}>
          <button type="button" data-command-open="territory" onClick={() => setCommandLayer("territory")}>Commander ce site <span aria-hidden="true">{">"}</span></button>
          <button type="button" data-command-open="orders" onClick={() => setCommandLayer("orders")}>Ordres réservés <strong>{simulation.orders.length}</strong></button>
        </div>
        <button type="button" data-testid="war-end-turn-review-v143" disabled={suspended || !pageActive || !loaded || strategic.pendingWrites > 0 || strategic.staleWar} onClick={requestWarTurnReview}><span aria-hidden="true">◇</span> Fin de préparation · relire avant résolution</button>
      </div>
      <nav className={styles.frontUtilities} aria-label="Dossiers du front">
        <button type="button" data-command-open="forces" onClick={() => setCommandLayer("forces")}>Forces et garnisons</button>
        <button type="button" data-command-open="convoy" onClick={() => setCommandLayer("convoy")}>Convois et routes</button>
        <button type="button" data-command-open="journal" onClick={() => setCommandLayer("journal")}>Journal et mémorial</button>
        {planet.id === "korthas" && <button type="button" data-command-open="sources" onClick={() => setCommandLayer("sources")}>Sources des missions</button>}
      </nav>
      <ClanWarCommandOverlay open={commandLayer === "worlds"} onClose={closeCommandLayer} title="Théâtres planétaires" eyebrow="CARTOGRAPHIE DU CONSEIL">
      <ClanWarPlanetsV96 planet={planet} turn={simulation.turn} persisted={persistedWar} pending={pendingWrites > 0} retainedPlanetIds={retainedPlanetIds} onSelect={selectPlanet}/>
      </ClanWarCommandOverlay>
      <ClanWarCommandOverlay open={commandLayer === "territory"} onClose={closeCommandLayer} title={territory.name} eyebrow="ORDRES DU TERRITOIRE">
      {commandStatus}
        <aside className={styles.orderPanel} aria-label="Commandement du territoire" data-testid="war-order-panel-v98"><p className={styles.eyebrow}>{territory.id} · {territory.region}</p><h4>{territory.name}</h4><p>{WAR_FACTIONS_V85[simulation.territories[territoryId].controller]}</p>{simulation.territories[territoryId].controller === "CON-F01" && <><p>Stock sur place <Budget {...simulation.stocks[territoryId]}/></p><p>{warGarrisonV85(simulation, territoryId).length} garde(s) · {supplied.has(territoryId) ? "liaison ouverte" : "liaison absente"}.</p></>}<p>{territory.terrain}</p>
          {simulation.territories[territoryId].controller === "CON-F01" ? <div>
            <ClanWarGarrisonV99 key={`garrison:${planet.id}:${territoryId}`} simulation={simulation} territoryId={territoryId} disabled={suspended || !pageActive || pendingWrites > 0 || strategic.staleWar} onChange={changeGarrison}/>
            <label>Ordre<select data-war-order-kind-v98 value={orderKind} onChange={event => { setOrderKind(event.target.value as WarOrderKindV85); setSelectedPeople([]); setConfirmTurn(false); }}>{Object.entries(orderLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
            {orderKind !== "heal" && <label>Route voisine<select value={targetId} onChange={event => selectTarget(event.target.value)}>{territory.neighbors.map(id => <option value={id} key={id}>{id.replace("CON-", "")} · {warTerritoryForSimulationV96(simulation, id)?.name}</option>)}</select></label>}
            <fieldset><legend>Personnes au départ · huit maximum</legend><div className={styles.actions}><button type="button" onClick={() => { setSelectedPeople(orderKind === "evacuate" ? warEvacuationSelectionV100(simulation, territoryId) : candidates.filter(actor => !reservedPeople.has(actor.id) && (orderKind === "heal" || !actor.garrison)).slice(0, 8).map(actor => actor.id)); setConfirmTurn(false); }}>{orderKind === "evacuate" ? "Préparer une évacuation sans dégarnir" : orderKind === "heal" ? "Sélectionner les blessés" : "Sélectionner les mobiles"}</button><button type="button" disabled={selectedPeople.length === 0} onClick={() => { setSelectedPeople([]); setConfirmTurn(false); }}>Tout effacer</button></div>{candidates.map(actor => <label className={styles.person} key={actor.id}><input type="checkbox" disabled={reservedPeople.has(actor.id) || selectedPeople.length >= 8 && !selectedPeople.includes(actor.id)} checked={selectedPeople.includes(actor.id)} onChange={event => { setSelectedPeople(current => event.target.checked ? current.length < 8 ? [...current, actor.id] : current : current.filter(id => id !== actor.id)); setConfirmTurn(false); }}/><span>{actor.id} · {warUnitV85(actor.unitTypeId)?.name} · {actor.status === "wounded" ? "blessé · patient" : orderKind === "evacuate" ? `apte · escorte${actor.garrison ? " · garde" : ""}` : actor.garrison ? "garde" : "mobile"}{reservedPeople.has(actor.id) ? " · déjà affecté à un ordre" : ""}<small>{actor.xp} XP · {warVeterancyV85(actor.xp).label}</small></span></label>)}{candidates.length === 0 && <p>Aucune personne disponible pour cet ordre.</p>}</fieldset>
            {orderKind === "evacuate" && <ClanWarEvacuationV100 simulation={simulation} draft={draft}/>}
            {orderKind === "logistics" && <div className={styles.controlGrid}><label>Lots S<input type="number" min={0} max={1000} value={cargoS} onChange={event => setCargoS(Math.max(0, Math.min(1000, Math.floor(Number(event.target.value) || 0))))}/></label><label>Lots M<input type="number" min={0} max={1000} value={cargoM} onChange={event => setCargoM(Math.max(0, Math.min(1000, Math.floor(Number(event.target.value) || 0))))}/></label></div>}
            <p>Réservation locale <Budget {...selectedCost}/></p><ClanWarOrderPreviewV98 simulation={simulation} draft={draft}/>{orderKind === "attack" ? <ClanWarAssaultV106 key={planet.id} simulation={simulation} draft={draft} disabled={pendingWrites > 0 || suspended || !pageActive || strategic.staleWar} onReserve={plan => queue(false, plan)} onRecon={() => prepareSite(territoryId, targetId, "recon")}/> : <button type="button" data-war-reserve-order-v100 disabled={!!orderIssue || pendingWrites > 0 || suspended || !pageActive || strategic.staleWar} onClick={() => queue()}>Réserver l’ordre</button>}
            {orderKind === "evacuate" && evacuationConfirmation === evacuationConfirmationKey && <div className={styles.confirm} role="group" aria-label="Confirmer une évacuation sans garde" data-testid="war-evacuation-warning-v100"><p>Cette évacuation engage le dernier garde apte du départ. Si le déplacement aboutit, le site reste contrôlé mais perd sa production jusqu’à une nouvelle garde. Réserver n’avance pas le tour.</p><div className={styles.actions}><button type="button" disabled={pendingWrites > 0 || suspended || !pageActive} onClick={() => queue(true)}>Confirmer l’évacuation sans garde</button><button type="button" onClick={() => { setEvacuationConfirmation(null); setMessage("Évacuation non réservée ; les personnes conservent leurs affectations."); restoreOrderFocus(); }}>Conserver la garde</button></div></div>}
          </div> : <p>{warAtlasIntelV95(simulation, territoryId).label}. Envoyez une reconnaissance depuis un territoire voisin pour actualiser le renseignement.</p>}
          <details><summary>Sites, capture et risques</summary><p>{territory.sites}</p><p>{territory.capture}</p><p>{territory.effect}</p><p>{territory.risk}</p></details>
        </aside>
      </ClanWarCommandOverlay>
      <ClanWarCommandOverlay open={commandLayer === "orders"} onClose={closeCommandLayer} title="Ordres et clôture du cycle" eyebrow={`CYCLE ${simulation.turn} · ARCHIVE DU FRONT`} kind="dialog">
      {commandStatus}
      <div className={styles.orderQueue}><h4>Ordres réservés</h4><p>Deux opérationnels, un logistique et un diplomatique par tour. Le mode de résolution de cet exercice est automatique.</p>{simulation.orders.length === 0 && <p>Aucun ordre. Passer un tour fera agir les Forges et paiera l’entretien.</p>}{simulation.orders.map(order => <div key={order.id}><span>{orderLabels[order.kind]} · {order.fromId.replace("CON-", "")} → {order.targetId.replace("CON-", "")} · {order.combatantIds.join(", ") || "mandat local"}</span><button type="button" disabled={suspended || !pageActive || strategic.pendingWrites > 0 || strategic.staleWar} onClick={() => removeReservedWarOrder(order.id)}>Retirer</button></div>)}</div>
        {confirmTurn ? <div className={styles.confirm} data-testid="war-turn-confirmation-v143"><p>Les ordres seront scellés, les détachements adverses agiront avec leurs effectifs présents et l’entretien sera prélevé. Les revenus du prochain tour dépendront des sites encore reliés.</p><div className={styles.actions}><button type="button" data-testid="war-end-turn-commit-v143" disabled={suspended || !pageActive || !loaded || strategic.pendingWrites > 0 || strategic.staleWar} onClick={resolveReviewedWarTurn}>Confirmer et résoudre le tour</button><button type="button" onClick={() => {confirmTurnRevision.current=null;setConfirmTurn(false);setCommandLayer("territory");}}>Revenir aux ordres</button></div></div> : <p>Relisez les réservations, puis revenez au front pour demander la fin de préparation.</p>}
      </ClanWarCommandOverlay>
      <ClanWarCommandOverlay open={commandLayer === "forces"} onClose={closeCommandLayer} title="Forces et garnisons" eyebrow="DÉTACHEMENTS PRÉSENTS">
      {commandStatus}
      <ClanWarCommandV98 key={`command:${planet.id}`} simulation={simulation} selectedTerritoryId={territoryId} onPrepare={prepareSite} onManageGarrison={manageGarrisonSite}/>
      </ClanWarCommandOverlay>
      <ClanWarCommandOverlay open={commandLayer === "convoy"} onClose={closeCommandLayer} title="Convois et routes" eyebrow="RAVITAILLEMENT DU FRONT">
      {commandStatus}
      <ClanWarConvoyRouteV105 key={`convoy:${planet.id}`} simulation={simulation} fromId={territoryId} disabled={suspended || !pageActive || !loaded || !strategic.writableWar || pendingWrites > 0} onUpdate={updateConvoy} onInspect={selectTerritory}/>
      </ClanWarCommandOverlay>
      <ClanWarCommandOverlay open={commandLayer === "journal"} onClose={closeCommandLayer} title="Journal et mémorial" eyebrow="REGISTRE DU CLAN">
      <details className={styles.roster}><summary>Registre individuel · aptes, blessés et mémorial</summary><div className={styles.scrollTable}><table><thead><tr><th>Personne</th><th>Lieu</th><th>État</th><th>Affectation</th><th>XP</th><th>Vétérance</th></tr></thead><tbody>{simulation.combatants.filter(actor => actor.factionId === "CON-F01").map(actor => <tr key={actor.id}><th>{actor.id}</th><td>{actor.territoryId.replace("CON-", "")}</td><td>{actor.status === "fit" ? "Apte" : actor.status === "wounded" ? "Blessé" : "Mort"}{actor.trainingUntilTurn !== null ? ` · soins jusqu’au tour ${actor.trainingUntilTurn}` : ""}</td><td>{actor.garrison ? "Garnison" : "Détachement"}</td><td>{actor.xp}</td><td>{warVeterancyV85(actor.xp).label}</td></tr>)}</tbody></table></div></details>
      <ol className={styles.log} aria-label="Journal stratégique">{simulation.reports.slice(-12).map(item => <li key={item.id}><strong>Tour {item.turn}</strong> · {item.text}</li>)}</ol>
      </ClanWarCommandOverlay>
    </div>}

    {tab === "dossier" && <div>
      <h3>{CLAN_WAR_ENTRIES_V85.length} fiches · {CLAN_WAR_SECTIONS_V85.length} feuilles de règles</h3><p>Trois échelles, 15 sociétés, 30 formations, 36 territoires, 12 cartes RTS, diplomatie, technologies, variantes des six voies et suites de guerre.</p>
      <div className={styles.controlGrid}><label>Rechercher<input type="search" maxLength={120} value={query} onChange={event => { setQuery(event.target.value); setPage(0); }} placeholder="CL2, canyon, Blooded, corridor…"/></label><label>Feuille<select value={section} onChange={event => { setSection(event.target.value); setPage(0); }}><option>Toutes les feuilles</option>{CLAN_WAR_SECTIONS_V85.map(name => <option key={name}>{name}</option>)}</select></label></div>
      <p>{filtered.length} fiche(s) trouvée(s). Les créations du projet gardent leur statut original ; elles ne définissent pas une organisation universelle de la franchise.</p>
      <div className={styles.library}><div className={styles.entryList}>{displayedEntries.map(entry => <button type="button" key={`${entry.sheet}-${entry.id}`} aria-pressed={entry.id === selectedEntryId} onClick={() => setSelectedEntryId(entry.id)}><small>{entry.id} · {entry.sheet}</small><strong>{entry.title}</strong></button>)}<div className={styles.actions}><button type="button" disabled={page === 0} onClick={() => setPage(current => current - 1)}>Précédent</button><span>{page + 1}/{Math.max(1, Math.ceil(filtered.length / 24))}</span><button type="button" disabled={(page + 1) * 24 >= filtered.length} onClick={() => setPage(current => current + 1)}>Suivant</button></div></div><div>{currentEntry ? <Entry entry={currentEntry}/> : <p>Choisir une fiche.</p>}</div></div>
      <p className={styles.source}>Source : {CLAN_WAR_WORKBOOK_V85.workbook} · conception du 6 octobre 2026. Les fiches complètes sont conservées avec leurs cellules. Le classeur indique une extension autonome et l’absence de la V2 exacte.</p>
    </div>}
      </div>
    </div>
    <ClanWarCommandOverlay open={commandLayer === "archives"} onClose={closeCommandLayer} title="Archives du conseil" eyebrow="EXERCICES TACTIQUES ANTÉRIEURS">
      <p className={styles.drawerLead}>Les anciennes doctrines restent consultables et jouables dans leurs exercices propres. Elles ne remplacent pas les mandats actuels.</p>
      <nav className={styles.archiveChoices} aria-label="Exercices et fiches V3">
        {([["canyon", "Exercice V3 · canyon", "Canyon des Deux Balises", "Reconnaissance, convoi et extraction."], ["composition", "Exercice V3 · formations", "Formations", "Effectifs, équipement et limites de composition."], ["dossier", "Archive V3 · fiches et clans", "Fiches et clans", "Dossiers et règles historiques du conseil."]] as const).map(([id, label, title, text]) => <button type="button" key={id} aria-label={label} aria-pressed={tab === id} onClick={() => navigateCommand(id)}><CommandMark kind="archive"/><span><strong>{title}</strong><small>{text}</small></span><span aria-hidden="true">{">"}</span></button>)}
      </nav>
    </ClanWarCommandOverlay>
    <ClanWarCommandOverlay open={commandLayer === "settings"} onClose={closeCommandLayer} title="Projection du commandement" eyebrow="GAUNTLET ET AFFICHAGE">
      {commandStatus}
    <div className={gauntletStyles.switchRow} data-testid="clan-war-view-switch-v131">
      <div className={gauntletStyles.switchCopy}>
        <strong>Présentation du commandement</strong>
        <small>Deux vues du même front · aucun ordre ni état de campagne réinitialisé.</small>
      </div>
      <div className={gauntletStyles.switchActions} role="group" aria-label="Changer la vue stratégique">
        <button type="button" aria-pressed={presentation === "gauntlet"} onClick={() => choosePresentation("gauntlet")}>Gauntlet holographique</button>
        <button type="button" aria-pressed={presentation === "classic"} onClick={() => choosePresentation("classic")}>Vue stratégique classique</button>
      </div>
    </div>
      <ClanWarGauntletLockerV132 hunterRank={save.profile.rankId} equippedId={effectiveGauntlet?.id??DEFAULT_GAUNTLET_ID_V132} onEquip={equipGauntlet}
        claimedStudies={save.gauntletV134?.claimedStudies??[]} campaignEvidence={save}
        onClaimStudy={onClaimGauntletStudy} disabled={suspended||!pageActive}/>
      <button type="button" className={styles.resetFront} onClick={restartWar}>Nouvel exercice sur {planet.name}</button>
    </ClanWarCommandOverlay>
    <ClanWarCommandOverlay open={commandLayer === "help"} onClose={closeCommandLayer} title="Doctrine du conseil" eyebrow="PRÉPARER · RECONNAÎTRE · TENIR">
    <div className={styles.notice}><strong>Fronts libres · archives locales indépendantes</strong><p>Chaque planète et le canyon possèdent leurs propres unités et archives sur cet appareil. Votre chasse conserve son matériel, ses rites et ses personnes.</p><p>{save.profile.hunterName} · rang {save.profile.rankId}. Ces exercices de conquête restent séparés du voyage et des récompenses de la campagne.</p></div>
      <div className={styles.objectives}><p>Région tenue : <strong>{Math.min(2, simulation.regionStability)}/2</strong> fins de tour.</p><p>Corridor des Haltes : <strong>{Math.min(2, simulation.corridorStability)}/2</strong>.</p><p>Contrôle total : <strong>{Math.min(2, simulation.totalStability)}/2</strong>.</p></div>
      <p>Domination : contrôlez les {definitions.length} sites intacts et ravitaillés, avec au moins une garnison apte dans chacune des {planet.regions.length} régions, pendant deux fins de tour avec entretien payé.</p>
      <details><summary>Conditions de la région et du corridor</summary><p>Pour tenir une région, chaque territoire de cette région doit rester intact, ravitaillé et occupé par une garnison apte pendant deux fins de tour avec entretien payé.</p><p>Sites du corridor à contrôler et garnir : {corridorIds.map(id => id.replace("CON-", "")).join(" · ")}. Maintenez leurs liaisons de ravitaillement et au moins un droit de transit actif auprès des Passes autonomes pendant deux fins de tour avec entretien payé.{planet.id === "korthas" ? " T02 doit également rester relié au ravitaillement." : ""}</p></details>
        <aside className={styles.frontGuide} aria-label="Préparer le tour"><p className={styles.eyebrow}>COMMANDER LE FRONT</p><h4>Reconnaître, engager, tenir</h4><ol><li>Sélectionnez un territoire des Haltes comme départ, puis une destination reliée par une route.</li><li>Choisissez l’ordre et jusqu’à huit personnes présentes. Les réservations utilisent le stock local.</li><li>Relisez les ordres et confirmez le tour : les Forges agissent aussi, les positions et les couleurs évoluent.</li></ol><p>Les Passes autonomes se négocient. Un droit de transit donne accès à leurs routes sans en changer le drapeau.</p><p>Conservez une garnison et une liaison de ravitaillement pour que vos sites produisent. Les personnes gardent leurs blessures et leur expérience.</p><p className={persistedWar ? styles.positive : styles.storage} role="status">{persistedWar ? `Le front de ${planet.name} est archivé sur cet appareil. Changer de planète conserve cette partie.` : pendingWrites > 0 ? `Enregistrement du front de ${planet.name} en cours…` : `Le front de ${planet.name} est conservé en mémoire. La sauvegarde sur cet appareil reste à confirmer.`}</p></aside>
      <details><summary>Règles de cet exercice stratégique</summary><p>{modularStrategy ? `Ce front V103 comporte ${definitions.length} territoires et ${planet.regions.length} régions. Ses deux forces commencent dans des poches contiguës, chacune avec une base et des sites S/M/I. Les effectifs initiaux couvrent la plus grande région ou le corridor avec une réserve mobile ; les stocks sont dimensionnés pour ce format. La domination exige une garnison apte par région et la liaison à votre base ${modularStrategy.headquarters["CON-F01"].replace("CON-", "")}. L’entretien et les plafonds d’XP suivent les règles communes.` : "Les ressources, effectifs Pxx de départ, entretien et plafonds d’XP reprennent l’exercice de Korthas. Pour rendre la domination possible avec ses 24 personnes, les fronts historiques et V102 utilisent une garnison apte par région : cette adaptation de l’exercice ne modifie pas la fiche source du classeur."} Les autres planètes sont des théâtres du projet avec leurs propres terres, noms et routes. Le modèle automatique compare les effectifs présents à une résistance de même effectif, avec une variation déterministe de 0 ou 1. Il produit des blessures, un éventuel décès et un repli sans recréer les personnes.</p><p>La répartition initiale des stocks, le prix de transit I1, sa durée de deux tours, les soins légers S1 et les cessions au-delà de T07 sont des choix de cet exercice. Une cession y est toujours acceptée après paiement et affectation d’un garde. Les contre-offensives emploient des colonnes réelles ; ce modèle n’est pas encore la diplomatie narrative complète du projet.</p></details>
    </ClanWarCommandOverlay>
    {tab === "korthas" && planet.id==="korthas"&&<ClanWarCommandOverlay open={commandLayer === "sources"} onClose={closeCommandLayer} title="Conseil des sources" eyebrow="PROVENANCE DES MANDATS"><section aria-label="Conseil des sources V152" className={styles.sectionHeader}>
      {commandStatus}
      <div>
        <h3>Conseil V152 · provenance des quatre modes</h3>
        <p>Comparer les territoires W3 et V85, les effectifs et les preuves des missions.
         Inspection volontaire et lecture seule : ni capture, ni XP, ni sauvegarde modifiée.</p>
        <button type="button" disabled={!loaded||pendingWrites>0} onClick={()=>{
          try{
            const raw=window.localStorage.getItem(WAR_OPERATIONS_STORAGE_V115);
            evidenceRawRefV152.current=raw;
            setEvidenceRawV152(raw);
            setEvidenceStaleV152(false);
            setMessage(raw?
              "Instantané local V115 lu pour un audit documentaire. Cette analyse n'authentifie pas une partie serveur.":
              "Aucune archive de missions V115 enregistrée dans ce navigateur.");
          }catch{
            evidenceRawRefV152.current=null;
            setEvidenceRawV152(null);
            setEvidenceStaleV152(false);
            setMessage("Accès à l'archive V115 impossible : aucune donnée V85 modifiée.");
          }
        }}>Examiner les sources V115 · lecture seule</button>
        {evidenceStaleV152&&<p role="status">Le bilan V115 peut être périmé. Examinez à nouveau les sources pour l’actualiser.</p>}
        {evidenceV152&&!evidenceStaleV152&&<details>
          <summary>Contrôles de provenance V152 · {evidenceV152.dossiers.length} bilans</summary>
          <p role="status">{evidenceV152.message}</p>
          <p>Territoires V6 examinés : {evidenceV152.territoryChecks.length}.
           Sans ID V85 identique : {evidenceV152.territoryChecks.filter(t=>t.status==="no-id-match").length}.
           Attention : même un ID et nom semblables ne prouvent pas la géographie.</p>
          <p>Équipes V115 : {evidenceV152.roster.v115Teams} · membres V115 :
           {evidenceV152.roster.v115Members} · combattants V85 :
           {evidenceV152.roster.v85Combatants}. Personnages appariés officiellement : 0.</p>
          <p>Rapports par mode — assaut {evidenceV152.dossierCounts.assault},
           Outer Ops {evidenceV152.dossierCounts.outer},
           infiltration {evidenceV152.dossierCounts.stealth},
           RTS {evidenceV152.dossierCounts.rts}.
           Transfert militaire autorisé : <strong>non</strong>.</p>
          {evidenceV152.issues.map((issue,i)=><p role="alert" key={i}>{issue}</p>)}
          <details><summary>Cartographie : lieux connus et liens non prouvés</summary>
            <ul>{evidenceV152.territoryChecks.map(t=><li key={t.sourceId}>
              {t.sourceId} · {t.sourceName} ({t.sourceRegion})
              {t.strategicId?" · ID semblable à vérifier : "+t.strategicId:
                " · aucune identité territoriale confirmée"}.
            </li>)}</ul>
          </details>
          <details><summary>Bilans du Conseil et éléments manquants</summary>
            <ul>{evidenceV152.dossiers.map(d=><li key={d.receiptId}>
              <strong>{d.mode} · {d.outcome} · {d.receiptId}</strong>
              · {d.sourceType}, lieu {d.sourceTargetId} · {d.blockerCodes.length}
              contraintes encore ouvertes. Authentification serveur : non.
            </li>)}</ul>
          </details>
        </details>}
      </div>
    </section>
      {planet.id==="korthas"&&<section className={styles.sectionHeader} aria-label="V145 · preuves des quatre modes">
        <div>
          <h3>Registre V145 · preuves des quatre game modes</h3>
          <p>Importer volontairement un reçu de l&apos;exercice V115 :
           assaut, Outer Ops, infiltration ou RTS. Seul un journal documentaire V85
           est ajouté. Aucune conquête, expérience ou ressource n&apos;est accordée.</p>
          <button type="button" onClick={inspectWarProofV145}
            disabled={suspended||!pageActive||!loaded||pendingWrites>0}>
            Vérifier les rapports locaux V115
          </button>
          {warProofPreview&&<div>
            {warProofPreview.reason&&<p role="status">{warProofPreview.reason}</p>}
            <p>{warProofPreview.sourceReportCount} rapport(s) source ;
             {warProofPreview.eligible.length} preuve(s) territoriales proposées,
             {warProofPreview.rejectedIds.length} non appariée(s) ou refusée(s).</p>
            {sourceAuditV146&&<details>
              <summary>Audit V146 · géographie, effectifs et preuves des quatre modes</summary>
              <p role="status">{sourceAuditV146.message}</p>
              <p>Territoires V6 : <strong>{sourceAuditV146.territories.length}</strong>
               · sans correspondance CON-T : <strong>{sourceAuditV146.territories.filter(t=>t.status==="unmapped").length}</strong>
               · même identifiant mais encore sans preuve géographique : <strong>{sourceAuditV146.territories.filter(t=>t.status!=="unmapped").length}</strong>.</p>
              <p>Équipes de source V115 : <strong>{sourceAuditV146.roster.sourceTeamCount}</strong>
               · membres de source : <strong>{sourceAuditV146.roster.sourcePersonCount}</strong>
               · soldats stratégiques V85 : <strong>{sourceAuditV146.roster.strategyCombatantCount}</strong>.
               Aucune identité commune n&apos;est homologuée.</p>
              <p>Import documentaire possible, mais transfert de conquête, blessure ou XP : <strong>interdit</strong> jusqu&apos;à validation d&apos;une correspondance explicite.</p>
              <ul>{(["assault","outer","stealth","rts"] as const).map(mode=>{
                const reports=sourceAuditV146.proofs.filter(proof=>proof.mode===mode);
                return <li key={mode}><strong>{mode}</strong> : {reports.length} rapport(s) d&apos;origine,
                  {reports.filter(p=>p.documentaryCanImport).length} dossier(s) encore archivable(s)
                  dans le journal V85, sans effet militaire.</li>;
              })}</ul>
              <details>
                <summary>Comparer les lieux V6 et les territoires V85</summary>
                <ul>{sourceAuditV146.territories.map(territory=><li key={territory.sourceId}>
                  {territory.sourceId} · {territory.sourceName} ({territory.sourceRegion}) :
                  {territory.destinationId?(" "+territory.destinationId+" · référence à vérifier"):" aucun lien territorial V85 prouvé"}
                </li>)}</ul>
              </details>
              <details>
                <summary>Empreintes locales des bilans (non cryptographiques)</summary>
                <ul>{sourceAuditV146.proofs.map(proof=><li key={proof.receiptKey}>
                  {proof.receiptKey} · {proof.mode} · {proof.outcome} · empreinte
                  <code> {proof.sourceFingerprint.slice(0,16)}</code> · territoire :
                  non apparié ; identité militaire : non appariée.
                </li>)}</ul>
              </details>
            </details>}
            {warProofPreview.eligible.slice(-30).map(item=><div key={item.receiptKey}>
              <span>{item.mode} · {item.outcome} · {item.territoryName}
               · {item.matchedV85TerritoryId??"sans correspondance territoriale V85"}
               · {item.teamIds.length} équipe(s)
               · {item.woundedCount} blessé(s) source</span>
              <button type="button" disabled={item.alreadyImported||suspended||!pageActive||
                !strategic.writableWar||pendingWrites>0}
                onClick={()=>archiveWarProofV145(item.receiptKey)}>
                {item.alreadyImported?"Déjà archivé":"Archiver uniquement la preuve"}
              </button>
            </div>)}
          </div>}
        </div>
      </section>}
    </ClanWarCommandOverlay>}
  </section>;
}
