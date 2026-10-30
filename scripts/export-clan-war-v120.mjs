/**
 * Deterministic exports from the SINGLE in-game V120 source, not a second
 * hand-maintained spreadsheet. CI publishes JSON + CSV in a review artifact.
 */
import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
const bundle=await build({
  stdin:{contents:"export * from './app/game/systems/clanWarVariantsV120';",resolveDir:process.cwd()},
  platform:"node",target:"es2022",format:"esm",bundle:true,write:false,logLevel:"silent",
});
const api=await import("data:text/javascript;base64,"+
  Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const audit=api.auditClanWarVariantsV120();
if(audit.problems.length||audit.total!==1200||audit.homageAnchors!==100){
  throw Error("Catalogue V120 non conforme : "+JSON.stringify(audit));
}
const output=process.argv[2]??"outputs/clan-war-v120";
await mkdir(output,{recursive:true});
const json=api.exportClanWarVariantsJsonV120();
const csv=api.exportClanWarVariantsCsvV120();
await Promise.all([
  writeFile(join(output,"Yautja_Guerres_Clans_1200_V120.json"),json,"utf8"),
  writeFile(join(output,"Yautja_Guerres_Clans_1200_V120.csv"),csv,"utf8"),
  writeFile(join(output,"Yautja_Guerres_Clans_1200_V120_audit.json"),JSON.stringify(audit,null,2)+"\n","utf8"),
]);
console.log("V120 export OK : 1 200 variantes, 100 lieux de clin d’œil, 12 groupes de 100, 0 anomalie d’unicité.");
console.log("Sortie : "+output);
