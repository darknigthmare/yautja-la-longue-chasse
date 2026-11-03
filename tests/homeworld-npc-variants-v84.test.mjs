import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {homeworldQaModelV64} from '../scripts/homeworld-qa-model-v64.mjs';

const api = homeworldQaModelV64(process.cwd(), ['homeworldNpcVariantsV84.ts']);
const sprite = (role, slot, overrides = {}) => ({
  id: `${role}-${String(slot).padStart(2, '0')}`, role, slot,
  src: `/game/homeworld/v84/npcs/${role}/${String(slot).padStart(2, '0')}.png`,
  sourceWidth: 512, sourceHeight: 768, alphaBounds: {x: 60, y: 18, width: 390, height: 730},
  pivot: {x: 256, y: 747}, heightWorld: 100, nativeFacing: 1,
  status: 'ready', motionStatus: 'single-pose-static', ...overrides,
});
const pool = role => Array.from({length: 20}, (_, i) => sprite(role, i + 1));
const actors = (role, count, groupId = 'city') => Array.from({length: count}, (_, i) => ({
  id: `${groupId}:${role}:${String(i + 1).padStart(2, '0')}`, role, groupId,
}));
const empty = api.compileHomeworldNpcVariantsV84([], []);

test('actual ready metadata alone contributes to coverage; missing families retain no substitute', () => {
  const records = [...pool('courier'), sprite('healer', 1, {status: 'pending'}),
    sprite('guard', 1, {alphaBounds: {x: 0, y: 0, width: 900, height: 100}}),
    sprite('artisan', 1, {motionStatus: 'walk-cycle'}), sprite('resident', 21)];
  const catalogue = api.compileHomeworldNpcVariantsV84(records, actors('healer', 1));
  assert.equal(catalogue.variants.length, 20);
  assert.equal(catalogue.coverage.length, 32);
  assert.deepEqual(catalogue.coverage.find(item => item.role === 'courier'),
    {role: 'courier', ready: 20, target: 20, missing: 0, status: 'complete'});
  assert.equal(catalogue.coverage.find(item => item.role === 'healer').status, 'not-started');
  assert.equal(catalogue.rejected.length, 4);
  // A caller's available courier art cannot overwrite this authored healer.
  assert.equal(api.homeworldNpcVariantV84('city:healer:01', 'courier', catalogue), null);
  assert.equal(api.homeworldNpcVariantV84('unknown-healer', 'healer', catalogue), null);
});

test('the same file, slot or identity cannot be counted as multiple unique variants', () => {
  const a = sprite('courier', 1), b = sprite('courier', 2, {src: a.src});
  const c = sprite('guard', 1), d = sprite('guard', 1, {id: 'duplicate-slot', src: '/game/homeworld/v84/npcs/guard/duplicate.png'});
  const catalogue = api.compileHomeworldNpcVariantsV84([a, b, c, d, sprite('artisan', 1)], []);
  assert.deepEqual(catalogue.variants.map(item => item.id), ['artisan-01']);
  assert.equal(catalogue.rejected.length, 4);
  assert.equal(catalogue.coverage.find(item => item.role === 'courier').ready, 0);
});

test('all 20 same-role actors receive different files independent of input order and viewport subset', () => {
  const cast = [...actors('courier', 20), ...actors('guard', 12)];
  const files = [...pool('courier'), ...pool('guard')];
  const before = JSON.stringify({cast, files});
  const catalogue = api.compileHomeworldNpcVariantsV84(files, cast);
  const reordered = api.compileHomeworldNpcVariantsV84([...files].reverse(), [...cast].reverse());
  for (const role of ['courier', 'guard']) {
    const group = cast.filter(actor => actor.role === role);
    assert.equal(new Set(group.map(actor => api.homeworldNpcVariantV84(actor.id, role, catalogue).src)).size, group.length);
  }
  for (const actor of [cast[19], cast[4], cast[25], cast[0]]) {
    const first = api.homeworldNpcVariantV84(actor.id, actor.role, catalogue);
    assert.equal(first.id, api.homeworldNpcVariantV84(actor.id, actor.role, reordered).id);
    // Walking, pause and crop operations do not participate in selection.
    for (let frame = 0; frame < 8; frame++) assert.equal(api.homeworldNpcVariantV84(actor.id, actor.role, catalogue), first);
    assert.equal(first.motionStatus, 'single-pose-static');
  }
  assert.equal(JSON.stringify({cast, files}), before, 'compilation never mutates source cast or image metadata');
});

test('smaller ready pools reuse only after exhaustion and never manufacture missing slots', () => {
  const cast = actors('healer', 8);
  const catalogue = api.compileHomeworldNpcVariantsV84([sprite('healer', 1), sprite('healer', 4), sprite('healer', 17)], cast);
  const selected = cast.map(actor => api.homeworldNpcVariantV84(actor.id, 'healer', catalogue));
  assert.equal(new Set(selected.slice(0, 3).map(item => item.id)).size, 3);
  assert(selected.every(item => [1, 4, 17].includes(item.slot)));
  assert.equal(catalogue.coverage.find(item => item.role === 'healer').missing, 17);
  assert.equal(catalogue.coverage.find(item => item.role === 'healer').status, 'partial');
});

test('regional principal identities are namespaced; each whole village receives its own no-repeat allocation', () => {
  const regions = ['glass-desert', 'pillar-jungle', 'thermal-caves'];
  const cast = regions.flatMap(regionId => Array.from({length: 10}, (_, i) => ({
    id: api.homeworldNpcKeyV84(`healer-${i}`, regionId), role: 'healer', groupId: `region:${regionId}`,
  })));
  const catalogue = api.compileHomeworldNpcVariantsV84(pool('healer'), cast);
  assert.equal(new Set(cast.map(actor => actor.id)).size, 30);
  for (const regionId of regions) {
    const group = cast.filter(actor => actor.groupId === `region:${regionId}`);
    assert.equal(new Set(group.map(actor => api.homeworldNpcVariantV84(actor.id, 'healer', catalogue).id)).size, 10);
  }
  assert.equal(api.homeworldNpcKeyV84('guide', 'glass-desert'), 'glass-desert:guide');
  assert.equal(api.homeworldNpcKeyV84('glass-desert:guide', 'glass-desert'), 'glass-desert:guide');
  assert.equal(api.homeworldNpcKeyV84('glass-desert-life-1', 'glass-desert'), 'glass-desert-life-1');
});

test('only reserved story identities keep their originals; other principal NPCs gain same-role variants', () => {
  const cast = [
    {id: 'hunt-king', role: 'chief', groupId: 'city'},
    {id: 'terrace-instructor', role: 'instructor', groupId: 'city'},
    {id: 'another-instructor', role: 'instructor', groupId: 'city'},
    {id: 'clan-healer', role: 'healer', groupId: 'city'},
    {id: 'glass-desert:healer', role: 'healer', groupId: 'region:glass-desert'},
    {id: 'story-kept', role: 'healer', groupId: 'city', preserveOriginal: true},
  ];
  const catalogue = api.compileHomeworldNpcVariantsV84([...pool('chief'), ...pool('instructor'), ...pool('healer')], cast);
  assert.equal(api.homeworldNpcVariantV84('hunt-king', 'chief', catalogue), null);
  assert.equal(api.homeworldNpcVariantV84('terrace-instructor', 'instructor', catalogue), null);
  assert.equal(api.homeworldNpcVariantV84('story-kept', 'healer', catalogue), null);
  for (const id of ['another-instructor', 'clan-healer', 'glass-desert:healer']) assert(api.homeworldNpcVariantV84(id, undefined, catalogue));
});

test('occupation and explicit cast win over age, morphology, district and caller fallback', () => {
  const catalogue = api.compileHomeworldNpcVariantsV84([], [{id: 'glass-desert:healer', role: 'healer', groupId: 'region:glass-desert'}]);
  assert.equal(api.homeworldNpcRoleV84({id: 'healer', regionId: 'glass-desert', role: 'Archiviste', morphId: 'elder'}, 'guard', catalogue), 'healer');
  const cases = [
    ['Réparatrice des conduits', 'elder', 'artisan'], ['Porteur de cargaisons', 'young', 'porter'],
    ['Garde de patrouille', 'elder', 'guard'], ['Apprenti archiviste', 'classic', 'apprentice'],
    ['Pisteur du clan', 'elder', 'guide'], ['Accompagnateur des aspirants', 'young', 'instructor'],
    ['Armurière', 'classic', 'forge-master'], ['Éclaireuse des quais', 'elder', 'guide'],
    ['Ancien du clan', 'young', 'archivist'],
    ['Messagère des villages', 'elder', 'courier'], ["Aspirante a l'ecoute", 'classic', 'apprentice'],
  ];
  for (const [role, morphId, expected] of cases) {
    assert.equal(api.homeworldNpcRoleV84({id: 'unregistered', role, morphId, districtId: 'memory'}, 'witness', empty), expected);
  }
  assert.equal(api.homeworldNpcRoleV84({id: 'new-npc', role: 'Métier futur', morphId: 'young'}, undefined, empty), null);
  assert.equal(api.homeworldNpcRoleV84({id: 'new-npc', role: 'Métier futur', morphId: 'elder'}, 'courier', empty), 'courier');
});

test('all shipped ambient V68/V69 occupations have an explicit family without a random district fallback', () => {
  const v68 = JSON.parse(fs.readFileSync('app/game/data/homeworldLifeV68.json', 'utf8')).population;
  const v69 = JSON.parse(fs.readFileSync('app/game/data/homeworldLifeV69.json', 'utf8')).population;
  const villages = JSON.parse(fs.readFileSync('app/game/data/homeworldVillageLifeV69.json', 'utf8')).villages;
  for (const actor of [...v68, ...v69, ...villages.flatMap(village => village.residents)]) {
    assert(api.homeworldNpcRoleV84(actor, undefined, empty), `${actor.id}: ${actor.role}`);
  }
});

test('source preload is limited to selected cast, deduplicates reuse and ignores missing roles', () => {
  const cast = [...actors('courier', 4), ...actors('healer', 1)];
  const catalogue = api.compileHomeworldNpcVariantsV84([sprite('courier', 1), sprite('courier', 2)], cast);
  const subset = [cast[0].id, cast[0].id, cast[4].id];
  const sources = api.homeworldNpcVariantSourcesV84(subset, catalogue);
  assert.equal(sources.length, 1);
  assert.equal(sources[0].src, api.homeworldNpcVariantV84(cast[0].id, 'courier', catalogue).src);
  assert.equal(sources[0].kind, 'scene');
  assert.equal(api.homeworldNpcVariantSourcesV84(undefined, catalogue).length, 2);
});
