import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';

const bundle = await build({
  stdin: { contents: [
    "export * from './app/game/systems/pitFidelityV91';",
    "export * from './app/game/systems/pitCombat';",
    "export * from './app/game/systems/pitRosterExpansion';",
    "export * from './app/game/systems/pitUserRoster';",
    "export * from './app/game/systems/pitEquipmentV57';",
  ].join('\n'), resolveDir: process.cwd(), loader: 'ts' },
  bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent',
});
const p = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));

function attack(id, kind, distance) {
  let state = p.createPitCombatState(id, 'berserker');
  state.fighters[0].x = 250;
  state.fighters[1].x = 250 + distance;
  const events = [], effects = [], statuses = [];
  for (let tick = 0; tick < 130; tick++) {
    state = p.stepPitCombat(state, [{ attack: tick === 0 ? kind : undefined }, {}]);
    events.push(...state.events);
    effects.push(...state.techniqueEffects);
    if (state.fighters[1].techniqueStatus) statuses.push({ ...state.fighters[1].techniqueStatus });
  }
  return { state, events, effects, statuses };
}

test('fidelity inventory covers the complete actual 201-identity duel registry, not only twelve campaign fighters', () => {
  const inventory = p.auditPitFidelityV91();
  assert.deepEqual(inventory.counts, {
    runtime: 201, versus: 201, firstEdition: 12, expansion: 4, bosses: 2,
    originalsAndGuests: 3, supplied: 180, sharedProfiles: 180, individualAdaptations: 21,
    withScopedSources: 24, sourceIdentityDossiers: 24, humans: 2, nonYautja: 1,
    unverifiedSpecies: 174, oneToOneCertified: 0,
  });
  const ids = inventory.entries.map(entry => entry.fighterId);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(ids, p.PIT_VERSUS_FIGHTER_IDS);
  assert.deepEqual(new Set(ids), new Set(Object.keys(p.PIT_FIGHTERS)));
  assert(inventory.entries.every(entry => entry.certifiedOneToOne === false));
  assert(p.canPitFighterEnterMode('kok-warlord', 'local'));
  assert(p.canPitFighterEnterMode('stone-heart', 'training'));
});

test('all 180 supplied profiles are acknowledged as the same mechanical adaptation even when an identity has references', () => {
  const first = p.PIT_FIGHTERS[p.PIT_USER_FIGHTER_IDS[0]];
  for (const id of p.PIT_USER_FIGHTER_IDS) {
    const entry = p.getPitFidelityV91(id);
    assert.equal(entry.moveset, 'shared-duel-adaptation', id);
    assert.match(entry.summary, /profil de duel partagé/);
    assert.deepEqual(p.PIT_FIGHTERS[id].attacks, first.attacks, id);
    assert.deepEqual(p.PIT_FIGHTERS[id].technique, first.technique, id);
  }
  assert.equal(p.getPitFidelityV91('user-ahab').moveset, 'shared-duel-adaptation');
  assert.deepEqual(p.getPitFidelityV91('user-ahab').sourceIds, ['ahab-neca']);
  assert.equal(p.getPitFidelityV91('user-avp-classic-2000').moveset, 'shared-duel-adaptation');
});

test('human duelists and the supplied Amengi are never presented as 201 verified Yautja', () => {
  for (const id of ['theta', 'machiko-noguchi']) {
    const entry = p.getPitFidelityV91(id);
    assert.equal(entry.species, 'human');
    assert.match(entry.summary, /humaine/);
    assert.equal(entry.cloak, 'gameplay-enabled-not-certified');
    assert(p.auditPitFidelityV91().issues.some(issue => issue.fighterId === id && issue.code === 'human-cloak-unverified'));
  }
  const amengi = p.getPitFidelityV91('guest-amengi-female');
  assert.equal(amengi.species, 'non-yautja');
  assert.equal(amengi.identity, 'supplied-unverified');
  assert.equal(amengi.cloak, 'disabled');
  assert.match(amengi.note, /design non certifié/);
});

test('actual cloak input stays disabled for Amengi and originals while legacy human cloak states remain loadable', () => {
  for (const id of ['guest-amengi-female', 'original-arid-ermit-yautja', 'original-mutated-yautja', 'theta', 'machiko-noguchi']) {
    const state = p.createPitCombatState(id, 'berserker');
    state.fighters[0].traque = 1000;
    const played = p.stepPitCombat(state, [{ resource: true }, {}]);
    const human = id === 'theta' || id === 'machiko-noguchi';
    assert.equal(played.fighters[0].cloakPhase, human ? 'startup' : 'inactive', id);
    assert.equal(played.fighters[0].traque, human ? 1000 - p.PIT_CLOAK_COST : 1000, id);
    assert.equal(played.events.some(event => event.type === 'cloak-start' && event.fighterId === id), human, id);
    const bytes = p.serializePitCombat(played);
    const restored = p.deserializePitCombat(bytes);
    assert(restored, id + ' current saved states remain valid');
    assert.equal(p.serializePitCombat(restored), bytes, id + ' serialized combat is unchanged');
  }
});

test('Celtic net and Scar, Wolf, Witch shot labels now describe the actual contact engine without granting missing weapons', () => {
  for (const [id, kind] of [['celtic', 'medium'], ['scar', 'heavy'], ['wolf', 'heavy'], ['witch', 'heavy']]) {
    const recipe = p.PIT_FIGHTERS[id];
    assert.notEqual(p.pitMoveLabelV91(id, kind, recipe.attacks[kind].label), recipe.attacks[kind].label);
    assert.match(p.pitMoveLabelV91(id, kind, recipe.attacks[kind].label), /contact/);
    const near = attack(id, kind, 72), far = attack(id, kind, 260);
    assert(near.events.some(event => event.type === 'hit' && event.attackerId === id), id + ' contact still works');
    assert.equal(near.effects.length, 0, id + ' no projectile invented');
    assert.equal(far.effects.length, 0, id + ' no ranged entity');
    assert.equal(far.state.fighters[1].health, p.PIT_FIGHTERS.berserker.maxHealth, id + ' distant opponent remains unhit');
  }
});

test('Witch source points to reconnaissance while its unchanged bow snare is clearly an unattested duel adaptation', () => {
  const entry = p.getPitFidelityV91('witch');
  assert(entry.sourceIds.includes('phg-witch'));
  assert.match(p.PIT_FIDELITY_SOURCES_V91['phg-witch'].supports, /drones.*reconnaissance/);
  assert.match(entry.moveLabels.technique, /non attestée/);
  assert.match(entry.note, /collet.*ne sont pas attestés/);
  const played = attack('witch', 'technique', 260);
  assert(played.effects.length > 0);
  assert(played.statuses.some(status => status.kind === 'pinned'));
  assert.equal(p.PIT_FIGHTERS.witch.technique.jumpLocked, true);
  assert.equal(p.PIT_FIGHTERS.witch.technique.cloakLocked, true);
  assert.equal(p.PIT_FIGHTERS.witch.technique.device, 'bow-snare', 'annotation does not secretly change combat');
});

test('Stone Heart charge stays attached and Warlord projectile stays explicitly a Chronicle adaptation', () => {
  const stone = p.getPitFidelityV91('stone-heart');
  assert.match(stone.moveLabels.technique, /Charge.*contact/);
  assert.equal(p.PIT_FIGHTERS['stone-heart'].technique.motion, 'attached');
  const stoneFar = attack('stone-heart', 'technique', 300);
  assert.equal(stoneFar.state.fighters[1].health, p.PIT_FIGHTERS.berserker.maxHealth);
  assert.match(p.getPitFidelityV91('kok-warlord').moveLabels.technique, /Chronique.*non attestée/);
  const wave = attack('kok-warlord', 'technique', 260);
  assert(wave.effects.length > 0);
  assert(wave.events.some(event => event.type === 'hit' && event.attackerId === 'kok-warlord'));
});

test('source scopes cannot promote a figurine, a film synopsis or a generic PHG arsenal to a certified individual kit', () => {
  const allowedHosts = new Set(['www.20thcenturystudios.com', 'necaonline.com', 'store.necaonline.com', 'blog.playstation.com', 'www.playstation.com', 'store.playstation.com', 'www.marvel.com', 'digital.darkhorse.com', 'store.steampowered.com']);
  for (const source of Object.values(p.PIT_FIDELITY_SOURCES_V91)) {
    const url = new URL(source.url);
    assert.equal(url.protocol, 'https:');
    assert(allowedHosts.has(url.hostname), source.url);
    assert(source.supports.length > 20);
    assert(source.doesNotEstablish.length > 20);
  }
  assert.equal(p.PIT_FIDELITY_SOURCES_V91['ahab-neca'].scope, 'licensed-appearance');
  assert.equal(p.PIT_FIDELITY_SOURCES_V91['phg-valkyrie'].scope, 'primary-gameplay');
  assert.match(p.PIT_FIDELITY_SOURCES_V91['phg-weapons'].doesNotEstablish, /ne prouve pas.*exclusive/);
  for (const entry of p.auditPitFidelityV91().entries) for (const id of entry.sourceIds) assert(p.PIT_FIDELITY_SOURCES_V91[id]);
});

test('fan film, NECA original, film reinterpretation and unknown supplied identity retain distinct provenance limits', () => {
  assert.match(p.getPitFidelityV91('user-big-red').note, /fan film Dead End/);
  assert.match(p.getPitFidelityV91('user-viper').note, /Création originale NECA/);
  assert.match(p.getPitFidelityV91('greyback').note, /incarnations distinctes/);
  const unknown = p.getPitFidelityV91('user-warp-adjutant');
  assert.equal(unknown.identity, 'supplied-unverified');
  assert.equal(unknown.species, 'unverified');
  assert.deepEqual(unknown.sourceIds, []);
  assert.match(unknown.note, /Aucune capacité déduite/);
});

test('untrusted or inherited identities fail closed and fidelity reads leave every recipe and a live replay state byte-identical', () => {
  for (const id of ['constructor', '__proto__', 'toString', '', 'user-not-in-roster', null, {}, 1]) {
    assert.equal(p.getPitFidelityV91(id), null);
    assert.equal(p.pitMoveLabelV91(id, 'heavy', 'fallback'), 'fallback');
  }
  const recipes = JSON.stringify(p.PIT_FIGHTERS);
  const state = attack('scar', 'heavy', 72).state;
  const bytes = p.serializePitCombat(state);
  const restored = p.deserializePitCombat(bytes);
  assert(restored);
  p.auditPitFidelityV91();
  for (const id of p.PIT_VERSUS_FIGHTER_IDS) for (const kind of ['light', 'medium', 'heavy', 'technique']) p.pitMoveLabelV91(id, kind, p.PIT_FIGHTERS[id].attacks[kind].label);
  assert.equal(JSON.stringify(p.PIT_FIGHTERS), recipes);
  assert.equal(p.serializePitCombat(state), bytes);
  assert.equal(p.serializePitCombat(restored), bytes);
  assert.equal(p.pitHasShoulderPlasma('jungle-hunter', p.PIT_JUNGLE_FINAL_DUEL_VARIANT), false);
});
