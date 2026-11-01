import assert from "node:assert/strict";import { readFileSync } from "node:fs";import { test } from "node:test";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("Existing forge and medbay physical services give cosmetic access without moving their authored point IDs",()=>{
 const home=read("app/game/systems/homeworld.ts"),ui=read("app/game/GameClient.tsx");
 assert.match(home,/servicePoint\("forge-service".*"customization"/);assert.match(home,/servicePoint\("medbay-service".*"medbay"/);
 assert.match(ui,/pigment-lab-access/);assert.match(ui,/setPaletteFacility\("lab"\)/);assert.match(ui,/setPaletteFacility\("forge"\)/);
 assert.match(ui,/aucune réécriture ADN/i);
});
