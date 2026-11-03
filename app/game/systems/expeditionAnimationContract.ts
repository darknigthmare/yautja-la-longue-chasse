/**
 * Expedition import metadata only. This does not draw, load images, execute cues,
 * approve artwork or borrow coverage from The PIT. Gameplay owns every effect.
 */
export const EXPEDITION_EQUIPMENT_FAMILIES = [
  "biomask", "plasma-caster", "control-gauntlet", "blade-gauntlet", "dreadlocks",
  "armor", "harness", "held-items", "trophies", "effects",
] as const;
export type ExpeditionEquipmentFamily = typeof EXPEDITION_EQUIPMENT_FAMILIES[number];
export const EXPEDITION_BODY_PARTS = [
  "head", "mandibles", "torso", "left-arm", "right-arm", "left-hand", "right-hand",
  "left-leg", "right-leg", "left-foot", "right-foot",
] as const;
export const EXPEDITION_ATTACHMENTS = [
  "face", "dread-roots", "left-shoulder", "right-shoulder", "left-wrist", "right-wrist",
  "left-hand", "right-hand", "belt", "back", "torso",
] as const;
export type ExpeditionAttachmentId = typeof EXPEDITION_ATTACHMENTS[number];
export type ExpeditionFacing = "left" | "right";
export type ExpeditionRect = readonly [x: number, y: number, width: number, height: number];
export type ExpeditionItemLocation = ExpeditionAttachmentId | "world" | "absent";

/** Announced production scope, not a recovered list of IDs or a playable total. */
export const EXPEDITION_ANIMATION_SOURCE_BUDGET = {
  announcedLots: 50, announcedEntries: 517, announcedSequences: 516, announcedFinalPoses: 1,
  accessibleThroughLot: 45, completeIdCatalogueRecovered: false,
  conformingRuntimeClipCount: 0,
  sourceThreadId: "6aa8031b-aad4-83eb-86ae-7173d8dd3e92",
} as const;

interface ExpeditionAssetSource {
  readonly id: string;
  readonly src: string;
  readonly sha256: string;
  readonly width: number;
  readonly height: number;
  readonly facing: ExpeditionFacing;
  readonly orientation: "native";
}
export type ExpeditionAnimationAsset = ExpeditionAssetSource & (
  | { readonly kind: "body"; readonly construction: "whole-anatomy";
      readonly anatomy: readonly typeof EXPEDITION_BODY_PARTS[number][];
      readonly fusedEquipment: readonly [] }
  | { readonly kind: "equipment"; readonly family: ExpeditionEquipmentFamily;
      readonly construction: "separate-piece" | "whole-hairstyle" | "hairstyle-front" | "hairstyle-back" }
  | { readonly kind: "occlusion-mask" }
);
export interface ExpeditionEquipmentPlacement {
  readonly itemId: string;
  readonly assetId: string;
  readonly rect: ExpeditionRect;
  readonly location: Exclude<ExpeditionItemLocation, "absent">;
  readonly occlusion: { readonly mode: "none" } |
    { readonly mode: "mask"; readonly assetId: string; readonly rect: ExpeditionRect };
}
export interface ExpeditionAnimationFrame {
  readonly id: string;
  readonly durationTicks: number;
  readonly body: { readonly assetId: string; readonly rect: ExpeditionRect; readonly pivot: readonly [number, number] };
  /** Every authored pose supplies its own anchors, including currently unused ones. */
  readonly attachments: Readonly<Record<ExpeditionAttachmentId, { readonly x: number; readonly y: number; readonly rotation: number }>>;
  /** One authoritative location per physical item. Front/back hair passes share it. */
  readonly ownership: readonly { readonly itemId: string; readonly family: ExpeditionEquipmentFamily; readonly location: ExpeditionItemLocation }[];
  readonly equipment: readonly ExpeditionEquipmentPlacement[];
  /** Observational synchronization only: these cues never spawn/heal/consume/lock. */
  readonly cues: readonly { readonly eventId: string; readonly source: "gameplay"; readonly effects: readonly [] }[];
}
export interface ExpeditionAnimationImport {
  readonly schemaVersion: 1;
  readonly mode: "expedition";
  readonly assets: readonly ExpeditionAnimationAsset[];
  readonly clips: readonly {
    readonly id: string;
    readonly appearanceId: string;
    readonly facing: ExpeditionFacing;
    readonly bodyClock: "gameplay";
    readonly equipmentClock: "independent";
    readonly frames: readonly ExpeditionAnimationFrame[];
  }[];
}
export interface ExpeditionAnimationIssue { readonly path: string; readonly code: string }
export interface ExpeditionAnimationValidation {
  readonly valid: boolean;
  readonly issues: readonly ExpeditionAnimationIssue[];
  readonly declaredClipCount: number;
  /** A metadata validator cannot certify decoded or visually reviewed animation. */
  readonly conformingRuntimeClipCount: 0;
}
const record = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const integer = (v: unknown): v is number => finite(v) && Number.isSafeInteger(v) && v > 0;
const identifier = (v: unknown): v is string => typeof v === "string" && /^[a-z0-9][a-z0-9._-]{0,127}$/.test(v);
const member = (v: unknown, allowed: readonly string[]): v is string => typeof v === "string" && allowed.includes(v);
const facing = (v: unknown): v is ExpeditionFacing => v === "left" || v === "right";
const empty = (v: unknown) => Array.isArray(v) && v.length === 0;
const locations = [...EXPEDITION_ATTACHMENTS, "world", "absent"];

/** Total over JSON values. Rejection never mutates the candidate or the game. */
export function validateExpeditionAnimationImport(value: unknown): ExpeditionAnimationValidation {
  const issues: ExpeditionAnimationIssue[] = [];
  const issue = (path: string, code: string) => { issues.push({ path, code }); };
  const result = (declaredClipCount = 0): ExpeditionAnimationValidation => ({ valid: issues.length === 0, issues, declaredClipCount, conformingRuntimeClipCount: 0 });
  if (!record(value)) { issue("$", "invalid-manifest"); return result(); }
  if (value.schemaVersion !== 1 || value.mode !== "expedition") issue("$", "unsupported-contract");
  if (!Array.isArray(value.assets) || !Array.isArray(value.clips)) { issue("$", "missing-arrays"); return result(); }
  // Bound imported metadata before traversal; the 517 production entries are not a cap.
  if (value.assets.length > 20000 || value.clips.length > 5000) { issue("$", "import-too-large"); return result(); }
  const assets = new Map<string, Record<string, unknown>>();
  value.assets.forEach((asset, index) => {
    const path = `assets[${index}]`;
    if (!record(asset) || !identifier(asset.id)) { issue(path, "invalid-asset"); return; }
    if (assets.has(asset.id)) issue(path, "duplicate-asset-id"); else assets.set(asset.id, asset);
    if (typeof asset.src !== "string" || !/^\/game\/[a-zA-Z0-9/_-]+\.(png|webp)$/.test(asset.src)) issue(path, "invalid-source-path");
    if (typeof asset.sha256 !== "string" || !/^[a-f0-9]{64}$/i.test(asset.sha256)) issue(path, "missing-source-hash");
    if (!integer(asset.width) || !integer(asset.height)) issue(path, "invalid-dimensions");
    if (!facing(asset.facing) || asset.orientation !== "native" || asset.mirrored === true) issue(path, "native-orientation-required");
    if (asset.kind === "body") {
      if (asset.construction !== "whole-anatomy") issue(path, "whole-body-required");
      if (!Array.isArray(asset.anatomy) || asset.anatomy.length !== EXPEDITION_BODY_PARTS.length ||
          !EXPEDITION_BODY_PARTS.every(part => (asset.anatomy as unknown[]).includes(part))) issue(path, "incomplete-anatomy");
      if (!empty(asset.fusedEquipment)) issue(path, "fused-equipment-forbidden");
    } else if (asset.kind === "equipment") {
      if (!member(asset.family, EXPEDITION_EQUIPMENT_FAMILIES)) issue(path, "unknown-equipment-family");
      if (asset.family === "dreadlocks") {
        if (!member(asset.construction, ["whole-hairstyle", "hairstyle-front", "hairstyle-back"])) issue(path, "whole-hairstyle-required");
      } else if (asset.construction !== "separate-piece") issue(path, "separate-equipment-required");
    } else if (asset.kind !== "occlusion-mask") issue(path, "unknown-asset-kind");
  });
  const rectValid = (rect: unknown, asset: Record<string, unknown> | undefined): rect is ExpeditionRect =>
    Array.isArray(rect) && rect.length === 4 && rect.every(n => finite(n) && Number.isSafeInteger(n)) &&
    rect[0] >= 0 && rect[1] >= 0 && rect[2] > 0 && rect[3] > 0 && !!asset &&
    integer(asset.width) && integer(asset.height) && rect[0] + rect[2] <= asset.width && rect[1] + rect[3] <= asset.height;
  const referenced = (id: unknown, kind: string, direction: unknown, path: string) => {
    const asset = typeof id === "string" ? assets.get(id) : undefined;
    if (!asset || asset.kind !== kind) issue(path, "invalid-asset-reference");
    else if (asset.facing !== direction) issue(path, "orientation-mismatch");
    return asset;
  };
  const clipKeys = new Set<string>();
  let frameCount = 0;
  for (let ci = 0; ci < value.clips.length; ci++) {
    const clip = value.clips[ci], path = `clips[${ci}]`;
    if (!record(clip)) { issue(path, "invalid-clip"); continue; }
    if (!identifier(clip.id) || !identifier(clip.appearanceId) || !facing(clip.facing)) issue(path, "invalid-clip-identity");
    const key = `${clip.id}/${clip.appearanceId}/${clip.facing}`;
    if (clipKeys.has(key)) issue(path, "duplicate-clip"); clipKeys.add(key);
    if (clip.bodyClock !== "gameplay" || clip.equipmentClock !== "independent") issue(path, "gameplay-clock-required");
    if (!Array.isArray(clip.frames) || clip.frames.length === 0) { issue(path, "missing-frames"); continue; }
    frameCount += clip.frames.length;
    if (frameCount > 100000) { issue(path, "import-too-large"); break; }
    const frameIds = new Set<string>();
    const itemFamilies = new Map<string, unknown>();
    for (let fi = 0; fi < clip.frames.length; fi++) {
      const frame = clip.frames[fi], fp = `${path}.frames[${fi}]`;
      if (!record(frame)) { issue(fp, "invalid-frame"); continue; }
      if (!identifier(frame.id) || frameIds.has(frame.id)) issue(fp, "invalid-frame-id");
      if (typeof frame.id === "string") frameIds.add(frame.id);
      if (!integer(frame.durationTicks)) issue(fp, "invalid-duration");
      if (!record(frame.body)) issue(fp, "missing-body");
      else {
        const body = referenced(frame.body.assetId, "body", clip.facing, `${fp}.body`);
        if (!rectValid(frame.body.rect, body)) issue(`${fp}.body`, "invalid-rect");
        if (!Array.isArray(frame.body.pivot) || frame.body.pivot.length !== 2 || !frame.body.pivot.every(finite)) issue(`${fp}.body`, "invalid-pivot");
      }
      if (!record(frame.attachments)) issue(fp, "missing-attachments");
      else for (const id of EXPEDITION_ATTACHMENTS) {
        const anchor = frame.attachments[id];
        if (!record(anchor) || !finite(anchor.x) || !finite(anchor.y) || !finite(anchor.rotation)) issue(`${fp}.attachments.${id}`, "invalid-attachment");
      }
      if (!Array.isArray(frame.ownership) || !Array.isArray(frame.equipment) || !Array.isArray(frame.cues)) { issue(fp, "missing-frame-arrays"); continue; }
      const ownership = new Map<string, Record<string, unknown>>();
      for (const state of frame.ownership) {
        if (!record(state) || !identifier(state.itemId) || !member(state.family, EXPEDITION_EQUIPMENT_FAMILIES) || !member(state.location, locations)) { issue(fp, "invalid-item-state"); continue; }
        if (ownership.has(state.itemId)) issue(fp, "duplicate-item-state"); else ownership.set(state.itemId, state);
        if (itemFamilies.has(state.itemId) && itemFamilies.get(state.itemId) !== state.family) issue(fp, "item-family-changed");
        itemFamilies.set(state.itemId, state.family);
      }
      const drawn = new Map<string, string[]>();
      for (let ei = 0; ei < frame.equipment.length; ei++) {
        const placement = frame.equipment[ei], ep = `${fp}.equipment[${ei}]`;
        if (!record(placement)) { issue(ep, "invalid-placement"); continue; }
        const asset = referenced(placement.assetId, "equipment", clip.facing, ep);
        if (!rectValid(placement.rect, asset)) issue(ep, "invalid-rect");
        const state = typeof placement.itemId === "string" ? ownership.get(placement.itemId) : undefined;
        if (!state || state.location === "absent" || state.location !== placement.location || state.family !== asset?.family) issue(ep, "ownership-mismatch");
        if (typeof placement.itemId === "string") drawn.set(placement.itemId, [...(drawn.get(placement.itemId) ?? []), String(asset?.construction)]);
        if (!record(placement.occlusion)) issue(ep, "missing-occlusion");
        else if (placement.occlusion.mode === "mask") {
          const mask = referenced(placement.occlusion.assetId, "occlusion-mask", clip.facing, `${ep}.occlusion`);
          if (!rectValid(placement.occlusion.rect, mask)) issue(ep, "invalid-occlusion-mask");
        } else if (placement.occlusion.mode !== "none") issue(ep, "invalid-occlusion");
      }
      for (const [itemId, state] of ownership) {
        const passes = drawn.get(itemId) ?? [];
        if (state.location === "absent") { if (passes.length) issue(fp, "absent-item-drawn"); continue; }
        // Hair can use two complementary whole-style passes, never cloned strands.
        const hairPair = state.family === "dreadlocks" && passes.length === 2 && passes.includes("hairstyle-front") && passes.includes("hairstyle-back");
        const completeSingle = passes.length === 1 && (state.family !== "dreadlocks" || passes[0] === "whole-hairstyle");
        if (!completeSingle && !hairPair) issue(fp, "item-missing-or-duplicated");
      }
      for (const cue of frame.cues) {
        if (!record(cue) || !identifier(cue.eventId) || cue.source !== "gameplay" || !empty(cue.effects)) issue(fp, "animation-effect-forbidden");
      }
    }
  }
  return result(value.clips.length);
}
