import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';
import { cargoRouteV108 } from './helpers/cargo-v108-route.mjs';

const qa = homeworldSceneSsrV78();
const api = qa.load('app/game/systems/homeworldResidentContactsV110.ts');
const world = qa.load('app/game/systems/homeworldWorldV77.ts');
const navigation = qa.load('app/game/systems/homeworldNavigationV109.ts');
const visibility = qa.load('app/game/systems/homeworldResidentVisibilityV100.ts');
const civic = qa.load('app/game/systems/homeworldCivicWorldV80.ts');
const originalPlaces = qa.load('app/game/systems/homeworldResidentConversationsV75.ts');
const owner = '2026-10-26T10:00:00.000Z';
const contact = world.HOMEWORLD_RESIDENTS_V77.find(resident => resident.id === 'resident-port-3');
const normal = () => ({ ownerCreatedAt: owner, currentOwnerCreatedAt: owner, actor: { x: 6925, y: 3474.5 }, seconds: 0, levelId: '0', active: true });
const progress = () => ({ visitedDistrictIds: ['port'] });

test('V110: the visible existing resident is reached through the same native pose and floor without rewriting the 98 people', () => {
  const before = JSON.stringify(world.HOMEWORLD_RESIDENTS_V77), at = normal();
  assert.equal(world.HOMEWORLD_RESIDENTS_V77.length, 98);
  assert.equal(civic.homeworldCivicWalkableV80(at.levelId, at.actor), true);
  assert.equal(visibility.homeworldResidentOccludedV100(at.levelId, world.homeworldResidentPoseV77(contact, at.seconds)), false);
  assert.equal(api.homeworldResidentContactReachedV110(contact.id, at), contact);
  assert.equal(api.nearestHomeworldResidentContactV110(at), contact);
  assert.equal(api.homeworldResidentDialogueContactV110({ id: contact.id, owner }, at), contact);
  assert.equal(JSON.stringify(world.HOMEWORLD_RESIDENTS_V77), before);
});

test('V110: both real invisible-port reproductions retain a supported player but stop selecting the hidden speaker', () => {
  const hidden = world.HOMEWORLD_RESIDENTS_V77.find(resident => resident.id === 'resident-port-1');
  const pose = world.homeworldResidentPoseV77(hidden, 0);
  const examples = [
    { actor: { x: 7165.727272727273, y: 2534.5 }, segment: true },
    { actor: { x: 7116.34194731648, y: 2608.4103626009028 }, segment: false },
  ];
  assert(visibility.homeworldResidentOccludedV100('0', pose));
  for (const example of examples) {
    const at = { ...normal(), actor: example.actor };
    assert(civic.homeworldCivicWalkableV80('0', at.actor));
    assert.equal(world.nearestHomeworldResidentV77('0', at.actor, 0)?.id, hidden.id, 'exercise the actual historical bug');
    assert.equal(navigation.homeworldRouteSegmentV109('0', at.actor, pose), example.segment);
    assert.equal(api.homeworldResidentContactReachedV110(hidden.id, at), null);
    assert.notEqual(api.nearestHomeworldResidentContactV110(at)?.id, hidden.id);
  }
});

test('V110: a genuinely visible courier behind a blocked short approach cannot be addressed through the obstruction', () => {
  const at = { ...normal(), seconds: 15, actor: { x: 6761.089637399097, y: 3313.885325410793 } };
  const pose = world.homeworldResidentPoseV77(contact, at.seconds);
  assert(civic.homeworldCivicWalkableV80('0', at.actor));
  assert.equal(visibility.homeworldResidentOccludedV100('0', pose), false);
  assert.equal(world.nearestHomeworldResidentV77('0', at.actor, at.seconds)?.id, contact.id);
  assert.equal(navigation.homeworldRouteSegmentV109('0', at.actor, pose), false);
  assert.equal(api.homeworldResidentContactReachedV110(contact.id, at), null);
});

test('V110: owner, room, floor, paused activity, transit, finite clock and exact radius are rechecked before dialogue admission', () => {
  const at = normal(), pose = world.homeworldResidentPoseV77(contact, 0);
  for (const patch of [
    { currentOwnerCreatedAt: 'another-save' }, { ownerCreatedAt: '' }, { active: false },
    { levelId: '+1' }, { interiorId: 'dock-control' }, { inTransit: true },
    { seconds: NaN }, { seconds: Infinity }, { seconds: -1 },
    { actor: { x: NaN, y: pose.y } }, { actor: { x: pose.x, y: Infinity } },
    { actor: { x: -1, y: pose.y } }, { actor: { x: pose.x, y: 6401 } },
    { actor: { x: pose.x, y: pose.y + api.HOMEWORLD_RESIDENT_CONTACT_RADIUS_V110 } },
  ]) {
    assert.equal(api.homeworldResidentContactReachedV110(contact.id, { ...at, ...patch }), null, JSON.stringify(patch));
  }
  assert.equal(api.homeworldResidentDialogueContactV110({ id: contact.id, owner: 'old-save' }, at), null);
  for (const id of [undefined, null, 'hunt-king', 'urban-v84:stable-supplies', {}]) assert.equal(api.homeworldResidentContactReachedV110(id, at), null);
});

test('V110: resident advice retains only existing public buildings in the acknowledged speaker district and cannot grant discoveries', () => {
  const known = progress(), before = JSON.stringify(known), people = JSON.stringify(world.HOMEWORLD_RESIDENTS_V77);
  assert.deepEqual(api.homeworldResidentContactPlacesV110(contact, known), originalPlaces.homeworldResidentPlacesV75(contact));
  assert.deepEqual(api.homeworldResidentContactPlacesV110(contact, { visitedDistrictIds: [] }), []);
  assert.deepEqual(api.homeworldResidentContactPlacesV110(contact, { visitedDistrictIds: ['memory'] }), []);
  assert.deepEqual(api.homeworldResidentContactPlacesV110({ ...contact, districtId: 'memory' }, known), originalPlaces.homeworldResidentPlacesV75(contact), 'the canonical registry, not supplied district metadata, defines the advice');
  const calls = [];
  assert.equal(api.requestHomeworldResidentLandmarkV110({ id: contact.id, owner }, 'building:dock-control', normal(), known, id => calls.push(id)), true);
  for (const id of ['region:forbidden-reserve', 'building:memory-vault', undefined, {}])
    assert.equal(api.requestHomeworldResidentLandmarkV110({ id: contact.id, owner }, id, normal(), known, value => calls.push(value)), false);
  assert.deepEqual(calls, ['building:dock-control']);
  assert.equal(JSON.stringify(known), before);
  assert.equal(JSON.stringify(world.HOMEWORLD_RESIDENTS_V77), people);
});

test('V110: the retained callback reads live refs, rejects a replacement dialogue and can recover only after the same current context becomes valid again', () => {
  const refs = { dialogue: { id: contact.id, owner }, context: normal(), progress: progress() }, calls = [];
  const callback = api.createHomeworldResidentLandmarkRequestV110({
    readDialogue: () => refs.dialogue, readContext: () => refs.context, readProgress: () => refs.progress,
    onLandmark: id => calls.push(id),
  });
  assert(callback('building:dock-control'));
  const startingDialogue = refs.dialogue;
  for (const patch of [
    { active: false }, { currentOwnerCreatedAt: 'new-owner' }, { inTransit: true }, { interiorId: 'dock-control' },
    { levelId: '+1' }, { actor: { x: 7500, y: 3474.5 } }, { seconds: 15 },
  ]) { refs.context = { ...normal(), ...patch }; assert.equal(callback('building:dock-control'), false); }
  refs.context = normal(); refs.progress = { visitedDistrictIds: [] }; assert.equal(callback('building:dock-control'), false);
  refs.progress = progress(); assert(callback('building:dock-control'));
  refs.dialogue = { ...startingDialogue }; assert.equal(callback('building:dock-control'), false, 'a new object with the same ID is still a replacement conversation');
  refs.dialogue = null; assert.equal(callback('building:dock-control'), false);
  refs.dialogue = startingDialogue; assert(callback('building:dock-control'));
  assert.deepEqual(calls, ['building:dock-control', 'building:dock-control', 'building:dock-control']);
});

test('V110: a lot carried by the actual motor and parked beside the real resident invalidates the old callback until physically picked up again', () => {
  const f = cargoRouteV108(owner), nav = f.qa.load('app/game/systems/homeworldNavigationV109.ts');
  f.start(); f.walkTo(f.b.lots[0].stand); f.action('take-wide');
  const target = normal().actor, route = nav.homeworldWalkRouteV109('0', f.state().actor, target, f.state().ledger);
  assert.equal(route.status, 'reachable'); assert(route.distance > 3000 && route.points.length > 2);
  for (const waypoint of route.points.slice(1)) f.walkTo(waypoint);
  const at = { ...normal(), actor: { x: f.state().actor.x, y: f.state().actor.y }, cargo: f.state().ledger };
  assert.equal(api.homeworldResidentContactReachedV110(contact.id, at), contact, 'carried hulls do not become static obstacles');
  const dialogue = { id: contact.id, owner }, calls = [];
  const callback = api.createHomeworldResidentLandmarkRequestV110({
    readDialogue: () => dialogue, readContext: () => ({ ...at, cargo: f.state().ledger }), readProgress: progress,
    onLandmark: id => calls.push(id),
  });
  assert(callback('building:dock-control'));
  f.action('interrupt'); f.action('park');
  assert(f.schema.normalizeHomeworldCargoV108(f.state().ledger));
  assert(f.state().ledger.receipt.walked > 3000);
  const parked = JSON.stringify(f.state());
  assert.equal(callback('building:dock-control'), false);
  assert.equal(api.homeworldResidentContactReachedV110(contact.id, { ...at, cargo: f.state().ledger }), null);
  assert.equal(JSON.stringify(f.state()), parked, 'queries do not change a cargo receipt or actor');
  f.action('resume'); f.action('take-wide');
  assert(callback('building:dock-control'));
  assert.deepEqual(calls, ['building:dock-control', 'building:dock-control']);
  const foreign = structuredClone(f.state().ledger); foreign.ownerCreatedAt = '2026-10-27T10:00:00.000Z';
  assert.equal(api.homeworldResidentContactReachedV110(contact.id, { ...at, cargo: foreign }), null);
  assert.equal(api.homeworldResidentContactReachedV110(contact.id, { ...at, cargo: { ...f.state().ledger, version: 2 } }), null);
});

test('V110: real conversation subjects and recommended landmark buttons all disable during suspension or pause, while known-place filtering renders explicitly', () => {
  const props = { resident: contact, seconds: 0, paused: false, onLandmark() {} };
  const file = 'app/game/HomeworldResidentConversationV75.tsx';
  const active = qa.render(file, props);
  assert.equal((active.match(/aria-pressed=/g) ?? []).length, 3);
  assert.equal((active.match(/disabled=""/g) ?? []).length, 0);
  for (const patch of [{ paused: true }, { disabled: true }, { paused: true, disabled: false }]) {
    const html = qa.render(file, { ...props, ...patch });
    assert.equal((html.match(/disabled=""/g) ?? []).length, 3);
  }
  const component = qa.load(file).HomeworldResidentLandmarksV75;
  const places = api.homeworldResidentContactPlacesV110(contact, progress());
  const links = renderToStaticMarkup(React.createElement(component, { places, disabled: true, onLandmark() {} }));
  assert.equal((links.match(/disabled=""/g) ?? []).length, places.length);
  assert(links.includes('data-homeworld-resident-landmark="building:dock-control"'));
  const hidden = renderToStaticMarkup(React.createElement(component, { places: [], disabled: false, onLandmark() {} }));
  assert(!hidden.includes('building:dock-control'));
  assert.match(hidden, /Explore les passages/);
});

test('V110: the actual Hub event closure rejects replaced dialogue refs and admission changes before passive owner/pause effects run', () => {
  const source = fs.readFileSync('app/game/HomeworldHub.tsx', 'utf8');
  const extract = (startText, endText) => {
    const start = source.indexOf(startText), end = source.indexOf(endText, start);
    assert(start > 0 && end > start, startText);
    return source.slice(start, end);
  };
  const contextCode = ts.transpileModule(extract('  const residentContextV110 = useCallback(', '\n\n  const recoveryContextV111=')
    + '\nreturn residentContextV110;', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const actionCode = ts.transpileModule(extract('  const expectedResidentDialogueV110=', '\n  const requestStreetLandmarkV100=')
    + '\nreturn requestResidentLandmarkV110;', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const admissionCode = ts.transpileModule(extract('  useLayoutEffect(()=>{\n    residentAdmissionRefV110.current=', '\n  const villagesOpenV69'),
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const opening = { id: contact.id, owner }, values = {
    useCallback: callback => callback, save: { createdAt: owner },
    actorRef: { current: normal().actor }, levelRefV77: { current: '0' }, cityClockV68: { current: 0 },
    interiorRef: { current: null }, transitRefV77: { current: null }, skiffRefV77: { current: null },
    suspendedRef: { current: false }, pausedRef: { current: false }, cargoDraftRefV108: { current: undefined },
    residentAdmissionRefV110: { current: { owner, active: false } }, document: { hidden: false, hasFocus: () => true },
  };
  const readContext = new Function(...Object.keys(values), contextCode)(...Object.values(values));
  const layout = (patch = {}) => {
    const props = { residentAdmissionRefV110: values.residentAdmissionRefV110, useLayoutEffect: effect => effect(),
      save: values.save, cargoMigrationPendingV108: false, suspended: false, paused: false, inactive: false,
      spatialCodexOpen: false, wayfindingOpenV75: false, motionAssetsV74: { ready: true }, ...patch };
    new Function(...Object.keys(props), admissionCode)(...Object.values(props));
  };
  const calls = [], dialogRef = { current: { residentV110: opening } };
  const actionValues = { dialog: { residentV110: opening }, dialogStateRef: dialogRef, residentContextV110: readContext,
    progressRef: { current: progress() }, requestHomeworldResidentLandmarkV110: api.requestHomeworldResidentLandmarkV110,
    requestLandmarkV75: id => calls.push(id) };
  const click = new Function(...Object.keys(actionValues), actionCode)(...Object.values(actionValues));
  layout(); click('building:dock-control'); assert.deepEqual(calls, ['building:dock-control']);
  for (const patch of [
    { save: { createdAt: '2026-10-27T10:00:00.000Z' } }, { paused: true }, { suspended: true },
    { inactive: true }, { cargoMigrationPendingV108: true }, { spatialCodexOpen: true }, { wayfindingOpenV75: true },
    { motionAssetsV74: { ready: false } },
  ]) { layout(patch); click('building:dock-control'); assert.equal(calls.length, 1, JSON.stringify(patch)); }
  assert.equal(values.pausedRef.current, false, 'the rejection above does not depend on a later passive pause-ref update');
  assert.equal(values.suspendedRef.current, false);
  layout(); values.document.hidden = true; click('building:dock-control'); assert.equal(calls.length, 1);
  values.document.hidden = false; values.document.hasFocus = () => false; click('building:dock-control'); assert.equal(calls.length, 1);
  values.document.hasFocus = () => true;
  dialogRef.current = { residentV110: { ...opening } }; click('building:dock-control'); assert.equal(calls.length, 1);
  dialogRef.current = null; click('building:dock-control'); assert.equal(calls.length, 1, 'opening the atlas clears the live dialogue before any old click can act');
});

test('V110: a queued invalid-dialogue close cannot dismiss a newer conversation and otherwise returns focus once', () => {
  const source = fs.readFileSync('app/game/HomeworldHub.tsx', 'utf8');
  const start = source.indexOf('  useEffect(()=>{\n    if(!residentDialogueInvalidV110)return;');
  const end = source.indexOf('\n  const expectedResidentDialogueV110=', start);
  assert(start > 0 && end > start);
  const code = ts.transpileModule(source.slice(start, end), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const opening = { id: contact.id, owner }, queued = [], events = [], dialogRef = { current: { residentV110: opening } };
  const values = {
    useEffect: effect => effect(), residentDialogueInvalidV110: true, dialog: { residentV110: opening }, dialogStateRef: dialogRef,
    requestAnimationFrame: callback => { queued.push(callback); return queued.length; }, cancelAnimationFrame() {},
    setDialog: value => events.push(['dialog', value]), setAnnouncement: message => events.push(['announcement', message]),
    viewportRef: { current: { focus: () => events.push(['focus']) } },
  };
  const schedule = () => new Function(...Object.keys(values), code)(...Object.values(values));
  schedule(); dialogRef.current = { residentV110: { ...opening } }; queued.shift()(); assert.deepEqual(events, []);
  dialogRef.current = { residentV110: opening }; schedule(); queued.shift()();
  assert.equal(dialogRef.current, null); assert.equal(events.filter(event => event[0] === 'dialog').length, 1);
  assert.equal(events.filter(event => event[0] === 'focus').length, 1);
});

test('V110: the actual opening publishes the exact live clock so a valid moving speaker at the radius edge is not immediately dismissed', () => {
  const at = { ...normal(), seconds: 60, actor: { x: 6944.965022804362, y: 3454.4650228043615 } };
  const formerRenderTime = 59.968;
  assert.equal(api.homeworldResidentContactReachedV110(contact.id, at), contact);
  assert.equal(api.homeworldResidentContactReachedV110(contact.id, { ...at, seconds: formerRenderTime }), null,
    'the prior rendered pose is beyond 100 units while the live pose is within 99.5');
  const source = fs.readFileSync('app/game/HomeworldHub.tsx', 'utf8');
  const search = source.indexOf('      const resident = !room && nearestHomeworldResidentContactV110(');
  const start = source.indexOf('      if (resident) {', search), end = source.indexOf('\n      const streetContact =', start);
  assert(search > 0 && start > search && end > start);
  const code = ts.transpileModule(source.slice(start, end), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  let renderedPhase = formerRenderTime, renderedActor = { ...at.actor }, renderedDialog;
  const dialogRef = { current: null }, actorRef = { current: { ...at.actor, vx: 30, vy: 40 } }, events = [];
  const values = {
    resident: contact, actorRef, dialogStateRef: dialogRef, cityClockV68: { current: at.seconds }, saveRef: { current: { createdAt: owner } },
    clearInputs: () => events.push('clear'), setActor: actor => { renderedActor = actor; },
    setPhase: phase => { renderedPhase = phase; }, setDialog: dialog => { renderedDialog = dialog; },
  };
  new Function(...Object.keys(values), code)(...Object.values(values));
  assert.equal(renderedPhase, at.seconds); assert.equal(renderedDialog, dialogRef.current);
  assert.deepEqual(renderedActor, { ...at.actor, vx: 0, vy: 0 }); assert.equal(actorRef.current, renderedActor);
  assert.deepEqual(events, ['clear']);
  assert.equal(api.homeworldResidentDialogueContactV110(renderedDialog.residentV110,
    { ...at, actor: renderedActor, seconds: renderedPhase }), contact);
});
