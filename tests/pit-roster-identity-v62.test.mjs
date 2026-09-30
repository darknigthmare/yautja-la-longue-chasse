import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { build } from 'esbuild';

const historical = JSON.parse(fs.readFileSync('app/game/data/pitUserHuntersV44.json', 'utf8'));
const bundle = await build({ stdin: { contents: [
  "export * from './app/game/systems/pitRosterExpansion';",
  "export * from './app/game/systems/pitUserRoster';",
  "export * from './app/game/systems/pitRosterIdentityV62';",
  "export * from './app/game/systems/pitCombat';",
  "export * from './app/game/pitCombatBitmapArt';",
].join('\n'), resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false,
platform: 'node', format: 'esm', logLevel: 'silent' });
const p = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));

test('source clarifications preserve every historical appearance owner, pixel and default ordering', () => {
  for (const fighter of historical.fighters) {
    const current = p.getPitFighterVariants(fighter.id);
    assert.equal(current.length, fighter.variants.length, fighter.id);
    for (let i = 0; i < current.length; i++) {
      assert.deepEqual({ ...current[i], label: fighter.variants[i].label }, fighter.variants[i]);
      assert.equal(p.getPitUserVariant(fighter.id, current[i].id).sha256, current[i].sha256);
    }
  }
  assert.equal(p.getPitFighterVariants('greyback').length, 4);
  assert.equal(new Set(p.getPitFighterVariants('greyback').map(v => v.label)).size, 4);
});

test('Samurai Hunting Grounds resolves to the existing fighter and never aliases Oni or creates a duplicate', () => {
  const samurai = p.getPitFighterProfile('user-samurai');
  assert.equal(samurai.name, 'Samurai — Hunting Grounds');
  assert.match(samurai.sourceWork, /Hunting Grounds/);
  assert.match(samurai.arcadeIntro, /ne désigne pas Oni/);
  assert.equal(p.PIT_VERSUS_FIGHTER_IDS.filter(id => id === 'user-samurai').length, 1);
  assert.equal(p.getPitFighterVariants('user-samurai').length, 2);
  assert.equal(p.getPitUserVariant('user-oni', p.getPitFighterVariants('user-samurai')[0].id), null);
});

test('distinct film/comic identities do not silently satisfy missing game incarnations', () => {
  assert.match(p.getPitFighterProfile('user-emissary-1').sourceWork, /scène supprimée/);
  assert.match(p.getPitFighterProfile('user-emissary-2').arcadeIntro, /distinct du premier/);
  assert.match(p.getPitFighterProfile('user-classic-2010').arcadeIntro, /ni le protagoniste/);
  assert.match(p.getPitFighterProfile('user-captive').arcadeIntro, /reconstruction hypothétique/);
  assert.match(p.getPitFighterVariants('user-captive')[0].label, /hypothétique/);
  for (const id of ['user-oni', 'user-jotun-grendel']) {
    const variants = p.getPitFighterVariants(id);
    assert.match(variants[0].label, /Hunting Grounds/);
    assert.match(variants[1].label, /Tenue PHG, visage film/);
    assert.match(variants[2].label, /Film · interprétation/);
  }
});

test('historical Golden Angel selection survives saved combat with its exact source bitmap', () => {
  const variant = p.getPitFighterVariants('greyback').find(v => v.id.startsWith('golden-angel-avec'));
  const state = p.createPitCombatState('greyback', 'user-samurai', { variants: [variant.id, null] });
  const restored = p.deserializePitCombat(p.serializePitCombat(state));
  assert.equal(restored.fighters[0].variantId, variant.id);
  assert.equal(p.getPitCombatBitmapArtDefinition('greyback', variant.id).src, variant.src);
  assert.match(p.getPitUserVariant('greyback', restored.fighters[0].variantId).label, /^Golden Angel/);
});
