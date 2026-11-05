import {
  DEFAULT_PLAN, TRIO_MEMBERS, TRIO_INSERTION_OFFSETS, EXPEDITION_MEMBER_SIZE, EXPEDITION_MEMBER_HEALTH, normalizePlanetInsertionPlan, planetInsertionPressure,
  type ExpeditionMemberId, type PlanetInsertionPlan,
} from './planetInsertion';
import { overlapsSolidPlatform, resolvePlatformMotion } from './platformCollision';
import { huntStructuralBarrierV94 } from './huntStructuralBarrierV94';
import { calculateLineOfSightOcclusion } from './huntSystems';
import { isHazardActive, resolveNearestSafeGroundX, type WorldBlueprint, type WorldRect } from './worldBlueprints';

export type HuntCompanionOrder = 'follow' | 'hold';
export type HuntCompanionStatus = 'active' | 'downed' | 'boarding' | 'extracted' | 'left-behind';
export interface HuntCompanion extends WorldRect {
  id: ExpeditionMemberId;
  maxHealth: number;
  health: number;
  velocityX: number;
  velocityY: number;
  facing: -1 | 1;
  grounded: boolean;
  climbing: boolean;
  order: HuntCompanionOrder;
  status: HuntCompanionStatus;
  attackCooldown: number;
  attackFlash: number;
  invulnerability: number;
  blockedSeconds: number;
  /** A committed physical leap keeps its horizontal intent until an actual landing. */
  jumpTargetX: number | null;
}

export interface HuntInsertionState {
  version: 1;
  runId: string;
  plan: PlanetInsertionPlan;
  origin: { x: number; y: number };
  searchUntil: number;
  patrolIds: string[];
  alertedIds: string[];
  companions: HuntCompanion[];
}

export interface HuntInsertionOutcome {
  version: 1;
  runId: string;
  plan: PlanetInsertionPlan;
  members: { id: ExpeditionMemberId; status: 'extracted' | 'left-behind'; health: number; maxHealth: number }[];
  extracted: ExpeditionMemberId[];
  leftBehind: ExpeditionMemberId[];
  injured: ExpeditionMemberId[];
}

const MEMBER_HEALTH = EXPEDITION_MEMBER_HEALTH;
const WIDTH = EXPEDITION_MEMBER_SIZE.width;
const HEIGHT = EXPEDITION_MEMBER_SIZE.height;
const GRAVITY = 1_850;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const point = (body: WorldRect) => ({ x: body.x + body.width / 2, y: body.y + body.height / 2 });
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const unit = (key: string) => {
  let hash = 2166136261;
  for (const character of key) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return (hash >>> 0) / 0x100000000;
};

/** Dedicated IDs keep extra patrols separate from scripted waves and prevent duplicate insertion. */
export function huntInsertionPatrols(plan: PlanetInsertionPlan, world: WorldBlueprint, runId: string) {
  const amount = clamp(Math.floor(planetInsertionPressure(plan).extraPatrols), 0, 4);
  const minX = world.spawn.x + 950;
  const maxX = Math.min(world.width - 180, world.bossArena.x - 200);
  const placements: { id: string; centerX: number }[] = [];
  if (maxX < minX) return placements;
  for (let index = 0; index < amount; index += 1) {
    const desired = minX + 120 + index * 340 + unit(`${runId}:patrol:${index}`) * 100;
    const centerX = resolveNearestSafeGroundX(world, clamp(desired, minX, maxX), { minX, maxX }, 104);
    if (centerX === null || placements.some(item => Math.abs(item.centerX - centerX) < 180)) continue;
    placements.push({ id: `${runId}:insertion-patrol-${index}`, centerX });
  }
  return placements;
}

export function createHuntInsertion(plan: PlanetInsertionPlan, runId: string, world: WorldBlueprint): HuntInsertionState {
  const normalized = normalizePlanetInsertionPlan(plan);
  if (!normalized) throw new TypeError('Plan d’insertion invalide.');
  const origin = { x: world.spawn.x + 36, y: world.floorY };
  const companions = normalized.team === 'triad' ? TRIO_MEMBERS.map(({ id }): HuntCompanion => {
    const x = origin.x + TRIO_INSERTION_OFFSETS[id] - WIDTH / 2;
    const body = { x, y: world.floorY - HEIGHT, width: WIDTH, height: HEIGHT };
    if (x < 0 || x + WIDTH > world.width || overlapsSolidPlatform(body, world.platforms) ||
        world.hazards.some(hazard => hazard.damagePerSecond > 0 && body.x < hazard.x + hazard.width &&
          body.x + body.width > hazard.x && body.y < hazard.y + hazard.height && body.y + body.height > hazard.y)) {
      throw new RangeError(`Le point d’insertion de ${id} est occupé.`);
    }
    return { id, ...body, health: MEMBER_HEALTH[id], maxHealth: MEMBER_HEALTH[id], velocityX: 0, velocityY: 0,
      facing: 1, grounded: true, climbing: false, order: 'follow', status: 'active', attackCooldown: .7,
      attackFlash: 0, invulnerability: 0, blockedSeconds: 0, jumpTargetX: null };
  }) : [];
  return { version: 1, runId, plan: normalized, origin, searchUntil: planetInsertionPressure(normalized).searchSeconds,
    patrolIds: huntInsertionPatrols(normalized, world, runId).map(item => item.id), alertedIds: [], companions };
}

export function cloneHuntInsertion(state: HuntInsertionState): HuntInsertionState {
  return { ...state, plan: { ...state.plan }, origin: { ...state.origin }, patrolIds: [...state.patrolIds],
    alertedIds: [...state.alertedIds], companions: state.companions.map(member => ({ ...member })) };
}

/** Legacy hunts stay solo and quiet; decoding never replays an insertion or grants new actors. */
export function restoreHuntInsertion(raw: unknown, runId: string, world: WorldBlueprint): HuntInsertionState | null {
  if (raw === undefined) return { version: 1, runId, plan: { ...DEFAULT_PLAN }, origin: { x: world.spawn.x + 36, y: world.floorY },
    searchUntil: 0, patrolIds: [], alertedIds: [], companions: [] };
  if (!record(raw) || raw.version !== 1 || raw.runId !== runId || !record(raw.origin) ||
      raw.origin.x !== world.spawn.x + 36 || raw.origin.y !== world.floorY) return null;
  const plan = normalizePlanetInsertionPlan(raw.plan);
  if (!plan || raw.searchUntil !== planetInsertionPressure(plan).searchSeconds ||
      !Array.isArray(raw.patrolIds) || raw.patrolIds.length > 4 || new Set(raw.patrolIds).size !== raw.patrolIds.length ||
      !raw.patrolIds.every(id => typeof id === 'string' && huntInsertionPatrols(plan, world, runId).some(item => item.id === id)) ||
      !Array.isArray(raw.alertedIds) || raw.alertedIds.length > 512 || new Set(raw.alertedIds).size !== raw.alertedIds.length ||
      !raw.alertedIds.every(id => typeof id === 'string' && id.length > 0 && id.length <= 250) ||
      !Array.isArray(raw.companions) || raw.companions.length !== (plan.team === 'triad' ? 2 : 0)) return null;
  const companions: HuntCompanion[] = [];
  for (const member of raw.companions) {
    if (!record(member) || !TRIO_MEMBERS.some(item => item.id === member.id) || companions.some(item => item.id === member.id)) return null;
    const id = member.id as ExpeditionMemberId;
    if (member.width !== WIDTH || member.height !== HEIGHT || member.maxHealth !== MEMBER_HEALTH[id] ||
        !['x', 'y', 'health', 'velocityX', 'velocityY', 'attackCooldown', 'attackFlash', 'invulnerability', 'blockedSeconds'].every(key => finite(member[key])) ||
        typeof member.grounded !== 'boolean' || typeof member.climbing !== 'boolean' || ![-1, 1].includes(member.facing as number) ||
        (member.jumpTargetX !== null && (!finite(member.jumpTargetX) || member.jumpTargetX < 0 || member.jumpTargetX > world.width)) ||
        !['follow', 'hold'].includes(member.order as string) ||
        !['active', 'downed', 'boarding', 'extracted', 'left-behind'].includes(member.status as string)) return null;
    const body = member as unknown as HuntCompanion;
    if (body.x < 0 || body.x + WIDTH > world.width || body.y < (world.minY ?? 0) - 400 || body.y + HEIGHT > world.floorY + .01 ||
        body.health < 0 || body.health > MEMBER_HEALTH[id] || Math.abs(body.velocityX) > 400 || Math.abs(body.velocityY) > 1_400 ||
        body.attackCooldown < 0 || body.attackCooldown > 5 || body.attackFlash < 0 || body.attackFlash > 1 ||
        body.invulnerability < 0 || body.invulnerability > 2 || body.blockedSeconds < 0 || body.blockedSeconds > 10 ||
        (body.status === 'downed') !== (body.health === 0 && body.status !== 'left-behind') ||
        (body.status === 'active' && overlapsSolidPlatform(body, world.platforms))) return null;
    companions.push({ ...body });
  }
  return { version: 1, runId, plan, origin: { x: raw.origin.x as number, y: raw.origin.y as number }, searchUntil: raw.searchUntil as number,
    patrolIds: [...raw.patrolIds] as string[], alertedIds: [...raw.alertedIds] as string[], companions };
}

export function hurtHuntCompanion(member: HuntCompanion, damage: number): boolean {
  if (member.status !== 'active' || member.invulnerability > 0 || !Number.isFinite(damage) || damage <= 0) return false;
  member.health = Math.max(0, member.health - damage);
  member.invulnerability = .7;
  member.attackFlash = 0;
  if (member.health === 0) { member.status = 'downed'; member.velocityX = 0; member.climbing = false; }
  return true;
}

export function huntInsertionLineOfSight(source: { x: number; y: number }, target: { x: number; y: number },
  world: WorldBlueprint, covers: WorldBlueprint['covers'] = world.covers): boolean {
  return !huntStructuralBarrierV94(source, target, world.platforms) && calculateLineOfSightOcclusion(source, target, covers) < .9;
}

export function canAidHuntCompanion(member: HuntCompanion, player: WorldRect & { grounded: boolean; medicomps: number }, world: WorldBlueprint,
  covers: WorldBlueprint['covers'] = world.covers): boolean {
  return (member.status === 'active' || member.status === 'downed') && member.health < member.maxHealth && player.medicomps > 0 &&
    player.grounded && Math.hypot(point(member).x - point(player).x, point(member).y - point(player).y) <= 125 &&
    huntInsertionLineOfSight(point(player), point(member), world, covers);
}

export function aidHuntCompanion(member: HuntCompanion, player: WorldRect & { grounded: boolean; medicomps: number }, world: WorldBlueprint,
  covers: WorldBlueprint['covers'] = world.covers): boolean {
  if (!canAidHuntCompanion(member, player, world, covers)) return false;
  player.medicomps -= 1;
  member.health = Math.min(member.maxHealth, member.health + member.maxHealth * .55);
  member.status = 'active'; member.order = 'follow'; member.invulnerability = 1.2; member.blockedSeconds = 0;
  return true;
}

export function huntCompanionAtExtraction(member: HuntCompanion, world: WorldBlueprint): boolean {
  return member.status === 'active' && member.grounded && Math.abs(point(member).x - world.extraction.x) <= 130 &&
    Math.abs(member.y + member.height - world.floorY) <= 24;
}

export function missingHuntCompanions(state: HuntInsertionState, world: WorldBlueprint): HuntCompanion[] {
  return state.companions.filter(member => member.status !== 'left-behind' && member.status !== 'boarding' &&
    member.status !== 'extracted' && !huntCompanionAtExtraction(member, world));
}

export function beginHuntCompanionBoarding(state: HuntInsertionState, world: WorldBlueprint): boolean {
  if (missingHuntCompanions(state, world).length) return false;
  for (const member of state.companions) if (huntCompanionAtExtraction(member, world)) {
    member.status = 'boarding'; member.velocityX = 0; member.velocityY = 0; member.climbing = false;
  }
  return true;
}

export function completeHuntCompanionBoarding(state: HuntInsertionState): void {
  for (const member of state.companions) if (member.status === 'boarding') member.status = 'extracted';
}

export function huntInsertionOutcome(state: HuntInsertionState, liveRunId = state.runId): HuntInsertionOutcome {
  const members = state.companions.map(member => ({ id: member.id,
    status: member.status === 'extracted' ? 'extracted' as const : 'left-behind' as const,
    health: member.health, maxHealth: member.maxHealth }));
  return { version: 1, runId: liveRunId, plan: { ...state.plan }, members,
    extracted: members.filter(member => member.status === 'extracted').map(member => member.id),
    leftBehind: members.filter(member => member.status === 'left-behind').map(member => member.id),
    injured: members.filter(member => member.status === 'extracted' && member.health < member.maxHealth).map(member => member.id) };
}

export interface InsertionEnemy extends WorldRect { id: string; alive: boolean; active: boolean; boss: boolean }
export interface CompanionStepInput {
  delta: number;
  elapsed: number;
  player: WorldRect & { facing: -1 | 1 };
  world: WorldBlueprint;
  enemies: readonly InsertionEnemy[];
  /** Destroyed covers have already been removed by the owning simulation. */
  covers?: WorldBlueprint['covers'];
  extracting: boolean;
  boardingProgress?: number;
}

const intersects = (a: WorldRect, b: WorldRect) => a.x < b.x + b.width && a.x + a.width > b.x &&
  a.y < b.y + b.height && a.y + a.height > b.y;

/** Probe a short ballistic route against the same solids and hazards used by the live body. */
function companionLeap(member: HuntCompanion, direction: number, goalX: number, world: WorldBlueprint, elapsed: number) {
  const self = point(member), footY = member.y + HEIGHT;
  const support = world.platforms.find(platform => Math.abs(platform.y - footY) < 2 && member.x < platform.x + platform.width &&
    member.x + WIDTH > platform.x && (direction > 0 ? platform.x + platform.width - member.x - WIDTH : member.x - platform.x) < 70 &&
    (direction > 0 ? goalX > platform.x + platform.width + WIDTH / 2 : goalX < platform.x - WIDTH / 2));
  const ahead = world.hazards.filter(hazard => hazard.damagePerSecond >= 8 && isHazardActive(hazard, elapsed) &&
    ((footY > hazard.y && member.y < hazard.y + hazard.height &&
      (direction > 0 ? hazard.x - (member.x + WIDTH) : member.x - (hazard.x + hazard.width)) >= -2 &&
      (direction > 0 ? hazard.x - (member.x + WIDTH) : member.x - (hazard.x + hazard.width)) < 70) ||
      (support && hazard.y >= footY && hazard.y - footY <= 250 &&
        (direction > 0 ? hazard.x <= support.x + support.width && hazard.x + hazard.width > support.x + support.width
          : hazard.x < support.x && hazard.x + hazard.width >= support.x))))
    .sort((a, b) => Math.abs(a.x - self.x) - Math.abs(b.x - self.x))[0];
  if (!ahead) return null;
  const candidates = [
    { x: direction > 0 ? ahead.x + ahead.width + WIDTH / 2 + 24 : ahead.x - WIDTH / 2 - 24, y: world.floorY },
    ...world.platforms.filter(platform => platform.width >= WIDTH + 10 && platform.y <= ahead.y &&
      footY - platform.y <= 235 && footY - platform.y >= -60 &&
      (platform.x + platform.width / 2 - self.x) * direction > 50)
      .flatMap(platform => [
        direction > 0 ? platform.x + WIDTH / 2 + 6 : platform.x + platform.width - WIDTH / 2 - 6,
        platform.x + platform.width * (direction > 0 ? .35 : .65),
        clamp(self.x + direction * 260, platform.x + WIDTH / 2 + 5, platform.x + platform.width - WIDTH / 2 - 5),
      ].map(x => ({ x, y: platform.y }))),
  ].filter(target => (target.x - self.x) * direction > 50 && Math.abs(target.x - self.x) < 540 &&
    (target.x - goalX) * direction < 160).sort((a, b) => Math.abs(a.x - self.x) - Math.abs(b.x - self.x)).slice(0, 8);
  for (const target of candidates) for (const velocityY of [-Math.max(560, Math.sqrt(Math.max(0, footY - target.y) * 2 * GRAVITY) + 38), -940]) {
    const discriminant = velocityY * velocityY + 2 * GRAVITY * (target.y - footY);
    if (discriminant < 0) continue;
    const duration = (-velocityY + Math.sqrt(discriminant)) / GRAVITY;
    const velocityX = (target.x - self.x) / duration;
    if (Math.abs(velocityX) > 400) continue;
    const probe = { ...member, velocityX, velocityY, grounded: false };
    let landing: number | null = null;
    for (let tick = 0; tick < 100; tick += 1) {
      probe.velocityY += GRAVITY / 60;
      const next = resolvePlatformMotion(probe, { x: probe.x + velocityX / 60, y: probe.y + probe.velocityY / 60 }, world.platforms, world.floorY);
      Object.assign(probe, next);
      if (next.hitWall || probe.x < 0 || probe.x + WIDTH > world.width || world.hazards.some(hazard => hazard.damagePerSecond >= 8 &&
          isHazardActive(hazard, elapsed + tick / 60) && intersects(probe, hazard))) break;
      if (next.grounded) {
        if ((point(probe).x - self.x) * direction > 70 && Math.abs(probe.y + HEIGHT - target.y) < 2 &&
            Math.abs(point(probe).x - target.x) < 28) landing = point(probe).x;
        break;
      }
    }
    if (landing !== null) return { x: landing, velocityX, velocityY };
  }
  return null;
}

/** Small escort FSM, using the real swept collision solver; no snap-to-player fallback. */
export function stepHuntCompanions(state: HuntInsertionState, input: CompanionStepInput) {
  const strikes: { memberId: ExpeditionMemberId; enemyId: string; damage: number }[] = [];
  const delta = clamp(Number.isFinite(input.delta) ? input.delta : 0, 0, .1);
  for (const [index, member] of state.companions.entries()) {
    if (member.status === 'extracted') continue;
    if (member.status === 'boarding') {
      member.x += (input.world.extraction.x + (index === 0 ? -35 : 35) - WIDTH / 2 - member.x) * Math.min(1, delta * 7);
      member.y = input.world.floorY - HEIGHT - 335 * clamp(input.boardingProgress ?? 0, 0, 1);
      member.grounded = false;
      continue;
    }
    member.attackCooldown = Math.max(0, member.attackCooldown - delta);
    member.attackFlash = Math.max(0, member.attackFlash - delta);
    member.invulnerability = Math.max(0, member.invulnerability - delta);
    const self = point(member), leader = point(input.player);
    const escortX = input.extracting && Math.abs(leader.x - input.world.extraction.x) < 230
      ? input.world.extraction.x + (index === 0 ? -55 : 55)
      : leader.x - input.player.facing * (100 + index * 95);
    const target = member.status !== 'active' ? undefined : input.enemies.filter(enemy => enemy.active && enemy.alive && !enemy.boss &&
      Math.abs(point(enemy).x - leader.x) <= 720 && Math.abs(point(enemy).y - self.y) < 90 &&
      Math.abs(point(enemy).x - self.x) <= (member.order === 'hold' ? 100 : 240) &&
      huntInsertionLineOfSight(self, point(enemy), input.world, input.covers))
      .sort((a, b) => Math.abs(point(a).x - self.x) - Math.abs(point(b).x - self.x))[0];
    const targetX = target ? point(target).x - Math.sign(point(target).x - self.x) * 76 : escortX;
    const canMove = member.status === 'active' && member.order === 'follow';
    const gap = targetX - self.x;
    const moving = canMove && Math.abs(gap) > 16;
    const direction = moving ? Math.sign(gap) : 0;
    const speed = member.health < member.maxHealth * .3 ? 125 : 205;
    const committedVelocityX = member.velocityX;
    member.velocityX = direction * Math.min(speed, Math.abs(gap) * 3);
    if (member.jumpTargetX !== null && !member.grounded) member.velocityX = committedVelocityX;
    else if (member.grounded) member.jumpTargetX = null;
    if (direction) member.facing = direction as -1 | 1;
    member.climbing = false;
    const climb = canMove && Math.abs(leader.y - self.y) > 85
      ? input.world.climbables.filter(zone => zone.x < member.x + WIDTH + 55 && zone.x + zone.width > member.x - 55 &&
        member.y + HEIGHT > zone.y && member.y < zone.y + zone.height)[0] : undefined;
    if (climb && Math.abs(leader.x - self.x) < 320) {
      const climbX = climb.x + climb.width / 2;
      member.velocityX = clamp((climbX - self.x) * 3, -90, 90);
      if (Math.abs(climbX - self.x) < Math.max(32, climb.width / 2)) {
        member.climbing = true; member.velocityY = leader.y < self.y ? -165 : 145;
      }
    }
    if (!member.climbing) {
      const leap = moving && member.grounded ? companionLeap(member, direction, targetX, input.world, input.elapsed) : null;
      if (leap) { member.jumpTargetX = leap.x; member.velocityX = leap.velocityX; member.velocityY = leap.velocityY; }
      else if (moving && member.grounded && leader.y < self.y - 55 && Math.abs(gap) < 240) member.velocityY = -630;
      member.velocityY = Math.min(1_250, member.velocityY + GRAVITY * delta);
    }
    const desiredX = clamp(member.x + member.velocityX * delta, 0, input.world.width - WIDTH);
    const nextBody = { ...member, x: desiredX };
    const dangerous = member.grounded && member.jumpTargetX === null && input.world.hazards.some(hazard => {
      if (hazard.damagePerSecond < 8 || !isHazardActive(hazard, input.elapsed) || !intersects(nextBody, hazard)) return false;
      // Entry avoidance must never pin an already exposed body inside a hazard.
      // A route toward a real exit remains physical and continues taking damage.
      const exiting = intersects(member, hazard) && (direction > 0
        ? desiredX > member.x && targetX >= hazard.x + hazard.width
        : direction < 0 && desiredX < member.x && targetX <= hazard.x);
      return !exiting;
    });
    const collision = resolvePlatformMotion(member, { x: dangerous ? member.x : desiredX, y: member.y + member.velocityY * delta },
      input.world.platforms, input.world.floorY);
    Object.assign(member, { x: collision.x, y: collision.y, velocityX: collision.velocityX, velocityY: collision.velocityY, grounded: collision.grounded });
    if (dangerous) member.velocityX = 0;
    member.blockedSeconds = moving && (collision.hitWall || dangerous) ? Math.min(10, member.blockedSeconds + delta) : 0;
    if (collision.hitWall && member.grounded && member.status === 'active' && member.order === 'follow') {
      const lowWall = input.world.platforms.some(platform => platform.collision === 'solid' &&
        Math.abs((direction > 0 ? member.x + WIDTH : member.x) - (direction > 0 ? platform.x : platform.x + platform.width)) < 2 &&
        member.y + HEIGHT - platform.y > 0 && member.y + HEIGHT - platform.y <= 105);
      if (lowWall) member.velocityY = -650;
    }
    if (member.status === 'active') for (const hazard of input.world.hazards) {
      if (isHazardActive(hazard, input.elapsed) && member.x < hazard.x + hazard.width && member.x + WIDTH > hazard.x &&
          member.y < hazard.y + hazard.height && member.y + HEIGHT > hazard.y) {
        member.health = Math.max(0, member.health - hazard.damagePerSecond * delta);
        if (member.health === 0) { member.status = 'downed'; member.velocityX = 0; member.climbing = false; }
      }
    }
    if (target && member.status === 'active' && member.attackCooldown === 0 &&
        Math.hypot(point(target).x - point(member).x, point(target).y - point(member).y) <= 108 &&
        huntInsertionLineOfSight(point(member), point(target), input.world, input.covers)) {
      member.facing = point(target).x < point(member).x ? -1 : 1;
      member.attackCooldown = member.id === 'karhek' ? 1.55 : 1.8;
      member.attackFlash = .18;
      strikes.push({ memberId: member.id, enemyId: target.id, damage: member.id === 'karhek' ? 9 : 12 });
    }
  }
  return strikes;
}
