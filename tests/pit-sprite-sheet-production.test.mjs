import assert from "node:assert/strict";
import test from "node:test";
import { auditPitSpriteSheetProduction } from "./helpers/pit-sprite-sheet-production.mjs";

test("real V32 PNGs prepare as distinct transparent cells and every registered facing/phase resolves in the combat renderer", async () => {
  const report = await auditPitSpriteSheetProduction();
  assert.equal(report.status, "PASS");
  assert.deepEqual(new Set(report.fighters), new Set(["jungle-hunter", "city-hunter"]));
  assert.ok(report.pageCount >= 4);
  assert.ok(report.distinctDrawings >= 32);
  assert.ok(report.readyPhaseClips >= 16);
  for (const fighterId of report.fighters) for (const facing of ["right", "left"]) {
    for (const clipId of ["idle", "pit.stand.light.startup", "pit.stand.light.active", "pit.stand.light.recovery"]) {
      assert.ok(report.clips.some(clip => clip.fighterId === fighterId && clip.facing === facing && clip.clipId === clipId && clip.ready));
    }
  }
});
