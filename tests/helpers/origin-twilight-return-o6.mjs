import assert from "node:assert/strict";
import { build } from "esbuild";
import { applyLittleTrailO6, littleTrailAdmissionO6, town, trail } from "./origin-little-trail-o6.mjs";

const bundle = await build({
  stdin: { contents: 'export * from "./app/game/systems/originTwilightReturnO6";', resolveDir: process.cwd(), loader: "ts" },
  bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent",
});
export const twilight = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
export { town, trail };

export function twilightAdmissionO6(partial = false) {
  const p = trail.LITTLE_TRAIL_O6;
  const order = (type, x, detail = {}) => ({ type, x, plane: "trail", ...detail });
  const base = littleTrailAdmissionO6({ partial, nurseryPolicies: true });
  const common = [null, order("observe", p.first - 80), order("sample", p.pebble, { cue: "pebble" }),
    order("sample", p.rub, { cue: "rub" }), order("identify", p.rub, { cue: "rub" })];
  const late = partial ? [order("lose", p.far - 37), order("scan-anchor", p.first), order("scan-old", p.old)] :
    [order("observe", p.far - 80)];
  return [...common, ...late, order("ascend", p.climb),
    order("compare", p.gather, { plane: "overlook" }),
    order("report", p.gather, { plane: "overlook", choice: partial ? "behavior" : "map" })].reduce(applyLittleTrailO6, base);
}

export const twilightCheckpointO6 = (save, action) => {
  const site = twilight.twilightSiteO6(action);
  return town.createHomeworldCheckpointV77(save.createdAt, site.levelId, site.point, null, site.point);
};

export function applyTwilightOrderO6(save, order) {
  const at = twilightCheckpointO6(save, order.action);
  const receipt = twilight.recordTwilightReturnO6(save, order, at);
  assert(receipt, JSON.stringify(order));
  const next = { ...save, homeworld: { ...save.homeworld, locationV77: at },
    originV151: { ...save.originV151, twilightReturnO6: receipt } };
  assert(twilight.keepsTwilightReturnO6(save, next));
  const normalized = town.parseSaveImport(JSON.stringify(next));
  assert.equal(normalized.failure, null);
  return normalized.save;
}
