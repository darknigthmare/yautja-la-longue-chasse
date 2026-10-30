/** No dependencies: direct TypeScript import on Node 22 with --experimental-strip-types. */
import {mkdir,writeFile} from "node:fs/promises";
import {join} from "node:path";
import {
  CLAN_WAR_VARIANTS_V120,auditClanWarVariantsV120,
  exportClanWarVariantsCsvV120,exportClanWarVariantsJsonV120,
} from "../app/game/systems/clanWarVariantsV120.ts";
const check=auditClanWarVariantsV120();
if(check.total!==1200||check.problems.length||check.homageAnchors!==100||
  CLAN_WAR_VARIANTS_V120.some(x=>x.status!=="design-only"))
  throw Error("Contrat de 1 200 fiches V120 incomplet : "+JSON.stringify(check));
const dir=process.argv[2]??"outputs/clan-war-v120";
await mkdir(dir,{recursive:true});
await Promise.all([
  writeFile(join(dir,"Yautja_Guerres_Clans_1200_V120.json"),exportClanWarVariantsJsonV120(),"utf8"),
  writeFile(join(dir,"Yautja_Guerres_Clans_1200_V120.csv"),exportClanWarVariantsCsvV120(),"utf8"),
  writeFile(join(dir,"Yautja_Guerres_Clans_1200_V120_audit.json"),JSON.stringify(check,null,2)+"\n","utf8"),
]);
console.log("V120 : 1 200 / 1 200 fiches exportées, 100 références de lieux, aucun doublon de site ou titre.");
