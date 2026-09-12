import assert from "node:assert/strict";
import test from "node:test";
import { auditPitSpriteSheetProduction } from "./helpers/pit-sprite-sheet-production.mjs";

test("real V32/V33 PNGs prepare as distinct transparent cells and every registered facing/phase resolves in the combat renderer", async () => {
  const report = await auditPitSpriteSheetProduction();
  assert.equal(report.status, "PASS");
  assert.deepEqual(new Set(report.fighters), new Set(["jungle-hunter", "city-hunter", "berserker", "wolf", "feral-hunter", "scar", "celtic"]));
  assert.ok(report.pageCount >= 11);
  assert.ok(report.distinctDrawings >= 86);
  assert.ok(report.readyPhaseClips >= 42);
  const wolf = report.clips.filter(clip => clip.fighterId === "wolf");
  assert.equal(wolf.length, 17);
  assert.equal(wolf.some(clip => clip.clipId === "walk" || clip.clipId === "walk-backward" || clip.clipId.startsWith("pit.stand.medium")), false);
  assert.equal(wolf.filter(clip => clip.clipId.startsWith("pit.stand.heavy")).length, 3);
  assert.ok(wolf.filter(clip => clip.clipId.startsWith("pit.stand.heavy")).every(clip => clip.facing === "left"));
  assert.equal(report.clips.filter(clip => clip.fighterId === "feral-hunter").length, 30);
  assert.equal(report.clips.filter(clip => clip.fighterId === "scar").length, 28);
  assert.equal(report.clips.filter(clip => clip.fighterId === "celtic").length, 26);
  assert.equal(report.clips.some(clip => clip.fighterId === "celtic" && (clip.clipId === "idle" || clip.clipId === "walk")), false, "Missing idle and rejected forward gait must remain absent");
  const berserker = report.clips.filter(clip => clip.fighterId === "berserker");
  assert.equal(berserker.length, 26);
  assert.equal(berserker.some(clip => clip.clipId === "walk"), false, "Rejected forward walking must not become coverage");
  for (const facing of ["right", "left"]) for (const clipId of ["crouch", "high-guard", "walk-backward", "pit.stand.medium.startup", "pit.stand.medium.active", "pit.stand.medium.recovery", "pit.stand.heavy.startup", "pit.stand.heavy.active", "pit.stand.heavy.recovery"]) {
    assert.ok(berserker.some(clip => clip.facing === facing && clip.clipId === clipId && clip.ready));
  }
  for (const fighterId of report.fighters) for (const facing of ["right", "left"]) {
    for (const clipId of [...(fighterId === "celtic" ? [] : ["idle"]), "pit.stand.light.startup", "pit.stand.light.active", "pit.stand.light.recovery"]) {
      assert.ok(report.clips.some(clip => clip.fighterId === fighterId && clip.facing === facing && clip.clipId === clipId && clip.ready));
    }
  }
});
