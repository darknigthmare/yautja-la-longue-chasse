import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");

test("V118: physical Homeworld forge and medbay preserve their original IDs", () => {
  const home = read("app/game/systems/homeworld.ts");
  const ui = read("app/game/GameClient.tsx");
  const forge = read("app/game/HunterChromaticForgeV113.tsx");
  assert.match(home,/servicePoint\("forge-service".*"customization"/);
  assert.match(home,/servicePoint\("medbay-service".*"medbay"/);
  assert.match(ui,/pigment-lab-access/);
  assert.match(ui,/chromaticFacilityV115/);
  assert.match(ui,/openStationScreen\("customization", hubLocation, screen === "medbay" \? "lab"/);
  assert.match(forge,/Aucune réécriture instantanée de l’ADN/);
});

test("V118: each physical workshop exposes only its canonical chromatic channels", () => {
  const model = read("app/game/hunterChromaticsV113.ts");
  assert.match(model,/facility === "ship"/);
  assert.match(model,/channel.id === "skin"/);
  assert.match(model,/channel.id !== "skin"/);
  assert.match(model,/resetChromaticFacilityV115/);
});
