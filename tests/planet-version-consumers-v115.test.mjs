import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";

const bundled=await build({stdin:{contents:`
export * from "./app/game/systems/clanWarPlanetGeneratorV103";
export * from "./app/game/systems/clanWarPlanetGeneratorV115";
export * from "./app/game/systems/clanWarShapeAtlasV115";
export * from "./app/game/systems/clanWarPlanetStrategyV114";
export * from "./app/game/systems/clanWarDeploymentV103";
export * from "./app/game/systems/clanWarV85";
`,resolveDir:process.cwd(),loader:"ts"},bundle:true,write:false,format:"esm",platform:"node",target:"es2022",logLevel:"silent"});
const api=await import("data:text/javascript;base64,"+Buffer.from(bundled.outputFiles[0].text).toString("base64"));

test("V103 public strategy and deployment retain their original recipe and angular-only distance contract",()=>{
  const recipe=api.normalizeWarPlanetRecipeV103({seed:115114,territoryCount:18,regionCount:3,landform:"archipelago"});
  const planet=api.generateWarPlanetV103(recipe),before=JSON.stringify(planet);
  const dossier=api.analyzeWarPlanetStrategyV114(planet);
  assert.deepEqual(dossier.headquarters,planet.procedural.strategy.headquarters);
  assert.equal(dossier.topology,"insular");
  assert.ok(dossier.headquartersPath.length>1);
  assert.equal(Object.hasOwn(dossier,"headquartersDistanceKm"),false);
  const simulation=api.createWarSimulationV85(undefined,planet.id);
  assert.deepEqual(simulation.combatants,api.warDeploymentV103(planet).combatants);
  assert.equal(simulation.seed,planet.seed);
  assert.equal(JSON.stringify(planet),before);
  assert.deepEqual(planet.procedural.recipe,recipe);
});

test("every V115 physical size reaches the shared strategy and deployment consumers without rewriting its version",()=>{
  for(const [planetSize,radius] of Object.entries(api.PLANET_RADII_KM_V115)){
    const recipe=api.normalizeWarPlanetRecipeV115({seed:115114,territoryCount:18,regionCount:3,landform:"archipelago",planetSize});
    const planet=api.generateWarPlanetV115(recipe),before=JSON.stringify(planet);
    const dossier=api.analyzeWarPlanetStrategyV114(planet);
    assert.equal(dossier.topology,"insular");
    assert.deepEqual(dossier.headquarters,planet.procedural.strategy.headquarters);
    assert.ok(dossier.headquartersPath.length>1);
    let degrees=0;
    for(let index=1;index<dossier.headquartersPath.length;index++){
      const a=dossier.headquartersPath[index-1],b=dossier.headquartersPath[index];
      assert.ok(planet.definitions.find(site=>site.id===a)?.neighbors.includes(b));
      const route=planet.procedural.routes.find(route=>(route.fromId===a&&route.toId===b)||(route.fromId===b&&route.toId===a));
      assert.ok(route,"each headquarters-path edge has an actual angular route");
      degrees+=route.distanceDegrees;
    }
    assert.equal(dossier.headquartersDistanceKm,Math.round(degrees*Math.PI/180*radius),planetSize);
    const simulation=api.createWarSimulationV85(undefined,planet.id);
    assert.equal(simulation.planetId,planet.id);
    assert.deepEqual(simulation.combatants,api.warDeploymentV103(planet).combatants);
    assert.ok(simulation.combatants.some(actor=>actor.factionId==="CON-F01"));
    assert.ok(simulation.combatants.some(actor=>actor.factionId==="CON-F02"));
    assert.equal(simulation.seed,planet.seed);
    assert.equal(JSON.stringify(planet),before);
    assert.deepEqual(planet.procedural.recipe,recipe);
    assert.equal(planet.procedural.physical.radiusKm,radius);
  }
});

test("deployment reads only its public graph/strategy contract and keeps V115 render/physical metadata irrelevant",()=>{
  const recipe=api.normalizeWarPlanetRecipeV115({seed:115143,territoryCount:18,regionCount:3,planetSize:"giant",landMaterial:15,liquidMaterial:14});
  const planet=api.generateWarPlanetV115(recipe);
  const source={definitions:planet.definitions,regions:planet.regions,territories:planet.territories,
    procedural:{strategy:planet.procedural.strategy}};
  const before=JSON.stringify(source);
  assert.deepEqual(api.warDeploymentV103(source),api.warDeploymentV103(planet));
  assert.equal(JSON.stringify(source),before);
  assert.equal(Object.hasOwn(source.procedural,"recipe"),false);
});
