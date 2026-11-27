#!/usr/bin/env node
/** The Isles V1 · WebSocket service of the test-island room (production step 2).
 * No dependency: RFC 6455 text frames on node:http. The room logic is
 * app/game/isles/islesRoomV1.ts, compiled with esbuild at start (like the V115 Outer Ops service).
 *
 *   node scripts/serve-isles-room-v1.mjs            # ws://127.0.0.1:8795/isles
 *   ISLES_ROOM_PORT, ISLES_ALLOWED_ORIGINS (exact local browser origins, comma separated)
 */
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {build} from 'esbuild';

const root = fileURLToPath(new URL('../', import.meta.url));
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const MAX_FRAME = 4096;
const MAX_MESSAGES_PER_SECOND = 60;
const HELLO_TIMEOUT_MS = 10000;
const MAX_BUFFER_BYTES = 64 * 1024;
const MAX_PENDING_CLIENTS = 24;
const localAddress = address => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address);
const localSocket = socket => localAddress(socket.localAddress) && localAddress(socket.remoteAddress);

function localBrowserOrigin(value) {
  try {
    const url = new URL(value);
    return url.origin === value && ['http:', 'https:'].includes(url.protocol) &&
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  } catch {
    return false;
  }
}

/** Compiles the room, map and tuning used by the service. */
export async function loadIslesRoomV1() {
  const bundle = await build({stdin: {contents: 'export * from "./app/game/isles/islesRoomV1";export * from "./app/game/isles/islesMapV1";export * from "./app/game/isles/islesNetClientV1";',
    resolveDir: root, loader: 'ts'}, bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent'});
  const roomModule = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
  const tuning = JSON.parse(await readFile(resolve(root, 'app/game/data/islesTuningV1.json'), 'utf8'));
  const net = JSON.parse(await readFile(resolve(root, 'app/game/data/islesNetConfigV1.json'), 'utf8'));
  const map = roomModule.parseIslesMapV1(JSON.parse(await readFile(resolve(root, 'app/game/data/islesMapTestV1.json'), 'utf8')), tuning.tileMeters);
  return {module: roomModule, tuning: {...tuning, net}, map};
}

function encodeFrame(opcode, payload) {
  const body = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
  const head = body.length < 126 ? Buffer.from([0x80 | opcode, body.length])
    : Buffer.from([0x80 | opcode, 126, body.length >> 8, body.length & 255]);
  return Buffer.concat([head, body]);
}

/** Reads complete client frames from a buffer; client frames must be masked and unfragmented. */
export function decodeFramesV1(buffer) {
  const frames = [];
  let offset = 0;
  while (buffer.length - offset >= 2) {
    const b0 = buffer[offset], b1 = buffer[offset + 1];
    const fin = (b0 & 0x80) !== 0, opcode = b0 & 0x0f, masked = (b1 & 0x80) !== 0;
    let length = b1 & 0x7f, cursor = offset + 2;
    if (length === 126) { if (buffer.length - cursor < 2) break; length = buffer.readUInt16BE(cursor); cursor += 2; }
    else if (length === 127) return {frames, rest: Buffer.alloc(0), error: 'frame-too-large'};
    if ((b0 & 0x70) !== 0 || (opcode >= 8 && length > 125)) return {frames, rest: Buffer.alloc(0), error: 'bad-frame'};
    if (!masked) return {frames, rest: Buffer.alloc(0), error: 'unmasked'};
    if (!fin) return {frames, rest: Buffer.alloc(0), error: 'fragmented'};
    if (length > MAX_FRAME) return {frames, rest: Buffer.alloc(0), error: 'frame-too-large'};
    if (buffer.length - cursor < 4 + length) break;
    const mask = buffer.subarray(cursor, cursor + 4);
    const payload = Buffer.from(buffer.subarray(cursor + 4, cursor + 4 + length));
    for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];
    frames.push({opcode, payload});
    offset = cursor + 4 + length;
  }
  return {frames, rest: buffer.subarray(offset), error: null};
}

/** HTTP + WebSocket service around one room. `clock` returns server seconds. */
export async function createIslesRoomServerV1({allowedOrigins = [], clock, preyStart, preyWanders = true, seed = 1} = {}) {
  if (!allowedOrigins.every(localBrowserOrigin)) throw new TypeError('Origine de navigateur locale requise.');
  const origins = new Set(allowedOrigins);
  const {module, tuning, map} = await loadIslesRoomV1();
  const started = performance.now();
  const now = clock ?? (() => (performance.now() - started) / 1000);
  const room = module.createIslesRoomV1({map, net: tuning.net, runSpeed: tuning.movement.runSpeed, preyStart, preyWanders, seed});
  const clients = new Map();
  const send = (socket, message) => {
    if (socket.destroyed) return;
    if (socket.writableLength > MAX_BUFFER_BYTES) {
      socket.destroy();
      return;
    }
    socket.write(encodeFrame(1, JSON.stringify(message)));
  };
  const broadcast = message => { for (const client of clients.values()) if (client.id) send(client.socket, message); };
  const close = (client, code = 1000) => {
    if (client.closed) return;
    client.closed = true;
    const body = Buffer.alloc(2); body.writeUInt16BE(code);
    if (!client.socket.destroyed) client.socket.end(encodeFrame(8, body));
    drop(client);
  };
  const drop = client => {
    clients.delete(client.socket);
    clearTimeout(client.helloTimer);
    if (client.id) { const left = room.leave(client.id); client.id = null; if (left) broadcast(left); }
  };

  const server = createServer((request, response) => {
    const statusPage = localSocket(request.socket) && request.url === '/';
    response.writeHead(statusPage ? 200 : 404, {'Content-Type': 'text/plain; charset=utf-8'});
    response.end(statusPage ? 'The Isles V1 · salle de test ' + room.size() + '/' + tuning.net.maxPlayers + '\n' : 'introuvable\n');
  });
  server.on('upgrade', (request, socket, head) => {
    const key = request.headers['sec-websocket-key'];
    const origin = request.headers.origin;
    if (!localSocket(socket) || clients.size >= MAX_PENDING_CLIENTS ||
        request.url !== '/isles' || request.headers.upgrade?.toLowerCase() !== 'websocket' ||
        typeof key !== 'string' || !/^[A-Za-z0-9+/]{22}==$/.test(key) ||
        request.headers['sec-websocket-version'] !== '13' ||
        (origin !== undefined && !origins.has(origin))) {
      socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
      return;
    }
    const accept = createHash('sha1').update(key + GUID).digest('base64');
    socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
    socket.setNoDelay(true);
    const client = {socket, id: null, buffer: Buffer.alloc(0), closed: false, window: 0, count: 0, helloTimer: null};
    client.helloTimer = setTimeout(() => { if (!client.id) close(client, 1008); }, HELLO_TIMEOUT_MS);
    clients.set(socket, client);
    const receive = chunk => {
      if (client.closed) return;
      if (client.buffer.length + chunk.length > MAX_BUFFER_BYTES) { close(client, 1009); return; }
      client.buffer = Buffer.concat([client.buffer, chunk]);
      const {frames, rest, error} = decodeFramesV1(client.buffer);
      client.buffer = rest;
      if (error) { close(client, error === 'frame-too-large' ? 1009 : 1002); return; }
      for (const frame of frames) {
        if (frame.opcode === 8) { close(client); return; }
        const second = Math.floor(now());
        if (second !== client.window) { client.window = second; client.count = 0; }
        if (++client.count > MAX_MESSAGES_PER_SECOND) { close(client, 1008); return; }
        if (frame.opcode === 9) { socket.write(encodeFrame(10, frame.payload)); continue; }
        if (frame.opcode === 10) continue;
        if (frame.opcode !== 1) { close(client, 1003); return; }
        const message = module.parseIslesClientMessageV1(frame.payload.toString('utf8'));
        if (!message) continue;
        if (!client.id) {
          if (message.t !== 'hello') continue;
          const joined = room.join(message.name, now());
          send(socket, joined.reply);
          if (!joined.id) { close(client, 1013); return; }
          client.id = joined.id;
          clearTimeout(client.helloTimer);
          continue;
        }
        if (message.t === 'input') { const correction = room.input(client.id, message, now()); if (correction) send(socket, correction); }
        else if (message.t === 'strike') {
          const result = room.strike(client.id, message, now());
          send(socket, result.reply);
          if (result.broadcast) broadcast(result.broadcast);
        }
      }
    };
    socket.on('data', receive);
    socket.on('close', () => drop(client));
    socket.on('error', () => drop(client));
    if (head.length) receive(head);
  });

  let last = now();
  const timer = setInterval(() => {
    const at = now();
    const {snapshot, idle} = room.tick(at, at - last);
    last = at;
    for (const client of clients.values()) if (client.id && idle.includes(client.id)) close(client, 1001);
    broadcast(snapshot);
  }, 1000 / tuning.net.snapshotHz);
  timer.unref?.();
  server.on('close', () => clearInterval(timer));

  return {
    server, room, tuning, map,
    async stop() {
      clearInterval(timer);
      for (const client of [...clients.values()]) close(client, 1001);
      await new Promise(done => server.close(done));
    },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.ISLES_ROOM_PORT ?? 8795);
  const host = '127.0.0.1';
  const allowedOrigins = (process.env.ISLES_ALLOWED_ORIGINS ?? '').split(',').map(item => item.trim()).filter(Boolean);
  const service = await createIslesRoomServerV1({allowedOrigins});
  service.server.on('error', error => { process.stderr.write('Impossible d’ouvrir la salle The Isles (' + (error.code ?? 'erreur') + ').\n'); process.exitCode = 1; });
  service.server.listen(port, host, () => process.stdout.write('Salle The Isles V1 sur ws://' + host + ':' + port + '/isles\n'));
}
