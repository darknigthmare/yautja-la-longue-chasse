import type {
  GalaxyBodyType,
  GalaxySystemVisualProfile,
} from "./galaxyRegistry";

export const GALAXY_V10_BACKGROUNDS = Object.freeze({
  galaxy: "/game/backgrounds/v10/galaxy-overview-v10.webp",
  sector: "/game/backgrounds/v10/sector-nebula-v10.webp",
  system: "/game/backgrounds/v9/galaxy-sector-v9.webp",
} as const);

export const GALAXY_V11_SYSTEM_BACKGROUNDS = Object.freeze({
  "oseris-amber-canopy": "/game/backgrounds/v11/systems/system-oseris.webp",
  "nivalis-crystal-halo": "/game/backgrounds/v11/systems/system-nivalis.webp",
  "cinder-forge-dust": "/game/backgrounds/v11/systems/system-cinder.webp",
  "naraka-toxic-veil": "/game/backgrounds/v11/systems/system-naraka.webp",
  "serekh-copper-pilgrimage": "/game/backgrounds/v11/systems/system-serekh.webp",
  "pelagos-abyssal-blue": "/game/backgrounds/v11/systems/system-pelagos.webp",
  "mycora-spore-cloud": "/game/backgrounds/v11/systems/system-mycora.webp",
  "acheron-pale-ruins": "/game/backgrounds/v11/systems/system-acheron.webp",
  "kaail-hunting-preserve": "/game/backgrounds/v11/systems/system-kaail.webp",
  "vardos-binary-foundries": "/game/backgrounds/v11/systems/system-vardos.webp",
  "umbra-pulsar-lattice": "/game/backgrounds/v11/systems/system-umbra.webp",
  "tempest-ion-vortex": "/game/backgrounds/v11/systems/system-tempest.webp",
} as const satisfies Readonly<Record<string, string>>);

export function galaxySystemBackgroundPath(system: {
  readonly visualProfile: Readonly<GalaxySystemVisualProfile>;
}): string {
  return GALAXY_V11_SYSTEM_BACKGROUNDS[
    system.visualProfile.backgroundKey as keyof typeof GALAXY_V11_SYSTEM_BACKGROUNDS
  ] ?? GALAXY_V10_BACKGROUNDS.system;
}

export const GALAXY_V10_PLANET_IDS = Object.freeze([
  "planet-oseris-iv",
  "planet-oseris-ii",
  "planet-nivalis-k",
  "planet-nivalis-c",
  "planet-cinder-12",
  "planet-ferrum-6",
  "planet-naraka-delta",
  "planet-naraka-theta",
  "planet-serekh-9",
  "planet-serekh-prime",
  "planet-pelagos-m",
  "planet-thalassa-8",
  "planet-mycora-v",
  "planet-mycora-nox",
  "planet-acheron-sigma",
  "planet-acheron-tau",
  "planet-kaail-prime",
  "planet-kaail-rook",
  "planet-vardos-iii",
  "planet-carcer-7",
  "planet-umbra-terminus",
  "planet-noctis-4",
  "planet-aeris",
  "planet-fulmen",
] as const);

export const GALAXY_V10_AUXILIARY_IDS = Object.freeze([
  "moon-khepri",
  "belt-saal",
  "giant-boreal",
  "moon-kite",
  "moon-pyre",
  "belt-forge-ring",
  "moon-blackwater",
  "belt-ghar-wreck-reef",
  "moon-ossuary",
  "station-pilgrim-relay",
  "giant-tempest",
  "station-watcher-platform",
  "moon-quarantine",
  "anomaly-spore-drift",
  "station-acheron-orbital-city",
  "moon-obsidian",
  "station-herd-sanctuary",
  "station-vardos-shipyard",
  "station-pulsar-beacon",
  "giant-core",
] as const);

const PLANET_IDS = new Set<string>(GALAXY_V10_PLANET_IDS);
const AUXILIARY_IDS = new Set<string>(GALAXY_V10_AUXILIARY_IDS);

export const GALAXY_V10_BODY_FALLBACKS = Object.freeze({
  planet: "/game/planets/v10/planet-umbra-terminus.webp",
  auxiliary: "/game/celestial/v10/anomaly-spore-drift.webp",
} as const);

export function galaxyBodyVisualPath(body: {
  readonly id: string;
  readonly bodyKind: GalaxyBodyType;
}): string {
  if (body.bodyKind === "planet" && PLANET_IDS.has(body.id)) {
    return `/game/planets/v10/${body.id}.webp`;
  }
  if (AUXILIARY_IDS.has(body.id)) {
    return `/game/celestial/v10/${body.id}.webp`;
  }
  return body.bodyKind === "planet"
    ? GALAXY_V10_BODY_FALLBACKS.planet
    : GALAXY_V10_BODY_FALLBACKS.auxiliary;
}
