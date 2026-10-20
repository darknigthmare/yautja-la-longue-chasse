import test from 'node:test';
import assert from 'node:assert/strict';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';
import { firstTracksCompleted, p } from './helpers/solo-v67-campaign-route.mjs';

const renderer = homeworldSceneSsrV78();
const world = renderer.load('app/game/systems/homeworldWorldV77.ts');
const geometry = renderer.load('app/game/systems/homeworldGeometryV64.ts');
const navigation = renderer.load('app/game/systems/homeworldWayfindingV98.ts');
const save = firstTracksCompleted();
const props = { save, actor: world.HOMEWORLD_SPACEPORT_V77.spawn, levelId: '0', open: true, onOpenChange() {} };
const render = overrides => renderer.render('app/game/HomeworldWorldMapV77.tsx', { ...props, ...overrides });

test('live atlas offers an explicit walking action for the physically visitable youth mentor', () => {
  const html = render({ targetId: 'point:training-service' });
  assert.match(html, /data-homeworld-route-planner-v98="point:training-service"/);
  assert.match(html, /Suivre ce repère à pied/);
  assert.match(html, /Objectif actuel/);
  assert.match(html, /activité réservée/);
  const action = html.match(/<button[^>]*>Suivre ce repère à pied<\/button>/)?.[0];
  assert(action); assert(!action.includes('disabled'));
});

test('closed departures remain disabled and sensitive Reserve never appears or gains a route', () => {
  const locked = structuredClone(save); locked.soloV66 = null;
  const html = render({ save: locked, targetId: 'region:ash-marches' });
  assert.match(html, /<button[^>]*disabled=""[^>]*>Suivre ce repère à pied/);
  assert(!html.includes('region:forbidden-reserve'));
  assert(!render({ save: locked, targetId: 'region:forbidden-reserve' }).includes('data-homeworld-route-planner-v98'));
});

test('atlas uses the true world door for an indoor actor without drawing local room coordinates outside', () => {
  const building = world.HOMEWORLD_BUILDINGS_V77.find(entry => entry.levelId === '0' && entry.districtId === 'port');
  assert(building);
  const door = geometry.homeworldBuildingDoorwayV64(building).approach;
  const html = render({ actor: { x: 123.4, y: 456.7 }, interiorId: building.id, levelId: building.levelId });
  assert(html.includes(`cx="${door.x}" cy="${door.y}" r="80"`));
  assert(!html.includes('cx="123.4" cy="456.7" r="80"'));
  assert.match(html, /Ta position : dans le bâtiment/);
});

test('guide renders the real arrived interaction instruction and configured shortcut, with pause disabling actions', () => {
  const adult = p.defaultSave();
  const origin = { actor: world.HOMEWORLD_SPACEPORT_V77.spawn, levelId: '0', interiorId: null };
  const plan = navigation.homeworldRoutePlanV98(adult, origin, 'point:dock-officer-point');
  assert.equal(plan.status, 'reachable');
  const stage = plan.stages.at(-1);
  const guidance = navigation.homeworldRouteGuidanceV98(plan, { actor: stage.points.at(-1), levelId: stage.levelId, interiorId: stage.interiorId });
  assert.equal(guidance.state, 'arrived');
  const html = renderer.render('app/game/HomeworldRouteGuideV98.tsx', {
    label: 'Contrôle d’amarrage', targetId: plan.destinationId, guidance, interactionShortcut: 'F / Y', suspended: true,
    onRecalculate() {}, onChange() {}, onClear() {},
  });
  assert.match(html, /data-homeworld-route-guide-v98="arrived"/);
  assert.match(html, /data-homeworld-route-paused-v98="true"/);
  assert.match(html, /<kbd>F \/ Y<\/kbd>/);
  assert.equal((html.match(/disabled=""/g) ?? []).length, 3);
  assert.match(html, /Effacer l’itinéraire à pied/);
});
