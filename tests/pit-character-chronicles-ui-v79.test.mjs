import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

// Actual TSX, React and reducers, transpiled in memory. CSS names alone are
// substituted by the shared loader. SSR does not execute effects, decode PNGs,
// prove canvas pixels, hydrate, move focus or simulate a browser/gamepad.
const loader = homeworldSceneSsrV78();
const { PitCharacterChronicleSceneV79: Scene } = loader.load('app/game/PitExperienceV79.tsx');
const C = loader.load('app/game/systems/pitCharacterChroniclesV79.ts');
const arenas = loader.load('app/game/systems/pitCombat.ts').PIT_ARENAS;
const art = loader.load('app/game/pitCombatBitmapArt.ts');
const roster = loader.load('app/game/systems/pitRosterExpansion.ts');
const registry = loader.load('app/game/pitSpriteSheetRegistry.ts').PIT_SPRITE_SHEET_REGISTRY;
const portraits = loader.load('app/game/pitPortraitArt.ts');
const deliveredPages = new Set();
const owner = '2026-10-03T08:00:00.000Z';
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' })[char]);
const render = (fighterId, run, highContrast = false) => renderToStaticMarkup(React.createElement(Scene, {
  fighterId, run, highContrast, onPreview: () => { throw Error('SSR must not pretend to load a stage.'); },
}));
const create = id => C.createPitCharacterChronicleRunV79(id, owner, 'ui-real-' + id, 1);
function enter(run) {
  let next = run;
  while (['intro', 'post', 'defeat'].includes(next.phase)) next = C.advancePitCharacterChronicleV79(next);
  assert.equal(next.phase, 'pre');
  return C.advancePitCharacterChronicleV79(next);
}
function settle(run, index, winner = 'hero') {
  const e = C.getPitCharacterChronicleEncounterV79(run);
  return C.applyPitCharacterChronicleResultV79(run, {
    mode: 'cpu', runId: run.runId, resultId: `${run.runId}-${index}`, encounterId: e.id,
    leftId: e.leftId, rightId: e.rightId, arenaId: e.arenaId,
    winnerId: winner === 'hero' ? e.leftId : winner === 'opponent' ? e.rightId : null,
  }).run;
}
function assertNativeScene(html, arenaId, fighterId) {
  assert.ok(html.includes(`data-pit-stage-preview="${arenaId}"`));
  assert.ok(html.includes(escape(arenas[arenaId].name)));
  const native = art.getPitCombatBitmapArtDefinition(fighterId);
  assert.ok(html.includes(`data-native-chronicle-portrait="${fighterId}"`));
  if (native) {
    assert.ok(html.includes(`src="${native.src}" width="${native.width}" height="${native.height}"`));
    assert.ok(fs.statSync('public' + native.src).isFile());
  } else {
    // A real delivered atlas is an equally valid portrait source. Require the
    // actual loading canvas component plus exact authored idle clips/pages,
    // not merely a new wrapper attribute or a fabricated bitmap fixture.
    assert.ok(roster.isPitExpansionFighterId(fighterId));
    const surface = html.slice(html.indexOf(`data-native-chronicle-portrait="${fighterId}"`)).split('</div>')[0];
    assert.match(surface, /data-pit-extension-portrait="loading" data-native-facing="right"/);
    assert.doesNotMatch(surface, /data-pit-extension-portrait="authored-idle-pose"/);
    const selected = portraits.pitPortraitAnimationRegistry(fighterId, 'right', registry);
    assert.ok(selected.length, 'authored panel must have a real native idle drawing');
    for (const definition of selected) {
      assert.equal(definition.fighterId, fighterId);
      for (const clip of definition.atlas.clips) {
        assert.equal(clip.id, 'idle'); assert.equal(clip.facing, 'right'); assert.equal(clip.status, 'validated');
        assert.ok(clip.frames.length);
        for (const frame of clip.frames) {
          const page = definition.atlas.pages.find(item => item.id === frame.pageId);
          assert.ok(page); assert.equal(page.status, 'validated');
          const [x, y, width, height] = frame.rect;
          assert.ok(x >= 0 && y >= 0 && width > 0 && height > 0 && x + width <= page.width && y + height <= page.height);
          assert.ok(frame.pivot[0] >= 0 && frame.pivot[0] <= width && frame.pivot[1] >= 0 && frame.pivot[1] <= height);
          if (!deliveredPages.has(page.src)) {
            const png = fs.readFileSync('public' + page.src);
            assert.equal(png.subarray(1, 4).toString(), 'PNG');
            assert.equal(png.readUInt32BE(16), page.width); assert.equal(png.readUInt32BE(20), page.height);
            deliveredPages.add(page.src);
          }
        }
      }
    }
  }
  assert.match(html, /aria-busy="true"/);
  assert.doesNotMatch(html, /data-preview-status="ready"/);
}

for (const route of C.PIT_CHARACTER_CHRONICLE_ROUTES_V79) {
  test(route.fighterId + ': real scene renders both introductions, three exact duel outcomes and both endings', () => {
    let run = create(route.fighterId);
    const initialBytes = JSON.stringify(run);
    for (const panel of route.intro) {
      const html = render(route.fighterId, run, true);
      assertNativeScene(html, panel.arenaId, panel.focusId);
      assert.ok(html.includes(`<h3>${escape(panel.title)}</h3>`));
      assert.ok(html.includes(escape(panel.text)));
      assert.match(html, /RECONSTITUTION ORIGINALE · HORS CANON/);
      assert.ok(html.includes(escape(route.continuity)));
      for (const ref of route.biographySources) assert.ok(html.includes(`href="${escape(ref.url)}" target="_blank" rel="noreferrer"`));
      run = C.advancePitCharacterChronicleV79(run);
    }
    assert.equal(run.phase, 'pre');
    for (let index = 0; index < route.encounters.length; index++) {
      const duel = route.encounters[index];
      const before = render(route.fighterId, run);
      assertNativeScene(before, duel.arenaId, route.fighterId);
      assert.ok(before.includes(escape(duel.before)));
      assert.equal((before.match(/aria-current="step"/g) ?? []).length, 1);
      run = settle(enter(run), index);
      const after = render(route.fighterId, run);
      assertNativeScene(after, duel.arenaId, route.fighterId);
      assert.ok(after.includes(`<h3>${escape(duel.title)}</h3>`), 'post must show the completed opponent, not the next one');
      assert.ok(after.includes(escape(duel.after)));
      assert.equal((after.match(/data-complete="true"/g) ?? []).length, index + 1);
      run = C.advancePitCharacterChronicleV79(run);
    }
    assert.equal(run.phase, 'outro');
    for (const panel of route.outro) {
      const html = render(route.fighterId, run);
      assertNativeScene(html, panel.arenaId, panel.focusId);
      assert.ok(html.includes(`<h3>${escape(panel.title)}</h3>`));
      assert.ok(html.includes(escape(panel.text)));
      run = C.advancePitCharacterChronicleV79(run);
    }
    const finished = render(route.fighterId, run);
    assert.equal(run.phase, 'finished');
    assert.match(finished, /Les 3 rencontres sont remportées/);
    assert.equal((finished.match(/data-complete="true"/g) ?? []).length, 3);
    assert.doesNotMatch(finished, /aria-current="step"/);
    assert.equal(JSON.stringify(create(route.fighterId)), initialBytes, 'rendering must not mutate story state');
  });
}

test('real defeat/reload states show remaining recoveries and the correct pending venue without a fabricated win', () => {
  let run = create('tracker');
  for (let index = 0; index < 3; index++) {
    run = settle(enter(run), 'loss-' + index, 'opponent');
    const html = render('tracker', run);
    assert.equal((html.match(/data-complete="true"/g) ?? []).length, 0);
    if (index < 2) assert.ok(html.includes(`Il reste ${run.continuesRemaining} reprise`));
    else { assert.match(html, /Les deux reprises ont été utilisées/); assert.doesNotMatch(html, /Les 3 rencontres sont remportées/); }
  }
  let live = settle(enter(create('theta')), 'first-win');
  live = enter(live);
  const before = JSON.stringify(live);
  const restored = C.parsePitCharacterChronicleRunV79(C.serializePitCharacterChronicleRunV79(live), owner);
  const html = render('theta', restored);
  assert.equal(restored.phase, 'pre');
  assert.equal(restored.encounterIndex, 1);
  assert.equal(restored.results.length, 1);
  assert.equal((html.match(/data-complete="true"/g) ?? []).length, 1);
  const e = C.getPitCharacterChronicleEncounterV79(restored);
  assertNativeScene(html, e.arenaId, 'theta');
  assert.ok(html.includes(escape(e.before)));
  assert.equal(JSON.stringify(live), before);
});

test('new authored profiles render their original branch and honest identity provenance before any duel', () => {
  const ids = ['jungle-hunter', 'city-hunter', 'berserker', 'wolf'];
  for (const id of ids) {
    const status = C.getPitCharacterChronicleStatusV79(id), html = render(id, null);
    assert.equal(status.route.version, 2);
    assert.ok(html.includes(escape(roster.getPitFighterProfile(id).name)));
    assert.ok(html.includes(escape(status.biography)));
    assert.ok(html.includes(escape(status.limitation)));
    assert.match(html, /RECONSTITUTION ORIGINALE/);
    assert.match(html, /IDENTITÉ FOURNIE · BIOGRAPHIE NON CERTIFIÉE/);
    assert.doesNotMatch(html, /Rencontres de la chronique|data-complete|Les 8 rencontres sont remportées/);
  }
});

const read = file => fs.readFileSync('app/game/' + file, 'utf8');
const source = read('PitExperienceV79.tsx');
const parsed = ts.createSourceFile('PitExperienceV79.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function walk(node, predicate, result = []) {
  if (predicate(node)) result.push(node);
  ts.forEachChild(node, child => { walk(child, predicate, result); });
  return result;
}
function arrow(name) {
  const node = walk(parsed, n => ts.isVariableDeclaration(n) && n.name.getText(parsed) === name)[0];
  assert.ok(node?.initializer && ts.isArrowFunction(node.initializer), name + ' must be a real production callback');
  return node.initializer.body.getText(parsed);
}
function jsxProps(node) {
  return Object.fromEntries(node.attributes.properties.filter(ts.isJsxAttribute).map(attr => [attr.name.getText(parsed), attr.initializer?.getText(parsed) ?? true]));
}

test('real integration unmounts the versus controller and keys the local story to the campaign owner', () => {
  const fn = walk(parsed, n => ts.isFunctionDeclaration(n) && n.name?.text === 'PitExperienceV79')[0];
  const condition = walk(fn, n => ts.isConditionalExpression(n) && n.condition.getText(parsed) === 'selected === null')[0];
  assert.ok(condition);
  assert.ok(condition.whenTrue.getText(parsed).startsWith('<PitCanvas'));
  assert.ok(condition.whenFalse.getText(parsed).startsWith('<PitCharacterChronicleControllerV79'));
  const child = walk(condition.whenFalse, ts.isJsxSelfClosingElement)[0], attrs = jsxProps(child);
  assert.equal(attrs.key, '{ownerSaveCreatedAt}');
  assert.equal(attrs.ownerSaveCreatedAt, '{ownerSaveCreatedAt}');
  assert.match(condition.whenFalse.getText(parsed), /onBack=\{\(\) => setSelected\(null\)\}/);
  assert.match(source, /useMenuGamepad\(root, !inDuel,/);
  const entry = read('GameClient.tsx');
  assert.match(entry, /React\.lazy\(\(\) => import\("\.\/PitExperienceV79"\)\)/);
  assert.match(entry, /<PitCanvas\s+key=\{save\.createdAt\}\s+ownerSaveCreatedAt=\{save\.createdAt\}/);
});

test('real result callback persists the outcome but leaves KO/victory mounted until the explicit Exit', () => {
  const finish = arrow('finishMatch'), exit = arrow('leaveDuel');
  assert.match(finish, /!alive\.current/);
  assert.match(finish, /completedDuel\.current \?\? currentRun/);
  assert.match(finish, /completedDuel\.current = resolved\.run/);
  assert.match(finish, /store\(resolved\.run\)/);
  assert.doesNotMatch(finish, /\b(?:setRun|update|onBack|onChoose|setSelected)\s*\(/);
  assert.match(exit, /update\(completedDuel\.current \?\? checkpointPitCharacterChronicleV79\(currentRun\)\)/);
  const duel = walk(parsed, n => ts.isJsxSelfClosingElement(n) && n.tagName.getText(parsed) === 'PitCanvas'
    && n.attributes.properties.some(p => ts.isJsxAttribute(p) && p.name.getText(parsed) === 'narrativeEncounter'))[0];
  const attrs = jsxProps(duel);
  assert.equal(attrs.onNarrativeComplete, '{finishMatch}'); assert.equal(attrs.onExit, '{leaveDuel}');
  assert.equal(attrs.reducedGore, '{true}');
  assert.equal(attrs.narrativeEncounter, '{encounter}');
  assert.match(attrs.key, /currentRun\.runId.*encounter\.id.*attempt/);
  for (const disallowed of ['onMatchComplete', 'onRunTransition', 'onOpenCharacterChronicle', 'savedCircuitRuns', 'savedDescentRuns']) assert.equal(attrs[disallowed], undefined);
  assert.ok(duel.attributes.properties.every(ts.isJsxAttribute), 'campaign callbacks must not leak through a spread into the ritual duel');
  const canvas = read('PitCanvas.tsx'), tree = ts.createSourceFile('PitCanvas.tsx', canvas, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const branch = walk(tree, node => ts.isIfStatement(node) && node.expression.getText(tree) === 'narrativeEncounter'
    && node.thenStatement.getText(tree).includes('const narrativeResult'))[0];
  assert.ok(branch, 'narrative result must use a distinct real branch');
  const narrative = branch.thenStatement.getText(tree);
  assert.match(narrative, /mode !== "cpu"/);
  assert.match(narrative, /onNarrativeComplete\(narrativeResult\)/);
  assert.match(narrative, /return;/);
});

test('checkpoint restoration is owner/fighter guarded, cancellable and cannot silently overwrite an incompatible slot', () => {
  assert.match(source, /\$\{pitCharacterChronicleStorageKeyV79\(owner, version\)\}\.\$\{fighter\}/);
  assert.match(source, /parsePitCharacterChronicleRunV79\(serialized, ownerSaveCreatedAt\)/);
  assert.match(source, /restored\?\.fighterId !== selectedRoute\.fighterId/);
  assert.match(source, /queueMicrotask\(\(\) => \{\s*if \(cancelled\) return;/);
  assert.match(source, /return \(\) => \{ cancelled = true; \};\s*\}, \[selectedId, ownerSaveCreatedAt, contentVersion\]\)/);
  assert.match(source, /currentRun \|\| hasCheckpoint \? setConfirmRestart\(true\) : start\(\)/);
  assert.doesNotMatch(source, /localStorage\.(?:clear|removeItem)\(/);
  assert.match(arrow('store'), /localStorage\.getItem\(key\) !== serialized/);
  assert.match(source, /inert=\{confirmRestart\}/);
  assert.match(source, /role="alertdialog" aria-modal="true"/);
  assert.match(source, /if \(confirmRestart\) setConfirmRestart\(false\); else if \(reviewPanel\) setReviewPanel\(null\); else onBack\(\)/);
  assert.match(source, /confirmRestart && event\.key === 'Tab'/);
  assert.match(source, /document\.activeElement === first.*document\.activeElement === last/);
});

test('failed precombat stage has an accessible retry outside the decorative scene and remounts the real preview', () => {
  const retry = walk(parsed, node => ts.isJsxOpeningElement(node) && node.tagName.getText(parsed) === 'button'
    && node.attributes.properties.some(attr => ts.isJsxAttribute(attr) && attr.name.getText(parsed) === 'data-chronicle-preview-retry'))[0];
  assert.ok(retry, 'a failed preview must not strand the player behind its hidden decorative notice');
  const props = jsxProps(retry);
  assert.match(props.onClick, /setPreview\(null\)/); assert.match(props.onClick, /setPreviewRetry\(value => value \+ 1\)/);
  let parent = retry.parent;
  while (parent && !(ts.isJsxElement(parent) && jsxProps(parent.openingElement).className === '{styles.controls}')) {
    if (ts.isJsxElement(parent)) assert.notEqual(jsxProps(parent.openingElement)['aria-hidden'], '"true"');
    parent = parent.parent;
  }
  assert.ok(parent, 'retry is a real controller action outside aria-hidden landscape');
  const scene = walk(parsed, node => ts.isJsxSelfClosingElement(node) && node.tagName.getText(parsed) === 'PitCharacterChronicleSceneV79')[0];
  assert.match(jsxProps(scene).key, /selectedId.*previewRetry/);
  assert.match(source, /currentRun\?\.phase === 'pre' && preview\?\.id === encounter\?\.arenaId && preview\?\.status === 'failed'/);
  assert.match(source, /selectedId, loadedId, currentRun\?\.phase/);
});
