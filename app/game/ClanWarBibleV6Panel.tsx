"use client";

import { useMemo, useRef, useState } from "react";
import {
  DEFAULT_WAR_RULES_V6, WAR_PRIVATE_IMPORT_MAX_BYTES_V6,
  estimateWarTeamV6, parsePrivateWarRulesV6, planWarRouteV6, warTeamTierV6,
  type WarRulesV6, type WarTeamHypothesisV6,
} from "./systems/clanWarBibleV6";
import styles from "./ClanWarPanelV85.module.css";

const fold = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
/** Latest workbook figures and route planning, without invented campaign acquisitions. */
export default function ClanWarBibleV6Panel() {
  const [privateRules, setPrivateRules] = useState<WarRulesV6 | null>(null);
  const [importName, setImportName] = useState(""), [importError, setImportError] = useState(""), [importBusy, setImportBusy] = useState(false);
  const importTicket = useRef(0);
  const rules = privateRules ?? DEFAULT_WAR_RULES_V6;
  const { metadata: WAR_BIBLE_V6, entries: WAR_BIBLE_ENTRIES_V6, sections: WAR_BIBLE_SECTIONS_V6, parameters: WAR_PARAMETERS_V6, units: WAR_UNITS_V6, specializations: WAR_SPECIALIZATIONS_V6, territories: WAR_TERRITORIES_V6, passages: WAR_PASSAGES_V6 } = rules;
  const [section, setSection] = useState<"teams" | "routes" | "library">("teams");
  const [hypothesis, setHypothesis] = useState<WarTeamHypothesisV6>({ unitId: "W3-U01", xp: 40, fatigue: 20, deployableMembers: 2, availableRav: 6, frontNeedRav: 6, terrainBonus: 10, nextObjectiveXp: 8 });
  const [fromId, setFromId] = useState("W3-K01"), [toId, setToId] = useState("W3-K36");
  const [commandPoints, setCommandPoints] = useState(12), [closed, setClosed] = useState<string[]>([]);
  const [query, setQuery] = useState(""), [sheet, setSheet] = useState("Toutes les feuilles"), [page, setPage] = useState(0), [entryId, setEntryId] = useState(DEFAULT_WAR_RULES_V6.entries[0] ? `${DEFAULT_WAR_RULES_V6.entries[0].sheet}:${DEFAULT_WAR_RULES_V6.entries[0].id}` : "");
  const calculation = useMemo(() => estimateWarTeamV6(hypothesis, rules), [hypothesis, rules]);
  const unit = calculation.unit;
  const specialty = WAR_SPECIALIZATIONS_V6.find(item => item.unitId === hypothesis.unitId);
  const route = useMemo(() => planWarRouteV6(fromId, toId, commandPoints, closed, rules), [fromId, toId, commandPoints, closed, rules]);
  const filtered = useMemo(() => WAR_BIBLE_ENTRIES_V6.filter(entry => (sheet === "Toutes les feuilles" || entry.sheet === sheet) && (!query || fold(`${entry.id} ${entry.title} ${entry.fields.map(field => field.value).join(" ")}`).includes(fold(query)))), [query, sheet, WAR_BIBLE_ENTRIES_V6]);
  const entry = WAR_BIBLE_ENTRIES_V6.find(item => `${item.sheet}:${item.id}` === entryId);
  function resetForRules(next: WarRulesV6) {
    const unit = next.units.find(item => item.id === "W3-U01") ?? next.units[0];
    if (unit) setHypothesis({ unitId: unit.id, xp: Math.min(40, next.parameters.xp_max), fatigue: Math.min(20, next.parameters.fatigue_max), deployableMembers: unit.fullMembers, availableRav: Math.min(6, next.parameters.rav_cap), frontNeedRav: Math.max(6, unit.upkeepRav), terrainBonus: Math.min(10, next.parameters.terrain_bonus_cap), nextObjectiveXp: next.parameters.xp_battle });
    setFromId(next.territories[0]?.id ?? "W3-K01"); setToId(next.territories.at(-1)?.id ?? "W3-K36");
    setCommandPoints(next.parameters.pc_cap_1 ?? 12); setClosed([]); setQuery(""); setSheet("Toutes les feuilles"); setPage(0);
    setEntryId(next.entries[0] ? `${next.entries[0].sheet}:${next.entries[0].id}` : "");
  }
  async function loadPrivateRules(file: File) {
    const ticket = ++importTicket.current;
    setImportBusy(true); setImportError("");
    try {
      if (file.size === 0 || file.size > WAR_PRIVATE_IMPORT_MAX_BYTES_V6) throw new Error("Choisissez un fichier JSON de règles non vide, de moins de 40 Mo.");
      let value: unknown;
      try { value = JSON.parse(await file.text()) as unknown; }
      catch { throw new Error("Ce fichier n’est pas un JSON lisible. Choisissez clan-war-v6-source-private.json, pas le classeur XLSX."); }
      const parsed = parsePrivateWarRulesV6(value);
      if (!parsed.rules) throw new Error(parsed.error ?? "Les règles V6 sont invalides.");
      if (ticket !== importTicket.current) return;
      setPrivateRules(parsed.rules); setImportName(file.name); resetForRules(parsed.rules);
    } catch (error) {
      if (ticket === importTicket.current) setImportError(error instanceof Error ? error.message : "Le fichier n’a pas pu être lu.");
    } finally {
      if (ticket === importTicket.current) setImportBusy(false);
    }
  }
  function clearPrivateRules() {
    importTicket.current += 1; setPrivateRules(null); setImportName(""); setImportError(""); setImportBusy(false); resetForRules(DEFAULT_WAR_RULES_V6);
  }
  function numberInput(key: keyof Omit<WarTeamHypothesisV6, "unitId">, label: string, max: number) {
    return <label>{label}<input type="number" min={0} max={max} value={hypothesis[key]} onChange={event => setHypothesis(current => ({ ...current, [key]: Math.max(0, Math.min(max, Math.floor(Number(event.target.value) || 0))) }))}/></label>;
  }
  const privateImport = <aside className={styles.notice} aria-label="Import local des règles V6">
    <h4>Utiliser mes règles V6 locales</h4>
    <p>Choisissez <code>clan-war-v6-source-private.json</code> sur votre ordinateur. Il active ici les calculs, la carte et les fiches. Le fichier reste en mémoire dans ce panneau : aucun envoi, aucun stockage et aucun gain de campagne.</p>
    <label>Fichier JSON des règles de guerre V6<input type="file" accept=".json,application/json" disabled={importBusy} onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (file) void loadPrivateRules(file); }}/></label>
    {importBusy && <p role="status">Lecture du fichier local…</p>}
    {importError && <p className={styles.warning} role="alert">{importError} Les règles déjà affichées restent inchangées.</p>}
    {privateRules && <div><p className={styles.positive} role="status">Import local actif : {importName} · {privateRules.entries.length} fiches. SHA de source déclaré concordant.</p><p>Le hash déclaré identifie le classeur source ; il ne certifie pas que le JSON a conservé chacun de ses octets.</p><button type="button" onClick={clearPrivateRules}>Retirer le fichier de ce panneau</button></div>}
  </aside>;
  if (WAR_BIBLE_ENTRIES_V6.length === 0) return <div><div className={styles.notice}><h3>Bible V6 · règles locales</h3><p>La source récupérée depuis votre Drive privé n’est pas incluse dans cette version publique. Chargez son JSON local ci-dessous pour utiliser les outils V6. Les exercices V3 restent accessibles dans leurs archives séparées.</p></div>{privateImport}</div>;
  return <div data-war-bible="V6" data-war-bible-source-sha={WAR_BIBLE_V6.sha256}>
    <div className={styles.sectionHeader}><div><h3>Bible V6 · équipes, passages et mandats</h3><p>Source du 7 octobre 2026 · {WAR_BIBLE_ENTRIES_V6.length} fiches de guerre dans {WAR_BIBLE_SECTIONS_V6.length} feuilles.</p></div></div>
    {privateImport}
    <p className={styles.notice}>La version actuelle emploie RAV pour le ravitaillement et PC pour le commandement. L’expérience d’une équipe reste entre {WAR_PARAMETERS_V6.xp_min} et {WAR_PARAMETERS_V6.xp_max}, avec les paliers {WAR_PARAMETERS_V6.xp_tier_2} et {WAR_PARAMETERS_V6.xp_tier_3}. Les fiches V3 du 6 octobre décrivent une version antérieure, accessible dans ses exercices propres.</p>
    <nav className={styles.tabs} aria-label="Outils de guerre de la Bible V6">{([["teams", "Simuler une équipe"], ["routes", "Passages de Korthas"], ["library", "Toutes les fiches V6"]] as const).map(([id, label]) => <button type="button" key={id} aria-pressed={section === id} onClick={() => setSection(id)}>{label}</button>)}</nav>
    {section === "teams" && <div>
      <h4>Hypothèses de l’équipe</h4><p>Le calcul reprend la feuille « Simuler Une équipe ». Ces valeurs servent à comparer une préparation ; elles ne deviennent pas des guerriers, des compétences ou des ressources dans votre campagne.</p>
      <div className={styles.controlGrid}><label>Type d’équipe<select value={hypothesis.unitId} onChange={event => { const selected = WAR_UNITS_V6.find(item => item.id === event.target.value); if (selected) setHypothesis(current => ({ ...current, unitId: selected.id, deployableMembers: selected.fullMembers, frontNeedRav: Math.max(current.frontNeedRav, selected.upkeepRav) })); }}>{WAR_UNITS_V6.map(item => <option key={item.id} value={item.id}>{item.id} · {item.name}</option>)}</select></label>{numberInput("xp", `Expérience · 0 à ${WAR_PARAMETERS_V6.xp_max}`, WAR_PARAMETERS_V6.xp_max)}{numberInput("fatigue", `Fatigue · 0 à ${WAR_PARAMETERS_V6.fatigue_max}`, WAR_PARAMETERS_V6.fatigue_max)}{numberInput("deployableMembers", "Membres déployables", unit?.fullMembers ?? 0)}{numberInput("availableRav", "RAV disponibles ce tour", WAR_PARAMETERS_V6.rav_cap)}{numberInput("frontNeedRav", "Besoin RAV du front · équipe incluse une fois", 1000000)}{numberInput("terrainBonus", `Bonus de défense du terrain · plafonné à ${WAR_PARAMETERS_V6.terrain_bonus_cap} %`, 100)}<label>Prochain objectif<select value={hypothesis.nextObjectiveXp} onChange={event => setHypothesis(current => ({ ...current, nextObjectiveXp: Number(event.target.value) }))}><option value={WAR_PARAMETERS_V6.xp_recon}>Reconnaissance nouvelle · {WAR_PARAMETERS_V6.xp_recon} XP</option><option value={WAR_PARAMETERS_V6.xp_hero}>Action héroïque{WAR_PARAMETERS_V6.xp_retreat === WAR_PARAMETERS_V6.xp_hero ? " ou repli" : ""} · {WAR_PARAMETERS_V6.xp_hero} XP</option>{WAR_PARAMETERS_V6.xp_retreat !== WAR_PARAMETERS_V6.xp_hero && <option value={WAR_PARAMETERS_V6.xp_retreat}>Repli organisé · {WAR_PARAMETERS_V6.xp_retreat} XP</option>}<option value={WAR_PARAMETERS_V6.xp_battle}>Objectif de bataille · {WAR_PARAMETERS_V6.xp_battle} XP</option><option value={WAR_PARAMETERS_V6.xp_campaign}>Finale · remplace l’objectif standard · {WAR_PARAMETERS_V6.xp_campaign} XP</option></select></label></div>
      <p className={calculation.valid ? styles.positive : styles.warning} role="status">{calculation.status}</p>
      <div className={styles.metrics}><p>Attaque estimée <strong>{calculation.attack ?? "Entrée à corriger"}</strong></p><p>Défense estimée <strong>{calculation.defense ?? "Entrée à corriger"}</strong></p><p>Commandement <strong>{unit?.commandPoints ?? 0} PC</strong></p><p>Entretien de cette équipe <strong>{unit?.upkeepRav ?? 0} RAV</strong></p><p>XP après cet objectif <strong>{calculation.xpAfter} · {warTeamTierV6(calculation.xpAfter, rules)}</strong></p></div>
      <div className={styles.units}><article className={styles.unit}><h4>Facteurs du calcul</h4><p>XP ×{calculation.multiplier.toFixed(2)} · fatigue ×{calculation.fatigueFactor.toFixed(2)} · ravitaillement ×{calculation.supplyFactor.toFixed(2)} · effectif ×{calculation.memberFactor.toFixed(2)}.</p><p>Le manque de ravitaillement réduit l’efficacité à {Math.round(WAR_PARAMETERS_V6.supply_factor_low * 100)} %. Il ne supprime pas les personnes. Le terrain améliore la défense dans la limite de {WAR_PARAMETERS_V6.terrain_bonus_cap} %.</p><p>Le besoin du front inclut chaque équipe une seule fois, y compris les garnisons. Le coût de cette équipe n’est pas facturé une seconde fois au titre du territoire.</p></article>{unit && <article className={styles.unit}><p className={styles.eyebrow}>{unit.id} · {unit.role}</p><h4>{unit.name}</h4><p>{unit.fullMembers} membre(s) au complet · intégration {unit.delayTurns} tour(s) · recrutement {unit.recruitmentRav} RAV.</p><p>Attaque {unit.attack} · défense {unit.defense} · portée {unit.range} · mobilité {unit.mobility}.</p><p><strong>Contre :</strong> {unit.counter}</p><p><strong>Limite :</strong> {unit.weakness}</p></article>}{specialty && <article className={styles.unit}><h4>Spécialisation exclusive à {specialty.threshold} XP</h4><p><strong>A · {specialty.nameA}</strong> : {specialty.effectA}</p><p><strong>B · {specialty.nameB}</strong> : {specialty.effectB}</p><p>{specialty.exclusivity}</p><p>{specialty.mastery}</p></article>}</div>
      <details><summary>Expérience et identité persistantes</summary><p>Une reconnaissance nouvelle donne {WAR_PARAMETERS_V6.xp_recon} XP, une action héroïque {WAR_PARAMETERS_V6.xp_hero}, un objectif de bataille {WAR_PARAMETERS_V6.xp_battle}, un repli organisé {WAR_PARAMETERS_V6.xp_retreat}. La finale vaut {WAR_PARAMETERS_V6.xp_campaign} XP et remplace la récompense normale. Une transaction complète ne dépasse pas {WAR_PARAMETERS_V6.xp_transaction_cap} XP et le même résultat ne se crédite pas à nouveau en changeant de mode.</p><p>Les personnes conservent leurs propres blessures et leur expérience. Une perte enlève le membre concerné ; un remplaçant arrive avec son dossier. Novice, Vétéran et Maître décrivent cette progression militaire du jeu, sans valider Blooded, Élite ou une fonction Adjutant.</p></details>
    </div>}
    {section === "routes" && <div>
      <h4>{WAR_TERRITORIES_V6.length} zones · {WAR_PASSAGES_V6.length} passages documentés</h4><p>Le trajet suit le sens, le coût et la capacité de chaque liaison. Une route trouvée reste un plan : ses contrôles, accords et observations doivent encore être validés avant un déplacement de campagne.</p>
      <div className={styles.controlGrid}><label>Départ<select value={fromId} onChange={event => setFromId(event.target.value)}>{WAR_TERRITORIES_V6.map(item => <option key={item.id} value={item.id}>{item.id} · {item.name}</option>)}</select></label><label>Destination<select value={toId} onChange={event => setToId(event.target.value)}>{WAR_TERRITORIES_V6.map(item => <option key={item.id} value={item.id}>{item.id} · {item.name}</option>)}</select></label><label>Colonne en PC<input type="number" min={1} max={WAR_PARAMETERS_V6.pc_cap_3} value={commandPoints} onChange={event => setCommandPoints(Math.max(1, Math.min(WAR_PARAMETERS_V6.pc_cap_3, Math.floor(Number(event.target.value) || 1))))}/></label></div>
      <div className={styles.scrollTable}><div className={`${styles.map} ${styles.v6Map}`} aria-label="Korthas selon la Bible V6">{WAR_TERRITORIES_V6.map(item => <button type="button" key={item.id} className={styles.territory} style={{ gridColumn: item.column, gridRow: item.row }} aria-pressed={item.id === toId} onClick={() => setToId(item.id)}><span>{item.id}</span><strong>{item.name}</strong><small>{item.initialController} · RAV +{item.incomeRav} · garde {item.garrisonPc} PC</small></button>)}</div></div>
      <div className={styles.confirm}>{route ? <><p><strong>Coût de mouvement {route.cost}</strong> · {route.passageIds.length} passage(s) · {commandPoints} PC.</p><p>{route.territoryIds.map(id => WAR_TERRITORIES_V6.find(item => item.id === id)?.name ?? id).join(" → ")}</p><p>{route.passageIds.join(", ") || "Même territoire, aucun passage."}</p></> : <p className={styles.warning}>Aucun trajet admissible avec cette capacité et ces passages fermés. Réduire la colonne ou rouvrir un ouvrage.</p>}</div>
      <details><summary>Fermer un ouvrage dans l’hypothèse de route</summary><fieldset><legend>Passages temporairement fermés</legend>{WAR_PASSAGES_V6.map(item => <label className={styles.person} key={item.id}><input type="checkbox" checked={closed.includes(item.id)} onChange={event => setClosed(current => event.target.checked ? [...current, item.id] : current.filter(id => id !== item.id))}/><span>{item.id} · {item.name}<small>{item.kind} · capacité {item.capacityPc} PC · mouvement {item.movementCost}</small></span></label>)}</fieldset></details>
      {(() => { const territory = WAR_TERRITORIES_V6.find(item => item.id === toId); return territory ? <article className={styles.entry}><h4>{territory.name}</h4><p><strong>Objectif :</strong> {territory.objective}</p><p><strong>Reconnaissance :</strong> {territory.reconnaissance}</p><p><strong>Contrôle :</strong> {territory.control}</p><p><strong>Vie locale :</strong> {territory.life}</p><p><strong>Repli :</strong> {territory.retreat}</p></article> : null; })()}
    </div>}
    {section === "library" && <div>
      <div className={styles.controlGrid}><label>Rechercher<input type="search" maxLength={120} value={query} onChange={event => { setQuery(event.target.value); setPage(0); }} placeholder="W3-K01, W5-SP, doctrine, foyer…"/></label><label>Feuille<select value={sheet} onChange={event => { setSheet(event.target.value); setPage(0); }}><option>Toutes les feuilles</option>{WAR_BIBLE_SECTIONS_V6.map(name => <option key={name}>{name}</option>)}</select></label></div><p>{filtered.length} fiche(s).</p>
      <div className={styles.library}><div className={styles.entryList}>{filtered.slice(page * 24, page * 24 + 24).map(item => <button type="button" key={`${item.sheet}-${item.id}`} aria-pressed={entryId === `${item.sheet}:${item.id}`} onClick={() => setEntryId(`${item.sheet}:${item.id}`)}><small>{item.id} · {item.sheet}</small><strong>{item.title}</strong></button>)}<div className={styles.actions}><button type="button" disabled={page === 0} onClick={() => setPage(current => current - 1)}>Précédent</button><span>{page + 1}/{Math.max(1, Math.ceil(filtered.length / 24))}</span><button type="button" disabled={(page + 1) * 24 >= filtered.length} onClick={() => setPage(current => current + 1)}>Suivant</button></div></div><div>{entry && <article className={styles.entry}><p className={styles.eyebrow}>{entry.id} · {entry.sheet} · ligne {entry.row}</p><h3>{entry.title}</h3><dl>{entry.fields.map(item => <div key={item.cell}><dt>{item.label}</dt><dd>{String(item.value)}</dd></div>)}</dl></article>}</div></div>
    </div>}
    <p className={styles.source}>Source prioritaire : {WAR_BIBLE_V6.workbook}. Les tables W3 et W5 se déclarent reconstituées et proposées pour le projet. Le système ne les présente pas comme du lore canonique ni comme des campagnes déjà réalisées.</p>
  </div>;
}
