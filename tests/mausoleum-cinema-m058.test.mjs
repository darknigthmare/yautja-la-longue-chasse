import assert from "node:assert/strict";
import { build } from "esbuild";
import { test } from "node:test";

const output = await build({ entryPoints: ["app/game/systems/mausoleumCinemaM058.ts"],
  bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent" });
const {
  CINEMA_MASK_X_M058, CINEMA_CRADLE_X_M058, advanceCinemaM058, canHandleCinemaMaskM058, cinemaKeyM058, cinemaSlotM058,
  openCinemaM058,
} = await import("data:text/javascript;base64," + Buffer.from(output.outputFiles[0].text).toString("base64"));

const ancient = { rank: "ancient", adjutant: false, preview: false };
const owner = "2026-11-27T10:00:00.000Z";
const stages = ["right", "right", "read", "right", "right", "aid"];
const memory = () => {
  const entries = new Map();
  return { getItem: key => entries.get(key) ?? null, setItem: (key, value) => { entries.set(key, value); } };
};
const apply = (storage, run, orders) => {
  let current = run;
  let result;
  for (const action of orders) {
    result = advanceCinemaM058(storage, current, action);
    assert.equal(result.ok, true, result.message);
    current = result.run;
  }
  return result;
};

test("un lecteur Ancient réel est exigé pour prendre ou poser le masque et ouvrir le récit", () => {
  const storage = memory();
  assert.equal(canHandleCinemaMaskM058(ancient, CINEMA_MASK_X_M058, "take"), true);
  assert.equal(canHandleCinemaMaskM058(ancient, CINEMA_MASK_X_M058, "place"), false);
  assert.equal(canHandleCinemaMaskM058(ancient, CINEMA_CRADLE_X_M058, "place"), true);
  assert.equal(canHandleCinemaMaskM058(ancient, Number.NaN, "take"), false);
  assert.equal(openCinemaM058(storage, owner, "faithful", { ...ancient, rank: "elder" }).ok, false);
  assert.equal(openCinemaM058(storage, owner, "faithful", { ...ancient, preview: true }).ok, false);
  assert.equal(storage.getItem(cinemaKeyM058(owner, "faithful")), null);
});

test("la relève à l’est nécessite balise, soutien, couverture et franchissement du sas", () => {
  const storage = memory();
  const opened = openCinemaM058(storage, owner, "faithful", ancient);
  assert.equal(opened.ok, true);
  assert.equal(advanceCinemaM058(storage, opened.run, "exit").ok, false);
  const rendezvous = apply(storage, opened.run, stages);
  assert.equal(rendezvous.view.x, 4);
  assert.equal(advanceCinemaM058(storage, rendezvous.run, "right").ok, false);
  const halfway = apply(storage, rendezvous.run, ["cover", "right", "right"]);
  const resumed = openCinemaM058(storage, owner, "faithful", ancient);
  assert.deepEqual(resumed, halfway);
  const complete = apply(storage, resumed.run, ["right", "right", "exit"]);
  assert.equal(complete.view.complete, true);
  assert.equal(cinemaSlotM058(storage, owner, "faithful"), "complete");
  assert.equal(openCinemaM058(storage, owner, "faithful", ancient).view.complete, true);
  assert.equal(openCinemaM058(storage, owner, "faithful", ancient, halfway.run).ok, false);
  const replay = openCinemaM058(storage, owner, "faithful", ancient, complete.run);
  assert.equal(replay.view.x, 0);
  assert.equal(replay.view.complete, false);
});

test("la corniche a son propre passage, son repère et son état de lecture", () => {
  const storage = memory();
  storage.setItem("campaign", "bytes préservés");
  const faithful = openCinemaM058(storage, owner, "faithful", ancient);
  const checkpoint = apply(storage, faithful.run, stages);
  const initialRidge = openCinemaM058(storage, owner, "ridge", ancient);
  assert.equal(initialRidge.view.x, 0);
  const ridge = apply(storage, initialRidge.run, [...stages, "ridge", "left", "left"]);
  assert.equal(ridge.view.lane, "ridge");
  const complete = apply(storage, ridge.run, ["mark", "left", "left", "exit"]);
  assert.equal(complete.view.complete, true);
  assert.equal(complete.view.x, 0);
  assert.deepEqual(openCinemaM058(storage, owner, "faithful", ancient), checkpoint);
  assert.equal(openCinemaM058(storage, "2026-11-27T11:00:00.000Z", "faithful", ancient).view.x, 0);
  assert.equal(storage.getItem("campaign"), "bytes préservés");
});

test("un autre onglet, un historique forgé ou une écriture défaillante ne remplacent jamais la lecture valide", () => {
  const storage = memory();
  const opened = openCinemaM058(storage, owner, "faithful", ancient);
  const checkpoint = apply(storage, opened.run, ["right"]);
  const key = cinemaKeyM058(owner, "faithful");
  const bytes = storage.getItem(key);
  assert.equal(advanceCinemaM058(storage, opened.run, "right").ok, false);
  assert.equal(advanceCinemaM058({ ...storage, setItem() { throw new Error("quota"); } }, checkpoint.run, "right").ok, false);
  assert.equal(storage.getItem(key), bytes);
  storage.setItem(key, JSON.stringify({ ...checkpoint.run, orders: ["exit"] }));
  assert.equal(openCinemaM058(storage, owner, "faithful", ancient).ok, false);
  assert.equal(cinemaSlotM058(storage, owner, "faithful"), "unavailable");
  assert.deepEqual(JSON.parse(storage.getItem(key)).orders, ["exit"]);
});
