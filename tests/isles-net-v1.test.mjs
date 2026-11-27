import assert from 'node:assert/strict';
import test from 'node:test';
import {once} from 'node:events';
import {request} from 'node:http';
import {createIslesRoomServerV1, decodeFramesV1, loadIslesRoomV1} from '../scripts/serve-isles-room-v1.mjs';

const {module: room, tuning, map} = await loadIslesRoomV1();
const net = tuning.net;

/** Room driven directly, with a controlled clock. */
function directRoom(options = {}) {
  return room.createIslesRoomV1({map, net, runSpeed: tuning.movement.runSpeed, preyWanders: false, ...options});
}

test('messages are validated: malformed, oversized or wrong-protocol input is ignored', () => {
  assert.equal(room.parseIslesClientMessageV1('{'), null);
  assert.equal(room.parseIslesClientMessageV1(JSON.stringify({t: 'hello', name: 'A', protocol: 2})), null);
  assert.equal(room.parseIslesClientMessageV1(JSON.stringify({t: 'input', seq: 1, x: 'a', y: 0, z: 0, facing: 0, cloaked: false})), null);
  assert.equal(room.parseIslesClientMessageV1('x'.repeat(3000)), null);
  assert.deepEqual(room.parseIslesClientMessageV1(JSON.stringify({t: 'hello', name: ' <b>Kha</b>\'ra ', protocol: 1})), {t: 'hello', name: 'bKhabra', protocol: 1});
});

test('the session seats 8 hunters at most, each on its own spawn', () => {
  const r = directRoom();
  const ids = [];
  for (let i = 0; i < 8; i++) { const joined = r.join('J' + i, 0); assert.ok(joined.id); ids.push(joined.id); }
  assert.equal(r.join('extra', 0).reply.t, 'full');
  const spots = new Set(ids.map(id => { const p = r.player(id); return p.x + ',' + p.z; }));
  assert.equal(spots.size, 8);
  r.leave(ids[3]);
  assert.ok(r.join('again', 1).id, 'une place libérée se reprend');
});

test('a move faster than a run is corrected; a reachable one is accepted', () => {
  const r = directRoom();
  const {id} = r.join('A', 0);
  const start = r.player(id);
  assert.equal(r.input(id, {t: 'input', seq: 1, x: start.x + 0.5, y: 0, z: start.z, facing: 0, cloaked: true}, 1 / 15), null);
  const teleport = r.input(id, {t: 'input', seq: 2, x: start.x + 40, y: 0, z: start.z, facing: 0, cloaked: false}, 2 / 15);
  assert.equal(teleport.t, 'correction');
  assert.equal(teleport.x, start.x + 0.5);
  assert.equal(r.input(id, {t: 'input', seq: 2, x: start.x + 0.6, y: 0, z: start.z, facing: 0, cloaked: false}, 3 / 15), null, 'numéro déjà vu ignoré');
  assert.equal(r.player(id).x, start.x + 0.5);
  assert.equal(r.input(id, {t: 'input', seq: 3, x: start.x + 0.5, y: 30, z: start.z, facing: 0, cloaked: false}, 4 / 15).t, 'correction', 'pas de saut de 30 m');
  assert.equal(r.input(id, {t: 'input', seq: 4, x: -5, y: 0, z: start.z, facing: 0, cloaked: false}, 30).t, 'correction', 'pas hors de la carte');
});

test('network: a kill contested by two players is attributed once', () => {
  const preyStart = {x: 48, z: 55};
  const r = directRoom({preyStart});
  const a = r.join('A', 0).id, b = r.join('B', 0).id;
  // Walk both next to the prey with legal steps.
  for (const id of [a, b]) {
    let seq = 1, t = 0;
    for (;;) {
      const p = r.player(id), d = Math.hypot(preyStart.x - p.x, preyStart.z - p.z);
      if (d < 1.5) break;
      const k = Math.min(1, 0.5 / d);
      t += 1 / 15;
      assert.equal(r.input(id, {t: 'input', seq: seq++, x: p.x + (preyStart.x - p.x) * k, y: 0, z: p.z + (preyStart.z - p.z) * k, facing: 0, cloaked: false}, t), null);
    }
  }
  let now = 10;
  for (let i = 0; i < net.preyHealth - 1; i++) { assert.equal(r.strike(a, {t: 'strike', seq: i, target: 'prey-1'}, now).reply.ok, true); now += 1; }
  // Final blow from both players in the same instant.
  const first = r.strike(b, {t: 'strike', seq: 100, target: 'prey-1'}, now);
  const second = r.strike(a, {t: 'strike', seq: 101, target: 'prey-1'}, now);
  assert.equal(first.broadcast?.t, 'kill');
  assert.equal(first.broadcast.by, b);
  assert.equal(second.reply.ok, false);
  assert.equal(second.reply.reason, 'déjà attribuée');
  assert.equal(second.broadcast, undefined);
  assert.equal(r.player(a).kills + r.player(b).kills, 1);
  assert.equal(r.prey().killedBy, b);
  // The prey comes back after its respawn delay.
  r.tick(now + net.preyRespawnSeconds + 0.1, 0.1);
  assert.ok(r.prey().alive);
});

test('a strike out of range or too soon is refused', () => {
  const r = directRoom();
  const a = r.join('A', 0).id;
  assert.equal(r.strike(a, {t: 'strike', seq: 1, target: 'prey-1'}, 1).reply.reason, 'hors de portée');
  assert.equal(r.strike(a, {t: 'strike', seq: 2, target: 'autre'}, 1).reply.reason, 'cible inconnue');
});

test('remote players are interpolated between snapshots', () => {
  const p = (x, facing) => ({id: 'p1', name: 'A', x, y: 0, z: 0, facing, cloaked: false, kills: 0});
  const buffer = [{time: 1, players: [p(0, 3)]}, {time: 2, players: [p(10, -3)]}];
  const mid = room.interpolatePlayerV1(buffer, 'p1', 1.5);
  assert.equal(mid.x, 5);
  assert.ok(Math.abs(Math.abs(mid.facing) - Math.PI) < 0.3, 'le demi-tour passe par le plus court');
  assert.equal(room.interpolatePlayerV1(buffer, 'p1', 3).x, 10);
  assert.equal(room.interpolatePlayerV1(buffer, 'nobody', 1.5), null);
});

test('frames: unmasked or fragmented client frames are refused', () => {
  assert.equal(decodeFramesV1(Buffer.from([0x81, 0x02, 0x68, 0x69])).error, 'unmasked');
  assert.equal(decodeFramesV1(Buffer.from([0x01, 0x82, 0, 0, 0, 0, 0x68, 0x69])).error, 'fragmented');
  const masked = Buffer.from([0x81, 0x82, 1, 2, 3, 4, 0x68 ^ 1, 0x69 ^ 2]);
  assert.equal(decodeFramesV1(masked).frames[0].payload.toString(), 'hi');
  assert.equal(decodeFramesV1(masked.subarray(0, 5)).frames.length, 0, 'trame incomplète conservée');
});

/** A WebSocket client that records what the service sends. */
async function connect(port, name) {
  const socket = new WebSocket('ws://127.0.0.1:' + port + '/isles');
  const messages = [];
  socket.addEventListener('message', event => messages.push(JSON.parse(event.data)));
  await once(socket, 'open');
  socket.send(JSON.stringify({t: 'hello', name, protocol: 1}));
  const until = async (predicate, ms = 4000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      const found = messages.find(predicate);
      if (found) return found;
      await new Promise(done => setTimeout(done, 20));
    }
    throw new Error(name + ' attend en vain : ' + JSON.stringify(messages.slice(-3)));
  };
  const welcome = await until(m => m.t === 'welcome' || m.t === 'full');
  return {socket, messages, until, welcome, id: welcome.id};
}

test('service: 2 then 6 hunters share the island and see each other move at 15 snapshots per second', async () => {
  const service = await createIslesRoomServerV1({preyWanders: false});
  service.server.listen(0, '127.0.0.1');
  await once(service.server, 'listening');
  const {port} = service.server.address();
  try {
    const first = await connect(port, 'Alpha'), second = await connect(port, 'Beta');
    const spawn = first.welcome.spawn;
    first.socket.send(JSON.stringify({t: 'input', seq: 1, x: spawn.x + 0.4, y: 0, z: spawn.z, facing: 1, cloaked: true}));
    const seen = await second.until(m => m.t === 'snapshot' && m.players.some(p => p.id === first.id && Math.abs(p.x - (spawn.x + 0.4)) < 1e-9 && p.cloaked));
    assert.equal(seen.players.length, 2);
    const count = second.messages.filter(m => m.t === 'snapshot').length;
    await new Promise(done => setTimeout(done, 1000));
    const perSecond = second.messages.filter(m => m.t === 'snapshot').length - count;
    assert.ok(perSecond >= 12 && perSecond <= 17, perSecond + ' instantanés par seconde');

    const others = [];
    for (const name of ['Gamma', 'Delta', 'Epsilon', 'Zeta']) others.push(await connect(port, name));
    const six = await first.until(m => m.t === 'snapshot' && m.players.length === 6);
    assert.equal(new Set(six.players.map(p => p.id)).size, 6);
    for (const client of others) await client.until(m => m.t === 'snapshot' && m.players.length === 6);

    // A teleport is corrected over the network too.
    second.socket.send(JSON.stringify({t: 'input', seq: 5, x: 5, y: 0, z: 5, facing: 0, cloaked: false}));
    await second.until(m => m.t === 'correction' && m.seq === 5);

    // 8 seats: two more join, the ninth is refused.
    others.push(await connect(port, 'Eta'), await connect(port, 'Theta'));
    const ninth = await connect(port, 'Iota');
    assert.equal(ninth.welcome.t, 'full');

    // Leaving frees the seat for everyone else's snapshot.
    others[0].socket.close();
    await first.until(m => m.t === 'left' && m.id === others[0].id);
    for (const client of [first, second, ...others.slice(1)]) client.socket.close();
  } finally {
    await service.stop();
  }
});

test('the optional browser client accepts the exact loopback endpoint', () => {
  assert.equal(room.islesRoomUrlV1('ws://127.0.0.1:8795/isles'), 'ws://127.0.0.1:8795/isles');
  assert.equal(room.islesRoomUrlV1('wss://example.com/isles'), null);
  assert.equal(room.islesRoomUrlV1('ws://127.0.0.1:8795/isles?redirect=true'), null);
  assert.throws(() => room.createIslesNetClientV1('wss://example.com/isles', 'Chasseur', () => {}), /Adresse locale/);
});

test('browser upgrades require an explicitly allowed local origin', async () => {
  await assert.rejects(createIslesRoomServerV1({allowedOrigins: ['https://example.com']}), /Origine.*locale/);
  const origin = 'http://127.0.0.1:4173';
  const service = await createIslesRoomServerV1({allowedOrigins: [origin]});
  service.server.listen(0, '127.0.0.1');
  await once(service.server, 'listening');
  const state = value => new Promise((resolve, reject) => {
    const req = request({
      hostname: '127.0.0.1', port: service.server.address().port, path: '/isles',
      headers: {
        Origin: value, Connection: 'Upgrade', Upgrade: 'websocket',
        'Sec-WebSocket-Version': '13', 'Sec-WebSocket-Key': Buffer.alloc(16).toString('base64'),
      },
    });
    req.once('upgrade', (response, socket) => { socket.destroy(); resolve(response.statusCode); });
    req.once('response', response => { response.resume(); resolve(response.statusCode); });
    req.once('error', reject);
    req.end();
  });
  try {
    assert.equal(await state('https://example.com'), 400);
    assert.equal(await state('http://localhost:4173'), 400);
    assert.equal(await state(origin), 101);
  } finally {
    await service.stop();
  }
});
