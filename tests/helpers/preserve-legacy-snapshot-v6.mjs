import fs from 'node:fs';
import {createHash} from 'node:crypto';

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const clone = structuredClone;
export const LEGACY_RESERVE_CASES_V6 = [
  ['v1', api => api.createGameReserveV66(113)],
  ['v2', api => api.createGameReserveV104(113)],
  ['v3', api => api.createGameReserveV107(113)],
  ['v4', api => api.createGameReserveV108(113)],
  ['desert-v5', api => api.createGameReserveV109(113, 'khar-duun-canyon-expedition')],
  ['ice-v5', api => api.createGameReserveV109(113, 'iskhel-ice-expedition')],
];

function image(src) {
  const b = fs.readFileSync('public' + src), chunk = b.toString('ascii', 12, 16);
  let size;
  if (b.toString('hex', 0, 8) === '89504e470d0a1a0a') size = [b.readUInt32BE(16), b.readUInt32BE(20)];
  else if (chunk === 'VP8X') size = [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  else if (chunk === 'VP8L') { const v = b.readUInt32LE(21); size = [1 + (v & 0x3fff), 1 + (v >>> 14 & 0x3fff)]; }
  else size = [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  return {src, naturalWidth: size[0], naturalHeight: size[1]};
}

// Record the actual renderer's Canvas operations, including image source,
// dimensions, draw order, alpha and text. This is command parity, not visual QA.
function rendered(api, state, width) {
  const definition = api.gameReserveV109Definition(state);
  const sources = definition ? {...api.GAME_RESERVE_V66_ART, background: definition.art.background,
    branch: definition.art.ledge, industrialPlatform: definition.art.gantry, ferns: definition.art.cover} : api.GAME_RESERVE_V66_ART;
  const bank = Object.fromEntries(Object.entries(sources).map(([key, src]) => [key, image(src)]));
  const commands = [], target = {canvas: {width}}, gradients = new Map();
  const context = new Proxy(target, {
    set(object, key, value) { object[key] = value; commands.push(['set', key, gradients.get(value) ?? value]); return true; },
    get(object, key) {
      if (key in object) return object[key];
      if (key === 'measureText') return text => ({width: text.length * 7});
      if (key === 'createLinearGradient') return (...args) => {
        const id = ['gradient', gradients.size, args], value = {addColorStop: (...stops) => commands.push(['colorStop', id, stops])};
        gradients.set(value, id); commands.push(id); return value;
      };
      return (...args) => commands.push([key, ...args.map(value => value?.src ? {src: value.src, width: value.naturalWidth, height: value.naturalHeight} : value)]);
    },
  });
  api.drawGameReserveV66(context, state, bank, true);
  return {width, commands: commands.length, sha256: digest(commands)};
}

export function captureLegacyReserveSnapshotV6(api) {
  return LEGACY_RESERVE_CASES_V6.map(([id, factory]) => {
    const initial = factory(api), geometry = {};
    for (const name of ['World', 'Platforms', 'Cover', 'Ships', 'Supplies', 'People', 'Sites']) geometry[name] = JSON.parse(JSON.stringify(api['gameReserveV66' + name](initial)));
    let state = clone(initial);
    // Declared geometry fixture: downed adults isolate old contact/collision
    // behavior all the way to each map's east end and back. No combat victory.
    for (const human of state.humans) { human.status = 'down'; human.hp = 0; human.downAt = 0; }
    const trace = createHash('sha256'), samples = [];
    for (let frame = 0; frame <= 10000; frame++) {
      const raw = JSON.stringify(state); trace.update(raw + '\n');
      if ([0, 900, 4000, 6000, 10000].includes(frame)) samples.push({frame, serialized: raw});
      state = api.stepGameReserveV66(state, {move: frame < 5200 ? 1 : -1, jump: frame % 83 === 0, cloak: frame % 401 === 0});
    }
    let live = clone(initial); const liveTrace = createHash('sha256');
    for (let frame = 0; frame < 900; frame++) { liveTrace.update(JSON.stringify(live) + '\n'); live = api.stepGameReserveV66(live, {move: frame % 300 < 150 ? 1 : -1}); }
    return {id, factorySerialized: JSON.stringify(initial), normalizedSerialized: JSON.stringify(api.normalizeGameReserveV66(initial)),
      geometry, traceSha256: trace.digest('hex'), samples, liveTraceSha256: liveTrace.digest('hex'),
      render: [rendered(api, initial, 960), rendered(api, state, 1440)]};
  });
}
