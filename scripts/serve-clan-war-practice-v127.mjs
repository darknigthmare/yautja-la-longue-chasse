import {createHash, randomInt, timingSafeEqual} from 'node:crypto';
import {createServer} from 'node:http';
import {resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {build} from 'esbuild';

const tokenPattern = /^[A-Za-z0-9_-]{43,128}$/;
const orderIdPattern = /^[A-Za-z0-9_-]{1,48}$/;
const sides = ['hunter', 'rival'];
const roomId = 'practice-v127';
const maxOrderBytes = 1024;

export async function loadClanWarPracticeRules() {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const result = await build({
    stdin: {
      contents: [
        "export * from './app/game/systems/clanWarMultiplayerV126';",
        "export * from './app/game/systems/clanWarMultiplayerPracticeV127';",
        "export * from './app/game/systems/clanWarWorldClimateV126';",
      ].join('\n'),
      resolveDir: root,
    },
    absWorkingDir: root,
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
    target: 'node22',
  });
  const encoded = Buffer.from(result.outputFiles[0].contents).toString('base64');
  return import('data:text/javascript;base64,' + encoded);
}

function digest(token) {
  return createHash('sha256').update(token).digest();
}

function responseJson(response, status, payload) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...(status === 401 ? {'WWW-Authenticate': 'Bearer realm="Clan War Practice"'} : {}),
    ...(status === 413 ? {Connection: 'close'} : {}),
  });
  response.end(JSON.stringify(payload));
}

async function readOrder(request) {
  const type = request.headers['content-type']?.split(';', 1)[0].trim().toLowerCase();
  if (type !== 'application/json') return {status: 415, error: 'json-required'};
  if (Number(request.headers['content-length']) > maxOrderBytes) {
    return {status: 413, error: 'order-too-large'};
  }
  const chunks = [];
  let length = 0;
  for await (const chunk of request.iterator({destroyOnReturn: false})) {
    length += chunk.length;
    if (length > maxOrderBytes) return {status: 413, error: 'order-too-large'};
    chunks.push(chunk);
  }
  try {
    return {order: JSON.parse(Buffer.concat(chunks).toString('utf8'))};
  } catch {
    return {status: 400, error: 'malformed-json'};
  }
}

function validOrder(order) {
  if (!order || typeof order !== 'object' || Array.isArray(order)) return false;
  const {id, sequence, revision, tick, kind, target} = order;
  if (Object.keys(order).length !== 6 || typeof id !== 'string' || !orderIdPattern.test(id) ||
      !Number.isSafeInteger(sequence) || sequence < 1 ||
      !Number.isSafeInteger(revision) || revision < 0 ||
      !Number.isSafeInteger(tick) || tick < 0) return false;
  if (kind === 'hold' || kind === 'retreat') return target === null;
  return (kind === 'move' || kind === 'attack') && Array.isArray(target) &&
    target.length === 2 && target.every(Number.isInteger);
}

export function createClanWarPracticeServer(game, {
  hunterToken, rivalToken, scenarioId, seed = randomInt(2 ** 32), tickMs = 5000,
} = {}) {
  if (typeof hunterToken !== 'string' || typeof rivalToken !== 'string' ||
      !tokenPattern.test(hunterToken) || !tokenPattern.test(rivalToken) || hunterToken === rivalToken) {
    throw new Error('Configurez deux jetons de salon distincts et aléatoires.');
  }
  if (!Number.isSafeInteger(tickMs) || tickMs < 250 || tickMs > 60000) {
    throw new Error('La durée d’un tick doit être comprise entre 250 et 60000 ms.');
  }

  const identities = [
    {id: 'exercise-hunter', unit: 'exercise-hunter-unit', side: sides[0], secret: digest(hunterToken)},
    {id: 'exercise-rival', unit: 'exercise-rival-unit', side: sides[1], secret: digest(rivalToken)},
  ];
  const [hunter, rival] = identities;
  const source = scenarioId ?? game.CLAN_WAR_COHERENT_VARIANTS_V126
    .find(item => item.geography.worldKind === 'earth')?.sourceId;
  let room = game.createWarMultiplayerLobbyV126(
    roomId, source, 'clan-pvp', hunter.id, 'Chasseur', hunter.secret.toString('hex'), seed,
  );
  const applyLobbyChange = change => {
    if (!change.accepted) throw new Error(change.reason);
    room = change.room;
  };
  applyLobbyChange(game.joinWarMultiplayerLobbyV126(room, rival.id, 'Rival', 'rival'));
  for (const identity of identities) {
    applyLobbyChange(game.setWarMultiplayerLoadoutV126(room, identity.id, [identity.unit]));
    applyLobbyChange(game.setWarMultiplayerReadyV126(room, identity.id, true));
  }
  applyLobbyChange(game.startWarMultiplayerLobbyV126(room, hunter.id));
  let match = game.createWarMultiplayerPracticeV127(room);

  function identityFor(authorization) {
    const [, presented] = /^Bearer ([A-Za-z0-9_-]{43,128})$/i.exec(authorization ?? '') ?? [];
    if (!presented) return undefined;
    const fingerprint = digest(presented);
    const matches = identities.map(identity => timingSafeEqual(identity.secret, fingerprint));
    return identities[matches.indexOf(true)];
  }

  function actorMember(identity) {
    return match.room.members.find(member => member.id === identity.id);
  }

  function view(identity) {
    const board = game.viewWarMultiplayerPracticeV127(match, identity.id);
    return {
      roomId, scenarioId: match.room.scenarioId, revision: match.room.revision, tick: board.tick,
      stage: board.stage, side: identity.side, winner: board.winner,
      nextSequence: actorMember(identity).lastSequence + 1,
      map: {
        width: match.map.width, height: match.map.height, capture: board.capture,
        blocked: board.blocked, cover: board.cover,
      },
      fighters: board.fighters.map(({side, x, y, hp}) => ({side, x, y, hp})),
    };
  }

  function submit(identity, order) {
    if (!validOrder(order)) return {status: 400, error: 'invalid-order'};
    const clientCommandId = identity.id + ':' + order.id;
    if (match.room.receipts.includes(clientCommandId)) return {status: 409, error: 'duplicate-order'};
    if (order.revision !== match.room.revision || order.tick !== match.room.tick ||
        order.sequence !== actorMember(identity).lastSequence + 1) {
      return {status: 409, error: 'state-changed'};
    }
    const change = game.applyWarMultiplayerPracticeCommandV127(match, {
      clientCommandId, actorId: identity.id, unitInstanceId: identity.unit,
      sequence: order.sequence, expectedRevision: order.revision, tick: order.tick,
      kind: order.kind, targetX: order.target?.[0] ?? null, targetY: order.target?.[1] ?? null,
    }, identity.id);
    if (!change.accepted) return {status: 422, error: 'order-refused'};
    match = change.state;
    return {status: 200, state: view(identity)};
  }

  const server = createServer({
    requestTimeout: 5000, headersTimeout: 5000, keepAliveTimeout: 2000, maxHeaderSize: 8192,
  }, async (request, response) => {
    try {
      if (!((request.url === '/state' && request.method === 'GET') ||
            (request.url === '/order' && request.method === 'POST'))) {
        responseJson(response, 404, {error: 'unknown-route'});
        return;
      }
      const identity = identityFor(request.headers.authorization);
      if (!identity) {
        responseJson(response, 401, {error: 'unauthorized'});
        return;
      }
      if (request.method === 'GET') {
        responseJson(response, 200, view(identity));
        return;
      }
      const parsed = await readOrder(request);
      const {status, ...payload} = parsed.error ? parsed : submit(identity, parsed.order);
      responseJson(response, status, payload);
    } catch {
      if (!response.destroyed) responseJson(response, 500, {error: 'practice-unavailable'});
    }
  });

  let timer;
  server.on('listening', () => {
    timer = setInterval(() => {
      const next = game.stepWarMultiplayerPracticeV127(match);
      if (next.accepted) match = next.state;
    }, tickMs);
    timer.unref();
  });
  server.on('close', () => clearInterval(timer));
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.YAUTJA_CLAN_PRACTICE_PORT ?? 8787);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new Error('Port de salon invalide.');
  }
  const server = createClanWarPracticeServer(await loadClanWarPracticeRules(), {
    hunterToken: process.env.YAUTJA_CLAN_PRACTICE_HUNTER_TOKEN,
    rivalToken: process.env.YAUTJA_CLAN_PRACTICE_RIVAL_TOKEN,
    scenarioId: process.env.YAUTJA_CLAN_PRACTICE_SCENARIO,
  });
  server.on('error', error => {
    process.stderr.write('Impossible d’ouvrir le salon (' + (error.code ?? 'erreur') + ').\n');
    process.exitCode = 1;
  });
  server.listen(port, '127.0.0.1', () => {
    process.stdout.write('Salon d’exercice V127 sur http://127.0.0.1:' + port + '\n');
  });
}
