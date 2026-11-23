import {createHmac, randomBytes, randomUUID} from 'node:crypto';
import {resolve} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {clanWarTokenIdentitiesV127, createClanWarHttpServiceV127} from './serve-clan-war-practice-v127.mjs';

const kinds = {
  start: ['targetId', 'teamIds', 'focus'],
  incident: ['operationId', 'decision'],
  recall: ['operationId'],
};
const validId = value => typeof value === 'string' && /^[A-Za-z0-9_:-]{1,64}$/.test(value);

export async function loadWarOuterOpsRulesV115() {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const contents = [
    "export {DEFAULT_WAR_RULES_V6} from './app/game/systems/clanWarBibleV6';",
    "export {createWarOperationsV115,readWarOperationsV115,warMissionEligibleV115,beginWarOperationV115,recallWarOuterMissionV116,settleWarOuterOpsV115} from './app/game/systems/clanWarOperationsV115';",
    "export {warOuterIncidentV143,commandWarOuterIncidentV143} from './app/game/systems/clanWarOuterIncidentV143';",
  ].join('\n');
  const result = await build({
    stdin: {contents, resolveDir: root}, absWorkingDir: root,
    bundle: true, write: false, format: 'esm', platform: 'node', target: 'node22',
  });
  return import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].contents).toString('base64'));
}

function monotonicClock() {
  const epoch = Date.now();
  const counter = performance.now();
  return () => epoch + Math.floor(performance.now() - counter);
}

export function validOrder(order) {
  if (!order || typeof order !== 'object' || Array.isArray(order) || !validId(order.id) ||
      !Number.isSafeInteger(order.revision) || order.revision < 0 ||
      !Number.isSafeInteger(order.sequence) || order.sequence < 1 ||
      typeof order.kind !== 'string' || !Object.hasOwn(kinds, order.kind)) return false;
  const fields = ['id', 'sequence', 'revision', 'kind', ...kinds[order.kind]];
  if (Object.keys(order).length !== fields.length || !fields.every(key => Object.hasOwn(order, key))) return false;
  if (order.kind === 'start') {
    return validId(order.targetId) && Array.isArray(order.teamIds) &&
      order.teamIds.length >= 1 && order.teamIds.length <= 4 && order.teamIds.every(validId) &&
      ['recon', 'intercept', 'escort'].includes(order.focus);
  }
  return validId(order.operationId) && (order.kind === 'recall' || ['secure', 'detour'].includes(order.decision));
}

/** Outer Ops rules shared by the SQLite exercise and account-backed authorities.
 * `stored` is {revision, sequence, previousTime, commandIds, receipts, world}. */
export function createWarOuterOpsLogicV115(game, secret) {
  const rules = game.DEFAULT_WAR_RULES_V6;
  const initial = () => ({revision: 0, sequence: 0, previousTime: 0, commandIds: [], receipts: [],
    world: game.createWarOperationsV115(rules)});
  const compatible = world => Boolean(game.readWarOperationsV115(JSON.stringify(world), rules));

  /** Settle every due mandate at `now`; returns the receipts it appended. */
  function finishDue(stored, now, clanId) {
    const world = stored.world;
    const due = world.outer.filter(operation => operation.dueAt <= now);
    if (!due.length) return [];
    const result = game.settleWarOuterOpsV115(world, now, rules);
    if (!result.accepted) throw new Error(result.message);
    const receipts = due.map(operation => {
      const report = result.state.reports.find(item => item.id === operation.id);
      if (!report) throw new Error('Rapport natif absent après règlement.');
      const body = {clanId, sourceSha: world.sourceSha, operationId: operation.id,
        startedAt: operation.startedAt, dueAt: operation.dueAt, settledAt: now, report};
      return {...body, signature: createHmac('sha256', secret).update(JSON.stringify(body)).digest('hex')};
    });
    stored.world = result.state;
    stored.receipts.push(...receipts);
    stored.revision++;
    return receipts;
  }

  function snapshot(clanId, stored, now) {
    const world = stored.world;
    const free = world.teams.find(team => !world.assignments[team.id] && team.members.some(member => member.status === 'fit'));
    const suggested = free ? rules.territories.find(site =>
      game.warMissionEligibleV115(world, rules, site.id, [free.id]) === null) : null;
    return {
      clanId, revision: stored.revision, nextSequence: stored.sequence + 1,
      serverTime: now, rav: world.rav, clock: world.clock,
      suggestedDispatch: suggested ? {targetId: suggested.id, teamIds: [free.id], focus: 'recon'} : null,
      teams: world.teams.map(team => ({id: team.id, unitId: team.unitId, assigned: world.assignments[team.id] ?? null})),
      operations: world.outer.map(order => ({
        ...order, remainingMs: Math.max(0, order.dueAt - now),
        incident: game.warOuterIncidentV143(order, now, rules),
      })),
      receipts: stored.receipts.slice(-120),
    };
  }

  /** Validate and apply one client order; mutates `stored` only when accepted. */
  function apply(clanId, stored, order, now) {
    if (!validOrder(order)) return {status: 400, error: 'invalid-order'};
    if (stored.commandIds.includes(order.id)) return {status: 409, error: 'duplicate-order'};
    if (order.revision !== stored.revision || order.sequence !== stored.sequence + 1) {
      return {status: 409, error: 'state-changed'};
    }
    if (stored.commandIds.length >= 5000) return {status: 422, error: 'session-limit'};
    const world = stored.world;
    const update = order.kind === 'start'
      ? game.beginWarOperationV115(world, 'outer', order.targetId, order.teamIds, rules, now, order.focus)
      : order.kind === 'incident'
        ? game.commandWarOuterIncidentV143(world, order.operationId, order.decision, now, rules)
        : game.recallWarOuterMissionV116(world, order.operationId, now, rules);
    if (!update.accepted) return {status: 422, error: 'order-refused', reason: update.message};
    stored.world = update.state;
    stored.sequence = order.sequence;
    stored.commandIds.push(order.id);
    stored.revision++;
    return {status: 200, state: snapshot(clanId, stored, now), message: update.message};
  }

  return {rules, initial, compatible, finishDue, snapshot, apply};
}

export function createWarOuterOpsServerV115(game, {
  clans, databasePath = ':memory:', tickMs = 500, clock = monotonicClock(),
} = {}) {
  if (!Array.isArray(clans) || clans.length < 1 || clans.length > 4 ||
      clans.some(clan => !clan || !validId(clan.id)) || new Set(clans.map(clan => clan.id)).size !== clans.length) {
    throw new Error('Configurez un à quatre clans d’exercice distincts.');
  }
  if (!Number.isSafeInteger(tickMs) || tickMs < 250 || tickMs > 60000 || typeof clock !== 'function') {
    throw new Error('Configuration de cadence Outer Ops invalide.');
  }
  const identities = clanWarTokenIdentitiesV127(clans);
  const database = new DatabaseSync(databasePath);
  let logic, get, write;
  try {
    database.exec(`
      PRAGMA busy_timeout=1000;
      CREATE TABLE IF NOT EXISTS outer_ops_authority (id INTEGER PRIMARY KEY CHECK(id=1), secret TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS outer_ops_clans (id TEXT PRIMARY KEY, state TEXT NOT NULL);
    `);
    database.prepare('INSERT OR IGNORE INTO outer_ops_authority (id, secret) VALUES (1, ?)').run(randomBytes(32).toString('hex'));
    logic = createWarOuterOpsLogicV115(game,
      Buffer.from(database.prepare('SELECT secret FROM outer_ops_authority WHERE id=1').get().secret, 'hex'));
    get = database.prepare('SELECT state FROM outer_ops_clans WHERE id=?');
    write = database.prepare('UPDATE outer_ops_clans SET state=? WHERE id=?');
    const initialize = database.prepare('INSERT OR IGNORE INTO outer_ops_clans (id, state) VALUES (?, ?)');
    for (const {id} of identities) {
      initialize.run(id, JSON.stringify(logic.initial()));
      if (!logic.compatible(JSON.parse(get.get(id).state).world)) {
        throw new Error('Source V6 incompatible avec le dossier sauvegardé du serveur.');
      }
    }
  } catch (error) {
    database.close();
    throw error;
  }

  function withClan(identity, operation) {
    database.exec('BEGIN IMMEDIATE');
    try {
      const current = JSON.parse(get.get(identity.id).state);
      const time = clock();
      if (!Number.isSafeInteger(time) || time < 0) throw new Error('Horloge serveur invalide.');
      const now = Math.max(time, current.previousTime);
      const before = current.revision;
      logic.finishDue(current, now, identity.id);
      const result = operation(current, now);
      if (current.revision !== before) {
        current.previousTime = now;
        write.run(JSON.stringify(current), identity.id);
      }
      database.exec('COMMIT');
      return result;
    } catch (error) {
      database.exec('ROLLBACK');
      throw error;
    }
  }

  const server = createClanWarHttpServiceV127({
    identities,
    view: identity => withClan(identity, (stored, now) => logic.snapshot(identity.id, stored, now)),
    submit: (identity, order) => validOrder(order)
      ? withClan(identity, (stored, now) => logic.apply(identity.id, stored, order, now))
      : {status: 400, error: 'invalid-order'},
    tickMs,
    tick: () => {
      for (const identity of identities) withClan(identity, () => {});
    },
  });
  server.on('close', () => database.close());
  return server;
}

async function runClient(verb, operands) {
  const base = new URL(process.env.YAUTJA_CLAN_OUTER_URL ?? 'http://127.0.0.1:8789');
  const token = process.env.YAUTJA_CLAN_OUTER_TOKEN;
  if (!token) throw new Error('Configurez YAUTJA_CLAN_OUTER_TOKEN.');
  if (base.username || base.password || (base.protocol !== 'https:' &&
      !(base.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname)))) {
    throw new Error('Utilisez HTTPS pour un mandat distant.');
  }
  if (!['state', ...Object.keys(kinds)].includes(verb)) {
    throw new Error('Commandes : state, start [territoire équipe focus], incident mandat secure|detour, recall mandat.');
  }
  async function request(path, body) {
    const result = await fetch(new URL(path, base), {
      method: body ? 'POST' : 'GET',
      headers: {Authorization: 'Bearer ' + token, 'Content-Type': 'application/json'},
      ...(body ? {body: JSON.stringify(body)} : {}),
      signal: AbortSignal.timeout(5000), redirect: 'error',
    });
    const decoded = await result.json();
    if (!result.ok) throw new Error(decoded.reason ?? decoded.error);
    return decoded;
  }
  const state = await request('/state');
  if (verb === 'state') return state;
  const [first, second, third] = operands;
  let values;
  if (verb === 'start') {
    values = !operands.length ? state.suggestedDispatch
      : {targetId: first, teamIds: second?.split(','), focus: third ?? 'recon'};
  } else if (verb === 'incident') values = {operationId: first, decision: second};
  else values = {operationId: first};
  if (!values) throw new Error('Aucune formation et destination V6 disponibles.');
  const order = {id: randomUUID(), revision: state.revision, sequence: state.nextSequence, kind: verb, ...values};
  if (!validOrder(order)) throw new Error('Arguments de mandat invalides.');
  return request('/order', order);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const [verb = 'state', ...operands] = process.argv.slice(2);
    if (verb === 'serve') {
      const port = Number(process.env.YAUTJA_CLAN_OUTER_PORT ?? 8789);
      const databasePath = process.env.YAUTJA_CLAN_OUTER_DB;
      if (!databasePath || !Number.isSafeInteger(port) || port < 1 || port > 65535) {
        throw new Error('Renseignez YAUTJA_CLAN_OUTER_DB et un port valide.');
      }
      const clans = JSON.parse(process.env.YAUTJA_CLAN_OUTER_CLANS ?? '[]');
      const server = createWarOuterOpsServerV115(await loadWarOuterOpsRulesV115(), {clans, databasePath});
      server.on('error', error => {
        process.stderr.write('Impossible d’ouvrir le service Outer Ops (' + (error.code ?? 'erreur') + ').\n');
        process.exitCode = 1;
      });
      server.listen(port, '127.0.0.1', () =>
        process.stdout.write('Outer Ops V115 sur http://127.0.0.1:' + port + '\n'));
    } else {
      process.stdout.write(JSON.stringify(await runClient(verb, operands), null, 2) + '\n');
    }
  } catch (error) {
    process.stderr.write(error.message + '\n');
    process.exitCode = 1;
  }
}
