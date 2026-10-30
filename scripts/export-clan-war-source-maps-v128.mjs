import {build} from "esbuild";
import {mkdir,writeFile} from "node:fs/promises";
import {join} from "node:path";
const result=await build({
 stdin:{contents:[
  "export * from './app/game/systems/clanWarSourceMapsV128';",
  "export * from './app/game/systems/clanWarBibleV6';",
 ].join("\n"),resolveDir:process.cwd()},
 bundle:true,write:false,format:"esm",target:"es2022",platform:"node",logLevel:"silent",
});
const api=await import("data:text/javascript;base64,"+Buffer.from(result.outputFiles[0].text).toString("base64"));
const rules=api.DEFAULT_WAR_RULES_V6,report=api.auditWarSourceMapsV128(rules);
if(report.maps!==12||report.problems.length)throw Error("Invalid W3 maps: "+JSON.stringify(report));
const folder=process.argv[2]??"outputs/w3-maps-v128";
await mkdir(folder,{recursive:true});
const sources=Array.from({length:12},(_,i)=>api.createWarSourceMapV128(
  "W3-MAP"+String(i+1).padStart(2,"0"),rules));
const manifest=sources.map(m=>({
 id:m.id,name:m.name,planetId:m.planetId,sourceCells:m.sourceCells,
 width:m.width,height:m.height,kind:m.interpretation,
 sourceSituation:m.sourceSituation,sourceGeometry:m.sourceGeometry,
 sourceCover:m.sourceCover,sourceEvent:m.sourceEvent,
 sourceObjective:m.sourceObjective,sourceExtraction:m.sourceExtraction,
 start:m.start,goal:m.goal,extraction:m.extraction,
 alternativePathLengths:m.mandatoryPaths.map(route=>route.length),
 wallCells:m.tiles.filter(tile=>tile.kind==="wall").length,
 coverCells:m.tiles.filter(tile=>tile.kind==="cover").length,
 traversableCells:m.tiles.filter(tile=>!tile.solid).length,
}));
await Promise.all([
 ...sources.map(m=>writeFile(join(folder,m.id+".json"),
  JSON.stringify(m,null,2)+"\n","utf8")),
 writeFile(join(folder,"Yautja_V128_12_Maps_Manifest.json"),
  JSON.stringify({status:"source-guided-level-study",count:sources.length,maps:manifest},null,2)+"\n","utf8"),
 writeFile(join(folder,"Yautja_V128_12_Maps_Audit.json"),JSON.stringify(report,null,2)+"\n","utf8"),
]);
console.log("W3 source maps exported: "+sources.length+" with preserved dimensions and full tile data.");
