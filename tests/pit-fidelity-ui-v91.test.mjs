import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

// Actual React SSR and source consumers; only CSS modules are omitted. The private
// event formatter is exposed in the in-memory test bundle, not in production.
// SSR does not run effects, decode sprites, hydrate or prove browser presentation.
const bundle = await build({
  stdin: { contents: [
    "export { FighterCard, eventLabel } from './app/game/PitCanvas';",
    "export { default as Notice } from './app/game/PitFidelityNoticeV91';",
    "export { default as Lab } from './app/pit-lab/PitProductionAnimationLab';",
    "export * from './app/game/systems/pitFidelityV91';",
    "export * from './app/game/systems/pitRosterExpansion';",
    "export * from './app/game/systems/pitUserRoster';",
    "export * from './app/game/systems/pitCombat';",
    "export * from './app/game/systems/pitEquipmentV57';",
    "export { createElement } from 'react';",
    "export { renderToStaticMarkup } from 'react-dom/server';",
  ].join('\n'), loader: 'tsx', resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic',
  external: ['react', 'react/jsx-runtime', 'react-dom/server', 'next/link'],
  loader: { '.module.css': 'empty' }, logLevel: 'silent',
  plugins: [{ name: 'expose-actual-private-event-formatter', setup(b) {
    b.onLoad({ filter: /[\\/]app[\\/]game[\\/]PitCanvas\.tsx$/ }, args => ({
      contents: fs.readFileSync(args.path, 'utf8') + '\nexport { eventLabel };\n', loader: 'tsx',
    }));
  } }],
});
const evaluated = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), evaluated, evaluated.exports);
const p = evaluated.exports;
const html = (Component, props) => p.renderToStaticMarkup(p.createElement(Component, props));
const card = (fighterId, variantId = null) => html(p.FighterCard, { fighterId, variantId, side: 'DROITE' });

test('actual fighter profiles expose scoped notices for every live identity and exact supplied appearance without changing recipes', () => {
  const before = JSON.stringify(p.PIT_FIGHTERS);
  let appearances = 0;
  for (const id of p.PIT_VERSUS_FIGHTER_IDS) {
    const variants = p.getPitFighterVariants(id);
    const selectors = [...(p.normalizePitUserVariant(id) === undefined ? [null] : []), ...variants.map(v => v.id)];
    for (const variantId of selectors) {
      const rendered = card(id, variantId);
      assert(rendered.includes('data-pit-fidelity-notice="' + id + '"'), id + ' mounted notice');
      assert.match(rendered, /data-pit-fidelity-certified="false"/);
      assert.match(rendered, /fidélité 1:1 non certifiée/);
      assert.match(rendered, /Profil du combattant/);
      assert(rendered.includes('data-pit-fidelity-variant="' + (variantId ?? 'default') + '"'));
      appearances++;
    }
  }
  assert.equal(appearances, 437);
  assert.equal(JSON.stringify(p.PIT_FIGHTERS), before, 'SSR never rewrites move timings or equipment');
});

test('actual profile detail preserves humans, the guest species and the shared Ahab moveset with honest source scopes', () => {
  for (const id of ['theta', 'machiko-noguchi']) {
    const rendered = card(id);
    assert.match(rendered, /data-pit-fidelity-species="human"/);
    assert.match(rendered, /Combattante humaine/);
    assert.match(rendered, /camouflage.*(?:autorisé|non certifi|sourc)/i);
  }
  const guest = card('guest-amengi-female');
  assert.match(guest, /data-pit-fidelity-species="non-yautja"/);
  assert.match(guest, /Invité non-Yautja/);
  assert.match(guest, /design non certifié/);
  assert.match(guest, /Camouflage indisponible/);
  const ahab = card('user-ahab');
  assert.match(ahab, /data-pit-fidelity-moveset="shared-duel-adaptation"/);
  assert.match(ahab, /profil de duel partagé/);
  assert.match(ahab, /sans technique personnelle de lance ou Engineer Gun/);
  assert.match(ahab, /Portée :/); assert.match(ahab, /Limite :/);
  for (const source of p.getPitFidelityV91('user-ahab').sources) {
    assert(ahab.includes('href="' + source.url + '"'));
    assert(ahab.includes(source.title));
  }
  assert.match(ahab, /target="_blank" rel="noopener noreferrer"/);
  const unknown = card('user-warp-adjutant');
  assert.match(unknown, /Identité fournie non vérifiée/);
  assert.match(unknown, /Aucune référence spécifique/);
});

test('real technique line, detailed profile and event announcement use current presentation labels while historical replays retain their own names', () => {
  const state = p.createPitCombatState('witch', 'jungle-hunter');
  const before = JSON.stringify(state);
  for (const id of ['witch', 'stone-heart', 'kok-warlord']) {
    const rendered = card(id), expected = p.getPitFidelityV91(id).moveLabels.technique;
    assert(rendered.includes('TECHNIQUE · ' + expected), id + ' technique line');
    assert(rendered.includes('<strong>' + expected + '</strong>'), id + ' detailed technique');
    const event = { type: 'attack-start', frame: 1, fighterId: id, attack: 'technique' };
    assert.equal(p.eventLabel(event, state, 9), expected.toUpperCase());
  }
  assert.equal(p.eventLabel({ type: 'attack-start', frame: 1, fighterId: 'tracker', attack: 'technique' }, state, 6), 'CONTRE AU GANTELET · REPLAY HISTORIQUE');
  assert.equal(p.eventLabel({ type: 'attack-start', frame: 1, fighterId: 'feral-hunter', attack: 'technique' }, state, 8), 'PIÈGE À CARREAUX · REPLAY HISTORIQUE');
  for (const [id, kind] of [['celtic', 'medium'], ['scar', 'heavy'], ['wolf', 'heavy'], ['witch', 'heavy']])
    assert(card(id).includes(p.getPitFidelityV91(id).moveLabels[kind]), id + ' corrected contact label in scoped profile');
  assert.equal(JSON.stringify(state), before, 'announcements do not mutate combat/replay state');
});

test('the final duel costume cannot regain a plasma action through the new profile notice', () => {
  const rendered = card('jungle-hunter', p.PIT_JUNGLE_FINAL_DUEL_VARIANT);
  assert.match(rendered, /data-pit-technique-available="false"/);
  assert.match(rendered, /INDISPONIBLE · CANON RETIRÉ/);
  assert.match(rendered, /tir de plasma indisponible/);
  assert.doesNotMatch(rendered, /<li><strong>Technique :<\/strong> Tir de plasma/);
  assert.doesNotMatch(rendered, /<strong>Tir de plasma<\/strong>/);
});

test('real production-lab SSR mounts the same notice and complete scoped count without claiming decoded sprites or personal kits', () => {
  const rendered = html(p.Lab);
  assert.match(rendered, /data-pit-production-lab/);
  assert.match(rendered, /data-pit-fidelity-notice="jungle-hunter"/);
  assert.match(rendered, /201\/201 combattants répertoriés/);
  assert.match(rendered, /180 profils de duel partagés/);
  assert.match(rendered, /Aucune fidélité 1:1 certifiée/);
  assert.match(rendered, /ne signifie ni autant de Yautja officiels/);
  assert.match(rendered, /data-render-status="loading"/);
  assert.match(rendered, /Chargés après vérification : 0 clips/);
  assert.match(rendered, /id="production-fighter"/);
  assert.match(rendered, /id="production-variant"/);
  assert.match(rendered, /href="https:\/\/www\.20thcenturystudios\.com\/movies\/predator"/);
});

test('source notice fails closed for inherited and foreign identities and contains no save or gameplay write', () => {
  for (const id of ['constructor', '__proto__', 'toString', 'missing-fighter']) assert.equal(html(p.Notice, { fighterId: id }), '');
  const state = p.createPitCombatState('user-ahab', 'jungle-hunter');
  const before = JSON.stringify(state);
  html(p.Notice, { fighterId: state.fighters[0].definitionId, variantId: state.fighters[0].variantId, showCoverage: true });
  assert.equal(JSON.stringify(state), before);
});
