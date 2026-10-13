import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

// Actual React selection and event formatter. SSR never proves sprite decoding,
// native artwork admission, hydration, controller use or browser gameplay.
const bundle = await build({ stdin: { contents: [
  "export { FighterCard, eventLabel, cpuInput } from './app/game/PitCanvas';",
  "export * from './app/game/systems/pitCombat';",
  "export * from './app/game/systems/pitAuthoredMovesetsV92';",
  "export * from './app/game/systems/pitReplay';",
  "export { createElement } from 'react';",
  "export { renderToStaticMarkup } from 'react-dom/server';",
].join('\n'), loader: 'tsx', resolveDir: process.cwd() }, bundle: true, write: false,
  platform: 'node', format: 'cjs', jsx: 'automatic', loader: { '.module.css': 'empty' },
  external: ['react', 'react/jsx-runtime', 'react-dom/server', 'next/link'], logLevel: 'silent',
  plugins: [{ name: 'inspect-real-private-consumers', setup(builder) {
    builder.onLoad({ filter: /[\\/]app[\\/]game[\\/]PitCanvas\.tsx$/ }, args => ({
      contents: fs.readFileSync(args.path, 'utf8') + '\nexport { eventLabel, cpuInput };\n', loader: 'tsx',
    }));
  } }] });
const evaluated = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), evaluated, evaluated.exports);
const p = evaluated.exports;
const card = fighterId => p.renderToStaticMarkup(p.createElement(p.FighterCard, { fighterId, side: 'DROITE' }));

test('real selector explains both new owned weapon profiles with frame data, primary equipment sources and art limitations', () => {
  for (const profile of Object.values(p.PIT_AUTHORED_MOVESETS_V92)) {
    const html = card(profile.fighterId);
    assert(html.includes('data-pit-authored-moveset="' + profile.id + '"'));
    assert.match(html, /data-pit-moveset-certified="false"/);
    assert(html.includes('TECHNIQUE · ' + profile.attacks.technique.label));
    assert(html.includes('href="' + profile.sourceUrl + '"'));
    assert.match(html, /target="_blank" rel="noopener noreferrer"/);
    assert.match(html, /Profil individuel V92/); assert.match(html, /repli visuel signalé/);
    assert.match(html, /Audit historique V91 avant spécialisation/);
    assert.match(html, /fidélité 1:1 non certifiée/);
    for (const move of Object.values(profile.attacks)) assert(html.includes(move.label));
  }
});

test('actual event announcements use owned current actions, while imported engine10 keeps its shared counter label', () => {
  const event = { type: 'attack-start', frame: 1, fighterId: 'user-ahab', attack: 'technique' };
  const fresh = p.createPitCombatState('user-ahab', 'jungle-hunter');
  assert.equal(p.eventLabel(event, fresh, 11), 'ESTOC ENGAGÉ DE LANCE · ADAPTATION');
  const file = JSON.parse(fs.readFileSync('tests/fixtures/pit-replay-v91-user-equipment-v10.json', 'utf8'));
  const imported = p.createPitReplayCombatState(file.replay);
  assert.equal(p.eventLabel(event, imported, 10), 'RIPOSTE DE DUEL · ADAPTATION');
  assert.equal(imported.fighters[0].movesetId, undefined);
});

test('CPU contests long-range spear neutral by owned reach and visible positions instead of entering fist range first', () => {
  let state = p.createPitCombatState('jungle-hunter', 'user-ahab');
  state.frame = 43; state.fighters[0].x = 300; state.fighters[1].x = 440;
  assert.deepEqual(p.cpuInput(state), { attack: 'medium' });
  const legacy = p.createPitCombatState('jungle-hunter', 'user-ahab', { movesets: 'legacy' });
  legacy.frame = 43; legacy.fighters[0].x = 300; legacy.fighters[1].x = 440;
  assert.equal(p.cpuInput(legacy).attack, undefined);
  assert.equal(p.cpuInput(legacy).left, true);
  state.phase = 'round-over'; assert.deepEqual(p.cpuInput(state), {});
});

test('actual visible replay startup uses the shared initializer; the renderer cannot admit new recipes to an old archive', () => {
  const source = fs.readFileSync('app/game/PitCanvas.tsx', 'utf8');
  assert.match(source, /const next = createPitReplayCombatState\(replay\);/);
  assert.doesNotMatch(source, /const next = createPitCombatState\(replay\.fighters/);
  const file = JSON.parse(fs.readFileSync('tests/fixtures/pit-replay-v91-user-equipment-v10.json', 'utf8'));
  let state = p.createPitReplayCombatState(file.replay);
  const reader = p.createPitReplayReader(file.replay);
  for (let tick = reader.next(); !tick.done; tick = reader.next()) state = p.stepPitReplayCombat(state, tick.value.inputs, 10);
  const actual = JSON.parse(JSON.stringify(state)); actual.version = 10;
  assert.deepEqual(actual, file.finalState);
});
