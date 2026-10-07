"use client";

import { useEffect, useMemo, useState } from "react";
import type { SaveGame } from "./types";
import {
  CLAN_WAR_ENTRIES_V85, CLAN_WAR_SECTIONS_V85, CLAN_WAR_WORKBOOK_V85,
  WAR_FACTIONS_V85, WAR_TERRITORIES_V85, WAR_UNITS_V85,
  clanWarEntryV85, warCompositionV85, warTerritoryV85, warUnitV85,
  type ClanWarEntryV85,
} from "./systems/clanWarV85Data";
import {
  WAR_STORAGE_KEY_V85, advanceWarTurnV85, cancelWarOrderV85, createWarSimulationV85,
  queueWarOrderV85, readWarSimulationV85, warBudgetV85, warFitCombatantsV85,
  warGarrisonV85, warOrderCostV85, warSuppliedV85, warUpkeepV85, warVeterancyV85,
  type WarOrderKindV85, type WarSimulationV85,
} from "./systems/clanWarV85";
import {
  CANYON_POSTS_V85, CANYON_PRESET_V85, CANYON_STORAGE_KEY_V85, canyonCompositionIssueV85,
  canyonPreparationV85, canyonXpV85, commitCanyonV85, createCanyonV85, engageCanyonV85,
  orderCanyonFormationV85, readCanyonV85, stepCanyonV85, withdrawCanyonV85,
  type CanyonOrderKindV85, type CanyonSimulationV85,
} from "./systems/clanWarCanyonV85";
import styles from "./ClanWarPanelV85.module.css";
import ClanWarBibleV6Panel from "./ClanWarBibleV6Panel";
import { findImportedYautjaArtV85 } from "./systems/recentSpriteLibraryV85";

const fold = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const COMPOSITION_STORAGE_KEY_V85 = "yautja.clan-war.v85.composition.free.v1";
const orderLabels: Record<WarOrderKindV85, string> = { move: "Déplacer", attack: "Assaut F02", recon: "Reconnaissance", cession: "Cession négociée", transit: "Droit de transit", logistics: "Convoi terrestre", heal: "Soins légers" };
const tacticalLabels: Record<CanyonOrderKindV85, string> = { hold: "Tenir", move: "Déplacer", observe: "Observer", cover: "Couvrir", secure: "Rétablir l’accès", rescue: "Évacuer le porteur", adopt: "Adopter Lecture récente", extract: "Rejoindre l’extraction" };
function Budget({ s, m, i }: { s: number; m: number; i: number }) { return <span className={styles.budget}>S <strong>{s}</strong> · M <strong>{m}</strong> · I <strong>{i}</strong></span>; }
function WarArt({ clanName, role }: { clanName?: string; role?: string }) {
  const art = findImportedYautjaArtV85({ clanName, role });
  return art ? <figure className={styles.sourceArt} data-war-art={art.assetId}><img src={art.portraitUrl} alt={`${art.label} · référence originale statique`} loading="lazy" decoding="async"/><figcaption>{art.label} · référence statique du {clanName ? "clan" : "rôle"}</figcaption></figure> : null;
}
const artRoles: Record<string, string> = { "RTS-U01": "patrouille", "RTS-U02": "pisteur", "RTS-U03": "tireur", "RTS-U13": "sapeur", "RTS-U15": "soigneur", "RTS-U18": "porteur" };
function Entry({ entry }: { entry: ClanWarEntryV85 }) {
  return <article className={styles.entry} data-war-source-id={entry.id}>
    <p className={styles.eyebrow}>{entry.id} · {entry.sheet} · ligne {entry.row}</p><h3>{entry.title}</h3>
    {entry.sheet === "Clans et guerre" && <WarArt clanName={String(entry.title)}/>}
    <dl>{entry.fields.map(field => <div key={field.cell}><dt>{field.label}</dt><dd>{String(field.value)}</dd></div>)}</dl>
  </article>;
}

/** Autonomous exercises and source dossier. Main campaign progress is read only. */
export default function ClanWarPanelV85({ save, onClose }: { save: SaveGame; onClose: () => void }) {
  const [tab, setTab] = useState<"bible" | "canyon" | "composition" | "korthas" | "dossier">("bible");
  const [simulation, setSimulation] = useState<WarSimulationV85>(() => createWarSimulationV85());
  const [canyon, setCanyon] = useState<CanyonSimulationV85>(() => createCanyonV85());
  const [selection, setSelection] = useState<Record<string, number>>({ ...CANYON_PRESET_V85 });
  const [loaded, setLoaded] = useState(false);
  const [writableWar, setWritableWar] = useState(true), [writableCanyon, setWritableCanyon] = useState(true);
  const [writableComposition, setWritableComposition] = useState(true);
  const [storageMessage, setStorageMessage] = useState("");
  const [message, setMessage] = useState("Choisissez un exercice ou consultez les fiches du mandat.");
  const [query, setQuery] = useState(""), [section, setSection] = useState("Toutes les feuilles"), [page, setPage] = useState(0);
  const [selectedEntryId, setSelectedEntryId] = useState("OPS-01");
  const [territoryId, setTerritoryId] = useState("CON-T02"), [targetId, setTargetId] = useState("CON-T08");
  const [orderKind, setOrderKind] = useState<WarOrderKindV85>("attack");
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [cargoS, setCargoS] = useState(0), [cargoM, setCargoM] = useState(0);
  const [confirmTurn, setConfirmTurn] = useState(false);
  const [selectedFormation, setSelectedFormation] = useState("");
  const [tacticalOrder, setTacticalOrder] = useState<CanyonOrderKindV85>("move");
  const [tacticalX, setTacticalX] = useState(28), [tacticalLevel, setTacticalLevel] = useState<0 | 1>(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    try {
      const rawWar = window.localStorage.getItem(WAR_STORAGE_KEY_V85), rawCanyon = window.localStorage.getItem(CANYON_STORAGE_KEY_V85);
      if (rawWar !== null) {
        let parsed: WarSimulationV85 | null = null; try { parsed = readWarSimulationV85(JSON.parse(rawWar)); } catch { /* Preserve the unknown archive. */ }
        if (parsed) setSimulation(parsed); else { setWritableWar(false); setStorageMessage("L’archive de Korthas est incompatible ou illisible. Ses données sont conservées ; cet exercice reste temporaire."); }
      }
      if (rawCanyon !== null) {
        let parsed: CanyonSimulationV85 | null = null; try { parsed = readCanyonV85(JSON.parse(rawCanyon)); } catch { /* Preserve the unknown archive. */ }
        if (parsed) { setCanyon(parsed); setSelectedFormation(parsed.formations[0]?.id ?? ""); }
        else { setWritableCanyon(false); setStorageMessage("L’archive du canyon est incompatible ou illisible. Ses données sont conservées ; cet exercice reste temporaire."); }
      }
      const rawComposition = window.localStorage.getItem(COMPOSITION_STORAGE_KEY_V85);
      if (rawComposition !== null) {
        try {
          const parsed = JSON.parse(rawComposition) as { version?: unknown; context?: unknown; selection?: unknown };
          if (parsed.version !== 1 || parsed.context !== "free" || !parsed.selection || typeof parsed.selection !== "object" || Array.isArray(parsed.selection) || !Object.entries(parsed.selection).every(([id, quantity]) => warUnitV85(id) && typeof quantity === "number" && Number.isSafeInteger(quantity) && quantity >= 0 && quantity <= 12)) throw new Error("Incompatible free composition");
          setSelection(parsed.selection as Record<string, number>);
        } catch { setWritableComposition(false); setStorageMessage("La configuration de détachement est incompatible. Elle est conservée et le compositeur reste temporaire."); }
      }
    } catch { setWritableWar(false); setWritableCanyon(false); setWritableComposition(false); setStorageMessage("Le stockage local est indisponible. Les exercices restent utilisables pendant cette visite."); }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded || !writableWar) return;
    try { window.localStorage.setItem(WAR_STORAGE_KEY_V85, JSON.stringify(simulation)); }
    catch { setWritableWar(false); setStorageMessage("Korthas continue en mémoire : sa sauvegarde locale n’a pas pu être écrite."); }
  }, [loaded, writableWar, simulation]);
  useEffect(() => {
    if (!loaded || !writableCanyon) return;
    try { window.localStorage.setItem(CANYON_STORAGE_KEY_V85, JSON.stringify(canyon)); }
    catch { setWritableCanyon(false); setStorageMessage("Le canyon continue en mémoire : sa sauvegarde locale n’a pas pu être écrite."); }
  }, [loaded, writableCanyon, canyon]);
  useEffect(() => {
    if (!loaded || !writableComposition) return;
    try { window.localStorage.setItem(COMPOSITION_STORAGE_KEY_V85, JSON.stringify({ version: 1, context: "free", selection })); }
    catch { setWritableComposition(false); setStorageMessage("La composition continue en mémoire : sa configuration n’a pas pu être sauvegardée."); }
  }, [loaded, writableComposition, selection]);
  useEffect(() => {
    if (!running || canyon.phase !== "battle" || tab !== "canyon") return;
    const timer = window.setInterval(() => setCanyon(current => stepCanyonV85(current)), 1000);
    return () => window.clearInterval(timer);
  }, [running, canyon.phase, tab]);

  const composition = useMemo(() => warCompositionV85(selection), [selection]);
  const supplied = useMemo(() => warSuppliedV85(simulation), [simulation]);
  const budget = useMemo(() => warBudgetV85(simulation), [simulation]);
  const territory = warTerritoryV85(territoryId)!;
  const candidates = simulation.combatants.filter(actor => actor.factionId === "CON-F01" && actor.territoryId === territoryId && actor.status === (orderKind === "heal" ? "wounded" : "fit") && actor.trainingUntilTurn === null);
  const controlled = WAR_TERRITORIES_V85.filter(item => simulation.territories[item.id].controller === "CON-F01");
  const filtered = useMemo(() => {
    const search = fold(query);
    return CLAN_WAR_ENTRIES_V85.filter(entry => (section === "Toutes les feuilles" || entry.sheet === section) &&
      (!search || fold(`${entry.id} ${entry.title} ${entry.sheet} ${entry.fields.map(field => field.value).join(" ")}`).includes(search)));
  }, [query, section]);
  const displayedEntries = filtered.slice(page * 24, page * 24 + 24);
  const currentEntry = clanWarEntryV85(selectedEntryId);
  const formation = canyon.formations.find(item => item.id === selectedFormation) ?? canyon.formations[0];
  const selectedCost = warOrderCostV85({ kind: orderKind, cargo: { s: cargoS, m: cargoM, i: 0 } });
  function selectTerritory(id: string) {
    setTerritoryId(id); setSelectedPeople([]); setConfirmTurn(false);
    const definition = warTerritoryV85(id)!; setTargetId(definition.neighbors[0] ?? id);
  }
  function queue() {
    const result = queueWarOrderV85(simulation, { kind: orderKind, fromId: territoryId, targetId: orderKind === "heal" ? territoryId : targetId, combatantIds: selectedPeople, cargo: { s: orderKind === "logistics" ? cargoS : 0, m: orderKind === "logistics" ? cargoM : 0, i: 0 } });
    setMessage(result.message); if (result.accepted) { setSimulation(result.state); setSelectedPeople([]); setConfirmTurn(false); }
  }
  function restartWar() {
    if (!window.confirm("Commencer un nouvel exercice de Korthas et remplacer uniquement son archive libre ?")) return;
    setSimulation(createWarSimulationV85()); setWritableWar(true); setConfirmTurn(false); setSelectedPeople([]); setMessage("Nouvel exercice de Korthas ouvert.");
  }
  function restartCanyon() {
    if (!window.confirm("Recommencer uniquement l’exercice libre du canyon ?")) return;
    setCanyon(createCanyonV85(`free-canyon-${Date.now()}`)); setWritableCanyon(true); setRunning(false); setSelectedFormation(""); setMessage("Reconnaissance du canyon recommencée.");
  }
  function issueTactical() {
    if (!formation) return;
    const result = orderCanyonFormationV85(canyon, formation.id, tacticalOrder, tacticalX, tacticalLevel);
    setCanyon(result.state); setMessage(result.message);
  }

  return <section className={styles.panel} aria-labelledby="clan-war-v85-title" data-clan-war-v85="free-profile" data-war-campaign-write="none">
    <header className={styles.header}><div><p className={styles.eyebrow}>TABLE DES MANDATS · GUERRES DE CLANS</p><h2 id="clan-war-v85-title">Un conflit, trois échelles</h2><p>Reconnaissance sur le terrain, commandement du détachement et conséquences territoriales.</p></div><button type="button" onClick={onClose}>Retour au vaisseau</button></header>
    <div className={styles.notice}><strong>Exercices libres</strong><p>Le canyon et Korthas possèdent leurs propres unités et archives. Votre chasse conserve son matériel, ses rites et ses personnes. Un mandat de campagne demande Blooded, une coque acquise et l’arrivée réelle sur le théâtre.</p><p>{save.profile.hunterName} · rang {save.profile.rankId}. Le mandat de Korthas et son arrivée restent à raccorder au voyage de campagne.</p></div>
    <nav className={styles.tabs} aria-label="Échelles des guerres de clans">{([["bible", "Bible V6 · règles actuelles"], ["canyon", "Exercice V3 · canyon"], ["composition", "Exercice V3 · formations"], ["korthas", "Exercice V3 · Korthas"], ["dossier", "Archive V3 · fiches et clans"]] as const).map(([id, label]) => <button type="button" key={id} aria-pressed={tab === id} onClick={() => { setTab(id); setRunning(false); }}>{label}</button>)}</nav>
    <p className={styles.status} role="status" aria-live="polite">{message}</p>
    {storageMessage && <p className={styles.storage} role="status">{storageMessage}</p>}
    {tab === "bible" && <ClanWarBibleV6Panel/>}

    {tab === "composition" && <div>
      <div className={styles.sectionHeader}><div><h3>Formations et limites de composition</h3><p>Le commandement compte aussi les réserves et les groupes en transit.</p></div><button type="button" onClick={() => { setSelection({ ...CANYON_PRESET_V85 }); setMessage("Effectif d’exemple du classeur : 12 commandement, 112 matériaux et 60 énergie."); }}>Effectif du classeur</button></div>
      <div className={styles.metrics}><p>Commandement <strong>{composition.used.command}/{composition.limits.command}</strong></p><p>Matériaux tactiques <strong>{composition.used.materials}/{composition.limits.materials}</strong></p><p>Énergie tactique <strong>{composition.used.energy}/{composition.limits.energy}</strong></p></div>
      <p className={composition.allowed ? styles.positive : styles.warning}>{composition.allowed ? "Manifeste de composition admissible." : "Ajustez les quantités pour respecter les trois limites."} Ces points de composition ne deviennent pas des lots S/M/I.</p>
      <div className={styles.units}>{WAR_UNITS_V85.map(unit => <article key={unit.id} className={styles.unit} data-war-unit={unit.id}><p className={styles.eyebrow}>{unit.id} · {unit.category}</p><h4>{unit.name}</h4>{artRoles[unit.id] && <WarArt role={artRoles[unit.id]}/>}<p>{unit.role}</p><p className={styles.cost}>C{unit.command} · M{unit.materials} · E{unit.energy}</p><label>Formations<input type="number" min={0} max={12} step={1} value={selection[unit.id] ?? 0} onChange={event => setSelection(current => ({ ...current, [unit.id]: Math.max(0, Math.min(12, Math.floor(Number(event.target.value) || 0))) }))} /></label><details><summary>Personnes, terrain et contres</summary><p>{unit.formation}</p><p><strong>Équipement :</strong> {unit.equipment}</p><p><strong>Comportement :</strong> {unit.behavior}</p><p><strong>Contre :</strong> {unit.counter}</p><p><strong>Faiblesse :</strong> {unit.weakness}</p><p><strong>Portée :</strong> {unit.range}</p><p>{unit.terrain}</p><p>{unit.evolution}</p></details></article>)}</div>
      <button type="button" onClick={() => setTab("canyon")}>Préparer ce détachement au canyon</button>
    </div>}

    {tab === "canyon" && <div>
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
          <div className={styles.actions}><button type="button" onClick={() => setRunning(current => !current)}>{running ? "Pause tactique" : "Reprendre le temps"}</button><button type="button" disabled={running} onClick={() => setCanyon(stepCanyonV85(canyon))}>Avancer d’une seconde</button><button type="button" onClick={() => { setCanyon(withdrawCanyonV85(canyon)); setRunning(false); }}>Déclarer le repli</button></div>
          <div className={styles.controlGrid}><label>Formation<select value={formation?.id ?? ""} onChange={event => setSelectedFormation(event.target.value)}>{canyon.formations.filter(item => !item.extraction).map((item, index) => <option key={item.id} value={item.id}>{index + 1}. {warUnitV85(item.typeId)?.name}</option>)}</select></label><label>Ordre<select value={tacticalOrder} onChange={event => setTacticalOrder(event.target.value as CanyonOrderKindV85)}>{Object.entries(tacticalLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><label>Position visée<input type="number" min={6} max={96} value={tacticalX} onChange={event => setTacticalX(Math.max(6, Math.min(96, Number(event.target.value) || 6)))} /></label><label>Niveau<select value={tacticalLevel} onChange={event => setTacticalLevel(Number(event.target.value) as 0 | 1)}><option value={0}>N0 · Fond du canyon</option><option value={1}>N1 · Corniche</option></select></label></div>
          <button type="button" disabled={!formation || formation.extraction} onClick={issueTactical}>Transmettre l’ordre</button>
          {formation && <p>{warUnitV85(formation.typeId)?.name} · position {Math.round(formation.x)}, N{formation.level} · {tacticalLabels[formation.order]} · XP {formation.startingXp + canyonXpV85(formation)} · {formation.adopted ? "Lecture récente adoptée" : `adoption ${Math.floor(formation.adoptionSeconds)}/8 s`}</p>}
          <details><summary>Guide de commandement du canyon</summary><p>Déplacez le pisteur près des postes 34, 52 et 72, puis ordonnez Observer. Une escorte proche recevant Couvrir contient les postes observés et protège le chariot. À 46, un sapeur ou le technicien rétablit l’accès du pont ; les changements d’étage passent par la rampe 18 ou l’escalier 88. À 66, le soigneur ou les porteurs évacuent le blessé en laissant une caisse. L’extraction se trouve à 96.</p><p>Lecture récente demande 100 XP et huit secondes sans exposition. Cette carte exerce les routes et la coordination ; elle ne simule pas encore le combat complet, les munitions ni les blessures de chaque membre.</p></details>
        </div>}
        {canyon.phase === "debrief" && <div className={styles.debrief}><h4>{canyon.cargoDelivered ? "Convoyage achevé" : "Rapport de repli"}</h4><p>{canyon.porterRescued ? "Le porteur blessé a été évacué ; une caisse reste sur place." : "Le porteur attend encore son équipe d’évacuation."}</p><div className={styles.scrollTable}><table><thead><tr><th>Formation</th><th>Départ</th><th>Tâches</th><th>Objectifs</th><th>Extraction</th><th>Sauvetage</th><th>Menaces</th><th>Gain</th><th>Total</th></tr></thead><tbody>{canyon.formations.map(item => <tr key={item.id}><th>{warUnitV85(item.typeId)?.name}</th><td>{item.startingXp}</td><td>{item.roleEvents.length}</td><td>{item.objectives.length}</td><td>{item.extraction ? "Oui" : "Non"}</td><td>{item.rescued.length}</td><td>{item.threats.length}</td><td>{canyonXpV85(item)}</td><td>{item.startingXp + canyonXpV85(item)}</td></tr>)}</tbody></table></div><button type="button" disabled={canyon.committed} onClick={() => setCanyon(commitCanyonV85(canyon))}>{canyon.committed ? "Résultat déjà archivé" : "Archiver le résultat une fois"}</button><p>{canyon.transitRecognized ? "Transit reconnu dans l’exercice. CON-T09 conserve son drapeau F03." : "Aucun territoire acquis par ce convoyage."}</p></div>}
      </div>}
      <ol className={styles.log} aria-label="Journal du canyon">{canyon.messages.slice(-9).map((text, index) => <li key={`${index}-${text}`}>{text}</li>)}</ol>
    </div>}

    {tab === "korthas" && <div>
      <div className={styles.sectionHeader}><div><h3>Korthas · tour {simulation.turn}</h3><p>Carte entière de conception, détachements de l’exercice et informations adverses estimées.</p></div><button type="button" onClick={restartWar}>Nouvel exercice</button></div>
      <div className={styles.metrics}><p>Stock consolidé <Budget {...budget}/></p><p>Contrôle <strong>{controlled.length}/36</strong></p><p>Aptes <strong>{warFitCombatantsV85(simulation).length}</strong></p><p>Entretien prévu <strong>S{warUpkeepV85(simulation)}</strong></p></div>
      <div className={styles.objectives}><p>Région tenue : <strong>{Math.min(2, simulation.regionStability)}/2</strong> fins de tour.</p><p>Corridor des Haltes : <strong>{Math.min(2, simulation.corridorStability)}/2</strong>.</p><p>Contrôle total : <strong>{Math.min(2, simulation.totalStability)}/2</strong>.</p></div>
      <div className={styles.mapAndOrders}>
        <div><div className={styles.map} aria-label="36 territoires de Korthas">{WAR_TERRITORIES_V85.map(item => { const state = simulation.territories[item.id]; return <button type="button" className={styles.territory} key={item.id} data-faction={state.controller} aria-pressed={territoryId === item.id} onClick={() => selectTerritory(item.id)}><span>{item.id.replace("CON-", "")}</span><strong>{item.name}</strong><small>{state.controller.replace("CON-", "")} · {state.controller === "CON-F01" ? supplied.has(item.id) ? "relié" : "isolé" : (state.transitUntilTurn ?? -1) >= simulation.turn ? "transit" : item.kind}</small></button>; })}</div><p className={styles.legend}><span>F01 · Haltes</span><span>F02 · Forges</span><span>F03 · Passes autonomes</span></p></div>
        <aside className={styles.orderPanel}><p className={styles.eyebrow}>{territory.id} · {territory.region}</p><h4>{territory.name}</h4><p>{WAR_FACTIONS_V85[simulation.territories[territoryId].controller]}</p><p>Stock sur place <Budget {...simulation.stocks[territoryId]}/></p><p>{warGarrisonV85(simulation, territoryId).length} garde(s) · {supplied.has(territoryId) ? "liaison ouverte" : "liaison absente"}.</p><p>{territory.terrain}</p>
          {simulation.territories[territoryId].controller === "CON-F01" ? <div>
            <label>Ordre<select value={orderKind} onChange={event => { setOrderKind(event.target.value as WarOrderKindV85); setSelectedPeople([]); }}>{Object.entries(orderLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
            {orderKind !== "heal" && <label>Route voisine<select value={targetId} onChange={event => setTargetId(event.target.value)}>{territory.neighbors.map(id => <option value={id} key={id}>{id.replace("CON-", "")} · {warTerritoryV85(id)?.name}</option>)}</select></label>}
            <fieldset><legend>Personnes au départ · huit maximum</legend>{candidates.map(actor => <label className={styles.person} key={actor.id}><input type="checkbox" checked={selectedPeople.includes(actor.id)} onChange={event => setSelectedPeople(current => event.target.checked ? current.length < 8 ? [...current, actor.id] : current : current.filter(id => id !== actor.id))}/><span>{actor.id} · {warUnitV85(actor.unitTypeId)?.name} · {actor.garrison ? "garde" : "mobile"}<small>{actor.xp} XP · {warVeterancyV85(actor.xp).label}</small></span></label>)}{candidates.length === 0 && <p>Aucune personne disponible pour cet ordre.</p>}</fieldset>
            {orderKind === "logistics" && <div className={styles.controlGrid}><label>Lots S<input type="number" min={0} max={1000} value={cargoS} onChange={event => setCargoS(Math.max(0, Math.min(1000, Math.floor(Number(event.target.value) || 0))))}/></label><label>Lots M<input type="number" min={0} max={1000} value={cargoM} onChange={event => setCargoM(Math.max(0, Math.min(1000, Math.floor(Number(event.target.value) || 0))))}/></label></div>}
            <p>Réservation locale <Budget {...selectedCost}/></p><button type="button" onClick={queue}>Réserver l’ordre</button>
          </div> : <p>{(() => { const observation = simulation.observations.find(item => item.territoryId === territoryId); return observation ? `Observation du tour ${observation.turn} : ${observation.lower}–${observation.upper} personnes ${simulation.turn - observation.turn > 2 ? "(ancienne, à renouveler)" : "estimées"}.` : "Effectif actuel inconnu. Envoyer une reconnaissance depuis un territoire voisin."; })()}</p>}
          <details><summary>Sites, capture et risques</summary><p>{territory.sites}</p><p>{territory.capture}</p><p>{territory.effect}</p><p>{territory.risk}</p></details>
        </aside>
      </div>
      <div className={styles.orderQueue}><h4>Ordres réservés</h4><p>Deux opérationnels, un logistique et un diplomatique par tour. Le mode de résolution de cet exercice est automatique.</p>{simulation.orders.length === 0 && <p>Aucun ordre. Passer un tour fera agir les Forges et paiera l’entretien.</p>}{simulation.orders.map(order => <div key={order.id}><span>{orderLabels[order.kind]} · {order.fromId.replace("CON-", "")} → {order.targetId.replace("CON-", "")} · {order.combatantIds.join(", ") || "mandat local"}</span><button type="button" onClick={() => { setSimulation(cancelWarOrderV85(simulation, order.id)); setConfirmTurn(false); }}>Retirer</button></div>)}</div>
      {!confirmTurn ? <button type="button" onClick={() => setConfirmTurn(true)}>Fin de préparation · relire avant résolution</button> : <div className={styles.confirm}><p>Les ordres seront scellés, les détachements adverses agiront avec leurs effectifs présents et l’entretien sera prélevé. Les revenus du prochain tour dépendront des sites encore reliés.</p><div className={styles.actions}><button type="button" onClick={() => { const result = advanceWarTurnV85(simulation); setMessage(result.message); if (result.accepted) setSimulation(result.state); setConfirmTurn(false); setSelectedPeople([]); }}>Confirmer et résoudre le tour</button><button type="button" onClick={() => setConfirmTurn(false)}>Revenir aux ordres</button></div></div>}
      <details className={styles.roster}><summary>Registre individuel · aptes, blessés et mémorial</summary><div className={styles.scrollTable}><table><thead><tr><th>Personne</th><th>Lieu</th><th>État</th><th>Affectation</th><th>XP</th><th>Vétérance</th></tr></thead><tbody>{simulation.combatants.filter(actor => actor.factionId === "CON-F01").map(actor => <tr key={actor.id}><th>{actor.id}</th><td>{actor.territoryId.replace("CON-", "")}</td><td>{actor.status === "fit" ? "Apte" : actor.status === "wounded" ? "Blessé" : "Mort"}{actor.trainingUntilTurn !== null ? ` · soins jusqu’au tour ${actor.trainingUntilTurn}` : ""}</td><td>{actor.garrison ? "Garnison" : "Détachement"}</td><td>{actor.xp}</td><td>{warVeterancyV85(actor.xp).label}</td></tr>)}</tbody></table></div></details>
      <ol className={styles.log} aria-label="Journal stratégique">{simulation.reports.slice(-12).map(item => <li key={item.id}><strong>Tour {item.turn}</strong> · {item.text}</li>)}</ol>
      <details><summary>Règles de cet exercice stratégique</summary><p>La carte, ses routes, ressources, effectifs Pxx de départ, entretien, plafonds d’XP et objectifs viennent du classeur. Le modèle automatique compare les effectifs présents à une résistance de même effectif, avec une variation déterministe de 0 ou 1. Il produit des blessures, un éventuel décès et un repli sans recréer les personnes.</p><p>La répartition initiale des stocks, le prix de transit I1, sa durée de deux tours, les soins légers S1 et les cessions au-delà de T07 sont des choix de cet exercice. Une cession y est toujours acceptée après paiement et affectation d’un garde. Les contre-offensives emploient des colonnes réelles ; ce modèle n’est pas encore la diplomatie narrative complète du projet.</p></details>
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
