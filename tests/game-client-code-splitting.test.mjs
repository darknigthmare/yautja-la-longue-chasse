import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import ts from "typescript";

const gameClientUrl = new URL("../app/game/GameClient.tsx", import.meta.url);
const pitCanvasUrl = new URL("../app/game/PitCanvas.tsx", import.meta.url);

function eagerImportModules(source) {
  const file = ts.createSourceFile("GameClient.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  return new Set(file.statements.filter(ts.isImportDeclaration).filter(declaration => {
    const clause = declaration.importClause;
    if (!clause) return true; // Side-effect imports execute the module.
    if (clause.isTypeOnly) return false;
    if (clause.name) return true;
    const bindings = clause.namedBindings;
    return !bindings || !ts.isNamedImports(bindings) || bindings.elements.length === 0 ||
      bindings.elements.some(element => !element.isTypeOnly);
  }).map(declaration => declaration.moduleSpecifier.text));
}

test("TSX import inspection permits types but rejects multiline and side-effect eager modules", () => {
  const imports = eagerImportModules(`
    import type { Props } from "./PitCanvas";
    import { type WrapperProps } from "./PitExperienceV79";
    import {
      Selection
    } from "./PitExperienceV79";
    import "./PitCanvas";
    import type { RegionProps } from "./HomeworldRegionV68";
    import { type RegionProps, Region } from "./HomeworldRegionV68";
    const Canvas = React.lazy(() => import("./HuntCanvas"));
  `);
  assert.deepEqual([...imports].sort(), ["./HomeworldRegionV68", "./PitCanvas", "./PitExperienceV79"]);
  assert.equal(eagerImportModules('import type { Props } from "./PitCanvas";').size, 0);
  assert.equal(eagerImportModules('import { type Props } from "./PitExperienceV79";').size, 0);
});

test("GameClient lazily loads every heavyweight game surface", async () => {
  const source = await readFile(gameClientUrl, "utf8");
  const eagerModules = eagerImportModules(source);

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
  assert(!eagerModules.has("./HuntCanvas"));
  assert(!eagerModules.has("./ShipHub"));
  for (const componentName of [
    "PitCanvas",
    "PitNarrativeTrials",
    "GalaxyMapPanel",
    "PhysicalShipDeck",
    "TrophyWorkshop",
    "EnemyBestiaryV8",
    "HomeworldHub",
    "Mausoleum",
    "HomeworldExpedition",
    "GlassDesertExpedition",
    "JusticePanel",
    "ClanChroniclePanel",
    "NurseryPrologueScreen",
    "YouthTrainingScreen",
    "FirstTracksSoloV66",
    "FirstHuntSoloV67",
    "FirstHuntSoloV68",
    "FirstHuntSoloV69", "FirstHuntSoloV70",
    "HomeworldPassageV67",
    "HomeworldRegionV68",
    "GameReserveV66",
    "ClanWarPanelV85",
    "RecentSpriteLibraryV85",
  ]) {
    const moduleName = componentName === "PitCanvas" ? "PitExperienceV79" : componentName;
    assert.match(
      source,
      new RegExp(
        `const ${componentName} = React\\.lazy\\(\\(\\) => import\\("\\.\\/${moduleName}"\\)\\)`,
      ),
    );
    assert.doesNotMatch(
      source,
      new RegExp(`import ${componentName} from "\\.\\/${componentName}"`),
    );
    for (const forbidden of new Set([componentName, moduleName])) {
      assert(!eagerModules.has(`./${forbidden}`), `${forbidden} must not be imported eagerly`);
    }
  }
  assert.match(
    source,
    /const CatalogueHunterBrowser = React\.lazy\(\(\) =>[\s\S]*?default: module\.CatalogueHunterBrowser/,
  );
  assert(!eagerModules.has("./CatalogueHunterBrowser"));
  assert.equal(source.match(/<ShipHub/g)?.length, 2);
  assert.equal(source.match(/<HuntCanvas/g)?.length, 1);
  assert.equal(source.match(/<PitCanvas/g)?.length, 1);
  assert.equal(source.match(/<PitNarrativeTrials/g)?.length, 1);
  // Check the actual loading boundary of every asynchronous surface instead
  // of a historical total that becomes stale when another screen is added.
  const file = ts.createSourceFile("GameClient.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const lazyNames = new Set(file.statements.filter(ts.isVariableStatement).flatMap(statement =>
    statement.declarationList.declarations.filter(declaration => declaration.initializer &&
      ts.isCallExpression(declaration.initializer) && declaration.initializer.expression.getText(file) === "React.lazy")
      .map(declaration => declaration.name.getText(file))));
  const renders = new Set();
  function inspect(node, ancestors = []) {
    const element = ts.isJsxElement(node) ? node.openingElement : ts.isJsxSelfClosingElement(node) ? node : null;
    const name = element?.tagName.getText(file);
    if (lazyNames.has(name)) {
      renders.add(name);
      assert(ancestors.some(parent => ts.isJsxElement(parent) &&
        ["Suspense", "React.Suspense"].includes(parent.openingElement.tagName.getText(file))),
      `${name} must render inside a Suspense boundary`);
    }
    ts.forEachChild(node, child => inspect(child, [...ancestors, node]));
  }
  inspect(file);
  for (const name of lazyNames) assert(renders.has(name), `${name} has a mounted asynchronous screen`);
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
  const callbackEnd = gameClientSource.indexOf("const recordPitRunTransition", callbackStart);
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
