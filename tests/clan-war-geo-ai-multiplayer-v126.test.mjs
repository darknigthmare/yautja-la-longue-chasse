import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";

const bundle=await build({
 stdin:{contents:[
  "export * from './app/game/systems/clanWarEarthV126';",
  "export * from './app/game/systems/clanWarWorldClimateV126';",
  "export * from './app/game/systems/clanWarEnemyProfilesV126';",
  "export * from './app/game/systems/clanWarMultiplayerV126';",
  "export * from './app/game/systems/clanWarVariantAtlasV120';",
 ].join("\n"),resolveDir:process.cwd()},
 bundle:true,write:false,format:"esm",platform:"node",target:"es2022",logLevel:"silent",
});
const m=await import("data:text/javascript;base64,"+Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const scenes=m.CLAN_WAR_COHERENT_VARIANTS_V126;

test("Earth WGS84 coastlines are real and expected Predator landmarks belong to Earth only",()=>{
 const report=m.auditEarthFilmSitesV126();
 assert.deepEqual(report.issues,[]);
 assert.ok(report.pinned>=3);
 assert.equal(m.EARTH_WORLD_ID_V126,"earth");
 assert.ok(m.EARTH_WGS84_V126.coastlineSource.includes("Natural Earth"));
 assert.equal(m.EARTH_LAND_GEOMETRY_V126.features.length,127);
 const paths=m.earthLandSvgPathsV126();
 assert.ok(paths.length>=100);
 assert.ok(paths.every(p=>p.startsWith("M")&&p.includes("Z")));
 const losAngeles=m.filmSiteByIdV126("earth-predator2-la");
 const gunnison=m.filmSiteByIdV126("earth-avpr-gunnison");
 const bouvet=m.filmSiteByIdV126("earth-avp-bouvet");
 assert.equal(losAngeles.world,"earth");
 assert.equal(gunnison.world,"earth");
 assert.ok(gunnison.lat>38&&gunnison.lat<39&&gunnison.lon< -106&&gunnison.lon> -108);
 assert.ok(bouvet.lat< -54&&bouvet.lat> -55&&bouvet.lon>3&&bouvet.lon<4);
 assert.ok(m.projectEarthCoordV126(losAngeles).x < m.projectEarthCoordV126(bouvet).x);
 assert.equal(m.projectEarthCoordV126({lat:110,lon:10}),null);
 assert.equal(m.projectEarthCoordV126({lat:12,lon:230}),null);
 assert.equal(m.filmSiteByIdV126("offearth-badlands").lat,null);
 assert.equal(m.filmSiteByIdV126("offearth-predators").world,"off-earth");
 assert.equal(m.filmSiteByIdV126("earth-predator-1987").lat,null);
 assert.equal(m.filmSiteByIdV126("earth-prey-plains").lat,null);
});

test("all 1200 source missions survive geography and climate migrations",()=>{
 assert.equal(scenes.length,1200);
 assert.equal(new Set(scenes.map(s=>s.sourceId)).size,1200);
 assert.equal(scenes.filter(s=>s.original.family==="homage").length,400);
 assert.deepEqual(m.auditClanWarWorldsV126().problems,[]);
 assert.equal(m.auditClanWarWorldsV126().count,1200);
 for(const s of scenes){
  assert.equal(s.original.status,"design-only");
  assert.equal(s.original.id,s.sourceId);
  assert.ok(s.environment.weather);
  assert.ok(s.environment.terrain);
  assert.ok(s.environment.liquid);
  if(s.geography.worldKind!=="earth"){
   assert.equal(s.geography.latitude,null);
   assert.equal(s.geography.longitude,null);
  }
  if(s.original.family==="homage")assert.equal(s.geography.worldId,"earth");
 }
});

test("Gunnison must be in Colorado, Bouvet is subantarctic, and no city is put on Badlands",()=>{
 const g=scenes.find(v=>v.original.family==="lore"&&v.original.referenceName?.includes("Gunnison"));
 assert.ok(g);
 assert.equal(g.geography.worldId,"earth");
 assert.equal(g.geography.earthSiteId,"earth-avpr-gunnison");
 assert.equal(g.environment.climate,"alpine");
 const b=scenes.find(v=>v.original.family==="lore"&&v.original.referenceName?.includes("Pyramide sous"));
 assert.ok(b);
 assert.equal(b.geography.earthSiteId,"earth-avp-bouvet");
 assert.equal(b.environment.climate,"polar");
 const alien=scenes.find(v=>v.original.family==="lore"&&v.original.referenceWork?.includes("Badlands"));
 assert.ok(alien);
 assert.equal(alien.geography.worldKind,"known-alien");
 assert.equal(alien.geography.latitude,null);
 const filmEarthSites=scenes.filter(x=>x.geography.earthSiteId==="earth-predator2-la");
 assert.equal(filmEarthSites.length,4);
});

test("Earth desert never gets polar blizzard; Antarctic polar desert is an exception, not an arid hot zone",()=>{
 const desert=scenes.find(v=>v.original.family==="homage"&&v.original.referenceName==="Erg Chebbi");
 assert.ok(desert);
 assert.equal(desert.environment.climate,"hot-desert");
 assert.equal(desert.environment.allowsNaturalSnow,false);
 assert.ok(!/blizzard|neige|gelée/i.test(desert.environment.weather));
 assert.ok(desert.environment.terrain.includes("sable"));
 const antarctic=scenes.find(v=>v.original.family==="homage"&&v.original.referenceName==="Vallées sèches de l'Antarctique");
 assert.ok(antarctic);
 assert.equal(antarctic.environment.climate,"cold-desert");
 assert.equal(antarctic.environment.isFrozen,true);
 const glacier=scenes.find(v=>v.original.family==="homage"&&v.original.referenceName==="Glacier d'Ilulissat");
 assert.ok(glacier);
 assert.equal(glacier.environment.allowsNaturalSnow,true);
});

test("6000 AI plans: five source-compatible configurations per scene and bounded enemies by gameplay",()=>{
 const audit=m.auditWarAiPresetsV126();
 assert.equal(audit.variants,1200);
 assert.equal(audit.encounterPresets,6000);
 assert.deepEqual(audit.errors,[]);
 for(const mode of ["assault","outer","stealth","rts"]){
  const scene=scenes.find(x=>x.mode===mode);
  const presets=m.allWarAiPresetsV126(scene);
  assert.equal(presets.length,5);
  assert.equal(new Set(presets.map(p=>p.doctrine)).size,5);
  for(const p of presets){
   assert.equal(p.scenarioId,scene.sourceId);
   assert.equal(p.canonStatus,"game-invented");
   assert.equal(p.factionIdentity,"rival-yautja-exercise");
   assert.ok(p.roleGroups.every(g=>/^W3-U\d{2}$/.test(g.unitId)));
   assert.ok(p.totalTeams>=0);
   assert.ok(p.maxSimultaneous<=p.totalTeams);
   if(mode==="outer"){assert.equal(p.visibility,"hidden-until-report");assert.equal(p.roleGroups.length,0);}
   if(mode==="stealth")assert.ok(p.totalTeams<=9);
   if(mode==="rts")assert.ok(p.totalTeams<=16);
  }
 }
 const coop=m.createWarAiEncounterV126(scenes.find(v=>v.mode==="rts"),3,4);
 assert.equal(coop.playerCount,4);
 assert.ok(coop.totalTeams<=16);
});

test("multiplayer lobby keeps the same world, prevents duplicate unit ownership and never grants campaign resources",()=>{
 const scenario=scenes.find(s=>s.geography.worldKind==="earth");
 const first=m.createWarMultiplayerLobbyV126("ROOM-100",scenario.sourceId,"clan-pvp","CAPTAIN","Chef","hash123456",424242);
 assert.equal(first.worldId,"earth");
 assert.equal(first.campaignWrite,"forbidden");
 assert.equal(first.authority,"server-required");
 assert.equal(m.startWarMultiplayerLobbyV126(first,"CAPTAIN").accepted,false);
 const joined=m.joinWarMultiplayerLobbyV126(first,"OTHER","Rival","rival");
 assert.equal(joined.accepted,true);
 assert.equal(m.setWarMultiplayerLoadoutV126(joined.room,"OTHER",["UNIT-HOST"]).accepted,true);
 const hostUnits=m.setWarMultiplayerLoadoutV126(joined.room,"CAPTAIN",["UNIT-HOST"]);
 assert.equal(hostUnits.accepted,false,"same individual cannot belong to both players");
 let room=m.setWarMultiplayerLoadoutV126(joined.room,"CAPTAIN",["UNIT-01"]).room;
 room=m.setWarMultiplayerLoadoutV126(room,"OTHER",["UNIT-02"]).room;
 room=m.setWarMultiplayerReadyV126(room,"CAPTAIN",true).room;
 room=m.setWarMultiplayerReadyV126(room,"OTHER",true).room;
 const started=m.startWarMultiplayerLobbyV126(room,"CAPTAIN");
 assert.equal(started.accepted,true);
 assert.equal(started.room.stage,"started");
 const observer=m.visibleWarMultiplayerStateV126(started.room,"CAPTAIN");
 assert.deepEqual(observer.players.find(x=>x.id==="OTHER").unitInstanceIds,[]);
 const cmd={clientCommandId:"CMD-1",actorId:"CAPTAIN",sequence:1,expectedRevision:started.room.revision,
  tick:0,kind:"move",unitInstanceId:"UNIT-01",targetX:4,targetY:3};
 const resolved=m.acceptWarMultiplayerCommandV126(started.room,cmd,"CAPTAIN");
 assert.equal(resolved.accepted,true);
 assert.equal(m.acceptWarMultiplayerCommandV126(resolved.room,cmd,"CAPTAIN").accepted,false);
 assert.equal(m.acceptWarMultiplayerCommandV126(started.room,{...cmd,actorId:"OTHER"},"CAPTAIN").accepted,false);
 assert.ok(resolved.room.receipts.includes("CMD-1"));
 assert.equal(resolved.room.campaignWrite,"forbidden");
});

test("co-op squads, spectator rights, readiness and async clan are explicit and not fake networking",()=>{
 const scenario=scenes.find(s=>s.geography.worldKind==="original-alien");
 let coop=m.createWarMultiplayerLobbyV126("COOP-ONE",scenario.sourceId,"co-op","LEADER","Chef","hash12345",99);
 assert.equal(m.joinWarMultiplayerLobbyV126(coop,"ENEMY","Ennemi","rival").accepted,false);
 coop=m.joinWarMultiplayerLobbyV126(coop,"ALLY","Allié","hunter").room;
 coop=m.joinWarMultiplayerLobbyV126(coop,"VIEWER","Spectateur","observer").room;
 assert.equal(m.setWarMultiplayerLoadoutV126(coop,"VIEWER",["UNIT-03"]).accepted,false);
 assert.equal(m.setWarMultiplayerReadyV126(coop,"ALLY",true).accepted,false);
 assert.equal(m.startWarMultiplayerLobbyV126(coop,"LEADER").accepted,false);
 const room=m.createWarMultiplayerLobbyV126("CLAN-ASYNC",scenario.sourceId,"async-clan","LEAD","Chef","hash123456",88);
 assert.equal(room.mode,"async-clan");
 assert.equal(room.authority,"server-required");
 assert.ok(m.WAR_MULTIPLAYER_DEPLOYMENT_GATES_V126.length>=5);
});
