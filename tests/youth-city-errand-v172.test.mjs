import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const bundle = await build({
  stdin: {
    contents: `
      export * from "./app/game/systems/youthCityErrandV172";
      export { HOMEWORLD_POINTS, defaultHomeworldProgress, normalizeHomeworldProgress } from "./app/game/systems/homeworld";
    `,
    loader: "ts",
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  logLevel: "silent",
});
const city = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));

test("R2-M003 keeps the actual forge and local stops in order after export and restore", () => {
  for (const stop of ["audience-point", "forge-service", "memory-service", "training-service"]) {
    assert(city.HOMEWORLD_POINTS.some(point => point.id === stop));
  }
  for (const route of ["escort", "archives"]) {
    let errand = city.startYouthCityErrandV172("2026-11-22T06:00:00.000Z", route);
    assert.equal(city.youthCityCarriesPieceV172(errand), true);
    assert.equal(city.acknowledgeYouthCityStopV172(errand, "kennel"), null);
    for (const stop of city.YOUTH_CITY_ROUTES_V172[route]) {
      assert.equal(city.nextYouthCityStopV172(errand), stop);
      const before = errand;
      errand = city.acknowledgeYouthCityStopV172(before, stop);
      assert.equal(city.acknowledgeYouthCityStopV172(errand, stop), null);
      const raw = JSON.stringify({ ...city.defaultHomeworldProgress(), youthCityErrandV172: errand });
      assert.deepEqual(city.normalizeHomeworldProgress(JSON.parse(raw)).youthCityErrandV172, errand);
      if (stop === "forge-service") assert.equal(city.youthCityCarriesPieceV172(errand), false);
    }
    assert.equal(city.nextYouthCityStopV172(errand), undefined);
    assert.equal(errand.reached, 4);
    assert.equal(city.normalizeYouthCityErrandV172({ ...errand, reached: 5 }), null);
  }
  assert.equal(city.normalizeHomeworldProgress(city.defaultHomeworldProgress()).youthCityErrandV172, undefined);
});
