"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  WAR_MISSION_TEMPLATES_V114, WAR_LINE_ROSTER_V114, WAR_STEALTH_WALLS_V114,
  WAR_STEALTH_HEIGHT_V114, WAR_STEALTH_WIDTH_V114, WAR_RTS_HEIGHT_V114, WAR_RTS_WIDTH_V114,
  actWarStealthV114, activateWarLineSupportV114, createWarLineV114, createWarMissionBoardV114,
  createWarRtsV114, createWarStealthV114, deployWarLineV114, deployWarRtsV114,
  finishWarMissionV114, issueWarDispatchV114, orderWarRtsV114, readWarMissionBoardV114,
  resolveWarDispatchesV114, stepWarLineV114, stepWarRtsV114, warMissionStorageKeyV114,
  type WarMissionBoardV114, type WarMissionModeV114,
} from "./systems/clanWarMissionModesV114";
import { warTerritoriesForSimulationV96, type WarSimulationV85, type WarOrderKindV85 } from "./systems/clanWarV85";
import styles from "./ClanWarMissionsV114.module.css";

interface Props {
  simulation: WarSimulationV85; planetName: string; active: boolean;
  onPrepareSite: (fromId: string, targetId: string, kind: WarOrderKindV85) => void;
}
interface ActiveRun {
  id: string; mode: Exclude<WarMissionModeV114, "dispatch">;
  templateId: string; fromId: string; targetId: string; recorded: boolean;
}
const MODE_LABELS: Record<WarMissionModeV114, string> = {
  line: "Front 2D · déploiement",
  dispatch: "Opérations détachées",
  stealth: "Infiltration et sabotage",
  rts: "Guerre totale · RTS",
};
const formatTime = (millis: number) => {
  const sec = Math.max(0, Math.ceil(millis / 1000));
  return Math.floor(sec / 60) + " min " + String(sec % 60).padStart(2, "0") + " s";
};
/** All four mission types share ONLY this free-exercise ledger. No main-game grant. */
export default function ClanWarMissionsV114({ simulation, planetName, active, onPrepareSite }: Props) {
  const planetId = simulation.planetId ?? "korthas";
  const [board, setBoard] = useState(() => createWarMissionBoardV114(planetId));
  const boardRef = useRef(board);
  const [hydrated, setHydrated] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [storageStatus, setStorageStatus] = useState("");
  const [notice, setNotice] = useState("Choisissez un mandat et son mode d'exécution.");
  const [mode, setMode] = useState<WarMissionModeV114>("line");
  const [templateId, setTemplateId] = useState("W114-L01");
  const [fromChoice, setFromChoice] = useState<string | null>(null);
  const [targetChoice, setTargetChoice] = useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [now, setNow] = useState(0);
  const [run, setRun] = useState<ActiveRun | null>(null);
  const [paused, setPaused] = useState(false);
  const [line, setLine] = useState(() => createWarLineV114());
  const [stealth, setStealth] = useState(() => createWarStealthV114());
  const [rts, setRts] = useState(() => createWarRtsV114());
  const [selectedSquad, setSelectedSquad] = useState<string>("own-1");
  const sequence = useRef(0);

  const definitions = warTerritoriesForSimulationV96(simulation);
  const ownSites = definitions.filter(item => simulation.territories[item.id]?.controller === "CON-F01");
  const origin = ownSites.find(item => item.id === fromChoice) ?? ownSites[0];
  const fromId = origin?.id ?? "";
  const neighbors = definitions.filter(item => origin?.neighbors.includes(item.id));
  const target = neighbors.find(item => item.id === targetChoice)
    ?? neighbors.find(item => simulation.territories[item.id]?.controller === "CON-F02")
    ?? neighbors[0];
  const targetId = target?.id ?? "";
  // Clan honor: the generic hostile-assault and sabotage simulations may not attack allied/neutral sites.
  const hostileTarget = simulation.territories[targetId]?.controller === "CON-F02";
  const roster = simulation.combatants.filter(person => person.factionId === "CON-F01" && person.territoryId === fromId && person.status === "fit" && person.trainingUntilTurn === null);
  const busy = new Set([...simulation.orders.flatMap(order => order.combatantIds), ...board.dispatches.filter(item => item.status === "running").flatMap(item => item.members.map(person => person.id))]);
  const eligible = roster.filter(person => !busy.has(person.id));
  const templates = WAR_MISSION_TEMPLATES_V114.filter(item => item.mode === mode);
  const template = templates.find(item => item.id === templateId) ?? templates[0];
  const lastSuccess = board.reports.findLast(item => item.id === run?.id)?.success;

  useEffect(() => {
    const key = warMissionStorageKeyV114(planetId);
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) {
        if (raw.length > 200000) throw new Error("Archive trop volumineuse.");
        const saved = readWarMissionBoardV114(JSON.parse(raw) as unknown, planetId);
        if (!saved) { setBlocked(true); setStorageStatus("Archive de missions inconnue ou incompatible : octets conservés. Aucune écriture autorisée."); }
        else { boardRef.current = saved; setBoard(saved); setStorageStatus("Rapports et détachements récupérés pour ce monde."); }
      }
    } catch {
      setBlocked(true);
      setStorageStatus("Lecture de l'archive impossible : aucune écriture sur l'ancien contenu.");
    }
    setHydrated(true);
  }, [planetId]);

  function commit(next: WarMissionBoardV114) {
    if (!hydrated || blocked || next === boardRef.current) return false;
    try {
      const key = warMissionStorageKeyV114(planetId), raw = window.localStorage.getItem(key);
      if (raw !== null) {
        const live = readWarMissionBoardV114(JSON.parse(raw) as unknown, planetId);
        if (!live || live.revision !== boardRef.current.revision || JSON.stringify(live) !== JSON.stringify(boardRef.current)) {
          setBlocked(true); setStorageStatus("Une autre session ou une archive incompatible a modifié ce monde. Écriture bloquée pour ne pas écraser les données.");
          return false;
        }
      } else if (boardRef.current.revision !== 0) {
        setBlocked(true); setStorageStatus("Le stockage existant a disparu. Opération interrompue pour préserver la cohérence.");
        return false;
      }
      window.localStorage.setItem(key, JSON.stringify(next));
      boardRef.current = next; setBoard(next); setStorageStatus("Registre d'exercice enregistré localement.");
      return true;
    } catch {
      setBlocked(true); setStorageStatus("Sauvegarde indisponible. Le registre existant n'est pas écrasé.");
      return false;
    }
  }

  useEffect(() => {
    if (!active || !hydrated || blocked) return;
    function refresh() {
      const stamp = Date.now();
      setNow(stamp);
      const result = resolveWarDispatchesV114(boardRef.current, stamp);
      if (result !== boardRef.current) commit(result);
    }
    refresh();
    const timer = window.setInterval(refresh, 1000);
    return () => window.clearInterval(timer);
    // Only run while visible; due dates are absolute and catch up upon return.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, hydrated, blocked, planetId]);

  useEffect(() => {
    if (!active || paused || !run || run.recorded) return;
    if (run.mode === "line" && line.phase === "active") {
      const timer = window.setInterval(() => setLine(current => stepWarLineV114(current)), 340);
      return () => window.clearInterval(timer);
    }
    if (run.mode === "rts" && rts.phase === "active") {
      const timer = window.setInterval(() => setRts(current => stepWarRtsV114(current)), 380);
      return () => window.clearInterval(timer);
    }
  }, [active, paused, run, line.phase, rts.phase]);

  useEffect(() => {
    if (!run || run.recorded || !hydrated || blocked) return;
    const outcome = run.mode === "line" ? line.phase : run.mode === "stealth" ? stealth.phase : rts.phase;
    if (outcome === "active") return;
    const success = outcome === "victory";
    const losses = run.mode === "line" && !success ? 2 : run.mode === "rts" ? Math.min(8, Math.max(0, 2 - rts.units.filter(item => item.side === "own").length)) : 0;
    const report = {
      id: run.id, templateId: run.templateId, mode: run.mode, planetId, fromId: run.fromId, targetId: run.targetId,
      success, losses, at: Date.now(),
      text: success ? "Exercice terminé : objectif tactique atteint. Aucun territoire n'est attribué sans ordre stratégique." : "Mission interrompue ou perdue. Aucun résultat de conquête ajouté au front.",
    };
    if (commit(finishWarMissionV114(boardRef.current, report))) {
      setRun(current => current?.id === run.id ? { ...current, recorded: true } : current);
      setNotice(success ? "Objectif rempli. Le rapport est enregistré ; le commandement stratégique reste indépendant." : "Mission échouée. Le rapport est enregistré.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, line.phase, stealth.phase, rts.phase, hydrated, blocked, planetId]);

  function startMission() {
    if (!active || blocked || !hydrated || !origin || !target || mode === "dispatch") return;
    if (!hostileTarget) { setNotice("Code d\u0027honneur : ce mandat offensif cible uniquement une position militaire hostile connue. Choisissez un front adverse."); return; }
    sequence.current++;
    const id = "mission-" + planetId + "-" + Date.now() + "-" + sequence.current;
    setRun({ id, mode, templateId: template.id, fromId, targetId, recorded: false });
    setLine(createWarLineV114(sequence.current, board.readiness, template.threat, board.sabotage));
    setStealth(createWarStealthV114(board.intel));
    setRts(createWarRtsV114(board.rav, board.intel, board.sabotage));
    setSelectedSquad("own-1"); setPaused(false);
    setNotice("Mandat lancé : " + template.title + ". Les pièces visibles sont des marqueurs provisoires, pas les sprites finaux.");
  }
  function dispatch() {
    if (!active || !hydrated || blocked || !origin || !target || mode !== "dispatch") return;
    const result = issueWarDispatchV114(boardRef.current, simulation, template.id, fromId, targetId, selectedMembers, Date.now());
    if (result.error) { setNotice(result.error); return; }
    if (commit(result.board)) { setSelectedMembers([]); setNotice("Détachement envoyé. Son rapport arrivera au terme du délai, même si vous quittez cet onglet."); }
  }
  function selectMode(value: WarMissionModeV114) {
    setMode(value); setTemplateId(WAR_MISSION_TEMPLATES_V114.find(item => item.mode === value)!.id); setRun(null); setPaused(false);
  }
  const cells = useMemo(() => Array.from({ length: WAR_STEALTH_WIDTH_V114 * WAR_STEALTH_HEIGHT_V114 }, (_, index) => {
    const x = index % WAR_STEALTH_WIDTH_V114, y = Math.floor(index / WAR_STEALTH_WIDTH_V114);
    const wall = WAR_STEALTH_WALLS_V114.has(x + "," + y), player = stealth.x === x && stealth.y === y;
    const guard = stealth.guards.some(item => item.x === x && item.y === y);
    const objective = x === 9 && y === 1, exit = x === 1 && y === 6;
    return { x, y, wall, player, guard, objective, exit };
  }), [stealth]);

  return <section className={styles.root} data-testid="war-mission-modes-v114">
    <div className={styles.heading}><div><p className={styles.kicker}>MANDATS MULTI-MODES · V114</p><h3>Opérations de clans · {planetName}</h3><p>Les quatre modes utilisent les lieux et personnes de l'exercice V3. Leurs rapports et ressources d'entraînement se répondent, mais ne donnent aucun trophée, rang, territoire ou combattant à la campagne.</p></div></div>
    <div className={styles.metrics} aria-label="Registre local">
      <span>RAV d'exercice <strong>{board.rav}</strong></span>
      <span>Renseignement <strong>{board.intel}</strong></span>
      <span>Préparation <strong>{board.readiness}</strong></span>
      <span>Relais neutralisés <strong>{board.sabotage}</strong></span>
      <span>Rapports <strong>{board.reports.length}</strong></span>
    </div>
    <p role="status" className={blocked ? styles.warning : styles.subtle}>{!hydrated ? "Vérification de l'archive locale…" : storageStatus || "Archive de mission autonome."}</p>
    <nav className={styles.tabs} aria-label="Types de missions">{(Object.keys(MODE_LABELS) as WarMissionModeV114[]).map(value =>
      <button key={value} type="button" aria-pressed={mode === value} onClick={() => selectMode(value)}>{MODE_LABELS[value]}</button>)}</nav>
    <div className={styles.setup}>
      <label>Mandat
        <select value={template.id} disabled={blocked} onChange={event => { setTemplateId(event.target.value); setRun(null); }}>
          {templates.map(item => <option key={item.id} value={item.id}>{item.id} · {item.title}</option>)}
        </select>
      </label>
      <label>Départ
        <select value={fromId} onChange={event => { setFromChoice(event.target.value); setTargetChoice(null); setSelectedMembers([]); setRun(null); }} disabled={!ownSites.length}>
          {ownSites.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <label>Objectif voisin
        <select value={targetId} onChange={event => { setTargetChoice(event.target.value); setRun(null); }} disabled={!neighbors.length}>
          {neighbors.map(item => <option key={item.id} value={item.id}>{item.name} · {simulation.territories[item.id]?.controller === "CON-F01" ? "allié" : "contesté"}</option>)}
        </select>
      </label>
    </div>
    <article className={styles.brief}>
      <p className={styles.kicker}>{template.id} · menace {template.threat}/3 · exercice V3</p>
      <h4>{template.title}</h4><p>{template.briefing}</p><p><strong>Objectif :</strong> {template.objective}</p>
      {mode !== "dispatch" && !hostileTarget && <p className={styles.warning}>Mandat offensif interdit ici : site neutre ou allié. Le front autorise la reconnaissance et les accords, pas une attaque injustifiée.</p>}
      <p>Effets d’exercice : préparation → AP du front ; renseignement → camouflage et renforts RTS ; sabotage du relais → défenses adverses réduites dans les batailles suivantes.</p>
    </article>
    {mode === "dispatch" ? <section className={styles.content}>
      <h4>Table des départs · opérations temporisées</h4>
      <p>Choisissez des personnes aptes réellement présentes au départ. Les personnes engagées dans un ordre stratégique ou une autre opération ne sont pas disponibles ici. Le risque et le résultat sont simulés sans consulter les forces adverses cachées.</p>
      <div className={styles.roster}>{eligible.slice(0, 24).map(person =>
        <label key={person.id}><input type="checkbox" checked={selectedMembers.includes(person.id)} onChange={event => setSelectedMembers(current => event.target.checked ? current.length >= 8 ? current : [...current, person.id] : current.filter(id => id !== person.id))}/><span>{person.id} <small>XP {person.xp} · {person.unitTypeId}</small></span></label>)}</div>
      <button type="button" disabled={!active || !hydrated || blocked || selectedMembers.length === 0 || !targetId || board.rav < 5} onClick={dispatch}>Envoyer {selectedMembers.length} personne(s) · 5 RAV · {formatTime(template.durationMs ?? 0)}</button>
      <h4>Opérations actives et rapports</h4>
      <div className={styles.dispatchList}>{board.dispatches.slice().reverse().slice(0, 15).map(item => <article key={item.id}>
        <strong>{WAR_MISSION_TEMPLATES_V114.find(t => t.id === item.templateId)?.title ?? item.templateId}</strong>
        <p>{item.members.map(m => m.id).join(", ")} · {item.fromId} → {item.targetId}</p>
        <p>{item.status === "running" ? "En mission · " + formatTime(item.dueAt - now) : item.result === "success" ? "Mission réussie · pertes d'exercice : " + item.losses : "Mission échouée · pertes d'exercice : " + item.losses}</p>
      </article>)}</div>
    </section> : <section className={styles.content}>
      <div className={styles.actions}><button type="button" onClick={startMission} disabled={!active || !hydrated || blocked || !targetId || !hostileTarget}>{run ? "Recommencer ce mandat" : "Lancer la mission"}</button>
        {(mode === "line" || mode === "rts") && run?.mode === mode && <button type="button" aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? "Reprendre" : "Pause"}</button>}</div>
      {run?.mode === "line" && <div data-testid="war-line-v114">
        <div className={styles.progress}><span>Poste allié {line.ownBase} PV</span><span>AP {line.ap}/160</span><span>Poste adverse {line.enemyBase} PV</span></div>
        <div className={styles.line} role="img" aria-label="Front latéral ; soldats alliés et adverses progressant entre deux postes">
          <div className={styles.ownBase}>POSTE</div><div className={styles.enemyBase}>CIBLE</div>
          {line.actors.map(actor => <span key={actor.id} className={actor.side === "own" ? styles.ownUnit : styles.enemyUnit} style={{ left: actor.x + "%" }} title={actor.id + " · " + actor.hp + " PV"}>{actor.side === "own" ? "ᛉ" : "◆"}<small>{actor.hp}</small></span>)}
        </div>
        <div className={styles.deploy}>{WAR_LINE_ROSTER_V114.map((unit, index) => <button type="button" key={unit.id} disabled={!active || paused || line.phase !== "active" || line.ap < unit.cost} onClick={() => setLine(state => deployWarLineV114(state, index))}><strong>{unit.title}</strong><small>{unit.cost} AP · {unit.role}</small></button>)}</div>
        <button type="button" disabled={!active || paused || line.phase !== "active" || line.tick - line.lastSpecial < 22} onClick={() => setLine(activateWarLineSupportV114)}>Appui coordonné · récupération 22 temps</button>
        <p>Temps {line.tick} · {line.phase === "active" ? "En cours" : line.phase === "victory" ? "Victoire tactique" : "Repli / défaite"}</p>
      </div>}
      {run?.mode === "stealth" && <div data-testid="war-stealth-v114">
        <div className={styles.progress}><span>Alarme {stealth.alarm}/4</span><span>Énergie de camouflage {stealth.energy}/10</span><span>Relais {stealth.planted ? "neutralisé" : "actif"}</span></div>
        <div className={styles.stealthMap} aria-label="Plan d'infiltration : H héros, S sentinelle, R relais, E extraction, blocs obstacles">
          {cells.map(cell => <span key={cell.x + "," + cell.y} className={cell.wall ? styles.wall : cell.player ? styles.hero : cell.guard ? styles.guard : cell.objective ? styles.objective : cell.exit ? styles.exit : styles.floor} title={cell.x + "," + cell.y}>{cell.wall ? "■" : cell.player ? "H" : cell.guard ? "S" : cell.objective ? "R" : cell.exit ? "E" : "·"}</span>)}
        </div>
        <div className={styles.arrows}>
          {(["up", "left", "down", "right"] as const).map(action => <button key={action} type="button" disabled={!active || stealth.phase !== "active"} onClick={() => setStealth(state => actWarStealthV114(state, action))}>{({ up: "↑ Haut", left: "← Gauche", down: "↓ Bas", right: "→ Droite" })[action]}</button>)}
        </div>
        <div className={styles.actions}>
          <button type="button" aria-pressed={stealth.crouch} disabled={!active || stealth.phase !== "active"} onClick={() => setStealth(state => actWarStealthV114(state, "crouch"))}>Profil bas {stealth.crouch ? "actif" : "inactif"}</button>
          <button type="button" aria-pressed={stealth.cloak} disabled={!active || stealth.phase !== "active" || stealth.energy <= 0} onClick={() => setStealth(state => actWarStealthV114(state, "cloak"))}>Camouflage {stealth.cloak ? "actif" : "inactif"}</button>
          <button type="button" disabled={!active || stealth.phase !== "active"} onClick={() => setStealth(state => actWarStealthV114(state, "interact"))}>Neutraliser le relais</button>
        </div>
        <p>Approcher R, interagir depuis une case voisine, puis rejoindre E. Éviter la ligne de vue des sentinelles. {stealth.phase === "victory" ? "Extraction réussie." : stealth.phase === "defeat" ? "Alerte : mission échouée." : ""}</p>
      </div>}
      {run?.mode === "rts" && <div data-testid="war-rts-v114">
        <div className={styles.progress}><span>Points de commandement {rts.points}</span><span>Ouest {rts.leftCapture}/7</span><span>Est {rts.rightCapture}/7</span><span>Tenue {rts.hold}/6</span></div>
        <p>Sélectionnez un groupe allié (A), puis une case de destination. Les adversaires (E) contestent les deux positions (◉). Les groupes combattent automatiquement à courte portée.</p>
        <div className={styles.rtsMap} role="group" aria-label="Bataille vue de dessus">
          {Array.from({ length: WAR_RTS_WIDTH_V114 * WAR_RTS_HEIGHT_V114 }, (_, index) => {
            const x = index % WAR_RTS_WIDTH_V114, y = Math.floor(index / WAR_RTS_WIDTH_V114);
            const own = rts.units.find(item => item.side === "own" && item.x === x && item.y === y);
            const enemy = rts.units.find(item => item.side === "enemy" && item.x === x && item.y === y);
            const point = y === 3 && (x === 3 || x === 7);
            const unit = own ?? enemy;
            return <button type="button" key={index} className={own ? styles.rtsOwn : enemy ? styles.rtsEnemy : point ? styles.rtsPoint : styles.rtsGround}
              aria-label={"Case " + x + ", " + y + (unit ? " " + unit.id : point ? " poste" : "")} aria-pressed={Boolean(own && selectedSquad === own.id)}
              disabled={!active || rts.phase !== "active"} onClick={() => {
                if (own) setSelectedSquad(own.id);
                else setRts(state => orderWarRtsV114(state, selectedSquad, x, y));
              }}>{own ? "A" : enemy ? "E" : point ? "◉" : "·"}</button>;
          })}
        </div>
        <div className={styles.actions}><button type="button" disabled={!active || paused || rts.phase !== "active" || rts.points < 35} onClick={() => setRts(deployWarRtsV114)}>Renfort · 35 PC</button><p>Groupe sélectionné : {selectedSquad} · temps {rts.tick} · {rts.phase === "active" ? "Bataille" : rts.phase === "victory" ? "Victoire" : "Défaite"}</p></div>
      </div>}
      {run && run.recorded && <div className={styles.result}><strong>{lastSuccess ? "Rapport tactique favorable" : "Rapport tactique défavorable"}</strong><p>Résultat ajouté au registre autonome. Vous pouvez maintenant préparer un ordre réel au poste de commandement ; son coût, ses personnes et son résultat restent ceux du moteur de conquête existant.</p><button type="button" onClick={() => onPrepareSite(run.fromId, run.targetId, run.mode === "stealth" ? "recon" : "attack")}>Préparer {run.mode === "stealth" ? "la reconnaissance" : "l'assaut"} dans le front stratégique</button></div>}
    </section>}
    <p role="status" className={styles.notice}>{notice}</p>
    <details className={styles.history}><summary>Journal commun des rapports d'opération ({board.reports.length})</summary>
      {board.reports.slice(-25).reverse().map(report => <p key={report.id}><strong>{report.success ? "Réussite" : "Échec"}</strong> · {report.templateId} · {report.fromId} → {report.targetId} · {report.text}</p>)}
    </details>
    <p className={styles.footer}>Source V3 : unités RTS-U, territoires CON-T, combattants Pxx/Fxx du front libre. Les chiffres AP, PV, minutages, grilles et IA sont des règles originales d'exercice — pas des faits canoniques de Predator ni des paramètres V6. Aucune conversion fictive W3-U/RTS-U n'est pratiquée.</p>
  </section>;
}
