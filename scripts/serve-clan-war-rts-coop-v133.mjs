import {resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {clanWarTokenIdentitiesV127, createClanWarHttpServiceV127} from './serve-clan-war-practice-v127.mjs';
import {coopOrderSequences, openClanWarCoopJournal} from './clan-war-coop-journal.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const identifier = /^[A-Za-z0-9_-]{1,64}$/;
const directions = new Set(['up', 'down', 'left', 'right']);
const squadCommands = new Set([
  'select', 'release', 'observe', 'interact', 'wait', 'power', 'stabilize', 'pickup', 'extract', 'retreat',
]);

export async function loadWarRtsCoopRulesV133() {
  const {outputFiles} = await build({
    stdin: {
      contents: `
        export {DEFAULT_WAR_RULES_V6} from './app/game/systems/clanWarBibleV6';
        export {
          createWarRtsSquadsV133, draftWarRtsSquadV133, removeWarRtsSquadV133,
          launchWarRtsSquadsV133, commandWarRtsSquadsV133,
          visibleWarRtsEnemiesV133,
        } from './app/game/systems/clanWarRtsSquadsV133';
        export {warMapLineOfSightV128} from './app/game/systems/clanWarSourceMapsV128';
      `,
      resolveDir: root,
    },
    bundle: true, write: false, format: 'esm', platform: 'node', target: 'node22', logLevel: 'warning',
  });
  return import('data:text/javascript;base64,' + Buffer.from(outputFiles[0].contents).toString('base64'));
}

function exact(value, keys) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}

function validOrder(order) {
  if (!exact(order, ['id', 'sequence', 'revision', 'tick', 'kind', 'target']) ||
      typeof order.id !== 'string' || !identifier.test(order.id) ||
      !Number.isSafeInteger(order.sequence) || order.sequence < 1 ||
      !Number.isSafeInteger(order.revision) || order.revision < 0 ||
      !Number.isSafeInteger(order.tick) || order.tick < 0) return false;
  if (order.kind === 'ready' || order.kind === 'launch') return order.target === null;
  if (order.kind === 'draft') {
    return exact(order.target, ['unitId']) && typeof order.target.unitId === 'string' && identifier.test(order.target.unitId);
  }
  const fields = order.kind === 'move' ? ['squadId', 'direction'] :
    order.kind === 'attack' ? ['squadId', 'enemyId'] : ['squadId'];
  const target = order.target;
  if (!exact(target, fields) || typeof target.squadId !== 'string' || !identifier.test(target.squadId)) return false;
  if (order.kind === 'move') return directions.has(target.direction);
  if (order.kind === 'attack') return typeof target.enemyId === 'string' && identifier.test(target.enemyId);
  return order.kind === 'remove' || squadCommands.has(order.kind);
}

export function createWarRtsCoopServerV133(game, {tokens, missionId = 'W3-RTS01', leaseMs = 6000,
  now = () => performance.timeOrigin + performance.now(), stateDirectory} = {}) {
  if (!Array.isArray(tokens) || tokens.length < 2 || tokens.length > 4) {
    throw new Error('Un salon RTS coopératif exige deux à quatre jetons.');
  }
  if (!Number.isSafeInteger(leaseMs) || leaseMs < 250 || leaseMs > 30000) {
    throw new Error('Le bail de sélection doit être compris entre 250 et 30 000 ms.');
  }
  const players = clanWarTokenIdentitiesV127(tokens.map((token, index) => ({
    token, id: 'commander-' + (index + 1), leader: index === 0,
  })));
  const personal = new Map(players.map(player => [player.id, {sequence: 0, orders: new Set()}]));
  const ready = new Set();
  const selections = new Map();
  let state = game.createWarRtsSquadsV133(missionId, game.DEFAULT_WAR_RULES_V6);
  let revision = 0, lastEventAt = 0;

  function releaseExpired(at) {
    const before = revision;
    for (const [squadId, lease] of selections) {
      if (lease.until > at && state.phase === 'active' &&
          state.squads.some(squad => squad.id === squadId && squad.status === 'active' && squad.hp > 0)) continue;
      selections.delete(squadId);
      revision++;
    }
    return revision !== before;
  }

  function visibleEscort() {
    const escort = state.tracked;
    if (!escort) return null;
    const seen = escort.secured || state.squads.some(squad => squad.status === 'active' && squad.hp > 0 &&
      Math.abs(squad.x - escort.x) + Math.abs(squad.y - escort.y) <= 7 &&
      game.warMapLineOfSightV128(state.map, squad, escort));
    return seen ? {x: escort.x, y: escort.y, kind: escort.kind, hp: escort.hp, secured: escort.secured,
      extracted: escort.extracted, carrierSquadId: escort.carrierSquadId} : null;
  }

  function view(player, at) {
    const map = state.map;
    return {
      mode: 'co-op-rts-v133', revision, tick: state.turn, missionId: state.mission.id, phase: state.phase,
      you: player.id, nextSequence: personal.get(player.id).sequence + 1,
      commanders: players.map(({id, leader}) => ({id, leader, ready: ready.has(id)})),
      squads: state.squads.map(({id, unitId, unitName, x, y, hp, maxHp, status}) => ({
        id, unitId, unitName, x, y, hp, maxHp, status,
        controller: selections.get(id)?.playerId ?? null,
        leaseRemainingMs: Math.max(0, Math.ceil((selections.get(id)?.until ?? at) - at)),
      })),
      resources: {rav: state.ravRemaining, pc: state.pcCommitted, pcMaximum: state.pcMaximum},
      battlefield: {id: map.id, width: map.width, height: map.height, extraction: map.extraction,
        tiles: map.tiles.map(({x, y, kind, solid, cover}) => ({x, y, kind, solid, cover})),
        power: state.power, airlockStable: state.airlockStable},
      intel: {
        enemies: game.visibleWarRtsEnemiesV133(state).map(({id, unitId, hp, x, y}) => ({id, unitId, hp, x, y})),
        escort: visibleEscort(),
        observed: state.observed,
        objective: state.observed ? state.mission.tasks[state.completedTaskIds.length]?.location ?? null : null,
        completedTaskIds: state.completedTaskIds,
      },
      report: state.report,
    };
  }

  function applyOrder(player, order, at) {
    if (!validOrder(order)) return {status: 400, error: 'invalid-order'};
    const progress = personal.get(player.id);
    if (progress.orders.has(order.id)) return {status: 409, error: 'duplicate-order'};
    if (progress.orders.size >= 2048) return {status: 422, error: 'order-limit'};
    if (order.sequence !== progress.sequence + 1 || order.revision !== revision || order.tick !== state.turn) {
      return {status: 409, error: 'state-changed'};
    }

    const {kind, target} = order;
    if (kind === 'ready' && state.phase === 'planning' && !ready.has(player.id)) {
      ready.add(player.id);
    } else if ((kind === 'draft' || kind === 'remove') && state.phase === 'planning' && player.leader) {
      const updated = kind === 'draft' ? game.draftWarRtsSquadV133(state, target.unitId, game.DEFAULT_WAR_RULES_V6) :
        game.removeWarRtsSquadV133(state, target.squadId);
      if (!updated.accepted) return {status: 422, error: 'order-refused'};
      state = updated.state;
      ready.clear();
    } else if (kind === 'launch' && state.phase === 'planning' && ready.size === players.length && player.leader) {
      const launched = game.launchWarRtsSquadsV133(state);
      if (!launched.accepted) return {status: 422, error: 'order-refused'};
      state = launched.state;
    } else if (state.phase === 'active' && target && kind !== 'remove' && kind !== 'draft') {
      const {squadId} = target;
      if (!state.squads.some(squad => squad.id === squadId && squad.status === 'active' && squad.hp > 0)) {
        return {status: 422, error: 'order-refused'};
      }
      const lease = selections.get(squadId);
      if (kind === 'select') {
        if (lease && lease.playerId !== player.id) return {status: 409, error: 'squad-leased'};
        for (const [id, owned] of selections) {
          if (id !== squadId && owned.playerId === player.id) selections.delete(id);
        }
        selections.set(squadId, {playerId: player.id, until: at + leaseMs});
      } else {
        if (lease?.playerId !== player.id) return {status: 409, error: 'lease-required'};
        if (kind === 'release') selections.delete(squadId);
        else {
          if (kind === 'retreat' && !player.leader) return {status: 422, error: 'order-refused'};
          if (kind === 'attack' && !game.visibleWarRtsEnemiesV133(state).some(enemy => enemy.id === target.enemyId)) {
            return {status: 422, error: 'order-refused'};
          }
          const command = kind === 'move' ? {kind, squadId, direction: target.direction} :
            kind === 'attack' ? {kind, squadId, targetId: target.enemyId} : {kind, squadId};
          const result = game.commandWarRtsSquadsV133(state, command);
          if (!result.accepted) return {status: 422, error: 'order-refused'};
          state = result.state;
        }
      }
    } else return {status: 422, error: 'order-refused'};

    revision++;
    progress.sequence = order.sequence;
    progress.orders.add(order.id);
    return {status: 200};
  }

  const journal = openClanWarCoopJournal(stateDirectory,
    {schema: 'clan-rts-coop-v133-1', missionId, leaseMs, seats: players.length},
    event => {
      if (!Number.isFinite(event.at) || event.at < lastEventAt) return false;
      lastEventAt = event.at;
      if (event.kind === 'expire') return releaseExpired(event.at);
      if (event.kind !== 'order') return false;
      const player = players.find(candidate => candidate.id === event.actor);
      return !!player && applyOrder(player, event.order, event.at).status === 200;
    },
    () => ({state, revision, ready: [...ready], selections: [...selections], personal: coopOrderSequences(personal)}));

  // Relative lease delays are measured by the authority. The persisted clock
  // supports restart and prevents a backwards clock from reviving old leases.
  function refreshLeases() {
    journal?.assertCurrent();
    const current = now();
    if (!Number.isFinite(current)) throw new Error('Horloge du salon invalide.');
    const at = Math.max(lastEventAt, current);
    if (releaseExpired(at)) {
      journal?.commit({kind: 'expire', at});
      lastEventAt = at;
    }
    return at;
  }

  function submit(player, order) {
    if (!validOrder(order)) return {status: 400, error: 'invalid-order'};
    try {
      const at = refreshLeases();
      const result = applyOrder(player, order, at);
      if (result.status !== 200) return result;
      journal?.commit({kind: 'order', at, actor: player.id, order});
      lastEventAt = at;
      return {status: 200, state: view(player, at)};
    } catch (error) {
      if (!journal) throw error;
      journal.invalidate();
      return {status: 503, error: 'journal-unavailable'};
    }
  }

  return createClanWarHttpServiceV127({
    identities: players,
    view(player) {
      try {
        return view(player, refreshLeases());
      } catch (error) {
        journal?.invalidate();
        throw error;
      }
    },
    submit,
    tick() {
      try {
        refreshLeases();
      } catch (error) {
        if (!journal) throw error;
        journal.invalidate();
      }
    },
    tickMs: Math.min(500, leaseMs),
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.YAUTJA_CLAN_RTS_COOP_PORT ?? 8789);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new Error('Port de salon invalide.');
  let tokens;
  try {
    tokens = JSON.parse(process.env.YAUTJA_CLAN_RTS_COOP_TOKENS ?? '[]');
  } catch {
    throw new Error('YAUTJA_CLAN_RTS_COOP_TOKENS doit contenir un tableau JSON de jetons.');
  }
  const server = createWarRtsCoopServerV133(await loadWarRtsCoopRulesV133(), {
    tokens, missionId: process.env.YAUTJA_CLAN_RTS_COOP_MISSION,
    stateDirectory: process.env.YAUTJA_CLAN_RTS_COOP_STATE_DIRECTORY,
  });
  server.on('error', error => {
    process.stderr.write('Impossible d’ouvrir le salon (' + (error.code ?? 'erreur') + ').\n');
    process.exitCode = 1;
  });
  server.listen(port, '127.0.0.1', () => {
    process.stdout.write('RTS coopératif V133 sur http://127.0.0.1:' + port + '\n');
  });
}
