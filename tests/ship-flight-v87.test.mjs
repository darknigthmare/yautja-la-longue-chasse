import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

async function moduleFor(relative) {
  const bundle = await build({ entryPoints: [fileURLToPath(new URL(relative, import.meta.url))], bundle: true,
    format: 'esm', platform: 'node', target: 'es2022', write: false });
  return import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
}
const [flight, campaign, chronicle] = await Promise.all([
  moduleFor('../app/game/systems/shipFlightV87.ts'), moduleFor('../app/game/systems/shipCampaignOperationsV87.ts'), moduleFor('../app/game/systems/clanChronicle.ts'),
]);
const owner = '2026-10-07T13:00:00.000Z';
const route = { originId: 'SPACE-BASE-01', relayId: 'route-relay-one', destinationId: 'SPACE-BASE-02' };
function operate(state, action) { const result = flight.stepShipFlightV87(state, action, route); assert.equal(result.accepted, true, result.message); return result.state; }
function berth(state) {
  while (state.lateral) state = operate(state, { type: 'lateral', direction: state.lateral < 0 ? 1 : -1 });
  state = operate(state, { type: 'align' });
  while (state.speed > 1) state = operate(state, { type: 'speed', direction: -1 });
  while (state.distance) state = operate(state, { type: 'advance' });
  for (const action of [{ type: 'lock', index: 0 }, { type: 'lock', index: 1 }, { type: 'ring', direction: 1 }, { type: 'ring', direction: 1 }, { type: 'berth' }]) state = operate(state, action);
  return state;
}

test('the seven V87 source rows preserve exact cells and pin the unchanged supplied workbook', async () => {
  const source = flight.SHIP_FLIGHT_SOURCE_V87;
  const [publicCorpus, workbook] = await Promise.all([readFile(new URL('../public/game/dialogues/v85/bible-ships.json', import.meta.url), 'utf8'),
    readFile(new URL('../work-local/drive-import-20261007/downloads/Yautja_V6_Bible_Cumulative_et_Dialogues.xlsx', import.meta.url))]);
  assert.equal(createHash('sha256').update(workbook).digest('hex'), source.source.sha256);
  const corpus = JSON.parse(publicCorpus);
  let count = 0;
  for (const sheet of source.sheets) for (const row of sheet.rows) {
    assert.deepEqual(row, corpus.sheets.find(s => s.name === sheet.name).rows.find(r => r.number === row.number)); count++;
  }
  assert.equal(count, 7);
});

test('alignment, braking and independent clamps require played input before a berth receipt', () => {
  let state = flight.createShipFlightV87(owner, 'operation-one');
  for (const action of [{ type: 'align' }, { type: 'advance' }, { type: 'berth' }]) assert.equal(flight.stepShipFlightV87(state, action, route).accepted, false);
  const original = JSON.stringify(state); state = berth(state);
  assert.equal(state.phase, 'berthed'); assert.deepEqual(state.sourceReceipts, ['FLIGHT5-01:outward', 'FLIGHT5-02:outward', 'FLIGHT5-03:outward']);
  assert.notEqual(JSON.stringify(state), original); assert.equal(state.setbacks, 0);
  assert.deepEqual(flight.normalizeShipFlightV87(JSON.parse(JSON.stringify(state)), owner), state);
});

test('a fast closing attempt retreats without losing cargo, resetting the operation or creating a berth', () => {
  let state = flight.createShipFlightV87(owner, 'operation-one');
  for (let i = 0; i < 3; i++) state = operate(state, { type: 'lateral', direction: -1 });
  state = operate(state, { type: 'align' });
  for (let i = 0; i < 4; i++) state = operate(state, { type: 'advance' });
  assert.equal(state.phase, 'approach'); assert.equal(state.distance, 30); assert.equal(state.speed, 0); assert.equal(state.setbacks, 1);
  assert.deepEqual(state.sourceReceipts, ['FLIGHT5-01:outward']); assert.equal(state.operationId, 'operation-one');
});

test('locking one support cannot rotate the ring; unlocking requires a fully free ring', () => {
  let state = berth(flight.createShipFlightV87(owner, 'op'));
  state = operate(state, { type: 'return-route' });
  for (const [slot, node] of [route.destinationId, route.relayId, route.originId].entries()) state = operate(state, { type: 'route', slot, node });
  state = operate(state, { type: 'confirm-route' });
  while (state.lateral) state = operate(state, { type: 'lateral', direction: 1 });
  state = operate(state, { type: 'align' }); state = operate(state, { type: 'speed', direction: -1 }); state = operate(state, { type: 'speed', direction: -1 });
  while (state.distance) state = operate(state, { type: 'advance' });
  state = operate(state, { type: 'lock', index: 0 });
  assert.equal(flight.stepShipFlightV87(state, { type: 'ring', direction: 1 }, route).accepted, false);
  state = operate(state, { type: 'lock', index: 1 }); state = operate(state, { type: 'ring', direction: 1 });
  assert.equal(flight.stepShipFlightV87(state, { type: 'lock', index: 0 }, route).accepted, false);
  state = operate(state, { type: 'ring', direction: -1 }); state = operate(state, { type: 'lock', index: 0 }); assert.equal(state.locks[0], false);
});

test('return route has an actual order and the second approach records distinct source receipts', () => {
  let state = berth(flight.createShipFlightV87(owner, 'op')); state = operate(state, { type: 'return-route' });
  assert.equal(flight.stepShipFlightV87(state, { type: 'confirm-route' }, route).accepted, false);
  for (const [slot, node] of [route.originId, route.relayId, route.destinationId].entries()) state = operate(state, { type: 'route', slot, node });
  assert.equal(flight.stepShipFlightV87(state, { type: 'confirm-route' }, route).accepted, false);
  for (const [slot, node] of [route.destinationId, route.relayId, route.originId].entries()) state = operate(state, { type: 'route', slot, node });
  state = operate(state, { type: 'confirm-route' }); state = berth(state);
  assert.equal(state.phase, 'returned'); assert.equal(state.sourceReceipts.length, 7);
  assert.equal(flight.stepShipFlightV87(state, { type: 'berth' }, route).accepted, false);
});

test('malformed, foreign, future and forged phase checkpoints are refused without mutating input', () => {
  for (const change of [s => { s.version = 2; }, s => { s.sourceSha256 = 'other'; }, s => { s.ownerSaveCreatedAt = 'foreign'; },
    s => { s.phase = 'approach'; }, s => { s.distance = Infinity; }, s => { s.locks = [true]; }, s => { s.route = ['a', 'b', 'c', 'd']; }, s => { s.revision = -1; }]) {
    const state = flight.createShipFlightV87(owner, 'op'); change(state); const before = JSON.stringify(state);
    assert.equal(flight.normalizeShipFlightV87(state, owner), null); assert.equal(JSON.stringify(state), before);
  }
});

function blooded() {
  let state = chronicle.createClanChronicle();
  const prove = ids => { for (const id of ids) { const d = chronicle.CHRONICLE_EVIDENCE.find(e => e.id === id); state = chronicle.recordChronicleEvidence(state, { id, sourceId: d.sourceId }).state; } };
  prove(['intro-begun']);
  for (const d of chronicle.CHRONICLE_RITES) { if (!d.grantsRankId) continue; prove(d.requiredEvidenceIds); state = chronicle.performChronicleRite(state, { id: d.id, sourceId: d.sourceId }).state; if (d.grantsRankId === 'blooded') break; }
  return state;
}
function fixture() {
  const manifest = { id: 'real-contract-one', ownerSaveCreatedAt: owner, shipId: 'classic-predator-spaceship', kind: 'spatial', originId: route.originId, destinationId: route.destinationId,
    originBranchId: 'present', destinationBranchId: 'present', travellers: [{ id: 'hunter', name: 'Hunter', role: 'hunter', condition: 'fit', branchId: 'present' },
      { id: 'medic', name: 'Medic', role: 'medic', condition: 'fit', branchId: 'present' }],
    cargo: [{ id: 'loan-kit', name: 'Kit prêté', units: 1, ownerId: 'lender', purpose: 'loan', branchId: 'present' }], outwardFuel: 2, returnFuelReserve: 3 };
  const context = { ownerSaveCreatedAt: owner, active: true, focused: true, suspended: false, manifest, route,
    departureContext: { ownerSaveCreatedAt: owner, chronicle: blooded(), availableShipId: manifest.shipId, capacity: { persons: 2, medicalPlaces: 0, cargoUnits: 1 },
      availablePersonIds: ['hunter', 'medic'], availableCargoIds: ['loan-kit'], availableFuel: 10, routeConfirmed: true, destinationApproved: true, warpModuleInstalled: false, returnAnchorId: null },
    hullProof: { ownerSaveCreatedAt: owner, shipId: manifest.shipId, kind: 'acquisition-receipt', sourceId: 'test-authored-acquisition' },
    physicalPost: { operationId: manifest.id, stationId: 'galaxy-map', reachedByWalking: true }, boardedPersonIds: ['hunter', 'medic'], consentingPersonIds: ['hunter', 'medic'], securedCargoIds: ['loan-kit'], availableFuel: 10, observedReturn: null };
  let ledger, fuel = 10, fail = false, commits = 0;
  const transaction = campaign.createShipCampaignTransactionV87({ read: () => ledger, context: () => context, commit: mutation => {
    commits++; if (fail) return { persisted: false, message: 'Quota refusé' };
    assert.equal(mutation.expectedRevision, ledger?.revision ?? 0); assert.ok(fuel - mutation.fuelDelta >= 0);
    ledger = JSON.parse(JSON.stringify(mutation.ledger)); fuel -= mutation.fuelDelta; return { persisted: true };
  } });
  return { context, transaction, get ledger() { return ledger; }, set ledger(value) { ledger = value; }, get fuel() { return fuel; }, get commits() { return commits; }, set fail(value) { fail = value; } };
}
test('campaign reservation requires real ownership, capacities, fuel, physical post and people; no defaults grant them', () => {
  for (const corrupt of [f => { f.context.hullProof = null; }, f => { f.context.hullProof.ownerSaveCreatedAt = 'foreign'; }, f => { f.context.physicalPost = null; },
    f => { f.context.boardedPersonIds = ['hunter']; }, f => { f.context.consentingPersonIds = ['hunter']; }, f => { f.context.securedCargoIds = []; }, f => { f.context.departureContext.capacity.persons = null; },
    f => { f.context.availableFuel = 0; f.context.departureContext.availableFuel = 0; }, f => { f.context.focused = false; }, f => { f.context.departureContext.chronicle = chronicle.createClanChronicle(); }]) {
    const f = fixture(); corrupt(f); assert.equal(f.transaction({ type: 'reserve' }).ok, false); assert.equal(f.ledger, undefined); assert.equal(f.fuel, 10); assert.equal(f.commits, 0);
  }
});
test('reservation and cancellation debit/credit once; failed persistence changes neither fuel nor checkpoint', () => {
  const f = fixture(); f.fail = true;
  assert.equal(f.transaction({ type: 'reserve' }).ok, false); assert.equal(f.fuel, 10); assert.equal(f.ledger, undefined);
  f.fail = false; assert.equal(f.transaction({ type: 'reserve' }).ok, true); assert.equal(f.fuel, 5);
  assert.equal(f.transaction({ type: 'reserve' }).changed, false); assert.equal(f.fuel, 5);
  f.fail = true; assert.equal(f.transaction({ type: 'cancel-before-movement' }).ok, false); assert.equal(f.fuel, 5); assert.equal(f.ledger.operations[0].phase, 'reserved');
  f.fail = false; assert.equal(f.transaction({ type: 'cancel-before-movement' }).ok, true); assert.equal(f.fuel, 10);
  assert.equal(f.transaction({ type: 'cancel-before-movement' }).changed, false); assert.equal(f.fuel, 10);
});
test('a played return persists actual wounds, death and borrowed items, without current rank/fuel gates or duplicate restoration', () => {
  const f = fixture(); assert.equal(f.transaction({ type: 'reserve' }).ok, true);
  const advance = action => { const r = f.transaction({ type: 'flight', action }); assert.equal(r.ok, true, r.message); };
  const berthing = () => {
    while (f.ledger.operations[0].flight.lateral) advance({ type: 'lateral', direction: f.ledger.operations[0].flight.lateral < 0 ? 1 : -1 });
    advance({ type: 'align' }); advance({ type: 'speed', direction: -1 }); advance({ type: 'speed', direction: -1 });
    while (f.ledger.operations[0].flight.distance) advance({ type: 'advance' });
    for (const a of [{ type: 'lock', index: 0 }, { type: 'lock', index: 1 }, { type: 'ring', direction: 1 }, { type: 'ring', direction: 1 }, { type: 'berth' }]) advance(a);
  };
  berthing(); assert.equal(f.transaction({ type: 'cancel-before-movement' }).ok, false);
  assert.equal(f.transaction({ type: 'flight', action: { type: 'return-route' } }).ok, false);
  f.context.observedReturn = { operationId: f.context.manifest.id, ownerSaveCreatedAt: owner, branchId: 'present', people: [{ id: 'hunter', condition: 'wounded' }, { id: 'medic', condition: 'dead' }],
    cargo: [{ id: 'loan-kit', disposition: 'returned-to-owner' }], witness: 'Actual authored mission return fixture' };
  f.context.departureContext.chronicle = chronicle.createClanChronicle(); f.context.availableFuel = 0; f.context.departureContext.availableFuel = 0;
  advance({ type: 'return-route' }); for (const [slot, node] of [route.destinationId, route.relayId, route.originId].entries()) advance({ type: 'route', slot, node });
  advance({ type: 'confirm-route' }); berthing();
  f.fail = true; const before = JSON.stringify(f.ledger); assert.equal(f.transaction({ type: 'consign-return' }).ok, false); assert.equal(JSON.stringify(f.ledger), before);
  f.fail = false; assert.equal(f.transaction({ type: 'consign-return' }).ok, true);
  assert.deepEqual(f.ledger.operations[0].returnReceipt, f.context.observedReturn); assert.equal(f.fuel, 5);
  assert.equal(f.transaction({ type: 'consign-return' }).changed, false); assert.equal(f.fuel, 5);
  assert.deepEqual(campaign.normalizeShipCampaignLedgerV87(JSON.parse(JSON.stringify(f.ledger)), owner), f.ledger);
});
test('future/foreign/invalid ledgers remain unchanged and a quota failure does not advance played movement', () => {
  const f = fixture(); assert.equal(f.transaction({ type: 'reserve' }).ok, true); f.fail = true;
  const before = JSON.stringify(f.ledger); assert.equal(f.transaction({ type: 'flight', action: { type: 'lateral', direction: -1 } }).ok, false); assert.equal(JSON.stringify(f.ledger), before);
  f.fail = false;
  for (const corrupt of [l => { l.version = 2; }, l => { l.ownerSaveCreatedAt = 'foreign'; }, l => { l.operations[0].flight.phase = 'returned'; }, l => { l.operations[0].reservedFuel = 999; }, l => { l.revision = 999; }]) {
    const l = JSON.parse(before); corrupt(l); f.ledger = l; const bytes = JSON.stringify(l);
    assert.equal(f.transaction({ type: 'reserve' }).ok, false); assert.equal(JSON.stringify(f.ledger), bytes); assert.equal(f.fuel, 5);
  }
});

test('a synchronous reentrant storage callback cannot reserve twice or debit the same budget twice', () => {
  const f = fixture(); let ledger, fuel = 10, nested, transaction;
  transaction = campaign.createShipCampaignTransactionV87({read:()=>ledger,context:()=>f.context,commit:mutation=>{
    nested=transaction({type:'reserve'}); assert.equal(nested.ok,false); assert.match(nested.message,/déjà en cours/);
    assert.equal(mutation.expectedRevision,0);ledger=JSON.parse(JSON.stringify(mutation.ledger));fuel-=mutation.fuelDelta;return{persisted:true};
  }});
  assert.equal(transaction({type:'reserve'}).ok,true);assert.equal(fuel,5);assert.equal(ledger.operations.length,1);
  assert.equal(transaction({type:'reserve'}).changed,false);assert.equal(fuel,5);
});

test('after reservation the route and manifest remain frozen; changing the live proposal cannot rewrite committed cargo',()=>{
  const f=fixture();assert.equal(f.transaction({type:'reserve'}).ok,true);
  const snapshot=JSON.stringify(f.ledger.operations[0].departure);
  f.context.manifest.cargo[0].name='Changed display';f.context.route={...route,relayId:'changed-live-route'};
  assert.equal(f.transaction({type:'flight',action:{type:'lateral',direction:-1}}).ok,true);
  assert.equal(JSON.stringify(f.ledger.operations[0].departure),snapshot);assert.deepEqual(f.ledger.operations[0].route,route);
  f.context.manifest.shipId='wolf-ship'; const before=JSON.stringify(f.ledger);
  assert.equal(f.transaction({type:'flight',action:{type:'lateral',direction:-1}}).ok,false);assert.equal(JSON.stringify(f.ledger),before);
});

test('the actual paused flight UI exposes its pause status and natively disables movement, route selection and restart',()=>{
  const qa=homeworldSceneSsrV78(),component='app/game/ShipFlightDrillV87.tsx';
  const props={ownerSaveCreatedAt:owner,shipId:'classic-predator-spaceship',suspended:true};
  const practiceHtml=qa.render(component,props);
  assert.match(practiceHtml,/role="status"[^>]*>Commandes suspendues\./);
  assert.match(practiceHtml,/<div[^>]*role="group"[^>]*aria-disabled="true"/);
  assert.doesNotMatch(practiceHtml,/<section[^>]*inert/);
  const practiceButtons=[...practiceHtml.matchAll(/<button\b[^>]*>/g)];assert.equal(practiceButtons.length,4);
  for(const button of practiceButtons)assert.match(button[0],/disabled=""/);
  let state=berth(flight.createShipFlightV87(owner,'paused-return-ui'));state=operate(state,{type:'return-route'});
  const checkpoint=JSON.stringify(state),controlled={state,route,onAction:()=>{throw Error('SSR must not execute an action');}};
  const pausedHtml=qa.render(component,{...props,controlled});
  const selects=[...pausedHtml.matchAll(/<select\b[^>]*>/g)];assert.equal(selects.length,3);
  for(const select of selects)assert.match(select[0],/disabled=""/);
  for(const button of pausedHtml.matchAll(/<button\b[^>]*>/g))assert.match(button[0],/disabled=""/);
  const resumedHtml=qa.render(component,{...props,suspended:false,controlled});
  assert.doesNotMatch(resumedHtml,/Commandes suspendues/);
  for(const button of resumedHtml.matchAll(/<button\b[^>]*>/g))assert.doesNotMatch(button[0],/disabled=/);
  assert.equal(JSON.stringify(state),checkpoint);
});

const keyboardInput=key=>({key,open:true,paused:false,checkpointValid:true,documentFocused:true,documentVisible:true,consoleFocused:true,
  targetIsConsole:true,repeat:false,modified:false,defaultPrevented:false});
test('focused-console keyboard mappings play exactly one source gesture for each phase without mutating the checkpoint',()=>{
  const mappings=[
    ['alignment','ArrowLeft',{type:'lateral',direction:-1}],['alignment','ArrowRight',{type:'lateral',direction:1}],['alignment','Enter',{type:'align'}],
    ['approach','ArrowUp',{type:'speed',direction:1}],['approach','ArrowDown',{type:'speed',direction:-1}],['approach','Enter',{type:'advance'}],['approach','r',{type:'retreat'}],
    ['locks','1',{type:'lock',index:0}],['locks','2',{type:'lock',index:1}],['locks','ArrowUp',{type:'ring',direction:1}],['locks','ArrowDown',{type:'ring',direction:-1}],['locks','Enter',{type:'berth'}],
    ['berthed','Enter',{type:'return-route'}],['return-route','Enter',{type:'confirm-route'}],
    ['return-alignment','Enter',{type:'align'}],['return-approach','R',{type:'retreat'}],['return-locks','2',{type:'lock',index:1}],
  ];
  for(const[phase,key,action]of mappings)assert.deepEqual(flight.resolveShipFlightKeyboardV87(phase,keyboardInput(key)),action);
  for(const[phase,key]of[['alignment','1'],['locks','r'],['return-route','ArrowLeft'],['return-route','ArrowDown'],['returned','Enter'],['approach','Tab'],['alignment',' ']])
    assert.equal(flight.resolveShipFlightKeyboardV87(phase,keyboardInput(key)),null);
  const state=flight.createShipFlightV87(owner,'keyboard-one'),before=JSON.stringify(state);
  const action=flight.resolveShipFlightKeyboardV87(state.phase,keyboardInput('ArrowLeft'));
  assert.equal(JSON.stringify(state),before);const result=flight.stepShipFlightV87(state,action,route);
  assert.equal(result.state.lateral,2);assert.equal(result.state.revision,1);assert.equal(JSON.stringify(state),before);
});

test('closed, paused, blurred, hidden, repeated, modified and native-control keys never become flight gestures',()=>{
  for(const[flag,value]of[['open',false],['paused',true],['checkpointValid',false],['documentFocused',false],['documentVisible',false],
    ['consoleFocused',false],['targetIsConsole',false],['repeat',true],['modified',true],['defaultPrevented',true]]){
    const input={...keyboardInput('Enter'),[flag]:value};
    for(const phase of['alignment','approach','locks','berthed','return-route','return-alignment','return-approach','return-locks'])
      assert.equal(flight.resolveShipFlightKeyboardV87(phase,input),null,`${phase}: ${flag}`);
  }
  // A select uses its arrows and a native button uses Enter/click itself. The
  // console helper returns no parallel gesture, even on a phase that maps it.
  assert.equal(flight.resolveShipFlightKeyboardV87('approach',{...keyboardInput('ArrowUp'),targetIsConsole:false}),null);
  assert.equal(flight.resolveShipFlightKeyboardV87('locks',{...keyboardInput('Enter'),targetIsConsole:false}),null);
});

test('the actual console exposes focus and phase-specific keyboard help while pause removes it from the tab order',()=>{
  const qa=homeworldSceneSsrV78(),component='app/game/ShipFlightDrillV87.tsx',props={ownerSaveCreatedAt:owner,shipId:'classic-predator-spaceship'};
  const active=qa.render(component,props);
  assert.match(active,/<div[^>]*role="group"[^>]*tabindex="0"[^>]*aria-describedby="ship-flight-help-/);
  assert.match(active,/Entrée maintenir l’alignement/);
  const paused=qa.render(component,{...props,suspended:true});
  assert.match(paused,/<div[^>]*role="group"[^>]*tabindex="-1"[^>]*aria-disabled="true"/);
});
