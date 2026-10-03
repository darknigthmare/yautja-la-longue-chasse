import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const loader = homeworldSceneSsrV78(), manifest = JSON.parse(fs.readFileSync('app/game/data/pitUserHuntersV79.json', 'utf8'));
const roster = loader.load('app/game/systems/pitRosterExpansion.ts');
const variants = loader.load('app/game/systems/pitUserRoster.ts');
const art = loader.load('app/game/pitCombatBitmapArt.ts');
const combat = loader.load('app/game/systems/pitCombat.ts');
const stages = loader.load('app/game/systems/pitCharacterStages.ts');
const chronicles = loader.load('app/game/systems/pitCharacterChroniclesV79.ts');
const icons = loader.load('app/game/pitRosterIcons.ts');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

test('two referenced identities append without replacing the historical roster or conflating Classic2010', () => {
  assert.deepEqual(roster.PIT_VERSUS_FIGHTER_IDS.slice(-2), manifest.fighters.map(f => f.id));
  assert.equal(roster.PIT_VERSUS_FIGHTER_IDS.length, 201);
  assert.equal(roster.PIT_VERSUS_FIGHTER_IDS[198], 'user-emissary-phg');
  assert.equal(new Set(roster.PIT_VERSUS_FIGHTER_IDS).size, roster.PIT_VERSUS_FIGHTER_IDS.length);
  assert.notEqual(roster.getPitFighterProfile('user-classic-2010').name, roster.getPitFighterProfile('user-avp-classic-2000').name);
  assert.equal(variants.getPitUserVariant('user-classic-2010', manifest.fighters[1].variants[0].id), null);
});

for (const fighter of manifest.fighters) {
  test(fighter.id + ': real copied alpha pixels, portrait, roster derivative and replay appearance agree', async () => {
    const v = fighter.variants[0], bytes = fs.readFileSync('public' + v.src), meta = await sharp(bytes).metadata(), stats = await sharp(bytes).stats();
    assert.equal(sha(bytes), v.sha256); assert.equal(meta.width, v.width); assert.equal(meta.height, v.height);
    assert.equal(meta.hasAlpha, true); assert.equal(stats.channels[3].min, 0); assert(stats.channels[3].max > 16);
    const resolved = art.getPitCombatBitmapArtDefinition(fighter.id);
    assert.equal(resolved.src, v.src); assert.deepEqual(resolved.pivot, v.pivot);
    assert(v.pivot[1] > v.bodyTopY && v.pivot[1] < v.height);
    const icon = icons.getPitRosterIcon(fighter.id), iconBytes = fs.readFileSync('public' + icon.src);
    assert.equal(sha(iconBytes), fighter.icon.sha256); assert.equal(icon.sourceSha256, v.sha256);
    assert.equal(icon.sourceVariantId, v.id); assert.equal(iconBytes.length, icon.bytes);
    const state = combat.createPitCombatState(fighter.id, 'jungle-hunter');
    const restored = combat.deserializePitCombat(combat.serializePitCombat(state));
    assert.equal(restored.fighters[0].definitionId, fighter.id); assert.equal(restored.fighters[0].variantId, v.id);
    assert.equal(v.animated, false); assert.equal(v.frameCount, 1); assert.equal(v.canonicalFidelityCertified, false);
    const profile = roster.getPitFighterProfile(fighter.id);
    assert.equal(profile.progressionAvailable, false); assert.equal(profile.gameplayAdaptation, 'shared-balanced-duel');
    // V79 never had a personal route for these two identities. V80 adds an
    // explicitly original route without upgrading the static art to certified
    // fidelity or granting campaign progression.
    assert.equal(chronicles.getPitCharacterChronicleStatusV79(fighter.id, 1).route, null);
    const chronicle = chronicles.getPitCharacterChronicleStatusV79(fighter.id, 2);
    assert.equal(chronicle.route.version, 2);
    assert.equal(chronicle.route.encounters.length, 8);
    assert.equal(chronicle.provenance, 'roster-attribution');
    assert.match(chronicle.route.continuity, /Aucune rencontre, mort, survie/);
    const association = stages.getPitCharacterStageAssociation(fighter.id);
    assert.equal(association.coverage, 'existing-work-setting'); assert.equal(association.exactGeometryCertified, false);
    assert(combat.PIT_ARENAS[association.stageId]); assert(association.sourceUrls.length >= 2);
  });
}
