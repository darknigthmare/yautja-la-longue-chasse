import {createHash, randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {clanWarTokenIdentitiesV127, createClanWarHttpServiceV127} from './serve-clan-war-practice-v127.mjs';
import {W3_S14_CLIENT_HTML, W3_S14_CLIENT_SCRIPT} from './clan-war-w3-s14-client.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const siteId = 'W3-S14';
const commandId = /^[A-Za-z0-9_-]{1,64}$/;
const orderKinds = new Set(['sign', 'start', 'decline', 'renegotiate', 'strike', 'miss', 'claim', 'move']);
const finalized = phase => phase === 'won' || phase === 'lost';
const sha = value => createHash('sha256').update(value).digest('hex');

export async function loadWarW3S14DuelRules() {
  const {outputFiles} = await build({
    stdin: {
      contents: `
        export {DEFAULT_WAR_RULES_V6} from './app/game/systems/clanWarBibleV6';
        export * from './app/game/systems/clanLogisticsV108';
        export * from './app/game/systems/clanSupplyRouteV109';
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
  if (Object.keys(order).length !== fields.length || !fields.every(key => Object.hasOwn(order, key)) ||
      typeof order.id !== 'string' || !commandId.test(order.id) ||
      !Number.isSafeInteger(order.sequence) || order.sequence < 1 ||
      !Number.isSafeInteger(order.revision) || order.revision < 0 ||
      !Number.isSafeInteger(order.tick) || order.tick < 0 || !orderKinds.has(order.kind)) return false;
  if (order.kind !== 'move') return order.target === null;
  if (!Array.isArray(order.target) || order.target.length !== 2 || !order.target.every(Number.isSafeInteger)) return false;
  const distance = Math.hypot(...order.target);
  return distance > 0 && distance <= 24;
}

function transact(db, mode, execute) {
  db.exec(mode);
  try {
    const result = execute();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function createWarW3S14DuelServer(game, {tokens, databasePath, checkpoint} = {}) {
  if (!Array.isArray(tokens) || tokens.length !== 2) throw Error('Deux jetons distincts sont requis.');
  if (typeof databasePath !== 'string' || !databasePath || databasePath === ':memory:') {
    throw Error('Un journal SQLite durable W3-S14 est requis.');
  }
  const players = clanWarTokenIdentitiesV127([
    {token: tokens[0], role: 'challenger', actorId: 'operator:W3-S14'},
    {token: tokens[1], role: 'rival', actorId: 'rival'},
  ]);
  const authority = sha(players.map(player => player.secret.toString('hex')).join(':'));
  const rules = game.DEFAULT_WAR_RULES_V6;
  const readModel = raw => {
    const {state, error} = game.importSupplyV109(raw, rules);
    if (!state) throw Error('Carnet W3-S14 illisible : ' + error);
    return state;
  };
  const db = new DatabaseSync(databasePath);
  try {
    db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = FULL;
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS w3_s14_room (
        singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
        room_id TEXT NOT NULL,
        rule_source TEXT NOT NULL,
        authority TEXT NOT NULL,
        checkpoint_hash TEXT NOT NULL,
        revision INTEGER NOT NULL,
        model TEXT NOT NULL,
        receipt TEXT
      );
      CREATE TABLE IF NOT EXISTS w3_s14_commands (
        role TEXT NOT NULL CHECK (role IN ('challenger', 'rival')),
        order_id TEXT NOT NULL,
        sequence INTEGER NOT NULL,
        kind TEXT NOT NULL,
        PRIMARY KEY (role, order_id),
        UNIQUE (role, sequence)
      );
    `);
    const readRow = db.prepare('SELECT * FROM w3_s14_room WHERE singleton = 1');
    transact(db, 'BEGIN IMMEDIATE', () => {
      const prior = readRow.get();
      if (prior) {
        if (prior.rule_source !== rules.metadata.sha256 || prior.authority !== authority ||
            (checkpoint !== undefined && sha(checkpoint) !== prior.checkpoint_hash)) {
          throw Error('Le salon, ses participants ou son carnet ne correspondent pas au journal W3-S14.');
        }
        readModel(prior.model);
        return;
      }
      if (typeof checkpoint !== 'string') throw Error('Le premier départ exige un carnet V109 réel exporté du poste.');
      const state = readModel(checkpoint);
      const {convoy} = state;
      const actors = players.map(player => game.logisticsActorV108(convoy, player.actorId));
      if (!game.logisticsFunctionalV108(convoy, siteId) || actors.some(actor =>
        !actor || !game.logisticsReadyV108(convoy, actor) || actor.layer !== 'surface' || !actor.members[0]) ||
        convoy.duel.phase !== 'unsigned' || convoy.duel.signatures.length || convoy.duel.round || convoy.duel.winner ||
        convoy.history.some(action => action.kind === 'sign' || action.kind.startsWith('duel-'))) {
        throw Error('Un ouvrage tenu, deux membres recrutés et un duel vierge sont requis.');
      }
      db.prepare(`INSERT INTO w3_s14_room
        (singleton, room_id, rule_source, authority, checkpoint_hash, revision, model)
        VALUES (1, ?, ?, ?, ?, 0, ?)`).run(
        siteId + '-' + randomUUID(), rules.metadata.sha256, authority, sha(checkpoint), checkpoint,
      );
    });

    const readSequence = db.prepare('SELECT COALESCE(MAX(sequence),0) AS sequence FROM w3_s14_commands WHERE role = ?');
    const knownOrder = db.prepare('SELECT 1 FROM w3_s14_commands WHERE role = ? AND order_id = ?');
    const writeOrder = db.prepare('INSERT INTO w3_s14_commands (role, order_id, sequence, kind) VALUES (?, ?, ?, ?)');
    const writeRoom = db.prepare('UPDATE w3_s14_room SET revision = ?, model = ?, receipt = ? WHERE singleton = 1');
    let cachedBytes, cachedModel;

    function getModel(row) {
      if (row.model !== cachedBytes) {
        cachedModel = readModel(row.model);
        cachedBytes = row.model;
      }
      return cachedModel;
    }

    function project(player, row, model) {
      const {convoy} = model;
      const receipt = row.receipt === null ? null : JSON.parse(row.receipt);
      const participants = players.map(({role, actorId}) => {
        const {members, x, y} = game.logisticsActorV108(convoy, actorId);
        return {role, memberId: members[0], x, y};
      });
      return {
        siteId, roomId: row.room_id, you: player.role, revision: row.revision, tick: convoy.turn,
        nextSequence: readSequence.get(player.role).sequence + 1,
        serviceReady: game.logisticsFunctionalV108(convoy, siteId),
        duel: {...convoy.duel, phase: receipt?.outcome === 'declined' ? 'declined' : convoy.duel.phase},
        participants, receipt,
      };
    }

    function stateView(player) {
      return transact(db, 'BEGIN', () => {
        const row = readRow.get();
        return project(player, row, getModel(row));
      });
    }

    function submit(player, order) {
      if (!validOrder(order)) return {status: 400, error: 'invalid-order'};
      return transact(db, 'BEGIN IMMEDIATE', () => {
        const row = readRow.get(), model = getModel(row), {convoy} = model;
        const sequence = readSequence.get(player.role).sequence;
        if (knownOrder.get(player.role, order.id)) return {status: 409, error: 'duplicate-order'};
        if (sequence >= 1024) return {status: 422, error: 'order-limit'};
        if (order.sequence !== sequence + 1 || order.revision !== row.revision || order.tick !== convoy.turn) {
          return {status: 409, error: 'state-changed'};
        }
        const {kind} = order;
        const receipt = row.receipt === null ? null : JSON.parse(row.receipt);
        const who = game.logisticsActorV108(convoy, player.actorId).members[0];
        if (receipt && (kind !== 'claim' || !finalized(receipt.outcome))) {
          return {status: 422, error: 'duel-closed'};
        }
        if (kind === 'claim' && receipt?.winner !== who) return {status: 403, error: 'winner-required'};
        if ((kind === 'start' || kind === 'renegotiate' || kind === 'miss') && player.role !== 'challenger') {
          return {status: 403, error: 'challenger-required'};
        }

        let next = model, recorded = receipt;
        if (kind === 'decline') {
          if (!['unsigned', 'accepted'].includes(convoy.duel.phase)) return {status: 422, error: 'order-refused'};
          recorded = makeReceipt(row, convoy.duel, 'declined', who);
        } else {
          const action = kind === 'move' ? {kind, actor: player.actorId, dx: order.target[0], dy: order.target[1]} :
            kind === 'sign' ? {kind, actor: player.actorId} :
            kind === 'strike' ? {kind: player.role === 'challenger' ? 'duel-strike' : 'duel-reply'} :
            {kind: 'duel-' + kind};
          if (kind === 'start' && !convoy.works.find(work => work.id === siteId)?.staffed) {
            const staff = {kind: 'staff', work: siteId};
            const restored = game.applySupplyV109(model, game.supplyCommandV109(model, staff), rules);
            if (!restored.accepted) return {status: 422, error: 'order-refused'};
            next = restored.state;
          }
          const update = game.applySupplyV109(next, game.supplyCommandV109(next, action), rules);
          if (!update.accepted) return {status: 422, error: 'order-refused'};
          next = update.state;
          if (!recorded && finalized(next.convoy.duel.phase)) {
            recorded = makeReceipt(row, next.convoy.duel, next.convoy.duel.phase);
          }
        }
        const bytes = game.exportSupplyV109(next);
        if (!bytes || Buffer.byteLength(bytes) > game.CLAN_SUPPLY_MAX_BYTES_V109) {
          return {status: 422, error: 'archive-limit'};
        }
        const revision = row.revision + 1;
        const savedReceipt = recorded === null ? null : JSON.stringify(recorded);
        writeOrder.run(player.role, order.id, order.sequence, kind);
        writeRoom.run(revision, bytes, savedReceipt);
        return {status: 200, state: project(player, {...row, revision, receipt: savedReceipt}, next)};
      });
    }

    function makeReceipt(row, duel, outcome, declinedBy = null) {
      return {
        siteId, roomId: row.room_id, sourceSha: row.rule_source, checkpointSha: row.checkpoint_hash,
        revision: row.revision + 1, outcome, winner: duel.winner, declinedBy,
        player: duel.player, rival: duel.rival, round: duel.round, signatures: duel.signatures,
        campaignReward: false,
      };
    }

    const server = createClanWarHttpServiceV127({
      identities: players, view: stateView, submit,
      client: {html: W3_S14_CLIENT_HTML, script: W3_S14_CLIENT_SCRIPT},
    });
    server.on('close', () => db.close());
    return server;
  } catch (error) {
    db.close();
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.YAUTJA_W3_S14_PORT ?? 8791);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw Error('Port de salon invalide.');
  let tokens;
  try {
    tokens = JSON.parse(process.env.YAUTJA_W3_S14_TOKENS ?? '[]');
  } catch {
    throw Error('YAUTJA_W3_S14_TOKENS doit contenir un tableau JSON de deux jetons.');
  }
  const checkpoint = process.env.YAUTJA_W3_S14_CHECKPOINT;
  const server = createWarW3S14DuelServer(await loadWarW3S14DuelRules(), {
    tokens, databasePath: process.env.YAUTJA_W3_S14_DATABASE,
    checkpoint: checkpoint ? await readFile(checkpoint, 'utf8') : undefined,
  });
  server.on('error', error => {
    process.stderr.write('Impossible d’ouvrir le poste (' + (error.code ?? 'erreur') + ').\n');
    process.exitCode = 1;
  });
  server.listen(port, '127.0.0.1', () => {
    process.stdout.write('Duel W3-S14 sur http://127.0.0.1:' + port + '\n');
  });
}
