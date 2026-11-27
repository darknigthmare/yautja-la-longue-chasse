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
