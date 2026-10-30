import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";

const built=await build({
 stdin:{contents:[
  "export * from './app/game/systems/clanWarEarthMetricV127';",
  "export * from './app/game/systems/clanWarEncounterDirectorV127';",
  "export * from './app/game/systems/clanWarEarthV126';",
  "export * from './app/game/systems/clanWarWorldClimateV126';",
  "export * from './app/game/systems/clanWarEnemyProfilesV126';",
 ].join("\n"),resolveDir:process.cwd()},
 bundle:true,write:false,platform:"node",format:"esm",target:"es2022",logLevel:"silent",
});
const v=await import("data:text/javascript;base64,"+Buffer.from(built.outputFiles[0].text).toString("base64"));
const scenes=v.CLAN_WAR_COHERENT_VARIANTS_V126;

test("ECEF WGS84 equatorial radius, poles, real metric axes and local inverse",()=>{
 const origin={lat:0,lon:0,altitudeMetres:0};
 const ecef=v.earthToEcefV127(origin);
 assert.ok(ecef);
 assert.ok(Math.abs(ecef.x-6378137)<0.00001);
 assert.ok(Math.abs(ecef.y)<1e-8&&Math.abs(ecef.z)<1e-8);
 const pole=v.earthToEcefV127({...origin,lat:90});
 assert.ok(Math.abs(pole.z-6356752.314245)<.01);
 const oneEast=v.earthToLocalEnuV127(origin,{...origin,lon:0.00001});
 assert.ok(oneEast.east>1.11&&oneEast.east<1.12);
 assert.ok(Math.abs(oneEast.north)<1e-5);
 const reversed=v.localEnuToEarthV127(origin,oneEast);
 assert.ok(reversed);
 assert.ok(Math.abs(reversed.lon-0.00001)<1e-7);
 assert.ok(Math.abs(reversed.lat)<1e-7);
 assert.equal(v.earthToEcefV127({lat:91,lon:0,altitudeMetres:0}),null);
 assert.equal(v.localEnuToEarthV127(origin,{east:Infinity,north:0,up:0}),null);
});

test("ellipsoid geodesic keeps real units, dateline and Earth locations",()=>{
 const a={lat:0,lon:0},b={lat:0,lon:1};
 const d=v.earthGeodesicMetresV127(a,b);
 assert.ok(d>111300&&d<111350);
 assert.equal(v.earthGeodesicMetresV127(a,a),0);
 const cross=v.earthGeodesicMetresV127({lat:15,lon:179.9},{lat:15,lon:-179.9});
 assert.ok(cross>20000&&cross<22000);
 const losAngeles=v.EARTH_FILM_SITES_V126.find(s=>s.id==="earth-predator2-la");
 const gunnison=v.EARTH_FILM_SITES_V126.find(s=>s.id==="earth-avpr-gunnison");
 const distance=v.earthGeodesicMetresV127(losAngeles,gunnison);
 assert.ok(distance>1000000&&distance<1400000);
 assert.equal(v.earthGeodesicMetresV127({lat:91,lon:0},a),null);
});

test("film site anchors never claim exact scene or invented street/elevation geometry",()=>{
 const report=v.auditEarthMetricV127();
 assert.deepEqual(report.issues,[]);
 assert.equal(report.localStreetScenesCompleted,0);
 assert.equal(v.EARTH_FILM_SCENE_ANCHORS_V127.length,3);
 const losAngeles=v.EARTH_FILM_SITES_V126.find(s=>s.id==="earth-predator2-la");
 const anchor=v.earthSceneAnchorV127(losAngeles);
 assert.equal(anchor.precision,"city-reference");
 assert.equal(anchor.accuracyMetres,null);
 assert.equal(anchor.roadGeometry,"unavailable");
 assert.equal(anchor.sceneTerrain,"unavailable");
 assert.equal(v.earthSceneAnchorV127(v.EARTH_FILM_SITES_V126.find(s=>s.id==="offearth-badlands")),null);
 assert.equal(v.earthSceneAnchorV127(v.EARTH_FILM_SITES_V126.find(s=>s.id==="earth-prey-plains")),null);
 assert.ok(v.EARTH_LOCAL_ASSET_GATES_V127.length>=6);
});

test("all 1200 variants x five AI profiles have four complete staged scene regions",()=>{
 const audit=v.auditWarEncounterSubVariantsV127();
 assert.equal(audit.sourceMissions,1200);
 assert.equal(audit.subVariants,6000);
 assert.equal(audit.sceneSections,24000);
 assert.deepEqual(audit.errors,[]);
 const all=scenes.slice(0,40).flatMap(s=>v.warEncounterSubVariantsV127(s));
 assert.equal(all.length,200);
 for(const plan of all){
  assert.equal(plan.status,"design-only");
  assert.equal(plan.phaseCount,4);
  assert.equal(plan.sections.length,4);
  assert.deepEqual(plan.sections.map(s=>s.part),[
   "accès à reconnaissance limitée","flanc derrière un couvert",
   "nœud de l'objectif","issue de repli contrôlée"]);
  assert.ok(plan.sections.every(s=>s.dimensions==="source-scale-unverified"&&s.weatherAllowed));
  assert.ok(plan.enemyWaves.every(w=>w.exactTeams>0&&w.exactCombatants>0));
  assert.ok(plan.victoryConditions.length>=3);
  assert.ok(plan.failureConditions.length>=3);
  assert.ok(plan.tactics.powerFailure.includes("grille")||plan.tactics.powerFailure.includes("échéance"));
 }
});

test("enemy plans respect fog-of-war and don't pretend Outer Ops reports reveal the enemy beforehand",()=>{
 const outer=scenes.find(s=>s.mode==="outer");
 const profile=v.buildWarEncounterSubVariantV127(outer,3,1);
 assert.equal(profile.enemyWaves.length,0);
 assert.equal(profile.maximumVisibleEnemies,0);
 assert.ok(profile.hiddenOuterEstimate!==null);
 assert.ok(profile.warnings.some(w=>w.includes("Adversaires non révélés")));
 const stealth=scenes.find(s=>s.mode==="stealth");
 const sneaky=v.buildWarEncounterSubVariantV127(stealth,4);
 assert.ok(sneaky.enemyWaves.length>0);
 assert.ok(sneaky.enemyWaves.every(w=>w.phase!=="recon"||w.trigger==="initial-garrison"));
 assert.ok(sneaky.enemyWaves.filter(w=>w.phase==="engage").every(w=>w.trigger==="alarm-threshold"));
 assert.deepEqual(v.buildWarEncounterSubVariantV127(stealth,4),sneaky);
});

test("no ice hazard in a hot desert, snow only in cold/seasonal zones, ground surfaces remain coherent",()=>{
 const desert=scenes.find(s=>s.original.referenceName==="Erg Chebbi");
 assert.ok(desert);
 assert.equal(desert.geography.worldKind,"earth");
 assert.equal(desert.environment.climate,"hot-desert");
 for(const scenario of v.warEncounterSubVariantsV127(desert)){
  assert.ok(scenario.sections.every(s=>s.weatherAllowed&&!s.naturalSnow));
  assert.ok(scenario.sections.every(s=>!s.weather.includes("blizzard")));
  assert.ok(scenario.sections.every(s=>s.fluid.includes("eau permanente")||s.fluid.includes("oasis")));
 }
 const polar=scenes.find(s=>s.original.referenceName==="Glacier d'Ilulissat");
 assert.ok(polar);
 assert.equal(polar.environment.allowsNaturalSnow,true);
 for(const scenario of v.warEncounterSubVariantsV127(polar))
  assert.ok(scenario.sections.every(s=>s.naturalSnow));
});

test("no human/civilian targets automatically become enemy units in Earth homages",()=>{
 const earth=scenes.find(s=>s.geography.worldKind==="earth"&&s.mode==="rts");
 const alien=scenes.find(s=>s.geography.worldKind==="original-alien"&&s.mode==="rts");
 const e=v.buildWarEncounterSubVariantV127(earth,2);
 const a=v.buildWarEncounterSubVariantV127(alien,2);
 assert.equal(e.tactics.neutralActors,"noncombatants-possible");
 assert.equal(e.tactics.enemyFaction,"rival-yautja-fan-fiction");
 assert.equal(a.tactics.enemyFaction,"rival-yautja-fan-fiction");
 assert.ok(e.enemyWaves.every(x=>/^W3-U\d{2}$/.test(x.unitId)));
 assert.ok(!e.enemyWaves.some(x=>x.role==="human"||x.role==="xenomorph"));
 assert.equal(e.worldId,"earth");
 assert.ok(e.warnings.some(w=>w.includes("Conflit de clan sur Terre")));
});
