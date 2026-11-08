/** Deterministic model probe. No browser, persisted campaign, or runtime edit.
 * Initial progress/room positions are explicitly prepared coverage seeds;
 * every inspected record after initialization is returned by the real step.
 */
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { homeworldSceneSsrV78 } from '../../../tests/helpers/homeworld-scene-ssr-v78.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const qa = homeworldSceneSsrV78(root);
const cradle = qa.load('app/game/systems/buriedCradle.ts');
const validator = qa.load('app/game/systems/buriedCradleSnapshot.ts');
const seedInitial = 447711;
let seed = seedInitial;
const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
let checked = 0;
const invalid = [], events = {};
const bounds = { minY: Infinity, maxY: -Infinity, minVY: Infinity, maxVY: -Infinity };

for (const roomId of cradle.CRADLE_ROOM_IDS) {
  for (const cleared of [false, true]) {
    const progress = { ...cradle.createBuriedCradleProgress(),
      visitedRoomIds: [...cradle.CRADLE_ROOM_IDS], rootRingCut: true, bossDefeated: cleared,
      checkpointId: roomId === '07' ? '07' : roomId === '11' ? '11' : '01' };
    if (roomId === '10' && !cleared) {
      progress.visitedRoomIds = progress.visitedRoomIds.filter(id => !['11', '12'].includes(id));
      progress.rootRingCut = false;
    }
    let run = cradle.createBuriedCradleRun(progress, 2);
    run.roomId = roomId;
    const feet = cradle.buriedCradleRoom(roomId).mainRoute[0];
    run.player.x = feet.x - 36;
    run.player.y = feet.y - 116;
    for (let frame = 0; frame < 5000; frame++) {
      const dt = [1/60, 0.05, 0.016, 0.25, 0.0083][Math.floor(random() * 5)];
      const input = { move: random() < .72 ? 1 : random() < .6 ? -1 : 0,
        jumpPressed: random() < .07, jumpHeld: random() < .75,
        meleePressed: random() < .08, interactPressed: random() < .025 };
      const result = cradle.stepBuriedCradle(run, input, dt);
      run = result.run;
      for (const event of result.events) events[event.type] = (events[event.type] ?? 0) + 1;
      checked++;
      const inspection = validator.inspectBuriedCradleSnapshot({ version: 1, run }, run.progress, 2);
      bounds.minY = Math.min(bounds.minY, run.player.y);
      bounds.maxY = Math.max(bounds.maxY, run.player.y);
      bounds.minVY = Math.min(bounds.minVY, run.player.velocityY);
      bounds.maxVY = Math.max(bounds.maxVY, run.player.velocityY);
      if (inspection.status !== 'valid') {
        invalid.push({ seedRoom: roomId, cleared, frame, dt, events: result.events, run });
        break;
      }
      if (run.extracted) break;
    }
  }
}

const files = ['app/game/systems/buriedCradle.ts', 'app/game/systems/buriedCradleSnapshot.ts',
  'app/game/systems/platformCollision.ts', 'app/game/systems/jumpAssist.ts',
  'tests/helpers/homeworld-scene-ssr-v78.mjs'];
const sourceHashes = Object.fromEntries(files.map(file => [file,
  createHash('sha256').update(fs.readFileSync(new URL('../../../' + file, import.meta.url))).digest('hex')]));
console.log(JSON.stringify({ probe: 'independent-buried-cradle-snapshot-review', seedInitial,
  preparedEpisodes: 24, maximumFramesPerEpisode: 5000, checkpointBudget: 2,
  initialStatePrepared: true, browserExecuted: false, hardwareInputExecuted: false,
  checked, invalid, events, bounds, sourceHashes }, null, 2));
if (invalid.length) process.exitCode = 1;
