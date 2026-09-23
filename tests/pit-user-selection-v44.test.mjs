import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';

const bundle = await build({ stdin: { contents: `
export {default as Selection} from './app/game/PitSelectionFlow';
export {PIT_VERSUS_FIGHTER_IDS} from './app/game/systems/pitRosterExpansion';
export {PIT_USER_FIGHTER_IDS,getPitFighterVariants} from './app/game/systems/pitUserRoster';
export {PIT_ARENA_IDS} from './app/game/systems/pitCombat';
export {createElement} from 'react';
export {renderToStaticMarkup} from 'react-dom/server';
`, loader: 'tsx', resolveDir: process.cwd() }, bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic', loader: { '.module.css': 'empty' }, logLevel: 'silent' });
const evaluated = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), evaluated, evaluated.exports);
const { Selection, PIT_VERSUS_FIGHTER_IDS, PIT_USER_FIGHTER_IDS, getPitFighterVariants, PIT_ARENA_IDS, createElement, renderToStaticMarkup } = evaluated.exports;
const noop = () => {};
const render = overrides => renderToStaticMarkup(createElement(Selection, {
  playerId: 'jungle-hunter', opponentId: 'city-hunter', arenaId: PIT_ARENA_IDS[0],
  playerVariantId: null, opponentVariantId: null, mode: 'cpu', locked: false,
  imposed: false, eventOnly: false, playerPreview: null, opponentPreview: null,
  onPlayerChange: noop, onOpponentChange: noop, onPlayerVariantChange: noop,
  onOpponentVariantChange: noop, onArenaChange: noop, onLaunch: noop, onExit: noop,
  launchLabel: 'COMBAT', launchDisabled: false, reducedMotion: true, highContrast: false,
  ...overrides,
}));
const rosterIds = html => [...html.matchAll(/role="option"[^>]*data-choice-id="([^"]+)"/g)].map(match => match[1]);
const variantSelect = html => html.match(/<select[^>]*data-pit-variant-select[^>]*>(.*?)<\/select>/s)?.[1] ?? '';

test('the live selection mounts one identity per tile and at most 24 portraits', () => {
  const html = render();
  const ids = rosterIds(html);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(ids, PIT_VERSUS_FIGHTER_IDS.slice(0, 24));
  assert.match(html, new RegExp(`data-pit-roster-total="${PIT_VERSUS_FIGHTER_IDS.length}"`));
  assert.match(html, /data-pit-roster-search/);
  assert.match(html, /aria-label="Rechercher un chasseur"/);
  assert.ok(PIT_VERSUS_FIGHTER_IDS.length > 24, 'the supplied roster requires pagination');
  assert.match(html, /aria-label="Pages des chasseurs"/);
});

test('a supplied identity defaults to its first real bitmap and groups its other appearances', () => {
  const id = PIT_USER_FIGHTER_IDS.find(id => getPitFighterVariants(id).length > 1);
  assert.ok(id, 'the supplied packs include paired appearances');
  const variants = getPitFighterVariants(id);
  const html = render({ playerId: id });
  const options = variantSelect(html);
  assert.equal([...options.matchAll(/<option /g)].length, variants.length);
  assert.doesNotMatch(options, /Présentation actuelle/);
  assert.ok(options.includes(`value="${variants[0].id}" selected=""`));
  assert.match(html, /Pose bitmap fournie · animation complète non fournie/);
  assert.match(html, new RegExp(`data-pit-variant-fighter="${id}"`));
});

test('existing fighters retain their current presentation and can select a supplied appearance', () => {
  const id = 'city-hunter';
  const variants = getPitFighterVariants(id);
  assert.ok(variants.length > 1, 'City Hunter has supplied masked and unmasked appearances');
  const current = variantSelect(render({ playerId: id }));
  assert.ok(current.includes('value="" selected="">Présentation actuelle'));
  assert.equal([...current.matchAll(/<option /g)].length, variants.length + 1);
  const selected = variants.at(-1);
  const imported = render({ playerId: id, playerVariantId: selected.id });
  assert.ok(variantSelect(imported).includes(`value="${selected.id}" selected=""`));
  assert.match(imported, /Pose bitmap fournie · animation complète non fournie/);
  assert.equal(rosterIds(imported).filter(value => value === id).length, 1);
});
test('selection remount shows the page of the retained fighter after a duel or mode change', () => {
  const id = PIT_VERSUS_FIGHTER_IDS.at(-1);
  const index = PIT_VERSUS_FIGHTER_IDS.indexOf(id);
  const expectedPage = Math.floor(index / 24) + 1;
  assert.ok(expectedPage > 1);
  const html = render({ playerId: id });
  assert.match(html, new RegExp(`data-pit-roster-page="${expectedPage}"`));
  assert.ok(rosterIds(html).includes(id));
  assert.match(html, new RegExp(`data-choice-id="${id}"[^>]*aria-selected="true"`));
});