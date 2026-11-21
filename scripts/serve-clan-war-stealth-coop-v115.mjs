import {resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {clanWarTokenIdentitiesV127, createClanWarHttpServiceV127} from './serve-clan-war-practice-v127.mjs';
import {coopOrderSequences, openClanWarCoopJournal} from './clan-war-coop-journal.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const offsets = {up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0]};
const actions = new Set(['ready', 'launch', ...Object.keys(offsets),
  'wait', 'cloak', 'hide', 'decoy', 'listen', 'radio', 'sabotage', 'extract']);
const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const point = ({guardX, guardY}) => ({x: guardX, y: guardY});

export async function loadWarStealthCoopRulesV115() {
  const {outputFiles} = await build({
    stdin: {
      contents: `
        export {DEFAULT_WAR_RULES_V6} from './app/game/systems/clanWarBibleV6';
        export {guardSeesHunter} from './app/game/systems/clanWarOperationsV115';
        export {
          warMissionTerrainV116, warTerrainCellBlockedV116, warTerrainLineOfSightV116,
        } from './app/game/systems/clanWarMissionTerrainV116';
        export {warStealthGuardVisibleV138, warStealthSoundBearingV138} from './app/game/systems/clanWarParallelModesV138';
        export {warStealthPatrolSpawnV140} from './app/game/systems/clanWarStealthPatrolV140';
        export {warStealthDecoyPatrolV141} from './app/game/systems/clanWarStealthDecoyV141';
        export {warStealthListenCueV115} from './app/game/systems/clanWarStealthAcousticsV115';
      `,
      resolveDir: root,
    },
    bundle: true, write: false, format: 'esm', platform: 'node', target: 'node22', logLevel: 'warning',
  });
  return import('data:text/javascript;base64,' + Buffer.from(outputFiles[0].contents).toString('base64'));
}

function validOrder(order) {
  if (!order || typeof order !== 'object' || Array.isArray(order)) return false;
  const fields = ['id', 'sequence', 'revision', 'tick', 'kind', 'target'];
  return Object.keys(order).length === fields.length && fields.every(key => Object.hasOwn(order, key)) &&
    typeof order.id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(order.id) &&
    Number.isSafeInteger(order.sequence) && order.sequence > 0 &&
    Number.isSafeInteger(order.revision) && order.revision >= 0 &&
    Number.isSafeInteger(order.tick) && order.tick >= 0 && actions.has(order.kind) && order.target === null;
}

export function createWarStealthCoopServerV115(game, {tokens, targetId = 'W3-K02', stateDirectory} = {}) {
  if (!Array.isArray(tokens) || tokens.length < 2 || tokens.length > 4) {
    throw new Error('Un salon d’infiltration exige deux à quatre jetons.');
  }
  const identities = clanWarTokenIdentitiesV127(tokens.map((token, index) => ({
    token, id: 'infiltrator-' + (index + 1), leader: index === 0,
  })));
  const terrain = game.warMissionTerrainV116(targetId, game.DEFAULT_WAR_RULES_V6);
  let patrol = game.warStealthPatrolSpawnV140(terrain);
  let team = identities.map(({id}) => ({id, ...terrain.extraction, ready: false, extracted: false,
    alarm: 0, detected: false, energy: 5, cloaked: false, hiding: false,
    footsteps: null, decoy: null, decoyUsed: false, listens: 0}));
  const personal = new Map(identities.map(({id}) => [id, {sequence: 0, orders: new Set()}]));
  const radio = [];
  let phase = 'briefing', revision = 0, tick = 0, sabotaged = false, report = null;
  const isCover = actor => terrain.cover.includes(actor.x + ',' + actor.y);
  const activeNoise = trace => trace && trace.until >= tick;
  const guardVisible = actor => !actor.extracted && phase === 'active' &&
    game.warStealthGuardVisibleV138({...actor, ...patrol}, terrain);

  function view(identity) {
    const actor = team.find(member => member.id === identity.id);
    return {
      mode: 'co-op-stealth-v115', phase, revision, tick, you: identity.id,
      nextSequence: personal.get(identity.id).sequence + 1,
      team: team.map(({id, ready, extracted}, index) => ({id, ready, extracted, leader: index === 0})),
      briefing: {targetId, title: terrain.title, ground: terrain.ground, width: terrain.width, height: terrain.height,
        relay: terrain.relay, extraction: terrain.extraction, walls: terrain.walls, cover: terrain.cover},
      objective: {sabotaged, extracted: team.filter(member => member.extracted).length, needed: team.length},
      self: {x: actor.x, y: actor.y, alarm: actor.alarm, cloaked: actor.cloaked, energy: actor.energy,
        detected: actor.detected, listens: actor.listens,
        bearing: game.warStealthSoundBearingV138(actor, tick),
        noise: [
          ...(activeNoise(actor.footsteps) ? [{kind: 'footsteps', turnsLeft: actor.footsteps.until - tick + 1}] : []),
          ...(activeNoise(actor.decoy) ? [{kind: 'decoy', turnsLeft: actor.decoy.until - tick + 1}] : []),
        ]},
      contact: guardVisible(actor) ? point(patrol) : null,
      radio,
      report,
    };
  }

  function finish(outcome, reason) {
    phase = 'complete';
    report = {id: 'W115-COOP-STEALTH-' + targetId, outcome, reason, tick, sabotaged,
      extracted: team.filter(actor => actor.extracted).length, needed: team.length, campaignMutation: false};
  }

  function advance(actor, kind) {
    if (Object.hasOwn(offsets, kind)) {
      const [dx, dy] = offsets[kind], x = actor.x + dx, y = actor.y + dy;
      if (game.warTerrainCellBlockedV116(terrain, x, y)) return false;
      actor = {...actor, x, y, hiding: false, footsteps: {x, y, until: tick + 2}};
    } else if (kind === 'cloak') {
      if (!actor.cloaked && actor.energy === 0) return false;
      actor = {...actor, cloaked: !actor.cloaked, hiding: false};
    } else if (kind === 'hide') {
      if (!isCover(actor)) return false;
      actor = {...actor, hiding: true};
    } else if (kind === 'decoy') {
      if (actor.decoyUsed || actor.cloaked || actor.energy < 2) return false;
      actor = {...actor, energy: actor.energy - 2, decoyUsed: true, hiding: false,
        decoy: {x: actor.x, y: actor.y, until: tick + 3}};
    } else if (kind === 'listen') {
      if (!isCover(actor) || actor.listens >= 2) return false;
      const cue = game.warStealthListenCueV115({...actor, ...patrol}, terrain);
      actor = {...actor, listens: actor.listens + 1, heardBearing: cue?.bearing, heardAtTick: tick + 1};
    } else if (kind === 'sabotage') {
      if (sabotaged || distance(actor, terrain.relay) > 1) return false;
      actor = {...actor, cloaked: false, hiding: false};
      sabotaged = true;
    } else if (kind === 'extract') {
      if (!sabotaged || distance(actor, terrain.extraction) !== 0) return false;
      team = team.map(member => member.id === actor.id ? {...actor, extracted: true, detected: false} : member);
      if (team.every(member => member.extracted)) finish('victory', 'collective-extraction');
      return true;
    } else if (kind === 'radio') {
      if (!guardVisible(actor)) return false;
      const direction = patrol.guardX < terrain.width / 2 ? 'ouest' : 'est';
      const band = patrol.guardY < terrain.height / 2 ? 'nord' : 'sud';
      if (radio.some(note => note.tick === tick && note.from === actor.id)) return false;
      radio.push({tick, from: actor.id, kind: 'patrol-sector', sector: band + '-' + direction});
      if (radio.length > 12) radio.shift();
      return true;
    } else if (kind !== 'wait') return false;

    tick++;
    team = team.map(member => member.id === actor.id ? actor : member);
    const current = point(patrol);
    const signals = team.flatMap(member => [
      {trace: member.decoy, range: 6, priority: 0},
      {trace: member.footsteps, range: 2, priority: 1},
    ]).filter(({trace, range}) => activeNoise(trace) &&
      distance(current, trace) <= (game.warTerrainLineOfSightV116(terrain, current, trace) ? range : range / 2));
    signals.sort((a, b) => a.priority - b.priority || distance(current, a.trace) - distance(current, b.trace));
    patrol = game.warStealthDecoyPatrolV141(terrain, patrol, signals[0]?.trace ?? null);
    const guard = point(patrol);
    team = team.map(member => {
      if (member.extracted) return member;
      const isActing = member.id === actor.id;
      let energy = member.cloaked ? Math.max(0, member.energy - 1) : member.energy;
      const cloaked = member.cloaked && energy > 0;
      const hiding = member.hiding && isCover(member) && distance(guard, member) > 1;
      const detected = game.guardSeesHunter(terrain, guard, member, cloaked, hiding);
      const raised = detected || (isActing && kind === 'sabotage');
      let alarm = member.alarm + Number(raised);
      if (!raised && isActing && kind === 'hide') alarm = Math.max(0, alarm - 1);
      if (!detected && !cloaked && isActing && (kind === 'wait' || kind === 'hide')) energy = Math.min(5, energy + 1);
      return {...member, energy, cloaked, detected, alarm};
    });
    if (team.some(member => member.alarm >= 3)) finish('defeat', 'capture');
    else if (tick >= 65) finish('defeat', 'time');
    return true;
  }

  function applyOrder(identity, order) {
    if (!validOrder(order)) return {status: 400, error: 'invalid-order'};
    const progress = personal.get(identity.id);
    if (progress.orders.has(order.id)) return {status: 409, error: 'duplicate-order'};
    if (progress.orders.size >= 256) return {status: 422, error: 'order-limit'};
    if (order.sequence !== progress.sequence + 1 || order.revision !== revision || order.tick !== tick) {
      return {status: 409, error: 'state-changed'};
    }
    const actor = team.find(member => member.id === identity.id);
    if (phase === 'briefing' && order.kind === 'ready' && !actor.ready) {
      team = team.map(member => member.id === actor.id ? {...member, ready: true} : member);
    } else if (phase === 'briefing' && order.kind === 'launch' && identity.leader && team.every(member => member.ready)) {
      phase = 'active';
    } else if (phase !== 'active' || actor.extracted || !advance(actor, order.kind)) {
      return {status: 422, error: 'order-refused'};
    }
    revision++;
    progress.sequence = order.sequence;
    progress.orders.add(order.id);

    return {status: 200};
  }

  const journal = openClanWarCoopJournal(stateDirectory,
    {schema: 'clan-stealth-coop-v115-1', targetId, seats: identities.length},
    event => {
      const identity = identities.find(player => player.id === event.actor);
      return !!identity && applyOrder(identity, event.order).status === 200;
    },
    () => ({phase, revision, tick, patrol, team, radio, sabotaged, report, personal: coopOrderSequences(personal)}));

  function submit(identity, order) {
    try {
      journal?.assertCurrent();
      const result = applyOrder(identity, order);
      if (result.status !== 200) return result;
      journal?.commit({actor: identity.id, order});
      return {status: 200, state: view(identity)};
    } catch (error) {
      if (!journal) throw error;
      journal.invalidate();
      return {status: 503, error: 'journal-unavailable'};
    }
  }

  return createClanWarHttpServiceV127({
    identities, submit, tick: () => {}, tickMs: 60_000,
    view(identity) {
      journal?.assertCurrent();
      return view(identity);
    },
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.YAUTJA_CLAN_STEALTH_COOP_PORT ?? 8790);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new Error('Port de salon invalide.');
  let tokens;
  try {
    tokens = JSON.parse(process.env.YAUTJA_CLAN_STEALTH_COOP_TOKENS ?? '[]');
  } catch {
    throw new Error('YAUTJA_CLAN_STEALTH_COOP_TOKENS doit contenir un tableau JSON de jetons.');
  }
  const server = createWarStealthCoopServerV115(await loadWarStealthCoopRulesV115(), {
    tokens, targetId: process.env.YAUTJA_CLAN_STEALTH_COOP_TARGET,
    stateDirectory: process.env.YAUTJA_CLAN_STEALTH_COOP_STATE_DIRECTORY,
  });
  server.on('error', error => {
    process.stderr.write('Impossible d’ouvrir le salon (' + (error.code ?? 'erreur') + ').\n');
    process.exitCode = 1;
  });
  server.listen(port, '127.0.0.1', () => {
    process.stdout.write('Infiltration coopérative V115 sur http://127.0.0.1:' + port + '\n');
  });
}
