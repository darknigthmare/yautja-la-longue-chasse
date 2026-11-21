import {randomUUID} from 'node:crypto';

const token = process.env.YAUTJA_CLAN_PRACTICE_TOKEN;
const args = process.argv.slice(2);
const [verb = 'state', ...coordinates] = args;

async function main() {
  if (!token) throw new Error('Configurez YAUTJA_CLAN_PRACTICE_TOKEN avec le jeton de votre camp.');
  const origin = new URL(process.env.YAUTJA_CLAN_PRACTICE_URL ?? 'http://127.0.0.1:8787');
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname);
  if (origin.username || origin.password || (origin.protocol !== 'https:' &&
      !(origin.protocol === 'http:' && loopback))) {
    throw new Error('Utilisez HTTPS pour un salon distant.');
  }
  const hasTarget = verb === 'move' || verb === 'attack';
  const target = hasTarget ? coordinates.map(Number) : null;
  if (!['state', 'move', 'attack', 'hold', 'retreat'].includes(verb) ||
      (hasTarget && (target.length !== 2 || coordinates.some(value => !/^\d+$/.test(value)) ||
        !target.every(Number.isSafeInteger))) || (!hasTarget && coordinates.length)) {
    throw new Error('Commandes disponibles : state, move x y, attack x y, hold, retreat.');
  }

  async function send(path, order) {
    const headers = {Authorization: 'Bearer ' + token};
    if (order) headers['Content-Type'] = 'application/json';
    const response = await fetch(new URL(path, origin), {
      method: order ? 'POST' : 'GET', headers,
      ...(order ? {body: JSON.stringify(order)} : {}),
      redirect: 'error', signal: AbortSignal.timeout(5000),
    });
    const payload = await response.json();
    if (payload.error === 'state-changed') {
      throw new Error('La manche a avancé. Relisez le plateau et confirmez votre nouvel ordre.');
    }
    if (!response.ok) throw new Error('Le salon a refusé la requête (' + response.status + ', ' + payload.error + ').');
    return payload;
  }

  const state = await send('/state');
  if (verb === 'state') return state;
  const reply = await send('/order', {
    id: randomUUID(), sequence: state.nextSequence, revision: state.revision,
    tick: state.tick, kind: verb, target,
  });
  return reply.state;
}

try {
  process.stdout.write(JSON.stringify(await main(), null, 2) + '\n');
} catch (error) {
  process.stderr.write(error.message + '\n');
  process.exitCode = 1;
}
