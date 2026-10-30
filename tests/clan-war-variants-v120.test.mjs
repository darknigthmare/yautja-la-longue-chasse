import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const bundle = await build({
  stdin:{
    contents:"export * from './app/game/systems/clanWarVariantsV120';",
    resolveDir:process.cwd(),
  },bundle:true,write:false,platform:"node",target:"es2022",format:"esm",logLevel:"silent",
});
const variant = await import("data:text/javascript;base64,"+Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const modes=["assault","outer","stealth","rts"];
const families=["original","lore","homage"];
const rows=variant.CLAN_WAR_VARIANTS_V120;

test("exactly 1,200 independently identified blueprints across the 4 × 3 × 100 contract",()=>{
  assert.equal(rows.length,1200);
  for(const mode of modes)for(const family of families){
    const subset=rows.filter(x=>x.mode===mode&&x.family===family);
    assert.equal(subset.length,100,mode+"/"+family);
    assert.deepEqual(subset.map(x=>x.number),Array.from({length:100},(_,i)=>i+1));
    assert.equal(new Set(subset.map(x=>x.site)).size,100);
    assert.equal(new Set(subset.map(x=>x.objective)).size,100);
    assert.ok(subset.every(x=>x.status==="design-only"));
    assert.ok(subset.every(x=>x.id.includes(["assault","outer","stealth","rts"].includes(mode)?
      {assault:"AS",outer:"OP",stealth:"IN",rts:"RT"}[mode]:"ERR")));
  }
  for(const key of ["id","title","site","mapKey","objective"]){
    assert.equal(new Set(rows.map(x=>x[key])).size,1200,"duplicated "+key);
  }
  assert.deepEqual(variant.auditClanWarVariantsV120().problems,[]);
});

test("biomes, microregions, weather, liquids and topology vary far beyond simple renamed copies",()=>{
  const audit=variant.auditClanWarVariantsV120();
  assert.ok(audit.uniqueWorlds>=120,audit.uniqueWorlds+" worlds");
  assert.equal(audit.uniqueSites,1200);
  assert.equal(audit.uniqueTitles,1200);
  assert.ok(audit.biomes>=100);
  assert.ok(audit.geometries>=25);
  assert.ok(audit.weatherTypes>=10);
  assert.equal(audit.homageAnchors,100);
  assert.equal(new Set(rows.filter(x=>x.family==="original").map(x=>x.world)).size,25);
  const original=rows.filter(x=>x.family==="original"&&x.mode==="assault");
  assert.equal(new Set(original.map(x=>x.region)).size,25);
  const areas=new Set(rows.map(x=>x.terrain+"|"+x.liquid+"|"+x.region+"|"+x.geometry));
  assert.ok(areas.size>=700);
});

test("four gameplay formats are actually described by different physical mechanics",()=>{
  for(const mode of modes){
    const group=rows.filter(x=>x.mode===mode);
    assert.equal(group.length,300);
    assert.equal(new Set(group.map(x=>x.primaryMechanic)).size,4);
    assert.ok(group.every(x=>x.routeOrLayout.length>25));
    assert.ok(group.every(x=>x.enemyBehavior.length>30));
    assert.ok(group.every(x=>x.objective.length>25&&x.secondary.length>25));
    assert.ok(group.every(x=>x.interaction&&x.withdrawal&&x.failure));
    assert.ok(group.every(x=>x.assetsNeeded.length>=5));
    assert.ok(group.every(x=>x.suggestedMinutes>0&&Number.isInteger(x.suggestedMinutes)));
    assert.equal(new Set(group.map(x=>x.mapKey)).size,300);
  }
  assert.ok(rows.filter(x=>x.mode==="assault").every(x=>x.primaryMechanic.includes("AP")||
    x.primaryMechanic.includes("bastions")||x.primaryMechanic.includes("progression")||x.primaryMechanic.includes("spéciale")));
  assert.ok(rows.filter(x=>x.mode==="outer").every(x=>x.interaction.includes("horodaté")));
  assert.ok(rows.filter(x=>x.mode==="stealth").every(x=>x.interaction.includes("extraire")));
  assert.ok(rows.filter(x=>x.mode==="rts").every(x=>x.routeOrLayout.includes("vue de dessus")));
});

test("all 100 distinct geographic / cultural homages in each gameplay remain explicitly non-canon",()=>{
  for(const mode of modes){
    const group=rows.filter(x=>x.mode===mode&&x.family==="homage");
    assert.equal(new Set(group.map(x=>x.inspiration)).size,100);
    assert.ok(group.every(x=>x.canonStatus.includes("aucun événement canonique")));
    assert.ok(group.every(x=>x.continuity.includes("aucun voyage")));
    assert.ok(group.every(x=>x.world.startsWith("Monde-écho")));
    assert.ok(group.every(x=>x.inspirationClass));
    assert.ok(group.some(x=>x.inspirationClass==="film"));
    assert.ok(group.some(x=>x.inspirationClass==="nature"));
    assert.ok(group.some(x=>x.inspirationClass==="ville"));
    assert.ok(group.some(x=>x.inspirationClass==="jeu"));
    assert.ok(group.some(x=>x.inspirationClass==="patrimoine"));
  }
  assert.equal(rows.filter(x=>x.family==="lore").length,400);
  assert.ok(rows.filter(x=>x.family==="lore").every(x=>x.canonStatus.includes("non attesté")));
  assert.ok(rows.filter(x=>x.family==="original").every(x=>x.canonStatus==="création pure"));
});

test("no scenario pretends to be 1:1 playable, to produce campaign wealth or to reveal a hidden garrison",()=>{
  for(const row of rows){
    assert.equal(row.status,"design-only");
    assert.match(row.strategicConsequence,/campagne n’est pas modifié/);
    assert.equal(row.schema,120);
    assert.equal(row.mandatoryRoles.length,3);
    assert.ok(row.referenceUrl===""||row.referenceUrl.startsWith("https://www.20thcenturystudios.com/"));
  }
});

test("search works across modes, families, accents, scenario IDs and remains bounded",()=>{
  assert.equal(variant.searchClanWarVariantsV120("", "assault","original").length,100);
  assert.equal(variant.searchClanWarVariantsV120("", "rts","lore").length,100);
  assert.equal(variant.searchClanWarVariantsV120("", "all","homage").length,400);
  assert.equal(variant.searchClanWarVariantsV120("", "all","all",12).length,12);
  const target=rows[750];
  assert.equal(variant.searchClanWarVariantsV120(target.id).length,1);
  assert.equal(variant.searchClanWarVariantsV120(target.id)[0].id,target.id);
  assert.ok(variant.searchClanWarVariantsV120("pyramide").length>0);
  assert.ok(variant.searchClanWarVariantsV120("sans-correspondance").length===0);
  assert.equal(variant.buildClanWarVariantsV120().length,1200);
  assert.deepEqual(variant.buildClanWarVariantsV120(),rows,"deterministic rebuild");
});

test("Excel-friendly 40-column CSV and JSON exports are complete, quoted and inert",()=>{
  const data=variant.exportClanWarVariantsCsvV120();
  assert.ok(data.startsWith("\ufeff"));
  const lines=data.slice(1).trim().split(/\r\n/);
  assert.equal(lines.length,1201);
  assert.equal(lines[0].split(";").length,40);
  assert.ok(lines[1].includes("GWV120-"));
  const output=JSON.parse(variant.exportClanWarVariantsJsonV120());
  assert.equal(output.total,1200);
  assert.equal(output.missions.length,1200);
  assert.equal(output.audit.problems.length,0);
  assert.equal(variant.exportClanWarVariantsCsvV120(rows.slice(0,3)).slice(1).trim().split(/\r\n/).length,4);
});
