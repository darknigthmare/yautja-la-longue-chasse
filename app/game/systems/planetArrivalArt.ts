import { shipProfileAssetPath, type ShipId } from '../shipCatalogue';
import type { BiomeId } from '../types';
import { ARRIVAL_GROUND_ART } from './planetArrivalGroundArt';
import { arrivalVfxArtForBiome } from './planetArrivalVfxArt';

/**
 * Screen-space calibration of the existing, individually authored artwork.
 * Every point is normalized against the FULL source image, including its alpha
 * margins. Render at its native aspect ratio before rotating or attaching VFX.
 * These are technical/art-composition observations, not human approval or proof
 * of canonical spacecraft docking geometry. The source images stay unchanged.
 */
export interface ArrivalArtPoint { x: number; y: number }

export interface ArrivalCarrierArt {
  width: number;
  height: number;
  nose: ArrivalArtPoint;
  tail: ArrivalArtPoint;
  /** Authored cinematic underside contact; not a newly asserted canon bay. */
  release: ArrivalArtPoint;
  /** Visible hull support and compositional exit, calibrated for surface-capable hulls. */
  groundContact: ArrivalArtPoint;
  groundExit: ArrivalArtPoint;
  review: 'inspected-source-art' | 'unreviewed';
  directionBasis: 'visible-hull' | 'symmetric-screen-convention' | 'authored-view-with-perspective' | 'unreviewed';
}

export interface ArrivalPlanetArt {
  width: number;
  height: number;
  center: ArrivalArtPoint;
  radiusX: number;
  radiusY: number;
}

const normalized = (x: number, y: number, width: number, height: number): ArrivalArtPoint => ({ x: x / width, y: y / height });

export const ARRIVAL_SPRITES = Object.freeze({
  podFlight: {
    width: 1536, height: 1024,
    nose: normalized(1400, 506, 1536, 1024),
    tail: normalized(185, 515, 1536, 1024),
    pivot: normalized(768, 512, 1536, 1024),
  },
  // This is a bow-shock/plasma wake, not a rocket exhaust. Its bright head
  // attaches to the leading nose; the tail extends opposite the velocity.
  heatTrail: {
    width: 2172, height: 724,
    origin: normalized(100, 505, 2172, 724),
    end: normalized(1950, 165, 2172, 724),
  },
  releaseJet: {
    width: 1774, height: 887,
    origin: normalized(280, 500, 1774, 887),
    end: normalized(1420, 490, 1774, 887),
  },
  podGround: {
    width: 1024, height: 1536,
    foot: normalized(507.5, 1496, 1024, 1536),
    doorHinge: normalized(500, 490, 1024, 1536),
    threshold: normalized(500, 1176, 1024, 1536),
    // The visible opening excludes the opaque frame and raised lower shell.
    doorway: [[500, 490], [558, 516], [604, 558], [633, 638], [645, 1060],
      [626, 1138], [598, 1178], [398, 1178], [365, 1138], [351, 1060],
      [347, 638], [372, 558], [436, 516]].map(([x, y]) => normalized(x, y, 1024, 1536)),
  },
  podDoor: {
    width: 887, height: 1774,
    hinge: normalized(444, 108, 887, 1774),
    // Ratio of the full door image width to the full ground-pod image width.
    // Includes both alpha margins. The hinge stays attached while it opens.
    widthInGround: .385,
  },
  impactDust: {
    width: 1774, height: 887,
    foot: normalized(887, 760, 1774, 887),
  },
});

/** Independent parts and two genuinely separate vapor phases; originals remain in V1. */
export const ARRIVAL_COMPLETION_ART = Object.freeze({
  podDoor: '/game/planet-arrival/v2/pod-hatch.webp',
  podDoorInterior: '/game/planet-arrival/v2/pod-hatch-interior.webp',
  vapor: '/game/planet-arrival/v2/vent-vapor.webp',
  vaporThin: '/game/planet-arrival/v2/vent-vapor-thin.webp',
  impactFragment: '/game/planet-arrival/v2/impact-fragment.webp',
});

export const ARRIVAL_COMPLETION_SPRITES = Object.freeze({
  vapor: { width: 1254, height: 1254, origin: normalized(384, 1117, 1254, 1254) },
  impactFragment: { width: 1254, height: 1254, pivot: normalized(584, 834, 1254, 1254) },
  // The two doorway lip seams are part of the existing shell, not detached emitters.
  vents: { left: normalized(332, 570, 1024, 1536), right: normalized(655, 570, 1024, 1536) },
});

export function arrivalImpactArtForBiome(biome: BiomeId) {
  const art = arrivalVfxArtForBiome(biome).front;
  // Sound retains its three audited physical classes; the image now follows the
  // actual destination instead of recolouring one dry or wet contact everywhere.
  const material = biome === 'ice' ? 'ice' : biome === 'ocean' || biome === 'swamp' ? 'wet' : 'dry';
  return { width: art.width, height: art.height, foot: art.anchor, path: art.path, material };
}

const globe = (cx: number, cy: number, rx: number, ry: number): ArrivalPlanetArt => ({
  width: 256, height: 256, center: normalized(cx, cy, 256, 256),
  radiusX: rx / 256, radiusY: ry / 256,
});

/** The opaque V10 globe plates have different black margins and off-centre disks. */
const PLANET_ART: Readonly<Record<string, ArrivalPlanetArt>> = Object.freeze({
  'planet-oseris-iv': globe(130, 142, 110, 112),
  'planet-nivalis-k': globe(126, 142, 110, 113),
  'planet-cinder-12': globe(123, 143, 110, 112),
  'planet-naraka-delta': globe(121, 142, 110, 112),
  'planet-serekh-9': globe(122, 142, 110, 113),
  'planet-pelagos-m': globe(116, 142, 110, 112),
  'planet-mycora-v': globe(129, 134, 111, 113),
  'planet-acheron-sigma': globe(127, 134, 111, 112),
});

export function planetArtForDestination(destinationId: string): ArrivalPlanetArt | null {
  return PLANET_ART[destinationId] ?? null;
}

const carrier = (
  width: number, height: number,
  noseX: number, noseY: number, tailX: number, tailY: number,
  releaseX: number, releaseY: number,
  directionBasis: ArrivalCarrierArt['directionBasis'] = 'visible-hull',
): ArrivalCarrierArt => ({
  width, height,
  nose: normalized(noseX, noseY, width, height),
  tail: normalized(tailX, tailY, width, height),
  release: normalized(releaseX, releaseY, width, height),
  groundContact: normalized(releaseX, releaseY, width, height),
  groundExit: normalized(releaseX, releaseY, width, height),
  review: 'inspected-source-art', directionBasis,
});

// Keyed by the resolved path so V14 canonical replacements and the deliberately
// separate project-original V12 identities cannot silently share their pivots.
const CARRIER_ART_BY_ASSET: Readonly<Record<string, ArrivalCarrierArt>> = Object.freeze({
  '/game/ships/v12/advanced-predator-ship.webp': carrier(1666, 944, 70, 465, 1540, 465, 700, 619),
  '/game/ships/v12/avp-2010-mothership.webp': carrier(1774, 887, 90, 440, 1690, 440, 790, 715),
  '/game/ships/v12/avp-predator-drop-pod.webp': carrier(1774, 887, 280, 445, 1470, 445, 880, 577),
  '/game/ships/v12/avp-predator-mothership.webp': carrier(1536, 1024, 30, 570, 1480, 570, 600, 689),
  '/game/ships/v12/avpr-scout-ship.webp': carrier(1536, 1024, 108, 525, 1380, 525, 650, 710),
  '/game/ships/v12/bad-blood-ship.webp': carrier(1536, 1024, 65, 500, 1460, 500, 810, 819),
  '/game/ships/v12/big-game-saucer.webp': carrier(1693, 929, 1640, 440, 50, 440, 846, 639, 'symmetric-screen-convention'),
  '/game/ships/v12/blade-fighter.webp': carrier(1693, 929, 65, 460, 1610, 460, 900, 641),
  '/game/ships/v12/brute-jotunn-scout.webp': carrier(1536, 1024, 100, 520, 1400, 520, 850, 703),
  '/game/ships/v12/bullet-ship.webp': carrier(1847, 852, 100, 420, 1710, 420, 900, 560),
  '/game/ships/v12/chicken-ship.webp': carrier(1536, 1024, 185, 350, 1390, 720, 770, 842),
  '/game/ships/v12/classic-predator-spaceship.webp': carrier(1536, 1024, 133, 485, 1400, 485, 544, 655),
  '/game/ships/v12/cold-war-ship.webp': carrier(1693, 929, 70, 468, 1600, 468, 700, 582),
  '/game/ships/v12/collector-ship.webp': carrier(1536, 1024, 40, 468, 1490, 468, 590, 779),
  '/game/ships/v12/cursed-earth-ship.webp': carrier(1774, 887, 65, 445, 1670, 445, 840, 665),
  '/game/ships/v12/dek-mother-ship.webp': carrier(1536, 1024, 100, 500, 1440, 500, 980, 589),
  '/game/ships/v12/dog-ship.webp': carrier(1536, 1024, 65, 632, 1465, 632, 850, 742),
  '/game/ships/v12/emergency-escape-pod.webp': carrier(1536, 1024, 285, 620, 1200, 620, 780, 807),
  '/game/ships/v12/enforcer-ship.webp': carrier(1693, 929, 40, 540, 1630, 540, 740, 659),
  '/game/ships/v12/evolution-scout-ship.webp': carrier(1536, 1024, 30, 550, 1480, 550, 630, 761),
  '/game/ships/v12/feral-clan-ships.webp': carrier(1591, 989, 100, 565, 1420, 565, 900, 687),
  '/game/ships/v12/feral-spaceship.webp': carrier(1700, 925, 95, 460, 1590, 460, 880, 656),
  '/game/ships/v12/fortnite-predator-ship.webp': carrier(1693, 929, 220, 470, 1450, 470, 880, 672),
  '/game/ships/v12/fugitive-spaceship.webp': carrier(1625, 968, 75, 525, 1520, 525, 830, 656),
  '/game/ships/v12/game-preserve-ship.webp': carrier(1693, 929, 65, 510, 1580, 510, 870, 648),
  '/game/ships/v12/golden-mothership.webp': carrier(1774, 887, 35, 465, 1720, 465, 920, 712),
  '/game/ships/v12/gotham-city-ship.webp': carrier(1774, 887, 60, 410, 1680, 410, 850, 607),
  '/game/ships/v12/gotham-enforcer-ship.webp': carrier(1693, 929, 100, 475, 1550, 475, 850, 641),
  '/game/ships/v12/grendel-king-ship.webp': carrier(1536, 1024, 110, 660, 1450, 660, 910, 734),
  '/game/ships/v12/hook-predator-ship.webp': carrier(1693, 929, 60, 515, 1610, 515, 900, 628),
  '/game/ships/v12/hunting-grounds-ship.webp': carrier(1774, 887, 135, 448, 1610, 448, 750, 598),
  '/game/ships/v12/huntmaster-ship.webp': carrier(1774, 887, 60, 445, 1690, 445, 850, 673),
  '/game/ships/v12/kwei-ship.webp': carrier(1536, 1024, 60, 570, 1500, 570, 900, 733),
  '/game/ships/v12/lost-tribe-spaceship.webp': carrier(1728, 910, 80, 470, 1610, 470, 790, 601),
  '/game/ships/v12/lunar-mothership.webp': carrier(1774, 887, 35, 445, 1700, 445, 900, 652),
  '/game/ships/v12/nedtesei.webp': carrier(1693, 929, 75, 570, 1600, 570, 870, 819),
  '/game/ships/v12/new-york-enforcer-ship.webp': carrier(1536, 1024, 25, 610, 1485, 610, 800, 656),
  '/game/ships/v12/predator-dropship.webp': carrier(1536, 1024, 105, 525, 1445, 525, 800, 811),
  '/game/ships/v12/predator-fleet.webp': carrier(1536, 1024, 124, 513, 1420, 513, 800, 651),
  '/game/ships/v12/predator-shuttle.webp': carrier(1693, 929, 125, 450, 1560, 450, 800, 723),
  '/game/ships/v12/royal-predator-ship.webp': carrier(1774, 887, 50, 455, 1700, 455, 880, 499),
  '/game/ships/v12/safari-ship.webp': carrier(1693, 929, 100, 485, 1550, 485, 850, 664),
  '/game/ships/v12/shell-ship.webp': carrier(1536, 1024, 30, 620, 1485, 620, 760, 803),
  '/game/ships/v12/upgrade-spaceship.webp': carrier(1536, 1024, 50, 515, 1470, 515, 830, 676),
  '/game/ships/v12/wolf-ship.webp': carrier(1693, 929, 160, 465, 1530, 465, 790, 649),
  '/game/ships/v12/wwii-cyborg-pilot-ship.webp': carrier(1536, 1024, 45, 580, 1480, 580, 800, 692),
  '/game/ships/v12/yautja-gunship.webp': carrier(1624, 969, 120, 540, 1470, 540, 820, 765),
  '/game/ships/v14/avp-predator-drop-pod.webp': carrier(1536, 1024, 1360, 508, 300, 515, 1000, 614),
  '/game/ships/v14/avp-predator-mothership.webp': carrier(1774, 887, 1645, 455, 91, 546, 860, 721),
  '/game/ships/v14/avpr-scout-ship.webp': carrier(1536, 1024, 1390, 625, 200, 510, 850, 702),
  '/game/ships/v14/feral-spaceship.webp': carrier(1672, 941, 1620, 540, 110, 540, 900, 666),
  '/game/ships/v14/fugitive-spaceship.webp': carrier(1693, 929, 1540, 405, 250, 465, 1080, 668),
  '/game/ships/v14/game-preserve-ship.webp': carrier(1735, 906, 1525, 565, 160, 445, 1000, 601),
  '/game/ships/v14/upgrade-spaceship.webp': carrier(1672, 941, 1590, 540, 220, 470, 1000, 580, 'authored-view-with-perspective'),
  '/game/ships/v14/wolf-ship.webp': carrier(1761, 893, 1640, 430, 235, 495, 850, 666),
});

const UNREVIEWED_CARRIER: ArrivalCarrierArt = {
  width: 1536, height: 1024,
  nose: { x: .75, y: .5 }, tail: { x: .25, y: .5 }, release: { x: .5, y: .7 },
  groundContact: { x: .5, y: .7 }, groundExit: { x: .5, y: .7 },
  review: 'unreviewed', directionBasis: 'unreviewed',
};

export function carrierArtForShip(shipId: ShipId): ArrivalCarrierArt {
  const path = shipProfileAssetPath(shipId);
  const art = CARRIER_ART_BY_ASSET[path] ?? UNREVIEWED_CARRIER;
  return ARRIVAL_GROUND_ART[path] ? { ...art, ...ARRIVAL_GROUND_ART[path] } : art;
}
