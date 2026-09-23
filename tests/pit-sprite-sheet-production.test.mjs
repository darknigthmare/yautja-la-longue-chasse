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
  const ahab = report.clips.filter(clip => clip.fighterId === "user-ahab");
  assert.deepEqual(ahab.map(clip => [clip.variantId, clip.clipId, clip.facing, clip.drawnCells, clip.ready]), [
    ["ahab-avec-casque-0c8ceb1c95", "idle", "right", 2, true],
    ["ahab-avec-casque-0c8ceb1c95", "high-guard", "right", 2, true],
  ], "Only the reviewed masked/right drawings may count as Ahab coverage");
  const ahabPage = report.pages.find(page => page.fighterId === "user-ahab");
  assert.equal(ahabPage.sourceSha256, "bfe5e04dd61416c611de0d304b7ac74383437075240ed0c766edae3ada5364c7");
  assert.equal(ahabPage.alphaNoisePixels, 36579);
  assert.equal(ahabPage.keyedPixels, 0);
  assert.equal(ahabPage.distinctDrawings, 4);
  assert(ahabPage.cells.every(cell => cell.borderPixels === 0));
  const city = report.clips.filter(clip => clip.fighterId === "city-hunter");
  assert.equal(city.length, 10);
  assert.equal(city.filter(clip => clip.clipId === "high-guard" && clip.facing === "right" && clip.ready).length, 1);
  assert.equal(city.filter(clip => clip.clipId === "high-guard" && clip.facing === "left" && clip.ready).length, 1, "Left guard requires its own authored atlas");
  const wolf = report.clips.filter(clip => clip.fighterId === "wolf");
  assert.equal(wolf.length, 17);
  assert.equal(wolf.some(clip => clip.clipId === "walk" || clip.clipId === "walk-backward" || clip.clipId.startsWith("pit.stand.medium")), false);
  assert.equal(wolf.filter(clip => clip.clipId.startsWith("pit.stand.heavy")).length, 3);
  assert.ok(wolf.filter(clip => clip.clipId.startsWith("pit.stand.heavy")).every(clip => clip.facing === "left"));
  assert.equal(report.clips.filter(clip => clip.fighterId === "feral-hunter").length, 30);
  assert.equal(report.clips.filter(clip => clip.fighterId === "scar").length, 30);
  assert.equal(report.clips.filter(clip => clip.fighterId === "celtic").length, 28);
  assert.equal(report.clips.some(clip => clip.fighterId === "celtic" && clip.clipId === "walk"), false, "Rejected forward gait must remain absent");
  assert.equal(report.clips.filter(clip => clip.fighterId === "tracker").length, 30);
  assert.equal(report.clips.filter(clip => clip.fighterId === "greyback").length, 28);
  assert.equal(report.clips.filter(clip => clip.fighterId === "theta").length, 26);
  assert.equal(report.clips.filter(clip => clip.fighterId === "machiko-noguchi").length, 26);
  assert.equal(report.clips.filter(clip => clip.fighterId === "jungle-hunter" && clip.clipId === "walk-backward").length, 1);
  const berserker = report.clips.filter(clip => clip.fighterId === "berserker");
  assert.equal(berserker.length, 28);
  assert.equal(berserker.filter(clip => clip.clipId === "pit.stand.hitstun" && clip.ready && clip.drawnCells === 4).length, 2);
  assert.equal(berserker.some(clip => clip.clipId === "walk"), false, "Rejected forward walking must not become coverage");
  for (const facing of ["right", "left"]) for (const clipId of ["crouch", "high-guard", "walk-backward", "pit.stand.medium.startup", "pit.stand.medium.active", "pit.stand.medium.recovery", "pit.stand.heavy.startup", "pit.stand.heavy.active", "pit.stand.heavy.recovery"]) {
    assert.ok(berserker.some(clip => clip.facing === facing && clip.clipId === clipId && clip.ready));
  }
  for (const fighterId of report.historicalFighters) for (const facing of ["right", "left"]) {
    for (const clipId of ["idle", "pit.stand.light.startup", "pit.stand.light.active", "pit.stand.light.recovery"]) {
      assert.ok(report.clips.some(clip => clip.fighterId === fighterId && clip.facing === facing && clip.clipId === clipId && clip.ready));
    }
  }
});
