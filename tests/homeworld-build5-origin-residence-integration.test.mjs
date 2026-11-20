import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { homeworldSceneSsrV78 } from "./helpers/homeworld-scene-ssr-v78.mjs";

const qa = homeworldSceneSsrV78();
const api = Object.assign({}, ...[
  "clanChronicle", "honorTribunalV147", "homeworldContractsV68", "homeworldRegionsV68",
  "minorArcsV160", "originsV151", "residenceV149", "residenceLifeV150",
].map(name => qa.load("app/game/systems/" + name + ".ts")), qa.load("app/game/save.ts"));

const source = readFileSync(new URL("../app/game/GameClient.tsx", import.meta.url), "utf8");
const tree = ts.createSourceFile("GameClient.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const handlers = [
  "persistSocialProgress", "settleResidenceLifeForRegionV150", "checkpointHomeworldRegionV68",
  "fieldHomeworldRegionV68", "residenceActionV149", "residenceLifeActionV150", "originActionV151",
];
const bodies = new Map();
function collect(node) {
  if (ts.isVariableDeclaration(node) && handlers.includes(node.name.getText(tree))) {
    assert(ts.isCallExpression(node.initializer));
    const implementation = node.initializer.arguments[0].getText(tree);
    bodies.set(node.name.getText(tree), ts.transpileModule("return (" + implementation + ");", {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
    }).outputText);
  }
  ts.forEachChild(node, collect);
}
collect(tree);

const REGION = "luminous-marshes";
const FIRST = "HOME-CM07";
const NEXT = "HOME-CM08";
const OWNER = "2026-11-20T12:00:00.000Z";
const KEY = "build5-origin-residence";
const lamp = api.CM07_LAMP_ID_V149;
const container = api.TRAVEL_CONTAINER_ID_V149;

function fixture(originId) {
  const values = new Map(), trace = [];
  let quota = false, run = 0;
  const storage = {
    getItem: key => values.get(key) ?? null,
    removeItem: key => values.delete(key),
    setItem(key, value) {
      if (key === KEY && quota) throw new DOMException("QA quota", "QuotaExceededError");
      values.set(key, value);
    },
  };
  const seed = api.defaultSave(OWNER);
  seed.profile.honor = api.RANK_THRESHOLDS.blooded;
  seed.originV151 = api.createOriginV151(originId);
  const initial = api.writeSaveWithStatus(seed, storage, KEY);
  assert.equal(initial.persisted, true);
  assert.equal(initial.save.profile.rankId, "blooded");

  const env = {
    ...api, entry: { ownerCreatedAt: OWNER }, sessionAliveRef: { current: true },
    saveRef: { current: initial.save }, pendingSocialWriteRef: { current: null },
    pendingTrophyCommitRef: { current: null }, pendingTerminalRunRef: { current: null },
    activeHuntSessionRef: { current: null }, setSaveFailure() {},
    setSave: () => trace.push(["publish"]),
    setToast: message => trace.push(["notice", message]),
    writeSaveWithStatus: save => api.writeSaveWithStatus(save, storage, KEY),
    reconcileSaveWrite: (attempt, owner) => api.reconcileSaveWrite(attempt, owner, storage, KEY),
  };
  for (const name of handlers) {
    assert(bodies.has(name), name);
    env[name] = new Function(...Object.keys(env), bodies.get(name))(...Object.values(env));
  }
  const current = () => env.saveRef.current;
  const region = () => current().homeworldRegionV68;
  function install(state) {
    assert(api.normalizeHomeworldRegionV68(state));
    assert.equal(env.persistSocialProgress({ homeworldRegionV68: state }), true);
  }

  // These legal approach checkpoints stand in for the intervening walks. The
  // callbacks still check the saved locality, region run, physics and proofs.
  function house(houseId) {
    const state = region() ?? api.createHomeworldRegionV68(REGION, "initial", true);
    const buildingId = api.houseBuildingIdV149(api.houseV149(houseId));
    install({
      ...state, zone: "interior", buildingId,
      visitedBuildings: [...new Set([...state.visitedBuildings, buildingId])],
      actor: { ...state.actor, ...api.HOMEWORLD_REGION_INTERIOR_V68.entry, vx: 0, vy: 0 },
    });
  }
  function beginField() {
    const state = api.createHomeworldRegionV68(REGION, "threshold-" + ++run, true);
    // Start after the agreed three trace inspections and a weather evasion.
    // Neither the balises, cache, report nor residence progress is seeded.
    install({
      ...state, tick: 7200, walked: 12000, greeted: ["guide"], evaded: 1,
      traces: api.HOMEWORLD_REGION_TRACES_V68.map(trace => trace.id),
    });
  }
  function prepareInteraction(id, target, phase, expected) {
    const previous = region();
    const cycle = api.HOMEWORLD_REGION_HAZARD_V68;
    const period = cycle.warningTicks + cycle.activeTicks + cycle.calmTicks;
    const tick = previous.tick + period * 20 + (phase - previous.tick % period + period) % period;
    const base = { ...previous, tick, walked: previous.walked + 7000 };
    const offsets = [0, 35, 55, 75, 95];
    let near;
    for (const y of offsets.flatMap(delta => delta ? [delta, -delta] : [0])) {
      for (const x of offsets.flatMap(delta => delta ? [delta, -delta] : [0])) {
        const state = { ...base, actor: { ...base.actor, x: target.x + x, y: target.y + y, vx: 0, vy: 0 } };
        const distanceToFauna = Math.hypot(state.actor.x - state.fauna.x, state.actor.y - state.fauna.y);
        const canObserve = expected !== "track" || (distanceToFauna >= 210 && distanceToFauna <= 550);
        if (canObserve && api.normalizeHomeworldRegionV68(state) && api.homeworldRegionInteractionV68(state)?.id === id) {
          near = state;
          break;
        }
      }
      if (near) break;
    }
    assert(near, "A valid approach to " + id);
    assert.equal(env.checkpointHomeworldRegionV68(near), true);
    let next = near;
    if (expected === "track") {
      // The fauna interaction owns the approach to the cache until it has
      // recorded a real quiet observation. Let the runtime accumulate it.
      for (let tick = 0; tick < 90; tick++) next = api.stepHomeworldRegionV68(next);
      assert(next.observedTicks >= 90);
    }
    next = api.stepHomeworldRegionV68(next, { interact: true });
    assert.equal(next.pendingFieldEvent?.action ?? null, expected, id);
    assert(api.canAdvanceHomeworldRegionV68(near, next), id);
    return next;
  }
  function issue(id, target, phase, event) {
    const next = prepareInteraction(id, target, phase, event);
    if (event) assert.equal(env.fieldHomeworldRegionV68(next.pendingFieldEvent, next), true);
    else assert.equal(env.checkpointHomeworldRegionV68(next), true);
  }
  const guide = api.HOMEWORLD_REGIONS_V68[REGION].residents.find(resident => resident.id === "guide");
  function huntToCache({ prematureReport = false } = {}) {
    beginField();
    const fauna = region().fauna;
    issue("fauna", { x: fauna.x + 300, y: fauna.y }, 165, "track");
    const [first, second] = api.REGION_WARD_POSTS_V68;
    issue(first.id, first, 5, null);
    issue(second.id, second, 5, "ward");
    if (prematureReport) {
      issue(guide.id, guide, 35, "report");
      assert.equal(current().residenceV149.missions[FIRST].status, "active");
    }
    issue("cache", { x: 7720, y: 2220 }, 165, "recover");
  }
  const report = () => prepareInteraction(guide.id, guide, 35, "report");
  function sortie() {
    huntToCache();
    const proof = report();
    assert.equal(env.fieldHomeworldRegionV68(proof.pendingFieldEvent, proof), true);
  }
  const actHouse = (houseId, action) => env.residenceActionV149(houseId, action);
  const actOrigin = action => env.originActionV151(action);
  const reload = () => {
    const loaded = api.loadSave(storage, KEY);
    assert.equal(loaded.createdAt, OWNER);
    env.saveRef.current = loaded;
    return loaded;
  };
  return { env, current, house, huntToCache, report, sortie, actHouse, actOrigin, reload, trace,
    setQuota: value => { quota = value; }, bytes: () => values.get(KEY) };
}

function performed(result) {
  assert.equal(result.ok, true, result.message);
  return result.message;
}

function context(f, houseId) {
  return { atHouseId: houseId, rankId: f.current().profile.rankId,
    regionAllowed: regionId => api.canEnterHomeworldRegionV68(f.current(), regionId).allowed };
}

function panelProps(f, houseId) {
  return { house: api.houseV149(houseId), residence: f.current().residenceV149,
    origin: f.current().originV151, disabled: false, ...context(f, houseId),
    onAction: () => assert.fail("SSR must not perform an action") };
}

test("BUILD5-05: two origins play the same residence milestone and reload distinct reactions and relations", () => {
  function play(originId) {
    const f = fixture(originId);
    f.house(FIRST);
    performed(f.actHouse(FIRST, { kind: "accept" }));
    f.sortie();
    f.house(FIRST);
    performed(f.actHouse(FIRST, { kind: "route", choice: 0 }));
    f.sortie();
    f.house(FIRST);
    performed(f.actHouse(FIRST, { kind: "activate" }));

    const before = structuredClone(f.current());
    const html = qa.render("app/game/OriginTransitionPanelV151.tsx", panelProps(f, FIRST));
    assert(html.includes('data-origin-transition-v151="STORY5-TR-' + originId + '-01"'));
    assert.equal(f.actOrigin({ kind: "choose", choice: 0 }).ok, false);
    for (const index of [0, 1, 2]) performed(f.actOrigin({ kind: "step", index }));
    const reaction = performed(f.actOrigin({ kind: "choose", choice: 0 }));
    const bytes = f.bytes();
    assert.equal(f.actOrigin({ kind: "choose", choice: 1 }).ok, false);
    assert.equal(f.bytes(), bytes);

    const reloaded = f.reload();
    for (const key of ["profile", "prologue", "inventory", "loadout", "homeworld", "residenceV149"]) {
      assert.deepEqual(reloaded[key], before[key], key);
    }
    const resolvedHtml = qa.render("app/game/OriginTransitionPanelV151.tsx", panelProps(f, FIRST));
    assert.match(resolvedHtml, /data-origin-resolved="(?:success|resolved)"/);
    return { reaction, html, before, origin: reloaded.originV151 };
  }

  const o1 = play("O1"), o5 = play("O5");
  assert.notEqual(o1.html, o5.html);
  assert.notEqual(o1.reaction, o5.reaction);
  assert.deepEqual(o1.before.profile, o5.before.profile);
  assert.deepEqual(o1.before.residenceV149, o5.before.residenceV149);
  assert.deepEqual(o1.origin.relations["O1:dhera"],
    { name: "Dhera", presence: "awaited", transitionId: "STORY5-TR-O1-01", choice: 0 });
  assert.equal(o5.origin.relations["O5:mara"].presence, "absent");
  assert.equal(o1.origin.transitions["STORY5-TR-O1-01"].success, true);
  assert.equal(o5.origin.transitions["STORY5-TR-O5-01"].success, false);
});

test("BUILD5-07 / QA5-05: a confirmed threshold mission opens three rooms and moves one original across reload", () => {
  const f = fixture("O1");
  const requirements = api.houseV149(FIRST).respect;
  assert.deepEqual(requirements, { inhabit: 40, furnish: 60, receive: 80 });
  f.house(FIRST);
  performed(f.actHouse(FIRST, { kind: "accept" }));
  f.house(NEXT);
  performed(f.actHouse(NEXT, { kind: "accept" }));
  f.huntToCache({ prematureReport: true });
  assert.equal(f.current().residenceV149.missions[FIRST].status, "active");
  assert.equal(f.current().residenceV149.objects.some(object => object.id === lamp), false);
  const proof = f.report();
  const before = f.bytes();
  f.trace.length = 0;
  f.setQuota(true);
  assert.equal(f.env.fieldHomeworldRegionV68(proof.pendingFieldEvent, proof), false);
  assert.equal(f.bytes(), before);
  assert.equal(f.current().residenceV149.missions[FIRST].status, "active");
  assert(f.trace.every(entry => entry[0] !== "publish" && !entry[1]?.includes("Mission de seuil vérifiée")));
  f.setQuota(false);
  assert.equal(f.env.fieldHomeworldRegionV68(proof.pendingFieldEvent, proof), true);
  assert.deepEqual(f.trace.slice(-2).map(entry => entry[0]), ["publish", "notice"]);
  assert.equal(f.current().residenceV149.objects.filter(object => object.id === lamp).length, 1);

  f.house(FIRST);
  performed(f.actHouse(FIRST, { kind: "route", choice: 0 }));
  assert.equal(f.actHouse(FIRST, { kind: "activate" }).ok, false);
  f.sortie();
  f.house(FIRST);
  performed(f.actHouse(FIRST, { kind: "activate" }));
  const html = qa.render("app/game/ResidencePanelV149.tsx", panelProps(f, FIRST));
  for (const room of api.roomsForHouseV149(FIRST)) assert(html.includes(room.title), room.title);
  assert.match(html, /data-residence-room="HOME-CM07-P1"/);

  performed(f.actHouse(FIRST, { kind: "place", objectId: container, slotId: "memory-1" }));
  performed(f.actHouse(FIRST, { kind: "place", objectId: lamp, slotId: "arrival" }));
  performed(f.actHouse(FIRST, { kind: "bed", position: 1 }));
  performed(f.actHouse(FIRST, { kind: "place", objectId: lamp, slotId: "bench" }));
  assert.equal(f.actHouse(FIRST, { kind: "place", objectId: lamp, slotId: "display" }).ok, false);
  // Four proofs per outing (including observation) contribute 20 respect.
  f.sortie();
  f.house(FIRST);
  performed(f.actHouse(FIRST, { kind: "place", objectId: lamp, slotId: "display" }));
  assert.equal(api.residenceAccessV149(f.current().residenceV149, FIRST, context(f, FIRST)).receive, false);
  f.sortie();
  f.house(FIRST);
  assert.equal(api.residenceAccessV149(f.current().residenceV149, FIRST, context(f, FIRST)).receive, true);

  f.house(NEXT);
  performed(f.actHouse(NEXT, { kind: "route", choice: 0 }));
  f.house(FIRST);
  performed(f.actHouse(FIRST, { kind: "start-transfer", toHouseId: NEXT }));
  performed(f.actHouse(FIRST, { kind: "pack", objectId: lamp }));
  performed(f.actHouse(FIRST, { kind: "depart" }));
  const travelling = f.reload();
  const imported = api.parseSaveImport(api.exportSave(travelling));
  assert.equal(imported.failure, null);
  assert.deepEqual(imported.save.residenceV149, travelling.residenceV149);
  assert.equal(travelling.residenceV149.activeResidenceId, FIRST);
  assert.equal(travelling.residenceV149.bed[FIRST], 1);
  assert.deepEqual(travelling.residenceV149.objects.filter(object => object.id === lamp).map(object => object.location),
    [{ kind: "transfer", returnTo: { houseId: FIRST, slotId: "display" } }]);
  assert.equal(f.actHouse(FIRST, { kind: "arrive" }).ok, false);
  f.house(NEXT);
  performed(f.actHouse(NEXT, { kind: "arrive" }));
  const settled = f.reload().residenceV149;
  assert.equal(settled.activeResidenceId, NEXT);
  assert.equal(settled.transfer, null);
  assert.deepEqual([...settled.rights].sort(), [FIRST, NEXT]);
  assert.deepEqual(settled.objects.filter(object => object.id === lamp).map(object => object.location),
    [{ kind: "room", houseId: NEXT, slotId: "arrival" }]);
  assert.equal(f.actHouse(NEXT, { kind: "arrive" }).ok, false);
});

test("a report follows the visible guide's saved visit and rejects a forged old-post receipt", () => {
  const f = fixture("O1");
  f.house(FIRST);
  performed(f.actHouse(FIRST, { kind: "accept" }));
  f.sortie();
  f.house(FIRST);
  performed(f.actHouse(FIRST, { kind: "route", choice: 0 }));
  f.sortie();
  f.house(FIRST);
  performed(f.actHouse(FIRST, { kind: "activate" }));
  f.huntToCache();
  f.house(FIRST);
  performed(f.env.residenceLifeActionV150({ kind: "invite", guestId: "guide" }));

  // The normal threshold exit starts the visit in the persisted ledger.
  const interior = f.current().homeworldRegionV68;
  const outside = api.stepHomeworldRegionV68(interior, { interact: true });
  assert.equal(outside.zone, "village");
  assert(f.env.checkpointHomeworldRegionV68(outside));
  const committedVisit = f.current().residenceLifeV150.visits.find(visit => visit.guestId === "guide");
  assert.equal(committedVisit.stage, "under-way");
  const route = api.guestRouteV150(FIRST, "guide");
  const travelTicks = Math.floor(api.routeLengthV150(route) / api.GUEST_SPEED_V150 * 60);
  const savedLife = f.reload().residenceLifeV150;
  const guestsAt = state => api.guestsInSceneV150(savedLife, state);
  const fixedGuide = api.HOMEWORLD_REGIONS_V68[REGION].residents.find(resident => resident.id === "guide");
  const anchor = f.current().homeworldRegionV68;

  function approaches(tick, wanted) {
    const candidates = [];
    for (const dy of [0, 45, 65, 90, -45, -65, -90]) {
      for (const dx of [0, 45, 65, 90, -45, -65, -90]) {
        const x = wanted.x + dx, y = wanted.y + dy;
        const state = { ...anchor, tick, walked: anchor.walked + Math.hypot(x - anchor.actor.x, y - anchor.actor.y),
          actor: { ...anchor.actor, x, y } };
        if (api.canAdvanceHomeworldRegionV68(anchor, state)) candidates.push(state);
      }
    }
    return candidates;
  }
  let actualProof, obsoleteProof, visible;
  for (let tick = anchor.tick + Math.ceil(travelTicks / 2); tick < anchor.tick + travelTicks - 1; tick += 20) {
    const guest = guestsAt({ ...anchor, tick }).find(item => item.residentId === "guide");
    if (!guest || guest.inside || Math.hypot(guest.x - fixedGuide.x, guest.y - fixedGuide.y) <= 315) continue;
    actualProof = approaches(tick, guest).map(state => api.stepHomeworldRegionV68(state, { interact: true }, false, guestsAt))
      .find(next => next.pendingFieldEvent?.action === "report" && !api.normalizeRegionFieldEventV68(next.pendingFieldEvent));
    if (!actualProof) continue;
    obsoleteProof = approaches(tick, fixedGuide).map(state => api.stepHomeworldRegionV68(state, { interact: true }))
      .find(next => next.pendingFieldEvent?.action === "report" && api.normalizeRegionFieldEventV68(next.pendingFieldEvent));
    if (!obsoleteProof) continue;
    visible = guestsAt(actualProof).find(item => item.residentId === "guide");
    break;
  }
  assert(actualProof && obsoleteProof && visible, "Select reachable walking and fixed-post checkpoints");
  assert(api.normalizeHomeworldRegionV68(actualProof, visible));
  assert(api.normalizeHomeworldRegionV68(obsoleteProof), "Legacy fixed-post reports keep their original format");
  const before = f.bytes();
  assert.equal(f.env.fieldHomeworldRegionV68(obsoleteProof.pendingFieldEvent, obsoleteProof), false);
  assert.equal(f.bytes(), before);
  assert.equal(f.env.fieldHomeworldRegionV68(actualProof.pendingFieldEvent, actualProof), true);
  const reloaded = f.reload().homeworldRegionV68;
  assert.equal(reloaded.pendingFieldEvent, null);
  assert(reloaded.eventReceipts.includes("report"));
  assert.deepEqual(reloaded.actor, actualProof.actor);
});
