"use client";
/* eslint-disable @next/next/no-img-element -- unchanged public game bitmaps */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import type { SaveGame } from "./types";
import { controlKeyCodeFromInput, matchesControlAction } from "./systems/controlBindings";
import { controlActionShortcut } from "./controlBindingLabels";
import { useMenuGamepad } from "./useMenuGamepad";
import HomeworldModularHunter from "./HomeworldModularHunter";
import { MAUSOLEUM_CHRONICLES, MAUSOLEUM_GALLERIES, MAUSOLEUM_PHASE_LABELS, MAUSOLEUM_RITUAL_PHASES, canConsultMausoleum, canVisitMausoleumGallery, defaultMausoleumProgress, mausoleumAccess, mausoleumDlcState, recordMausoleumVisit, type MausoleumChronicle, type MausoleumProgress, type MausoleumRitualPhase } from "./systems/mausoleum";
import styles from "./Mausoleum.module.css";
import { createHeldDirectionV94 } from "./systems/heldDirectionV94";
import { createPhaseClockV94 } from "./systems/phaseClockV94";
import { pageActivitySnapshotV94, serverPageActivityV94, subscribePageActivityV94 } from "./systems/pageActivityV94";

export default function Mausoleum({ save, suspended = false, source = "homeworld", onProgress, onExit, onSound }: {
  save: SaveGame | null; suspended?: boolean; source?: "homeworld" | "menu";
  onProgress?(progress: MausoleumProgress): boolean; onExit(): void;
  onSound?(id: "select" | "mask-on" | "mask-off" | "scan"): void;
}) {
  const access = mausoleumAccess(save), progress = save?.homeworld.mausoleum ?? defaultMausoleumProgress();
  const [gallery, setGallery] = useState("first"), [page, setPage] = useState(0), [x, setX] = useState(90);
  const target = useRef(90), heldKeys = useRef(createHeldDirectionV94()), ritualClock = useRef(createPhaseClockV94());
  const pageActive = useSyncExternalStore(subscribePageActivityV94, pageActivitySnapshotV94, serverPageActivityV94);
  const paused = suspended || !pageActive;
  const [selected, setSelected] = useState<MausoleumChronicle | null>(null), [maskIndex, setMaskIndex] = useState(0), [phase, setPhase] = useState<MausoleumRitualPhase | null>(null), [notice, setNotice] = useState("");
  const root = useRef<HTMLElement>(null), scene = useRef<HTMLDivElement>(null), dialog = useRef<HTMLDivElement>(null), held = useRef(0), xRef = useRef(90), returnX = useRef(90), readArchive = useRef(false), trigger = useRef<HTMLElement | null>(null), progressRef = useRef(progress);
  useEffect(() => { progressRef.current = progress; }, [progress]);
  const stopMovement = useCallback(() => {
    heldKeys.current.reset(); held.current = 0; target.current = xRef.current;
  }, []);
  const resetPosition = useCallback((position: number) => {
    heldKeys.current.reset(); held.current = 0; target.current = position; xRef.current = position; setX(position);
  }, []);
  useEffect(() => { if (!paused && !selected) scene.current?.focus(); }, [paused, selected]);
  const entries = MAUSOLEUM_CHRONICLES.filter(entry => entry.gallery === gallery), visible = entries.slice(page * 3, page * 3 + 3);
  const positions = visible.map((_, index) => 180 + index * 270);
  const nearIndex = positions.findIndex(position => Math.abs(x - position) < 76), nearest = visible[nearIndex];
  const displayedMask = selected?.masks[maskIndex] ?? selected?.masks[0];
  const blocked = paused || !!selected || !!phase;
  const saveVisit = useCallback((id: string, kind: "examined" | "consulted") => {
    const currentAccess = mausoleumAccess(save);
    if (currentAccess.preview) return true;
    const next = recordMausoleumVisit(progressRef.current, id, kind, currentAccess);
    if (JSON.stringify(next) === JSON.stringify(progressRef.current)) return true;
    let persisted = false;
    try { persisted = onProgress?.(next) === true; } catch { /* Preserve the visit for explicit retry. */ }
    if (!persisted) { setNotice("Consultation non enregistrée : sauvegarde indisponible. Aucun DLC ni trophée n’a été accordé."); return false; }
    progressRef.current = next; return true;
  }, [save, onProgress]);
  const close = useCallback(() => { ritualClock.current.reset(); resetPosition(returnX.current); setSelected(null); setPhase(null); requestAnimationFrame(() => (trigger.current?.isConnected ? trigger.current : scene.current)?.focus()); }, [resetPosition]);
  const remove = useCallback(() => { if (paused || phase === "remove" || phase === "replace") return; if (phase) { ritualClock.current.pause(performance.now()); setPhase("remove"); } else close(); }, [phase, close, paused]);
  const examine = () => {
    if (!nearest || blocked) return;
    trigger.current = document.activeElement as HTMLElement; returnX.current = x;
    stopMovement(); setMaskIndex(0); setSelected(nearest); setNotice("");
    saveVisit(nearest.id, "examined"); onSound?.("select");
  };
  useEffect(() => {
    if (!selected || paused) return;
    dialog.current?.focus();
  }, [selected, paused]);
  useEffect(() => {
    if (blocked) return;
    let frame = 0, previous = 0;
    const tick = (now: number) => {
      const dt = Math.min(.05, previous ? (now - previous) / 1000 : 0); previous = now;
      const current = xRef.current, delta = target.current - current;
      const next = held.current ? Math.max(40, Math.min(860, current + held.current * dt * 270))
        : Math.abs(delta) < dt * 270 ? target.current : current + Math.sign(delta) * dt * 270;
      if (next !== current) { xRef.current = next; setX(next); }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); stopMovement(); };
  }, [blocked, stopMovement]);
  useEffect(() => {
    const release = () => { stopMovement(); if (!pageActivitySnapshotV94()) ritualClock.current.pause(performance.now()); };
    window.addEventListener("blur", release); document.addEventListener("visibilitychange", release);
    return () => { window.removeEventListener("blur", release); document.removeEventListener("visibilitychange", release); };
  }, [stopMovement]);
  useEffect(() => {
    if (!phase || phase === "archive") { ritualClock.current.reset(); return; }
    if (paused) return;
    const clock = ritualClock.current;
    const timing = clock.resume(phase, phase === "boot" ? 1200 : 650, performance.now());
    if (timing.playSound && phase === "boot") onSound?.("mask-on");
    if (timing.playSound && phase === "remove") onSound?.("mask-off");
    const timeout = window.setTimeout(() => {
      if (!pageActivitySnapshotV94() || !clock.finish(phase, timing.token)) return;
      const index = MAUSOLEUM_RITUAL_PHASES.indexOf(phase);
      if (phase === "replace") { if (readArchive.current && selected && !saveVisit(selected.id, "consulted")) { setPhase("archive"); return; } close(); return; }
      const next = MAUSOLEUM_RITUAL_PHASES[index + 1];
      if (next === "archive") { readArchive.current = true; onSound?.("scan"); }
      setPhase(next);
    }, timing.remainingMs);
    return () => { clearTimeout(timeout); clock.pause(performance.now()); };
  }, [phase, paused, selected, saveVisit, close, onSound]);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (blocked || event.target !== event.currentTarget || event.altKey || event.ctrlKey || event.metaKey) return;
    const left = save ? matchesControlAction("hunt.moveLeft", event.nativeEvent, save.settings.controlBindings) : event.key === "ArrowLeft";
    const right = save ? matchesControlAction("hunt.moveRight", event.nativeEvent, save.settings.controlBindings) : event.key === "ArrowRight";
    if (left || right) {
      event.preventDefault();
      const code = controlKeyCodeFromInput(event.nativeEvent);
      if (code) held.current = heldKeys.current.press(code, left ? -1 : 1, event.repeat);
      if (held.current) target.current = xRef.current;
      return;
    }
    if ((save ? matchesControlAction("hunt.interact", event.nativeEvent, save.settings.controlBindings) : event.key === "Enter")) { event.preventDefault(); if (!event.repeat) examine(); }
  };
  const onKeyUp = (event: KeyboardEvent<HTMLDivElement>) => {
    const code = controlKeyCodeFromInput(event.nativeEvent);
    if (!code) return;
    const before = held.current;
    held.current = heldKeys.current.release(code);
    if (before && !held.current) target.current = xRef.current;
  };
  const isBack = (event: KeyboardEvent<HTMLElement>) => save
    ? matchesControlAction("hunt.pause", event.nativeEvent, save.settings.controlBindings)
    : event.key === "Escape";
  const onDialogKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (paused) return;
    if (isBack(event)) { event.preventDefault(); event.stopPropagation(); remove(); }
    if (event.key === "Tab") {
      const buttons = Array.from(dialog.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []), first = buttons[0], last = buttons.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first?.focus(); }
    }
  };
  const gamepadBack = useCallback(() => { if (paused) return; if (selected) remove(); else onExit(); }, [selected, remove, onExit, paused]);
  useMenuGamepad(root, !paused, `${gallery}:${page}:${selected?.id}:${phase}`, gamepadBack);
  const galleryLabel = MAUSOLEUM_GALLERIES.find(entry => entry.id === gallery)?.name;
  return <section className={styles.root} ref={root} data-mausoleum data-mausoleum-source={source} data-mausoleum-phase={phase ?? "visit"} aria-labelledby="mausoleum-title" onKeyDown={event => { if (isBack(event) && !event.defaultPrevented && !selected && !paused) { event.preventDefault(); event.stopPropagation(); onExit(); } }}>
    <header className={styles.header}><div><p>Archives du clan · reconstitutions</p><h1 id="mausoleum-title">Mausolée des Grandes Chasses</h1></div><button type="button" disabled={!!selected || paused} onClick={onExit}>← {source === "menu" ? "Retour au menu" : "Retour à la cité"}</button></header>
    <nav className={styles.galleries} aria-label="Galeries du mausolée" inert={!!selected || paused}>{MAUSOLEUM_GALLERIES.map(entry => {
      const allowed = canVisitMausoleumGallery(access, entry.id);
      return <button key={entry.id} type="button" aria-pressed={gallery === entry.id} disabled={!allowed} title={allowed ? entry.description : `Accès requis : ${entry.requiredRank}`} onClick={() => { setGallery(entry.id); setPage(0); resetPosition(90); }}>{entry.name}{!allowed ? ` · ${entry.requiredRank}` : ""}</button>;
    })}</nav>
    <div className={styles.scene} ref={scene} tabIndex={0} role="region" aria-label={`Galerie physique · ${galleryLabel}`} data-mausoleum-x={Math.round(x)} onKeyDown={onKeyDown} onKeyUp={onKeyUp} onBlur={event => { if (event.target === event.currentTarget || !event.currentTarget.contains(event.relatedTarget as Node | null)) stopMovement(); }} inert={!!selected || paused}>
      <img className={styles.hall} src="/game/homeworld/v56/mausoleum-hall.png" alt="" draggable={false} />
      <div className={styles.wall}><span>LE MUR DES CHASSES</span><p>{entries.map(entry => entry.title).join(" · ") || "Archives temporelles · contenu à produire"}</p></div>
      {visible.map((entry, index) => <button type="button" key={entry.id} className={styles.pedestal} style={{ left: `${positions[index] / 9}%` }} aria-label={`Approcher le piédestal ${entry.title}`} data-mausoleum-pedestal={entry.id} data-mausoleum-dlc={entry.id} data-dlc-state={mausoleumDlcState(entry.id)} onClick={() => { stopMovement(); target.current = positions[index]; scene.current?.focus(); }}>
        <img className={styles.stone} src="/game/homeworld/v56/mask-pedestal.png" alt="" draggable={false} />
        <span className={styles.masks}>{entry.masks.map(item => item.src ? <img key={item.id} src={item.src} alt={item.name} draggable={false} data-mausoleum-mask={item.id} /> : <span className={styles.missingMask} key={item.id} title={item.note}>Archive scellée</span>)}</span>
        <span className={styles.caption}><strong>{entry.title}</strong><small>Campagne à produire</small>{progress.consultedIds.includes(entry.id) && <em>Dossier étudié</em>}</span>
      </button>)}
      <span className={styles.actorAnchor} style={{ left: `${x / 9}%` }} data-mausoleum-actor><HomeworldModularHunter morphId={save?.appearance.bodyMorphId ?? "classic"} dreadStyleId={save?.appearance.dreadStyleId ?? "classic"} appearance={save?.appearance} className={styles.hunterBody} /></span>
      <div className={styles.prompt}>{nearest ? <button type="button" onClick={examine}>{save ? controlActionShortcut("hunt.interact", save.settings.controlBindings) : "Entrée"} · Examiner {nearest.title}</button> : <p>Approche un piédestal · {save ? `${controlActionShortcut("hunt.moveLeft", save.settings.controlBindings)} / ${controlActionShortcut("hunt.moveRight", save.settings.controlBindings)}` : "flèches"} ou toucher</p>}</div>
    </div>
    <footer className={styles.footer} inert={!!selected || paused}><div><button type="button" disabled={page === 0} onClick={() => { setPage(value => value - 1); resetPosition(90); }}>← Alcôves</button><span>{galleryLabel} · {page + 1}/{Math.max(1, Math.ceil(entries.length / 3))}</span><button type="button" disabled={(page + 1) * 3 >= entries.length} onClick={() => { setPage(value => value + 1); resetPosition(90); }}>Alcôves →</button></div><p>{access.preview ? "Visite du catalogue sans charger ni modifier une partie. Le rituel d’étude nécessite un chasseur Young Blood." : "Les études du dossier sont sauvegardées ; elles ne terminent jamais un DLC."}</p><small>Architecture et dispositif d’archives : interprétation originale du projet. Les reproductions visibles ne sont pas certifiées 1:1.</small></footer>
    {selected && <div className={styles.backdrop} inert={paused}><div className={styles.dossier} role="dialog" aria-modal="true" aria-labelledby="mausoleum-dossier-title" ref={dialog} tabIndex={-1} onKeyDown={onDialogKey}>
      <p className={styles.eyebrow}>{phase ? MAUSOLEUM_PHASE_LABELS[phase] : "EXAMINER LA CHASSE"}</p><h2 id="mausoleum-dossier-title">{selected.title}</h2>
      <div className={styles.inspect} data-ritual-pose={phase ?? "inspect"}>{displayedMask?.src ? <img src={displayedMask.src} alt={`${displayedMask.name} · reproduction d’étude`} draggable={false} /> : <p>{displayedMask?.note}</p>}</div>
      <p>{displayedMask?.name} · {selected.era}</p>
      {!phase && selected.masks.length > 1 && <div className={styles.maskChoices}>{selected.masks.map((item, index) => <button type="button" key={item.id} aria-pressed={maskIndex === index} onClick={() => setMaskIndex(index)}>{item.name}</button>)}</div>}
      {(!phase || phase === "archive") && <><p>{selected.summary}</p><ul>{selected.archive.map(value => <li key={value}>{value}</li>)}</ul><p className={styles.lore}>Données tactiques, capteurs, témoignages et scans peuvent servir à une reconstitution. Ton chasseur ne devient pas littéralement la proie. Ce dispositif de consultation est une adaptation du projet, pas une technologie déclarée canonique.</p><p className={styles.unavailable}>{selected.unavailableReason}</p></>}
      <p role="status" aria-live="polite">{notice}</p>{notice && <button type="button" onClick={close}>Quitter sans enregistrer cette consultation</button>}
      <div className={styles.actions}>{!phase ? <><button type="button" disabled={!displayedMask?.src || !canConsultMausoleum(access, selected.id)} onClick={() => { readArchive.current = false; ritualClock.current.reset(); setPhase("take"); }}>Revêtir une reproduction d’étude</button><button type="button" disabled title={selected.unavailableReason}>Lancer la chronique · non installée</button><button type="button" onClick={close}>Reposer / fermer</button></> : <button type="button" onClick={remove} disabled={phase === "remove" || phase === "replace"}>{phase === "archive" ? "Retirer le masque et revenir" : "Interrompre le rituel"}</button>}</div>
      <p className={styles.lore}>Visualisation animée du masque en 2D. La cinématique corporelle de saisie et de port, ainsi que l’examen 3D, restent à produire.</p>
      {!phase && !canConsultMausoleum(access, selected.id) && <p>Étude rituelle : rang Young Blood et galerie autorisée requis. La visite ne change jamais le rang.</p>}
    </div></div>}
  </section>;
}
