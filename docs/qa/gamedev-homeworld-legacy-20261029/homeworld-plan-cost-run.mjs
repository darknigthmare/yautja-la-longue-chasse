import fs from 'node:fs';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {cargoRouteV108} from '/workspace/scratch/56a0bf56582d/yautja-apply-guides/tests/helpers/cargo-v108-route.mjs';

const root = '/workspace/scratch/56a0bf56582d/yautja-apply-guides';
const variant = process.argv[2];
const f = cargoRouteV108('2026-10-29T12:00:00.000Z');
const nav = f.qa.load('app/game/systems/homeworldNavigationV109.ts');
const saves = f.qa.load('app/game/save.ts');
const location = f.qa.load('app/game/systems/homeworldLocationV77.ts');
let routes;
if (variant === 'baseline') {
  const ts = createRequire(root + '/package.json')('typescript');
  const source = fs.readFileSync('/tmp/yautja-homeworld-wayfinding-baseline.ts', 'utf8');
  const compiled = ts.transpileModule(source, {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true}}).outputText;
  const module = {exports: {}};
  new Function('require', 'module', 'exports', compiled)(specifier => {
    assert(specifier.startsWith('.'));
    return f.qa.load('app/game/systems/' + specifier + '.ts');
  }, module, module.exports);
  routes = module.exports;
} else {
  assert.equal(variant, 'patched');
  routes = f.qa.load('app/game/systems/homeworldWayfindingV111.ts');
}
f.start(); f.walkTo(f.b.lots[0].stand); f.action('take-wide');
let {actor, ledger} = structuredClone(f.state());
const carrying = nav.homeworldWalkRouteV109('0', actor, {x: 4500, y: 2960}, ledger);
assert.equal(carrying.status, 'reachable');
for (const waypoint of carrying.points.slice(1)) {
  let ticks = 0;
  while (Math.hypot(waypoint.x - actor.x, waypoint.y - actor.y) > 1 && ticks++ < 5000) {
    const before = actor, span = Math.max(Math.abs(waypoint.x - actor.x) / 330, Math.abs(waypoint.y - actor.y) / 260, 1 / 60);
    actor = f.api.stepHomeworldCargoActorV108(actor, {moveX: (waypoint.x - actor.x) / (330 * span), climb: (waypoint.y - actor.y) / (260 * span), jumpPressed: false}, 1 / 60, '0', ledger);
    const sampled = f.api.sampleCargoWalkV108(ledger, before, actor, 1 / 60, f.context(actor));
    assert(!sampled.invalid); ledger = sampled.ledger;
  }
  assert(ticks < 5000);
}
f.restore({actor, ledger}); f.action('interrupt'); f.action('park');
const save = saves.defaultSave(f.owner);
save.homeworld.visitedDistrictIds = ['port', 'council'];
save.homeworld.cargoV108 = structuredClone(f.state().ledger);
save.homeworld.locationV77 = location.createHomeworldCheckpointV77(f.owner, '0', actor, null, actor);
if (variant === 'patched') fs.writeFileSync('/tmp/yautja-homeworld-connector-fixture.json', JSON.stringify(save));
const origin = {actor, levelId: '0', interiorId: null};
const measure = () => {
  const started = performance.now();
  const plan = routes.homeworldRoutePlanV111(save, origin, 'point:audience-point');
  return {ms: performance.now() - started, status: plan.status, connectors: plan.stages.filter(s => s.kind === 'connector').map(s => s.connectorId)};
};
const first = measure(), warm = Array.from({length: 20}, measure).map(result => result.ms).sort((a, b) => a - b);
console.log(JSON.stringify({variant, first, warmMedianMs: (warm[9] + warm[10]) / 2, warmMaxMs: warm.at(-1), fixture: {owner: f.owner, actor: {x: actor.x, y: actor.y}, cargo: f.state().ledger.receipt.lots}}));
