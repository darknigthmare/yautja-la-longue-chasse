import test from "node:test";
import assert from "node:assert/strict";
import { homeworldSceneSsrV78 } from "./helpers/homeworld-scene-ssr-v78.mjs";

// Real module graph (save, residence rules, panel); nothing is mocked.
const source = homeworldSceneSsrV78();
const { defaultSave, normalizeSave, parseSaveImport, exportSave } = source.load("app/game/save.ts");
const R = source.load("app/game/systems/residenceV149.ts");
const PANEL = "app/game/ResidencePanelV149.tsx";
const owner = "2026-11-19T09:00:00.000Z";

function residenceMidMove() {
  const ctx = (at, rankId = "blooded") => ({ rankId, atHouseId: at, regionAllowed: () => true });
  const ok = r => { assert.equal(r.ok, true, r.ok ? "" : r.reason); return r.state; };
  const field = (state, runId, actions) => actions.reduce((s, action) =>
    R.recordResidenceFieldEventV149(s, { regionId: "luminous-marshes", runId, action }).state, state);
  let s = ok(R.acceptHouseMissionV149(R.emptyResidenceV149(), "HOME-CM07", ctx("HOME-CM07")));
  s = field(s, "r1", ["ward", "recover", "report"]);
  s = ok(R.chooseHouseRouteV149(s, "HOME-CM07", 0, ctx("HOME-CM07")));
  s = field(s, "r2", ["track", "ward", "recover"]);
  s = ok(R.activateFirstResidenceV149(s, "HOME-CM07", ctx("HOME-CM07")));
  s = ok(R.acceptHouseMissionV149(s, "HOME-CM08", ctx("HOME-CM08")));
  s = field(s, "r3", ["ward", "recover", "report"]);
  s = ok(R.chooseHouseRouteV149(s, "HOME-CM08", 0, ctx("HOME-CM08")));
  s = ok(R.startTransferV149(s, "HOME-CM08", ctx("HOME-CM07")));
  s = ok(R.packObjectV149(s, R.CM07_LAMP_ID_V149, ctx("HOME-CM07")));
  return ok(R.confirmDepartureV149(s, ctx("HOME-CM07")));
}

test("a save without a residence keeps its shape", () => {
  const save = defaultSave(owner);
  assert.equal(Object.hasOwn(save, "residenceV149"), false);
  assert.equal(Object.hasOwn(normalizeSave(save), "residenceV149"), false);
});

test("QA5-05: export and import while the charge is on the road keep one original and one active house", () => {
  const save = { ...defaultSave(owner), residenceV149: residenceMidMove() };
  const parsed = parseSaveImport(exportSave(save));
  assert.ok(parsed.save, parsed.failure);
  const residence = parsed.save.residenceV149;
  assert.equal(residence.activeResidenceId, "HOME-CM07");
  assert.equal(residence.transfer.stage, "in-transit");
  const lamps = residence.objects.filter(o => o.id === R.CM07_LAMP_ID_V149);
  assert.equal(lamps.length, 1);
  assert.equal(lamps[0].location.kind, "transfer");
  assert.deepEqual(normalizeSave(parsed.save).residenceV149, residence);
});

test("a residence ledger from a newer version is refused at import", () => {
  const save = { ...defaultSave(owner), residenceV149: { version: 2, anything: true } };
  assert.equal(parseSaveImport(JSON.stringify(save)).failure, "future-version");
});

test("the panel shows the house, its thresholds and the mission from the workbook", () => {
  const house = R.houseV149("HOME-CM07");
  const html = source.render(PANEL, { house, residence: undefined, rankId: "young-blood", disabled: false,
    regionAllowed: () => true, onAction: () => ({ ok: true, message: "" }) });
  assert.match(html, /Maison des Pilotis Calmes/);
  assert.match(html, /Trois appuis avant la crue/);
  assert.match(html, /data-residence-accept/);
  assert.match(html, /0\/100/);
  const movingProps = { house: R.houseV149("HOME-CM08"), residence: residenceMidMove(), rankId: "blooded", disabled: false,
    regionAllowed: () => true, onAction: () => ({ ok: true, message: "" }) };
  const workbench = source.render(PANEL, movingProps);
  assert.doesNotMatch(workbench, /data-residence-arrive/);
  assert.match(workbench, /Le contenant attend au seuil/);
  const threshold = source.render(PANEL, { ...movingProps, threshold: true });
  assert.match(threshold, /data-residence-threshold-panel="HOME-CM08"/);
  assert.match(threshold, /data-residence-arrive/);
  assert.match(threshold, /1 pièce\(s\).*contenant/);
});
