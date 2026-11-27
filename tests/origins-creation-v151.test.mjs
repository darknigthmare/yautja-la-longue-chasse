import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { homeworldSceneSsrV78 } from "./helpers/homeworld-scene-ssr-v78.mjs";

// Real campaign slot module (bundled like tests/campaign-slots.test.mjs).
const compiled = await build({ stdin: { contents: `
export * from "./app/game/systems/campaignSlots";
export {defaultSave, normalizeSave, parseSaveImport, exportSave} from "./app/game/save";
`, resolveDir: process.cwd(), loader: "ts" }, bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent" });
const p = await import("data:text/javascript;base64," + Buffer.from(compiled.outputFiles[0].text).toString("base64"));
Object.defineProperty(globalThis, "navigator", { configurable: true, value: { locks: { async request(_n, _o, callback) { return callback({ name: "lock" }); } } } });
const store = () => { const values = new Map(); return { values, getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) }; };
const campaignOf = (s, id) => JSON.parse(s.getItem(p.campaignSlotStorageKey(id))).checkpoints[0].archive.campaign;

test("STATE5-01: the origin chosen at creation is stored on the new chronicle", async () => {
  const s = store();
  const created = await p.createCampaignSlot(1, "Varek fils", s, "O1");
  assert.equal(created.ok, true, created.message);
  const campaign = campaignOf(s, 1);
  assert.deepEqual(campaign.originV151, { version: 1, originId: "O1", source: "creation", transitions: {}, relations: {}, consumed: [] });
  assert.deepEqual(p.normalizeSave(campaign).originV151, campaign.originV151);
});

test("creation without an origin keeps the old save shape; an unknown origin is refused", async () => {
  const s = store();
  assert.equal((await p.createCampaignSlot(1, "", s)).ok, true);
  assert.equal(Object.hasOwn(campaignOf(s, 1), "originV151"), false);
  const refused = await p.createCampaignSlot(2, "", s, "O9");
  assert.equal(refused.ok, false);
  assert.equal(s.getItem(p.campaignSlotStorageKey(2)), null, "nothing written");
});

test("a newer origin record is refused at import", () => {
  const save = { ...p.defaultSave("2026-11-19T11:00:00.000Z"), originV151: { version: 2, originId: "O1" } };
  assert.equal(p.parseSaveImport(JSON.stringify(save)).failure, "future-version");
});

test("panels: the creation form lists the six origins; the house scene follows the stored origin", () => {
  const source = homeworldSceneSsrV78();
  const R = source.load("app/game/systems/residenceV149.ts");
  const ctx = at => ({ rankId: "young-blood", atHouseId: at, regionAllowed: () => true });
  const ok = r => { assert.equal(r.ok, true, r.ok ? "" : r.reason); return r.state; };
  const field = (st, runId, actions) => actions.reduce((x, action) => R.recordResidenceFieldEventV149(x, { regionId: "luminous-marshes", runId, action }).state, st);
  let residence = ok(R.acceptHouseMissionV149(R.emptyResidenceV149(), "HOME-CM07", ctx("HOME-CM07")));
  residence = field(residence, "r1", ["ward", "recover", "report"]);
  residence = ok(R.chooseHouseRouteV149(residence, "HOME-CM07", 0, ctx("HOME-CM07")));
  residence = field(residence, "r2", ["track", "ward", "recover"]);
  residence = ok(R.activateFirstResidenceV149(residence, "HOME-CM07", ctx("HOME-CM07")));
  const props = origin => ({ house: R.houseV149("HOME-CM07"), residence, origin, rankId: "young-blood", disabled: false,
    regionAllowed: () => true, onAction: () => ({ ok: true, message: "" }) });
  const o1 = source.render("app/game/OriginTransitionPanelV151.tsx", props({ version: 1, originId: "O1", source: "creation", transitions: {}, relations: {}, consumed: [] }));
  const o5 = source.render("app/game/OriginTransitionPanelV151.tsx", props({ version: 1, originId: "O5", source: "creation", transitions: {}, relations: {}, consumed: [] }));
  assert.match(o1, /Une poignée à ma hauteur/);
  assert.match(o5, /Une place pour un visiteur libre/);
  assert.match(source.render("app/game/OriginTransitionPanelV151.tsx", props(undefined)), /origine par défaut d’une ancienne partie/);
  const noHome = source.render("app/game/OriginTransitionPanelV151.tsx", { ...props(undefined), residence: R.emptyResidenceV149() });
  assert.equal(noHome, "");
});
