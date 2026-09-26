import assert from "node:assert/strict";
import test from "node:test";
import { auditPitSpriteSheetProduction } from "./helpers/pit-sprite-sheet-production.mjs";

test("real registered PNGs prepare as distinct transparent cells and every registered facing/phase resolves in the combat renderer", async () => {
  const report = await auditPitSpriteSheetProduction();
  assert.equal(report.status, "PASS");
  assert.deepEqual(new Set(report.historicalFighters), new Set(["jungle-hunter", "city-hunter", "berserker", "wolf", "feral-hunter", "scar", "celtic", "tracker", "greyback", "theta", "machiko-noguchi"]));
  assert.ok(report.pageCount >= 11);
  assert.ok(report.distinctDrawings >= 86);
  assert.ok(report.readyPhaseClips >= 42);
  const historicalClips = report.clips.filter(clip => clip.variantId === null);
  const v50Clips = report.clips.filter(clip => clip.atlasId.endsWith("-v50"));
  const ahab = report.clips.filter(clip => clip.fighterId === "user-ahab" && !clip.atlasId.endsWith("-v50"));
  const ahabExpected = ["idle", "high-guard", "pit.stand.light.startup", "pit.stand.light.active", "pit.stand.light.recovery"];
  assert.deepEqual(ahab.map(clip => [clip.variantId, clip.clipId, clip.facing, clip.ready].join(":" )).sort(),
    ahabExpected.flatMap(id => ["right", "left"].map(facing => ["ahab-avec-casque-0c8ceb1c95", id, facing, true].join(":"))).sort(),
    "V45/V49 masked native idle, guard and complete light attacks remain unchanged");
  for (const facing of ["right", "left"]) {
    assert.deepEqual(ahab.filter(clip => clip.facing === facing && clip.clipId.startsWith("pit.stand.light.")).map(clip => clip.drawnCells), [1, 1, 2]);
    assert.equal(ahab.find(clip => clip.facing === facing && clip.clipId === "idle").drawnCells, 2);
    assert.equal(ahab.find(clip => clip.facing === facing && clip.clipId === "high-guard").drawnCells, 2);
  }
  const newAhabPages = report.pages.filter(page => page.fighterId === "user-ahab" && page.src.includes("/v49/"));
  assert.equal(newAhabPages.length, 3);
  assert.equal(newAhabPages.reduce((count, page) => count + page.distinctDrawings, 0), 12);
  assert(newAhabPages.every(page => page.sourceHasAlpha && page.keyedPixels === 0 && page.cells.every(cell => cell.borderPixels === 0)));
  const ahabPage = report.pages.find(page => page.fighterId === "user-ahab");
  assert.equal(ahabPage.sourceSha256, "bfe5e04dd61416c611de0d304b7ac74383437075240ed0c766edae3ada5364c7");
  assert.equal(ahabPage.alphaNoisePixels, 36579);
  assert.equal(ahabPage.keyedPixels, 0);
  assert.equal(ahabPage.distinctDrawings, 4);
  assert(ahabPage.cells.every(cell => cell.borderPixels === 0));
  const v50Variants = new Map([
    ["user-ahab", "ahab-avec-casque-0c8ceb1c95"],
    ["wolf", "wolf-avec-casque-4261aca172"],
    ["falconer", "falconer-avec-casque-f5618ed362"],
    ["scarface", "scarface-avec-casque-bca00052d4"],
    ["enforcer", "enforcer-avec-casque-ca164d8925"],
    ["celtic", "celtic-avec-casque-0764ed4b53"],
  ]);
  assert.equal(v50Clips.filter(clip => clip.fighterId === "user-ahab").length, 8,
    "Ahab adds only the reviewed masked crouch and three jump phases in both native orientations");
  assert.deepEqual([...new Set(v50Clips.map(clip => clip.fighterId))].sort(), [...v50Variants.keys()].sort(),
    "All six reviewed V50 masked fighters must be registered");
  for (const fighterId of new Set(v50Clips.map(clip => clip.fighterId))) {
    assert.ok(v50Variants.has(fighterId), "Only the reviewed V50 fighter lot may gain coverage");
    const variantId = v50Variants.get(fighterId);
    const clips = v50Clips.filter(clip => clip.fighterId === fighterId);
    const expectedIds = ["pit.air.jump.rise", "pit.air.jump.apex", "pit.air.jump.fall"];
    if (fighterId === "user-ahab") expectedIds.unshift("crouch");
    assert.deepEqual(clips.map(clip => [clip.variantId, clip.clipId, clip.facing, clip.ready].join(":" )).sort(),
      expectedIds.flatMap(id => ["right", "left"].map(facing => [variantId, id, facing, true].join(":"))).sort(),
      fighterId + " V50 coverage belongs only to its exact supplied masked appearance");
    for (const clip of clips) {
      const airborne = clip.clipId.startsWith("pit.air.jump.");
      assert.equal(clip.runtimePosture, airborne ? "air" : "crouch");
      assert.equal(clip.runtimePhase, airborne ? "locomotion" : "hold");
      assert.equal(clip.runtimePhaseTicks, null);
      const drawnCells = clip.clipId.endsWith("rise") || (clip.clipId.endsWith("fall") && fighterId !== "user-ahab") ? 2 : 1;
      assert.equal(clip.drawnCells, drawnCells, fighterId + " " + clip.clipId + " authored frame count");
    }
    const pages = report.pages.filter(page => page.fighterId === fighterId && page.src.includes("/v50/"));
    assert.ok(pages.length > 0);
    assert.ok(pages.every(page => page.variantId === variantId && page.sourceHasAlpha && page.keyedPixels === 0));
    const drawings = new Set(pages.flatMap(page => page.cells.map(cell => cell.sha256)));
    assert.equal(drawings.size, fighterId === "user-ahab" ? 6 : 8,
      "Clip reuse must not inflate the number of distinct V50 drawings");
  }
  const presentationClips = report.clips.filter(clip => clip.clipId.startsWith("pit.presentation."));
  const v51PresentationClips = presentationClips.filter(clip => clip.atlasId.endsWith("-v51"));
  const v52PresentationClips = presentationClips.filter(clip => clip.atlasId.endsWith("-v52"));
  assert.deepEqual(v51PresentationClips.map(clip => [clip.fighterId, clip.variantId, clip.atlasId, clip.clipId, clip.facing, clip.drawnCells, clip.ready].join(":" )).sort(),
    ["intro", "victory", "defeat"].flatMap(kind => ["right", "left"].map(facing =>
      ["jungle-hunter", "jungle-hunter-avec-casque-53f4eb349a", "jungle-hunter-masked-round-presentation-v51", "pit.presentation." + kind, facing, 3, true].join(":"))).sort(),
    "All six dedicated V51 clips belong to the exact reviewed Jungle Hunter appearance");
  const v52Appearances = [["city-hunter", "city-hunter-avec-casque-12136078fe"], ["scar", "scar-avec-casque-6a0a69930d"]];
  assert.deepEqual(v52PresentationClips.map(clip => [clip.fighterId, clip.variantId, clip.atlasId, clip.clipId, clip.facing, clip.drawnCells, clip.ready].join(":" )).sort(),
    v52Appearances.flatMap(([fighterId, variantId]) => ["intro", "victory", "defeat"].flatMap(kind => ["right", "left"].map(facing =>
      [fighterId, variantId, fighterId + "-masked-round-presentation-v52", "pit.presentation." + kind, facing, 3, true].join(":")))).sort(),
    "All twelve V52 ceremonies belong only to their exact supplied masked costumes");
  assert.equal(presentationClips.length, 18);
  assert.equal(report.readyPhaseClips, 333, "V52 adds twelve presentation clips, never new combat attacks");
  assert.equal(report.clips.filter(clip => !clip.clipId.startsWith("pit.presentation.")).length, 315);
  assert.equal(report.pageCount, 116);
  assert.equal(new Set(report.pages.map(page => page.src)).size, 98);
  assert.equal(report.distinctDrawings, 669);
  assert.equal(report.appearances.length, 20);
  assert.equal(report.fighters.length, 15);
  const v51Pages = report.pages.filter(page => page.src.includes("/v51/"));
  assert.equal(v51Pages.length, 6);
  assert.equal(new Set(v51Pages.map(page => page.src)).size, 4);
  assert.equal(new Set(v51Pages.flatMap(page => page.cells.map(cell => cell.sha256))).size, 16,
    "Two neutral references reused in presentation do not inflate distinct drawings");
  assert(v51Pages.every(page => page.variantId === "jungle-hunter-avec-casque-53f4eb349a" && page.sourceHasAlpha && page.keyedPixels === 0));
  const v52Pages = report.pages.filter(page => page.src.includes("/v52/"));
  assert.equal(v52Pages.length, 12);
  assert.equal(new Set(v52Pages.map(page => page.src)).size, 6);
  assert.equal(new Set(v52Pages.flatMap(page => page.cells.map(cell => cell.sha256))).size, 26,
    "Reused presentation stances must not inflate V52 distinct drawings");
  for (const [fighterId, variantId] of v52Appearances) {
    const pages = v52Pages.filter(page => page.fighterId === fighterId);
    assert.equal(new Set(pages.flatMap(page => page.cells.map(cell => cell.sha256))).size, fighterId === "city-hunter" ? 14 : 12);
    assert(pages.every(page => page.variantId === variantId && page.sourceHasAlpha && page.keyedPixels === 0 && page.transparency.noiseFloor === 2));
    assert(pages.every(page => page.cells.every(cell => cell.borderPixels === 0)));
  }
  for (const clip of presentationClips) {
    assert.ok(["intro", "victory", "defeat"].includes(clip.runtimePhase));
    assert.equal(clip.clipId, "pit.presentation." + clip.runtimePhase);
    assert.equal(clip.runtimePosture, "presentation");
    assert.equal(clip.runtimePhaseTicks, null);
    assert.equal(clip.presentationClockOnly, true); assert.equal(clip.physicsUnchanged, true);
    assert.equal(clip.status, "dedicated-animation");
    assert.deepEqual(clip.drawnFrameIndices, Array.from({ length: clip.drawnCells }, (_, index) => index));
    assert.ok(clip.drawnCells >= 2, "A dedicated sequence must contain real changing drawings");
  }
  const city = historicalClips.filter(clip => clip.fighterId === "city-hunter");
  assert.equal(city.length, 10);
  assert.equal(city.filter(clip => clip.clipId === "high-guard" && clip.facing === "right" && clip.ready).length, 1);
  assert.equal(city.filter(clip => clip.clipId === "high-guard" && clip.facing === "left" && clip.ready).length, 1, "Left guard requires its own authored atlas");
  const wolf = historicalClips.filter(clip => clip.fighterId === "wolf");
  assert.equal(wolf.length, 17);
  assert.equal(wolf.some(clip => clip.clipId === "walk" || clip.clipId === "walk-backward" || clip.clipId.startsWith("pit.stand.medium")), false);
  assert.equal(wolf.filter(clip => clip.clipId.startsWith("pit.stand.heavy")).length, 3);
  assert.ok(wolf.filter(clip => clip.clipId.startsWith("pit.stand.heavy")).every(clip => clip.facing === "left"));
  assert.equal(historicalClips.filter(clip => clip.fighterId === "feral-hunter").length, 30);
  assert.equal(historicalClips.filter(clip => clip.fighterId === "scar").length, 30);
  assert.equal(historicalClips.filter(clip => clip.fighterId === "celtic").length, 28);
  assert.equal(historicalClips.some(clip => clip.fighterId === "celtic" && clip.clipId === "walk"), false, "Rejected forward gait must remain absent");
  assert.equal(historicalClips.filter(clip => clip.fighterId === "tracker").length, 30);
  assert.equal(historicalClips.filter(clip => clip.fighterId === "greyback").length, 28);
  assert.equal(historicalClips.filter(clip => clip.fighterId === "theta").length, 26);
  assert.equal(historicalClips.filter(clip => clip.fighterId === "machiko-noguchi").length, 26);
  assert.equal(historicalClips.filter(clip => clip.fighterId === "jungle-hunter" && clip.clipId === "walk-backward").length, 1);
  const berserker = historicalClips.filter(clip => clip.fighterId === "berserker");
  assert.equal(berserker.length, 28);
  assert.equal(berserker.filter(clip => clip.clipId === "pit.stand.hitstun" && clip.ready && clip.drawnCells === 4).length, 2);
  assert.equal(berserker.some(clip => clip.clipId === "walk"), false, "Rejected forward walking must not become coverage");
  for (const facing of ["right", "left"]) for (const clipId of ["crouch", "high-guard", "walk-backward", "pit.stand.medium.startup", "pit.stand.medium.active", "pit.stand.medium.recovery", "pit.stand.heavy.startup", "pit.stand.heavy.active", "pit.stand.heavy.recovery"]) {
    assert.ok(berserker.some(clip => clip.facing === facing && clip.clipId === clipId && clip.ready));
  }
  for (const fighterId of report.historicalFighters) for (const facing of ["right", "left"]) {
    for (const clipId of ["idle", "pit.stand.light.startup", "pit.stand.light.active", "pit.stand.light.recovery"]) {
      assert.ok(historicalClips.some(clip => clip.fighterId === fighterId && clip.facing === facing && clip.clipId === clipId && clip.ready));
    }
  }
});
