import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const qa = homeworldSceneSsrV78();
const api = qa.load('app/game/systems/homeworldNpcVariantsV84.ts');
const manifest = JSON.parse(fs.readFileSync('app/game/data/homeworldNpcVariantsV84.json', 'utf8'));
const cast = JSON.parse(fs.readFileSync('app/game/data/homeworldNpcCastV84.json', 'utf8')).cast;
const additions = JSON.parse(fs.readFileSync('app/game/data/homeworldNpcAdditionsV84.json', 'utf8'));
const renderedSprites = html => [...html.matchAll(/<img\b[^>]*data-homeworld-npc-variant-v84="([^"]+)"[^>]*data-homeworld-npc-identity-v84="([^"]+)"[^>]*>/g)]
  .map(match => ({ variant: match[1], id: match[2], node: match[0] }));

test('the real V83 cast retains 434 identities and every complete family avoids repeats within each settlement', () => {
  assert.equal(cast.filter(actor => actor.source !== 'additional-v84').length, 434);
  assert.equal(cast.filter(actor => actor.source === 'additional-v84').length, 10);
  assert.equal(cast.length, 444);
  assert.equal(new Set(cast.map(actor => actor.id)).size, 444);
  assert.equal(api.HOMEWORLD_NPC_VARIANT_CATALOGUE_V84.rejected.length, 0);
  const groups = new Map();
  for (const actor of cast.filter(actor => !actor.preserveOriginal)) {
    const key = `${actor.groupId}:${actor.role}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(actor);
  }
  for (const actors of groups.values()) {
    assert(actors.length <= 20, `Pool capacity exceeded for ${actors[0].groupId}:${actors[0].role}`);
    if (manifest.roles.find(role => role.id === actors[0].role).ready !== 20) continue;
    const selected = actors.map(actor => api.homeworldNpcVariantV84(actor.id));
    assert(selected.every(Boolean));
    assert.equal(new Set(selected.map(variant => variant.src)).size, actors.length);
    assert(selected.every(variant => variant.role === actors[0].role));
  }
});

test('new court, elder and animal-care staff occupy real supported places and keep their authored roles', () => {
  const interiors = qa.load('app/game/systems/homeworldInteriorsV64.ts');
  const urban = qa.load('app/game/systems/homeworldUrbanPopulationV78.ts');
  for (const authored of additions.interiors) {
    const room = interiors.HOMEWORLD_INTERIORS_V64.find(room => room.buildingId === authored.buildingId);
    const actor = room.monumentInhabitantsV81.find(actor => actor.id === authored.id);
    assert(actor, authored.id);
    assert.equal(cast.find(entry => entry.id === actor.id).role, authored.role);
    assert.equal(interiors.isHomeworldInteriorWalkableV64(room, actor), false, 'The NPC has real occupancy');
    const withoutSelf = { ...room, monumentInhabitantsV81: room.monumentInhabitantsV81.filter(other => other.id !== actor.id) };
    assert(interiors.isHomeworldInteriorWalkableV64(withoutSelf, actor, { halfWidth: 30, halfDepth: 20 }), actor.id + ' intersects furnishings, walls or another NPC');
  }
  for (const authored of additions.urban) {
    const actor = urban.HOMEWORLD_URBAN_EXTRAS_V78.find(actor => actor.id === authored.id);
    assert(actor, authored.id + ' must pass the actual full-body route filter');
    assert.equal(actor.role, authored.label);
    assert.equal(cast.find(entry => entry.id === actor.id).role, authored.role);
    assert.equal(actor.interactive, false);
    assert.equal(actor.saveVisit, false);
  }
  for (const authored of [...additions.interiors, ...additions.urban]) {
    if (!manifest.roles.find(role => role.id === authored.role).ready) continue;
    const selected = api.homeworldNpcVariantV84(authored.id);
    assert.equal(selected.role, authored.role);
    const html = qa.render('app/game/HomeworldCivilianV72.tsx', { npcId: authored.id, role: authored.fallbackRole });
    assert.equal(renderedSprites(html)[0].variant, selected.id);
  }
});

test('actual React civilian rendering keeps identity, whole-image proportions and floor anchor while moving or turning', () => {
  const actor = cast.find(actor => actor.role === 'artisan' && actor.source === 'city-resident');
  const variant = api.homeworldNpcVariantV84(actor.id);
  assert(variant, 'At least one produced civic family is required for integration QA');
  for (const moving of [false, true]) for (const facing of [1, -1]) {
    const html = qa.render('app/game/HomeworldCivilianV72.tsx', {
      npcId: actor.id, role: 'guard', height: 100, moving, facing, seconds: moving ? 83 : 0,
    });
    const nodes = renderedSprites(html);
    assert.equal(nodes.length, 1);
    assert.equal(nodes[0].id, actor.id);
    assert.equal(nodes[0].variant, variant.id);
    assert(nodes[0].node.includes(`src="${variant.src}"`));
    assert(nodes[0].node.includes('data-native-animation-status="single-pose-static"'));
    assert(nodes[0].node.includes(`data-actor-moving="${moving}"`));
    assert(nodes[0].node.includes(`scaleX(${facing})`));
    const scale = 100 / variant.alphaBounds.height;
    assert(nodes[0].node.includes(`left:${-variant.pivot.x * scale}px`));
    assert(nodes[0].node.includes(`top:${-variant.pivot.y * scale}px`));
    assert(nodes[0].node.includes(`width:${variant.sourceWidth * scale}px`));
    assert(nodes[0].node.includes(`height:${variant.sourceHeight * scale}px`));
    assert(!html.includes('data-motion-version="74"'), 'A moving actor must not switch back to the shared walk atlas');
  }
  for (const [npcId, role] of [['hunt-king', 'chief'], ['terrace-instructor', 'instructor']]) {
    const html = qa.render('app/game/HomeworldCivilianV72.tsx', { npcId, role });
    assert.equal(renderedSprites(html).length, 0);
    assert(html.includes('data-motion-version="74"'));
  }
});

test('real city and village scenes pass persistent NPC IDs through their existing culling and movement', () => {
  const world = qa.load('app/game/systems/homeworldWorldV77.ts');
  const seen = new Map();
  let cityCount = 0, villageCount = 0;
  const inspect = html => {
    for (const node of renderedSprites(html)) {
      const expected = api.homeworldNpcVariantV84(node.id);
      assert(expected, node.id);
      assert.equal(node.variant, expected.id);
      if (seen.has(node.id)) assert.equal(node.variant, seen.get(node.id));
      seen.set(node.id, node.variant);
    }
    return renderedSprites(html).length;
  };
  for (const seconds of [0, 73]) for (const levelId of ['0', '-1A', '+1']) {
    cityCount += inspect(qa.render('app/game/HomeworldWorldSceneV77.tsx', {
      actor: world.HOMEWORLD_SPACEPORT_V77.spawn, levelId, seconds,
      camera: { x: -1000, y: -3000, viewWidth: 14000, viewHeight: 11000 },
      activeDoorId: null, activePointId: null,
    }));
  }
  for (const regionId of ['glass-desert', 'pillar-jungle', 'thermal-caves']) for (const tick of [0, 4380]) {
    villageCount += inspect(qa.render('app/game/HomeworldVillageLifeV69.tsx', {
      regionId, tick, actor: { x: 1000, y: 1500 },
      rect: { left: -1000, top: -3000, right: 14000, bottom: 11000 },
    }));
  }
  assert(cityCount > 0 && villageCount > 0, 'Both active world render paths must actually mount variants');
});
