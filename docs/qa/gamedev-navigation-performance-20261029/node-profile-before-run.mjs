import fs from 'node:fs';
import os from 'node:os';
import inspector from 'node:inspector';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {homeworldSceneSsrV78} from '/workspace/scratch/56a0bf56582d/yautja-apply-guides/tests/helpers/homeworld-scene-ssr-v78.mjs';

const label = process.argv[2] ?? 'baseline';
const root = '/workspace/scratch/56a0bf56582d/yautja-apply-guides';
const fixture = JSON.parse(fs.readFileSync('/tmp/yautja-homeworld-return-fixture.json', 'utf8'));
const qa = homeworldSceneSsrV78(root);
const routes = qa.load('app/game/systems/homeworldWayfindingV111.ts');
const trace = [];
for (const [file, name] of [
  ['homeworldNavigationV109', 'homeworldWalkRouteV109'],
  ['homeworldNavigationV99', 'homeworldWalkRouteV99'],
  ['homeworldNavigationV77', 'homeworldWalkRouteV77'],
]) {
  const module = qa.load('app/game/systems/' + file + '.ts'), original = module[name];
  module[name] = (...args) => {
    const item = {name, level: args[0], from: args[1], to: args[2], started: performance.now()};
    trace.push(item);
    const result = original(...args);
    Object.assign(item, {ms: performance.now() - item.started, status: result.status, points: result.points.length, distance: result.distance});
    return result;
  };
}
const session = new inspector.Session(); session.connect();
const post = (method, params = {}) => new Promise((resolve, reject) => session.post(method, params, (error, result) => error ? reject(error) : resolve(result)));
await post('Profiler.enable'); await post('Profiler.setSamplingInterval', {interval: 1000});
await post('Profiler.start');
const saveBytes = JSON.stringify(fixture.save), startCpu = process.cpuUsage(), start = performance.now(), memoryBefore = process.memoryUsage();
const plan = routes.homeworldRoutePlanV111(fixture.save, fixture.origin, fixture.destinationId);
const elapsedMs = performance.now() - start, cpu = process.cpuUsage(startCpu), memoryAfter = process.memoryUsage();
const {profile} = await post('Profiler.stop'); session.disconnect();
assert.equal(JSON.stringify(fixture.save), saveBytes);
const metadata = {
  label, node: process.version, platform: process.platform, arch: process.arch, cpuModel: os.cpus()[0].model,
  elapsedMs, cpuMs: {user: cpu.user / 1000, system: cpu.system / 1000}, memoryBefore, memoryAfter,
  hashes: Object.fromEntries(['app/game/systems/homeworldWayfindingV111.ts', 'app/game/systems/homeworldNavigationV109.ts'].map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(root + '/' + file)).digest('hex')])),
  request: {origin: fixture.origin, destinationId: fixture.destinationId},
  plan: {status: plan.status, distance: plan.distance, stages: plan.stages.map(stage => ({kind: stage.kind, levelId: stage.levelId, interiorId: stage.interiorId, connectorId: stage.connectorId, points: stage.points, distance: stage.distance}))},
  trace: trace.map(({started, ...item}) => ({...item, startedMs: started - start})),
};
fs.writeFileSync('/tmp/yautja-homeworld-return-' + label + '.cpuprofile', JSON.stringify(profile));
fs.writeFileSync('/tmp/yautja-homeworld-return-' + label + '.json', JSON.stringify(metadata, null, 2));
console.log(JSON.stringify({label, elapsedMs, cpuMs: metadata.cpuMs, status: plan.status, connectors: plan.stages.filter(s => s.kind === 'connector').map(s => s.connectorId), trace: metadata.trace}));
