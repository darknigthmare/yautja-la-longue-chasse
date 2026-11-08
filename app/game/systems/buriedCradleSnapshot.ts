import { CRADLE_PHYSICS, CRADLE_ROOM_IDS, buriedCradleRoom, getBuriedCradlePlatforms,
  parseBuriedCradleProgress, type BuriedCradleProgress, type BuriedCradleRun, type CradleRoomId } from './buriedCradle';
import { overlapsSolidPlatform } from './platformCollision';

/** Inputs, pressed buttons, DOM state and audio handles are deliberately absent. */
export interface BuriedCradleSnapshot { version: 1; run: BuriedCradleRun }
export interface CradleSnapshotInspection {
  status: 'absent' | 'valid' | 'future-version' | 'invalid-save'; state: BuriedCradleSnapshot | null;
}
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const exact = (value: unknown, names: string[]): value is Record<string, unknown> => object(value) &&
  Object.keys(value).sort().join('|') === [...names].sort().join('|');
const number = (value: unknown, min: number, max: number): value is number => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const integer = (value: unknown, min: number, max: number): value is number => number(value, min, max) && Number.isSafeInteger(value);
const parts = ['motor-a', 'motor-b', 'sheath-a', 'sheath-b', 'bulb'];
const progressKeys = ['version', 'visitedRoomIds', 'shortcutIds', 'checkpointId', 'drainageOpened', 'rootRingCut', 'bossDefeated', 'crownClaimed'];
const rectangle = (value: Record<string, unknown>) => number(value.x, 0, 2400) && number(value.y, 0, 720) &&
  number(value.width, 1, 2400) && number(value.height, 1, 720);

export function inspectBuriedCradleSnapshot(raw: unknown, progress: BuriedCradleProgress, budget: 0 | 1 | 2): CradleSnapshotInspection {
  if (raw == null) return { status: 'absent', state: null };
  if (object(raw) && typeof raw.version === 'number' && raw.version > 1) return { status: 'future-version', state: null };
  const invalid = (): CradleSnapshotInspection => ({ status: 'invalid-save', state: null });
  if (!exact(raw, ['version', 'run']) || raw.version !== 1 ||
      !exact(raw.run, ['progress', 'roomId', 'player', 'boss', 'rootTrap', 'clockSeconds', 'extracted', 'checkpointBudget'])) return invalid();
  const run = raw.run;
  if ((progress.checkpointId === '07' && budget < 1) || (progress.checkpointId === '11' && budget < 2) ||
      !exact(run.progress, progressKeys) || !parseBuriedCradleProgress(run.progress) ||
      JSON.stringify(parseBuriedCradleProgress(run.progress)) !== JSON.stringify(progress) ||
      !CRADLE_ROOM_IDS.includes(run.roomId as CradleRoomId) || !progress.visitedRoomIds.includes(run.roomId as CradleRoomId) ||
      !number(run.clockSeconds, 0, 31_536_000) || typeof run.extracted !== 'boolean' || run.checkpointBudget !== budget ||
      !exact(run.player, ['x', 'y', 'width', 'height', 'velocityX', 'velocityY', 'facing', 'grounded', 'health', 'hurtSeconds', 'meleeSeconds']) ||
      !exact(run.boss, ['phase', 'health', 'attack', 'stage', 'remainingSeconds', 'cycle', 'targetX', 'targetFloorY', 'attackHit', 'weakPoint', 'pools']) ||
      !exact(run.rootTrap, ['stage', 'remainingSeconds', 'targetX', 'targetFloorY', 'attackHit'])) return invalid();
  const p = run.player, boss = run.boss, trap = run.rootTrap;
  if (p.width !== CRADLE_PHYSICS.width || p.height !== CRADLE_PHYSICS.height ||
      !number(p.x, 0, buriedCradleRoom(run.roomId as CradleRoomId).width - CRADLE_PHYSICS.width) ||
      !number(p.y, 0, CRADLE_PHYSICS.floorY - CRADLE_PHYSICS.height) ||
      !number(p.velocityX, -CRADLE_PHYSICS.speed, CRADLE_PHYSICS.speed) ||
      !number(p.velocityY, CRADLE_PHYSICS.jumpVelocity, 2000) || ![-1, 1].includes(Number(p.facing)) ||
      typeof p.facing !== 'number' || typeof p.grounded !== 'boolean' || !integer(p.health, 1, 100) ||
      !number(p.hurtSeconds, 0, .850001) || !number(p.meleeSeconds, 0, CRADLE_PHYSICS.meleeCooldown + 1e-6)) return invalid();
  if (!exact(boss.health, parts) || parts.some(part => !integer((boss.health as Record<string, unknown>)[part], 0, part === 'bulb' ? 100 : 60)) ||
      typeof boss.phase !== 'string' || !['tentacles', 'sheath', 'bulb', 'defeated'].includes(boss.phase) ||
      typeof boss.attack !== 'string' || !['puncture', 'sweep', 'capture', 'salvo', 'breath', 'bite', 'pulse', 'whips'].includes(boss.attack) ||
      typeof boss.stage !== 'string' || !['telegraph', 'active', 'opening'].includes(boss.stage) || !number(boss.remainingSeconds, 0, 5.000001) ||
      !integer(boss.cycle, 0, Number.MAX_SAFE_INTEGER) || !number(boss.targetX, 0, 1920) ||
      !number(boss.targetFloorY, 0, 624) || typeof boss.attackHit !== 'boolean' ||
      !Array.isArray(boss.pools) || boss.pools.length > 2) return invalid();
  const hp = boss.health as Record<string, number>;
  const phase = hp['motor-a'] + hp['motor-b'] > 0 ? 'tentacles' : hp['sheath-a'] + hp['sheath-b'] > 0 ? 'sheath' : hp.bulb > 0 ? 'bulb' : 'defeated';
  if (boss.phase !== phase || parts.some(part => hp[part] % CRADLE_PHYSICS.meleeDamage !== 0) ||
      phase === 'tentacles' && (hp['sheath-a'] !== 60 || hp['sheath-b'] !== 60 || hp.bulb !== 100) ||
      phase === 'sheath' && hp.bulb !== 100 || progress.bossDefeated !== (phase === 'defeated') ||
      new Set(boss.pools.map(pool => object(pool) ? pool.x : null)).size !== boss.pools.length ||
      boss.pools.some(pool => !exact(pool, ['x', 'y', 'width', 'height', 'remainingSeconds']) ||
        typeof pool.x !== 'number' || ![640, 1120].includes(pool.x) || pool.y !== 602 || pool.width !== 144 || pool.height !== 22 ||
        !number(pool.remainingSeconds, Number.MIN_VALUE, progress.drainageOpened ? 3 : 8))) return invalid();
  if (boss.weakPoint !== null) {
    const weak = boss.weakPoint;
    if (!exact(weak, ['partId', 'x', 'y', 'width', 'height']) || !rectangle(weak) ||
        boss.stage !== 'opening' || typeof weak.partId !== 'string' || !parts.includes(weak.partId) || hp[weak.partId] <= 0) return invalid();
    const validWeak = boss.phase === 'tentacles' ? ['motor-a', 'motor-b'].includes(String(weak.partId)) &&
      boss.attack === 'puncture' && !boss.attackHit && weak.x === Number(boss.targetX) - 24 &&
      weak.y === Number(boss.targetFloorY) - 88 && weak.width === 48 && weak.height === 72
      : boss.phase === 'sheath' ? ['sheath-a', 'sheath-b'].includes(String(weak.partId)) && boss.attack === 'breath'
      : boss.phase === 'bulb' && weak.partId === 'bulb' && boss.attack === 'bite' && !boss.attackHit;
    if (!validWeak || boss.phase !== 'tentacles' && (weak.x !== 1550 || weak.y !== 474 || weak.width !== 56 || weak.height !== 72)) return invalid();
  }
  if (typeof trap.stage !== 'string' || !['waiting', 'telegraph', 'active', 'opening'].includes(trap.stage) ||
      !number(trap.remainingSeconds, -.1, 3.800001) || !number(trap.targetX, 0, 1920) ||
      !number(trap.targetFloorY, 0, 624) || typeof trap.attackHit !== 'boolean') return invalid();
  const copied = JSON.parse(JSON.stringify(raw)) as BuriedCradleSnapshot;
  if (overlapsSolidPlatform(copied.run.player, getBuriedCradlePlatforms(copied.run.roomId, progress))) return invalid();
  if (copied.run.extracted) {
    const feetX = copied.run.player.x + CRADLE_PHYSICS.width / 2;
    const feetY = copied.run.player.y + CRADLE_PHYSICS.height;
    const emergency = ['01', '11', '12'].includes(copied.run.roomId) && Math.abs(feetX - 192) <= 48;
    const victoryExit = copied.run.roomId === '12' && progress.bossDefeated && Math.abs(feetX - 1824) <= 84;
    if (Math.abs(feetY - CRADLE_PHYSICS.floorY) > 42 || !emergency && !victoryExit) return invalid();
  }
  return { status: 'valid', state: copied };
}

export function snapshotBuriedCradleRun(run: BuriedCradleRun): BuriedCradleSnapshot {
  const checked = inspectBuriedCradleSnapshot({ version: 1, run }, run.progress, run.checkpointBudget ?? 2);
  if (!checked.state) throw new RangeError('The live Berceau state cannot be saved; preserve the previous record.');
  return checked.state;
}
