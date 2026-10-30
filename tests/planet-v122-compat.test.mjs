import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {
  DEFAULT_WAR_PLANET_RECIPE_V103, generateWarPlanetV103,
} from "../app/game/systems/clanWarPlanetGeneratorV103.ts";
import {
  DEFAULT_WAR_PLANET_RECIPE_V115, generateWarPlanetV115,
} from "../app/game/systems/clanWarPlanetGeneratorV115.ts";
import {analyzeWarPlanetStrategyV114} from "../app/game/systems/clanWarPlanetStrategyV114.ts";
import {warDeploymentV103, } from "../app/game/systems/clanWarDeploymentV103.ts";
import {createWarSimulationV85} from "../app/game/systems/clanWarV85.ts";

test("V122: legacy V103 worlds keep their original topology and unitless distances",()=>{
  const older=generateWarPlanetV103({...DEFAULT_WAR_PLANET_RECIPE_V103});
  const analysis=analyzeWarPlanetStrategyV114(older);
  assert.equal(older.procedural.recipe.version,103);
  assert.equal(analysis.headquartersDistanceKm,undefined);
  assert.ok(analysis.headquartersDistance>=0);
  const deployment=warDeploymentV103(older);
  assert.ok(deployment.combatants.length>0);
});

test("V122: V115 physical worlds retain scale, shape and distinct km distances",()=>{
  const newer=generateWarPlanetV115({...DEFAULT_WAR_PLANET_RECIPE_V115});
  const analysis=analyzeWarPlanetStrategyV114(newer);
  assert.equal(newer.procedural.recipe.version,115);
  assert.ok(newer.procedural.physical.radiusKm>0);
  assert.ok(newer.procedural.shapes.island.length>0);
  assert.ok(newer.procedural.materialDiversity.land.length>0);
  assert.equal(typeof analysis.headquartersDistanceKm,"number");
  assert.ok(Number.isFinite(analysis.headquartersDistanceKm));
  assert.ok(analysis.headquartersDistanceKm>=0);
  assert.ok(analysis.headquartersPath.length>0);
  const deployment=warDeploymentV103(newer);
  assert.ok(deployment.combatants.length>0);
  const save=createWarSimulationV85(8507,newer.id);
  assert.equal(save.planetId,newer.id);
  assert.ok(Object.keys(save.territories).length>0);
  assert.ok(save.combatants.length>0);
});

test("V122: editor discriminates V115 before reading physical, shapes and detail materials",()=>{
  const source=readFileSync(new URL("../app/game/PlanetGeneratorV103.tsx",import.meta.url),"utf8");
  assert.match(source,/"physical" in details && "shapes" in details && "materialDiversity" in details/);
  assert.match(source,/details\.recipe\.version === 115/);
});
