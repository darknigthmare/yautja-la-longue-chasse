import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const modules = await build({
  stdin: { contents: "export * from './app/game/pitAnimationSamples.ts'; export * from './app/game/pitFighterAnimation.ts';", resolveDir: process.cwd() },
  bundle: true, format: "esm", platform: "node", write: false,
}).then((result) => import("data:text/javascript;base64," + Buffer.from(result.outputFiles[0].text).toString("base64")));

for (const id of ["jungle-hunter", "berserker"]) {
  test(id + " atelier samples expose actual action phases and combat reactions", () => {
    for (const action of ["light", "medium", "heavy", "technique", "throw"]) {
      const samples = modules.createPitAnimationSamples(id, action);
      assert.ok(samples.some(({ fighter }) => fighter.phase === "startup"), action);
      assert.ok(samples.some(({ fighter }) => fighter.phase === "active"), action);
      assert.ok(samples.some(({ fighter }) => fighter.phase === "recovery"), action);
    }
    for (const action of ["hitstun", "blockstun", "knockdown"]) {
      const samples = modules.createPitAnimationSamples(id, action);
      assert.ok(samples.some(({ fighter }) => fighter.phase === action), action);
    }
    const knockout = modules.createPitAnimationSamples(id, "ko");
    assert.ok(knockout.some(({ fighter }) => fighter.health === 0));
    assert.equal(modules.resolvePitFighterAnimation(knockout.at(-1).fighter, knockout.at(-1).frame).motion, "ko");
  });
  test(id + " atelier sequences are repeatable and expose both vertical phases", () => {
    for (const [action] of modules.PIT_ANIMATION_SAMPLES) {
      const first = modules.createPitAnimationSamples(id, action);
      assert.ok(first.length > 0);
      assert.deepEqual(first, modules.createPitAnimationSamples(id, action));
    }
    assert.ok(modules.createPitAnimationSamples(id, "jump").some(({ fighter }) => fighter.velocityY > 0 && !fighter.grounded));
    assert.ok(modules.createPitAnimationSamples(id, "fall").some(({ fighter }) => fighter.velocityY < 0 && !fighter.grounded));
  });
}
