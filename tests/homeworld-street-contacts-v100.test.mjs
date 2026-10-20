import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';
import { firstTracksCompleted } from './helpers/solo-v67-campaign-route.mjs';

const renderer = homeworldSceneSsrV78();
const api = renderer.load('app/game/systems/homeworldStreetContactsV100.ts');
const world = renderer.load('app/game/systems/homeworldWorldV77.ts');
const urban = renderer.load('app/game/systems/homeworldUrbanPopulationV78.ts');
const visibility = renderer.load('app/game/systems/homeworldResidentVisibilityV100.ts');
const civic = renderer.load('app/game/systems/homeworldCivicWorldV80.ts');
const geometry = renderer.load('app/game/systems/homeworldGeometryV64.ts');
const actors = api.HOMEWORLD_STREET_CONTACTS_V100;
const context = (contact, seconds = 0) => {
  const pose = world.homeworldResidentPoseV77(contact, seconds);
  return { actor: { x: pose.x, y: pose.y + 40 }, levelId: contact.levelId, seconds };
};

test('V100: sixteen existing drawn people have a real supported approach, without admitting rejected candidates or modifying their identities', () => {
  assert.equal(actors.length, 16);
  assert.deepEqual(actors, urban.HOMEWORLD_URBAN_EXTRAS_V78);
  const before = JSON.stringify(actors);
  for (const contact of actors) {
    const at = context(contact);
    assert.equal(civic.homeworldCivicWalkableV80(at.levelId, at.actor), true, contact.id);
    assert.equal(api.homeworldStreetContactReachedV100(contact.id, at), contact, contact.id);
    assert.equal(api.nearestHomeworldStreetContactV100(at)?.id, contact.id, contact.id);
    assert.equal(contact.saveVisit, false);
    assert.equal(contact.solid, false);
  }
  for (const rejected of urban.HOMEWORLD_URBAN_EXTRA_REJECTIONS_V78) assert.equal(api.homeworldStreetContactV100(rejected.id), null);
  assert.equal(api.homeworldStreetContactV100('hunt-king'), null);
  assert.equal(JSON.stringify(actors), before);
});

test('V100: a conversation cannot cross a floor, interior, transit, suspension or non-finite clock and cannot reach beyond its real radius', () => {
  const contact = actors[0], valid = context(contact), pose = world.homeworldResidentPoseV77(contact, 0);
  for (const patch of [
    { levelId: '+1' }, { interiorId: 'dock-control' }, { inTransit: true }, { suspended: true },
    { seconds: NaN }, { seconds: -1 }, { actor: { x: Infinity, y: pose.y } },
    { actor: { x: pose.x, y: pose.y + api.HOMEWORLD_STREET_CONTACT_RADIUS_V100 } },
  ]) assert.equal(api.homeworldStreetContactReachedV100(contact.id, { ...valid, ...patch }), null);
  assert.equal(api.homeworldStreetContactReachedV100(null, valid), null);
  assert.equal(api.homeworldStreetContactReachedV100('urban-v78:extra:lower-1', valid), null);
});

test('V100: contact positions follow the same moving and waiting source as the rendered native actors', () => {
  for (const contact of actors) {
    let phases = new Set(), moved = false;
    const first = world.homeworldResidentPoseV77(contact, 0);
    for (const seconds of [0, 2, 7, 13, 23, 41, 67]) {
      const pose = world.homeworldResidentPoseV77(contact, seconds);
      phases.add(pose.phase); moved ||= pose.x !== first.x || pose.y !== first.y;
      assert(api.homeworldStreetConversationV100(contact, 'rhythm', seconds, true).startsWith(pose.phaseLabel));
      const at = context(contact, seconds);
      if (!visibility.homeworldResidentOccludedV100(contact.levelId, pose) && civic.homeworldCivicWalkableV80(at.levelId, at.actor))
        assert.equal(api.homeworldStreetContactReachedV100(contact.id, at), contact);
    }
    assert(moved, contact.id);
    assert(phases.size >= 2, contact.id);
  }
});

test('V100: the live foreground paint mask is shared with the scene and hides actual opaque building positions', () => {
  let hidden = null;
  for (const building of world.HOMEWORLD_BUILDINGS_V77) {
    for (let dy = -250; dy <= 0 && !hidden; dy += 25) {
      const pose = { x: building.x, y: building.y + dy };
      if (visibility.homeworldResidentOccludedV100(building.levelId, pose)) hidden = { building, pose };
    }
    if (hidden) break;
  }
  assert(hidden, 'the test must exercise a real opaque foreground building');
  assert.equal(visibility.homeworldResidentOccludedV100(hidden.building.levelId, hidden.pose), true);
  const contact = actors.find(item => item.id === 'urban-v84:stable-supplies');
  const pose = world.homeworldResidentPoseV77(contact, 0), ground = geometry.homeworldProjectGroundV64(pose);
  const html = renderer.render('app/game/HomeworldWorldSceneV77.tsx', {
    actor: context(contact).actor, levelId: '0', seconds: 0, activeDoorId: null, activePointId: null, activeStreetContactV100: contact.id,
    camera: { x: ground.x - 300, y: ground.y - 300, viewWidth: 600, viewHeight: 600 },
  });
  assert(html.includes(`data-homeworld-resident="${contact.id}"`));
  assert(html.includes(`data-x="${pose.x}" data-y="${pose.y}"`));
  assert(html.includes(`data-homeworld-street-label-v100="${contact.id}"`));
});

test('V100: street advice exposes only real public building landmarks in an acknowledged district and grants no progress', () => {
  const save = firstTracksCompleted(), before = JSON.stringify(save);
  save.homeworld.visitedDistrictIds = [];
  for (const contact of actors) assert.deepEqual(api.homeworldStreetPlacesV100(contact, save.homeworld), []);
  const porter = actors[0];
  save.homeworld.visitedDistrictIds = ['memory'];
  assert.deepEqual(api.homeworldStreetPlacesV100(porter, save.homeworld), []);
  save.homeworld.visitedDistrictIds = ['port'];
  assert.deepEqual(api.homeworldStreetPlacesV100(porter, save.homeworld).map(place => place.id), ['building:dock-control']);
  assert(!JSON.stringify(api.homeworldStreetPlacesV100(porter, save.homeworld)).includes('forbidden-reserve'));
  const lower = actors.find(item => item.levelId === '-1A');
  assert.deepEqual(api.homeworldStreetPlacesV100(lower, save.homeworld), []);
  save.homeworld.visitedDistrictIds = JSON.parse(before).homeworld.visitedDistrictIds;
  assert.equal(JSON.stringify(save), before);
});

test('V100: the actual dialogue renders three accessible subjects, native jobs and disabled controls during suspension', () => {
  const save = firstTracksCompleted(), contact = actors.find(item => item.id === 'urban-v84:kennel-return');
  const props = { contact, progress: save.homeworld, seconds: 0, youth: true, disabled: false, onLandmark() {} };
  const html = renderer.render('app/game/HomeworldStreetConversationV100.tsx', props);
  assert(html.includes(`data-homeworld-street-conversation-v100="${contact.id}"`));
  assert.equal((html.match(/aria-pressed=/g) ?? []).length, 3);
  assert.match(html, /Ton travail/);
  assert.match(html, /Ta prochaine halte/);
  assert.match(html, /Mes repères du quartier/);
  assert.match(html, /chiens de chasse/);
  const frozen = renderer.render('app/game/HomeworldStreetConversationV100.tsx', { ...props, disabled: true });
  assert.equal((frozen.match(/disabled=""/g) ?? []).length, 3);
});

test('V100: the actual Hub landmark callback rechecks owner, live proximity, phase and known destination before any atlas action', () => {
  const source = fs.readFileSync('app/game/HomeworldHub.tsx', 'utf8');
  const start = source.indexOf('const requestStreetLandmarkV100=');
  const end = source.indexOf('\n  };', start) + '\n  };'.length;
  assert(start > 0 && end > start);
  const code = ts.transpileModule(source.slice(start, end) + '\nreturn requestStreetLandmarkV100;', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const contact = actors[0], at = context(contact), owner = '2026-10-20T01:00:00.000Z';
  const save = firstTracksCompleted(); save.createdAt = owner; save.homeworld.visitedDistrictIds = ['port'];
  function callback(patch = {}) {
    const calls = [], values = {
      dialogStateRef: { current: { point: null, streetContactV100: { id: contact.id, owner } } },
      saveRef: { current: save }, suspendedRef: { current: false }, pausedRef: { current: false }, inactive: false,
      motionAssetsV74: { ready: true }, actorRef: { current: at.actor }, levelRefV77: { current: at.levelId },
      cityClockV68: { current: at.seconds }, interiorRef: { current: null }, transitRefV77: { current: null }, skiffRefV77: { current: null },
      progressRef: { current: save.homeworld }, homeworldStreetContactReachedV100: api.homeworldStreetContactReachedV100,
      homeworldStreetPlacesV100: api.homeworldStreetPlacesV100, requestLandmarkV75: id => calls.push(id), ...patch,
    };
    return { calls, action: new Function(...Object.keys(values), code)(...Object.values(values)) };
  }
  const ok = callback(); ok.action('building:dock-control'); assert.deepEqual(ok.calls, ['building:dock-control']);
  const unknown = callback(); unknown.action('region:forbidden-reserve'); assert.deepEqual(unknown.calls, []);
  for (const patch of [
    { saveRef: { current: { ...save, createdAt: 'another-owner' } } }, { suspendedRef: { current: true } },
    { pausedRef: { current: true } }, { inactive: true }, { motionAssetsV74: { ready: false } },
    { levelRefV77: { current: '+1' } }, { interiorRef: { current: { buildingId: 'dock-control' } } },
    { actorRef: { current: { x: at.actor.x + 500, y: at.actor.y } } },
    { progressRef: { current: { ...save.homeworld, visitedDistrictIds: [] } } },
  ]) { const denied = callback(patch); denied.action('building:dock-control'); assert.deepEqual(denied.calls, []); }
});
