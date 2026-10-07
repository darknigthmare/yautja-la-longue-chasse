"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BIBLE_SOURCE_SHA_V85 as SOURCE_SHA, readBibleDocumentV85 as readDocument,
  type BibleCellValueV85 as CellValue, type BibleCellV85 as BibleCell,
  type BibleSheetV85 as BibleSheet, type BibleDocumentV85 as BibleDocument } from "./systems/bibleSourceV85";
import styles from "./DialogueBibleReaderV85.module.css";
import YautjaTranslationV67 from "./YautjaTranslationV67";
import { createBibleLoadGateV85, fetchBibleDocumentsV85 } from "./systems/bibleResourceV85";

/** These same-origin endpoints may be supplied only after distribution approval. */
export interface DialogueBibleSourceV85 {
  dialoguesUrl: string;
  shipsUrl?: string;
}

interface BibleRecord { row: number; id: string; cells: Record<string, BibleCell> }
interface BibleTable { name: string; headers: Record<string, string>; records: BibleRecord[]; introductoryRows: BibleRecord[] }

const SCENES = "Scènes de dialogue V6";
const REPLIES = "Répliques V6";
const CHOICES = "Choix et actions V6";
const VARIANTS = "Variantes V6";
const PAGE_SIZE = 30;
const textOf = (value: CellValue | undefined) => value === undefined ? "" : String(value);
const columnOf = (address: string) => address.replace(/[0-9]/g, "");
const cellText = (entry: BibleRecord, column: string) => textOf(entry.cells[column]?.value);
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");

function makeTable(sheet: BibleSheet): BibleTable {
  const headers: Record<string, string> = {};
  for (const cell of sheet.rows.find(row => row.number === 5)?.cells ?? []) {
    if (typeof cell.value === "string") headers[columnOf(cell.address)] = cell.value;
  }
  const sourceRows = sheet.rows.map(row => {
    const cells: Record<string, BibleCell> = {};
    for (const cell of row.cells) cells[columnOf(cell.address)] = cell;
    return { row: row.number, id: textOf(cells.A?.value) || `ligne-${row.number}`, cells };
  });
  return { name: sheet.name, headers, records: sourceRows.filter(row => row.row > 5), introductoryRows: sourceRows.filter(row => row.row <= 5) };
}

function Fields({ table, entry, omit = [] }: { table: BibleTable; entry: BibleRecord; omit?: string[] }) {
  return <dl className={styles.fields}>{Object.entries(entry.cells).filter(([column]) => !omit.includes(column)).map(([column, cell]) =>
    <div key={column}><dt>{table.headers[column] || `Colonne ${column}`} <small>{cell.address}</small></dt>
      <dd>{textOf(cell.value) || "—"}{cell.formula !== undefined && <small className={styles.formula}>Formule conservée, non exécutée : {cell.formula}</small>}</dd></div>)}</dl>;
}

function RelatedRecords({ title, table, records }: { title: string; table: BibleTable | undefined; records: BibleRecord[] }) {
  if (!table || records.length === 0) return null;
  return <section className={styles.related}><h4>{title} ({records.length})</h4>{records.map(entry =>
    <article key={`${entry.id}-${entry.row}`}><h5>{entry.id}{table.name === REPLIES && cellText(entry, "F") ? ` · ${cellText(entry, "F")}` : ""}</h5>
      {table.name === REPLIES && <blockquote>{cellText(entry, "G")}</blockquote>}
      <Fields table={table} entry={entry} omit={table.name === REPLIES ? ["A", "B", "F", "G"] : ["B"]} />
    </article>)}</section>;
}

function SceneRehearsal({ scene, replies, choices, variants, tables, suspended }: {
  scene: BibleRecord; replies: BibleRecord[]; choices: BibleRecord[]; variants: BibleRecord[];
  tables: Map<string, BibleTable>; suspended: boolean;
}) {
  const [started, setStarted] = useState(false);
  const [position, setPosition] = useState(0);
  const [paused, setPaused] = useState(false);
  const [phase, setPhase] = useState("");
  const phases = [...new Set(replies.map(entry => cellText(entry, "C")).filter(Boolean))];
  const sequence = phase ? replies.filter(entry => cellText(entry, "C") === phase) : replies;
  const finished = started && position >= sequence.length;
  const line = sequence[position];
  const speaker = line ? cellText(line, "F") : "";
  // Exact source name only: do not infer a voice from rank, silhouette or role.
  const voice = tables.get("Voix V6")?.records.find(entry => cellText(entry, "B") === speaker);
  return <section className={styles.rehearsal} aria-label={`Répétition documentaire de ${scene.id}`}>
    <header><p className="eyebrow">APERÇU DE SCÉNARIO · TEXTE ET GESTES</p><h4>Répétition dans les archives</h4></header>
    <p className={styles.rehearsalNotice}>Aucune lecture automatique ou voix enregistrée. Les répliques suivent l’ordre du classeur ; branches, phases et conditions sont présentées pour consultation, sans exécuter leurs événements. Cet aperçu ne signifie pas que la scène est implantée dans la campagne.</p>
    <label className={styles.phaseFilter}>Phase source à consulter <select value={phase} onChange={event => { setPhase(event.currentTarget.value); setPosition(0); setStarted(false); setPaused(false); }}><option value="">Toutes les phases (lecture documentaire)</option>{phases.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
    {!started ? <button type="button" disabled={!sequence.length} onClick={() => { setStarted(true); setPosition(0); setPaused(false); }}>Commencer la répétition ({sequence.length} répliques)</button> : <>
      <div className={styles.rehearsalProgress} role="status">{finished ? "Fin de la répétition" : paused ? "En pause" : "Réplique à consulter"} · {Math.min(position + 1, sequence.length)}/{sequence.length}</div>
      {line && !finished && <article className={styles.rehearsalLine}>
        <div className={styles.speaker}><strong>{speaker}</strong><span>{cellText(line, "C")} · {line.id}</span></div>
        <div className={styles.spokenText}><YautjaTranslationV67 key={line.id} text={cellText(line, "G")} paused={paused || suspended} showSkip /></div>
        <dl className={styles.rehearsalDirections}><div><dt>Geste / intention de jeu · cellule H{line.row}</dt><dd>{cellText(line, "H") || "Aucune indication dans cette cellule."}</dd></div>
          <div><dt>Condition de cette réplique · cellule I{line.row}</dt><dd>{cellText(line, "I") || "Aucune condition dans cette cellule."}</dd></div>
          {cellText(line, "D") && <div><dt>Choix lié dans la source</dt><dd>{cellText(line, "D")}</dd></div>}
          {voice && <div><dt>Direction de voix textuelle · {voice.id}</dt><dd>{cellText(voice, "D")}</dd></div>}</dl>
      </article>}
      <div className={styles.rehearsalControls} role="group" aria-label="Commandes de répétition">
        <button type="button" disabled={position === 0} onClick={() => setPosition(current => Math.max(0, current - 1))}>Précédent</button>
        <button type="button" disabled={finished} onClick={() => setPaused(current => !current)}>{paused ? "Reprendre" : "Pause"}</button>
        <button type="button" disabled={finished || paused} onClick={() => setPosition(current => Math.min(sequence.length, current + 1))}>Suivant</button>
        <button type="button" disabled={finished} onClick={() => { setPosition(sequence.length); setPaused(false); }}>Fin</button>
        {finished && <button type="button" onClick={() => { setPosition(0); setPaused(false); }}>Recommencer</button>}
      </div>
      {finished && <div className={styles.rehearsalEnding}><p>Options documentaires : consulter une conséquence ne l’applique pas. Aucune récompense, action physique ou connaissance nouvelle n’est accordée.</p>
        <RelatedRecords title="Options et actions prescrites par la source" table={tables.get(CHOICES)} records={choices} />
        <RelatedRecords title="Variantes et conditions à respecter" table={tables.get(VARIANTS)} records={variants} />
      </div>}
    </>}
    <small className={styles.rehearsalFootnote}>Glyphes décoratifs de l’interface V67 : effet visuel, sans TTS ni langue Yautja présentée comme canonique.</small>
  </section>;
}

/** A source reader only: no game choices, rewards, audio generation or save mutations. */
export default function DialogueBibleReaderV85({ source, suspended = false, onActiveChange }: {
  source?: DialogueBibleSourceV85;
  suspended?: boolean;
  onActiveChange?: (active: boolean) => void;
}) {
  const [opened, setOpened] = useState(false);
  const [cache, setCache] = useState<{ origin: string; documents: BibleDocument[] } | null>(null);
  const [loadMode, setLoadMode] = useState<"remote" | "local">("remote");
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState("");
  const [networkFailure, setNetworkFailure] = useState<{ key: string; message: string } | null>(null);
  const [sheetName, setSheetName] = useState(SCENES);
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState("");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState("");
  const dialog = useRef<HTMLDialogElement | null>(null);
  const request = useRef(createBibleLoadGateV85());
  const dialoguesUrl = source?.dialoguesUrl;
  const shipsUrl = source?.shipsUrl;
  const sourceKey = `${dialoguesUrl ?? ""}\n${shipsUrl ?? ""}`;
  const documents = useMemo(() => cache && (cache.origin === "local" || cache.origin === sourceKey) ? cache.documents : [], [cache, sourceKey]);
  const networkError = networkFailure?.key === sourceKey ? networkFailure.message : "";
  const networkNeeded = opened && !suspended && loadMode === "remote" && Boolean(dialoguesUrl) && !documents.length && !networkError;
  const loading = localLoading || networkNeeded;
  const error = localError || networkError;
  const tables = useMemo(() => {
    const byName = new Map<string, BibleTable>();
    for (const document of documents) for (const sheet of document.sheets) byName.set(sheet.name, makeTable(sheet));
    return byName;
  }, [documents]);
  const table = tables.get(sheetName) ?? tables.get(SCENES) ?? tables.values().next().value as BibleTable | undefined;
  const domains = useMemo(() => [...new Set((tables.get(SCENES)?.records ?? []).map(entry => cellText(entry, "C")).filter(Boolean))], [tables]);
  const matches = useMemo(() => {
    const needle = normalize(query.trim());
    return table?.records.filter(entry => (table.name !== SCENES || !domain || cellText(entry, "C") === domain) &&
      (!needle || Object.values(entry.cells).some(cell => normalize(textOf(cell.value)).includes(needle)))) ?? [];
  }, [query, table, domain]);
  const pageCount = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = matches.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const selected = matches.find(entry => entry.id === selectedId) ?? visible[0];
  const sceneLinks = useMemo(() => {
    const linked = new Map<string, { replies: BibleRecord[]; choices: BibleRecord[]; variants: BibleRecord[] }>();
    for (const [name, key] of [[REPLIES, "replies"], [CHOICES, "choices"], [VARIANTS, "variants"]] as const) {
      for (const entry of tables.get(name)?.records ?? []) {
        const id = cellText(entry, "B");
        const group = linked.get(id) ?? { replies: [], choices: [], variants: [] };
        group[key].push(entry);
        linked.set(id, group);
      }
    }
    return linked;
  }, [tables]);

  useEffect(() => {
    const element = dialog.current;
    if (opened && !suspended && element && !element.open) element.showModal();
    else if ((!opened || suspended) && element?.open) element.close();
  }, [opened, suspended]);
  useEffect(() => {
    onActiveChange?.(opened && !suspended);
    return () => onActiveChange?.(false);
  }, [opened, suspended, onActiveChange]);
  useEffect(() => {
    if (!networkNeeded || !dialoguesUrl) return;
    const ticket = request.current.begin();
    const urls = [dialoguesUrl, shipsUrl].filter((url): url is string => Boolean(url));
    fetchBibleDocumentsV85(urls, window.location.href, ticket.signal)
      .then(result => { if (ticket.isCurrent()) setCache({ origin: sourceKey, documents: result }); })
      .catch(reason => { if (ticket.isCurrent()) setNetworkFailure({ key: sourceKey, message: reason instanceof Error ? reason.message : "Le corpus n’a pas pu être chargé." }); });
    return () => ticket.cancel();
  }, [networkNeeded, dialoguesUrl, shipsUrl, sourceKey]);
  useEffect(() => { const gate = request.current; return () => gate.cancel(); }, []);

  const closeReader = () => { request.current.cancel(); setLocalLoading(false); setOpened(false); };
  const usePublicSource = () => {
    request.current.cancel(); setLocalLoading(false); setLocalError(""); setNetworkFailure(null);
    setLoadMode("remote"); setCache(null);
  };

  const importLocal = async (files: FileList | null) => {
    if (!files?.length) return;
    const ticket = request.current.begin();
    setLoadMode("local"); setLocalLoading(true); setLocalError(""); setNetworkFailure(null);
    try {
      const imported = await Promise.all(Array.from(files).map(async file => {
        if (file.size > 30 * 1024 * 1024) throw new Error("Ce fichier dépasse la taille admise pour une extraction V6.");
        return readDocument(JSON.parse(await file.text()));
      }));
      if (ticket.isCurrent()) { setCache(current => ({ origin: "local", documents: [...(current?.documents ?? []), ...imported] })); setSelectedId(""); setPage(0); }
    } catch (reason) { if (ticket.isCurrent()) setLocalError(reason instanceof Error ? reason.message : "L’extraction locale est illisible."); }
    finally { if (ticket.isCurrent()) setLocalLoading(false); }
  };
  const links = selected && table?.name === SCENES ? sceneLinks.get(selected.id) : undefined;

  return <section className={styles.reader} data-dialogue-bible="v85" inert={suspended}>
    <p className="eyebrow">ARCHIVES DE CRÉATION · BIBLE V6</p>
    <h3>Scènes, gestes et directions de voix</h3>
    <p>730 scènes et 210 profils de voix documentés. Les profils indiquent comment interpréter un personnage ; aucun enregistrement de dialogue n’est fourni.</p>
    {!source && <p className={styles.notice}>Diffusion du corpus non activée. Vous pouvez consulter l’extraction privée en ouvrant ses fichiers JSON locaux ; ils restent dans la mémoire de ce navigateur.</p>}
    <button type="button" onClick={() => { setOpened(true); setNetworkFailure(null); }}>Ouvrir le lecteur de sources</button>
    <dialog ref={dialog} className={styles.dialog} onClose={closeReader} onKeyDown={event => event.stopPropagation()} aria-labelledby="bible-reader-title">
      <header className={styles.header}><div><p className="eyebrow">LECTURE DOCUMENTAIRE · AUCUNE MODIFICATION DE SAUVEGARDE</p><h3 id="bible-reader-title">Bible cumulative et dialogues V6</h3></div>
        <button type="button" autoFocus onClick={() => dialog.current?.close()}>Fermer</button></header>
      <p className={styles.notice}>Les conditions, connaissances limitées et conséquences restent celles du classeur. Lire une option n’exécute pas son action. Les formules sont conservées sans calcul.</p>
      <div className={styles.import}><label>Ouvrir une extraction JSON locale <input type="file" accept=".json,application/json" multiple onChange={event => { void importLocal(event.currentTarget.files); event.currentTarget.value = ""; }} /></label>
        <small>bible-dialogues.json et, si souhaité, bible-ships.json. Aucun fichier n’est envoyé à un serveur.</small>{source && <button type="button" onClick={usePublicSource}>Recharger la source publique</button>}</div>
      {loading && <p role="status">Lecture du corpus complet…</p>}{error && <p role="alert" className={styles.error}>{error}</p>}
      {table ? <>
        <div className={styles.controls}><label>Feuille <select value={table.name} onChange={event => { setSheetName(event.currentTarget.value); setPage(0); setSelectedId(""); setQuery(""); }}>{[...tables.values()].map(item => <option key={item.name} value={item.name}>{item.name} ({item.records.length})</option>)}</select></label>
          <label>Rechercher dans les cellules <input type="search" value={query} onChange={event => { setQuery(event.currentTarget.value); setPage(0); setSelectedId(""); }} placeholder="Identifiant, personnage, condition…" /></label>
          {table.name === SCENES && <label>Domaine source <select value={domain} onChange={event => { setDomain(event.currentTarget.value); setPage(0); setSelectedId(""); }}><option value="">Tous les domaines</option>{domains.map(value => <option key={value} value={value}>{value}</option>)}</select></label>}</div>
        <details className={styles.sheetOpening}><summary>Titre, consignes et en-têtes originaux de cette feuille</summary>{table.introductoryRows.map(row => <div key={row.row}><p>Ligne {row.row}</p><dl className={styles.fields}>{Object.entries(row.cells).map(([column, cell]) => <div key={column}><dt>Cellule {cell.address}</dt><dd>{textOf(cell.value)}{cell.formula !== undefined && <small className={styles.formula}>Formule conservée, non exécutée : {cell.formula}</small>}</dd></div>)}</dl></div>)}</details>
        <div className={styles.layout}><aside className={styles.index} aria-label={`Fiches de ${table.name}`}>
          <p>{matches.length} fiche(s) · page {safePage + 1}/{pageCount}</p>
          <div className={styles.pager}><button type="button" disabled={safePage === 0} onClick={() => { setPage(safePage - 1); setSelectedId(""); }}>Précédente</button><button type="button" disabled={safePage + 1 >= pageCount} onClick={() => { setPage(safePage + 1); setSelectedId(""); }}>Suivante</button></div>
          {visible.map(entry => <button className={styles.recordButton} key={`${entry.id}-${entry.row}`} type="button" aria-pressed={selected?.row === entry.row} onClick={() => setSelectedId(entry.id)}><strong>{entry.id}</strong><span>{cellText(entry, "B") || `Ligne ${entry.row}`}</span>{table.name === SCENES && <small>{cellText(entry, "C")}</small>}</button>)}
        </aside><article className={styles.detail}>
          {selected ? <><h4>{selected.id} · {cellText(selected, "B")}</h4><p className={styles.sourceLine}>{table.name} · ligne source {selected.row}</p><Fields table={table} entry={selected} />
            {links && <><SceneRehearsal key={selected.id} scene={selected} replies={links.replies} choices={links.choices} variants={links.variants} tables={tables} suspended={suspended || !opened} />
              <details className={styles.completeScene}><summary>Consulter toutes les lignes source de cette scène</summary><RelatedRecords title="Répliques et phases" table={tables.get(REPLIES)} records={links.replies} /><RelatedRecords title="Choix, actions et conditions" table={tables.get(CHOICES)} records={links.choices} /><RelatedRecords title="Variantes conditionnelles" table={tables.get(VARIANTS)} records={links.variants} /></details></>}
          </> : <p>Aucune cellule ne correspond à cette recherche.</p>}
        </article></div>
        <footer className={styles.provenance}>Source : {documents[0]?.source.workbook} · {documents[0]?.source.totalWorkbookSheets} feuilles dans le classeur original. SHA-256 : <code>{SOURCE_SHA}</code>. Aucun clip audio ni synthèse vocale.</footer>
      </> : !loading && <p>{source ? "Le corpus sera chargé à l’ouverture du lecteur." : "Sélectionnez l’extraction locale préparée dans le projet pour consulter ses feuilles intégrales."}</p>}
    </dialog>
  </section>;
}
