import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_WAR_PLANET_RECIPE_V103, generateWarPlanetV103 } from "../app/game/systems/clanWarPlanetGeneratorV103.ts";
import { DEFAULT_WAR_PLANET_RECIPE_V115, generateWarPlanetV115 } from "../app/game/systems/clanWarPlanetGeneratorV115.ts";
import { analyzeWarPlanetStrategyV114 } from "../app/game/systems/clanWarPlanetStrategyV114.ts";
import { warDeploymentV103 } from "../app/game/systems/clanWarDeploymentV103.ts";

test("V122 V103 and V115 share deployment semantics without recipe conversion", () => {
  const old = generateWarPlanetV103({ ...DEFAULT_WAR_PLANET_RECIPE_V103, seed: 11220001 });
  const newer = generateWarPlanetV115({ ...DEFAULT_WAR_PLANET_RECIPE_V115, seed: 11220001 });
  assert.equal(old.procedural.recipe.version, 103);
  assert.equal(newer.procedural.recipe.version, 115);
  for (const world of [old, newer]) {
    const deployment = warDeploymentV103(world);
    const dossier = analyzeWarPlanetStrategyV114(world);
    assert.ok(deployment.combatants.length > 0);
    assert.ok(deployment.forceCount > 0);
    assert.ok(dossier.headquartersPath.length > 1);
    assert.equal(dossier.territoryCount, world.territories.length);
  }
  const oldDossier = analyzeWarPlanetStrategyV114(old);
  const newDossier = analyzeWarPlanetStrategyV114(newer);
  assert.equal(oldDossier.headquartersDistanceKm, undefined, "V103 never gains guessed kilometers");
  assert.ok(Number.isFinite(newDossier.headquartersDistanceKm));
  assert.ok(newDossier.headquartersDistanceKm > 0);
});
