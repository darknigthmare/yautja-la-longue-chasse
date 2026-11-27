/** Checks a native M029 route after the declared M023 admission fixture. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright-core";
import { homeworldQaModelV64 } from "./homeworld-qa-model-v64.mjs";
import { homeworldNavigatorV77 } from "./homeworld-navigation-browser-v77.mjs";
import { bloodedTempleAdmissionV174, qa } from "../tests/helpers/blooded-temple-fixture-v174.mjs";
import { playShipAcquisitionV161 } from "../tests/helpers/ship-receipt-v161.mjs";
import { createCradleReturnRoute } from "../tests/helpers/buried-cradle-return-route.mjs";


const url = process.env.YAUTJA_M029_QA_URL ?? "http://127.0.0.1:4398";
const qaOrigin = new URL(url);
assert.ok(["127.0.0.1", "localhost"].includes(qaOrigin.hostname) || 
  qaOrigin.origin === "https://yautja-la-longue-chasse.vercel.app");
const output = process.env.YAUTJA_M029_QA_OUTPUT ?? "outputs/qa-bible-m029";
await mkdir(output, { recursive: true });
const bootstrap = await build({ stdin: {
  contents: [
    "import * as saves from './app/game/save';",
    "import * as slots from './app/game/systems/campaignSlots';",
    "globalThis.__m029Fixture = { ...saves, ...slots };",
  ].join("\n"),
  resolveDir: process.cwd(),
}, bundle: true, write: false, format: "iife", platform: "browser", logLevel: "silent" });
const temple = qa.load("app/game/systems/bloodedTempleV174.ts");
const saves = qa.load("app/game/save.ts");
const chronicles = qa.load("app/game/systems/clanChronicle.ts");
const cradle = qa.load("app/game/systems/buriedCradle.ts");
const cradleCampaign = qa.load("app/game/systems/buriedCradleCampaign.ts");
const { snapshotBuriedCradleRun } = qa.load("app/game/systems/buriedCradleSnapshot.ts");
const coordination = qa.load("app/game/systems/homeworldCoordinationM028.ts");
const world = qa.load("app/game/systems/homeworldWorldV77.ts");
const geometry = qa.load("app/game/systems/homeworldGeometryV64.ts");
const rooms = qa.load("app/game/systems/homeworldInteriorsV64.ts");

function prepareAdmission() {
  let save = bloodedTempleAdmissionV174();
  const data = new Map();
  const disk = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
  const initial = saves.replaceSaveWithStatus(save, disk);
  assert.ok(initial.persisted, initial.failure);
  save = initial.save;
  const checked = (stage) => {
    const imported = saves.parseSaveImport(JSON.stringify(save));
    assert.ok(imported.save, stage + ": " + imported.failure);
    console.log("M029 admission verified " + stage);
    save = imported.save;
  };
  let time = Date.parse(save.createdAt) + 86400000;
  const play = action => {
    const result = temple.advanceBloodedTempleV174(save, { action, expectedRevision: save.bloodedTempleV174?.events.length ?? 0 }, time += 100);
    assert.ok(result.ok, result.notice + " while " + JSON.stringify(action));
    const stored = saves.writeSaveWithStatus({ ...save, ...result.update }, disk);
    assert.ok(stored.persisted, "Temple " + JSON.stringify(action) + ": " + stored.failure);
    save = stored.save;
  };
  play("present");
  for (const [index, room] of temple.BLOODED_ROOMS.entries()) {
    if (room.lane) play("lane");
    play("right"); play("right"); play("interact");
    if (index === 0) { play("interact"); play("lane"); }
    play("right");
    if ("hunter" in room) { play("guard"); play("strike"); play("guard"); play("strike"); }
    if (index === 4) play("interact");
    play("right"); play("right"); play("next");
  }
  for (let repetition = 0; repetition < 2; repetition++) {
    for (const mark of [0, 1, 4, 7]) play({ mark });
    play("seal-mark");
  }
  play("return-tools");
  assert.equal(chronicles.getChronicleRank(save.prologue.chronicle), "blooded");
  save.profile.honor = 3000;
  save.settings.masterVolume = 0;
  checked("Blooded and honor");
  const ship = "classic-predator-spaceship";
  save = playShipAcquisitionV161(qa, save);
  checked("ship");
  const context = { personalShipId: ship, ownedShipIds: [ship] };
  for (const mission of qa.load("app/game/data.ts").MISSIONS) {
    Object.assign(save.missionProgress[mission.id], { status: "completed", attempts: 1, completions: 1 });
  }
  checked("hunt proceedings");
  const apply = action => {
    const result = cradleCampaign.actBuriedCradleCampaign(save, action, context);
    assert.ok(result.accepted, result.message);
    save = { ...save, buriedCradle: result.state, prologue: result.prologue };
  };
  apply({ type: "prepare" });
  apply({ type: "depart" });
  let run = cradle.createBuriedCradleRun(cradle.createBuriedCradleProgress(), 1);
  run.player.x = 156;
  run.player.y = 508;
  run = cradle.stepBuriedCradle(run, { interactPressed: true }, 1 / 60).run;
  assert.ok(run.extracted);
  apply({ type: "extract", progress: run.progress, snapshot: snapshotBuriedCradleRun(run) });
  checked("extract cradle");
  save = createCradleReturnRoute(qa).complete(save, context);
  checked("cradle report");
  const dock = { ...coordination.COORDINATION_OFFICER_M028, actor: { x: 1, y: 1 }, suspended: false };
  const workshop = { roomId: coordination.COORDINATION_WORKSHOP_M028.roomId, pointId: null,
    actor: coordination.COORDINATION_WORKSHOP_M028.position, suspended: false };
  for (const action of [{ kind: "begin", role: "field" }, { kind: "dispatch" }, { kind: "clear" }, { kind: "signal" }, { kind: "recall" }]) {
    const result = coordination.actHomeworldCoordinationM028(save.homeworld.coordinationM028, save, action, action.kind === "clear" ? workshop : dock);
    assert.ok(result.state, result.message);
    save.homeworld.coordinationM028 = result.state;
  }
  const hall = world.HOMEWORLD_BUILDINGS_V77.find(building => building.id === "training-hall");
  save.homeworld.locationV77 = { version: 1, layoutRevision: 1, ownerCreatedAt: save.createdAt, levelId: hall.levelId,
    exterior: geometry.homeworldBuildingDoorwayV64(hall).approach,
    interiorId: hall.id, local: rooms.homeworldInteriorForBuildingV64(hall.id).spawn };
  checked("coordination and location");
  return save;
}
function prepareReportedAudience(save) {
  const pack = qa.load("app/game/systems/homeworldPackTrialM029.ts");
  const appointment = qa.load("app/game/systems/homeworldAdjutantM029.ts");
  const view = () => pack.homeworldPackViewM029(save.homeworld.packTrialM029, save.createdAt);
  const playPack = action => {
    const result = pack.actHomeworldPackTrialM029(save.homeworld.packTrialM029, save, action, {
      ...pack.PACK_POST_M029, suspended: false
    });
    assert.ok(result.state, result.message);
    save.homeworld.packTrialM029 = result.state;
  };
  const walk = (target, direction) => {
    while (view().player !== target) playPack(pack.homeworldPackActionsM029(view()).includes(direction) ? direction : "regroup");
    while (view().pupils.some(position => position !== target)) playPack("regroup");
  };
  playPack("start"); walk(6, "east"); playPack("shelter"); walk(16, "east"); playPack("turn");
  walk(12, "west"); playPack("shelter"); walk(0, "west"); playPack("count");
  for (const [action, post, actor] of [
    ["study", appointment.ADJUTANT_DOCK_M029, { x: 0, y: 0 }],
    ["place-relay", { roomId: appointment.ADJUTANT_RELAY_M029.roomId, pointId: null }, appointment.ADJUTANT_RELAY_M029.position],
    ["confirm-signal", appointment.ADJUTANT_SAS_M029, { x: 0, y: 0 }],
  ]) {
    const result = appointment.actHomeworldAdjutantM029(save.homeworld.adjutantM029, save, action, { ...post, actor, suspended: false });
    assert.ok(result.state, result.message);
    save.homeworld.adjutantM029 = result.state;
  }
  const audience = world.HOMEWORLD_BUILDINGS_V77.find(building => building.id === appointment.ADJUTANT_LEADER_M029.roomId);
  save.homeworld.locationV77 = { version: 1, layoutRevision: 1, ownerCreatedAt: save.createdAt, levelId: audience.levelId,
    exterior: geometry.homeworldBuildingDoorwayV64(audience).approach,
    interiorId: audience.id, local: rooms.homeworldInteriorForBuildingV64(audience.id).spawn };
  const imported = saves.parseSaveImport(JSON.stringify(save));
  assert.ok(imported.save, imported.failure);
  assert.deepEqual(chronicles.getChronicleFunctions(imported.save.prologue.chronicle), []);
  return imported.save;
}

const audienceOnly = process.env.M029_FULL_BROWSER !== "1";
const admitted = prepareAdmission();
const seed = audienceOnly ? prepareReportedAudience(admitted) : admitted;
if (process.env.M029_ADMISSION_ONLY === "1") process.exit(0);
const api = homeworldQaModelV64(process.cwd(), [
  "homeworldWorldV77.ts", "homeworldNavigationV77.ts", "homeworldNavigationV109.ts", "homeworldGeometryV64.ts", "homeworldInteriorsV64.ts",
]);
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
page.setDefaultTimeout(120000);
const report = { passed: false, url, commit: process.env.GITHUB_SHA ?? null, deployedCommit: process.env.YAUTJA_M029_DEPLOYED_COMMIT ?? null, checks: [], routes: [], captures: [], pageErrors: [], httpErrors: [],
  fixture: "Full V66–90 and Quatza follow reducers; six temple rooms and paired marks record Blooded. Honour, hunts and earlier Berceau/M028 are a declared fixture constructed by their actions. Spawn at the native practice room; no pack actions are injected." };
page.on("pageerror", error => report.pageErrors.push(String(error)));
page.on("response", response => {
  if (response.status() >= 400) report.httpErrors.push({ status: response.status(), url: response.url() });
});


const capture = async file => {
  await page.screenshot({ path: join(output, file) });
  report.captures.push(file);
};
const disk = () => page.evaluate(() => JSON.parse(localStorage.getItem("yautja-long-hunt.save")));
let nav;
let indoorNav;
async function walkNativeTo(room, description, reached, settled = reached) {
  assert.ok(room, description);
  if (await nav.room() !== room.buildingId) await nav.enter(room.buildingId);
  else await nav.closeDialog();

  const start = await indoorNav.position();
  const successors = [[0, -8], [8, 0], [-8, 0], [0, 8]];
  const keyFor = point => point.x + "," + point.y;
  const walkable = point => api.isHomeworldInteriorWalkableV64(room, point, { halfWidth: 26, halfDepth: 16 });
  const queue = [start];
  const visited = new Map([[keyFor(start), null]]);
  let goal = null;
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    if (reached(current)) {
      goal = current;
      break;
    }
    for (const [dx, dy] of successors) {
      const next = { x: current.x + dx, y: current.y + dy };
      if (visited.has(keyFor(next)) || !walkable(next) ||
          !walkable({ x: current.x + dx / 2, y: current.y + dy / 2 })) continue;
      visited.set(keyFor(next), current);
      queue.push(next);
    }
  }
  assert.ok(goal, "A roomy physical approach to " + description);
  const path = [];
  for (let point = goal; point; point = visited.get(keyFor(point))) path.push(point);
  await indoorNav.follow(path.reverse());
  const at = await indoorNav.position();
  assert.ok(settled(at), description + " at " + JSON.stringify(at) + " versus " + JSON.stringify(goal));
  report.routes.push({ kind: "interior", target: description, roomId: room.buildingId, from: start, to: at, steps: path.length });
  return at;
}

async function openNativePoint(pointId) {
  const room = api.homeworldInteriorForPointV64(pointId);
  const targetAt = point => api.nearestHomeworldInteriorTargetV64(room, point);
  await walkNativeTo(room, pointId, point => {
    const target = targetAt(point);
    return target?.pointId === pointId && Math.hypot(point.x - target.position.x, point.y - target.position.y) < 56;
  }, point => targetAt(point)?.pointId === pointId);
  await page.keyboard.press("KeyE");
  await indoorNav.tick(160);
  await page.locator("[data-homeworld-hub]").getByRole("dialog").waitFor();
}

async function boot() {
  await page.clock.resume();
  assert((await page.reload({ waitUntil: "domcontentloaded" })).ok());
  await page.locator('[data-campaign-menu="main"]').waitFor();
  await page.locator('[data-menu-section="campaign"]').click();
  await page.locator('[data-menu-action="continue"]').click();
  const play = page.getByRole("button", { name: "Jouer", exact: true });
  if (await play.isVisible()) await play.click();
  await page.locator('[data-homeworld-hub][data-homeworld-motion-ready="true"]').waitFor();
  await page.bringToFront();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 150));
  const exterior = {
    ...api,
    homeworldWorldRouteV77(from, to) {
      const queue = [{ ...from, segments: [] }];
      const reached = new Set();
      for (const entry of queue) {
        if (entry.levelId === to.levelId) {
          const walk = api.homeworldWalkRouteV109(entry.levelId, entry.point, to.point);
          if (walk.status === "reachable") return { status: "reachable", segments: [...entry.segments, walk] };
        }
        for (const connector of api.HOMEWORLD_CONNECTORS_V77) {
          const reverse = connector.to.levelId === entry.levelId;
          const landing = reverse ? connector.to : connector.from;
          if (landing.levelId !== entry.levelId) continue;
          const arrival = reverse ? connector.from : connector.to;
          const key = arrival.levelId + ":" + arrival.point.x + ":" + arrival.point.y;
          if (reached.has(key)) continue;
          const walk = api.homeworldWalkRouteV109(entry.levelId, entry.point, landing.point);
          if (walk.status !== "reachable") continue;
          reached.add(key);
          queue.push({ ...arrival, segments: [...entry.segments, walk, { connectorId: connector.id, reverse }] });
        }
      }
      return { status: "unavailable", segments: [] };
    },
  };
  nav = homeworldNavigatorV77(page, exterior, { waypointTolerance: 3, driverTickMs: 26, pulseInputs: true });
  indoorNav = homeworldNavigatorV77(page, api, { waypointTolerance: 3, driverTickMs: 26, pulseInputs: true });
  await nav.focus();
}

const advanceAdjutant = async (station, name, phase) => {
    const desk = page.locator("[data-adjutant-m029-station=" + station + "]");
    await desk.getByRole("button", { name, exact: true }).press("Enter");
    await nav.tick(120);
    const state = await disk();
    assert.equal(state.homeworld.adjutantM029?.phase, phase);
    report.checks.push({ action: name, phase, room: await nav.room(), position: await nav.position() });
    return state;
};

async function appointAtNativePosts() {
  const initial = await disk();
  const advance = advanceAdjutant;
  await openNativePoint("dock-officer-point");
  await advance("dock", "Étudier le dossier du convoi", "dossier");
  await capture("03-dock-record.png");
  await nav.closeDialog();

  const workshop = api.homeworldInteriorForBuildingV64("convoy-workshop");
  await walkNativeTo(workshop, "support du relais", point => Math.hypot(point.x - 225, point.y - 205) <= 17);
  await page.keyboard.press("KeyE");
  await indoorNav.tick(160);
  assert.equal((await disk()).homeworld.adjutantM029.phase, "relay");
  report.checks.push({ action: "relay physically placed", room: await nav.room(), position: await nav.position() });
  await nav.exitRoom();

  const point = api.HOMEWORLD_POINTS_V77.find(candidate => candidate.id === "personal-ship");
  const candidates = [0, 40, 80, 115].flatMap(offset =>
    [[0, offset], [offset, 0], [-offset, 0], [0, -offset]].map(([dx, dy]) => ({ x: point.x + dx, y: point.y + dy })));
  let approach;
  for (const candidate of candidates) {
    if (!api.homeworldWalkableV77(point.levelId, candidate) ||
        api.nearestHomeworldDoorV77(point.levelId, candidate) ||
        api.nearestHomeworldConnectorV77(point.levelId, candidate) ||
        api.nearestHomeworldPointV77(point.levelId, candidate)?.id !== point.id) continue;
    if ((await nav.route({ levelId: point.levelId, point: candidate })).status === "reachable") {
      approach = candidate;
      break;
    }
  }
  assert.ok(approach, "Existing way to the transfer sas");
  await nav.reach({ levelId: point.levelId, point: approach });
  await page.keyboard.press("KeyE");
  await nav.tick(160);
  await advance("sas", "Relayer le signal au convoi", "reported");
  await nav.closeDialog();

  await decideAtAudience(initial, advance);
}

async function decideAtAudience(initial, advance) {
  await openNativePoint("audience-point");
  const deferred = await advance("leader", "Différer la nomination", "deferred");
  assert.deepEqual(deferred.prologue.chronicle, initial.prologue.chronicle);
  await capture("04-leader-deferred.png");
  report.routes.push(...nav.routes);
  await boot();
  await openNativePoint("audience-point");
  const accepted = await advance("leader", "Accepter la fonction d’Adjutant", "appointed");
  assert.equal(chronicles.getChronicleRank(accepted.prologue.chronicle), "blooded");
  assert.deepEqual(chronicles.getChronicleFunctions(accepted.prologue.chronicle), ["adjutant"]);
  const evidence = ["multiple-world-hunts", "team-extraction"];
  assert.ok(evidence.every(id => accepted.prologue.chronicle.evidence.some(entry => entry.id === id)));
  assert.deepEqual(accepted.homeworld.packTrialM029, initial.homeworld.packTrialM029);
  const receipts = evidence.map(id => ({ id: "chronicle:" + id, delta: 50 }));
  assert.equal(accepted.profile.honor, initial.profile.honor + 100);
  for (const receipt of receipts) {
    const credited = accepted.honorSourcesV169.entries.filter(entry => entry.id === receipt.id);
    assert.deepEqual(credited.map(({ id, delta }) => ({ id, delta })), [receipt]);
  }
  await capture("05-leader-accepted.png");
  report.routes.push(...nav.routes);
  await boot();
  const reloaded = await disk();
  assert.deepEqual(reloaded.homeworld.adjutantM029.events, ["study", "place-relay", "confirm-signal", "defer", "accept"]);
  assert.deepEqual(chronicles.getChronicleFunctions(reloaded.prologue.chronicle), ["adjutant"]);
  assert.equal(chronicles.getChronicleRank(reloaded.prologue.chronicle), "blooded");
  assert.equal(reloaded.profile.honor, accepted.profile.honor);
  assert.deepEqual(reloaded.honorSourcesV169, accepted.honorSourcesV169);
  report.checks.push({ action: "reload", role: "adjutant", rank: "blooded", honor: reloaded.profile.honor, awarded: receipts });
}
const scene = () => page.locator("[data-homeworld-pack-m029]");
const button = command => scene().locator("[data-homeworld-pack-action-m029=" + command + "]");
const act = async command => {
  const before = (await disk()).homeworld.packTrialM029?.journal.length ?? -1;
  await button(command).press("Enter");
  await nav.tick(100);
  assert.equal((await disk()).homeworld.packTrialM029?.journal.length, before + 1, command);
};
const position = async () => Number(await scene().locator("[data-homeworld-pack-lead-m029]").getAttribute("data-homeworld-pack-lead-m029"));
async function moveTo(destination, direction) {
  for (let step = 0; step < 40 && await position() !== destination; step++) {
    if (await button(direction).isDisabled()) await act("regroup");
    else await act(direction);
  }
  assert.equal(await position(), destination);
  while (!(await button("regroup").isDisabled())) await act("regroup");
}
try {
  await page.clock.install();
  assert((await page.goto(url, { waitUntil: "domcontentloaded", timeout: 150000 })).ok());
  await page.locator('[data-campaign-menu="main"]').waitFor();
  await page.addScriptTag({ content: bootstrap.outputFiles[0].text });
  await page.evaluate(async save => {
    const api = globalThis.__m029Fixture;
    if (!api.parseSaveImport(JSON.stringify(save)).save) throw Error("Invalid M029 admission fixture");
    localStorage.setItem(api.SAVE_STORAGE_KEY, JSON.stringify(save));
    const migrated = await api.migrateLegacyCampaignSlot();
    if (!migrated.ok) throw Error(migrated.message);
    const saved = await api.saveCampaignCheckpoint(1, { kind: "manual", index: 1, location: "homeworld", expectedRevision: api.loadCampaignSlots().slots[0].revision });
    if (!saved.ok) throw Error(saved.message);
  }, seed);
  await boot();
  const initial = await disk();
  if (audienceOnly) {
    assert.equal(initial.homeworld.adjutantM029.phase, "reported");
    assert.equal(await nav.room(), "throne-audience");
    report.fixture += " The previous browser run physically played through the signal at the orbital terminal. This continuation starts from that phase using the real pack and dock action reducers and the recorded audience room.";
    await decideAtAudience(initial, advanceAdjutant);
  } else {
    assert.equal(initial.homeworld.packTrialM029, undefined);
    await openNativePoint("training-service");
    assert.equal(await nav.room(), "training-hall");
    await act("start");
    assert.equal(await scene().locator("[data-homeworld-pack-pupil-m029]").count(), 12);
    await moveTo(6, "east");
    assert.ok(await button("east").isDisabled());
    await act("shelter");
    await capture("01-first-protection.png");
    report.checks.push("all 12 pupils regrouped for the protected outward crossing");
    report.routes.push(...nav.routes);
    await boot();
    await openNativePoint("training-service");
    assert.equal(await position(), 6);
    assert.ok(await button("shelter").isDisabled());
    await moveTo(16, "east");
    await act("turn");
    await moveTo(12, "west");
    assert.ok(await button("west").isDisabled());
    await act("shelter");
    await moveTo(0, "west");
    await act("count");
    assert.equal(await scene().getAttribute("data-homeworld-pack-m029"), "returned");
    assert.equal(await scene().locator("[data-homeworld-pack-pupil-m029='0']").count(), 12);
    await capture("02-all-twelve-returned.png");
    report.checks.push("all 12 pupils physically returned after both protected crossings");
    report.routes.push(...nav.routes);
    await boot();
    const final = await disk();
    assert.equal(final.homeworld.packTrialM029?.journal.at(-1), "count");
    assert.deepEqual(final.prologue.chronicle, initial.prologue.chronicle);
    assert.deepEqual(final.inventory, initial.inventory);
    assert.equal(final.profile.honor, initial.profile.honor);
    await appointAtNativePosts();
  }
  assert.deepEqual(report.pageErrors, []);
  report.passed = true;
} catch (error) {
  report.failure = String(error.stack ?? error);
  console.error(JSON.stringify({ checks: report.checks, routes: report.routes, httpErrors: report.httpErrors.slice(-8) }));
  if (nav) report.routes.push(...nav.routes);
  await capture("failure.png").catch(() => {});
  throw error;
} finally {
  await writeFile(join(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
  await browser.close();
}
