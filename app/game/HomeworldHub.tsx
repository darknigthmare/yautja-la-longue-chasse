"use client";

/* eslint-disable @next/next/no-img-element -- local transparent whole-character plates and game props */

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { controlActionShortcut } from "./controlBindingLabels";
import { matchesControlAction, type ControlActionId } from "./systems/controlBindings";
import { shipForId, type ShipId } from "./shipCatalogue";
import type { SaveGame } from "./types";
import {
  HOMEWORLD_WORLD, HOMEWORLD_DISTRICTS, HOMEWORLD_PROPS, homeworldHeroPlate,
  HOMEWORLD_NPCS, HOMEWORLD_EVIDENCE, HOMEWORLD_REGIONS, HOMEWORLD_WITNESS_CHOICES,
  createHomeworldActor, stepHomeworldActor, nearestHomeworldPoint, nearestHomeworldDoor,
  districtAtHomeworldActor, applyHomeworldAction, shouldFadeHomeworldForeground,
  type HomeworldAction, type HomeworldPoint, type HomeworldProgress,
  type HomeworldService, type HomeworldWitnessChoice, type HomeworldPlayableRegionId,
} from "./systems/homeworld";
import HomeworldCityScene from "./HomeworldCityScene";
import styles from "./HomeworldCity.module.css";

export interface HomeworldHubProps {
  save: SaveGame;
  selectedShipId: ShipId;
  suspended: boolean;
  /** Return false when durable saving failed; no local success is then announced. */
  onProgress(next: HomeworldProgress): boolean;
  onService(service: HomeworldService): void;
  onReturnShip(): void;
  onExpedition?(id: HomeworldPlayableRegionId): void;
  onNotify(message: string): void;
}

export default function HomeworldHub({ save, selectedShipId, suspended, onProgress, onService, onReturnShip, onExpedition, onNotify }: HomeworldHubProps) {
  const [actor, setActor] = useState(createHomeworldActor);
  const actorRef = useRef(actor);
  const [phase, setPhase] = useState(0);
  const [viewportSize, setViewportSize] = useState({ width: 1000, height: 580 });
  const [paused, setPaused] = useState(false);
  const [inactive, setInactive] = useState(false);
  const [dialog, setDialog] = useState<{ point: HomeworldPoint | null; message?: string } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const viewportRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const held = useRef(new Set<string>());
  const touch = useRef({ left: false, right: false, up: false, down: false, jump: false });
  const progressRef = useRef(save.homeworld);
  const saveRef = useRef(save);
  const suspendedRef = useRef(suspended);
  const pausedRef = useRef(paused || inactive);
  const dialogStateRef = useRef(dialog);
  const visitedAttempt = useRef<string | null>(null);
  const bindings = save.settings.controlBindings;
  const district = districtAtHomeworldActor(actor);
  const nearest = nearestHomeworldPoint(actor);
  const cameraX = Math.max(0, Math.min(HOMEWORLD_WORLD.width - viewportSize.width, actor.x - viewportSize.width * .5));
  const cameraY = Math.max(0, Math.min(HOMEWORLD_WORLD.height - viewportSize.height, actor.y - viewportSize.height * .62));
  const progress = save.homeworld;
  const blocked = suspended || paused || inactive || !!dialog;

  useEffect(() => { progressRef.current = save.homeworld; saveRef.current = save; }, [save]);
  useEffect(() => { suspendedRef.current = suspended; }, [suspended]);
  useEffect(() => { pausedRef.current = paused || inactive; }, [paused, inactive]);
  useEffect(() => { dialogStateRef.current = dialog; }, [dialog]);

  const clearInputs = useCallback(() => {
    held.current.clear();
    touch.current = { left: false, right: false, up: false, down: false, jump: false };
  }, []);

  const persistAction = useCallback((action: HomeworldAction, announce = true) => {
    const currentSave = saveRef.current;
    const result = applyHomeworldAction(progressRef.current, action, { rankId: currentSave.profile.rankId, ownedTrophyCount: currentSave.trophies.length });
    if (result.changed && !onProgress(result.progress)) {
      const message = "Sauvegarde impossible : cette action n’a pas été enregistrée. Réessaie avant de quitter la cité.";
      setAnnouncement(message);
      onNotify(message);
      return { ok: false, message };
    }
    if (result.changed) progressRef.current = result.progress;
    if (announce) { setAnnouncement(result.message); onNotify(result.message); }
    return { ok: result.ok, message: result.message };
  }, [onNotify, onProgress]);

  const closeDialog = useCallback(() => {
    setDialog(null);
    clearInputs();
    requestAnimationFrame(() => viewportRef.current?.focus({ preventScroll: true }));
  }, [clearInputs]);

  const interact = useCallback(() => {
    if (suspendedRef.current || pausedRef.current || dialogStateRef.current) return;
    const point = nearestHomeworldPoint(actorRef.current);
    if (!point) return;
    clearInputs();
    let message: string | undefined;
    if (point.npcId) {
      const greeting = persistAction({ type: "greet", npcId: point.npcId }, false);
      message = greeting.message;
      if (!greeting.ok) { setDialog({ point, message }); return; }
    }
    if (point.kind === "evidence" && point.evidenceId) message = persistAction({ type: "inspect", evidenceId: point.evidenceId }).message;
    setDialog({ point, message });
  }, [clearInputs, persistAction]);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const observer = new ResizeObserver(entries => {
      const rect = entries[0]?.contentRect;
      if (rect) setViewportSize({ width: rect.width, height: rect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (blocked) clearInputs();
  }, [blocked, clearInputs]);

  useEffect(() => {
    const blur = () => { clearInputs(); setInactive(true); };
    const visibility = () => { if (document.hidden) blur(); };
    const keyup = (event: globalThis.KeyboardEvent) => held.current.delete(event.code);
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("keyup", keyup);
    return () => { window.removeEventListener("blur", blur); document.removeEventListener("visibilitychange", visibility); window.removeEventListener("keyup", keyup); };
  }, [clearInputs]);

  useEffect(() => {
    if (!dialog) return;
    const frame = requestAnimationFrame(() => dialogRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [dialog]);

  // One clock drives movement. Keys, pointer holds and the gamepad share the
  // same collision model; no input can advance a hidden or suspended surface.
  useEffect(() => {
    let request = 0;
    let previous = 0;
    let renderedAt = 0;
    let jumpWasPressed = false;
    let confirmWasPressed = false;
    let cancelWasPressed = false;
    let menuDirectionWasPressed = false;
    let pauseWasPressed = false;
    let clock = 0;
    const keyboardHeld = (action: ControlActionId) => [...held.current].some(code => matchesControlAction(action, code, bindings));
    const frame = (time: number) => {
      const dt = previous ? Math.min((time - previous) / 1000, 1 / 30) : 0;
      previous = time;
      const ownsFocus = !!rootRef.current?.contains(document.activeElement);
      const pad = ownsFocus && !document.hidden ? [...(navigator.getGamepads?.() ?? [])].find(value => value?.connected) : null;
      const button = (index: number) => !!pad?.buttons[index]?.pressed;
      const confirm = button(0);
      const cancel = button(1);
      const pausePressed = button(9);
      const menuDown = button(13) || (pad?.axes[1] ?? 0) > .5;
      const menuUp = button(12) || (pad?.axes[1] ?? 0) < -.5;
      const menuDirectionPressed = menuDown || menuUp;
      if (pausePressed && !pauseWasPressed && !suspendedRef.current && !dialogStateRef.current) {
        setPaused(value => !value); setInactive(false); clearInputs();
      }
      pauseWasPressed = pausePressed;
      if (!suspendedRef.current && !pausedRef.current) {
        if (dialogStateRef.current) {
          const choices = [...(dialogRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [])];
          if (menuDirectionPressed && !menuDirectionWasPressed && choices.length) {
            const selected = choices.indexOf(document.activeElement as HTMLButtonElement);
            choices[(selected + (menuDown ? 1 : -1) + choices.length) % choices.length]?.focus();
          }
          if (cancel && !cancelWasPressed) closeDialog();
          else if (confirm && !confirmWasPressed) {
            const selected = choices.find(choice => choice === document.activeElement);
            (selected ?? choices[0])?.click();
          }
        } else if (confirm && !confirmWasPressed) interact();
      }
      menuDirectionWasPressed = menuDirectionPressed;
      confirmWasPressed = confirm;
      cancelWasPressed = cancel;
      if (!suspendedRef.current && !pausedRef.current && !dialogStateRef.current && !document.hidden) {
        const padX = pad?.axes[0] ?? 0;
        const padY = pad?.axes[1] ?? 0;
        const left = keyboardHeld("hunt.moveLeft") || touch.current.left || button(14) || padX < -.22;
        const right = keyboardHeld("hunt.moveRight") || touch.current.right || button(15) || padX > .22;
        const up = keyboardHeld("hunt.moveUp") || touch.current.up || button(12) || padY < -.35;
        const down = keyboardHeld("hunt.moveDown") || touch.current.down || button(13) || padY > .35;
        const jump = keyboardHeld("hunt.jump") || touch.current.jump || button(2);
        const next = stepHomeworldActor(actorRef.current, { moveX: Number(right) - Number(left), climb: Number(down) - Number(up), jumpPressed: jump && !jumpWasPressed }, dt);
        jumpWasPressed = jump;
        actorRef.current = next;
        clock += dt;
        const entered = districtAtHomeworldActor(next);
        if (entered && visitedAttempt.current !== entered.id) {
          visitedAttempt.current = entered.id;
          persistAction({ type: "visit", districtId: entered.id }, false);
        }
        if (time - renderedAt >= 1000 / 30) { setActor(next); setPhase(clock); renderedAt = time; }
      } else jumpWasPressed = false;
      request = requestAnimationFrame(frame);
    };
    request = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(request);
  }, [bindings, clearInputs, closeDialog, interact, persistAction]);

  const onWorldKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== viewportRef.current || blocked || event.altKey || event.ctrlKey || event.metaKey) return;
    const movement: ControlActionId[] = ["hunt.moveLeft", "hunt.moveRight", "hunt.moveUp", "hunt.moveDown"];
    if (movement.some(action => matchesControlAction(action, event.nativeEvent, bindings))) {
      event.preventDefault(); event.stopPropagation(); held.current.add(event.code);
    } else if (matchesControlAction("hunt.interact", event.nativeEvent, bindings)) {
      event.preventDefault(); event.stopPropagation(); if (!event.repeat) interact();
    }
  };

  const touchButton = (key: keyof typeof touch.current, label: string, glyph: string) => {
    const release = (event: PointerEvent<HTMLButtonElement>) => {
      touch.current[key] = false;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    };
    return <button type="button" aria-label={label} disabled={blocked}
      onPointerDown={event => { event.preventDefault(); if (blocked) return; event.currentTarget.setPointerCapture(event.pointerId); touch.current[key] = true; }}
      onPointerUp={release} onPointerCancel={release} onLostPointerCapture={() => { touch.current[key] = false; }}
      onKeyDown={event => { if (event.code === "Space" || event.code === "Enter") { event.preventDefault(); touch.current[key] = true; } }}
      onKeyUp={event => { if (event.code === "Space" || event.code === "Enter") { event.preventDefault(); touch.current[key] = false; } }}
      onBlur={() => { touch.current[key] = false; }}>{glyph}</button>;
  };

  const dialogKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeDialog(); return; }
    if (event.key !== "Tab") return;
    const buttons = [...(dialogRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [])];
    if (!buttons.length) { event.preventDefault(); return; }
    const first = buttons[0]; const last = buttons[buttons.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) { event.preventDefault(); first.focus(); }
  };

  const chooseWitness = (choice: HomeworldWitnessChoice) => {
    const result = persistAction({ type: "choose-witness", choice });
    setDialog(current => current ? { ...current, message: result.message } : current);
  };

  const selectedPoint = dialog?.point;
  const selectedNpc = HOMEWORLD_NPCS.find(npc => npc.id === selectedPoint?.npcId);
  const selectedRegion = HOMEWORLD_REGIONS.find(region => region.id === selectedPoint?.regionId);
  const canChoose = progress.evidenceIds.length === HOMEWORLD_EVIDENCE.length && !progress.witnessChoice;
  const title = selectedNpc?.name ?? selectedPoint?.label ?? "La Couronne de Cendres";
  const heroPlate = homeworldHeroPlate(save.appearance.presetId);
  const actorSpeed = Math.hypot(actor.vx, actor.vy);
  const heroBob = actorSpeed > 5 ? Math.sin(phase * 11) * 1.5 : 0;
  const activeDoorId = nearestHomeworldDoor(actor)?.id ?? null;
  const fadedFrontPropIds = HOMEWORLD_PROPS
    .filter((prop) => shouldFadeHomeworldForeground(prop, actor))
    .map((prop) => prop.id)
    .join("|");

  return <section ref={rootRef} className={styles.hub} aria-label="Homeworld — Cité des Premiers Trophées" data-homeworld-hub="true">
    <header className={styles.header}>
      <div><div className={styles.eyebrow}>Yautja Prime · Monde natal</div><h2>La Cité des Premiers Trophées</h2><p>Une cité de clans et de serments. Ton vaisseau reste ta demeure.</p></div>
      <button type="button" onClick={() => { clearInputs(); setPaused(value => !value); }}>{paused ? "Reprendre" : "Pause"}</button>
    </header>
    <div ref={viewportRef} className={styles.viewport} tabIndex={0} role="group" aria-label="Cité jouable en perspective 2.5D" aria-describedby="homeworld-controls"
      onKeyDown={onWorldKey} onBlur={clearInputs} onPointerDown={event => { if (event.target === event.currentTarget || event.target instanceof HTMLElement && !event.target.closest("button")) viewportRef.current?.focus({ preventScroll: true }); }}>
      <div className={styles.sky} aria-hidden="true" /><div className={styles.distant} aria-hidden="true" style={{ transform: `translate(${-cameraX * .018}px,${-cameraY * .025}px)` }} />
      <div className={styles.world} aria-hidden="true" style={{ width: HOMEWORLD_WORLD.width, height: HOMEWORLD_WORLD.height, transform: `translate(${-cameraX}px,${-cameraY}px)` }}>
        <HomeworldCityScene selectedShipId={selectedShipId} activeDoorId={activeDoorId} fadedFrontPropIds={fadedFrontPropIds} trophies={save.trophies} />
        <div className={styles.hero} data-homeworld-actor="true" data-x={Math.round(actor.x)} data-y={Math.round(actor.y)} data-moving={actorSpeed > 5} data-facing={actor.facing} style={{ transform: `translate(${actor.x}px,${actor.y + heroBob}px)`, zIndex: Math.round(actor.y) }}>
          <img
            className={styles.heroPlate}
            src={heroPlate.src}
            alt=""
            draggable={false}
            data-whole-character-plate="true"
            data-exact-preset={heroPlate.exactPreset}
            data-plate-id={heroPlate.plateId}
            data-asset-status={heroPlate.status}
            data-provenance-status={heroPlate.provenanceStatus}
          />
          <i className={styles.heroMark} />
        </div>
      </div>
      <div className={styles.haze} aria-hidden="true" /><div className={styles.foreground} style={{ left: -30 }} aria-hidden="true" /><div className={styles.foreground} style={{ right: -45 }} aria-hidden="true" />
      <div className={styles.location}><strong>{district?.name ?? "Passerelle de liaison"}</strong><span>{district?.description ?? "Les rues obliques et les passages publics relient les cours de la cité."}</span></div>
      <div className={styles.minimap} role="img" aria-label={`Plan de la cité : ${progress.visitedDistrictIds.length} quartiers visités sur ${HOMEWORLD_DISTRICTS.length}. Position : ${district?.name ?? "liaison"}.`}>
        {HOMEWORLD_DISTRICTS.map(entry => <i key={entry.id} className={styles.mapDistrict} data-visited={progress.visitedDistrictIds.includes(entry.id)} style={{ left: `${entry.x / HOMEWORLD_WORLD.width * 100}%`, top: `${entry.y / HOMEWORLD_WORLD.height * 100}%`, width: `${entry.width / HOMEWORLD_WORLD.width * 100}%`, height: `${entry.height / HOMEWORLD_WORLD.height * 100}%` }} />)}
        <i className={styles.mapActor} style={{ left: `${actor.x / HOMEWORLD_WORLD.width * 100}%`, top: `${actor.y / HOMEWORLD_WORLD.height * 100}%` }} />
      </div>
      {nearest && !blocked && <button className={styles.prompt} type="button" onClick={interact}><kbd>{controlActionShortcut("hunt.interact", bindings)} / A</kbd>{nearest.label}</button>}
      {(paused || inactive || suspended) && !dialog && <div className={styles.pause}><strong>{suspended ? "Cité suspendue" : "Exploration en pause"}</strong>{!suspended && <button type="button" onClick={() => { setPaused(false); setInactive(false); viewportRef.current?.focus({ preventScroll: true }); }}>Reprendre l’exploration</button>}</div>}
    </div>
    <div className={styles.touch} aria-label="Commandes tactiles">
      <div className={styles.touchGroup}>{touchButton("left", "Marcher à gauche", "←")}{touchButton("right", "Marcher à droite", "→")}</div>
      <div className={styles.touchGroup}>{touchButton("up", "Marcher vers le fond", "↑")}{touchButton("down", "Marcher vers l’avant", "↓")}<button type="button" aria-label="Interagir avec le point proche" disabled={blocked || !nearest} onClick={interact}>◉</button></div>
    </div>
    <footer className={styles.footer}><div className={styles.progress}><strong>{progress.audienceOutcome ? "Première audience accomplie" : "Dossier introductif · Le trophée contesté"}</strong><span>{progress.visitedDistrictIds.length}/{HOMEWORLD_DISTRICTS.length} quartiers · {progress.evidenceIds.length}/{HOMEWORLD_EVIDENCE.length} preuves · {progress.greetedNpcIds.length} rencontres{progress.expeditions["ash-marches"] ? " · Convoi retrouvé" : ""}{progress.expeditions["glass-desert"] ? " · Détournement documenté" : ""}</span></div>
      <button type="button" onClick={() => { clearInputs(); setDialog({ point: null }); }}>Journal de la cité</button>
    </footer>
    <div id="homeworld-controls" className={styles.help}>Clique dans la cité pour jouer. Marche libre <kbd>{controlActionShortcut("hunt.moveLeft", bindings)}</kbd> / <kbd>{controlActionShortcut("hunt.moveRight", bindings)}</kbd> / <kbd>{controlActionShortcut("hunt.moveUp", bindings)}</kbd> / <kbd>{controlActionShortcut("hunt.moveDown", bindings)}</kbd> · Interaction <kbd>{controlActionShortcut("hunt.interact", bindings)}</kbd>. Manette : stick / croix, A interaction, B fermer. Les services publics sont reliés au sol : aucun saut ni ascenseur obligatoire. Les Marches de Cendre et le Désert de Verre proposent deux enquêtes jouables. Les huit autres régions et la campagne complète restent à produire.</div>
    <div className={styles.srOnly} aria-live="polite" aria-atomic="true">{announcement}</div>
    {dialog && <div className={styles.backdrop}>
      <div ref={dialogRef} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="homeworld-dialog-title" tabIndex={-1} onKeyDown={dialogKey}>
        <div className={styles.eyebrow}>{selectedNpc?.role ?? (selectedPoint?.kind === "region" ? selectedRegion?.status === "playable-introduction" ? selectedRegion.name + " · enquête régionale" : "Frontière du territoire · niveau non livré" : "La Couronne de Cendres")}</div>
        <h3 id="homeworld-dialog-title">{title}</h3>
        {selectedPoint ? <>
          {selectedNpc && <p>« {selectedNpc.greeting} »</p>}
          <p>{selectedPoint.description}</p>
          {selectedPoint.kind === "ship" && <p>Le {shipForId(selectedShipId).name} t’attend aux quais. L’armurerie, les trophées et les pièces de ton vaisseau personnel restent accessibles.</p>}
          {selectedRegion && <><p>{selectedRegion.description}</p><div className={styles.notice}>
            {selectedRegion.status === "playable-introduction"
              ? selectedRegion.id === "glass-desert"
                ? "Deuxième enquête jouable : plaques vitrifiées, fouisseur sensible aux vibrations, corniches ou leurres, site abandonné et balise de rabattage. Choix conservés après retour enregistré ; l’acte II reste à développer."
                : "Première sortie jouable : pistes dans la cendre, passage supérieur, brouteur territorial et convoi disparu. Le rapport est conservé après retour en navette. Cette sortie ne termine pas tout l’acte I."
              : "Territoire prévu par la conversation source. Son niveau et ses rencontres restent à produire. Cette porte ne lance aucune mission d’une autre planète."}
            {selectedRegion.id === "ash-marches" && !progress.evidenceIds.includes("suspect-trophy") && <p>Inspecte d’abord le trophée du convoi, juste à côté de cette porte.</p>}
            {selectedRegion.id === "glass-desert" && !progress.expeditions["ash-marches"] && <p>Remets d’abord le rapport complet des Marches à sa navette. Le Désert exige ce rapport durable ; aucun résultat THE PIT n’est requis.</p>}
          </div></>}
          {selectedPoint.kind === "audience" && <p>Présente les trois preuves et prends position sur le sort du témoin avant l’audience. Cette première décision est conservée dans ta sauvegarde ; elle ne termine pas toute la campagne.</p>}
          {selectedPoint.evidenceId === "undercity-testimony" && canChoose && <><div className={styles.notice}>Les trois preuves sont réunies. Ta première position sur le témoin sera définitive pour cette introduction.</div>{HOMEWORLD_WITNESS_CHOICES.map(choice => <div key={choice.id}><p>{choice.description}</p><button type="button" onClick={() => chooseWitness(choice.id)}>{choice.label}</button></div>)}</>}
        </> : <>
          <p>Un trophée contesté est arrivé dans la cité. Examine sa provenance, consulte le registre des mémoires puis écoute le témoignage des Bas-Fonds.</p>
          {progress.expeditions["ash-marches"] && <p>✓ Rapport de terrain : vraie piste identifiée, fausse piste écartée, convoi retrouvé et passage rouvert.{progress.expeditions["ash-marches"].secretFound ? " Balise des Navigateurs découverte." : ""}</p>}
          {progress.expeditions["glass-desert"] && <p>✓ Rapport du Désert : journal de transit et balise de rabattage concordants. Traversée {progress.expeditions["glass-desert"].crossingRoute === "stepping-stones" ? "par les corniches" : "par diversion du fouisseur"} ; canal {progress.expeditions["glass-desert"].beaconDisposition === "preserve" ? "conservé pour l’enquête" : "coupé pour arrêter l’attraction locale"}.{progress.expeditions["glass-desert"].secretFound ? " Composant ancien documenté." : ""} Aucun coupable n’est encore désigné.</p>}
          <ul>{HOMEWORLD_EVIDENCE.map(evidence => <li key={evidence.id}>{progress.evidenceIds.includes(evidence.id) ? "✓ " : "○ "}{evidence.label}</li>)}</ul>
          <p>{progress.audienceOutcome ? "Ton audience a été enregistrée. Tu peux encore explorer la cité et rencontrer ses habitants." : progress.witnessChoice ? "Ta position sur le témoin est enregistrée. Rejoins la Citadelle pour la première audience." : canChoose ? "Retourne auprès du témoin des Bas-Fonds pour choisir ta position, puis rejoins la Citadelle." : "Les cours, passages et rampes obliques forment un seul réseau au sol. Approche les portes éclairées pour repérer leurs seuils."}</p>
          <div className={styles.notice}>Livré : cité parcourable, rencontres, dossier introductif et deux enquêtes régionales (Marches de Cendre, Désert de Verre). À produire : huit autres régions et campagne complète La Couronne de Cendres. Les noms de cité, habitants et organisations sont des créations originales pour le jeu, pas des faits de canon.</div>
        </>}
        {dialog.message && <div className={styles.notice} role="status">{dialog.message}</div>}
        <div className={styles.dialogActions}>
          {selectedRegion?.id === "ash-marches" && onExpedition && <button type="button" className={styles.primary}
            disabled={!progress.evidenceIds.includes("suspect-trophy")}
            onClick={() => { closeDialog(); onExpedition("ash-marches"); }}>Partir vers les Marches de Cendre</button>}
          {selectedRegion?.id === "glass-desert" && onExpedition && <button type="button" className={styles.primary}
            disabled={!progress.expeditions["ash-marches"]}
            onClick={() => { closeDialog(); onExpedition("glass-desert"); }}>Partir vers le Désert de Verre</button>}
          {selectedPoint?.kind === "ship" && <button type="button" className={styles.primary} onClick={onReturnShip}>Monter à bord</button>}
          {selectedPoint?.service && <button type="button" className={styles.primary} onClick={() => { const service = selectedPoint.service; if (service) { closeDialog(); onService(service); } }}>Accéder au service</button>}
          {selectedPoint?.kind === "audience" && !progress.audienceOutcome && <button type="button" className={styles.primary} onClick={() => { const result = persistAction({ type: "audience" }); setDialog(current => current ? { ...current, message: result.message } : current); }}>Présenter mon dossier</button>}
          <button type="button" onClick={closeDialog}>Revenir à la cité</button>
        </div>
      </div>
    </div>}
  </section>;
}
