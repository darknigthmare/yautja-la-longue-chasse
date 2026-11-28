/** The Isles V1 · weather from data (app/game/data/islesLivingWorldV1.json: weatherTypes, weatherRules, relief).
 * The sky changes by blocks of `blockHours` game hours. Each block is drawn from the weights of the
 * island's climate with (seed, climate, block number) and nothing else: no clock of the machine, no
 * Math.random, no state. Same data, climate, hour and seed, same weather, on every client of a room.
 * Pure module: the data is a parameter, so it is testable without the DOM or the renderer. */

/** One weather type of the data: its numeric effects and its optional flags. */
export interface IslesWeatherTypeV1 {
  label: string;
  cloakDrain: number; humanSight: number; thermalContrast: number; noiseCover: number; moveFactor: number; fog: number;
  cloakFlicker?: boolean; lightning?: boolean; tracks?: boolean; stopsTransports?: string[];
}

/** The three blocks of islesLivingWorldV1.json the weather needs; the whole JSON can be passed as is.
 * The optional fields are tuning knobs the data may add later; each one has its default below. */
export interface IslesWeatherRulesV1 {
  weatherTypes: Record<string, IslesWeatherTypeV1>;
  weatherRules: {
    blockHours: number;
    altitude: {coldAbove: number; convert?: Record<string, string>};
    climates: Record<string, Record<string, number>>;
    transitionMinutes?: number;
    extreme?: {types: string[]; maxBlocks: number};
    lightning?: {perHour: number; flashSeconds: number};
  };
  relief?: {islands: Record<string, {snowLine: number | null}>};
}

/** Where the weather is asked for. `snowLine` omitted: the general `altitude.coldAbove` applies;
 * `null`: the island has no snow at all; a number: rain turns to snow above it. */
export interface IslesWeatherOptionsV1 { altitude?: number; snowLine?: number | null }

/** The numeric effects, interpolated during a transition. */
export const ISLES_WEATHER_EFFECTS_V1 = ["cloakDrain", "humanSight", "thermalContrast", "noiseCover", "moveFactor", "fog"] as const;

/** Name of a numeric effect of the weather. */
export type IslesWeatherEffectV1 = typeof ISLES_WEATHER_EFFECTS_V1[number];

/** Climate used when a place has none or an unknown one (the `chain` of cays has no climate). */
export const ISLES_WEATHER_DEFAULT_CLIMATE_V1 = "tropical humide";

/** The weather of a place at an instant. `type`, `label` and the flags are those of the current block;
 * the numeric effects come from the previous block while `blend` goes from 0 to 1. */
export interface IslesWeatherV1 extends Record<IslesWeatherEffectV1, number> {
  type: string; label: string;
  cloakFlicker: boolean; lightning: boolean; tracks: boolean; stopsTransports: string[];
  blend: number;
  /** Absolute game hour at which the next block starts. */
  nextChangeHours: number;
}

/** One coming block of the forecast. */
export interface IslesWeatherForecastV1 { type: string; label: string; startHours: number }

const DEFAULT_TRANSITION_MINUTES = 20;
/** Violent weather that must not settle: at most `maxBlocks` blocks in a row of the same type. */
const DEFAULT_EXTREME = {types: ["blizzard", "tempete", "tempete-de-sable"], maxBlocks: 2};
/** Above the snow line: rain falls as snow, a thunderstorm or a tropical storm is a blizzard. */
const DEFAULT_CONVERT: Record<string, string> = {pluie: "neige", orage: "blizzard", tempete: "blizzard"};
/** A few flashes per game hour, each one lasting a few game seconds. */
const DEFAULT_LIGHTNING = {perHour: 6, flashSeconds: 4};
/** Bound of the walk back along a run of identical draws; far beyond any run a weighted draw gives. */
const RUN_SCAN_LIMIT = 96;
/** Salts keeping the three uses of the hash apart. */
const SALT_DRAW = 0x1f83d9ab, SALT_REDRAW = 0x5be0cd19, SALT_LIGHTNING = 0x3c6ef372;

/** Integer mixer (murmur3 finaliser). */
function mix(h: number): number {
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

/** Deterministic value in [0, 1) from three integers and a salt. */
function hash3(a: number, b: number, c: number, salt: number): number {
  let h = mix((a | 0) ^ salt);
  h = mix(h ^ Math.imul(b | 0, 0x9e3779b1));
  h = mix(h ^ Math.imul(c | 0, 0x7feb352d));
  return h / 4294967296;
}

/** FNV-1a of a text, so that two climates never share a draw. */
function hashText(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return h | 0;
}

/** Weighted pick among the weather types the data knows; `skip` removes some of them. */
function pick(rules: IslesWeatherRulesV1, weights: Record<string, number>, roll: number, skip?: string[]): string | null {
  let total = 0;
  const usable: [string, number][] = [];
  for (const [type, weight] of Object.entries(weights)) {
    if (!(weight > 0) || !rules.weatherTypes[type] || skip?.includes(type)) continue;
    usable.push([type, weight]); total += weight;
  }
  let at = roll * total;
  for (const [type, weight] of usable) { if (at < weight) return type; at -= weight; }
  return usable.length ? usable[usable.length - 1][0] : null;
}

/** Type of a block before altitude: the weighted draw, with the runs of violent weather cut.
 * Every (maxBlocks + 1)-th block of a run of the same violent draw is drawn again among the calm
 * types, which depends only on the draws behind it: the answer is the same from any hour. */
function blockType(rules: IslesWeatherRulesV1, climate: string, block: number, seed: number): string {
  const known = rules.weatherRules.climates[climate] ? climate : ISLES_WEATHER_DEFAULT_CLIMATE_V1;
  const weights = rules.weatherRules.climates[known] ?? {};
  const key = hashText(known);
  const fallback = Object.keys(rules.weatherTypes)[0] ?? "";
  const draw = (index: number) => pick(rules, weights, hash3(seed, key, index, SALT_DRAW)) ?? fallback;
  const type = draw(block);
  const extreme = rules.weatherRules.extreme ?? DEFAULT_EXTREME;
  if (!extreme.types.includes(type) || extreme.maxBlocks < 1) return type;
  let before = 0;
  while (before < RUN_SCAN_LIMIT && draw(block - before - 1) === type) before++;
  if (before % (extreme.maxBlocks + 1) !== extreme.maxBlocks) return type;
  return pick(rules, weights, hash3(seed, key, block, SALT_REDRAW), extreme.types) ?? type;
}

/** Applies the snow line to a type. */
function atAltitude(rules: IslesWeatherRulesV1, type: string, options?: IslesWeatherOptionsV1): string {
  if (!options || options.altitude === undefined || options.snowLine === null) return type;
  const line = options.snowLine ?? rules.weatherRules.altitude.coldAbove;
  if (!(options.altitude > line)) return type;
  const cold = (rules.weatherRules.altitude.convert ?? DEFAULT_CONVERT)[type];
  return cold && rules.weatherTypes[cold] ? cold : type;
}

/** Snow line of an island from the relief data, to pass as `options.snowLine`: a number, `null` when
 * the island never has snow, `undefined` when the relief does not know the island. */
export function islesSnowLineV1(rules: IslesWeatherRulesV1, islandId: string): number | null | undefined {
  return rules.relief?.islands[islandId]?.snowLine;
}

/** Weather of a climate at an absolute game hour (real, counted from the start of the game, may exceed 24).
 * During the first minutes of a block the numeric effects slide linearly from the previous block. */
export function islesWeatherAtV1(rules: IslesWeatherRulesV1, climate: string, hours: number, seed: number, options?: IslesWeatherOptionsV1): IslesWeatherV1 {
  const blockHours = rules.weatherRules.blockHours;
  const block = Math.floor(hours / blockHours);
  const transitionHours = Math.min(blockHours, (rules.weatherRules.transitionMinutes ?? DEFAULT_TRANSITION_MINUTES) / 60);
  const blend = transitionHours > 0 ? Math.max(0, Math.min(1, (hours - block * blockHours) / transitionHours)) : 1;
  const type = atAltitude(rules, blockType(rules, climate, block, seed), options);
  const now = rules.weatherTypes[type];
  const from = blend < 1 ? rules.weatherTypes[atAltitude(rules, blockType(rules, climate, block - 1, seed), options)] ?? now : now;
  const effect = (name: IslesWeatherEffectV1) => from[name] + (now[name] - from[name]) * blend;
  return {
    type, label: now.label,
    cloakDrain: effect("cloakDrain"), humanSight: effect("humanSight"), thermalContrast: effect("thermalContrast"),
    noiseCover: effect("noiseCover"), moveFactor: effect("moveFactor"), fog: effect("fog"),
    cloakFlicker: now.cloakFlicker === true, lightning: now.lightning === true, tracks: now.tracks === true,
    stopsTransports: [...(now.stopsTransports ?? [])],
    blend, nextChangeHours: (block + 1) * blockHours,
  };
}

/** Types of the `blocks` blocks that follow the current one, in order, for the interface. */
export function islesWeatherForecastV1(rules: IslesWeatherRulesV1, climate: string, hours: number, seed: number, blocks: number, options?: IslesWeatherOptionsV1): IslesWeatherForecastV1[] {
  const blockHours = rules.weatherRules.blockHours;
  const current = Math.floor(hours / blockHours);
  const forecast: IslesWeatherForecastV1[] = [];
  for (let i = 1; i <= blocks; i++) {
    const type = atAltitude(rules, blockType(rules, climate, current + i, seed), options);
    forecast.push({type, label: rules.weatherTypes[type].label, startHours: (current + i) * blockHours});
  }
  return forecast;
}

/** True when this weather keeps a kind of transport (ferry, avion…) at the quay or on the ground. */
export function islesWeatherStopsV1(weather: Pick<IslesWeatherV1, "stopsTransports">, transportKind: string): boolean {
  return weather.stopsTransports.includes(transportKind);
}

/** True during the brief deterministic flashes of a thunderstorm: a few per game hour, the same
 * instants for every client. Always false when the weather has no lightning. */
export function islesLightningAtV1(weather: Pick<IslesWeatherV1, "lightning">, hours: number, seed: number, tuning: {perHour: number; flashSeconds: number} = DEFAULT_LIGHTNING): boolean {
  if (!weather.lightning || !(tuning.flashSeconds > 0)) return false;
  const slotHours = tuning.flashSeconds / 3600;
  const slot = Math.floor(hours / slotHours);
  // Slots far in a long game exceed 32 bits: the high part is hashed too.
  return hash3(seed, slot, Math.floor(slot / 4294967296), SALT_LIGHTNING) < tuning.perHour * slotHours;
}
