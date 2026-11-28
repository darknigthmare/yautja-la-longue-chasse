import assert from "node:assert/strict";
import test from "node:test";
import { homeworldSceneSsrV78 } from "./helpers/homeworld-scene-ssr-v78.mjs";

const qa = homeworldSceneSsrV78();
const saves = qa.load("app/game/save.ts");
const work = qa.load("app/game/systems/hunterCustomizationPersistenceV146.ts");
const dress = qa.load("app/game/systems/hunterCustomizationV146.ts");
const harvest = qa.load("app/game/systems/harvestInventoryV112.ts");
const wear = qa.load("app/game/hunterArmorWearV172.ts");
const owner = "2026-11-21T20:30:00.000Z";
const key = saves.SAVE_STORAGE_KEY;

function memory() {
  const values = new Map();
  return {
    get length() { return values.size; },
    key: index => [...values.keys()][index] ?? null,
    getItem: id => values.get(id) ?? null,
    setItem: (id, value) => values.set(id, value),
    removeItem: id => values.delete(id),
  };
}

function withDamagedPlate() {
  const save = saves.defaultSave(owner);
  save.customizationV146 = dress.applyHeavyWearV146(dress.emptyCustomizationV146(), ["chest", "shin", "shin"]);
  save.inventory.harvestV112 = {
    ...harvest.emptyHarvestInventoryV112(),
    archive: [{ speciesId: "local-vey", partId: "carapace", label: "Plaques", count: 3, qualityTotal: 270 }],
  };
  return save;
}

test("the repair debits two prepared units once and leaves a valid proportional quality total", () => {
  const storage = memory();
  const seeded = saves.writeSaveWithStatus(withDamagedPlate(), storage, key);
  assert.equal(seeded.persisted, true, seeded.failure);
  let writes = 0;
  const repair = (current, level) => work.commitHunterCustomizationV146({
    current, expectedOwnerCreatedAt: owner,
    apply: actual => work.applyHunterForgeRepairV146(actual, "chest", level),
    write: next => { writes++; return saves.writeSaveWithStatus(next, storage, key); },
    reconcile: () => { throw new Error("No uncertain write in this scenario."); },
  });
  assert.deepEqual(repair(seeded.save, 2), { ok: false, failure: "refused" });
  assert.equal(writes, 0);
  const healed = repair(seeded.save, 1);
  assert.equal(healed.ok, true, healed.failure);
  assert.equal(writes, 1);
  assert.deepEqual(healed.save.customizationV146.heavyWear, { shin: 2 });
  assert.deepEqual(healed.save.inventory.harvestV112.archive, [
    { speciesId: "local-vey", partId: "carapace", label: "Plaques", count: 1, qualityTotal: 90 },
  ]);
  assert.equal(healed.save.profile.clanMarks, seeded.save.profile.clanMarks);
  assert.deepEqual(repair(healed.save, 1), { ok: false, failure: "refused" });
  assert.equal(writes, 1);
  assert.equal(work.applyHunterForgeRepairV146(healed.save, "shin", 2), null);
  const read = saves.loadSaveWithStatus(storage, key);
  assert.equal(read.loaded, true);
  assert.equal(read.source, "primary");
  assert.equal(read.failure, null);
  assert.deepEqual(read.save.inventory.harvestV112.archive, healed.save.inventory.harvestV112.archive);
  assert.deepEqual(read.save.customizationV146.heavyWear, healed.save.customizationV146.heavyWear);
  const portable = saves.parseSaveImport(saves.exportSave(read.save));
  assert.equal(portable.failure, null);
  assert.deepEqual(portable.save.inventory.harvestV112.archive, healed.save.inventory.harvestV112.archive);
});

test("the visual state follows only worn plates and keeps their real registered artwork", () => {
  const damage = ["chest", "shin", "biomask", "bracer"];
  const safe = Array.from({ length: 8 }, (_, index) =>
    dress.heavyHitPieceV146(25, 100, index, piece => wear.armorWearPieceIsWornV172(piece, "scout", false)));
  assert.deepEqual([...new Set(safe)].sort(), ["belt", "chest", "shoulder"]);
  const hunter = withDamagedPlate();
  const render = (armorId, maskWorn) => qa.render("app/game/HunterRigPreview.tsx", {
    appearance: hunter.appearance, armorId, maskWorn, weaponIds: [], pose: "run", facing: -1, phase: .42,
    heavyWearV146: dress.applyHeavyWearV146(dress.emptyCustomizationV146(), damage).heavyWear,
  });
  const scout = render("scout", false);
  assert.match(scout, /data-piece-wear="chest" data-wear-source="[^"]*\/armor\/registered\/[^"]*"/);
  assert.doesNotMatch(scout, /data-piece-wear="(shin|biomask|bracer)"/);
  assert.ok(render("hunter", false).includes('data-piece-wear="shin"'));
  assert.ok(render("hunter", false).includes('data-piece-wear="bracer"'));
});

test("a displayed material quote spends the chosen lot only and refuses a stale debit", () => {
  const save = withDamagedPlate();
  const ledger = save.inventory.harvestV112;
  const plate = ledger.archive[0];
  const hide = { speciesId: "oseris-iv--mist-pouncer", partId: "hide", label: "Pelage de bondisseur", count: 2, qualityTotal: 150 };
  ledger.archive.push(hide);
  const preferred = work.forgeMaterialKeyV146(hide);
  const manual = work.planForgeRepairMaterialsV146(ledger.archive, 2, preferred);
  assert.deepEqual(manual.quote.units, [{ ...hide, consumed: 2 }]);
  assert.equal(work.planForgeRepairMaterialsV146(ledger.archive, 4, preferred), null);
  const automatic = work.planForgeRepairMaterialsV146(ledger.archive, 4);
  assert.deepEqual(automatic.quote.units, [{ ...plate, consumed: 3 }, { ...hide, consumed: 1 }]);
  assert.deepEqual(automatic.archive, [{ ...hide, count: 1, qualityTotal: 75 }]);

  const changed = { ...save, inventory: { ...save.inventory, harvestV112: { ...ledger, archive: [plate, { ...hide, qualityTotal: 151 }] } } };
  assert.equal(work.applyHunterForgeRepairV146(changed, "chest", 1, manual.quote), null);
  const next = work.applyHunterForgeRepairV146(save, "chest", 1, manual.quote);
  const stored = saves.parseSaveImport(saves.exportSave(next));
  assert.equal(stored.failure, null);
  assert.deepEqual(stored.save.inventory.harvestV112.archive, [plate]);
  assert.deepEqual(stored.save.customizationV146.heavyWear, { shin: 2 });
  assert.deepEqual(ledger.archive, [plate, hide]);
});

test("forge purchases advance the same equipment tiers while proving both material debits", () => {
  const arsenal = qa.load("app/game/systems/arsenal.ts");
  const save = withDamagedPlate();
  const armorId = save.loadout.armorId;
  const bone = { speciesId: "oseris-iv--jungle-xeno-scout", partId: "bone", label: "Segment caudal", count: 5, qualityTotal: 401 };
  const hide = { speciesId: "oseris-iv--mist-pouncer", partId: "hide", label: "Pelage", count: 3, qualityTotal: 227 };
  const reserved = save.inventory.harvestV112.archive[0];
  save.inventory.harvestV112.archive.push(bone, hide);
  const selection = { bone: work.forgeMaterialKeyV146(bone), hide: work.forgeMaterialKeyV146(hide) };
  const request = { domain: "armor", id: armorId };
  save.profile.clanMarks = 0;
  assert.equal(arsenal.quoteUpgrade(save, request).canPurchase, false);
  assert.equal(work.planForgeArmorMaterialsV146(save, { bone: selection.hide, hide: selection.bone }), null);
  const first = work.planForgeArmorMaterialsV146(save, selection);
  assert.equal(first.quote.nextLevel, 1);
  assert.deepEqual(first.quote.units, [{ ...bone, consumed: 2 }, { ...hide, consumed: 1 }]);

  const changed = structuredClone(save);
  changed.inventory.harvestV112.archive[2].qualityTotal++;
  assert.equal(work.applyHunterForgeArmorUpgradeV146(changed, first.quote), null);
  const locked = structuredClone(save);
  locked.inventory.unlockedArmorIds = [];
  assert.equal(work.forgeArmorRecipeV146(locked), null);
  assert.equal(work.applyHunterForgeArmorUpgradeV146(locked, first.quote), null);
  const switched = structuredClone(save);
  switched.loadout.armorId = armorId === "scout" ? "hunter" : "scout";
  assert.equal(work.applyHunterForgeArmorUpgradeV146(switched, first.quote), null);

  const storage = memory();
  assert(saves.writeSaveWithStatus(save, storage, key).persisted);
  function commit(current, quote) {
    return work.commitHunterCustomizationV146({
      current,
      expectedOwnerCreatedAt: owner,
      apply: actual => work.applyHunterForgeArmorUpgradeV146(actual, quote),
      write: next => saves.writeSaveWithStatus(next, storage, key),
      reconcile: () => { throw new Error("No uncertain write in this scenario."); },
    });
  }
  const paid = commit(saves.loadSaveWithStatus(storage, key).save, first.quote);
  assert(paid.ok, paid.failure);
  const restored = saves.loadSaveWithStatus(storage, key).save;
  assert.equal(restored.inventory.armorUpgrades[armorId], 1);
  assert.equal(arsenal.quoteUpgrade(restored, request).currentLevel, 1);
  assert(arsenal.effectiveArmorStats(armorId, 1).maxHealth > arsenal.effectiveArmorStats(armorId, 0).maxHealth);
  assert.deepEqual(restored.inventory.harvestV112.archive, [
    reserved, { ...bone, count: 3, qualityTotal: 241 }, { ...hide, count: 2, qualityTotal: 151 },
  ]);
  assert.deepEqual(commit(restored, first.quote), { ok: false, failure: "refused" });
  assert.deepEqual(restored.customizationV146.heavyWear, save.customizationV146.heavyWear);
  assert.equal(restored.profile.clanMarks, 0);
  assert.equal(restored.profile.honor, save.profile.honor);

  const second = work.planForgeArmorMaterialsV146(restored, selection);
  assert.equal(second.quote.nextLevel, 2);
  assert.deepEqual(second.quote.units.map(unit => unit.consumed), [3, 2]);
  const finished = commit(restored, second.quote);
  assert(finished.ok, finished.failure);
  const portable = saves.parseSaveImport(saves.exportSave(finished.save));
  assert.equal(portable.failure, null);
  assert.equal(portable.save.inventory.armorUpgrades[armorId], 2);
  assert.deepEqual(portable.save.inventory.harvestV112.archive, [reserved]);
  assert.equal(work.forgeArmorRecipeV146(portable.save), null);
  assert.equal(work.applyHunterForgeArmorUpgradeV146(portable.save, second.quote), null);
});

test("a forged tool brace spends only the quoted bone and stays aligned with physical use receipts", () => {
  const seed = withDamagedPlate();
  const archive = seed.inventory.harvestV112.archive;
  const bone = { speciesId: "oseris-iv--jungle-xeno-scout", partId: "bone", label: "Segment caudal", count: 3, qualityTotal: 271 };
  archive.push(bone);
  const key = work.forgeMaterialKeyV146(bone);
  assert.equal(work.planForgeToolReinforcementV146(seed, key), null);
  seed.inventory.fieldToolIds = ["flaying-tool"];
  seed.inventory.harvestV112.toolCondition = 25;
  assert.equal(work.planForgeToolReinforcementV146(seed, work.forgeMaterialKeyV146(archive[0])), null);
  const before = structuredClone(seed);
  const plan = work.planForgeToolReinforcementV146(seed, key);
  assert.deepEqual(plan.quote.units, [{ ...bone, consumed: 2 }]);
  const changed = structuredClone(seed);
  changed.inventory.harvestV112.archive[1].qualityTotal--;
  assert.equal(work.applyHunterForgeToolReinforcementV146(changed, plan.quote), null);
  const applied = work.applyHunterForgeToolReinforcementV146(seed, plan.quote);
  const stored = saves.parseSaveImport(saves.exportSave(applied));
  assert.equal(stored.failure, null);
  const reinforced = stored.save;
  assert.deepEqual(seed, before);
  assert.deepEqual(reinforced.profile, before.profile);
  assert.equal(reinforced.inventory.harvestV112.reinforcedTool, true);
  assert.equal(reinforced.inventory.harvestV112.toolCondition, 25);
  assert.deepEqual(reinforced.inventory.harvestV112.archive, [archive[0], { ...bone, count: 1, qualityTotal: 90 }]);
  assert.equal(work.applyHunterForgeToolReinforcementV146(reinforced, plan.quote), null);
  const forged = structuredClone(reinforced);
  forged.inventory.fieldToolIds = [];
  assert.equal(saves.parseSaveImport(JSON.stringify(forged)).failure, "invalid-save");

  const mission = "jungle-vey";
  const run = reinforced.missionProgress[mission].attempts;
  const prefix = mission + ":" + run + ":";
  const uses = [prefix + "flay:prey", prefix + "harvest-hide:prey"];
  const settled = harvest.deliverHarvestV112(reinforced, [], uses, false, mission, run);
  assert(settled.ok, settled.reason);
  assert.equal(settled.inventory.harvestV112.toolCondition, 17);
  assert.deepEqual(settled.inventory.harvestV112.toolUseIds, uses);
  assert.equal(harvest.toolConditionAfterUsesV112(25, 2), 15);
  const repaired = harvest.repairFieldToolV112({ ...reinforced, inventory: settled.inventory });
  assert(repaired.ok, repaired.message);
  assert.equal(repaired.save.inventory.harvestV112.toolCondition, 100);
  assert.equal(repaired.save.inventory.harvestV112.reinforcedTool, true);
  assert.deepEqual(repaired.save.inventory.harvestV112.toolUseIds, uses);
});

test("the equipped weapon advances across both native tiers with the exact selected bone and tissue only", () => {
  const current = withDamagedPlate();
  const weaponId = "combistick";
  assert(work.equippedForgeWeaponsV146(current).includes(weaponId));
  const native = qa.load("app/game/systems/arsenal.ts");
  const bone = { speciesId: "nivalis-k--glacier-ram", partId: "bone", label: "Côte renforcée", count: 5, qualityTotal: 453 };
  const tissue = { speciesId: "oseris-iv--vineback-grazer", partId: "tissue", label: "Ligament dorsal", count: 3, qualityTotal: 221 };
  const reserve = [current.inventory.harvestV112.archive[0], bone, tissue];
  current.inventory.harvestV112.archive = reserve;
  const selection = { bone: work.forgeMaterialKeyV146(bone), tissue: work.forgeMaterialKeyV146(tissue) };
  const first = work.planForgeWeaponMaterialsV146(current, weaponId, selection);
  assert(first);
  assert.deepEqual(Array.from(first.quote.units, row => row.consumed), [2, 1]);
  assert.equal(first.quote.currentLevel, 0);
  assert.equal(first.quote.nextLevel, 1);
  assert.deepEqual(first.harvest.archive[1], { ...bone, count: 3, qualityTotal: 272 });
  assert.deepEqual(first.harvest.archive[2], { ...tissue, count: 2, qualityTotal: 147 });
  assert.equal(work.planForgeWeaponMaterialsV146(current, weaponId, { bone: selection.tissue, tissue: selection.bone }), null);
  assert.equal(work.planForgeWeaponMaterialsV146(current, "plasma-caster", selection), null);
  const tampered = { ...first.quote, units: first.quote.units.map(row => ({ ...row, consumed: 1 })) };
  assert.equal(work.applyHunterForgeWeaponUpgradeV146(current, tampered), null);
  const changedLoadout = { ...current, loadout: { ...current.loadout, weaponIds: ["wristblades", "plasma-caster"] } };
  assert.equal(work.applyHunterForgeWeaponUpgradeV146(changedLoadout, first.quote), null);
  const changedReserve = { ...current, inventory: { ...current.inventory, harvestV112: {
    ...current.inventory.harvestV112, archive: [reserve[0], { ...bone, qualityTotal: 450 }, tissue],
  } } };
  assert.equal(work.applyHunterForgeWeaponUpgradeV146(changedReserve, first.quote), null);

  const storage = memory();
  const persisted = saves.writeSaveWithStatus(current, storage, key);
  assert(persisted.persisted, persisted.failure);
  let save = persisted.save;
  for (const level of [1, 2]) {
    const plan = work.planForgeWeaponMaterialsV146(save, weaponId, selection);
    assert(plan);
    const result = work.commitHunterCustomizationV146({
      current: save, expectedOwnerCreatedAt: owner,
      apply: actual => work.applyHunterForgeWeaponUpgradeV146(actual, plan.quote),
      write: next => saves.writeSaveWithStatus(next, storage, key),
      reconcile: (attempt, expectedOwner) => saves.reconcileSaveWrite(attempt, expectedOwner, storage, key),
    });
    assert(result.ok, result.failure);
    save = result.save;
    assert.equal(save.inventory.weaponUpgrades[weaponId], level);
    assert.equal(work.applyHunterForgeWeaponUpgradeV146(save, plan.quote), null);
    assert(native.effectiveWeaponStats(weaponId, level).damage > native.effectiveWeaponStats(weaponId, level - 1).damage);
  }
  assert.equal(work.forgeWeaponRecipeV146(save, weaponId), null);
  assert.equal(save.inventory.weaponUpgrades.wristblades, current.inventory.weaponUpgrades.wristblades);
  assert.equal(save.profile.clanMarks, current.profile.clanMarks);
  assert.equal(save.profile.honor, current.profile.honor);
  assert.deepEqual(save.loadout, current.loadout);
  assert.deepEqual(save.inventory.harvestV112.archive, [reserve[0]]);
  const restored = saves.parseSaveImport(saves.exportSave(save)).save;
  assert(restored);
  assert.equal(restored.inventory.weaponUpgrades[weaponId], 2);
  assert.deepEqual(restored.inventory.harvestV112.archive, [reserve[0]]);
});

test("the material path for the bow respects admission, native ammunition and the unchanged blade recipe", () => {
  const save = withDamagedPlate();
  const bow = "yautja-bow";
  const bone = { speciesId: "nivalis-k--glacier-ram", partId: "bone", label: "Côte renforcée", count: 3, qualityTotal: 268 };
  const tissue = { speciesId: "oseris-iv--vineback-grazer", partId: "tissue", label: "Ligament dorsal", count: 5, qualityTotal: 401 };
  save.inventory.harvestV112.archive = [bone, tissue];
  const selection = { bone: work.forgeMaterialKeyV146(bone), tissue: work.forgeMaterialKeyV146(tissue) };
  assert.equal(work.forgeWeaponRecipeV146(save, bow), null);
  save.inventory.unlockedWeaponIds.push(bow);
  assert.equal(work.forgeWeaponRecipeV146(save, bow), null);
  save.loadout.weaponIds = [bow, "combistick"];

  const tierOne = work.planForgeWeaponMaterialsV146(save, bow, selection);
  assert(tierOne);
  assert.deepEqual(tierOne.quote.requirements, { bone: 1, tissue: 2 });
  assert.deepEqual(work.forgeWeaponRecipeV146(save, "combistick").requirements, { bone: 2, tissue: 1 });
  const appliedOne = work.applyHunterForgeWeaponUpgradeV146(save, tierOne.quote);
  assert(appliedOne);
  assert.deepEqual(appliedOne.inventory.harvestV112.archive, [
    { ...bone, count: 2, qualityTotal: 179 },
    { ...tissue, count: 3, qualityTotal: 241 },
  ]);
  const tierTwo = work.planForgeWeaponMaterialsV146(appliedOne, bow, selection);
  assert(tierTwo);
  assert.deepEqual(tierTwo.quote.requirements, { bone: 2, tissue: 3 });
  assert.equal(work.applyHunterForgeWeaponUpgradeV146(appliedOne, tierOne.quote), null);
  const appliedTwo = work.applyHunterForgeWeaponUpgradeV146(appliedOne, tierTwo.quote);
  assert(appliedTwo);
  assert.deepEqual(appliedTwo.inventory.harvestV112.archive, []);
  assert.equal(appliedTwo.inventory.weaponUpgrades.combistick, 0);
  assert.equal(appliedTwo.profile.clanMarks, save.profile.clanMarks);
  const restored = saves.parseSaveImport(saves.exportSave(appliedTwo)).save;
  assert(restored);
  const native = qa.load("app/game/systems/arsenal.ts");
  assert.equal(native.effectiveWeaponStats(bow, restored.inventory.weaponUpgrades[bow]).ammo, 10);
  assert.equal(work.forgeWeaponRecipeV146(restored, bow), null);
});

for (const [weapon, expected, charge, recovery] of [
  ["plasma-caster", [{ bone: 2, tissue: 2 }, { bone: 3, tissue: 3 }], 1.1, "none"],
  ["smart-disc", [{ bone: 3, tissue: 1 }, { bone: 4, tissue: 2 }], 0, "return"],
]) {
  test(`the forge preserves ${weapon} identity, exact stock and effective attacks through both tiers`, () => {
    let save = withDamagedPlate();
    const untouched = save.inventory.harvestV112.archive[0];
    const boneCount = expected[0].bone + expected[1].bone;
    const tissueCount = expected[0].tissue + expected[1].tissue;
    const bone = { speciesId: "nivalis-k--glacier-ram", partId: "bone", label: "Côte renforcée", count: boneCount, qualityTotal: boneCount * 91 };
    const tissue = { speciesId: "oseris-iv--vineback-grazer", partId: "tissue", label: "Ligament dorsal", count: tissueCount, qualityTotal: tissueCount * 79 };
    const stock = [untouched, bone, tissue];
    save.inventory.harvestV112.archive = stock;
    const selection = { bone: work.forgeMaterialKeyV146(bone), tissue: work.forgeMaterialKeyV146(tissue) };
    assert.equal(work.planForgeWeaponMaterialsV146(save, weapon, selection), null, "A spare weapon cannot go in this vise");
    save.loadout.weaponIds = [weapon, "wristblades"];
    const locked = structuredClone(save);
    locked.inventory.unlockedWeaponIds = locked.inventory.unlockedWeaponIds.filter(id => id !== weapon);
    assert.equal(work.planForgeWeaponMaterialsV146(locked, weapon, selection), null);
    if (weapon === "smart-disc") {
      assert(!save.inventory.unlockedWeaponIds.includes(weapon));
      save.inventory.unlockedWeaponIds.push(weapon);
    }
    const arsenal = qa.load("app/game/systems/arsenal.ts");
    const combat = qa.load("app/game/systems/huntSystems.ts");
    const startMarks = save.profile.clanMarks;
    for (const level of [1, 2]) {
      const plan = work.planForgeWeaponMaterialsV146(save, weapon, selection);
      assert(plan);
      assert.deepEqual(plan.quote.requirements, expected[level - 1]);
      const applied = work.applyHunterForgeWeaponUpgradeV146(save, plan.quote);
      assert(applied);
      assert.equal(work.applyHunterForgeWeaponUpgradeV146(applied, plan.quote), null);
      const restored = saves.parseSaveImport(saves.exportSave(applied));
      assert(restored.save, restored.failure);
      save = restored.save;
      assert.equal(save.inventory.weaponUpgrades[weapon], level);
      assert.equal(save.inventory.weaponUpgrades.wristblades, 0);
      assert.deepEqual(save.loadout.weaponIds, [weapon, "wristblades"]);
      assert.equal(save.profile.clanMarks, startMarks);
      assert.deepEqual(save.inventory.harvestV112.archive, level === 1 ? [
        untouched,
        { ...bone, count: expected[1].bone, qualityTotal: expected[1].bone * 91 },
        { ...tissue, count: expected[1].tissue, qualityTotal: expected[1].tissue * 79 },
      ] : [untouched]);
      const before = arsenal.effectiveWeaponStats(weapon, level - 1);
      const current = arsenal.effectiveWeaponStats(weapon, save.inventory.weaponUpgrades[weapon]);
      const attack = combat.resolveHunterWeaponAttack(weapon, current, charge);
      const previousAttack = combat.resolveHunterWeaponAttack(weapon, before, charge);
      assert(attack.damage > previousAttack.damage);
      assert(attack.energyCost < previousAttack.energyCost);
      assert(attack.cooldownSeconds < previousAttack.cooldownSeconds);
      assert.equal(attack.recovery, recovery);
      assert.equal(attack.ammoCost, weapon === "smart-disc" ? 1 : 0);
      assert.equal(current.ammo, weapon === "smart-disc" ? level + 1 : null);
    }
    assert.equal(work.forgeWeaponRecipeV146(save, weapon), null);
  });
}
