import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = relative => readFileSync(root + relative, "utf8");

// The modules import JSON and extensionless paths: bundle them for Node.
const entry = `
export * from "./app/game/systems/hunterModeAppearanceV147.ts";
export * from "./app/game/systems/pitPersonalFighterV147.ts";
export * from "./app/game/pitPersonalFighterRenderingV147.ts";
export { getPitFighterArtLayers } from "./app/game/pitFighterRendering.ts";
export { saveOutfitV146, assignModeOutfitV146, emptyCustomizationV146 } from "./app/game/systems/hunterCustomizationV146.ts";
export { defaultSave, normalizeSave, normalizeHunterAppearanceV146 } from "./app/game/save.ts";
export { createPitReplayRecorder, normalizePitReplay } from "./app/game/systems/pitReplay.ts";
export { PIT_FIGHTERS, createPitCombatState } from "./app/game/systems/pitCombat.ts";
export { canPitFighterEnterMode } from "./app/game/systems/pitRosterExpansion.ts";
`;
const bundle = build({
  stdin: { contents: entry, resolveDir: root, loader: "ts" },
  bundle: true, format: "esm", platform: "node", target: "es2022", write: false,
  loader: { ".json": "json" }, logLevel: "silent",
}).then(result => import("data:text/javascript;base64," + Buffer.from(result.outputFiles[0].text).toString("base64")));

const NOW = "2026-11-06T10:00:00.000Z";
function saveWithOutfits(m, assign) {
  const save = m.defaultSave();
  const base = structuredClone(save.appearance);
  let customization = m.emptyCustomizationV146();
  customization = m.saveOutfitV146(customization, 0, "Rouge du Pit", { ...base, piecesV146: { chest: { primary: "#aa1111" } } }, NOW);
  customization = m.saveOutfitV146(customization, 1, "Chasse", { ...base, piecesV146: { chest: { primary: "#11aa11" } } }, NOW);
  customization = m.saveOutfitV146(customization, 2, "Clan", { ...base, piecesV146: { chest: { primary: "#1111aa" } } }, NOW);
  for (const [mode, slot] of Object.entries(assign)) customization = m.assignModeOutfitV146(customization, mode, slot);
  return { ...save, customizationV146: customization };
}

test("V147 the Pit wears its own outfit, else the campaign look", async () => {
  const m = await bundle;
  const normalize = m.normalizeHunterAppearanceV146;
  const both = m.appearanceForModeV147(saveWithOutfits(m, { pit: 0, campaign: 1 }), "pit", normalize);
  assert.equal(both.source, "mode-outfit");
  assert.equal(both.outfitName, "Rouge du Pit");
  assert.equal(both.appearance.piecesV146.chest.primary, "#aa1111");

  const campaignOnly = m.appearanceForModeV147(saveWithOutfits(m, { campaign: 1 }), "pit", normalize);
  assert.equal(campaignOnly.source, "campaign-outfit");
  assert.equal(campaignOnly.appearance.piecesV146.chest.primary, "#11aa11");

  const plain = saveWithOutfits(m, {});
  const none = m.appearanceForModeV147(plain, "pit", normalize);
  assert.equal(none.source, "campaign");
  assert.equal(none.outfitName, null);
  assert.equal(none.appearance, plain.appearance);
  // A save without the V146 field (older saves) keeps the saved appearance.
  const legacy = m.defaultSave();
  delete legacy.customizationV146;
  assert.equal(m.appearanceForModeV147(legacy, "pit", normalize).appearance, legacy.appearance);

  const multiplayer = m.appearanceForModeV147(saveWithOutfits(m, { multiplayer: 2, pit: 0 }), "multiplayer", normalize);
  assert.equal(multiplayer.appearance.piecesV146.chest.primary, "#1111aa");
  assert.equal(m.modeAppearanceLabelV147(both), "Tenue « Rouge du Pit »");
  assert.equal(m.modeAppearanceLabelV147(none), "Apparence de campagne");
});

test("V147 outfit snapshots are normalised like any saved appearance", async () => {
  const m = await bundle;
  const save = saveWithOutfits(m, { pit: 0 });
  save.customizationV146.outfits[0].appearance = { ...save.customizationV146.outfits[0].appearance, piecesV146: { chest: { primary: "#ABC", accent: "nope" }, bogus: { primary: "#000000" } } };
  const worn = m.appearanceForModeV147(save, "pit", m.normalizeHunterAppearanceV146);
  assert.deepEqual(worn.appearance.piecesV146.chest, { primary: "#aabbcc", secondary: null, accent: null, light: null });
  assert.equal("bogus" in worn.appearance.piecesV146, false);
});

test("V147 the personal slot carries the campaign name and stays out of chronicle modes", async () => {
  const m = await bundle;
  const save = m.defaultSave();
  save.profile.hunterName = "  Kha'tor   le Patient  ";
  const personal = m.createPitPersonalFighterV147({
    hunterName: save.profile.hunterName, appearance: save.appearance,
    appearanceSource: "campaign", outfitName: null, loadout: save.loadout,
  });
  assert.equal(personal.name, "Kha'tor le Patient");
  assert.equal(personal.baseFighterId, "jungle-hunter");
  assert.deepEqual(personal.loadout, save.loadout);
  assert.ok(Object.isFrozen(personal));
  assert.equal(m.normalizePitPersonalNameV147("   "), m.PIT_PERSONAL_NAME_FALLBACK_V147);
  assert.equal(m.normalizePitPersonalNameV147(42), m.PIT_PERSONAL_NAME_FALLBACK_V147);
  assert.equal(m.normalizePitPersonalNameV147("x".repeat(80)).length, m.PIT_PERSONAL_NAME_MAX_V147);

  for (const mode of ["cpu", "local", "training"]) assert.equal(m.canPitPersonalFighterEnterModeV147(mode), true);
  for (const mode of ["arcade", "circuit", "descent"]) assert.equal(m.canPitPersonalFighterEnterModeV147(mode), false);
  // The base fighter itself still enters every mode: the restriction is the slot's.
  assert.equal(m.canPitFighterEnterMode("jungle-hunter", "arcade"), true);
  assert.equal(m.cyclePitPersonalModeV147("training", 1), "cpu");
  assert.equal(m.cyclePitPersonalModeV147("cpu", -1), "training");
  assert.equal(m.cyclePitPersonalModeV147("arcade", 1), "cpu");
});

test("V147 the name is shown on the live J1 slot only, never in a replay", async () => {
  const m = await bundle;
  const live = { selected: true, available: true, playback: false, slotFighterId: "jungle-hunter" };
  assert.equal(m.isPitPersonalFighterLiveV147(live), true);
  assert.equal(m.isPitPersonalFighterLiveV147({ ...live, playback: true }), false);
  assert.equal(m.isPitPersonalFighterLiveV147({ ...live, slotFighterId: "berserker" }), false);
  assert.equal(m.isPitPersonalFighterLiveV147({ ...live, selected: false }), false);
  assert.equal(m.pitSlotDisplayNameV147(0, "Jungle Hunter", { name: "Kha'tor" }, true), "Kha'tor");
  assert.equal(m.pitSlotDisplayNameV147(1, "Berserker", { name: "Kha'tor" }, true), "Berserker");
  assert.equal(m.pitSlotDisplayNameV147(0, "Jungle Hunter", { name: "Kha'tor" }, false), "Jungle Hunter");
});

test("V147 replays record the base fighter: no new id, validation unchanged", async () => {
  const m = await bundle;
  assert.equal(Object.keys(m.PIT_FIGHTERS).some(id => /personal|campaign|v147/i.test(id)), false);
  const recorder = m.createPitReplayRecorder({ fighters: [m.PIT_PERSONAL_FIGHTER_BASE_V147, "berserker"], seed: 7 });
  for (let tick = 0; tick < 120; tick++) recorder.append([tick % 20 < 10 ? { right: true } : { attack: "light" }, {}]);
  const replay = recorder.finish();
  assert.deepEqual([...replay.fighters], ["jungle-hunter", "berserker"]);
  const roundTrip = m.normalizePitReplay(JSON.parse(JSON.stringify(replay)));
  assert.ok(roundTrip, "a personal-slot duel replay validates like any duel");
  // Replays keep their strict key set: nothing about the slot may be added.
  assert.equal(m.normalizePitReplay({ ...JSON.parse(JSON.stringify(replay)), personalV147: true }), null);
});

test("V147 every tinted rig layer maps to its customisable piece", async () => {
  const m = await bundle;
  const layers = m.getPitFighterArtLayers("jungle-hunter");
  const tinted = layers.map(layer => [layer.id, m.pitPersonalLayerTintV147(layer.id)]);
  const pieces = new Set(tinted.filter(([, tint]) => tint).map(([, tint]) => tint.piece));
  for (const piece of ["skin", "fishnet", "dreads", "biomask", "chest", "belt", "shoulder", "shin"]) assert.ok(pieces.has(piece), piece);
  assert.deepEqual(m.pitPersonalLayerTintV147("armor-shin-back"), { channel: "armor", piece: "shin" });
  assert.deepEqual(m.pitPersonalLayerTintV147("armor-chest-classic"), { channel: "armor", piece: "chest" });
  // Equipment without a tintable plate keeps its authored colours.
  for (const id of ["gauntlet-base", "blades", "blade-housing", "caster-cannon"]) assert.equal(m.pitPersonalLayerTintV147(id), null);
  const appearance = { chromaticsV113: { armorHex: "#222222" }, piecesV146: { shoulder: { primary: "#ff0000" } } };
  assert.equal(m.pitPersonalLayerChromaticsV147(appearance, { channel: "armor", piece: "shoulder" }).armorHex, "#ff0000");
  assert.equal(m.pitPersonalLayerChromaticsV147(appearance, { channel: "armor", piece: "chest" }).armorHex, "#222222");
});

function recordingContext(log, label) {
  const state = {};
  return new Proxy(state, {
    get(target, key) {
      if (key in target) return target[key];
      return (...args) => { log.push({ label, call: key, args, fillStyle: target.fillStyle, filter: target.filter }); };
    },
    set(target, key, value) { target[key] = value; return true; },
  });
}

test("V147 the personal slot draws each piece with its own colour", async () => {
  const m = await bundle;
  const log = [];
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement: () => {
      const canvas = { width: 0, height: 0, kind: "recoloured" };
      const context = recordingContext(log, canvas);
      canvas.getContext = () => context;
      return canvas;
    },
  };
  try {
    const layers = m.getPitFighterArtLayers("jungle-hunter");
    const images = new Map(layers.map(layer => [layer.src, { complete: true, naturalWidth: 4, naturalHeight: 4, src: layer.src }]));
    const bank = { images, readyIds: new Set(["jungle-hunter"]), failedIds: new Set() };
    const fighter = m.createPitCombatState("jungle-hunter", "berserker").fighters[0];
    const appearance = { chromaticsV113: {}, piecesV146: { chest: { primary: "#aa1111" }, shoulder: { primary: "#11aa11" }, skin: { primary: "#1111aa" } } };
    const screen = recordingContext(log, "screen");
    assert.equal(m.drawPitPersonalFighterV147(screen, bank, fighter, 0, 500, appearance), true);
    const fills = new Set(log.filter(entry => entry.call === "fillRect" && entry.label !== "screen").map(entry => entry.fillStyle));
    for (const hex of ["#aa1111", "#11aa11", "#1111aa"]) assert.ok(fills.has(hex), "missing tint " + hex);
    const drawn = log.filter(entry => entry.label === "screen" && entry.call === "drawImage");
    assert.ok(drawn.some(entry => entry.args[0].kind === "recoloured"), "recoloured plates reach the screen");
    assert.ok(drawn.some(entry => entry.args[0].src?.includes("gauntlet")), "untinted equipment keeps its bitmap");
    // Another fighter or an incomplete rig never draws: the published art stays.
    const berserker = m.createPitCombatState("jungle-hunter", "berserker").fighters[1];
    assert.equal(m.drawPitPersonalFighterV147(screen, bank, berserker, 0, 500, appearance), false);
    assert.equal(m.drawPitPersonalFighterV147(screen, { ...bank, readyIds: new Set() }, fighter, 0, 500, appearance), false);
    assert.equal(m.drawPitPersonalFighterV147(screen, null, fighter, 0, 500, appearance), false);
  } finally {
    if (previousDocument === undefined) delete globalThis.document; else globalThis.document = previousDocument;
  }
});

test("V147 wiring: Pit outfit from the save, personal draw limited to J1, roster art untouched", () => {
  const client = read("app/game/GameClient.tsx");
  assert.match(client, /appearanceForModeV147\(save, "pit", normalizeHunterAppearanceV146\)/);
  assert.match(client, /hunterName: save\.profile\.hunterName/);
  assert.match(client, /personalFighterV147=\{pitPersonalV147\}/);
  const canvas = read("app/game/PitCanvas.tsx");
  assert.match(canvas, /fighter\.slot === 0 &&\s*drawPitPersonalFighterV147/);
  assert.match(canvas, /isPitPersonalFighterLiveV147\(/);
  assert.match(canvas, /setPersonalSelectedV147\(false\);\s*const next = createPitReplayCombatState/);
  assert.doesNotMatch(canvas, /drawPitModularFighter/);
  const flow = read("app/game/PitSelectionFlow.tsx");
  assert.match(flow, /data-pit-personal-slot-v147/);
  // Arcade, Circuit and Descent records stay keyed by roster fighters.
  assert.match(canvas, /!canPitPersonalFighterEnterModeV147\(nextMode\)/);
});
