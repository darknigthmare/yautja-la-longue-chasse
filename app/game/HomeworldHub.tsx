"use client";

/* eslint-disable @next/next/no-img-element -- local transparent whole-character plates and game props */

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { controlActionShortcut } from "./controlBindingLabels";
import { youthCampaignObjective, youthEquipmentSummary } from "./systems/youthCampaign";
import { getChronicleRank } from "./systems/clanChronicle";
import { matchesControlAction, type ControlActionId } from "./systems/controlBindings";
import { shipForId, type ShipId } from "./shipCatalogue";
import type { SaveGame } from "./types";
import HomeworldSideStoryV66 from "./HomeworldSideStoryV66";
import HomeworldNpcMissionsV66, { HomeworldNpcMissionsJournalV66 } from "./HomeworldNpcMissionsV66";
import YautjaTranslationV67 from "./YautjaTranslationV67";
import { applyHomeworldSideStoryV66, homeworldSideStoryV66Journal, type HomeworldSideStoryV66Action } from "./systems/homeworldSideStoryV66";
import { applyNpcMissionsV66, type NpcMissionActionV66 } from "./systems/homeworldNpcMissionsV66";
import { canStartSoloV66 } from "./systems/campaignSoloV66";
import { canStartSoloV67 } from "./systems/campaignSoloV67";
import { homeworldCityArrivalV67 } from "./systems/homeworldArrivalV67";
import {
  HOMEWORLD_WORLD, HOMEWORLD_ACTOR, HOMEWORLD_DISTRICTS, HOMEWORLD_PROPS, HOMEWORLD_BUILDINGS, HOMEWORLD_POINTS, homeworldHeroPlate,
  HOMEWORLD_NPCS, HOMEWORLD_EVIDENCE, HOMEWORLD_REGIONS, HOMEWORLD_WITNESS_CHOICES,
  createHomeworldActor, stepHomeworldActor, stepHomeworldActorOnFloor, nearestHomeworldPoint, nearestHomeworldDoor,
  districtAtHomeworldActor, applyHomeworldAction, shouldFadeHomeworldForeground, homeworldInquiryJournal, homeworldInquiryDialogue,
  type HomeworldAction, type HomeworldPoint, type HomeworldProgress, type HomeworldInquiryAction,
  type HomeworldService, type HomeworldWitnessChoice, type HomeworldPlayableRegionId,
} from "./systems/homeworld";
import { createHomeworldGamepadState, stepHomeworldGamepad, nextHomeworldDialogChoice } from "./systems/homeworldInput";
import HomeworldCityScene from "./HomeworldCityScene";
import HomeworldOutskirtsV71 from "./HomeworldOutskirtsV71";
import HomeworldRegionConnectionsV72 from "./HomeworldRegionConnectionsV72";
import HomeworldPopulationV68 from "./HomeworldPopulationV68";
import HomeworldContractsV68, { HomeworldContractsJournalV68 } from "./HomeworldContractsV68";
import { applyHomeworldContractV68, type ContractActionV68 } from "./systems/homeworldContractsV68";
import { canStartSoloV68 } from "./systems/campaignSoloV68";
import { canStartSoloV69 } from "./systems/campaignSoloV69";
import { canStartSoloV70 } from "./systems/campaignSoloV70";
import { canVisitHomeworldVillagesV69, usesHomeworldYouthAppearanceV69, HOMEWORLD_YOUTH_PLATE_V69 } from "./systems/homeworldAccessV69";
import { canEnterHomeworldRegionV68, isHomeworldRegionIdV68, type HomeworldRegionIdV68 } from "./systems/homeworldRegionsV68";
import { HOMEWORLD_RESIDENTS_V69 as HOMEWORLD_RESIDENTS_V68, nearestHomeworldResidentV69 as nearestHomeworldResidentV68, homeworldResidentDialogueV69 as homeworldResidentDialogueV68 } from "./systems/homeworldLifeV69";
import HomeworldSpatialCodex from "./HomeworldSpatialCodex";
import HomeworldModularHunter from "./HomeworldModularHunter";
import HomeworldInteriorSurface from "./HomeworldInteriorSurface";
import HomeworldYouthMotionV74 from "./HomeworldYouthMotionV74";
import HomeworldYouthMotionV72 from "./HomeworldYouthMotionV72";
import { useHomeworldMotionAssetsV74 } from "./useHomeworldMotionAssetsV74";
import { homeworldYouthDirectionV74, type HomeworldYouthDirectionV74 } from "./systems/homeworldYouthMotionV74";
import { homeworldCameraV72 } from "./systems/homeworldCameraV72";
import { HOMEWORLD_GEOMETRY_V64, homeworldProjectGroundV64, homeworldBuildingDoorwayV64 } from "./systems/homeworldGeometryV64";
import { homeworldInteriorForBuildingV64, nearestHomeworldInteriorTargetV64, isHomeworldInteriorWalkableV64, type HomeworldInteriorV64 } from "./systems/homeworldInteriorsV64";
import { homeworldPortraitPlacementV64, homeworldModularPlacementV64 } from "./systems/homeworldCharacterPlacementV64";
import { HUNTER_DREAD_STRANDS_V63, stepHunterDreadsV63, type DreadMotion } from "./hunterDreadsV63";
import styles from "./HomeworldCity.module.css";

export interface HomeworldHubProps {
  save: SaveGame;
  selectedShipId: ShipId;
  suspended: boolean;
  navigation?: ReactNode;
  welcome?: ReactNode;
  /** Return false when durable saving failed; no local success is then announced. */
  onProgress(next: HomeworldProgress): boolean;
  onService(service: HomeworldService): void;
  onReturnShip(): void;
  /** Available only at the physically reached mentor after the chief. */
  onYouthTraining?(): boolean;
  onSoloV66?(): boolean;
  onSoloV67?(): boolean;
  onSoloV68?(): boolean;
  onSoloV69?(): boolean;
  onSoloV70?(): boolean;
  onRegionV68?(id: HomeworldRegionIdV68): boolean;
  /** A completed connector returns at its physical threshold while its arrival
   * request is pending. Ordinary city reloads use the existing Port spawn. */
  arrivalV67?: { pointId: string; requestId: string } | null;
  onExpedition?(id: HomeworldPlayableRegionId): void;
  onNotify(message: string): void;
}

function pointInCurrentSpace(actor: { x: number; y: number }, room: HomeworldInteriorV64 | null): HomeworldPoint | null {
  if (!room) return nearestHomeworldPoint(actor);
  const target = nearestHomeworldInteriorTargetV64(room, actor);
  if (target?.kind !== "point") return null;
  const original = HOMEWORLD_POINTS.find(point => point.id === target.pointId);
  return original ? { ...original, ...target.position } : null;
}

export default function HomeworldHub({ save, selectedShipId, suspended, navigation, welcome, onProgress, onService, onReturnShip, onExpedition, onNotify, onYouthTraining, onSoloV66, onSoloV67, onSoloV68, onSoloV69, onSoloV70, onRegionV68, arrivalV67 }: HomeworldHubProps) {
  const [actor, setActor] = useState(createHomeworldActor);
  const actorRef = useRef(actor);
  const [youthMotionV74, setYouthMotionV74] = useState({ direction: 's' as HomeworldYouthDirectionV74, distanceWorld: 0 });
  const youthMotionRefV74 = useRef(youthMotionV74);
  const [interiorId, setInteriorId] = useState<string | null>(null);
  const interiorRef = useRef<HomeworldInteriorV64 | null>(null);
  const exteriorAnchorRef = useRef(actor);
  const [phase, setPhase] = useState(0);
  const [dreadAngles, setDreadAngles] = useState<number[]>(() => HUNTER_DREAD_STRANDS_V63.map(() => 0));
  const dreadMotionRef = useRef<DreadMotion>({ angles: dreadAngles, velocities: HUNTER_DREAD_STRANDS_V63.map(() => 0) });
  const [viewportSize, setViewportSize] = useState({ width: 1000, height: 580 });
  const [paused, setPaused] = useState(false);
  const [inactive, setInactive] = useState(false);
  const [spatialCodexOpen, setSpatialCodexOpen] = useState(false);
  const spatialCodexOpenRef = useRef(false);
  const [dialog, setDialog] = useState<{ point: HomeworldPoint | null; message?: string; navigation?: boolean; residentId?: string } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const viewportRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const held = useRef(new Set<string>());
  const touch = useRef({ left: false, right: false, up: false, down: false, jump: false });
  const progressRef = useRef(save.homeworld);
  const saveRef = useRef(save);
  const suspendedRef = useRef(suspended);
  const pausedRef = useRef(paused || inactive || spatialCodexOpen);
  const dialogStateRef = useRef(dialog);
  const cityClockV68 = useRef(0);
  const visitedAttempt = useRef<string | null>(null);
  const pendingVisitsRef = useRef(new Set<string>());
  const pendingVisitOwnerRef = useRef(save.createdAt);
  const [pendingVisitCount, setPendingVisitCount] = useState(0);
  const gamepadStateRef = useRef(createHomeworldGamepadState());
  const bindings = save.settings.controlBindings;
  const interior = interiorId ? homeworldInteriorForBuildingV64(interiorId) : null;
  const currentBuilding = interiorId ? HOMEWORLD_BUILDINGS.find(building => building.id === interiorId) : null;
  const district = currentBuilding ? HOMEWORLD_DISTRICTS.find(entry => entry.id === currentBuilding.districtId) : districtAtHomeworldActor(actor);
  const nearest = pointInCurrentSpace(actor, interior);
  const nearestDoor = interior ? null : nearestHomeworldDoor(actor);
  const indoorTarget = interior ? nearestHomeworldInteriorTargetV64(interior, actor) : null;
  const sceneWidth = interior?.width ?? HOMEWORLD_WORLD.width;
  const sceneDepth = interior?.depth ?? HOMEWORLD_WORLD.height;
  const projectedActor = homeworldProjectGroundV64(actor);
  const camera = homeworldCameraV72({ actor, viewport: viewportSize, width: sceneWidth, depth: sceneDepth, interior: !!interior });
  const { x: cameraX, y: cameraY, zoom } = camera;
  const progress = save.homeworld;
  const youthWelcome = usesHomeworldYouthAppearanceV69(save);
  const motionAssetsV74 = useHomeworldMotionAssetsV74({ youth: youthWelcome });
  const villagesOpenV69 = canVisitHomeworldVillagesV69(save);
  const blocked = suspended || paused || inactive || !!dialog || spatialCodexOpen || !motionAssetsV74.ready;
  const appliedArrivalV67 = useRef<string | null>(null);
  useEffect(() => {
    if (!arrivalV67 || appliedArrivalV67.current === arrivalV67.requestId) return;
    const point = HOMEWORLD_POINTS.find(item => item.id === arrivalV67.pointId && item.kind === "region");
    if (!point?.regionId) return;
    const arriving = homeworldCityArrivalV67(point.regionId);
    if (!arriving) return;
    const frame = requestAnimationFrame(() => {
      appliedArrivalV67.current = arrivalV67.requestId;
      held.current.clear(); touch.current = { left: false, right: false, up: false, down: false, jump: false };
      actorRef.current = arriving; setActor(arriving); interiorRef.current = null; setInteriorId(null);
      youthMotionRefV74.current = { ...youthMotionRefV74.current, direction: 's' };
      setYouthMotionV74(youthMotionRefV74.current);
      setDialog(null); setPaused(false); setInactive(false);
    });
    return () => cancelAnimationFrame(frame);
  }, [arrivalV67]);

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
  useEffect(() => { pausedRef.current = paused || inactive || spatialCodexOpen || !motionAssetsV74.ready; }, [paused, inactive, spatialCodexOpen, motionAssetsV74.ready]);
  useEffect(() => { dialogStateRef.current = dialog; }, [dialog]);

  const clearInputs = useCallback(() => {
    held.current.clear();
    gamepadStateRef.current = createHomeworldGamepadState();
    touch.current = { left: false, right: false, up: false, down: false, jump: false };
  }, []);

  const enterInterior = useCallback((buildingId: string) => {
    const building = nearestHomeworldDoor(actorRef.current);
    if (interiorRef.current || suspendedRef.current || pausedRef.current || dialogStateRef.current || building?.id !== buildingId) return;
    const room = homeworldInteriorForBuildingV64(buildingId);
    if (!room) return;
    clearInputs();
    const approach = homeworldBuildingDoorwayV64(building).approach;
    exteriorAnchorRef.current = { ...actorRef.current, ...approach, vx: 0, vy: 0 };
    const next = { ...actorRef.current, ...room.spawn, vx: 0, vy: 0, facing: 1 as const };
    youthMotionRefV74.current = { ...youthMotionRefV74.current, direction: 'n' };
    setYouthMotionV74(youthMotionRefV74.current);
    interiorRef.current = room; actorRef.current = next;
    setInteriorId(room.buildingId); setActor(next);
    setAnnouncement(`Entrée dans ${room.title}. Approche les personnages ou rejoins la sortie au sud.`);
    requestAnimationFrame(() => viewportRef.current?.focus({ preventScroll: true }));
  }, [clearInputs]);

  const exitInterior = useCallback(() => {
    const room = interiorRef.current;
    if (!room || suspendedRef.current || pausedRef.current || dialogStateRef.current
      || nearestHomeworldInteriorTargetV64(room, actorRef.current)?.kind !== "exit") return;
    clearInputs();
    const next = { ...exteriorAnchorRef.current, vx: 0, vy: 0 };
    interiorRef.current = null; actorRef.current = next;
    setInteriorId(null); setActor(next); setAnnouncement("Retour au seuil extérieur.");
    requestAnimationFrame(() => viewportRef.current?.focus({ preventScroll: true }));
  }, [clearInputs]);

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

  const enterYouthTraining = useCallback(() => {
    if (suspendedRef.current || !onYouthTraining
      || pendingVisitOwnerRef.current !== save.createdAt || saveRef.current.createdAt !== save.createdAt) return;
    clearInputs();
    // The youth screen unmounts this city. Keep its unacknowledged visit queue
    // alive until an explicit retry has durably stored every reached district.
    if (pendingVisitsRef.current.size > 0) {
      const message = "Des visites de quartiers restent non enregistrées. Réessaie leur enregistrement ici avant de rejoindre le maître ; ta progression reste conservée dans la cité.";
      setAnnouncement(message); onNotify(message);
      setDialog(current => current ? { ...current, message } : current);
      return;
    }
    if (!onYouthTraining()) setDialog(current => current ? { ...current, message: "L’entrée au dojo n’a pas pu être sauvegardée. Réessaie ici ; aucun exercice n’a été accordé." } : current);
  }, [clearInputs, onNotify, onYouthTraining, save.createdAt]);

  const closeDialog = useCallback(() => {
    setDialog(null);
    clearInputs();
    requestAnimationFrame(() => viewportRef.current?.focus({ preventScroll: true }));
  }, [clearInputs]);

  const interact = useCallback(() => {
    if (suspendedRef.current || pausedRef.current || dialogStateRef.current) return;
    const room = interiorRef.current;
    if (room && nearestHomeworldInteriorTargetV64(room, actorRef.current)?.kind === "exit") { exitInterior(); return; }
    const door = room ? null : nearestHomeworldDoor(actorRef.current);
    if (door) { enterInterior(door.id); return; }
    const point = pointInCurrentSpace(actorRef.current, room);
    if (!point) {
      const resident = !room && nearestHomeworldResidentV68(actorRef.current, cityClockV68.current);
      if (resident) { clearInputs(); setDialog({ point: null, residentId: resident.id }); }
      return;
    }
    clearInputs();
    let message: string | undefined;
    if (point.npcId && !(youthWelcome && point.npcId === "terrace-instructor" && !progressRef.current.greetedNpcIds.includes("hunt-king"))) {
      const greeting = persistAction({ type: "greet", npcId: point.npcId }, false);
      // Youth has its own greeting above; keep failure feedback, not adult service notices.
      message = youthWelcome && greeting.ok ? undefined : greeting.message;
      if (!greeting.ok) { setDialog({ point, message }); return; }
    }
    if (!youthWelcome && point.kind === "evidence" && point.evidenceId) message = persistAction({ type: "inspect", evidenceId: point.evidenceId }).message;
    setDialog({ point, message });
  }, [clearInputs, enterInterior, exitInterior, persistAction, youthWelcome]);

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
    let clock = cityClockV68.current;
    const keyboardHeld = (action: ControlActionId) => [...held.current].some(code => matchesControlAction(action, code, bindings));
    const frame = (time: number) => {
      const dt = previous ? Math.min((time - previous) / 1000, 1 / 30) : 0;
      previous = time;
      const ownsFocus = !!rootRef.current?.contains(document.activeElement) && document.hasFocus();
      const active = ownsFocus && !document.hidden && !suspendedRef.current && !spatialCodexOpenRef.current;
      const context = !active ? "inactive" : dialogStateRef.current ? "dialog" : pausedRef.current ? "paused" : "world";
      const pad = active ? [...(navigator.getGamepads?.() ?? [])].find(value => value?.connected) ?? null : null;
      const gamepad = stepHomeworldGamepad(gamepadStateRef.current, pad, context);
      gamepadStateRef.current = gamepad.state;
      if (gamepad.actions.pause) {
        setPaused(!pausedRef.current); setInactive(false); clearInputs();
      }
      if (!suspendedRef.current && (!pausedRef.current || dialogStateRef.current)) {
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
        const controls = { moveX: Number(right) - Number(left), climb: Number(down) - Number(up), jumpPressed: jump && !jumpWasPressed };
        const room = interiorRef.current;
        const before = actorRef.current;
        const next = room ? stepHomeworldActorOnFloor(before, controls, dt,
          point => isHomeworldInteriorWalkableV64(room, point), () => ({ ...createHomeworldActor(), ...room.spawn }))
          : stepHomeworldActor(before, controls, dt);
        jumpWasPressed = jump;
        actorRef.current = next;
        // Advance native walk poses only by real travel, never by a doorway
        // teleport or a separate animation clock. Collision stops the cycle.
        const travelled = Math.hypot(next.x - before.x, next.y - before.y);
        youthMotionRefV74.current = {
          direction: homeworldYouthDirectionV74({ x: next.vx, y: next.vy }, youthMotionRefV74.current.direction, Math.hypot(next.vx, next.vy) > 5),
          distanceWorld: youthMotionRefV74.current.distanceWorld + (Number.isFinite(travelled) && travelled <= Math.max(HOMEWORLD_ACTOR.walkSpeed, HOMEWORLD_ACTOR.depthSpeed) * dt * 2 ? travelled : 0),
        };
        // Same bounded springs as the hunt renderer, advanced only by this
        // active simulation clock: braking settles, pause freezes every strand.
        dreadMotionRef.current = stepHunterDreadsV63(dreadMotionRef.current, dt, next.vx * next.facing, next.vy);
        clock += dt;
        cityClockV68.current = clock;
        const entered = room ? null : districtAtHomeworldActor(next);
        if (entered && visitedAttempt.current !== entered.id) {
          visitedAttempt.current = entered.id;
          persistVisit(entered.id);
        }
        if (time - renderedAt >= 1000 / 30) { setActor(next); setPhase(clock); setYouthMotionV74(youthMotionRefV74.current); setDreadAngles(dreadMotionRef.current.angles); renderedAt = time; }
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
    const nearby = pointInCurrentSpace(actorRef.current, interiorRef.current);
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
  // Revalidate the actual room and save owner at submission, then acknowledge the
  // durable write before displaying any narrative consequence.
  const submitNarrativeV66 = (kind: "side" | "npc", action: HomeworldSideStoryV66Action | NpcMissionActionV66) => {
    const point = dialogStateRef.current?.point;
    const nearby = pointInCurrentSpace(actorRef.current, interiorRef.current);
    if (suspendedRef.current || pausedRef.current || saveRef.current.createdAt !== save.createdAt || !point || nearby?.id !== point.id) {
      return { ok: false, message: "Rejoins ton interlocuteur avant de poursuivre cet échange." };
    }
    const current = saveRef.current;
    const eligible = !current.prologue || ["blooded", "elite", "elder", "ancient"].includes(getChronicleRank(current.prologue.chronicle) ?? "");
    const result = kind === "side"
      ? applyHomeworldSideStoryV66(progressRef.current.sideStoryV66, action as HomeworldSideStoryV66Action, { pointId: point.id, eligible })
      : applyNpcMissionsV66(progressRef.current.npcMissionsV66, action as NpcMissionActionV66, {
        autonomousHunter: eligible, interiorId: interiorRef.current?.buildingId ?? null, pointId: point.id, npcId: point.npcId ?? null, actor: actorRef.current,
      });
    let response = { ok: result.ok, message: result.message };
    if (result.ok && result.changed) {
      const next = { ...progressRef.current, [kind === "side" ? "sideStoryV66" : "npcMissionsV66"]: result.state } as HomeworldProgress;
      if (onProgress(next)) progressRef.current = next;
      else response = { ok: false, message: "Écriture non confirmée. Aucun échange n’a été validé ; réessaie ici." };
    }
    clearInputs(); setAnnouncement(response.message); onNotify(response.message);
    setDialog(current => current ? { ...current, message: response.message } : current);
    return response;
  };
  const sideStoryJournalV66 = homeworldSideStoryV66Journal(progress.sideStoryV66, !youthWelcome);
  const submitContractV68 = (action: ContractActionV68) => {
    const point = dialogStateRef.current?.point, nearby = pointInCurrentSpace(actorRef.current, interiorRef.current);
    if (suspendedRef.current || pausedRef.current || saveRef.current.createdAt !== save.createdAt || !point?.npcId || nearby?.id !== point.id) return;
    clearInputs();
    const result = applyHomeworldContractV68(progressRef.current.contractsV68, action, { eligible: canVisitHomeworldVillagesV69(saveRef.current),
      interiorId: interiorRef.current?.buildingId ?? null, pointId: point.id, npcId: point.npcId, actor: actorRef.current });
    let message = result.message;
    if (result.changed) {
      const next = { ...progressRef.current, contractsV68: result.state };
      if (onProgress(next)) progressRef.current = next;
      else message = "Le registre n’a pas été sauvegardé. Réessaie ici ; aucune remise n’a été annoncée.";
    }
    setAnnouncement(message); onNotify(message); setDialog(current => current ? { ...current, message } : current);
  };
  const selectedPoint = dialog?.point;
  const selectedResidentV68 = HOMEWORLD_RESIDENTS_V68.find(resident => resident.id === dialog?.residentId);
  const nearbyResidentV68 = !interior ? nearestHomeworldResidentV68(actor, phase) : null;
  const selectedNpc = HOMEWORLD_NPCS.find(npc => npc.id === selectedPoint?.npcId);
  const inquiryDialogue = homeworldInquiryDialogue(progress, selectedPoint?.npcId);
  const selectedRegion = HOMEWORLD_REGIONS.find(region => region.id === selectedPoint?.regionId);
  const canChoose = progress.evidenceIds.length === HOMEWORLD_EVIDENCE.length && !progress.witnessChoice;
  const youthChiefMet = progress.greetedNpcIds.includes("hunt-king");
  const youthMentorMet = progress.greetedNpcIds.includes("terrace-instructor");
  const youthObjective = !youthChiefMet ? "Rejoins le chef du clan à la Citadelle, au nord-est de la cité, et parle-lui."
    : !youthMentorMet ? "Rejoins l’instructeur des terrasses, au centre de la cité, et parle-lui."
    : save.soloV70?.status === "completed" ? "Le premier acte du Temple des Trois Ombres est rapporté. Les salles supérieures sont explorées et le confinement est attesté ; les profondeurs et le rite Blooded restent à accomplir."
    : save.soloV69?.status === "completed" ? "Les Seuils du Premier Sang sont attestés. Rejoins le maître pour ouvrir le premier acte du Temple des Trois Ombres avec ta triade. Les villages et leurs contrats restent accessibles ; tu es encore Young Blood."
    : save.soloV68?.status === "completed" ? "Le clan a reconnu ta cohorte Young Blood. Rejoins le maître pour préparer Les Seuils du Premier Sang ; le rite Blooded reste distinct."
    : save.soloV67?.status === "completed" ? "La Piste sans guide est rapportée. Rejoins le maître pour rassembler la Cohorte des Aspirants."
    : save.soloV66?.status === "completed" ? "Les Premières Pistes sont rapportées. Rejoins le maître pour La Piste sans guide ; les villages ordinaires et leurs relevés sont aussi accessibles."
    : youthCampaignObjective(save.youthTraining);
  const youthProgressTitle = save.soloV70?.status === "completed" ? "Young Blood · Temple, acte I rapporté"
    : save.soloV69?.status === "completed" ? "Young Blood · Seuils maîtrisés"
    : save.soloV68?.status === "completed" ? "Young Blood · Cohorte reconnue"
    : save.soloV67?.status === "completed" ? "Unblooded · Piste rapportée"
    : save.soloV66?.status === "completed" ? "Unblooded · Premières Pistes accomplies"
    : save.youthTraining?.status === "completed" ? "Formation accomplie · Premier réveil"
    : "Apprentissage Unblooded · Auprès du clan";
  const youthGreeting: Record<string, string> = {
    "hunt-king": `${save.profile.hunterName}, ton arrivée a été annoncée. La force seule ne suffit pas à servir le clan. Observe, écoute, puis rends-toi auprès de l’instructeur des terrasses. Ton apprentissage commence.`,
    "terrace-instructor": save.soloV68?.status === "completed" ? "Tu as rapporté la piste et ramené tes compagnons. Cette reconnaissance Young Blood appartient à ton parcours. Elle ne remplace pas la chasse de Premier Sang ; garde ta maîtrise et écoute les récits de la gardienne." : save.youthTraining?.status === "completed" ? "Les gestes, le parcours et le duel sont accomplis. Garde la maîtrise que tu as apprise. Nous pouvons reprendre les sorties du clan. Observe le terrain, franchis les roches et reviens avec le groupe." : youthChiefMet ? "Le chef t’a accueilli. Avant de chasser, tu apprendras à te placer, à retenir un coup et à reconnaître une proie digne. Entre dans le dojo et exécute mes démonstrations. Ta première lame se mérite par les gestes ; l’armurerie et les épreuves du camp suivront." : "Présente-toi d’abord au chef du clan, dans la Citadelle au nord-est. Reviens me voir après cet accueil : nous parlerons de ta formation.",
    "dock-officer": "Ces appareils appartiennent au clan. Ta route commence dans la cité : le chef t’attend à la Citadelle, au nord-est.",
    "market-artisan": save.youthTraining?.equipment.biomask ? "Ton premier biomask est conservé pour la sortie. Le lien porte la teinte choisie ; les exercices du clan se font encore à visage découvert." : "Ton premier équipement viendra avec la formation. Observe les outils ; ils ne deviennent pas tiens par une simple visite.",
    "forge-artisan": "Une parure ne remplace pas l’apprentissage. Les commandes attendront les étapes de ta formation.",
    "clan-healer": "L’accueil vient d’abord. Pour l’instant, observe les lieux de soin du clan ; aucune infirmerie de vaisseau ne t’est attribuée.",
    "undercity-witness": "Les galeries relient les quartiers du clan. Prends le temps d’écouter leurs habitants avant de te croire prêt à chasser.",
    "memory-keeper": "Ici reposent les récits du clan. Les lire ne t’en attribue pas les exploits ; ta propre histoire commence seulement.",
    "enforcer-captain": "Les règles du clan s’apprennent avec la maîtrise. Le chef et l’instructeur guideront tes premiers pas.",
    "rite-keeper": "La nurserie est derrière toi. Aucun autre rite ne sera reconnu avant les épreuves qui lui appartiennent.",
    "arena-steward": "Le temps des arènes viendra après ta formation. Présente-toi d’abord au chef, puis à l’instructeur.",
  };
  const youthServiceLocked = youthWelcome && !!selectedPoint?.service && ["armory", "customization", "training", "medbay", "pit"].includes(selectedPoint.service);
  const title = dialog?.navigation ? "Navigation de la cité" : selectedResidentV68?.role ?? (youthWelcome && selectedNpc?.id === "hunt-king" ? "Accueil du chef du clan" : youthWelcome && selectedPoint?.kind === "ship" ? "Quais du clan" : selectedNpc?.name ?? selectedPoint?.label ?? "La Couronne de Cendres");
  const heroPlate = youthWelcome ? HOMEWORLD_YOUTH_PLATE_V69 : homeworldHeroPlate(save.appearance.presetId);
  const actorSpeed = Math.hypot(actor.vx, actor.vy);
  const heroBob = !youthWelcome && actorSpeed > 5 ? Math.sin(phase * 11) * 1.5 : 0;
  const activeDoorId = nearestDoor?.id ?? null;
  const interactionLabel = indoorTarget?.kind === "exit" ? "Sortir vers la cité" : nearestDoor ? `Entrer · ${nearestDoor.label}` : nearest?.label ?? (nearbyResidentV68 ? `Parler · ${nearbyResidentV68.role}` : null);
  const heroPlacement = !youthWelcome && heroPlate.status === "custom-modular-body"
    ? homeworldModularPlacementV64(save.appearance.bodyMorphId, save.appearance.headStyleId)
    : homeworldPortraitPlacementV64(heroPlate.plateId, heroPlate.src, youthWelcome ? HOMEWORLD_YOUTH_PLATE_V69.physicalHeight : 100);
  const fadedFrontPropIds = HOMEWORLD_PROPS
    .filter((prop) => shouldFadeHomeworldForeground(prop, actor))
    .map((prop) => prop.id)
    .join("|");

  return <section ref={rootRef} className={styles.hub} style={suspended ? { display: "none" } : undefined}
    aria-label="Homeworld — Cité des Premiers Trophées" data-homeworld-hub="true" data-homeworld-motion-ready={motionAssetsV74.ready} data-homeworld-interior-id={interior?.buildingId}>
    <header className={styles.header}>
      <div><div className={styles.eyebrow}>Yautja Prime · {interior ? "Intérieur parcourable" : "Monde natal"}</div><h2>{interior?.title ?? "La Cité des Premiers Trophées"}</h2><p>{interior?.description ?? (youthWelcome ? "Ton parcours Unblooded : accueil du clan, dojo, premier équipement et camp. Aucun vaisseau personnel avant le rite Blooded." : "Une cité de clans et de serments. Ton vaisseau reste ta demeure.")}</p></div>
      <div className={styles.hudActionsV64}><button type="button" onClick={() => { clearInputs(); setDialog({ point: null, navigation: true }); }}>Navigation</button>
      <button type="button" onClick={() => { clearInputs(); setPaused(value => !value); if (paused) requestAnimationFrame(() => viewportRef.current?.focus({ preventScroll: true })); }}>{paused ? "Reprendre" : "Pause"}</button></div>
    </header>
    <div ref={viewportRef} className={styles.viewport} tabIndex={0} role="group" aria-label={interior ? `Intérieur parcourable · ${interior.title}` : "Cité jouable en perspective 2.5D"} aria-describedby="homeworld-controls" data-homeworld-viewport="true" data-homeworld-space={interior ? "interior" : "city"} data-city-seconds={phase.toFixed(2)}
      onKeyDown={onWorldKey} onBlur={clearInputs} onPointerDown={event => { if (event.target === event.currentTarget || event.target instanceof HTMLElement && !event.target.closest("button,[data-homeworld-spatial-codex]")) viewportRef.current?.focus({ preventScroll: true }); }}>
      {!interior && <HomeworldSpatialCodex actor={actor} visitedDistrictIds={progress.visitedDistrictIds} youthWelcome={youthWelcome}
        save={save} open={spatialCodexOpen} disabled={suspended || paused || inactive || !!dialog}
        onOpenChange={open => { clearInputs(); spatialCodexOpenRef.current = open; pausedRef.current = paused || inactive || open; setSpatialCodexOpen(open);
          if (!open) requestAnimationFrame(() => viewportRef.current?.focus({ preventScroll: true })); }} />}
      {!interior && <div className={styles.sky} aria-hidden="true" />}
      <div className={styles.world} aria-hidden="true" data-homeworld-camera-mode={camera.mode} data-homeworld-camera-zoom={zoom.toFixed(3)} style={{ width: sceneWidth, height: sceneDepth * HOMEWORLD_GEOMETRY_V64.depthScale, transform: `translate(${-cameraX * zoom}px,${-cameraY * zoom}px) scale(${zoom})` }}>
        {interior ? <HomeworldInteriorSurface room={interior} actorPosition={actor} activePointId={nearest?.id ?? null} trophies={save.trophies} />
          : <HomeworldCityScene actorPosition={actor} youthWelcome={youthWelcome} selectedShipId={selectedShipId} activeDoorId={activeDoorId} activePointId={nearest?.id ?? null} fadedFrontPropIds={fadedFrontPropIds} trophies={save.trophies} />}
        {!interior && <HomeworldOutskirtsV71 actor={actor} cameraX={cameraX} cameraY={cameraY} width={viewportSize.width / zoom} height={viewportSize.height / zoom} />}
        {!interior && <HomeworldRegionConnectionsV72 actor={actor} cameraX={cameraX} cameraY={cameraY} width={camera.viewWidth} height={camera.viewHeight} save={save} />}
        {!interior && <HomeworldPopulationV68 seconds={phase} cameraX={cameraX} cameraY={cameraY} width={viewportSize.width / zoom} height={viewportSize.height / zoom} activeId={nearbyResidentV68?.id} actorPosition={actor} />}
        <div className={styles.hero} data-homeworld-actor="true" data-x={Math.round(actor.x)} data-y={Math.round(actor.y)} data-moving={actorSpeed > 5} data-facing={actor.facing} data-youth-distance-v74={youthWelcome ? youthMotionV74.distanceWorld.toFixed(3) : undefined} style={{ transform: `translate(${projectedActor.x}px,${projectedActor.y + heroBob}px)`, zIndex: Math.round(actor.y) }}>
          <span className={styles.heroVisual} style={youthWelcome ? { transform: "none" } : undefined}>
          {youthWelcome ? (motionAssetsV74.ready ? <HomeworldYouthMotionV74 seconds={phase} moving={actorSpeed > 5} velocity={{ x: actor.vx, y: actor.vy }} lastDirection={youthMotionV74.direction} distanceWorld={youthMotionV74.distanceWorld} height={HOMEWORLD_YOUTH_PLATE_V69.physicalHeight} /> : <HomeworldYouthMotionV72 seconds={0} moving={false} facing={actor.facing} height={HOMEWORLD_YOUTH_PLATE_V69.physicalHeight} />) : heroPlate.status === "custom-modular-body" ? <HomeworldModularHunter className={styles.heroPlate}
            style={heroPlacement ? { inset: "auto", ...heroPlacement } : undefined} morphId={save.appearance.bodyMorphId} dreadStyleId={save.appearance.dreadStyleId} appearance={save.appearance} dreadAngles={dreadAngles} /> : <img
            className={styles.heroPlate}
            style={heroPlacement ? { inset: "auto", ...heroPlacement } : undefined}
            src={heroPlate.src}
            alt=""
            draggable={false}
            data-whole-character-plate="true"
            data-exact-preset={heroPlate.exactPreset}
            data-plate-id={heroPlate.plateId}
            data-asset-status={heroPlate.status}
            data-provenance-status={heroPlate.provenanceStatus}
          />}
          </span>
          <i className={styles.heroMark} />
        </div>
      </div>
      {!interior && <div className={styles.haze} aria-hidden="true" />}
      <div className={styles.location}><strong>{district?.name ?? "Passerelle de liaison"}</strong><span>{interior ? "Rejoins le seuil au sud pour ressortir. Les personnages et objets se rencontrent à pied." : youthWelcome && district?.id === "port" ? "Les convois et les navettes du clan animent les quais." : youthWelcome && district?.id === "forges" ? "Les artisans préparent les armes et les parures du clan." : district?.description ?? "Les rues et passages publics relient les quartiers de la cité."}</span></div>
      {!interior && <div className={styles.minimap} role="img" aria-label={`Plan de la cité : ${progress.visitedDistrictIds.length} quartiers visités sur ${HOMEWORLD_DISTRICTS.length}. Position : ${district?.name ?? "liaison"}.`}>
        {HOMEWORLD_DISTRICTS.map(entry => <i key={entry.id} className={styles.mapDistrict} data-visited={progress.visitedDistrictIds.includes(entry.id)} style={{ left: `${entry.x / HOMEWORLD_WORLD.width * 100}%`, top: `${entry.y / HOMEWORLD_WORLD.height * 100}%`, width: `${entry.width / HOMEWORLD_WORLD.width * 100}%`, height: `${entry.height / HOMEWORLD_WORLD.height * 100}%` }} />)}
        <i className={styles.mapActor} style={{ left: `${actor.x / HOMEWORLD_WORLD.width * 100}%`, top: `${actor.y / HOMEWORLD_WORLD.height * 100}%` }} />
      </div>}
      {interactionLabel && !blocked && <button className={styles.prompt} type="button" onClick={interact} data-homeworld-door-id={nearestDoor?.id} data-homeworld-interior-target={indoorTarget?.kind}><kbd>{controlActionShortcut("hunt.interact", bindings)} / A</kbd>{youthWelcome && nearest?.kind === "ship" && !nearestDoor ? "Quais du clan" : interactionLabel}</button>}
      {!motionAssetsV74.ready && <div className={styles.pause} data-homeworld-motion-loading-v74 role={motionAssetsV74.error ? "alert" : "status"} aria-live="polite">
        <strong>{motionAssetsV74.error ? "Sprites indisponibles" : "Préparation de la cité"}</strong>
        <span>{motionAssetsV74.error ?? `Animations : ${motionAssetsV74.loaded} / ${motionAssetsV74.total}`}</span>
        {motionAssetsV74.error && <button type="button" onClick={motionAssetsV74.retry}>Réessayer les animations</button>}
      </div>}
      {motionAssetsV74.ready && (paused || inactive || suspended) && !dialog && <div className={styles.pause}><strong>{suspended ? "Cité suspendue" : "Exploration en pause"}</strong>{!suspended && <button type="button" onClick={() => { setPaused(false); setInactive(false); viewportRef.current?.focus({ preventScroll: true }); }}>Reprendre l’exploration</button>}</div>}
    </div>
    <div className={styles.touch} aria-label="Commandes tactiles">
      <div className={styles.touchGroup}>{touchButton("left", "Marcher à gauche", "←")}{touchButton("right", "Marcher à droite", "→")}</div>
      <div className={styles.touchGroup}>{touchButton("up", "Marcher vers le fond", "↑")}{touchButton("down", "Marcher vers l’avant", "↓")}<button type="button" aria-label="Interagir avec le point proche" disabled={blocked || !interactionLabel} onClick={interact}>◉</button></div>
    </div>
    {youthWelcome && <section className={styles.youthHudV64} aria-label="Objectif d’accueil Unblooded" data-unblooded-objective={!youthChiefMet ? "chief" : !youthMentorMet ? "mentor" : save.youthTraining?.checkpoint.phase === "cage-complete" ? "cage-returned" : save.youthTraining?.checkpoint.phase.startsWith("cage-") ? "cage-active" : save.youthTraining?.checkpoint.phase === "patrol-complete" ? "patrol-returned" : save.youthTraining?.checkpoint.phase.startsWith("patrol-") ? "patrol-active" : save.youthTraining?.checkpoint.phase === "desert-complete" ? "desert-returned" : save.youthTraining?.status === "completed" ? "desert-ready" : "training"}>
      <strong>{save.soloV68?.status === "completed" ? "Young Blood" : "Accueil du clan"}</strong><p>{youthObjective}</p>
    </section>}
    <footer className={styles.footer}><div className={styles.progress}><strong>{youthWelcome ? youthProgressTitle : inquiryJournal.step === "complete" ? "Contre-enquête remise à la cité" : inquiryJournal.step !== "locked" ? "Contre-enquête du convoi · " + inquiryJournal.completed + "/5" : progress.audienceOutcome ? "Première audience accomplie" : "Dossier introductif · Le trophée contesté"}</strong><span>{progress.visitedDistrictIds.length}/{HOMEWORLD_DISTRICTS.length} quartiers · {!youthWelcome && <>{progress.evidenceIds.length}/{HOMEWORLD_EVIDENCE.length} preuves · </>}{progress.greetedNpcIds.length} rencontres · {save.profile.clanMarks} marques{progress.expeditions["ash-marches"] ? " · Convoi retrouvé" : ""}{progress.expeditions["glass-desert"] ? " · Détournement documenté" : ""}</span></div>
      <button type="button" onClick={() => { clearInputs(); setDialog({ point: null }); }}>{youthWelcome ? "Journal de l’accueil" : "Journal de la cité"}</button>
    </footer>
    {!youthWelcome && inquiryJournal.step !== "locked" && <div className={styles.help} data-homeworld-inquiry-step={inquiryJournal.step}><strong>{inquiryJournal.label}</strong> · {inquiryJournal.objective}</div>}
    {pendingVisitCount > 0 && <div className={styles.notice} role="status">
      <p>{pendingVisitCount} {pendingVisitCount === 1 ? "visite de quartier non enregistrée" : "visites de quartiers non enregistrées"}. Ces visites restent en attente tant que la cité reste ouverte.</p>
      <button type="button" className="ghost-button small" disabled={suspended} onClick={retryPendingVisits}>Réessayer l’enregistrement des visites</button>
    </div>}
    <div id="homeworld-controls" className={styles.srOnly}>Clique dans la cité pour jouer. Marche libre <kbd>{controlActionShortcut("hunt.moveLeft", bindings)}</kbd> / <kbd>{controlActionShortcut("hunt.moveRight", bindings)}</kbd> / <kbd>{controlActionShortcut("hunt.moveUp", bindings)}</kbd> / <kbd>{controlActionShortcut("hunt.moveDown", bindings)}</kbd> · Interaction <kbd>{controlActionShortcut("hunt.interact", bindings)}</kbd>. Manette : stick / croix, A interaction, B fermer. Les services publics sont reliés au sol : aucun saut ni ascenseur obligatoire. {youthWelcome ? "Présente-toi au chef puis au mentor. Son dialogue ouvre les exercices du dojo, l’armurerie et le camp. Après le premier repos, reviens auprès du maître pour la reconnaissance accompagnée du désert." : "Les dix routes rejoignent des villages de clan. Reçois les contrats à l’armurerie du marché et auprès des commanditaires ; consigne les preuves sur le terrain avant de les remettre."}</div>
    <div className={styles.srOnly} aria-live="polite" aria-atomic="true">{announcement}</div>
    {dialog && <div className={styles.backdrop}>
      <div ref={dialogRef} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="homeworld-dialog-title" tabIndex={-1} onKeyDown={dialogKey}>
        <div className={styles.eyebrow}>{selectedNpc?.role ?? (selectedPoint?.kind === "region" ? selectedRegion?.status === "playable-introduction" ? selectedRegion.name + " · enquête régionale" : "Route vers le village de clan" : "La Couronne de Cendres")}</div>
        <h3 id="homeworld-dialog-title">{title}</h3>
        {dialog.navigation ? <>
          <p>{interior?.description ?? "Une cité de clans et de serments. Ouvre une destination ou reprends l’exploration à ta position actuelle."}</p>
          <div className={styles.navigationActionsV64} onClick={event => {
            if (event.target instanceof HTMLElement && event.target.closest("button:not(:disabled)")) closeDialog();
          }}>{navigation}</div>
          {welcome && <section className={styles.notice}>{welcome}</section>}
          <p>Marche : {controlActionShortcut("hunt.moveLeft", bindings)} / {controlActionShortcut("hunt.moveRight", bindings)} / {controlActionShortcut("hunt.moveUp", bindings)} / {controlActionShortcut("hunt.moveDown", bindings)}. Interaction : {controlActionShortcut("hunt.interact", bindings)}. Manette : stick ou croix, A interaction, B fermer, Start pause.</p>
          <button type="button" onClick={closeDialog}>Fermer la navigation</button>
        </> : <>
        {selectedPoint ? <>
          {selectedNpc && <p><YautjaTranslationV67 text={`« ${youthWelcome && youthGreeting[selectedNpc.id] ? youthGreeting[selectedNpc.id] : selectedNpc.greeting} »`} paused={suspended || paused || inactive} /></p>}
          {youthWelcome && ["hunt-king", "terrace-instructor"].includes(selectedNpc?.id ?? "") && <div className={styles.notice} data-unblooded-conversation={selectedNpc?.id}><p>{youthObjective}</p><p>Les exercices se jouent dans le dojo, puis au camp. Le maître attend ton retour pour reconnaître chaque épreuve.</p></div>}
          {youthWelcome && selectedNpc?.id === "terrace-instructor" && youthChiefMet && youthMentorMet && onYouthTraining && <button type="button" data-youth-enter-dojo disabled={suspended} onClick={enterYouthTraining}>{save.youthTraining?.status === "completed" ? save.youthTraining.checkpoint.phase === "cage-complete" ? "Revoir le bilan de la petite Fosse" : save.youthTraining.checkpoint.phase.startsWith("cage-") ? "Reprendre la petite Fosse de jeunesse" : save.youthTraining.checkpoint.phase === "patrol-complete" ? "Préparer le premier duel de la Fosse" : save.youthTraining.checkpoint.phase.startsWith("patrol-") ? "Reprendre la patrouille accompagnée" : save.youthTraining.checkpoint.phase === "desert-complete" ? "Préparer la patrouille avec le maître" : "Rejoindre le maître pour la sortie du désert" : save.youthTraining ? "Reprendre la formation Unblooded" : "Entrer dans le dojo avec le maître"}</button>}
          {youthWelcome && selectedNpc?.id === "terrace-instructor" && onSoloV66 && canStartSoloV66(save) && save.soloV66?.status !== "completed" && <button type="button" data-solo-v66-enter disabled={suspended || paused || inactive} onClick={() => {
            if (suspendedRef.current || pausedRef.current || pendingVisitOwnerRef.current !== save.createdAt || saveRef.current.createdAt !== save.createdAt || pointInCurrentSpace(actorRef.current, interiorRef.current)?.id !== "training-service") return;
            clearInputs();
            // Like the dojo departure, Solo unmounts the city: retain refused visits here until the player explicitly retries them.
            if (pendingVisitsRef.current.size > 0) {
              const message = "Des visites de quartiers restent non enregistrées. Réessaie leur enregistrement ici avant de rejoindre le maître ; ta progression reste conservée dans la cité.";
              setAnnouncement(message); onNotify(message);
              setDialog(current => current ? { ...current, message } : current);
              return;
            }
            if (!onSoloV66()) setDialog(current => current ? { ...current, message: "Départ non sauvegardé. Réessaie auprès du maître." } : current);
          }}>{save.soloV66 ? "Reprendre Les Premières Pistes" : "Préparer Les Premières Pistes avec le maître"}</button>}
          {save.soloV66?.status === "completed" && selectedNpc?.id === "terrace-instructor" && <p data-solo-v66-complete>Les Premières Pistes sont rapportées : ta lecture des traces et ton observation sont reconnues. Ton parcours se poursuit ; {save.soloV67?.status === "completed" ? "la Piste sans guide est également rapportée. La reconnaissance de la cohorte constitue l’étape suivante." : "la Piste sans guide est maintenant accessible auprès du maître."}</p>}
          {youthWelcome && selectedNpc?.id === "terrace-instructor" && onSoloV67 && canStartSoloV67(save) && save.soloV67?.status !== "completed" && <button type="button" data-solo-v67-enter disabled={suspended || paused || inactive} onClick={() => {
            if (suspendedRef.current || pausedRef.current || pendingVisitOwnerRef.current !== save.createdAt || saveRef.current.createdAt !== save.createdAt || pointInCurrentSpace(actorRef.current, interiorRef.current)?.id !== "training-service") return;
            clearInputs();
            if (pendingVisitsRef.current.size > 0) {
              const message = "Des visites de quartiers attendent leur enregistrement. Réessaie ici avant de partir sans guide ; rien n’est abandonné.";
              setAnnouncement(message); onNotify(message); setDialog(current => current ? { ...current, message } : current); return;
            }
            if (!onSoloV67()) setDialog(current => current ? { ...current, message: "Départ non sauvegardé. Réessaie auprès du maître." } : current);
          }}>{save.soloV67 ? "Reprendre La Piste sans guide" : "Préparer La Piste sans guide"}</button>}
          {youthWelcome && selectedNpc?.id === "terrace-instructor" && onSoloV68 && canStartSoloV68(save) && save.soloV68?.status !== "completed" && <button type="button" data-solo-v68-enter disabled={suspended || paused || inactive} onClick={() => {
            if (suspendedRef.current || pausedRef.current || saveRef.current.createdAt !== save.createdAt || pointInCurrentSpace(actorRef.current, interiorRef.current)?.id !== "training-service") return;
            clearInputs();
            if (pendingVisitsRef.current.size > 0) { setDialog(current => current ? { ...current, message: "Enregistre les visites de quartier en attente avant de partir avec la cohorte." } : current); return; }
            if (!onSoloV68()) setDialog(current => current ? { ...current, message: "Départ non enregistré. Réessaie auprès du maître." } : current);
          }}>{save.soloV68 ? "Reprendre La Cohorte des Aspirants" : "Rejoindre La Cohorte des Aspirants"}</button>}
          {selectedNpc?.id === "terrace-instructor" && save.soloV68?.status === "completed" && <p data-solo-v68-complete>La cohorte est rentrée avec ses deux compagnons. Le clan a reconnu ton parcours Young Blood. Le rite Blooded demeure une chasse distincte.</p>}
          {youthWelcome && selectedNpc?.id === "terrace-instructor" && onSoloV69 && canStartSoloV69(save) && save.soloV69?.status !== "completed" && <button type="button" data-solo-v69-enter disabled={suspended || paused || inactive} onClick={() => {
            if (suspendedRef.current || pausedRef.current || saveRef.current.createdAt !== save.createdAt || pointInCurrentSpace(actorRef.current, interiorRef.current)?.id !== "training-service") return;
            clearInputs();
            if (pendingVisitsRef.current.size > 0) { setDialog(current => current ? { ...current, message: "Enregistre les visites en attente avant de rejoindre les seuils." } : current); return; }
            if (!onSoloV69()) setDialog(current => current ? { ...current, message: "Départ non enregistré. Réessaie auprès du maître." } : current);
          }}>{save.soloV69 ? "Reprendre Les Seuils du Premier Sang" : "Préparer Les Seuils du Premier Sang"}</button>}
          {youthWelcome && selectedNpc?.id === "terrace-instructor" && onSoloV70 && canStartSoloV70(save) && save.soloV70?.status !== "completed" && <button type="button" data-solo-v70-enter disabled={suspended || paused || inactive} onClick={() => {
            if (suspendedRef.current || pausedRef.current || saveRef.current.createdAt !== save.createdAt || pointInCurrentSpace(actorRef.current, interiorRef.current)?.id !== "training-service") return;
            clearInputs();
            if (pendingVisitsRef.current.size > 0) { setDialog(current => current ? { ...current, message: "Enregistre les visites en attente avant de rejoindre le temple." } : current); return; }
            if (!onSoloV70()) setDialog(current => current ? { ...current, message: "Départ non enregistré. Réessaie auprès du maître." } : current);
          }}>{save.soloV70 ? "Reprendre Le Temple des Trois Ombres · acte I" : "Le Temple des Trois Ombres · acte I"}</button>}
          {selectedNpc?.id === "terrace-instructor" && save.soloV70?.status === "completed" && <p data-solo-v70-complete>Le premier acte du temple est rapporté. Les salles profondes, la reine et le rite Blooded ne sont pas validés par cette ouverture.</p>}
          {selectedNpc?.id === "terrace-instructor" && save.soloV69?.status === "completed" && <p data-solo-v69-complete>Les douze étapes de préparation sont attestées. Le jeune a rejoint le refuge et tu es revenu au maître. Ton rang reste Young Blood ; le Premier Sang attend sa propre expédition.</p>}
          {youthWelcome && selectedNpc?.id === "terrace-instructor" && <p data-youth-equipment>{youthEquipmentSummary(save.youthTraining)}</p>}
          <p>{youthWelcome && selectedPoint.kind === "ship" ? "Appareils et transports du clan." : youthWelcome && selectedPoint.service ? "Lieu public du clan : les équipements et exercices sont remis aux étapes prévues de la formation." : youthWelcome && selectedPoint.npcId === "hunt-king" ? "Présente-toi au chef avant de rejoindre ton instructeur." : selectedPoint.evidenceId ? <YautjaTranslationV67 text={selectedPoint.description} paused={suspended || paused || inactive} /> : selectedPoint.description}</p>
          {selectedPoint.kind === "ship" && <p>{youthWelcome ? "La navette de desserte relie les quais aux appareils du clan. Ton propre vaisseau sera acquis après le rite Blooded ; l’accueil et la formation sur le Homeworld viennent d’abord." : <>Le {shipForId(selectedShipId).name} reste en amarrage orbital. Cette console donne accès au transfert par la navette de desserte. L’armurerie, les trophées et les pièces de ton vaisseau personnel restent accessibles.</>}</p>}
          {selectedRegion && <><p>{selectedRegion.description}</p>{youthWelcome && <p>{villagesOpenV69 ? "Ta formation et les Premières Pistes sont attestées. Tu peux rejoindre les villages ordinaires à pied et réaliser leurs relevés. Les enquêtes sensibles et la Réserve conservent leurs conditions ; aucun départ orbital personnel n’est ouvert." : "La formation, le premier biomask et le repos aux baraquements précèdent les sorties de jeunesse. Après la formation et les Premières Pistes, les villages ordinaires ouvrent leurs routes."}</p>}<div className={styles.notice}>
            {selectedRegion.status === "playable-introduction"
              ? selectedRegion.id === "glass-desert"
                ? "Les plaques vitrifiées transmettent les vibrations. Rejoins le village des Citernes ou poursuis le dossier du convoi jusqu’au site abandonné et à sa balise de rabattage."
                : "La corniche relie la cité à la halte de clan. Rejoins ses habitants ou suis les pistes du convoi disparu pour poursuivre ton enquête."
              : "Un sentier continu rejoint le village de clan. Rencontre son guide, ses artisans et ses habitants, puis explore le terrain de pistage. Le rapport du guide et le retour auprès du commanditaire complètent une demande."}
            {selectedRegion.id === "ash-marches" && !progress.evidenceIds.includes("suspect-trophy") && <p>Inspecte d’abord le trophée du convoi dans le Contrôle d’amarrage, au Port des Chasses.</p>}
            {selectedRegion.id === "glass-desert" && !progress.expeditions["ash-marches"] && <p>Remets d’abord le rapport complet des Marches à sa navette. Le Désert exige ce rapport durable ; aucun résultat THE PIT n’est requis.</p>}
          </div></>}
          {!youthWelcome && selectedPoint.kind === "audience" && <p>Présente les trois preuves et prends position sur le sort du témoin avant l’audience. Cette première décision est conservée dans ta sauvegarde ; elle ne termine pas toute la campagne.</p>}
          {!youthWelcome && selectedPoint.evidenceId === "undercity-testimony" && canChoose && <><div className={styles.notice}>Les trois preuves sont réunies. Ta première position sur le témoin sera définitive pour cette introduction.</div>{HOMEWORLD_WITNESS_CHOICES.map(choice => <div key={choice.id}><p>{choice.description}</p><button type="button" onClick={() => chooseWitness(choice.id)}>{choice.label}</button></div>)}</>}
          <HomeworldSideStoryV66 progress={progress.sideStoryV66} pointId={selectedPoint.id} eligible={!youthWelcome} disabled={suspended || paused || inactive} onAction={action => submitNarrativeV66("side", action)} />
          <HomeworldNpcMissionsV66 value={progress.npcMissionsV66} npcId={selectedPoint.npcId} autonomousHunter={!youthWelcome} disabled={suspended || paused || inactive} onAction={action => { submitNarrativeV66("npc", action); }} />
          <HomeworldContractsV68 value={progress.contractsV68} npcId={selectedPoint.npcId} eligible={villagesOpenV69} disabled={suspended || paused || inactive} onAction={submitContractV68} />
          {!youthWelcome && inquiryDialogue && <section className={styles.notice} aria-label="Contre-enquête du convoi" data-homeworld-inquiry-dialog={inquiryJournal.step}>
            <h4>{inquiryDialogue.title}</h4><p><YautjaTranslationV67 text={inquiryDialogue.text} paused={suspended || paused || inactive} /></p>
            {inquiryDialogue.options.map((option, index) => <div key={index}>
              {option.consequence && <p>{option.consequence}</p>}
              <button type="button" disabled={suspended || paused || inactive} onClick={() => submitInquiry(option.action)}>{option.label}</button>
            </div>)}
          </section>}
        </> : selectedResidentV68 ? <p><YautjaTranslationV67 text={homeworldResidentDialogueV68(selectedResidentV68, phase)} paused={suspended || paused || inactive} /></p> : youthWelcome ? <>
          <h4>Parcours Unblooded</h4><p>{youthObjective}</p><p>{youthEquipmentSummary(save.youthTraining)}</p>
          <ul><li>{youthChiefMet ? "✓" : "○"} Rencontre du chef à la Citadelle.</li><li>{youthMentorMet ? "✓" : "○"} Rencontre de l’instructeur après l’accueil du chef.</li></ul>
          <p>Ces échanges sont des rencontres réelles enregistrées dans cette cité. Le journal montre uniquement les étapes réellement jouées : aucune formation ni remise d’équipement n’est validée par sa lecture.</p>
          {villagesOpenV69 && <><HomeworldContractsJournalV68 value={progress.contractsV68} /><p data-homeworld-wallet-v69>Solde disponible : <strong>{save.profile.clanMarks} marques de clan</strong>. Rejoins physiquement le commanditaire indiqué pour accepter une demande ou lui remettre ses rapports.</p></>}
        </> : <>
          <p>Un trophée contesté est arrivé dans la cité. Examine sa provenance, consulte le registre des mémoires puis écoute le témoignage des Bas-Fonds.</p>
          {progress.expeditions["ash-marches"] && <p>✓ Rapport de terrain : vraie piste identifiée, fausse piste écartée, convoi retrouvé et passage rouvert.{progress.expeditions["ash-marches"].secretFound ? " Balise des Navigateurs découverte." : ""}</p>}
          {progress.expeditions["glass-desert"] && <p>✓ Rapport du Désert : journal de transit et balise de rabattage concordants. Traversée {progress.expeditions["glass-desert"].crossingRoute === "stepping-stones" ? "par les corniches" : "par diversion du fouisseur"} ; canal {progress.expeditions["glass-desert"].beaconDisposition === "preserve" ? "conservé pour l’enquête" : "coupé pour arrêter l’attraction locale"}.{progress.expeditions["glass-desert"].secretFound ? " Composant ancien documenté." : ""} Aucun coupable n’est encore désigné.</p>}
          <ul>{HOMEWORLD_EVIDENCE.map(evidence => <li key={evidence.id}>{progress.evidenceIds.includes(evidence.id) ? "✓ " : "○ "}{evidence.label}</li>)}</ul>
          <p>{progress.audienceOutcome ? "Ton audience a été enregistrée. Tu peux encore explorer la cité et rencontrer ses habitants." : progress.witnessChoice ? "Ta position sur le témoin est enregistrée. Rejoins la Citadelle pour la première audience." : canChoose ? "Retourne auprès du témoin des Bas-Fonds pour choisir ta position, puis rejoins la Citadelle." : "Les cours, passages et rampes obliques forment un seul réseau au sol. Approche les portes éclairées pour repérer leurs seuils."}</p>
          <section className={styles.notice} aria-label="Contre-enquête du convoi"><h4>Contre-enquête du convoi · {inquiryJournal.completed}/5</h4><p><strong>{inquiryJournal.label}</strong></p><p>{inquiryJournal.objective}</p><p>Suite originale adaptée du projet Homeworld : confrontations aux quais et aux archives, priorité chez les Enforcers, vérification puis audience complémentaire. Aucun acte complet, nouveau rang ou trophée n’est attribué.</p></section>
          <section className={styles.notice} aria-label="Journal de La marque empruntée" data-side-story-v66-journal><h4>La marque empruntée · {sideStoryJournalV66.completed}/{sideStoryJournalV66.total}</h4><p><strong>{sideStoryJournalV66.label}</strong></p><p>{sideStoryJournalV66.objective}</p></section>
          <HomeworldNpcMissionsJournalV66 value={progress.npcMissionsV66} autonomousHunter={!youthWelcome} />
          <HomeworldContractsJournalV68 value={progress.contractsV68} />
          <p data-homeworld-wallet-v68>Solde disponible : <strong>{save.profile.clanMarks} marques de clan</strong>. Les primes remises peuvent financer l’équipement à l’armurerie.</p>
          <p>Les villages accueillent les délégations et consignent les pistes de leurs territoires. L’artisane du marché tient le Tableau des chasses ; les demandes personnelles se reçoivent auprès de leurs commanditaires.</p>
        </>}
        {dialog.message && <div className={styles.notice} role="status">{dialog.message}</div>}
        <div className={styles.dialogActions}>
          {selectedRegion && onRegionV68 && isHomeworldRegionIdV68(selectedRegion.id) && <button type="button" className={styles.primary} data-homeworld-region-v68={selectedRegion.id}
            disabled={suspended || paused || inactive || !canEnterHomeworldRegionV68(save, selectedRegion.id).allowed} onClick={() => {
              const point = dialogStateRef.current?.point;
              if (suspendedRef.current || pausedRef.current || !point || pointInCurrentSpace(actorRef.current, interiorRef.current)?.id !== point.id || !isHomeworldRegionIdV68(point.regionId)) return;
              if (pendingVisitsRef.current.size > 0) { setDialog(current => current ? { ...current, message: "Des visites attendent leur enregistrement. Réessaie ici avant de quitter les murs." } : current); return; }
              if (onRegionV68(point.regionId)) closeDialog();
              else setDialog(current => current ? { ...current, message: "Départ non confirmé. La position et les demandes restent conservées." } : current);
            }}>Suivre le sentier vers le village</button>}
          {selectedRegion && !canEnterHomeworldRegionV68(save, selectedRegion.id).allowed && <p>{canEnterHomeworldRegionV68(save, selectedRegion.id).reason}</p>}
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
          <button type="button" onClick={closeDialog}>{interior ? "Revenir dans la salle" : "Revenir à la cité"}</button>
        </div>
        </>}
      </div>
    </div>}
  </section>;
}
