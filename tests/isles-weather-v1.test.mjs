import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';

const bundled = await build({stdin: {contents: `export * from "./app/game/isles/islesWeatherV1";`, resolveDir: process.cwd(), loader: 'ts'},
bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent'});
const W = await import('data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const rules = JSON.parse(await readFile('app/game/data/islesLivingWorldV1.json', 'utf8'));
const archipelago = JSON.parse(await readFile('app/game/data/islesArchipelagoV1.json', 'utf8'));

const SEED = archipelago.seed;
const OTHER_SEED = SEED + 1;
const BLOCK_HOURS = rules.weatherRules.blockHours;
/** Sample size asked for the statistics, and the tolerance on a frequency (4 points). */
const BLOCKS = 4000;
const FREQUENCY_TOLERANCE = 0.04;
/** The three violent types and the longest run allowed for one of them. */
const EXTREME = ['blizzard', 'tempete', 'tempete-de-sable'];
const MAX_EXTREME_RUN = 2;
/** A transition lasts 20 game minutes; an effect may not move by more than 15 % of its range in one. */
const TRANSITION_MINUTES = 20;
const MAX_STEP_SHARE = 0.15;
const MINUTES_PER_BLOCK = BLOCK_HOURS * 60;
/** Rounding allowed when a minute, written in hours, falls on the edge of a transition. */
const EPSILON = 1e-9;
/** Blocks walked minute by minute for the continuity check. */
const CONTINUITY_BLOCKS = 120;
/** Lightning: game hours scanned second by second, and what "a few flashes per hour" may mean. */
const LIGHTNING_HOURS = 100;
const FLASHES_PER_HOUR = [2, 12];
const SECONDS_PER_HOUR = 3600;

const climates = [...new Set(archipelago.islands.map(island => island.climate))];
const climateOf = id => archipelago.islands.find(island => island.id === id).climate;
/** Middle of a block: past any transition, so the effects are exactly those of the type. */
const middle = block => (block + 0.5) * BLOCK_HOURS;
const typeAt = (climate, block, options, seed = SEED) => W.islesWeatherAtV1(rules, climate, middle(block), seed, options).type;
const series = (climate, options, seed = SEED) => Array.from({length: BLOCKS}, (_, block) => typeAt(climate, block, options, seed));
/** Span of each numeric effect over all the weather types of the data. */
const ranges = Object.fromEntries(W.ISLES_WEATHER_EFFECTS_V1.map(name => {
  const values = Object.values(rules.weatherTypes).map(type => type[name]);
  return [name, Math.max(...values) - Math.min(...values)];
}));

test('the weather is deterministic: same climate, hour and seed, same weather', () => {
  for (const climate of climates) for (let block = 0; block < 200; block++) {
    const hours = middle(block) - BLOCK_HOURS / 2 + block % MINUTES_PER_BLOCK / 60;
    assert.deepEqual(W.islesWeatherAtV1(rules, climate, hours, SEED), W.islesWeatherAtV1(rules, climate, hours, SEED));
  }
  // Another seed gives another sky, and so does another climate with the very same weights.
  assert.notDeepEqual(series('tempéré', undefined, SEED), series('tempéré', undefined, OTHER_SEED));
  const twin = structuredClone(rules);
  twin.weatherRules.climates['jumeau'] = twin.weatherRules.climates['tempéré'];
  const same = Array.from({length: BLOCKS}, (_, block) => W.islesWeatherAtV1(twin, 'tempéré', middle(block), SEED).type === W.islesWeatherAtV1(twin, 'jumeau', middle(block), SEED).type);
  assert.ok(same.includes(false), 'deux climats de mêmes poids ne partagent pas leur tirage');
});

test('every island climate is covered, and observed frequencies follow the weights', () => {
  assert.ok(climates.length > 1);
  for (const climate of climates) {
    const weights = rules.weatherRules.climates[climate];
    assert.ok(weights, climate + ' a des poids');
    const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    const seen = {};
    for (const type of series(climate)) seen[type] = (seen[type] ?? 0) + 1;
    for (const type of Object.keys(seen)) assert.ok(weights[type] > 0, climate + ' ne connaît pas ' + type);
    for (const [type, weight] of Object.entries(weights)) {
      assert.ok(rules.weatherTypes[type], type + ' est un type décrit');
      const observed = (seen[type] ?? 0) / BLOCKS, expected = weight / total;
      assert.ok(Math.abs(observed - expected) <= FREQUENCY_TOLERANCE, `${climate} · ${type} : ${observed.toFixed(3)} pour ${expected.toFixed(3)}`);
    }
  }
});

test('a place without a known climate gets the tropical humid weather of the chain', () => {
  assert.equal(archipelago.chain.climate, undefined);
  assert.ok(rules.weatherRules.climates[W.ISLES_WEATHER_DEFAULT_CLIMATE_V1]);
  assert.deepEqual(series(''), series(W.ISLES_WEATHER_DEFAULT_CLIMATE_V1));
});

test('no blizzard, storm or sandstorm lasts more than two blocks in a row', () => {
  const met = new Set();
  for (const climate of climates) for (const seed of [SEED, OTHER_SEED]) {
    const types = series(climate, undefined, seed);
    let run = 0;
    types.forEach((type, block) => {
      run = type === types[block - 1] ? run + 1 : 1;
      if (!EXTREME.includes(type)) return;
      met.add(type);
      assert.ok(run <= MAX_EXTREME_RUN, `${climate} · ${type} dure ${run} blocs au bloc ${block}`);
    });
  }
  assert.deepEqual([...met].sort(), [...EXTREME].sort(), 'les trois types violents ont été rencontrés');
  // The rule does cut something: a climate of violent weather three times out of four still obeys it.
  const harsh = structuredClone(rules);
  harsh.weatherRules.climates['épreuve'] = {blizzard: 3, clair: 1};
  let run = 0, longest = 0;
  for (let block = 0; block < BLOCKS; block++) {
    run = W.islesWeatherAtV1(harsh, 'épreuve', middle(block), SEED).type === 'blizzard' ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  assert.equal(longest, MAX_EXTREME_RUN);
});

test('a block starts with a 20 minute linear transition, and no effect ever jumps', () => {
  let transitions = 0;
  for (const climate of climates) {
    let before = W.islesWeatherAtV1(rules, climate, 0, SEED);
    for (let minute = 1; minute <= CONTINUITY_BLOCKS * MINUTES_PER_BLOCK; minute++) {
      const now = W.islesWeatherAtV1(rules, climate, minute / 60, SEED);
      const intoBlock = minute % MINUTES_PER_BLOCK;
      assert.ok(Math.abs(now.blend - Math.min(1, intoBlock / TRANSITION_MINUTES)) < EPSILON, `blend à la minute ${minute}`);
      assert.equal(now.nextChangeHours, (Math.floor(minute / MINUTES_PER_BLOCK) + 1) * BLOCK_HOURS);
      for (const name of W.ISLES_WEATHER_EFFECTS_V1) {
        const step = Math.abs(now[name] - before[name]);
        assert.ok(step <= ranges[name] * MAX_STEP_SHARE, `${climate} · ${name} saute de ${step.toFixed(3)} à la minute ${minute}`);
        if (intoBlock >= TRANSITION_MINUTES) assert.ok(Math.abs(now[name] - rules.weatherTypes[now.type][name]) < EPSILON, `${name} établi à la minute ${minute}`);
      }
      if (intoBlock === TRANSITION_MINUTES / 2) {
        const previous = W.islesWeatherAtV1(rules, climate, (minute - MINUTES_PER_BLOCK / 2) / 60, SEED);
        if (previous.type !== now.type) transitions++;
        for (const name of W.ISLES_WEATHER_EFFECTS_V1) assert.ok(Math.abs(now[name] - (previous[name] + rules.weatherTypes[now.type][name]) / 2) < EPSILON, `${name} à mi-transition`);
      }
      before = now;
    }
  }
  assert.ok(transitions > climates.length, transitions + ' changements de temps observés');
});

test('above the snow line rain turns to snow and thunderstorms to blizzard; no snow line, no snow', () => {
  const hollowpine = rules.relief.islands.hollowpine, climate = climateOf('hollowpine');
  assert.equal(W.islesSnowLineV1(rules, 'hollowpine'), hollowpine.snowLine);
  const low = series(climate, {altitude: hollowpine.snowLine, snowLine: hollowpine.snowLine});
  const high = series(climate, {altitude: hollowpine.peak, snowLine: hollowpine.snowLine});
  assert.deepEqual(low, series(climate), 'à la limite et en dessous, rien ne change');
  const expected = {pluie: 'neige', orage: 'blizzard', tempete: 'blizzard'};
  assert.ok(low.includes('pluie') && low.includes('orage'));
  low.forEach((type, block) => assert.equal(high[block], expected[type] ?? type, 'bloc ' + block));
  // Effects follow the converted type.
  const block = low.indexOf('pluie');
  assert.equal(W.islesWeatherAtV1(rules, climate, middle(block), SEED, {altitude: hollowpine.peak, snowLine: hollowpine.snowLine}).tracks, true);

  // Ember rises above the general cold altitude but has no snow line: its summit keeps the lowland sky.
  const ember = rules.relief.islands.ember, emberClimate = climateOf('ember');
  assert.equal(W.islesSnowLineV1(rules, 'ember'), null);
  assert.ok(ember.peak > rules.weatherRules.altitude.coldAbove);
  const summit = series(emberClimate, {altitude: ember.peak, snowLine: ember.snowLine});
  assert.deepEqual(summit, series(emberClimate));
  assert.ok(!summit.includes('neige') && !summit.includes('blizzard'));
  // Without any snow line given, the general limit of the rules applies.
  assert.equal(W.islesSnowLineV1(rules, 'île inconnue du relief'), undefined);
  const general = series(emberClimate, {altitude: rules.weatherRules.altitude.coldAbove + 1});
  assert.ok(general.includes('neige') && !general.includes('pluie') && !general.includes('orage'));
  assert.deepEqual(series(emberClimate, {altitude: rules.weatherRules.altitude.coldAbove}), series(emberClimate));
});

test('Frost Isle never has rain, from the shore to the dome', () => {
  const frost = rules.relief.islands['frost-isle'], climate = climateOf('frost-isle');
  assert.equal(frost.snowLine, 0);
  for (const altitude of [0, frost.peak / 2, frost.peak]) {
    const types = series(climate, {altitude, snowLine: frost.snowLine});
    assert.ok(!types.includes('pluie') && !types.includes('orage'), 'altitude ' + altitude);
    assert.ok(types.includes('neige'));
  }
});

test('the forecast lists the coming blocks as they will be', () => {
  const blocks = 8, climate = climateOf('verdant'), start = 5;
  const forecast = W.islesWeatherForecastV1(rules, climate, middle(start), SEED, blocks);
  assert.equal(forecast.length, blocks);
  forecast.forEach((entry, i) => {
    const then = W.islesWeatherAtV1(rules, climate, middle(start + 1 + i), SEED);
    assert.deepEqual(entry, {type: then.type, label: then.label, startHours: (start + 1 + i) * BLOCK_HOURS});
  });
  assert.equal(forecast[0].startHours, W.islesWeatherAtV1(rules, climate, middle(start), SEED).nextChangeHours);
});

test('a tropical storm stops the ferry, and only what the data lists', () => {
  const climate = climateOf('verdant');
  const block = series(climate).indexOf('tempete');
  assert.ok(block >= 0);
  const storm = W.islesWeatherAtV1(rules, climate, middle(block), SEED);
  assert.equal(storm.label, rules.weatherTypes.tempete.label);
  assert.deepEqual(storm.stopsTransports, rules.weatherTypes.tempete.stopsTransports);
  assert.equal(W.islesWeatherStopsV1(storm, 'ferry'), true);
  for (const kind of Object.keys(rules.transports)) assert.equal(W.islesWeatherStopsV1(storm, kind), rules.weatherTypes.tempete.stopsTransports.includes(kind), kind);
  const calm = W.islesWeatherAtV1(rules, climate, middle(series(climate).indexOf('clair')), SEED);
  assert.equal(W.islesWeatherStopsV1(calm, 'ferry'), false);
});

test('lightning exists only in thunderstorms and tropical storms, a few brief flashes per hour', () => {
  const seenTypes = new Map();
  for (const climate of climates) series(climate).forEach((type, block) => { if (!seenTypes.has(type)) seenTypes.set(type, [climate, block]); });
  assert.deepEqual([...seenTypes.keys()].sort(), Object.keys(rules.weatherTypes).sort(),'tous les types sont tirés quelque part');
  for (const [type, [climate, block]] of seenTypes) {
    const weather = W.islesWeatherAtV1(rules, climate, middle(block), SEED);
    const stormy = type === 'orage' || type === 'tempete';
    assert.equal(weather.lightning, stormy, type);
    let flashes = 0, lit = 0, wasLit = false;
    for (let second = 0; second < LIGHTNING_HOURS * SECONDS_PER_HOUR; second++) {
      const isLit = W.islesLightningAtV1(weather, second / SECONDS_PER_HOUR, SEED);
      assert.equal(isLit, W.islesLightningAtV1(weather, second / SECONDS_PER_HOUR, SEED));
      if (isLit) lit++;
      if (isLit && !wasLit) flashes++;
      wasLit = isLit;
    }
    if (!stormy) { assert.equal(lit, 0, type + ' sans éclair'); continue; }
    const perHour = flashes / LIGHTNING_HOURS;
    assert.ok(perHour >= FLASHES_PER_HOUR[0] && perHour <= FLASHES_PER_HOUR[1], `${type} : ${perHour} éclairs par heure`);
    assert.ok(lit / (LIGHTNING_HOURS * SECONDS_PER_HOUR) < 0.02, 'les éclairs sont brefs : moins de 2 % du temps');
  }
});
