import {
  HUNTER_BODY_PART_BONES,
  hunterWristbladeRegistrationMatrix,
  HUNTER_ARMOR_KEEP_CLIP_V145,
  hunterGreaveMatrixV145,
  hunterShoulderPlateMatrixV145,
  hunterArmorPath, hunterBodyPartPath, hunterBodyPartPlacement, hunterDreadPath, hunterEquipmentPath,
  hunterMaskRigPath, hunterMaskRigPlacement, hunterNetPartPath,
  type HunterBodyPartId,
} from "./hunterVisuals";
import { hunterBodyPartColorV62, hunterBodyPartClipV62, type HunterLayerPlacement } from "./hunterHeadArtV62";
import { HUNTER_DREAD_SOURCE_ROOT, solveHunterDreadsV63, solveHunterSideDreadsV145, HUNTER_DREAD_SIDE_STRANDS_V145 } from "./hunterDreadsV63";
import {
  HUNTER_RIG_CANVAS, relativeBoneMatrix, solveHunterRig,
  type HunterRigBoneId,
} from "./hunterRig";
import { resolvePitFighterAnimation } from "./pitFighterAnimation";
import { PIT_FIGHTERS, type PitFighterId, type PitFighterState } from "./systems/pitCombat";
import { gauntletFrontArmMatrixV145 } from "./systems/gauntletRigSpritesV139";

export const PIT_MODULAR_FIGHTER_IDS = ["jungle-hunter", "berserker"] as const;
export type PitModularFighterId = typeof PIT_MODULAR_FIGHTER_IDS[number];
type ClipRect = readonly [x: number, y: number, width: number, height: number];

export interface PitFighterArtLayer {
  readonly id: string;
  readonly src: string;
  readonly bone: HunterRigBoneId;
  readonly depth: number;
  readonly filter?: string;
  readonly opacity?: number;
  readonly offset?: readonly [number, number];
  readonly clip?: readonly ClipRect[];
  readonly rotation?: number;
  readonly scale?: number;
  readonly pivot?: readonly [number, number];
  readonly placement?: HunterLayerPlacement;
  /** V145 source-space registration applied right after the bone matrix. */
  readonly fit?: { readonly a: number; readonly b: number; readonly c: number; readonly d: number; readonly e: number; readonly f: number };
}

/**
 * QA compositions from existing OpenAI V3 cutouts, not certified film likenesses.
 * No silhouette is cut out of V23 selection art, no bitmap is modified.
 * Source registration remains 256x384; clips reject foreign islands in old exports.
 */
const PROFILE_LAYERS = new Map<PitFighterId, readonly PitFighterArtLayer[]>();

export function getPitFighterArtLayers(fighterId: PitFighterId): readonly PitFighterArtLayer[] {
  const cached = PROFILE_LAYERS.get(fighterId);
  if (cached) return cached;
  if (fighterId !== "jungle-hunter" && fighterId !== "berserker") return [];
  const superHunter = fighterId === "berserker";
  const morph = superHunter ? "super" : "classic";
  const armorFilter = superHunter ? "saturate(.8) brightness(.82)" : "sepia(.2) saturate(.95)";
  const order: readonly HunterBodyPartId[] = [
    "thigh-back", "shin-back", "foot-back", "upper-arm-back", "lower-arm-back", "hand-back",
    "pelvis", "torso", "head", "thigh-front", "shin-front", "foot-front",
    "upper-arm-front", "lower-arm-front", "hand-front",
  ];
  const layers: PitFighterArtLayer[] = order.map((part, index) => ({
    id: "body-" + part, src: hunterBodyPartPath(morph, part),
    placement: hunterBodyPartPlacement(morph, part), filter: hunterBodyPartColorV62(morph, part, "none"),
    bone: HUNTER_BODY_PART_BONES[part], depth: part === "hand-front" ? 67 : part === "hand-back" ? 40 : 20 + index * 3,
    clip: part === "hand-front"
      ? superHunter ? [[202, 211, 35, 44]] : [[195, 210, 30, 22], [205, 232, 20, 10]]
      : part === "hand-back"
        ? superHunter ? [[19, 210, 46, 44]] : [[30, 211, 30, 39]]
        : hunterBodyPartClipV62(morph, part),
  }));
  // Berserker has no body net. Neither profile puts a net over fingers/biomask.
  if (!superHunter) {
    for (const part of ["torso", "pelvis", "upper-arm-front", "upper-arm-back", "thigh-front", "thigh-back"] as const) {
      const body = layers.find((layer) => layer.id === "body-" + part)!;
      layers.push({ id: "net-" + part, src: hunterNetPartPath(morph, part), bone: body.bone, depth: body.depth + .2, opacity: .72 });
    }
  }
  for (const [strand, rig] of solveHunterDreadsV63(solveHunterRig({pose:'idle',facing:1,phase:0}), morph, 'classic').entries()) {
    layers.push({
      id: "dread-" + strand, src: hunterDreadPath("classic"), bone: "head", depth: 3 + strand,
      offset: [rig.x, rig.y], rotation: rig.angle,
      scale: rig.scale, pivot: [HUNTER_DREAD_SOURCE_ROOT.x, HUNTER_DREAD_SOURCE_ROOT.y],
      filter: "saturate(.7) brightness(.65)",
    });
  }
  const armor = [
    [superHunter ? "chest-super" : "chest-classic", "torso", 44],
    ["belt", "pelvis", 45],
    [superHunter ? "shoulder-super" : "shoulder-classic", "armFrontUpper", 57],
    ["shin", "legFrontLower", 54],
  ] as const;
  for (const [id, bone, depth] of armor) {
    const shoulder = id.startsWith("shoulder-");
    layers.push({ id: "armor-" + id, src: hunterArmorPath(id), bone, depth, filter: armorFilter,
      clip: id === "shin" ? [[163, 283, 25, 59]] : HUNTER_ARMOR_KEEP_CLIP_V145[id],
      fit: shoulder ? hunterShoulderPlateMatrixV145(morph) : id === "shin" ? hunterGreaveMatrixV145(morph, "shin", "front") : undefined });
  }
  // V145 far-side greave on the back shin.
  layers.push({ id: "armor-shin-back", src: hunterArmorPath("shin"), bone: "legBackLower", depth: 23.5,
    filter: armorFilter + " brightness(.72)", clip: [[163, 283, 25, 59]], fit: hunterGreaveMatrixV145(morph, "shin", "back") });
  // V145 side dreadlocks, in front of the near shoulder; matrices come from the posed frame.
  for (const index of HUNTER_DREAD_SIDE_STRANDS_V145.classic.keys()) {
    layers.push({ id: "dside-" + index, src: hunterDreadPath("classic"), bone: "head", depth: 58,
      filter: "saturate(.7) brightness(.65)" });
  }
  // V145: wrist computer on the FRONT forearm, blades on the back one (see HunterRigPreview).
  for (const [id, depth] of [["gauntlet-base", 60], ["gauntlet-lid", 60.1]] as const) {
    layers.push({ id, src: hunterEquipmentPath(id), bone: "armFrontLower", depth, filter: armorFilter, fit: gauntletFrontArmMatrixV145(morph, false) });
  }
  for (const [part, bone, depth] of [
    ["mount", "casterShoulderMount", 41], ["caster-upper", "casterUpperArm", 42],
    ["caster-lower", "casterLowerArm", 43], ["yoke", "casterYoke", 44],
    ["cannon", "casterCannon", 45], ["barrel", "casterBarrel", 46], ["muzzle", "casterMuzzle", 47],
  ] as const) {
    layers.push({ id: "caster-" + part, src: hunterEquipmentPath(part), bone, depth });
  }
  layers.push(
    { id: "mask", src: hunterMaskRigPath(superHunter ? "berserker" : "jungle"), placement: hunterMaskRigPlacement(superHunter ? "berserker" : "jungle"), bone: "head", depth: 48 },
    { id: "blade-housing", src: hunterEquipmentPath("blade-housing"), bone: "armBackLower", depth: 40.6, filter: armorFilter, fit: hunterWristbladeRegistrationMatrix(morph) },
    {
      id: "blades", src: hunterEquipmentPath("blades"), bone: "armBackLower", depth: 40.5, fit: hunterWristbladeRegistrationMatrix(morph),
      // One existing blade for Berserker; preserve source pixels without drawing a substitute.
      clip: superHunter ? [[196, 204, 54, 11], [236, 215, 9, 1]] : undefined,
    },
  );
  const ordered = Object.freeze(layers.sort((a, b) => a.depth - b.depth));
  PROFILE_LAYERS.set(fighterId, ordered);
  return ordered;
}

export interface PitFighterArtBank {
  readonly images: ReadonlyMap<string, HTMLImageElement>;
  readonly readyIds: ReadonlySet<PitFighterId>;
  readonly failedIds: ReadonlySet<PitFighterId>;
}
export function isPitFighterArtReady(bank: PitFighterArtBank, id: PitFighterId): boolean {
  const layers = getPitFighterArtLayers(id);
  return layers.length > 0 && bank.readyIds.has(id) &&
    layers.every((layer) => {
      const image = bank.images.get(layer.src);
      return Boolean(image?.complete && image.naturalWidth > 0 && image.naturalHeight > 0);
    });
}

/** Resolve the complete profile atomically. Never show a body with missing hands. */
export async function loadPitFighterArt(
  ids: readonly PitFighterId[] = PIT_MODULAR_FIGHTER_IDS,
): Promise<PitFighterArtBank> {
  const profiles = [...new Set(ids)].filter((id) => getPitFighterArtLayers(id).length > 0);
  const images = new Map<string, HTMLImageElement>();
  const readyIds = new Set<PitFighterId>();
  const failedIds = new Set<PitFighterId>();
  if (typeof Image === "undefined") {
    profiles.forEach((id) => failedIds.add(id));
    return { images, readyIds, failedIds };
  }
  const sources = new Set(profiles.flatMap((id) => getPitFighterArtLayers(id).map((layer) => layer.src)));
  await Promise.all([...sources].map((src) => new Promise<void>((resolve) => {
    const image = new Image();
    let settled = false;
    const finish = (success: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      if (success && image.naturalWidth > 0 && image.naturalHeight > 0) images.set(src, image);
      resolve();
    };
    const timer = setTimeout(() => finish(false), 12000);
    image.onload = () => finish(true);
    image.onerror = () => finish(false);
    image.src = src;
  })));
  for (const id of profiles) {
    if (getPitFighterArtLayers(id).every((layer) => images.has(layer.src))) readyIds.add(id);
    else failedIds.add(id);
  }
  return { images, readyIds, failedIds };
}

const BIND_FRAME = solveHunterRig({ pose: "idle", phase: 0, facing: 1 });
export interface PitFighterRenderOptions {
  highContrast?: boolean;
  accent?: string;
}

/** Presentation only: no combat state writes, hitboxes or gameplay timings. */
export function drawPitModularFighter(
  context: CanvasRenderingContext2D,
  bank: PitFighterArtBank,
  fighter: PitFighterState,
  simulationFrame: number,
  groundY: number,
  options: PitFighterRenderOptions = {},
): boolean {
  if (!isPitFighterArtReady(bank, fighter.definitionId)) return false;
  const animation = resolvePitFighterAnimation(fighter, simulationFrame);
  const definition = PIT_FIGHTERS[fighter.definitionId];
  const scale = definition.bodyHeight / 326;
  context.save();
  context.translate(fighter.x, groundY - fighter.y);
  context.scale(scale, scale);
  context.translate(-128, -HUNTER_RIG_CANVAS.groundY);
  context.imageSmoothingEnabled = false;
  if (fighter.cloakPhase !== "inactive") {
    context.globalAlpha *= fighter.cloakPhase === "active" ? .38 : .65;
  }
  if (options.highContrast) {
    context.shadowColor = options.accent ?? "#eaffed";
    context.shadowBlur = 4;
  }
  const dreads = solveHunterDreadsV63(animation.frame, fighter.definitionId === 'berserker' ? 'super' : 'classic', 'classic');
  const sideDreads = solveHunterSideDreadsV145(animation.frame, fighter.definitionId === 'berserker' ? 'super' : 'classic', 'classic');
  for (const layer of getPitFighterArtLayers(fighter.definitionId)) {
    if (layer.id === "blades" && animation.bladeExtension <= 0) continue;
    const dread = layer.id.startsWith('dread-') ? dreads[Number(layer.id.slice(6))]
      : layer.id.startsWith('dside-') ? sideDreads[Number(layer.id.slice(6))] : undefined;
    const matrix = dread?.matrix ?? relativeBoneMatrix(animation.frame, BIND_FRAME, layer.bone);
    context.save();
    context.transform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f);
    if (layer.fit && !dread) context.transform(layer.fit.a, layer.fit.b, layer.fit.c, layer.fit.d, layer.fit.e, layer.fit.f);
    context.globalAlpha *= layer.opacity ?? 1;
    if (layer.filter) context.filter = layer.filter;
    if (!dread) context.translate(layer.offset?.[0] ?? 0, layer.offset?.[1] ?? 0);
    if (layer.pivot && !dread) {
      context.translate(...layer.pivot);
      context.rotate(layer.rotation ?? 0);
      context.scale(layer.scale ?? 1, layer.scale ?? 1);
      context.translate(-layer.pivot[0], -layer.pivot[1]);
    }
    if (layer.id === "blades") {
      // Extend away from the housing, never toward the hand or through the wrist.
      context.beginPath();
      context.rect(198, 190, 90, 55);
      context.clip();
      context.translate(-42 * (1 - animation.bladeExtension), 0);
    }
    if (layer.clip) {
      context.beginPath();
      for (const [x, y, width, height] of layer.clip) context.rect(x, y, width, height);
      context.clip();
    }
    context.drawImage(bank.images.get(layer.src)!, layer.placement?.x ?? 0, layer.placement?.y ?? 0,
      layer.placement?.width ?? HUNTER_RIG_CANVAS.width, layer.placement?.height ?? HUNTER_RIG_CANVAS.height);
    context.restore();
  }
  context.restore();
  return true;
}
