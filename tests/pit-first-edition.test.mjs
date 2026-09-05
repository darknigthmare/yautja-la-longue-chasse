import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

async function importTypeScriptModule(relativePath) {
  const bundle = await build({
    entryPoints: [fileURLToPath(new URL(relativePath, import.meta.url))],
    bundle: true,
    format: "esm",
    platform: "node",
    target: "es2022",
    write: false,
  });
  return import(
    "data:text/javascript;base64," +
      Buffer.from(bundle.outputFiles[0].text).toString("base64")
  );
}

const editionPromise = importTypeScriptModule("../app/game/systems/pitFirstEdition.ts");
const combatPromise = importTypeScriptModule("../app/game/systems/pitCombat.ts");
const lorePromise = importTypeScriptModule("../app/game/hunterLore.ts");

const FIGHTER_IDS = [
  "jungle-hunter", "city-hunter", "scar", "celtic", "wolf", "feral-hunter",
  "berserker", "falconer", "scarface", "valkyrie", "witch", "enforcer",
];
const ARENAS = [
  ["the-pit", "Cercle de basalte"],
  ["trophy-hall", "Salle des trophées"],
  ["canopy-causeway", "Passerelle de canopée"],
  ["frost-chamber", "Chambre du givre"],
  ["ash-courtyard", "Cour des cendres"],
  ["glass-terrace", "Terrasse de verre"],
  ["abyssal-bridge", "Pont abyssal"],
  ["ruins-tribunal", "Tribunal des ruines"],
];
const ATTACKS = ["light", "medium", "heavy", "technique"];

function combatProjection(fighter) {
  return {
    id: fighter.id,
    name: fighter.name,
    epithet: fighter.epithet,
    maxHealth: fighter.maxHealth,
    walkSpeed: fighter.walkSpeed,
    airSpeed: fighter.airSpeed,
    jumpSpeed: fighter.jumpSpeed,
    power: fighter.power,
    bodyWidth: fighter.bodyWidth,
    bodyHeight: fighter.bodyHeight,
    crouchHeight: fighter.crouchHeight,
    palette: fighter.palette,
    attacks: fighter.attacks,
    technique: fighter.technique,
  };
}

function moveProjection(move) {
  return [
    move.startup, move.active, move.recovery, move.damage, move.hitstun,
    move.blockstun, move.range, move.height, move.pushback, move.hitLevel,
    move.knockdown, move.antiAir, move.launchY,
  ];
}

test("first edition has exactly twelve playable fighters and two separate Chronicle bosses", async () => {
  const edition = await editionPromise;
  assert.deepEqual(edition.PIT_FIRST_EDITION_FIGHTER_IDS, FIGHTER_IDS);
  assert.deepEqual(Object.keys(edition.PIT_FIRST_EDITION_FIGHTERS), FIGHTER_IDS);
  assert.equal(edition.PIT_FIRST_EDITION_FIGHTER_IDS.length, 12);
  assert.ok(FIGHTER_IDS.every((id) => edition.PIT_FIRST_EDITION_FIGHTERS[id].selectable));

  assert.deepEqual(edition.PIT_CHRONICLE_BOSS_IDS, ["kok-warlord", "stone-heart"]);
  assert.deepEqual(Object.keys(edition.PIT_CHRONICLE_BOSSES), ["kok-warlord", "stone-heart"]);
  for (const id of edition.PIT_CHRONICLE_BOSS_IDS) {
    assert.equal(edition.PIT_CHRONICLE_BOSSES[id].selectable, false);
    assert.equal(edition.PIT_CHRONICLE_BOSSES[id].runtimeStatus, "chronicle-boss");
    assert.equal(edition.PIT_CHRONICLE_BOSSES[id].archetype, "boss");
  }
  assert.equal(edition.isPitFirstEditionFighterId("jungle-hunter"), true);
  assert.equal(edition.isPitFirstEditionFighterId("kok-warlord"), false);
  assert.equal(edition.isPitFirstEditionCombatantId("kok-warlord"), true);
  assert.equal(edition.isPitFirstEditionCombatantId("stone-heart"), true);
  assert.equal(edition.isPitFirstEditionFighterId("toString"), false);
  assert.equal(edition.isPitFirstEditionArenaId("constructor"), false);
});

test("all fourteen combatants provide complete frame data for four engine attacks", async () => {
  const edition = await editionPromise;
  const combatants = [
    ...Object.values(edition.PIT_FIRST_EDITION_FIGHTERS),
    ...Object.values(edition.PIT_CHRONICLE_BOSSES),
  ];
  assert.equal(combatants.length, 14);
  for (const fighter of combatants) {
    assert.deepEqual(Object.keys(fighter.attacks), ATTACKS);
    for (const kind of ATTACKS) {
      const move = fighter.attacks[kind];
      assert.equal(move.kind, kind);
      assert.ok(move.label.trim().length > 0);
      for (const field of [
        "startup", "active", "recovery", "damage", "chipDamage", "hitstun",
        "blockstun", "range", "height", "pushback",
      ]) {
        assert.equal(Number.isInteger(move[field]), true, fighter.id + "." + kind + "." + field);
        assert.ok(move[field] >= 0, fighter.id + "." + kind + "." + field);
      }
      assert.ok(move.startup > 0 && move.active > 0 && move.recovery > 0);
      assert.ok(move.range > 0 && move.height > 0);
      if (fighter.id === "falconer" && kind === "technique") {
        assert.equal(move.damage, 0);
        assert.equal(move.chipDamage, 0);
        assert.equal(move.hitstun, 0);
        assert.equal(move.blockstun, 0);
        assert.equal(move.pushback, 0);
        assert.equal(move.knockdown, false);
        assert.equal(move.antiAir, false);
      } else {
        assert.ok(move.damage > 0 && move.hitstun > 0);
      }
      assert.ok(move.chipDamage <= move.damage);
      assert.ok(["high", "mid", "low"].includes(move.hitLevel));
      assert.equal(typeof move.knockdown, "boolean");
      assert.equal(typeof move.antiAir, "boolean");
      assert.equal(Number.isFinite(move.launchY), true);
    }
  }
});

test("Jungle Hunter and Berserker retain the published vertical-slice combat data", async () => {
  const [edition, combat] = await Promise.all([editionPromise, combatPromise]);
  const jungle = edition.PIT_FIRST_EDITION_FIGHTERS["jungle-hunter"];
  const berserker = edition.PIT_FIRST_EDITION_FIGHTERS.berserker;
  assert.equal(jungle.runtimeStatus, "vertical-slice");
  assert.equal(berserker.runtimeStatus, "vertical-slice");
  assert.deepEqual(combat.PIT_FIGHTERS["jungle-hunter"], combatProjection(jungle));
  assert.deepEqual(combat.PIT_FIGHTERS.berserker, combatProjection(berserker));
  assert.deepEqual(
    moveProjection(jungle.attacks.light),
    [5, 3, 10, 55, 15, 8, 62, 38, 14, "high", false, false, 0],
  );
  assert.deepEqual(
    moveProjection(jungle.attacks.heavy),
    [14, 5, 24, 125, 30, 17, 70, 60, 34, "high", true, true, 8.5],
  );
  assert.deepEqual(
    moveProjection(berserker.attacks.light),
    [5, 3, 11, 58, 16, 8, 64, 40, 15, "high", false, false, 0],
  );
  assert.deepEqual(
    moveProjection(berserker.attacks.heavy),
    [15, 5, 25, 132, 32, 18, 72, 62, 36, "high", true, true, 9],
  );
  const state = combat.createPitCombatState();
  assert.deepEqual(state.fighters.map((fighter) => fighter.definitionId), [
    "jungle-hunter", "berserker",
  ]);
  assert.equal(state.arenaId, "the-pit");
  assert.strictEqual(combat.PIT_ARENA, combat.PIT_ARENAS["the-pit"]);
});

test("eight named arenas share ranked geometry and have four independent depth layers", async () => {
  const edition = await editionPromise;
  assert.deepEqual(edition.PIT_FIRST_EDITION_ARENA_IDS, ARENAS.map(([id]) => id));
  assert.deepEqual(
    ARENAS.map(([id]) => [id, edition.PIT_FIRST_EDITION_ARENAS[id].name]),
    ARENAS,
  );
  const layerIds = new Set();
  for (const [id] of ARENAS) {
    const arena = edition.PIT_FIRST_EDITION_ARENAS[id];
    assert.deepEqual(
      {
        width: arena.width, height: arena.height, groundY: arena.groundY,
        leftWall: arena.leftWall, rightWall: arena.rightWall,
        spawnX: arena.spawnX, competitiveHazards: arena.competitiveHazards,
      },
      {
        width: 960, height: 540, groundY: 430, leftWall: 54, rightWall: 906,
        spawnX: [300, 660], competitiveHazards: false,
      },
    );
    assert.deepEqual(arena.layers.map((layer) => layer.depth), [
      "far", "mid", "near", "foreground",
    ]);
    assert.ok(arena.layers.every(
      (layer, index) => index === 0 || layer.parallax > arena.layers[index - 1].parallax,
    ));
    for (const layer of arena.layers) {
      assert.equal(layerIds.has(layer.id), false, "duplicate layer " + layer.id);
      layerIds.add(layer.id);
    }
  }
  assert.equal(layerIds.size, 32);
  const abyss = edition.PIT_FIRST_EDITION_ARENAS["abyssal-bridge"];
  assert.match(abyss.setting, /Pelagos-M/i);
  assert.match(abyss.setting, /océan/i);
  assert.match(abyss.setting, /coque exposée/i);
  assert.match(abyss.setting, /silhouettes abyssales/i);
  assert.doesNotMatch(abyss.setting, /étoiles|câbles d’énergie/i);
});

test("clan circuit keeps the exact five chapter order", async () => {
  const edition = await editionPromise;
  assert.deepEqual(edition.PIT_CLAN_CIRCUIT_CHAPTERS.map((chapter) => chapter.name), [
    "L’Appel du cercle",
    "Les Trois Voies",
    "Les Trophées volés",
    "La Fosse profanée",
    "Le Jugement",
  ]);
  assert.deepEqual(edition.PIT_CLAN_CIRCUIT_CHAPTERS.map((chapter) => chapter.index), [1, 2, 3, 4, 5]);
  assert.deepEqual(edition.PIT_CLAN_CIRCUIT_CHAPTERS.map((chapter) => chapter.format), [
    "duel", "route", "investigation", "survival", "boss",
  ]);
  assert.equal(new Set(
    edition.PIT_CLAN_CIRCUIT_CHAPTERS.map((chapter) => chapter.cosmeticRewardId),
  ).size, 5);
});

test("every sourcePresetId resolves in HUNTER_PRESETS", async () => {
  const [edition, lore] = await Promise.all([editionPromise, lorePromise]);
  const presetIds = new Set(lore.HUNTER_PRESETS.map((preset) => preset.id));
  const combatants = [
    ...Object.values(edition.PIT_FIRST_EDITION_FIGHTERS),
    ...Object.values(edition.PIT_CHRONICLE_BOSSES),
  ];
  for (const fighter of combatants) {
    assert.equal(
      presetIds.has(fighter.sourcePresetId),
      true,
      fighter.id + " references missing source preset " + fighter.sourcePresetId,
    );
  }
});

test("Witch uses bow, traps and camouflage without magical vocabulary", async () => {
  const edition = await editionPromise;
  const witch = edition.PIT_FIRST_EDITION_FIGHTERS.witch;
  const labels = ATTACKS.map((kind) => witch.attacks[kind].label);
  assert.deepEqual(labels, [
    "Griffe camouflée",
    "Frappe à l’arc yautja",
    "Tir plongeant",
    "Piège à collet",
  ]);
  const text = [...labels, witch.arcadeIntro, witch.arcadeEnding]
    .join(" ")
    .toLocaleLowerCase("fr");
  assert.match(text, /arc/);
  assert.match(text, /piège/);
  assert.match(text, /camoufl/);
  assert.doesNotMatch(text, /hex|sigil|sortil|rune|magie|magique|sorc|occult/);
});

test("visible PIT wiring lists roster and arenas, exposes all published modes, and forwards metadata", () => {
  const directory = dirname(fileURLToPath(import.meta.url));
  const canvas = readFileSync(join(directory, "../app/game/PitCanvas.tsx"), "utf8");
  const client = readFileSync(join(directory, "../app/game/GameClient.tsx"), "utf8");
  assert.match(canvas, /PIT_PLAYABLE_FIGHTER_IDS\.map/);
  assert.match(canvas, /PIT_ARENA_IDS\.map/);
  assert.match(canvas, /Arcade individuel/);
  assert.match(canvas, /PIT_ARCADE_LADDERS\[leftId\]/);
  assert.match(canvas, /LANCER LE PARCOURS ARCADE/);
  assert.match(canvas, /Circuit du clan/);
  assert.match(canvas, /CHRONIQUE · 5 CHAPITRES · 12 COMBATS/);
  assert.match(canvas, /Descente/);
  assert.match(canvas, /Huit étages à branches, santé persistante/);
  assert.doesNotMatch(canvas, /Prochain lot/);
  assert.match(canvas, /aucun honneur, trophée de campagne ou progression de chasse/i);
  assert.match(client, /arenaId:\s*result\.arenaId/);
  assert.match(client, /arcadeEncounterIndex:\s*result\.arcadeEncounterIndex/);
  assert.match(client, /arcadeCompleted:\s*result\.arcadeCompleted/);
  assert.match(client, /cosmeticRewardIds:\s*result\.cosmeticRewardIds/);
  assert.match(canvas, /PIT_ARCADE_COSMETICS\[leftId\]/);
  assert.match(canvas, /Équiper la palette pour cette session PIT/);
  assert.match(canvas, /equippedArcadeCosmetic\?\.palette/);
  assert.match(client, /unlockedCosmeticIds=\{pitUnlockedCosmeticIds\}/);
  assert.match(client, /setPitUnlockedCosmeticIds/);

  const settlementStart = canvas.indexOf("const submitArcadeSettlement");
  const persistenceAwait = canvas.indexOf("await onMatchComplete(settlement.result)", settlementStart);
  const publishRun = canvas.indexOf("arcadeRunRef.current = settlement.nextRun", settlementStart);
  assert.ok(settlementStart >= 0 && persistenceAwait > settlementStart);
  assert.ok(publishRun > persistenceAwait);
  const terminalEffectStart = canvas.indexOf("let nextArcadeRun");
  const terminalEffectEnd = canvas.indexOf("const shortcuts", terminalEffectStart);
  assert.doesNotMatch(
    canvas.slice(terminalEffectStart, terminalEffectEnd),
    /arcadeRunRef\.current = application\.run|setArcadeRun\(application\.run\)/,
  );
  assert.match(canvas, /if \(arcadePersistence\.status !== "confirmed"\) return/);
  assert.match(canvas, /disabled=\{!arcadePersistenceFailed && !arcadeResolutionReady\}/);
  assert.match(canvas, /onClick=\{arcadePersistenceFailed \? retryArcadeSettlement : continueArcade\}/);
  assert.match(canvas, /SAUVEGARDE ARCADE REQUISE/);
  assert.match(canvas, /aucune progression ni récompense n’est annoncée/);
  assert.match(client, /Promise<PitMatchPersistenceAck>/);
});

test("the twelve playable fighters expose complete distinct data-driven technique recipes", async () => {
  const edition = await editionPromise;
  const techniques = FIGHTER_IDS.map((id) => edition.PIT_FIRST_EDITION_FIGHTERS[id].technique);
  assert.equal(new Set(techniques.map((definition) => definition.id)).size, 12);
  assert.deepEqual(techniques.map((definition) => definition.device), [
    "disc", "net", "plasma", "shoulder", "whip", "bolt-trap",
    "shockwave", "drone", "counter-blade", "spear", "bow-snare", "code-parry",
  ]);
  for (const definition of techniques) {
    assert.match(definition.id, /^[a-z0-9-]+$/);
    assert.ok(["strike", "mark"].includes(definition.contactEffect));
    assert.ok(["linear", "returning", "homing", "stationary", "attached"].includes(definition.motion));
    assert.ok(["contact", "counter"].includes(definition.trigger));
    for (const field of [
      "lifetimeFrames", "armFrames", "speed", "width", "height", "verticalOffset",
      "damageScale", "chipScale", "hitstunBonus", "blockstunBonus", "pushbackScale",
      "ownerDashSpeed", "maxHits", "rehitFrames", "statusFrames", "movementScale",
    ]) {
      assert.equal(Number.isFinite(definition[field]), true, definition.id + "." + field);
    }
    assert.ok(definition.lifetimeFrames > 0);
    assert.ok(definition.width > 0 && definition.height > 0);
    assert.equal(typeof definition.guardBreak, "boolean");
    assert.equal(typeof definition.knockdown, "boolean");
    assert.equal(typeof definition.jumpLocked, "boolean");
    assert.equal(typeof definition.cloakLocked, "boolean");
    assert.equal(
      definition.status === null,
      definition.statusFrames === 0,
      definition.id + " must pair a status with a positive duration",
    );
  }
  assert.equal(edition.PIT_FIRST_EDITION_FIGHTERS["jungle-hunter"].technique.motion, "returning");
  assert.equal(edition.PIT_FIRST_EDITION_FIGHTERS["city-hunter"].technique.status, "netted");
  assert.equal(edition.PIT_FIRST_EDITION_FIGHTERS.scar.technique.guardBreak, true);
  assert.equal(edition.PIT_FIRST_EDITION_FIGHTERS["feral-hunter"].technique.motion, "stationary");
  const falconer = edition.PIT_FIRST_EDITION_FIGHTERS.falconer;
  assert.equal(falconer.technique.motion, "homing");
  assert.equal(falconer.technique.contactEffect, "mark");
  assert.equal(falconer.technique.damageScale, 0);
  assert.equal(falconer.technique.chipScale, 0);
  assert.equal(falconer.technique.status, "tracked");
  assert.equal(falconer.technique.cloakLocked, true);
  assert.equal(falconer.attacks.technique.label, "Marquage du drone");
  assert.equal(techniques.filter((definition) => definition.contactEffect === "mark").length, 1);
  assert.equal(edition.PIT_FIRST_EDITION_FIGHTERS.scarface.technique.trigger, "counter");
  assert.equal(edition.PIT_FIRST_EDITION_FIGHTERS.witch.technique.device, "bow-snare");
});
