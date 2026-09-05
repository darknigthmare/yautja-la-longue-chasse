import {
  HUNTER_BODY_PART_BONES,
  HUNTER_GAUNTLET_FIT_BY_MORPH,
  hunterArmorPath, hunterBodyPartPath, hunterDreadPath, hunterEquipmentPath,
  hunterMaskRigPath, hunterNetPartPath,
  type HunterBodyPartId,
} from "./hunterVisuals";
import {
  HUNTER_RIG_CANVAS, relativeBoneMatrix, solveHunterRig,
  type HunterRigBoneId,
} from "./hunterRig";
import { resolvePitFighterAnimation } from "./pitFighterAnimation";
import { PIT_FIGHTERS, type PitFighterId, type PitFighterState } from "./systems/pitCombat";

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
    bone: HUNTER_BODY_PART_BONES[part], depth: part === "hand-front" ? 67 : part === "hand-back" ? 40 : 20 + index * 3,
    clip: part === "hand-front"
      ? superHunter ? [[202, 211, 35, 44]] : [[195, 210, 30, 22], [205, 232, 20, 10]]
      : part === "hand-back"
        ? superHunter ? [[19, 210, 46, 44]] : [[30, 211, 30, 39]]
        : undefined,
  }));
  // Berserker has no body net. Neither profile puts a net over fingers/biomask.
  if (!superHunter) {
    for (const part of ["torso", "pelvis", "upper-arm-front", "upper-arm-back", "thigh-front", "thigh-back"] as const) {
      const body = layers.find((layer) => layer.id === "body-" + part)!;
      layers.push({ id: "net-" + part, src: hunterNetPartPath(morph, part), bone: body.bone, depth: body.depth + .2, opacity: .72 });
    }
  }
  for (let strand = 0; strand < 7; strand++) {
    layers.push({
      id: "dread-" + strand, src: hunterDreadPath("classic"), bone: "head", depth: 3 + strand,
      offset: [-12 + strand * 4, strand < 4 ? -strand : strand - 4],
      rotation: (-14 + strand * 3) * Math.PI / 180,
      scale: .78 + (3 - Math.abs(3 - strand)) * .09, pivot: [143, 43],
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
    layers.push({ id: "armor-" + id, src: hunterArmorPath(id), bone, depth, filter: armorFilter, clip: id === "shin" ? [[163, 283, 25, 59]] : undefined });
  }
  const fit = HUNTER_GAUNTLET_FIT_BY_MORPH[morph];
  for (const [id, depth] of [["gauntlet-base", 37], ["gauntlet-lid", 38]] as const) {
    layers.push({ id, src: hunterEquipmentPath(id), bone: "armBackLower", depth, offset: [fit.translateX, fit.translateY], filter: armorFilter });
  }
  for (const [part, bone, depth] of [
    ["mount", "casterShoulderMount", 41], ["caster-upper", "casterUpperArm", 42],
    ["caster-lower", "casterLowerArm", 43], ["yoke", "casterYoke", 44],
    ["cannon", "casterCannon", 45], ["barrel", "casterBarrel", 46], ["muzzle", "casterMuzzle", 47],
  ] as const) {
    layers.push({ id: "caster-" + part, src: hunterEquipmentPath(part), bone, depth });
  }
  layers.push(
    { id: "mask", src: hunterMaskRigPath(superHunter ? "berserker" : "jungle"), bone: "head", depth: 48 },
    { id: "blade-housing", src: hunterEquipmentPath("blade-housing"), bone: "armFrontLower", depth: 62, filter: armorFilter },
    {
      id: "blades", src: hunterEquipmentPath("blades"), bone: "armFrontLower", depth: 63,
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
  for (const layer of getPitFighterArtLayers(fighter.definitionId)) {
    if (layer.id === "blades" && animation.bladeExtension <= 0) continue;
    const matrix = relativeBoneMatrix(animation.frame, BIND_FRAME, layer.bone);
    context.save();
    context.transform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f);
    context.globalAlpha *= layer.opacity ?? 1;
    if (layer.filter) context.filter = layer.filter;
    context.translate(layer.offset?.[0] ?? 0, layer.offset?.[1] ?? 0);
    if (layer.pivot) {
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
    context.drawImage(bank.images.get(layer.src)!, 0, 0, HUNTER_RIG_CANVAS.width, HUNTER_RIG_CANVAS.height);
    context.restore();
  }
  context.restore();
  return true;
}
