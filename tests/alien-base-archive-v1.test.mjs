import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const file = new URL("../app/game/alienBaseArchiveV1.ts", import.meta.url);
const source = readFileSync(file, "utf8");
const bestiary = readFileSync(new URL("../app/game/EnemyBestiaryV8.tsx", import.meta.url), "utf8");
const ui = readFileSync(new URL("../app/game/AlienBaseArchiveV1.tsx", import.meta.url), "utf8");
test("Six distinct film lifecycle identities and no gameplay admission", () => {
  const ids = [...source.matchAll(/"id": "(bio\\.xenomorph\\.[a-z0-9-]+)"/g)].map(m => m[1]);
  assert.equal(ids.length, 6);
  assert.equal(new Set(ids).size, 6);
  for (const id of ["ovomorph", "facehugger", "chestburster", "drone", "warrior", "queen"])
    assert.ok(ids.includes("bio.xenomorph." + id));
  assert.equal((source.match(/"encounterId": null/g)||[]).length, 6);
  assert.equal((source.match(/"status": "reference-only"/g)||[]).length, 6);
});
test("The ecological bestiary shows documents without changing its ecology/admissions", () => {
  assert.ok(bestiary.includes("<AlienBaseArchiveV1 />"));
  assert.ok(bestiary.includes("ecologyV8ForPlanet(planet.id)"));
  assert.ok(ui.includes("ALIEN_BASE_ARCHIVE_V1.map"));
  assert.ok(!/setDiscoveredEnemyIds|unlockEnemy|spawnEnemy/.test(ui));
});
