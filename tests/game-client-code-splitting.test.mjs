import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const gameClientUrl = new URL("../app/game/GameClient.tsx", import.meta.url);

test("GameClient lazily loads every HuntCanvas and ShipHub screen", async () => {
  const source = await readFile(gameClientUrl, "utf8");

  assert.match(
    source,
    /const HuntCanvas = React\.lazy\(\(\) => import\("\.\/HuntCanvas"\)\)/,
  );
  assert.match(
    source,
    /const ShipHub = React\.lazy\(\(\) => import\("\.\/ShipHub"\)\)/,
  );
  assert.doesNotMatch(source, /import HuntCanvas from "\.\/HuntCanvas"/);
  assert.doesNotMatch(source, /import ShipHub from "\.\/ShipHub"/);
  assert.equal(source.match(/<ShipHub/g)?.length, 2);
  assert.equal(source.match(/<HuntCanvas/g)?.length, 1);
  assert.equal(
    source.match(/<Suspense fallback=\{<DeferredGameScreen \/>\}>/g)?.length,
    3,
  );
  assert.match(
    source,
    /className="loading-mark" role="status" aria-live="polite"/,
  );
});
