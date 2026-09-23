"use client";

/* eslint-disable @next/next/no-img-element -- local transparent whole-character plates and game props */

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { controlActionShortcut } from "./controlBindingLabels";
import { getChronicleRank } from "./systems/clanChronicle";
import { matchesControlAction, type ControlActionId } from "./systems/controlBindings";
import { shipForId, type ShipId } from "./shipCatalogue";
import type { SaveGame } from "./types";
import {
  HOMEWORLD_WORLD, HOMEWORLD_DISTRICTS, HOMEWORLD_PROPS, homeworldHeroPlate,
  HOMEWORLD_NPCS, HOMEWORLD_EVIDENCE, HOMEWORLD_REGIONS, HOMEWORLD_WITNESS_CHOICES,
  createHomeworldActor, stepHomeworldActor, nearestHomeworldPoint, nearestHomeworldDoor,
  districtAtHomeworldActor, applyHomeworldAction, shouldFadeHomeworldForeground, homeworldInquiryJournal, homeworldInquiryDialogue,
  type HomeworldAction, type HomeworldPoint, type HomeworldProgress, type HomeworldInquiryAction,
  type HomeworldService, type HomeworldWitnessChoice, type HomeworldPlayableRegionId,
} from "./systems/homeworld";
import { createHomeworldGamepadState, stepHomeworldGamepad, nextHomeworldDialogChoice } from "./systems/homeworldInput";
import HomeworldCityScene from "./HomeworldCityScene";
import HomeworldModularHunter from "./HomeworldModularHunter";
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
  const pendingVisitsRef = useRef(new Set<string>());
  const pendingVisitOwnerRef = useRef(save.createdAt);
  const [pendingVisitCount, setPendingVisitCount] = useState(0);
  const gamepadStateRef = useRef(createHomeworldGamepadState());
  const bindings = save.settings.controlBindings;
  const district = districtAtHomeworldActor(actor);
  const nearest = nearestHomeworldPoint(actor);
  const cameraX = Math.max(0, Math.min(HOMEWORLD_WORLD.width - viewportSize.width, actor.x - viewportSize.width * .5));
  const cameraY = Math.max(0, Math.min(HOMEWORLD_WORLD.height - viewportSize.height, actor.y - viewportSize.height * .62));
  const progress = save.homeworld;
  const youthWelcome = Boolean(save.prologue) && !["blooded", "elite", "elder", "ancient"].includes(getChronicleRank(save.prologue?.chronicle) ?? "");
  const blocked = suspended || paused || inactive || !!dialog;

  useEffect(() => {
    // GameClient also keys this component by createdAt. Keep the local queue
    // isolated even if another caller reuses the instance for a different save.
    if (pendingVisitOwnerRef.current !== save.createdAt) {
      pendingVisitsRef.current.clear(); pendingVisitOwnerRef.current = save.createdAt;
      visitedAttempt.current = null; setPendingVisitCount(0);
    }
    progressRef.current = save.homeworld; saveRef.current = save;
  }, [save]);
  useEffect(() => { suspendedRef.current = suspended; }, [suspended]);
  useEffect(() => { pausedRef.current = paused || inactive; }, [paused, inactive]);
  useEffect(() => { dialogStateRef.current = dialog; }, [dialog]);

  const clearInputs = useCallback(() => {
    held.current.clear();
    gamepadStateRef.current = createHomeworldGamepadState();
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

  // Only IDs reached by the actual city actor enter this retry queue. Failed
  // writes do not alter local progression, and no frame retries storage by itself.
  const persistVisit = useCallback((districtId: string) => {
    if (pendingVisitOwnerRef.current !== save.createdAt || saveRef.current.createdAt !== save.createdAt) return false;
    const result = persistAction({ type: "visit", districtId }, false);
    if (result.ok) pendingVisitsRef.current.delete(districtId);
    else pendingVisitsRef.current.add(districtId);
    setPendingVisitCount(pendingVisitsRef.current.size);
    return result.ok;
  }, [persistAction, save.createdAt]);

  const retryPendingVisits = useCallback(() => {
    if (suspendedRef.current || pendingVisitsRef.current.size === 0
      || pendingVisitOwnerRef.current !== save.createdAt || saveRef.current.createdAt !== save.createdAt) return;
    clearInputs();
    // Recompute each visit against the latest acknowledged progress. Stop after
    // the first refusal; keep it and the remaining visits available for retry.
    for (const districtId of [...pendingVisitsRef.current]) {
      if (!persistVisit(districtId)) return;
    }
    const message = "Visites de quartiers enregistrées.";
    setAnnouncement(message); onNotify(message);
    // The retry button disappears after success: retain useful keyboard/pad focus.
    (dialogStateRef.current ? dialogRef.current : viewportRef.current)?.focus({ preventScroll: true });
  }, [clearInputs, onNotify, persistVisit, save.createdAt]);

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
    if (point.npcId && !(youthWelcome && point.npcId === "terrace-instructor" && !progressRef.current.greetedNpcIds.includes("hunt-king"))) {
      const greeting = persistAction({ type: "greet", npcId: point.npcId }, false);
      message = greeting.message;
      if (!greeting.ok) { setDialog({ point, message }); return; }
    }
    if (!youthWelcome && point.kind === "evidence" && point.evidenceId) message = persistAction({ type: "inspect", evidenceId: point.evidenceId }).message;
    setDialog({ point, message });
  }, [clearInputs, persistAction, youthWelcome]);

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
    let clock = 0;
    const keyboardHeld = (action: ControlActionId) => [...held.current].some(code => matchesControlAction(action, code, bindings));
    const frame = (time: number) => {
      const dt = previous ? Math.min((time - previous) / 1000, 1 / 30) : 0;
      previous = time;
      const ownsFocus = !!rootRef.current?.contains(document.activeElement) && document.hasFocus();
      const active = ownsFocus && !document.hidden && !suspendedRef.current;
      const context = !active ? "inactive" : pausedRef.current ? "paused" : dialogStateRef.current ? "dialog" : "world";
      const pad = active ? [...(navigator.getGamepads?.() ?? [])].find(value => value?.connected) ?? null : null;
      const gamepad = stepHomeworldGamepad(gamepadStateRef.current, pad, context);
      gamepadStateRef.current = gamepad.state;
      if (gamepad.actions.pause) {
        setPaused(!pausedRef.current); setInactive(false); clearInputs();
      }
      if (!suspendedRef.current && !pausedRef.current) {
        if (dialogStateRef.current) {
          const choices = [...(dialogRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [])];
          if (gamepad.actions.menuDirection && choices.length) {
            const selected = choices.indexOf(document.activeElement as HTMLButtonElement);
            choices[nextHomeworldDialogChoice(selected, choices.length, gamepad.actions.menuDirection)]?.focus();
          }
          if (gamepad.actions.cancel) closeDialog();
          else if (gamepad.actions.confirm) {
            const selected = choices.find(choice => choice === document.activeElement);
            (selected ?? choices[0])?.click();
          }
        } else if (gamepad.actions.confirm) interact();
      }
      // Context-changing actions cannot move the actor in the same frame.
      const handledAction = gamepad.actions.pause || gamepad.actions.confirm || gamepad.actions.cancel;
      if (!suspendedRef.current && !pausedRef.current && !dialogStateRef.current && !document.hidden && !handledAction) {
        const left = keyboardHeld("hunt.moveLeft") || touch.current.left || gamepad.movement.left;
        const right = keyboardHeld("hunt.moveRight") || touch.current.right || gamepad.movement.right;
        const up = keyboardHeld("hunt.moveUp") || touch.current.up || gamepad.movement.up;
        const down = keyboardHeld("hunt.moveDown") || touch.current.down || gamepad.movement.down;
        const jump = keyboardHeld("hunt.jump") || touch.current.jump || gamepad.movement.jump;
        const next = stepHomeworldActor(actorRef.current, { moveX: Number(right) - Number(left), climb: Number(down) - Number(up), jumpPressed: jump && !jumpWasPressed }, dt);
        jumpWasPressed = jump;
        actorRef.current = next;
        clock += dt;
        const entered = districtAtHomeworldActor(next);
        if (entered && visitedAttempt.current !== entered.id) {
          visitedAttempt.current = entered.id;
          persistVisit(entered.id);
        }
        if (time - renderedAt >= 1000 / 30) { setActor(next); setPhase(clock); renderedAt = time; }
      } else jumpWasPressed = false;
      request = requestAnimationFrame(frame);
    };
    request = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(request);
  }, [bindings, clearInputs, closeDialog, interact, persistVisit]);

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

  const submitInquiry = useCallback((action: HomeworldInquiryAction) => {
    if (suspendedRef.current || pausedRef.current || saveRef.current.createdAt !== save.createdAt) return;
    const point = dialogStateRef.current?.point;
    const nearby = nearestHomeworldPoint(actorRef.current);
    // A stale dialog or remote call cannot submit a different NPC's evidence.
    if (!point?.npcId || nearby?.id !== point.id) return;
    const offered = homeworldInquiryDialogue(progressRef.current, point.npcId)?.options ?? [];
    if (!offered.some(option => JSON.stringify(option.action) === JSON.stringify(action))) return;
    clearInputs();
    const result = persistAction({ type: "counter-inquiry", action });
    setDialog(current => current ? { ...current, message: result.message } : current);
    requestAnimationFrame(() => dialogRef.current?.focus({ preventScroll: true }));
  }, [clearInputs, persistAction, save.createdAt]);

  const inquiryJournal = homeworldInquiryJournal(progress);
  const selectedPoint = dialog?.point;
  const selectedNpc = HOMEWORLD_NPCS.find(npc => npc.id === selectedPoint?.npcId);
  const inquiryDialogue = homeworldInquiryDialogue(progress, selectedPoint?.npcId);
  const selectedRegion = HOMEWORLD_REGIONS.find(region => region.id === selectedPoint?.regionId);
  const canChoose = progress.evidenceIds.length === HOMEWORLD_EVIDENCE.length && !progress.witnessChoice;
  const youthChiefMet = progress.greetedNpcIds.includes("hunt-king");
  const youthMentorMet = progress.greetedNpcIds.includes("terrace-instructor");
  const youthObjective = !youthChiefMet ? "Rejoins le chef du clan à la Citadelle, au nord-est de la cité, et parle-lui."
    : !youthMentorMet ? "Rejoins l’instructeur des terrasses, au centre de la cité, et parle-lui."
    : "Accueil et rencontre du mentor enregistrés. La formation du dojo, la première lame et le premier biomask restent à accomplir dans les prochains chapitres.";
  const youthGreeting: Record<string, string> = {
    "hunt-king": `${save.profile.hunterName}, ton arrivée a été annoncée. La force seule ne suffit pas à servir le clan. Observe, écoute, puis rends-toi auprès de l’instructeur des terrasses. Ton apprentissage commence.`,
    "terrace-instructor": youthChiefMet ? "Le chef t’a accueilli. Avant de chasser, tu apprendras à te placer, à retenir un coup et à reconnaître une proie digne. Repère cette cour : c’est ici que commencera ta formation." : "Présente-toi d’abord au chef du clan, dans la Citadelle au nord-est. Reviens me voir après cet accueil : nous parlerons de ta formation.",
    "dock-officer": "Ces appareils appartiennent au clan. Ta route commence dans la cité : le chef t’attend à la Citadelle, au nord-est.",
    "market-artisan": "Ton premier équipement viendra avec la formation. Observe les outils ; ils ne deviennent pas tiens par une simple visite.",
    "forge-artisan": "Une parure ne remplace pas l’apprentissage. Les commandes attendront les étapes de ta formation.",
    "clan-healer": "L’accueil vient d’abord. Pour l’instant, observe les lieux de soin du clan ; aucune infirmerie de vaisseau ne t’est attribuée.",
    "undercity-witness": "Les galeries relient les quartiers du clan. Prends le temps d’écouter leurs habitants avant de te croire prêt à chasser.",
    "memory-keeper": "Ici reposent les récits du clan. Les lire ne t’en attribue pas les exploits ; ta propre histoire commence seulement.",
    "enforcer-captain": "Les règles du clan s’apprennent avec la maîtrise. Le chef et l’instructeur guideront tes premiers pas.",
    "rite-keeper": "La nurserie est derrière toi. Aucun autre rite ne sera reconnu avant les épreuves qui lui appartiennent.",
    "arena-steward": "Le temps des arènes viendra après ta formation. Présente-toi d’abord au chef, puis à l’instructeur.",
  };
  const youthServiceLocked = youthWelcome && !!selectedPoint?.service && ["armory", "customization", "training", "medbay", "pit"].includes(selectedPoint.service);
  const title = youthWelcome && selectedNpc?.id === "hunt-king" ? "Accueil du chef du clan" : youthWelcome && selectedPoint?.kind === "ship" ? "Quais du clan" : selectedNpc?.name ?? selectedPoint?.label ?? "La Couronne de Cendres";
  const heroPlate = youthWelcome ? {
    src: "/game/prologue/v47/unblooded-player.png", exactPreset: false, plateId: "unblooded-player-v47",
    status: "authored-unblooded-still", provenanceStatus: "noncanonical-project-interpretation",
  } : homeworldHeroPlate(save.appearance.presetId);
  const actorSpeed = Math.hypot(actor.vx, actor.vy);
  const heroBob = actorSpeed > 5 ? Math.sin(phase * 11) * 1.5 : 0;
  const activeDoorId = nearestHomeworldDoor(actor)?.id ?? null;
  const fadedFrontPropIds = HOMEWORLD_PROPS
    .filter((prop) => shouldFadeHomeworldForeground(prop, actor))
    .map((prop) => prop.id)
    .join("|");

  return <section ref={rootRef} className={styles.hub} aria-label="Homeworld — Cité des Premiers Trophées" data-homeworld-hub="true">
    <header className={styles.header}>
      <div><div className={styles.eyebrow}>Yautja Prime · Monde natal</div><h2>La Cité des Premiers Trophées</h2><p>{youthWelcome ? "Ton accueil Unblooded : rencontre le clan et repère les lieux de ta future formation. Aucun vaisseau personnel avant le rite Blooded." : "Une cité de clans et de serments. Ton vaisseau reste ta demeure."}</p></div>
      <button type="button" onClick={() => { clearInputs(); setPaused(value => !value); }}>{paused ? "Reprendre" : "Pause"}</button>
    </header>
    <div ref={viewportRef} className={styles.viewport} tabIndex={0} role="group" aria-label="Cité jouable en perspective 2.5D" aria-describedby="homeworld-controls"
      onKeyDown={onWorldKey} onBlur={clearInputs} onPointerDown={event => { if (event.target === event.currentTarget || event.target instanceof HTMLElement && !event.target.closest("button")) viewportRef.current?.focus({ preventScroll: true }); }}>
      <div className={styles.sky} aria-hidden="true" /><div className={styles.distant} aria-hidden="true" style={{ transform: `translate(${-cameraX * .018}px,${-cameraY * .025}px)` }} />
      <div className={styles.world} aria-hidden="true" style={{ width: HOMEWORLD_WORLD.width, height: HOMEWORLD_WORLD.height, transform: `translate(${-cameraX}px,${-cameraY}px)` }}>
        <HomeworldCityScene youthWelcome={youthWelcome} selectedShipId={selectedShipId} activeDoorId={activeDoorId} fadedFrontPropIds={fadedFrontPropIds} trophies={save.trophies} />
        <div className={styles.hero} data-homeworld-actor="true" data-x={Math.round(actor.x)} data-y={Math.round(actor.y)} data-moving={actorSpeed > 5} data-facing={actor.facing} style={{ transform: `translate(${actor.x}px,${actor.y + heroBob}px)`, zIndex: Math.round(actor.y) }}>
          {!youthWelcome && heroPlate.status === "custom-modular-body" ? <HomeworldModularHunter className={styles.heroPlate}
            morphId={save.appearance.bodyMorphId} dreadStyleId={save.appearance.dreadStyleId} appearance={save.appearance} /> : <img
            className={styles.heroPlate}
            src={heroPlate.src}
            alt=""
            draggable={false}
            data-whole-character-plate="true"
            data-exact-preset={heroPlate.exactPreset}
            data-plate-id={heroPlate.plateId}
            data-asset-status={heroPlate.status}
            data-provenance-status={heroPlate.provenanceStatus}
          />}
          <i className={styles.heroMark} />
        </div>
      </div>
      <div className={styles.haze} aria-hidden="true" /><div className={styles.foreground} style={{ left: -30 }} aria-hidden="true" /><div className={styles.foreground} style={{ right: -45 }} aria-hidden="true" />
      <div className={styles.location}><strong>{district?.name ?? "Passerelle de liaison"}</strong><span>{youthWelcome && district?.id === "port" ? "Les convois et les navettes du clan animent les quais." : youthWelcome && district?.id === "forges" ? "Les artisans préparent les armes et les parures du clan." : district?.description ?? "Les rues obliques et les passages publics relient les cours de la cité."}</span></div>
      <div className={styles.minimap} role="img" aria-label={`Plan de la cité : ${progress.visitedDistrictIds.length} quartiers visités sur ${HOMEWORLD_DISTRICTS.length}. Position : ${district?.name ?? "liaison"}.`}>
        {HOMEWORLD_DISTRICTS.map(entry => <i key={entry.id} className={styles.mapDistrict} data-visited={progress.visitedDistrictIds.includes(entry.id)} style={{ left: `${entry.x / HOMEWORLD_WORLD.width * 100}%`, top: `${entry.y / HOMEWORLD_WORLD.height * 100}%`, width: `${entry.width / HOMEWORLD_WORLD.width * 100}%`, height: `${entry.height / HOMEWORLD_WORLD.height * 100}%` }} />)}
        <i className={styles.mapActor} style={{ left: `${actor.x / HOMEWORLD_WORLD.width * 100}%`, top: `${actor.y / HOMEWORLD_WORLD.height * 100}%` }} />
      </div>
      {nearest && !blocked && <button className={styles.prompt} type="button" onClick={interact}><kbd>{controlActionShortcut("hunt.interact", bindings)} / A</kbd>{youthWelcome && nearest.kind === "ship" ? "Quais du clan" : nearest.label}</button>}
      {(paused || inactive || suspended) && !dialog && <div className={styles.pause}><strong>{suspended ? "Cité suspendue" : "Exploration en pause"}</strong>{!suspended && <button type="button" onClick={() => { setPaused(false); setInactive(false); viewportRef.current?.focus({ preventScroll: true }); }}>Reprendre l’exploration</button>}</div>}
    </div>
    <div className={styles.touch} aria-label="Commandes tactiles">
      <div className={styles.touchGroup}>{touchButton("left", "Marcher à gauche", "←")}{touchButton("right", "Marcher à droite", "→")}</div>
      <div className={styles.touchGroup}>{touchButton("up", "Marcher vers le fond", "↑")}{touchButton("down", "Marcher vers l’avant", "↓")}<button type="button" aria-label="Interagir avec le point proche" disabled={blocked || !nearest} onClick={interact}>◉</button></div>
    </div>
    {youthWelcome && <section className={styles.notice} aria-label="Objectif d’accueil Unblooded" data-unblooded-objective={!youthChiefMet ? "chief" : !youthMentorMet ? "mentor" : "training-pending"}>
      <strong>Accueil du clan</strong><p>{youthObjective}</p><p>Approche le personnage puis utilise Interaction. Ces rencontres conservent uniquement la visite ; elles n’accordent ni formation, ni arme, ni biomask. Dialogues originaux adaptés pour ce jeu.</p>
    </section>}
    <footer className={styles.footer}><div className={styles.progress}><strong>{youthWelcome ? "Accueil Unblooded · Chef puis mentor" : inquiryJournal.step === "complete" ? "Contre-enquête remise à la cité" : inquiryJournal.step !== "locked" ? "Contre-enquête du convoi · " + inquiryJournal.completed + "/5" : progress.audienceOutcome ? "Première audience accomplie" : "Dossier introductif · Le trophée contesté"}</strong><span>{progress.visitedDistrictIds.length}/{HOMEWORLD_DISTRICTS.length} quartiers · {!youthWelcome && <>{progress.evidenceIds.length}/{HOMEWORLD_EVIDENCE.length} preuves · </>}{progress.greetedNpcIds.length} rencontres{progress.expeditions["ash-marches"] ? " · Convoi retrouvé" : ""}{progress.expeditions["glass-desert"] ? " · Détournement documenté" : ""}</span></div>
      <button type="button" onClick={() => { clearInputs(); setDialog({ point: null }); }}>{youthWelcome ? "Journal de l’accueil" : "Journal de la cité"}</button>
    </footer>
    {!youthWelcome && inquiryJournal.step !== "locked" && <div className={styles.help} data-homeworld-inquiry-step={inquiryJournal.step}><strong>{inquiryJournal.label}</strong> · {inquiryJournal.objective}</div>}
    {pendingVisitCount > 0 && <div className={styles.notice} role="status">
      <p>{pendingVisitCount} {pendingVisitCount === 1 ? "visite de quartier non enregistrée" : "visites de quartiers non enregistrées"}. Ces visites restent en attente tant que la cité reste ouverte.</p>
      <button type="button" className="ghost-button small" disabled={suspended} onClick={retryPendingVisits}>Réessayer l’enregistrement des visites</button>
    </div>}
    <div id="homeworld-controls" className={styles.help}>Clique dans la cité pour jouer. Marche libre <kbd>{controlActionShortcut("hunt.moveLeft", bindings)}</kbd> / <kbd>{controlActionShortcut("hunt.moveRight", bindings)}</kbd> / <kbd>{controlActionShortcut("hunt.moveUp", bindings)}</kbd> / <kbd>{controlActionShortcut("hunt.moveDown", bindings)}</kbd> · Interaction <kbd>{controlActionShortcut("hunt.interact", bindings)}</kbd>. Manette : stick / croix, A interaction, B fermer. Les services publics sont reliés au sol : aucun saut ni ascenseur obligatoire. {youthWelcome ? "Suis les objectifs de l’accueil. Les sorties, exercices du dojo et remises d’équipement viendront avec les étapes suivantes de ta formation." : "Les Marches de Cendre et le Désert de Verre proposent deux enquêtes jouables. Les huit autres régions et la campagne complète restent à produire."}</div>
    <div className={styles.srOnly} aria-live="polite" aria-atomic="true">{announcement}</div>
    {dialog && <div className={styles.backdrop}>
      <div ref={dialogRef} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="homeworld-dialog-title" tabIndex={-1} onKeyDown={dialogKey}>
        <div className={styles.eyebrow}>{selectedNpc?.role ?? (selectedPoint?.kind === "region" ? selectedRegion?.status === "playable-introduction" ? selectedRegion.name + " · enquête régionale" : "Frontière du territoire · niveau non livré" : "La Couronne de Cendres")}</div>
        <h3 id="homeworld-dialog-title">{title}</h3>
        {selectedPoint ? <>
          {selectedNpc && <p>« {youthWelcome && youthGreeting[selectedNpc.id] ? youthGreeting[selectedNpc.id] : selectedNpc.greeting} »</p>}
          {youthWelcome && ["hunt-king", "terrace-instructor"].includes(selectedNpc?.id ?? "") && <div className={styles.notice} data-unblooded-conversation={selectedNpc?.id}><p>{youthObjective}</p><p>Accueil original du clan, pas une preuve de formation. Les exercices du dojo et la remise d’équipement restent à produire.</p></div>}
          <p>{youthWelcome && selectedPoint.kind === "ship" ? "Appareils et transports du clan." : youthWelcome && selectedPoint.service ? "Lieu public du clan : les équipements et exercices sont remis aux étapes prévues de la formation." : youthWelcome && selectedPoint.npcId === "hunt-king" ? "Présente-toi au chef avant de rejoindre ton instructeur." : selectedPoint.description}</p>
          {selectedPoint.kind === "ship" && <p>{youthWelcome ? "Les appareils du clan occupent les quais. Ton propre vaisseau sera acquis après le rite Blooded ; l’accueil et la formation sur le Homeworld viennent d’abord." : <>Le {shipForId(selectedShipId).name} t’attend aux quais. L’armurerie, les trophées et les pièces de ton vaisseau personnel restent accessibles.</>}</p>}
          {selectedRegion && <><p>{selectedRegion.description}</p>{youthWelcome && <p>Les sorties restent fermées pendant cet accueil. La formation, le premier biomask et le repos aux baraquements précèdent la première sortie de jeunesse ; ces scènes restent à construire.</p>}<div className={styles.notice}>
            {selectedRegion.status === "playable-introduction"
              ? selectedRegion.id === "glass-desert"
                ? "Deuxième enquête jouable : plaques vitrifiées, fouisseur sensible aux vibrations, corniches ou leurres, site abandonné et balise de rabattage. Choix conservés après retour enregistré ; l’acte II reste à développer."
                : "Première sortie jouable : pistes dans la cendre, passage supérieur, brouteur territorial et convoi disparu. Le rapport est conservé après retour en navette. Cette sortie ne termine pas tout l’acte I."
              : "Territoire prévu par la conversation source. Son niveau et ses rencontres restent à produire. Cette porte ne lance aucune mission d’une autre planète."}
            {selectedRegion.id === "ash-marches" && !progress.evidenceIds.includes("suspect-trophy") && <p>Inspecte d’abord le trophée du convoi, juste à côté de cette porte.</p>}
            {selectedRegion.id === "glass-desert" && !progress.expeditions["ash-marches"] && <p>Remets d’abord le rapport complet des Marches à sa navette. Le Désert exige ce rapport durable ; aucun résultat THE PIT n’est requis.</p>}
          </div></>}
          {!youthWelcome && selectedPoint.kind === "audience" && <p>Présente les trois preuves et prends position sur le sort du témoin avant l’audience. Cette première décision est conservée dans ta sauvegarde ; elle ne termine pas toute la campagne.</p>}
          {!youthWelcome && selectedPoint.evidenceId === "undercity-testimony" && canChoose && <><div className={styles.notice}>Les trois preuves sont réunies. Ta première position sur le témoin sera définitive pour cette introduction.</div>{HOMEWORLD_WITNESS_CHOICES.map(choice => <div key={choice.id}><p>{choice.description}</p><button type="button" onClick={() => chooseWitness(choice.id)}>{choice.label}</button></div>)}</>}
          {!youthWelcome && inquiryDialogue && <section className={styles.notice} aria-label="Contre-enquête du convoi" data-homeworld-inquiry-dialog={inquiryJournal.step}>
            <h4>{inquiryDialogue.title}</h4><p>{inquiryDialogue.text}</p>
            {inquiryDialogue.options.map((option, index) => <div key={index}>
              {option.consequence && <p>{option.consequence}</p>}
              <button type="button" disabled={suspended || paused || inactive} onClick={() => submitInquiry(option.action)}>{option.label}</button>
            </div>)}
          </section>}
        </> : youthWelcome ? <>
          <h4>Accueil Unblooded</h4><p>{youthObjective}</p>
          <ul><li>{youthChiefMet ? "✓" : "○"} Rencontre du chef à la Citadelle.</li><li>{youthMentorMet ? "✓" : "○"} Rencontre de l’instructeur après l’accueil du chef.</li></ul>
          <p>Ces échanges sont des rencontres réelles enregistrées dans cette cité. Le dojo, la première lame, le premier biomask et le repos aux baraquements restent à produire ; aucune de ces étapes n’est validée par ce journal.</p>
        </> : <>
          <p>Un trophée contesté est arrivé dans la cité. Examine sa provenance, consulte le registre des mémoires puis écoute le témoignage des Bas-Fonds.</p>
          {progress.expeditions["ash-marches"] && <p>✓ Rapport de terrain : vraie piste identifiée, fausse piste écartée, convoi retrouvé et passage rouvert.{progress.expeditions["ash-marches"].secretFound ? " Balise des Navigateurs découverte." : ""}</p>}
          {progress.expeditions["glass-desert"] && <p>✓ Rapport du Désert : journal de transit et balise de rabattage concordants. Traversée {progress.expeditions["glass-desert"].crossingRoute === "stepping-stones" ? "par les corniches" : "par diversion du fouisseur"} ; canal {progress.expeditions["glass-desert"].beaconDisposition === "preserve" ? "conservé pour l’enquête" : "coupé pour arrêter l’attraction locale"}.{progress.expeditions["glass-desert"].secretFound ? " Composant ancien documenté." : ""} Aucun coupable n’est encore désigné.</p>}
          <ul>{HOMEWORLD_EVIDENCE.map(evidence => <li key={evidence.id}>{progress.evidenceIds.includes(evidence.id) ? "✓ " : "○ "}{evidence.label}</li>)}</ul>
          <p>{progress.audienceOutcome ? "Ton audience a été enregistrée. Tu peux encore explorer la cité et rencontrer ses habitants." : progress.witnessChoice ? "Ta position sur le témoin est enregistrée. Rejoins la Citadelle pour la première audience." : canChoose ? "Retourne auprès du témoin des Bas-Fonds pour choisir ta position, puis rejoins la Citadelle." : "Les cours, passages et rampes obliques forment un seul réseau au sol. Approche les portes éclairées pour repérer leurs seuils."}</p>
          <section className={styles.notice} aria-label="Contre-enquête du convoi"><h4>Contre-enquête du convoi · {inquiryJournal.completed}/5</h4><p><strong>{inquiryJournal.label}</strong></p><p>{inquiryJournal.objective}</p><p>Suite originale adaptée du projet Homeworld : confrontations aux quais et aux archives, priorité chez les Enforcers, vérification puis audience complémentaire. Aucun acte complet, nouveau rang ou trophée n’est attribué.</p></section>
          <div className={styles.notice}>Livré : cité parcourable, rencontres, dossier introductif, contre-enquête du convoi et deux enquêtes régionales (Marches de Cendre, Désert de Verre). À produire : huit autres régions et campagne complète La Couronne de Cendres. Les noms de cité, habitants et organisations sont des créations originales pour le jeu, pas des faits de canon.</div>
        </>}
        {dialog.message && <div className={styles.notice} role="status">{dialog.message}</div>}
        <div className={styles.dialogActions}>
          {pendingVisitCount > 0 && <button type="button" disabled={suspended} onClick={retryPendingVisits}>Réessayer l’enregistrement des visites</button>}
          {selectedRegion?.id === "ash-marches" && onExpedition && <button type="button" className={styles.primary}
            disabled={youthWelcome || !progress.evidenceIds.includes("suspect-trophy")}
            onClick={() => { closeDialog(); onExpedition("ash-marches"); }}>Partir vers les Marches de Cendre</button>}
          {selectedRegion?.id === "glass-desert" && onExpedition && <button type="button" className={styles.primary}
            disabled={youthWelcome || !progress.expeditions["ash-marches"]}
            onClick={() => { closeDialog(); onExpedition("glass-desert"); }}>Partir vers le Désert de Verre</button>}
          {selectedPoint?.kind === "ship" && <button type="button" className={styles.primary} disabled={youthWelcome} onClick={onReturnShip}>{youthWelcome ? "Vaisseau personnel : rite Blooded requis" : "Monter à bord"}</button>}
          {selectedPoint?.service && <button type="button" className={styles.primary} disabled={youthServiceLocked} onClick={() => { const service = selectedPoint.service; if (service) { closeDialog(); onService(service); } }}>{youthServiceLocked ? "Formation préalable requise" : "Accéder au service"}</button>}
          {!youthWelcome && selectedPoint?.kind === "audience" && !progress.audienceOutcome && <button type="button" className={styles.primary} onClick={() => { const result = persistAction({ type: "audience" }); setDialog(current => current ? { ...current, message: result.message } : current); }}>Présenter mon dossier</button>}
          <button type="button" onClick={closeDialog}>Revenir à la cité</button>
        </div>
      </div>
    </div>}
  </section>;
}
