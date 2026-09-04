import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const gameClientUrl = new URL("../app/game/GameClient.tsx", import.meta.url);
const pitCanvasUrl = new URL("../app/game/PitCanvas.tsx", import.meta.url);

test("GameClient lazily loads every heavyweight game surface", async () => {
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
  for (const componentName of [
    "PitCanvas",
    "GalaxyMapPanel",
    "PhysicalShipDeck",
    "TrophyWorkshop",
    "EnemyBestiaryV8",
  ]) {
    assert.match(
      source,
      new RegExp(
        `const ${componentName} = React\\.lazy\\(\\(\\) => import\\("\\.\\/${componentName}"\\)\\)`,
      ),
    );
    assert.doesNotMatch(
      source,
      new RegExp(`import ${componentName} from "\\.\\/${componentName}"`),
    );
  }
  assert.match(
    source,
    /const CatalogueHunterBrowser = React\.lazy\(\(\) =>[\s\S]*?default: module\.CatalogueHunterBrowser/,
  );
  assert.equal(source.match(/<ShipHub/g)?.length, 2);
  assert.equal(source.match(/<HuntCanvas/g)?.length, 1);
  assert.equal(source.match(/<PitCanvas/g)?.length, 1);
  assert.equal(
    source.match(/<Suspense fallback=\{<DeferredGameScreen \/>\}>/g)?.length,
    8,
  );
  assert.match(
    source,
    /className="loading-mark" role="status" aria-live="polite"/,
  );
});

test("THE PIT terminal results stay isolated from campaign rewards", async () => {
  const [gameClientSource, pitCanvasSource] = await Promise.all([
    readFile(gameClientUrl, "utf8"),
    readFile(pitCanvasUrl, "utf8"),
  ]);
  const callbackStart = gameClientSource.indexOf("const recordPitMatch");
  const callbackEnd = gameClientSource.indexOf("const go = useCallback", callbackStart);
  assert.ok(callbackStart >= 0 && callbackEnd > callbackStart);
  const callbackSource = gameClientSource.slice(callbackStart, callbackEnd);

  assert.match(callbackSource, /loadPitSave/);
  assert.match(callbackSource, /applyPitResult/);
  assert.match(callbackSource, /writePitSave/);
  assert.match(callbackSource, /expectedOwnerSaveCreatedAt/);
  assert.match(callbackSource, /id: result\.resultId/);
  assert.match(callbackSource, /withPitWriteLock\(\{/);
  const lockStart = gameClientSource.indexOf("function withPitWriteLock");
  const lockEnd = gameClientSource.indexOf("export default function GameClient", lockStart);
  assert.ok(lockStart >= 0 && lockEnd > lockStart);
  const lockSource = gameClientSource.slice(lockStart, lockEnd);
  assert.match(lockSource, /navigator\.locks/);
  assert.match(lockSource, /runWithFallbackLease/);
  assert.match(lockSource, /\.write-lock/);
  assert.match(callbackSource, /pitSaveStorageKey/);
  assert.doesNotMatch(callbackSource, /applyMissionResult|writeSaveWithStatus/);
  assert.match(gameClientSource, /onMatchComplete=\{recordPitMatch\}/);
  assert.match(gameClientSource, /clearPitSave\(previousOwnerSaveCreatedAt\)/);

  assert.match(
    pitCanvasSource,
    /playbackReplay \|\| combat\.phase !== "match-over"/,
  );
  assert.match(pitCanvasSource, /reportedMatchFrameRef\.current !== null/);
  assert.match(pitCanvasSource, /leftRoundsWon: combat\.fighters\[0\]\.roundsWon/);
  assert.doesNotMatch(pitCanvasSource, /applyMissionResult|writeSaveWithStatus/);
});
