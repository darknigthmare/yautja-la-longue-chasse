import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = relative => readFileSync(root + relative, "utf8");

// The modules import JSON and extensionless paths: bundle them for Node.
const entry = `
export * from "./app/game/hunterPiecesV146.ts";
export * from "./app/game/systems/hunterCustomizationV146.ts";
export * from "./app/game/hunterMarksArtV146.ts";
export { normalizeSave, applyMissionResult, defaultSave, normalizeHunterAppearanceV146 } from "./app/game/save.ts";
`;
const bundle = build({
  stdin: { contents: entry, resolveDir: root, loader: "ts" },
  bundle: true, format: "esm", platform: "node", target: "es2022", write: false,
  loader: { ".json": "json" }, logLevel: "silent",
}).then(result => import("data:text/javascript;base64," + Buffer.from(result.outputFiles[0].text).toString("base64")));

test("V146 piece colours are normalised per zone the piece really has", async () => {
  const m = await bundle;
  const pieces = m.normalizePieceColorsV146({
    chest: { primary: "#ABC", secondary: "#112233", accent: "nope", light: "#ffffff" },
    fishnet: { primary: "#445566", secondary: "#000000" },
    unknown: { primary: "#000000" },
  });
  assert.deepEqual(pieces.chest, { primary: "#aabbcc", secondary: "#112233", accent: null, light: null });
  assert.deepEqual(pieces.fishnet, { primary: "#445566", secondary: null, accent: null, light: null });
  assert.equal("unknown" in pieces, false);
  assert.equal(m.HUNTER_PIECES_V146.length, m.HUNTER_PIECE_IDS_V146.length);
});

test("V146 a piece colour replaces its channel colour for that layer only", async () => {
  const m = await bundle;
  const appearance = { chromaticsV113: { armorHex: "#111111" }, piecesV146: { shoulder: { primary: "#ff0000" } } };
  assert.equal(m.chromaticsForPieceV146(appearance, "shoulder").armorHex, "#ff0000");
  assert.equal(m.chromaticsForPieceV146(appearance, "chest").armorHex, "#111111");
  assert.equal(m.pieceForArmorSlotV146("chest-avp"), "chest");
  assert.equal(m.pieceForArmorSlotV146("shoulder-feral"), "shoulder");
  assert.equal(m.pieceForArmorSlotV146("thigh-lower"), "shin");
  assert.equal(m.pieceForArmorSlotV146("mystery"), null);
  assert.equal(m.lightColorV146({ lightsV146: { laser: "#00ff00" } }, "laser", "#ff0000"), "#00ff00");
  assert.equal(m.lightColorV146({}, "laser", "#ff0000"), "#ff0000");
});

test("V146 zone recolouring keeps volumes: 50 % grey takes exactly the chosen colour", async () => {
  const m = await bundle;
  const px = (r, g, b, a = 255) => [r, g, b, a];
  const base = new Uint8ClampedArray([...px(128, 128, 128), ...px(0, 0, 0), ...px(255, 255, 255), ...px(128, 128, 128), ...px(90, 90, 90, 0)]);
  const zones = new Uint8ClampedArray([...px(255, 0, 0), ...px(0, 255, 0), ...px(0, 0, 255), ...px(0, 0, 0), ...px(255, 0, 0)]);
  const light = new Uint8ClampedArray([...px(0, 0, 0), ...px(0, 0, 0), ...px(0, 0, 0), ...px(255, 255, 255), ...px(0, 0, 0)]);
  const out = m.recolorZonesV146({ base, zones, light, colors: { primary: "#c83214", secondary: "#00ff00", accent: "#0000ff", light: "#00ffff" } });
  [200, 50, 20].forEach((expected, c) => assert.ok(Math.abs(out[c] - expected) <= 1, `channel ${c}: ${out[c]}`));
  assert.deepEqual([...out.slice(4, 7)], [0, 0, 0]);          // black stays black (shadow)
  assert.deepEqual([...out.slice(8, 11)], [255, 255, 255]);   // white stays white (highlight)
  assert.ok(out[13] > 150 && out[14] > 150 && out[12] < 140); // light map glows cyan on a fixed zone
  assert.equal(out[19], 0);                                   // transparent pixel untouched
  assert.throws(() => m.recolorZonesV146({ base, zones: new Uint8ClampedArray(4), colors: { primary: "#fff" } }));
});

test("V146 multiplayer readability lifts near-black colours, team outline is fixed", async () => {
  const m = await bundle;
  const lifted = m.readableForOthersV146("#000000");
  assert.ok(m.relativeLuminanceV146(lifted) >= m.MP_MINIMUM_LUMINANCE_V146);
  assert.equal(m.readableForOthersV146("#c9a24a"), "#c9a24a");
  assert.notEqual(m.MP_TEAM_OUTLINE_V146.ally, m.MP_TEAM_OUTLINE_V146.enemy);
});

test("V146 biome camouflage only counts in solo and coop, capped at 10 %", async () => {
  const m = await bundle;
  const green = { piecesV146: Object.fromEntries(["skin", "chest", "shoulder", "belt", "thigh", "knee", "shin", "bracer", "fishnet", "biomask", "dreads"]
    .map(id => [id, { primary: "#2f4a2a" }])) };
  const jungle = ["#2f4a2a", "#3a5a33"];
  const solo = m.camouflageVisibilityV146(green, jungle, "solo");
  assert.ok(Math.abs(solo - (1 - m.CAMOUFLAGE_CAP_V146)) < 1e-9);
  assert.equal(m.camouflageVisibilityV146(green, jungle, "pvp"), 1);
  assert.equal(m.camouflageVisibilityV146(green, jungle, "pit"), 1);
  const red = { piecesV146: { chest: { primary: "#ff0000" }, skin: { primary: "#ff0000" } } };
  assert.ok(m.camouflageVisibilityV146(red, ["#0000ff"], "coop") > 0.99);
});

test("V146 outfits: ten slots, one per mode, delete clears the mode", async () => {
  const m = await bundle;
  let state = m.emptyCustomizationV146();
  assert.equal(state.outfits.length, m.OUTFIT_SLOTS_V146);
  state = m.saveOutfitV146(state, 2, "  Nuit  ", { presetId: "custom" }, "2026-11-06T00:00:00.000Z");
  state = m.assignModeOutfitV146(state, "campaign", 2);
  assert.equal(m.outfitForModeV146(state, "campaign").name, "Nuit");
  assert.equal(m.assignModeOutfitV146(state, "pit", 5), state); // empty slot refused
  state = m.deleteOutfitV146(state, 2);
  assert.equal(state.modeOutfits.campaign, null);
  const normalized = m.normalizeCustomizationV146({ version: 1, outfits: [null, { name: 3, appearance: {} }], modeOutfits: { campaign: 7, pit: 1 },
    heavyWear: { chest: 9, nope: 2 }, earned: ["mark:bad-blood", "fake"], clanPalette: { primary: "#111", secondary: "#222222", accent: "#333333" } }, raw => ({ raw }));
  assert.equal(normalized.outfits[1].name, "Tenue 2");
  assert.deepEqual(normalized.modeOutfits, { campaign: null, multiplayer: null, pit: 1 });
  assert.deepEqual(normalized.heavyWear, { chest: 3 });
  assert.deepEqual(normalized.earned, ["mark:bad-blood"]);
  assert.equal(normalized.clanPalette.primary, "#111111");
  assert.deepEqual(m.normalizeCustomizationV146({ version: 2 }, x => x), m.emptyCustomizationV146());
});

test("V146 share codes round-trip and never grant unearned marks", async () => {
  const m = await bundle;
  const appearance = { piecesV146: { chest: { primary: "#123456" } }, marksV146: { "bad-blood": { color: null }, "rank-blooded": { color: "#ffffff" } } };
  const code = m.encodeOutfitShareCodeV146(appearance);
  assert.ok(code.startsWith("YLC1."));
  const decoded = m.decodeOutfitShareCodeV146(code, raw => ({ ...raw }), ["mark:rank-blooded"]);
  assert.equal(decoded.ok, true);
  // V148: shared pieces come back normalised (finishes are filtered against earned cosmetics).
  assert.deepEqual(decoded.appearance.piecesV146, { chest: { primary: "#123456", secondary: null, accent: null, light: null } });
  assert.deepEqual(Object.keys(decoded.appearance.marksV146), ["rank-blooded"]);
  assert.deepEqual(decoded.replaced, ["mark:bad-blood"]);
  assert.deepEqual(m.decodeOutfitShareCodeV146("hello", x => x, []), { ok: false, reason: "format" });
});

test("V146 cosmetics are earned by play and stay earned", async () => {
  const m = await bundle;
  const base = { honor: 0, rankId: "young-blood", trophies: [] };
  assert.deepEqual(m.earnedCosmeticsV146(base), ["pattern:spots"]);
  const later = m.earnedCosmeticsV146({ honor: 200, rankId: "elite", justiceDeclaration: "bad-blood",
    trophies: [{ definitionId: "xeno-drone-skull", targetKind: "beast", targetName: "Drone" },
      { definitionId: "y", targetKind: "yautja", targetName: "Bad Blood" }] });
  for (const id of ["mark:xeno-acid", "mark:duel-scar", "mark:bad-blood", "mark:rank-blooded", "mark:rank-elite", "pattern:marbled", "pattern:bands"])
    assert.ok(later.includes(id), id);
  assert.ok(!later.includes("mark:rank-elder"));
  assert.ok(m.earnedCosmeticsV146(base, ["mark:rank-elite"]).includes("mark:rank-elite"));
  assert.deepEqual(Object.keys(m.allowedMarksV146({ "rank-elite": { color: null }, "xeno-acid": { color: null } }, ["mark:rank-elite"])), ["rank-elite"]);
  for (const mark of m.HUNTER_MARKS_V146)
    assert.ok(m.markStrokesV146(mark.id, { x: 100, y: 20, width: 60, height: 50 }).length > 0, mark.id);
});

test("V146 wear: mission wear from damage, heavy hits crack pieces until a paid repair", async () => {
  const m = await bundle;
  assert.equal(m.missionWearV146(0, 100), 0);
  assert.equal(m.missionWearV146(500, 100), 1);
  assert.equal(m.heavyHitPieceV146(10, 100, 0), null);
  assert.equal(m.heavyHitPieceV146(20, 100, 0), "chest");
  let state = m.applyHeavyWearV146(m.emptyCustomizationV146(), ["chest", "chest", "chest", "chest", "shin"]);
  assert.deepEqual(state.heavyWear, { chest: 3, shin: 1 });
  assert.equal(m.repairCostV146(state, "chest"), 6);
  state = m.repairPieceV146(state, "chest");
  assert.deepEqual(state.heavyWear, { shin: 1 });
  assert.equal(m.payRepairFromArchiveV146([{ count: 2 }, { count: 3 }], 6), null);
  assert.deepEqual(m.payRepairFromArchiveV146([{ id: "a", count: 2 }, { id: "b", count: 3 }], 4), [{ id: "a", count: 1 }]);
  assert.equal(m.wearFilterV146(0, 0), "");
  assert.match(m.wearFilterV146(.5, 2), /saturate.*contrast/);
});

test("V146 clan palette gives each NPC a small, stable variation", async () => {
  const m = await bundle;
  const palette = { primary: "#808080", secondary: "#404040", accent: "#c0c0c0" };
  const a = m.clanColorsForNpcV146(palette, "forgeron"), b = m.clanColorsForNpcV146(palette, "forgeron");
  assert.deepEqual(a, b);
  const [r] = m.hexToRgbV146(a.primary);
  assert.ok(Math.abs(r - 128) <= 128 * .08 + 1);
  const pieces = m.clanNpcPiecesV146(palette, "forgeron");
  assert.ok(pieces.chest && pieces.biomask && pieces.fishnet);
  assert.equal(pieces.skin, undefined);
});

test("V146 save: appearance fields survive, preset becomes custom, mission wear and marks are recorded", async () => {
  const m = await bundle;
  const save = m.defaultSave("2026-11-06T00:00:00.000Z");
  const legacy = m.normalizeSave(save);
  assert.equal("piecesV146" in legacy.appearance, false); // old appearances keep their shape
  assert.equal("customizationV146" in legacy, false);
  const custom = m.normalizeSave({ ...save, appearance: { ...save.appearance, piecesV146: { chest: { primary: "#ff0000" } }, lightsV146: { laser: "#00ff00" } },
    customizationV146: { version: 1, heavyWear: { chest: 1 } } });
  assert.equal(custom.appearance.presetId, "custom");
  assert.equal(custom.appearance.piecesV146.chest.primary, "#ff0000");
  assert.equal(custom.appearance.lightsV146.laser, "#00ff00");
  assert.deepEqual(custom.customizationV146.heavyWear, { chest: 1 });
  const missionId = Object.keys(save.missionProgress)[0];
  const after = m.applyMissionResult(custom, {
    missionId, difficultyId: save.settings.difficultyId, outcome: "failed", score: 0, elapsedSeconds: 10,
    completedObjectiveIds: [], honorEvents: [], trophyQuality: null, trophyClaims: [], kills: 0, scans: 0,
    secondWindUsed: false, wearV146: { heavyPieces: ["chest", "shin", "bogus"] }, completedAt: "2026-11-06T00:10:00.000Z",
  });
  assert.deepEqual(after.customizationV146.heavyWear, { chest: 2, shin: 1 });
  assert.ok(after.customizationV146.earned.includes("pattern:spots"));
});

test("V146 renderers and campaign use the per-piece contract", () => {
  const hunt = read("app/game/HuntCanvas.tsx");
  const preview = read("app/game/HunterRigPreview.tsx");
  const home = read("app/game/HomeworldModularHunter.tsx");
  const client = read("app/game/GameClient.tsx");
  for (const piece of ["skin", "fishnet", "dreads", "belt", "chest", "shoulder", "thigh", "shin", "bracer", "knee", "biomask"])
    assert.match(hunt, new RegExp(`piece: "${piece}"`), piece);
  assert.match(hunt, /chromaticsForPieceV146\(/);
  assert.match(hunt, /player\.cloaked \? 1 : state\.camouflageV146/);
  assert.match(hunt, /heavyHitPieceV146\(/);
  assert.match(hunt, /wearV146: \{ heavyPieces/);
  assert.match(hunt, /lightColorV146\(appearance, "laser"/);
  assert.match(hunt, /drawMarksV146\(/);
  assert.match(hunt, /drawSkinPatternV146\(context, assets\.hunterBodyParts\[partId\]/);
  assert.match(hunt, /drawSkinPatternV146\(context, assets\.hunterBodyFull/);
  assert.match(preview, /piece=\{pieceForArmorSlotV146\(slot\.id\)\}/);
  assert.match(preview, /SkinPatternSurfaceV146/);
  assert.match(preview, /HunterMarksOverlayV146/);
  assert.match(home, /clanNpcPiecesV146\(/);
  assert.match(client, /<HunterPieceForgeV146/);
  assert.match(client, /campaignAppearanceV146\(activeMissionSave\)/);
  assert.match(client, /ClanPaletteContextV146\.Provider/);
});
