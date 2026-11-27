import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const bundle = await build({
  stdin: { contents: `export * as gallery from "./app/game/systems/pitHonorGalleryV1";
    export * as access from "./app/game/systems/pitContentAccessV1";
    export * as saves from "./app/game/systems/pitSave";
    export * as arcade from "./app/game/systems/pitArcade";
    export * as circuit from "./app/game/systems/pitCircuit";
    export * as first from "./app/game/systems/pitFirstEdition";
    export * as roster from "./app/game/systems/pitRosterExpansion";
    export * as fixtures from "./tests/fixtures/pit-honors-gallery-v1";`,
    resolveDir: fileURLToPath(new URL("../", import.meta.url)), loader: "ts" },
  bundle: true, format: "esm", platform: "node", target: "es2022", write: false,
});
const { gallery, access, saves, arcade, circuit, first, roster, fixtures } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const OWNER = fixtures.PIT_HONORS_QA_OWNER;
const entries = save => access.buildPitRewardSlotsV1(save, OWNER).entries;

test("route normalization accepts the three real progression modes and only eligible fighters", () => {
  for (const mode of ["arcade", "circuit", "descent"]) {
    assert.deepEqual(gallery.normalizePitHonorRouteV1({ mode }), { mode });
    for (const fighterId of first.PIT_FIRST_EDITION_FIGHTER_IDS) {
      const route = gallery.normalizePitHonorRouteV1({ mode, fighterId, earned: true, skipTo: 8 });
      assert.deepEqual(route, { mode, fighterId });
      assert.equal(roster.canPitFighterEnterMode(fighterId, mode), true);
    }
  }
  for (const plan of circuit.PIT_CLAN_CIRCUITS["jungle-hunter"].chapters) {
    assert.deepEqual(gallery.normalizePitHonorRouteV1({ mode: "circuit", chapterId: plan.chapter.id }), { mode: "circuit", chapterId: plan.chapter.id });
  }
});

test("route normalization rejects malformed, incompatible and misleading requests", () => {
  for (const value of [null, [], "arcade", {}, { mode: "training" }, { mode: "arcade", fighterId: "tracker" },
    { mode: "descent", fighterId: "kok-warlord" }, { mode: "circuit", fighterId: null },
    { mode: "arcade", chapterId: "judgment" }, { mode: "descent", chapterId: "judgment" },
    { mode: "circuit", chapterId: "unknown" }, { mode: "circuit", chapterId: 5 },
    Object.defineProperty({}, "mode", { get() { throw new Error("unreadable request"); } })]) {
    assert.equal(gallery.normalizePitHonorRouteV1(value), null);
  }
});

test("all 18 known distinctions derive inspectable guidance and exact existing routes without writes", () => {
  const save = fixtures.createPitHonorGalleryFixtureV1("empty");
  const before = saves.serializePitSave(save);
  const slots = entries(save);
  assert.equal(slots.length, 18);
  assert.deepEqual(slots.map(slot => slot.honor.id), saves.PIT_SAVE_ALLOWED_COSMETIC_IDS);
  const models = slots.map(gallery.buildPitHonorGalleryDetailV1);
  assert.ok(models.every(Boolean));
  assert.deepEqual(["arcade", "circuit", "descent"].map(mode => models.filter(model => model.route.mode === mode).length), [12, 5, 1]);
  assert.ok(models.every(model => model.loreLabel === "Distinction originale de THE PIT"));
  for (const model of models) for (const path of model.paths) {
    assert.deepEqual(gallery.normalizePitHonorRouteV1(path.route), path.route);
    assert.equal(path.current, 0);
    assert.equal(path.complete, false);
  }
  assert.equal(saves.serializePitSave(save), before);
});

test("an earned Arcade palette keeps its exact owner, progress and route after save/load", () => {
  const save = fixtures.createPitHonorGalleryFixtureV1("earned");
  const before = saves.serializePitSave(save);
  const parsed = saves.loadPitSave({
    key: saves.pitSaveStorageKey(OWNER), expectedOwnerSaveCreatedAt: OWNER,
    storage: { getItem: () => before, setItem() { throw new Error("Inspection must not write"); } },
  });
  assert.ok(parsed.save);
  const slot = entries(parsed.save).find(entry => entry.honor.id === arcade.PIT_ARCADE_LADDERS["jungle-hunter"].cosmeticRewardId);
  assert.equal(slot.access.right, "permanent");
  const detail = gallery.buildPitHonorGalleryDetailV1(slot);
  assert.deepEqual(detail.route, { mode: "arcade", fighterId: "jungle-hunter" });
  assert.equal(detail.paths.length, 1);
  assert.equal(detail.paths[0].current, 8);
  assert.equal(detail.paths[0].complete, true);
  assert.equal(saves.serializePitSave(parsed.save), before);
});

test("Circuit details respect chapter boundaries and never add different hunters' progress", () => {
  const save = fixtures.createPitHonorGalleryFixtureV1("progress");
  const slot = entries(save).find(entry => entry.honor.id === "pit-banner-three-paths");
  const detail = gallery.buildPitHonorGalleryDetailV1(slot);
  assert.equal(detail.paths.length, 12);
  assert.equal(detail.paths.find(path => path.fighterId === "wolf").current, 1);
  assert.equal(detail.paths.find(path => path.fighterId === "city-hunter").current, 2);
  assert.ok(detail.paths.every(path => path.total === 3 && !path.complete));
  assert.equal(slot.honor.earned, false);
  assert.equal(slot.honor.progress.current, 2);
  assert.deepEqual(detail.route, { mode: "circuit", fighterId: "city-hunter", chapterId: "three-paths" });
  assert.match(detail.progressNote, /chapitres précédents restent nécessaires/);
});

test("Descente details retain independent deepest paths and the actual final threshold", () => {
  const save = fixtures.createPitHonorGalleryFixtureV1("progress");
  const slot = entries(save).find(entry => entry.honor.id === saves.PIT_SAVE_DESCENT_COSMETIC_ID);
  const detail = gallery.buildPitHonorGalleryDetailV1(slot);
  assert.equal(detail.paths.find(path => path.fighterId === "wolf").current, 2);
  assert.equal(detail.paths.find(path => path.fighterId === "city-hunter").current, 3);
  assert.ok(detail.paths.every(path => path.total === arcade.PIT_DESCENT_FLOOR_COUNT && !path.complete));
  assert.equal(slot.honor.earned, false);
  assert.deepEqual(detail.route, { mode: "descent", fighterId: "city-hunter" });
});

test("unknown or secret distinctions cannot disclose a named route through the gallery model", () => {
  const slot = entries(fixtures.createPitHonorGalleryFixtureV1("empty"))[0];
  for (const discovery of ["secret", "hinted"]) {
    assert.equal(gallery.buildPitHonorGalleryDetailV1({ ...slot, access: { ...slot.access, discovery } }), null);
  }
  assert.equal(gallery.buildPitHonorGalleryDetailV1({ ...slot, honor: { ...slot.honor, id: "unknown-reward" } }), null);
});
