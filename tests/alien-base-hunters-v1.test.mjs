import test from "node:test";
import assert from "node:assert/strict";
import { HUNTER_PRESETS } from "../app/game/hunterLore.ts";
import { ALIEN_BASE_HUNTER_IDS_V1, ALIEN_BASE_HUNTER_KIT_IDS_V1, getAlienBaseHunterIdentityV1, getAlienBaseHunterKitIdentityV1 } from "../app/game/alienBaseYautjaBindingsV1.ts";
import { readFileSync } from "node:fs";
test("53 original hunter presets preserved and fifteen explicit same-screen-work aliases", () => {
  assert.equal(HUNTER_PRESETS.length,53);
  assert.equal(Object.keys(ALIEN_BASE_HUNTER_IDS_V1).length,15);
  for (const preset of HUNTER_PRESETS) {
    const resolved=getAlienBaseHunterIdentityV1(preset.id);
    assert.equal(resolved, ALIEN_BASE_HUNTER_IDS_V1[preset.id] ?? null);
    assert.ok(preset.sourceUrls.length, preset.id);
  }
  for (const hunter of ["scar","celtic","chopper","berserker","falconer","tracker","fugitive","dek","kwei"]) assert.ok(getAlienBaseHunterIdentityV1(hunter)?.startsWith("character.yautja."));
  for(const hunter of ["greyback","kok-jotun","kok-oni","kok-pilot"])assert.equal(getAlienBaseHunterIdentityV1(hunter),null);
  assert.equal(getAlienBaseHunterIdentityV1("custom"),null);
});
test("Five exact kit model identities, no guessed audio/sensor/bow/snare aliases",()=>{
  assert.equal(Object.keys(ALIEN_BASE_HUNTER_KIT_IDS_V1).length,5);
  for(const key of ["wristblades","plasma-caster","combistick","smart-disc","netgun"])assert.ok(getAlienBaseHunterKitIdentityV1(key)?.startsWith("item.yautja."));
  for(const key of ["motion-sensor","audio-decoy","snare","yautja-bow"])assert.equal(getAlienBaseHunterKitIdentityV1(key),null);
});
test("Hunter catalogue uses read-only identity lookup, not a new unlock or save key",()=>{
  const source=readFileSync(new URL("../app/game/CatalogueHunterBrowser.tsx",import.meta.url),"utf8");
  assert.match(source,/getAlienBaseHunterIdentityV1/);
  assert.match(source,/data-alien-base-hunter-link/);
  assert.ok(!/saveAlienBase|unlockAlienBase|fetchAlienBase/.test(source));
});
