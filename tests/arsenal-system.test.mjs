import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "vite";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = await mkdtemp(join(tmpdir(), "yautja-arsenal-"));

await build({
  configFile: false,
  publicDir: false,
  logLevel: "silent",
  build: {
    emptyOutDir: true,
    outDir: outputDirectory,
    ssr: resolve(projectRoot, "app/game/systems/arsenal.ts"),
    rollupOptions: {
      output: { entryFileNames: "arsenal.mjs" },
    },
  },
});

const {
  applyRuntimeSettings,
  createArsenalRuntime,
  deserializeArsenalRuntime,
  effectiveArmorStats,
  effectiveGearStats,
  effectiveWeaponStats,
  purchaseUpgrade,
  resolveDifficultyTuning,
  resolveRuntimeSettings,
  serializeArsenalRuntime,
  tickArsenalRuntime,
  useGearSlot,
} = await import(pathToFileURL(join(outputDirectory, "arsenal.mjs")).href);

after(async () => {
  await rm(outputDirectory, { force: true, recursive: true });
});

function inventory(overrides = {}) {
  return {
    unlockedWeaponIds: [
      "wristblades",
      "combistick",
      "plasma-caster",
      "smart-disc",
      "yautja-bow",
    ],
    unlockedGearIds: [
      "motion-sensor",
      "audio-decoy",
      "netgun",
      "snare",
    ],
    unlockedArmorIds: ["hunter", "scout", "berserker"],
    weaponUpgrades: {
      wristblades: 0,
      combistick: 0,
      "plasma-caster": 0,
      "smart-disc": 0,
      "yautja-bow": 0,
    },
    gearUpgrades: {
      "motion-sensor": 1,
      "audio-decoy": 0,
      netgun: 0,
      snare: 0,
    },
    armorUpgrades: {
      hunter: 0,
      scout: 0,
      berserker: 0,
    },
    ...overrides,
  };
}

function configuration() {
  return {
    loadout: {
      armorId: "hunter",
      weaponIds: ["wristblades", "plasma-caster"],
      gearIds: ["motion-sensor", "audio-decoy"],
    },
    inventory: inventory(),
    difficultyId: "hunter",
  };
}

function saveForPurchase(clanMarks = 1_000) {
  return {
    version: 3,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    profile: {
      hunterName: "Test",
      rankId: "blooded",
      honor: 500,
      clanMarks,
      playTimeSeconds: 0,
    },
    inventory: inventory(),
    loadout: configuration().loadout,
    appearance: {},
    missionProgress: {},
    trophies: [],
    codex: { unlockedEntryIds: [], scanCounts: {} },
    statistics: {},
    settings: {
      difficultyId: "hunter",
      masterVolume: 0.8,
      musicVolume: 0.65,
      effectsVolume: 0.85,
      screenShake: true,
      reducedGore: false,
      highContrastVision: false,
    },
    storyCompleted: false,
  };
}

test("two deterministic gear slots spend charges, respect cooldowns and round-trip", () => {
  const config = configuration();
  const initial = createArsenalRuntime(config);
  assert.deepEqual(
    initial.slots.map((slot) => slot.gearId),
    ["motion-sensor", "audio-decoy"],
  );
  assert.equal(initial.slots[0].maxCharges, 4);

  const firstUse = useGearSlot(initial, 0, {
    origin: { x: 100, y: 200 },
    aim: { x: 900, y: 200 },
  });
  assert.equal(firstUse.ok, true);
  assert.equal(firstUse.event.id, "motion-sensor:0");
  assert.equal(firstUse.event.kind, "reveal");
  assert.equal(firstUse.state.slots[0].charges, 3);

  const blocked = useGearSlot(firstUse.state, 0, {
    origin: { x: 100, y: 200 },
  });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.failure, "cooldown-active");

  const advanced = tickArsenalRuntime(firstUse.state, 5);
  assert.equal(advanced.slots[0].cooldownRemainingSeconds, 0);
  assert.equal(advanced.elapsedSeconds, 5);

  const secondUse = useGearSlot(advanced, 1, {
    origin: { x: 0, y: 0 },
    aim: { x: 10_000, y: 0 },
  });
  assert.equal(secondUse.ok, true);
  assert.equal(secondUse.event.kind, "lure");
  assert.ok(
    Math.hypot(secondUse.event.target.x, secondUse.event.target.y) <=
      secondUse.event.rangePx + 0.000_001,
  );

  const serialized = serializeArsenalRuntime(secondUse.state);
  const restored = deserializeArsenalRuntime(serialized, config);
  assert.equal(serializeArsenalRuntime(restored), serialized);
});

test("upgrade purchases are immutable, consume clan marks and stop at level two", () => {
  const original = saveForPurchase();
  const first = purchaseUpgrade(original, {
    domain: "weapon",
    id: "plasma-caster",
  });
  assert.equal(first.ok, true);
  assert.equal(first.spentClanMarks, 200);
  assert.equal(first.newLevel, 1);
  assert.equal(first.save.profile.clanMarks, 800);
  assert.equal(first.save.inventory.weaponUpgrades["plasma-caster"], 1);
  assert.equal(original.profile.clanMarks, 1_000);
  assert.equal(original.inventory.weaponUpgrades["plasma-caster"], 0);

  const second = purchaseUpgrade(first.save, {
    domain: "weapon",
    id: "plasma-caster",
  });
  assert.equal(second.ok, true);
  assert.equal(second.spentClanMarks, 450);
  assert.equal(second.save.profile.clanMarks, 350);
  assert.equal(second.save.inventory.weaponUpgrades["plasma-caster"], 2);

  const maximum = purchaseUpgrade(second.save, {
    domain: "weapon",
    id: "plasma-caster",
  });
  assert.equal(maximum.ok, false);
  assert.equal(maximum.quote.failure, "max-level");

  const poorSave = saveForPurchase(149);
  const insufficient = purchaseUpgrade(poorSave, {
    domain: "gear",
    id: "motion-sensor",
  });
  assert.equal(insufficient.ok, false);
  assert.equal(insufficient.quote.failure, "insufficient-clan-marks");
});

test("upgrades and difficulty expose directly applicable runtime values", () => {
  const baseWeapon = effectiveWeaponStats("plasma-caster", 0);
  const upgradedWeapon = effectiveWeaponStats("plasma-caster", 2);
  assert.ok(upgradedWeapon.damage > baseWeapon.damage);
  assert.ok(upgradedWeapon.cooldownSeconds < baseWeapon.cooldownSeconds);
  assert.ok(upgradedWeapon.energyCost < baseWeapon.energyCost);

  const baseArmor = effectiveArmorStats("hunter", 0);
  const upgradedArmor = effectiveArmorStats("hunter", 2);
  assert.ok(upgradedArmor.maxHealth > baseArmor.maxHealth);
  assert.equal(upgradedArmor.medicompCharges, baseArmor.medicompCharges + 1);

  const youngGear = effectiveGearStats("netgun", 0, "young-blood");
  const elderGear = effectiveGearStats("netgun", 0, "elder");
  assert.ok(youngGear.rangePx > elderGear.rangePx);

  const hunter = resolveDifficultyTuning("hunter");
  const elder = resolveDifficultyTuning("elder");
  assert.ok(elder.enemyDetectionMultiplier > hunter.enemyDetectionMultiplier);
  assert.ok(elder.playerDamageTakenMultiplier > hunter.playerDamageTakenMultiplier);
  assert.equal(elder.checkpointCount, 0);
});

test("audio and accessibility settings resolve and apply through an adapter", () => {
  const settings = {
    difficultyId: "hunter",
    masterVolume: 0.8,
    musicVolume: 0.5,
    effectsVolume: 0.25,
    screenShake: false,
    reducedGore: true,
    highContrastVision: true,
  };
  const resolved = resolveRuntimeSettings(settings);
  assert.deepEqual(resolved.audio, {
    muted: false,
    masterGain: 0.8,
    musicGain: 0.5,
    effectsGain: 0.25,
  });
  assert.equal(resolved.accessibility.screenShakeScale, 0);
  assert.equal(resolved.accessibility.goreIntensity, 0.25);
  assert.match(resolved.accessibility.canvasFilter, /contrast/);

  const calls = [];
  const applied = applyRuntimeSettings(settings, {
    setMuted: (value) => calls.push(["muted", value]),
    setMasterGain: (value) => calls.push(["master", value]),
    setMusicGain: (value) => calls.push(["music", value]),
    setEffectsGain: (value) => calls.push(["effects", value]),
    setScreenShakeScale: (value) => calls.push(["shake", value]),
    setGoreIntensity: (value) => calls.push(["gore", value]),
    setHighContrastVision: (value, filter) =>
      calls.push(["contrast", value, filter]),
  });
  assert.deepEqual(applied, resolved);
  assert.deepEqual(calls.slice(0, 6), [
    ["muted", false],
    ["master", 0.8],
    ["music", 0.5],
    ["effects", 0.25],
    ["shake", 0],
    ["gore", 0.25],
  ]);
  assert.deepEqual(calls[6].slice(0, 2), ["contrast", true]);
});
