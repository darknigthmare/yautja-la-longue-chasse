import assert from "node:assert/strict";
import { qa } from "./elite-recognition-played-v175.mjs";
import { continuationAdmissionO6 } from "./origin-continuation-o6.mjs";
import { town } from "./origin-twilight-return-o6.mjs";

export const terrain = town;
export const horizons = qa.load("app/game/systems/originHorizonsO6.ts");

export function horizonsAdmissionO6(withCourtyard = true) {
  const save = continuationAdmissionO6("review", null);
  save.homeworldRegionV68 = null;
  save.homeworldPassageV67 = null;
  if (!withCourtyard) {
    delete save.originV151.trainingYardO6;
    delete save.residenceV149;
  }
  const start = town.HOMEWORLD_COUNCIL_STAIR_LANDINGS_V77.from;
  save.homeworld.locationV77 = town.createHomeworldCheckpointV77(save.createdAt, start.levelId, start.point, null, start.point);
  const loaded = town.parseSaveImport(town.exportSave(save));
  assert.ok(loaded.save, loaded.failure);
  return loaded.save;
}

export function horizonCheckpointO6(save, site) {
  const { levelId, point } = horizons.horizonSiteO6(site);
  return terrain.createHomeworldCheckpointV77(save.createdAt, levelId, point, null, point);
}

export function applyHorizonO6(save, order) {
  const at = horizonCheckpointO6(save, order.kind === "prepare" ? order.horizon : "saar");
  const receipt = horizons.recordHorizonsO6(save, order, at);
  assert.ok(receipt, JSON.stringify(order));
  const next = { ...save, homeworld: { ...save.homeworld, locationV77: at },
    originV151: { ...save.originV151, horizonsO6: receipt } };
  assert.ok(horizons.keepsHorizonsO6(save, next));
  return next;
}
