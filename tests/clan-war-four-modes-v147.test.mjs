import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
const root=fileURLToPath(new URL("../",import.meta.url));
const read=p=>readFileSync(root+p,"utf8");

test("V147 V115 UI restores original active mission and territorial target on refresh",()=>{
 const panel=read("app/game/ClanWarOperationsV115.tsx");
 assert.match(panel,/current\.active\?\.mode \?\?/);
 assert.match(panel,/current\.outer\.length>0\?"outer"/);
 assert.match(panel,/setMode\(resumedMode\)/);
 assert.match(panel,/setRtsSelectedId\(current\.active\?\.mode==="rts"/);
 assert.match(panel,/setTargetId\(current\.active\?\.targetId \?\? current\.outer\[0\]\?\.targetId/);
 assert.match(panel,/data-current-mode=\{mode\}/);
 assert.match(panel,/data-war-campaign-write="none"/);
 assert.doesNotMatch(panel,/gauntletCampaignClaimV134\(/);
});
test("V147 mounts real operational V6 rules and screens, not fabricated planet/war missions",()=>{
 const fixture=read("tests/browser/clan-war-v147-four-modes.fixture.tsx");
 assert.match(fixture,/import ClanWarOperationsV115/);
 assert.match(fixture,/DEFAULT_WAR_RULES_V6/);
 assert.match(fixture,/warMissionEligibleV115/);
 assert.match(fixture,/createWarOperationsV115/);
 assert.match(fixture,/<ClanWarOperationsV115 rules=\{rules\} active persist holographic gauntletId=\{gauntlet\}/);
 assert.match(fixture,/data-initial-rav=\{state\.rav\}/);
});
test("V147 browser includes all four real game modes, persisted reload and no false source-world claim",()=>{
 const script=read("scripts/qa-clan-war-four-modes-v147.mjs");
 for(const mode of ["assault","outer","stealth","rts"]) assert.match(script,new RegExp(`id:"${mode}"`));
 assert.match(script,/data-legal-target/); // source terrain is computed by the fixture
 assert.match(script,/await page\.reload/);
 assert.match(script,/getAttribute\("data-current-mode"\)/);
 assert.match(script,/saved\.assignments\[teamId\]/);
 assert.match(script,/assert\.equal\(resumed\.rav,saved\.rav\)/);
 assert.match(script,/Cosmetic change altered gameplay archive/);
 assert.doesNotMatch(script,/localStorage\.setItem\(key,JSON\.stringify/);
 assert.doesNotMatch(script,/validatedFilmOneToOne:[1-9]/);
});
