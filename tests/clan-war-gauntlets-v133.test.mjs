import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { readHunterGauntletV133 } from "../app/game/systems/useHunterGauntletV133.ts";
import { gauntletStorageKeyV132,serializeGauntletPreferenceV132 } from "../app/game/systems/clanWarGauntletCatalogV132.ts";

const read=(path)=>readFileSync(fileURLToPath(new URL("../"+path,import.meta.url)),"utf8");

test("global gauntlet equipment is isolated by hunter, rank and local storage permissions",()=>{
  const hunterA="A-trophy-slot",hunterB="B-trophy-slot";
  const payload=serializeGauntletPreferenceV132(hunterA,"wolf","elite");
  const storage={getItem:key=>key===gauntletStorageKeyV132(hunterA)?payload:null};
  assert.equal(readHunterGauntletV133(storage,hunterA,"elite",new Map()),"wolf");
  assert.equal(readHunterGauntletV133(storage,hunterB,"elder",new Map()),"jungle-hunter");
  assert.equal(readHunterGauntletV133(storage,hunterA,"blooded",new Map()),"jungle-hunter");
  assert.equal(readHunterGauntletV133({getItem:()=>"{invalid"},hunterA,"elite",new Map()),"jungle-hunter");
  const fallback=new Map([[gauntletStorageKeyV132(hunterA),"city-hunter"]]);
  assert.equal(readHunterGauntletV133({getItem:()=>{throw new Error("denied");}},hunterA,"blooded",fallback),"city-hunter");
  assert.equal(readHunterGauntletV133(storage,hunterA,"blooded",fallback),"city-hunter");
  assert.equal(readHunterGauntletV133(null,hunterA,"young-blood",fallback),"jungle-hunter");
});

test("gauntlet UI integrates with the REAL ship armory, character and clan war",()=>{
  const panel=read("app/game/ClanWarPanelV85.tsx");
  const game=read("app/game/GameClient.tsx");
  const rig=read("app/game/HunterRigPreview.tsx");
  const operation=read("app/game/ClanWarOperationsV115.tsx");
  const bible=read("app/game/ClanWarBibleV6Panel.tsx");
  assert.match(game,/data-testid="hunter-gauntlet-slot-v133"/);
  assert.match(game,/useHunterGauntletV133\(save.createdAt,save.profile.rankId,save.gauntletV134\)/);
  assert.match(game,/gauntletVariantId=\{hunterGauntlet.equippedId\}/);
  assert.equal((game.match(/gauntletVariantId=\{hunterGauntlet.equippedId\}/g)||[]).length,3);
  assert.match(rig,/data-gauntlet-equipped=\{selectedGauntlet\?\.id \?\? "jungle-hunter"\}/);
  assert.match(rig,/data-gauntlet-visual-validation="shared-rig-material-proxy"/);
  assert.match(panel,/useHunterGauntletV133\(save.createdAt, save.profile.rankId,save.gauntletV134\)/);
  assert.equal((panel.match(/<ClanWarAtlasV95\b/g)||[]).length,1);
  assert.match(bible,/holographic=\{holographic\}/);
  assert.match(operation,/data-testid="clan-operations-gauntlet-v133"/);
  assert.match(operation,/mode==="outer"/);
  assert.match(operation,/mode==="stealth"/);
  assert.match(operation,/mode==="rts"/);
});

test("Jungle Hunter blockout has corrected five horizontal glyph rows and safe unique SVG paint IDs",()=>{
  const art=read("app/game/HunterGauntletArtV132.tsx");
  const locker=read("app/game/ClanWarGauntletLockerV132.tsx");
  assert.match(art,/data-jungle-glyph-panel="five-horizontal-rows"/);
  assert.match(art,/Array.from\(\{length:5\}/);
  assert.match(art,/data-cover-position=\{coverOpen\?"open":"closed"\}/);
  assert.match(art,/useId\(\)/);
  assert.match(art,/\`\$\{uid\}-armour\`/);
  assert.match(locker,/coverOpen=\{coverOpen\}/);
  assert.match(locker,/Refermer le capot/);
  assert.match(art,/blockout-awaiting-source-review/);
});

test("all modified TS and TSX files at least parse, including the full GameClient",()=>{
  const paths=[
    "app/game/systems/useHunterGauntletV133.ts",
    "app/game/systems/gauntletCampaignV134.ts",
    "app/game/save.ts",
    "app/game/types.ts",
    "app/game/ClanWarGauntletV131.tsx",
    "app/game/ClanWarGauntletLockerV132.tsx",
    "app/game/HunterGauntletArtV132.tsx",
    "app/game/HunterRigPreview.tsx",
    "app/game/ClanWarBibleV6Panel.tsx",
    "app/game/ClanWarOperationsV115.tsx",
    "app/game/ClanWarPanelV85.tsx",
    "app/game/GameClient.tsx",
    "app/game/sound.ts",
  ];
  for (const path of paths) {
    const result=ts.transpileModule(read(path),{
      fileName:path,reportDiagnostics:true,
      compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}
    });
    const errors=(result.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
    assert.deepEqual(errors.map(d=>ts.flattenDiagnosticMessageText(d.messageText,"\n")),[],path);
  }
});

test("gauntlet sounds are original synth events with non-combat integration",()=>{
  const sound=read("app/game/sound.ts");
  const game=read("app/game/GameClient.tsx");
  assert.match(sound,/playGauntletSignalV133\(profile: GameGauntletSoundProfileV133\)/);
  assert.match(sound,/GAUNTLET_SFX_SIGNATURES_V133/);
  assert.match(sound,/this\.readyTime\(\)/);
  assert.match(game,/audio\.playGauntletSignalV133\(theme\)/);
  assert.ok(!read("app/game/systems/useHunterGauntletV133.ts").includes("advanceWarTurnV85"));
  assert.ok(!read("app/game/ClanWarGauntletLockerV132.tsx").includes("queueWarOrderV85"));
});
