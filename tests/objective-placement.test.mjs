import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import test, { after } from "node:test";
import { build } from "vite";

const projectRoot = resolve(import.meta.dirname, "..");
const outputDirectory = await mkdtemp(join(tmpdir(), "yautja-objectives-"));

after(async () => {
  await rm(outputDirectory, { recursive: true, force: true });
});

await build({
  configFile: false,
  logLevel: "silent",
  publicDir: false,
  build: {
    emptyOutDir: true,
    outDir: outputDirectory,
    ssr: resolve(projectRoot, "app/game/systems/worldBlueprints.ts"),
    rollupOptions: { output: { entryFileNames: "world-blueprints.mjs" } },
  },
});

const {
  hazardPhaseAt,
  isHazardActive,
  safeObjectiveGroundPositions,
  worldBlueprintFor,
} = await import(
  pathToFileURL(join(outputDirectory, "world-blueprints.mjs")).href
);

const missionIds = [
  "jungle-vey",
  "ice-cryostalker",
  "volcano-bad-blood",
  "swamp-hydra",
  "desert-sandmaw",
  "ocean-leviathan",
  "fungal-hivemind",
  "ruins-ancient-guardian",
];

test("recoverable mission objects receive distinct hazard-free ground slots", () => {
  for (const missionId of missionIds) {
    const world = worldBlueprintFor(missionId);
    const minX = world.width * 0.44;
    const maxX = Math.max(minX, world.bossArena.x - 420);
    const positions = safeObjectiveGroundPositions(world, 2, { minX, maxX });

    assert.equal(positions.length, 2, missionId);
    assert.equal(new Set(positions).size, 2, missionId);
    for (const x of positions) {
      assert.ok(x >= minX && x <= maxX, `${missionId}: ${x} out of corridor`);
      assert.ok(
        world.hazards.every(
          (hazard) => x < hazard.x - 36 || x > hazard.x + hazard.width + 36,
        ),
        `${missionId}: ${x} overlaps a hazard`,
      );
      assert.equal(
        world.hazards.some((hazard) => isHazardActive(hazard, 0) && x >= hazard.x && x <= hazard.x + hazard.width),
        false,
        `${missionId}: ${x} starts in active danger`,
      );
    }
  }
});

test("HuntCanvas keeps recovery objects and purge consoles within ground interaction reach", async () => {
  const source = await readFile(
    resolve(projectRoot, "app/game/HuntCanvas.tsx"),
    "utf8",
  );

  assert.match(source, /safeObjectiveGroundPositions\(/);
  assert.match(source, /x: recoveryNodeXs\[index\],[\s\S]*?y: FLOOR_Y - 34/);
  assert.doesNotMatch(source, /id: "purge-b"[\s\S]{0,160}?y: 365/);
  assert.match(source, /id: "purge-b"[\s\S]{0,160}?y: FLOOR_Y - 46/);
});

test("cyclic hazards expose a warning phase before damage begins", async () => {
  const hazard = {
    id: "warning-probe",
    kind: "falling-ice",
    routeId: "ground",
    x: 100,
    y: 400,
    width: 80,
    height: 40,
    damagePerSecond: 12,
    telegraphSeconds: 1.5,
    cycle: {
      periodSeconds: 8,
      activeSeconds: 2,
      phaseSeconds: 0,
    },
  };

  assert.equal(hazardPhaseAt(hazard, 2), "inactive");
  assert.equal(hazardPhaseAt(hazard, 6.49), "inactive");
  assert.equal(hazardPhaseAt(hazard, 6.5), "telegraph");
  assert.equal(isHazardActive(hazard, 6.5), false);
  assert.equal(hazardPhaseAt(hazard, 7.99), "telegraph");
  assert.equal(hazardPhaseAt(hazard, 8), "active");
  assert.equal(isHazardActive(hazard, 8), true);

  const source = await readFile(
    resolve(projectRoot, "app/game/HuntCanvas.tsx"),
    "utf8",
  );
  assert.match(source, /const hazardPhase = hazardPhaseAt\(hazard, state\.elapsed\)/);
  assert.match(source, /hazardPhase === "telegraph"/);
});
