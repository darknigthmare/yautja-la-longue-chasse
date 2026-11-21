import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';
import {loadWarAssaultReplayRulesV115, recordAssaultReplayV115,
  sampleAssaultReplayV115, verifyAssaultReplayV115} from '../scripts/replay-clan-war-assault-v115.mjs';

const war = await loadWarAssaultReplayRulesV115();
const sample = sampleAssaultReplayV115(war);

test('the real assault completes twice with the same source inputs, tactical frames and report', () => {
  const run = recordAssaultReplayV115(war, sample);
  assert.deepEqual(recordAssaultReplayV115(war, structuredClone(sample)), run);
  assert.match(run.seedInputs.sourceSha, /^[a-f0-9]{64}$/);
  assert.match(run.sha256, /^[a-f0-9]{64}$/);
  assert.ok(Number.isSafeInteger(run.seedInputs.regionalSeed));
  assert.equal(run.seedInputs.waveTerritory.id, sample.targetId);
  assert.notEqual(run.seedInputs.initialDigest, run.finalStateDigest);
  assert.ok(run.report);
  assert.equal(run.report.mode, 'assault');
  assert.equal(run.report.id, run.seedInputs.missionId);

  const deployed = run.frames.find(frame => frame.command[0] === 'deploy');
  assert.equal(deployed.accepted, true);
  assert.equal(deployed.actors.some(actor => actor.side === 'ally' && actor.x === 5), true);
  assert.equal(deployed.pc.alliedAssigned, deployed.pc.alliedDeployed);
  assert.ok(deployed.pc.alliedDeployed > 0);
  const last = run.frames.at(-1);
  assert.equal(last.command[0], 'tick');
  assert.equal(last.clock, run.report.clock);
  assert.ok(last.tick > deployed.tick);
  assert.ok(Array.isArray(last.exchange.shots));
  assert.ok(run.frames.some(frame => frame.exchange?.shots.length > 0));
  assert.ok(last.pc.rivalWaveCommitted > 0);
  assert.ok(last.ap >= 0 && last.rav >= 0);
  assert.deepEqual(verifyAssaultReplayV115(war, JSON.parse(JSON.stringify(run))), {
    verified: true, sha256: run.sha256, frames: run.frames.length, report: run.report,
  });
});

test('an imported V115 start records rejected, accepted and terminal orders separately', () => {
  const initial = war.createWarOperationsV115(war.DEFAULT_WAR_RULES_V6);
  const draft = {...sample, initial, finish: false,
    commands: [['deploy', 'not-a-real-team'], ...sample.commands, ['cloak', sample.teamIds[0]], ['retreat']]};
  const run = recordAssaultReplayV115(war, draft);
  assert.equal(run.frames[1].accepted, false);
  assert.equal(run.frames[1].ap, run.frames[0].ap);
  assert.equal(run.frames[1].rav, run.frames[0].rav);
  assert.deepEqual(run.frames[1].actors, run.frames[0].actors);
  assert.equal(run.frames.at(-2).accepted, true);
  assert.ok(run.frames.at(-2).actors.some(actor => actor.cloak?.active));
  assert.equal(run.report.outcome, 'retreat');
  assert.throws(() => recordAssaultReplayV115(war, {
    ...draft, commands: [...draft.commands, ['tick']],
  }), /après le rapport/);
  assert.throws(() => recordAssaultReplayV115(war, {
    ...draft, initial: {...initial, sourceSha: 'invented-source'},
  }), /Archive initiale/);
});

test('the headless reader rejects modified positions and engine divergence', () => {
  const run = recordAssaultReplayV115(war, sample);
  const altered = structuredClone(run);
  altered.frames.find(frame => frame.actors.length).actors[0].x += 1;
  assert.throws(() => verifyAssaultReplayV115(war, altered), /Empreinte du replay/);
  const incompatibleEngine = {...war, stepAssaultV115(...args) {
    const next = war.stepAssaultV115(...args);
    return {...next, message: 'Different update'};
  }};
  assert.throws(() => verifyAssaultReplayV115(incompatibleEngine, run), /ne reproduit pas/);
});

test('the shipped CLI records and verifies an assault JSON file headlessly', async t => {
  const path = fileURLToPath(new URL('../scripts/replay-clan-war-assault-v115.mjs', import.meta.url));
  const work = await mkdtemp(join(tmpdir(), 'yautja-assault-replay-'));
  t.after(() => rm(work, {recursive: true, force: true}));
  const exec = promisify(execFile);
  const recipe = join(work, 'recipe.json');
  const replay = join(work, 'replay.json');
  const call = (...args) => exec(process.execPath, [path, ...args], {timeout: 15000, maxBuffer: 4 * 1024 * 1024});
  const example = await call('example');
  await writeFile(recipe, example.stdout);
  const recording = await call('record', recipe);
  await writeFile(replay, recording.stdout);
  const checked = JSON.parse((await call('verify', replay)).stdout);
  assert.equal(checked.verified, true);
  assert.equal(checked.sha256, JSON.parse(recording.stdout).sha256);
  assert.equal(checked.report.id, JSON.parse(recording.stdout).report.id);
});
