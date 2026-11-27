import { MISSIONS } from '../data';
import type { SaveGame } from '../types';
import { normalizeSoloV90Campaign, soloV90MatchesSave } from './campaignSoloV90';
import { soloV70AllowsTriadHuntM017 } from './campaignSoloV70';
import { getChronicleRank } from './clanChronicle';
import { rankTrialsBlockedV147 } from './honorTribunalV147';
import { shipAcquisitionOwnedHullV89 } from './shipAcquisitionV89';

export const QUATZA_MODES = ['triad', 'solo'] as const;
export type QuatzaMode = typeof QUATZA_MODES[number];
export type QuatzaPhase = 'preparation' | 'field' | 'return' | 'delivered' | 'retreated';
export type QuatzaKit = 'care' | 'mobility';
export const QUATZA_INPUT = { left: 1, right: 2, jump: 4, strike: 8, interact: 16, signal: 32 } as const;
export const QUATZA_FLOOR = 405;
export const QUATZA_WIDTH = 1780;
export const QUATZA_TICK_LIMIT = 9000;
export const QUATZA_PLATFORMS = [
  { left: 520, right: 825, y: 305 }, { left: 1070, right: 1260, y: 305 },
  { left: 1150, right: 1390, y: 225 }, { left: 1390, right: 1660, y: 310 },
] as const;
export const QUATZA_POSTS = {
  rack: 145, map: 330, care: 500, mobility: 670, departure: 850,
  refuge: 120, trail: 420, witness: 630,
} as const;
type QuatzaCreatureStage = 'idle' | 'stalk' | 'warning' | 'charge' | 'recover' | 'dead';
interface Body { x: number; y: number; vy: number; facing: -1 | 1 }
interface Companion { id: 'saar' | 'vek'; x: number; health: number; contribution: boolean }
export interface QuatzaFrame {
  tick: number; phase: QuatzaPhase; checked: boolean; route: boolean; kit: QuatzaKit | null;
  player: Body & { health: number; cooldown: number; careSpent: boolean };
  companions: Companion[];
  beast: { x: number; health: number; stage: QuatzaCreatureStage; remaining: number; direction: -1 | 1; hit: boolean; allyHit: 'saar' | 'vek' | null; exposed: boolean };
  trail: boolean; approachCalled: boolean; blockCalled: boolean;
  hide: boolean; skull: boolean; previous: number;
}
export const QUATZA_RESCUE_TICKS = 7200;
const QUATZA_RESCUE_HOLD = 24;
export type QuatzaRescuePhase = 'report' | 'departure' | 'track' | 'treat' | 'carry' | 'return' | 'reunited' | 'interrupted';
export interface QuatzaRescue {
  id: string;
  input: number[];
  phase: QuatzaRescuePhase;
}
export interface QuatzaRescueFrame {
  tick: number;
  phase: QuatzaRescuePhase;
  x: number;
  facing: -1 | 1;
  patient: Companion['id'];
  lastSeenX: number;
  traceX: number;
  careTicks: number;
  previous: number;
}
export interface QuatzaAttempt {
  input: number[];
  phase: QuatzaPhase;
  rescueRules?: 1;
  rescue?: QuatzaRescue;
}
export const QUATZA_RETURN_SUBJECTS = ['companions', 'trophy'] as const;
export type QuatzaReturnSubject = typeof QUATZA_RETURN_SUBJECTS[number];
export interface QuatzaExpedition {
  mode: QuatzaMode;
  attempts: QuatzaAttempt[];
  /** Two different subjects are presented in the order chosen at the witnessed triad return. */
  presentations?: QuatzaReturnSubject[];
}
export interface QuatzaRijCampaign { version: 1; ownerCreatedAt: string; expeditions: Partial<Record<QuatzaMode, QuatzaExpedition>> }
export type QuatzaCommand = { type: 'begin'; mode: QuatzaMode; expectedAttempts: number } |
  { type: 'advance'; mode: QuatzaMode; expectedAttempts: number; expectedTick: number; input: readonly number[] } |
  { type: 'present-return'; mode: 'triad'; expectedAttempts: number; expectedPresentations: number; subject: QuatzaReturnSubject } |
  { type: 'begin-rescue'; mode: 'triad'; expectedAttempts: number } |
  { type: 'advance-rescue'; mode: 'triad'; expectedAttempts: number; id: string; expectedTick: number; input: readonly number[] };
export type QuatzaResponse = { ok: false; message: string } | { ok: true; state: QuatzaRijCampaign; message: string };

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const exact = (value: Record<string, unknown>, keys: readonly string[]) => Object.keys(value).sort().join('|') === [...keys].sort().join('|');
const isoDate = (value: string) => Number.isFinite(Date.parse(value));
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const near = (a: number, b: number, range = 52) => Math.abs(a - b) <= range;
const validInput = (code: unknown): code is number => typeof code === 'number' && Number.isSafeInteger(code) &&
  code >= 0 && code < 64 && (code & 3) !== 3;
const finished = (phase: QuatzaPhase) => phase === 'retreated' || phase === 'delivered';
const returnSubject = (value: unknown): value is QuatzaReturnSubject => QUATZA_RETURN_SUBJECTS.some(subject => subject === value);
const partyAt = (frame: QuatzaFrame, x: number) => frame.companions.every(ally => ally.health > 0 && near(ally.x, x, 158));

export function createQuatzaFrame(mode: QuatzaMode): QuatzaFrame {
  return {
    tick: 0, phase: 'preparation', checked: false, route: false, kit: null,
    player: { x: 76, y: QUATZA_FLOOR, vy: 0, facing: 1, health: 5, cooldown: 0, careSpent: false },
    companions: mode === 'triad' ? [{ id: 'saar', x: 48, health: 3, contribution: false },
      { id: 'vek', x: 34, health: 3, contribution: false }] : [],
    beast: { x: 1130, health: mode === 'solo' ? 8 : 6, stage: 'idle', remaining: 0, direction: -1, hit: false, allyHit: null, exposed: false },
    trail: false, approachCalled: false, blockCalled: false, hide: false, skull: false, previous: 0,
  };
}

function approachPlayer(frame: QuatzaFrame, code: number) {
  const player = frame.player;
  const axis = (code & QUATZA_INPUT.left) ? -1 : (code & QUATZA_INPUT.right) ? 1 : 0;
  player.x = clamp(player.x + axis * 5, 30, frame.phase === 'field' ? QUATZA_WIDTH - 30 : 900);
  if (axis) player.facing = axis;
  if (frame.phase !== 'field') return;
  const platforms = QUATZA_PLATFORMS.filter(p => player.x >= p.left && player.x <= p.right);
  const grounded = player.y === QUATZA_FLOOR || platforms.some(p => p.y === player.y && !player.vy);
  if ((code & QUATZA_INPUT.jump) && !(frame.previous & QUATZA_INPUT.jump) && grounded)
    player.vy = frame.kit === 'mobility' ? -17 : -13.8;
  player.vy += .83;
  const floor = Math.min(QUATZA_FLOOR, ...platforms.filter(p => p.y >= player.y && p.y <= player.y + player.vy).map(p => p.y));
  player.y = Math.min(floor, player.y + player.vy);
  if (player.y === floor) player.vy = 0;
}

function progressCompanions(frame: QuatzaFrame) {
  const { player, beast, companions } = frame;
  const [saar, vek] = companions;
  if (!saar || !vek) return;
  for (const [index, ally] of companions.entries()) {
    if (ally.health <= 0) continue;
    let target = player.x - 44 - 46 * index;
    if (frame.phase === 'field' && beast.stage !== 'dead') {
      if (ally.id === 'saar' && frame.approachCalled && !saar.contribution) target = beast.x + 85;
      if (ally.id === 'vek' && frame.blockCalled && !vek.contribution) target = beast.x - 95;
    }
    const speed = ally.health === 1 ? 4.5 : 6.5;
    ally.x = clamp(ally.x + clamp(target - ally.x, -speed, speed), 30, QUATZA_WIDTH - 30);
  }
  if (frame.phase !== 'field' || beast.stage === 'dead') return;
  if (saar.health > 0 && frame.approachCalled && near(saar.x, beast.x + 85, 16) && near(player.x, beast.x, 400))
    saar.contribution = true;
  if (vek.health > 0 && frame.blockCalled && saar.contribution && near(vek.x, beast.x - 95, 17)) {
    vek.contribution = true;
    if (!beast.exposed) { beast.exposed = true; beast.stage = 'recover'; beast.remaining = 95; }
  }
}

function advanceBeast(frame: QuatzaFrame, strike: boolean) {
  const { beast, player } = frame;
  if (beast.stage === 'dead' || !frame.trail) return;
  const hard = beast.health < (frame.kit ? 5 : 4);
  if (beast.stage === 'idle') {
    if (near(player.x, beast.x, 385)) { beast.stage = 'stalk'; beast.remaining = 34; }
    return;
  }
  if (beast.stage === 'recover' && strike && player.cooldown === 0 &&
      near(player.x, beast.x, 126) && player.y > QUATZA_FLOOR - 44 &&
      frame.companions.every(ally => ally.contribution && ally.health > 0)) {
    player.cooldown = 17;
    beast.health--;
    if (beast.health === 0) { beast.stage = 'dead'; return; }
  }
  if (beast.stage === 'stalk') {
    beast.direction = player.x < beast.x ? -1 : 1;
    if (!near(player.x, beast.x, 154)) beast.x = clamp(beast.x + beast.direction * 3, 765, 1635);
  }
  if (beast.stage === 'charge') {
    beast.x = clamp(beast.x + beast.direction * (hard ? 10 : 8), 765, 1635);
    if (!beast.hit && near(player.x, beast.x, 67) && player.y >= QUATZA_FLOOR - 57) {
      player.health--; beast.hit = true;
    }
    if (!beast.allyHit && near(player.x, beast.x, 158)) {
      const ally = frame.companions.find(member => member.health > 0 && near(member.x, beast.x, 31));
      if (ally) { ally.health--; beast.allyHit = ally.id; }
    }
  }
  beast.remaining--;
  if (beast.remaining > 0) return;
  if (beast.stage === 'stalk') { beast.stage = 'warning'; beast.remaining = hard ? 27 : 38; beast.hit = false; beast.allyHit = null; }
  else if (beast.stage === 'warning') { beast.stage = 'charge'; beast.remaining = hard ? 25 : 20; }
  else if (beast.stage === 'charge') { beast.stage = 'recover'; beast.remaining = hard ? 45 : 54; }
  else { beast.stage = 'stalk'; beast.remaining = hard ? 26 : 34; }
}

/** The browser and the durable validator run the same fixed-tick inputs. */
export function stepQuatza(mode: QuatzaMode, current: QuatzaFrame, code: number): QuatzaFrame {
  if (!validInput(code) || finished(current.phase)) return current;
  const frame: QuatzaFrame = { ...current, tick: current.tick + 1, player: { ...current.player },
    companions: current.companions.map(ally => ({ ...ally })), beast: { ...current.beast } };
  const { player, beast } = frame;
  const pressed = (bit: number) => !!(code & bit) && !(frame.previous & bit);
  approachPlayer(frame, code);
  progressCompanions(frame);
  if (player.cooldown) player.cooldown--;
  if (frame.phase === 'preparation' && pressed(QUATZA_INPUT.interact)) {
    if (!frame.checked && near(player.x, QUATZA_POSTS.rack)) frame.checked = true;
    else if (frame.checked && !frame.route && near(player.x, QUATZA_POSTS.map)) frame.route = true;
    else if (frame.route && mode === 'solo' && !frame.kit) {
      if (near(player.x, QUATZA_POSTS.care)) frame.kit = 'care';
      else if (near(player.x, QUATZA_POSTS.mobility)) frame.kit = 'mobility';
    }
    if (frame.route && (mode === 'triad' || frame.kit) && near(player.x, QUATZA_POSTS.departure) && partyAt(frame, player.x)) {
      frame.phase = 'field'; player.x = 200;
      frame.companions.forEach((ally, index) => { ally.x = 140 - index * 45; });
    }
  } else if (frame.phase === 'field') {
    if (pressed(QUATZA_INPUT.signal) && mode === 'triad' && frame.trail && near(player.x, beast.x, 400)) {
      if (!frame.approachCalled) frame.approachCalled = true;
      else if (frame.companions[0].contribution) frame.blockCalled = true;
    }
    advanceBeast(frame, pressed(QUATZA_INPUT.strike));
    if (player.health < 1 || frame.companions.some(ally => ally.health === 0) || frame.tick >= QUATZA_TICK_LIMIT) frame.phase = 'retreated';
    else if (pressed(QUATZA_INPUT.interact) && player.y >= QUATZA_FLOOR - 20) {
      if (!frame.trail && near(player.x, QUATZA_POSTS.trail)) frame.trail = true;
      else if (beast.stage === 'dead' && near(player.x, beast.x, 105)) {
        if (!frame.hide) frame.hide = true;
        else frame.skull = true;
      } else if (near(player.x, QUATZA_POSTS.refuge)) {
        if (frame.kit === 'care' && !player.careSpent && player.health <= 3 && !frame.skull) {
          player.careSpent = true; player.health = Math.min(5, player.health + 2);
        } else if (frame.hide && frame.skull && partyAt(frame, player.x)) {
          frame.phase = 'return'; player.x = 95;
          frame.companions.forEach((ally, index) => { ally.x = 60 - index * 22; });
        } else frame.phase = 'retreated';
      }
    }
  } else if (frame.phase === 'return' && pressed(QUATZA_INPUT.interact) &&
      near(player.x, QUATZA_POSTS.witness) && partyAt(frame, player.x)) frame.phase = 'delivered';
  if (frame.tick >= QUATZA_TICK_LIMIT && !finished(frame.phase)) frame.phase = 'retreated';
  frame.previous = code;
  return frame;
}

export function replayQuatzaAttempt(mode: QuatzaMode, input: readonly number[]): QuatzaFrame {
  return input.reduce((frame, code) => stepQuatza(mode, frame, code), createQuatzaFrame(mode));
}

export function quatzaMissingCompanion(frame: QuatzaFrame): Companion | undefined {
  if (frame.phase !== 'retreated' || !frame.trail || frame.player.health <= 0) return;
  return frame.companions.find(ally => ally.health === 0);
}

export function createQuatzaRescueFrame(hunt: QuatzaFrame): QuatzaRescueFrame | null {
  const patient = quatzaMissingCompanion(hunt);
  if (!patient) return null;
  return {
    tick: 0, phase: 'report', x: 95, facing: 1, patient: patient.id, lastSeenX: patient.x,
    traceX: Math.max(QUATZA_POSTS.refuge + 70, patient.x - 132), careTicks: 0, previous: 0,
  };
}

export const quatzaRescueFinished = (phase: QuatzaRescuePhase) => phase === 'reunited' || phase === 'interrupted';
const validRescueInput = (code: unknown): code is number => validInput(code) &&
  (code & ~(QUATZA_INPUT.left | QUATZA_INPUT.right | QUATZA_INPUT.interact | QUATZA_INPUT.signal)) === 0;

export function stepQuatzaRescue(current: QuatzaRescueFrame, code: number): QuatzaRescueFrame {
  if (!validRescueInput(code) || quatzaRescueFinished(current.phase)) return current;
  const frame = { ...current, tick: current.tick + 1, previous: code };
  const { phase, lastSeenX, traceX } = frame;
  const right = QUATZA_INPUT.right, left = QUATZA_INPUT.left;
  const interact = !!(code & QUATZA_INPUT.interact);
  const pressed = interact && !(current.previous & QUATZA_INPUT.interact);
  const signaled = !!(code & QUATZA_INPUT.signal) && !(current.previous & QUATZA_INPUT.signal);
  const field = phase === 'track' || phase === 'treat' || phase === 'carry';
  const carrying = phase === 'carry' || phase === 'return';
  const direction = code & left ? -1 : code & right ? 1 : 0;
  if (direction) frame.facing = direction;
  frame.x = clamp(frame.x + direction * (carrying ? 2.75 : 5), 30, field ? QUATZA_WIDTH - 30 : 900);
  if (phase === 'report' && pressed && near(frame.x, QUATZA_POSTS.witness)) frame.phase = 'departure';
  else if (phase === 'departure' && pressed && near(frame.x, QUATZA_POSTS.departure)) {
    frame.phase = 'track'; frame.x = QUATZA_POSTS.refuge;
  } else if (phase === 'track' && signaled && near(frame.x, traceX, 38)) frame.phase = 'treat';
  else if (phase === 'treat') {
    frame.careTicks = !direction && interact && near(frame.x, lastSeenX, 30) ? current.careTicks + 1 : 0;
    if (frame.careTicks >= QUATZA_RESCUE_HOLD) frame.phase = 'carry';
  } else if (phase === 'carry' && pressed && near(frame.x, QUATZA_POSTS.refuge, 34)) {
    frame.phase = 'return'; frame.x = 95;
  } else if (phase === 'return' && pressed && near(frame.x, QUATZA_POSTS.witness, 36)) frame.phase = 'reunited';
  if (frame.tick >= QUATZA_RESCUE_TICKS && !quatzaRescueFinished(frame.phase)) frame.phase = 'interrupted';
  return frame;
}

export function replayQuatzaRescue(hunt: QuatzaFrame, input: readonly number[]): QuatzaRescueFrame | null {
  const origin = createQuatzaRescueFrame(hunt);
  return origin && input.reduce(stepQuatzaRescue, origin);
}

function quatzaRescueId(owner: string, attempt: number) {
  const time = BigInt.asUintN(64, BigInt(Date.parse(owner))).toString(16).padStart(16, '0');
  return time.slice(0, 8) + '-' + time.slice(8, 12) + '-8' + time.slice(12, 15) +
    '-a' + time[15] + attempt.toString(16).padStart(2, '0') + '-717561747a61';
}

export function canRetryQuatza(mode: QuatzaMode, attempt?: QuatzaAttempt) {
  if (!attempt) return true;
  if (attempt.phase !== 'retreated') return false;
  if (attempt.rescue) return quatzaRescueFinished(attempt.rescue.phase);
  return mode !== 'triad' || attempt.rescueRules !== 1 ||
    !quatzaMissingCompanion(replayQuatzaAttempt(mode, attempt.input));
}

export function canEnterQuatza(save: SaveGame, mode: QuatzaMode): boolean {
  if (rankTrialsBlockedV147(save.tribunalV147)) return false;
  const rank = save.prologue ? getChronicleRank(save.prologue.chronicle) : save.profile.rankId;
  if (mode === 'triad') return rank === 'young-blood' && save.youthTraining?.equipment.wristblade === true &&
    normalizeSoloV90Campaign(save.soloV90)?.status === 'completed' && soloV90MatchesSave(save) && soloV70AllowsTriadHuntM017(save);
  return (rank === 'blooded' || rank === 'elite' || rank === 'elder' || rank === 'ancient') &&
    save.inventory.unlockedWeaponIds.includes('wristblades') &&
    MISSIONS.every(mission => save.missionProgress[mission.id]?.status === 'completed') &&
    !!shipAcquisitionOwnedHullV89(save.shipAcquisitionV89, save.createdAt);
}

export function inspectQuatzaRij(value: unknown, owner: string) {
  const invalid = { status: 'invalid-save' as const, state: null };
  if (value == null) return { status: 'absent' as const, state: null };
  if (record(value) && typeof value.version === 'number' && value.version > 1)
    return { status: 'future-version' as const, state: null };
  if (!record(value) || !exact(value, ['version', 'ownerCreatedAt', 'expeditions']) ||
      value.version !== 1 || !isoDate(owner) || value.ownerCreatedAt !== owner || !record(value.expeditions) ||
      Object.keys(value.expeditions).some(key => !QUATZA_MODES.some(mode => mode === key))) return invalid;
  for (const mode of QUATZA_MODES) {
    if (!Object.hasOwn(value.expeditions, mode)) continue;
    const expedition = value.expeditions[mode];
    if (!record(expedition) || expedition.mode !== mode ||
        !Array.isArray(expedition.attempts) || !expedition.attempts.length || expedition.attempts.length > 16) return invalid;
    const hasPresentations = Object.hasOwn(expedition, 'presentations');
    if (!exact(expedition, hasPresentations ? ['mode', 'attempts', 'presentations'] : ['mode', 'attempts'])) return invalid;
    if (hasPresentations && (mode !== 'triad' || !Array.isArray(expedition.presentations) ||
        expedition.presentations.length < 1 || expedition.presentations.length > QUATZA_RETURN_SUBJECTS.length ||
        !Array.from(expedition.presentations).every(returnSubject) ||
        new Set(expedition.presentations).size !== expedition.presentations.length)) return invalid;
    for (const [index, attempt] of expedition.attempts.entries()) {
      if (!record(attempt) || !Array.isArray(attempt.input) ||
          attempt.input.length > QUATZA_TICK_LIMIT || !Array.from(attempt.input).every(validInput)) return invalid;
      const fields = ['input', 'phase'];
      if (Object.hasOwn(attempt, 'rescueRules')) {
        if (mode !== 'triad' || attempt.rescueRules !== 1) return invalid;
        fields.push('rescueRules');
      }
      if (Object.hasOwn(attempt, 'rescue')) fields.push('rescue');
      if (!exact(attempt, fields)) return invalid;
      const replay = replayQuatzaAttempt(mode, attempt.input);
      if (Object.hasOwn(attempt, 'rescue')) {
        const rescue = attempt.rescue;
        if (mode !== 'triad' || !record(rescue) || !exact(rescue, ['id', 'input', 'phase']) ||
            rescue.id !== quatzaRescueId(owner, index + 1) || !Array.isArray(rescue.input) ||
            rescue.input.length > QUATZA_RESCUE_TICKS || !Array.from(rescue.input).every(validRescueInput)) return invalid;
        const recovered = replayQuatzaRescue(replay, rescue.input);
        if (!recovered || recovered.phase !== rescue.phase || recovered.tick !== rescue.input.length ||
            index < expedition.attempts.length - 1 && !quatzaRescueFinished(recovered.phase)) return invalid;
      } else if (attempt.rescueRules === 1 && index < expedition.attempts.length - 1 && quatzaMissingCompanion(replay)) {
        return invalid;
      }
      if (replay.tick !== attempt.input.length || replay.phase !== attempt.phase ||
          index < expedition.attempts.length - 1 && replay.phase !== 'retreated') return invalid;
      if (hasPresentations && index === expedition.attempts.length - 1 && replay.phase !== 'delivered') return invalid;
    }
  }
  return { status: 'valid' as const, state: structuredClone(value) as unknown as QuatzaRijCampaign };
}

export function quatzaCampaignMatchesSave(save: SaveGame): boolean {
  const inspected = inspectQuatzaRij(save.quatzaRij, save.createdAt);
  if (inspected.status === 'absent') return true;
  if (!inspected.state) return false;
  const { triad, solo } = inspected.state.expeditions;
  return (!triad || normalizeSoloV90Campaign(save.soloV90)?.status === 'completed' && soloV70AllowsTriadHuntM017(save)) &&
    (!solo || MISSIONS.every(mission => save.missionProgress?.[mission.id]?.status === 'completed') &&
      !!shipAcquisitionOwnedHullV89(save.shipAcquisitionV89, save.createdAt));
}

export function hasQuatzaReturn(raw: unknown, owner: string, mode: QuatzaMode): boolean {
  return inspectQuatzaRij(raw, owner).state?.expeditions[mode]?.attempts.at(-1)?.phase === 'delivered';
}

/** Verify the one durable command that extends an already validated ledger. */
export function isQuatzaRijSuccessor(before: QuatzaRijCampaign | null | undefined, next: QuatzaRijCampaign | null | undefined): boolean {
  if (!next || before && before.ownerCreatedAt !== next.ownerCreatedAt) return false;
  const changed = QUATZA_MODES.filter(mode =>
    JSON.stringify(before?.expeditions[mode]) !== JSON.stringify(next.expeditions[mode]));
  if (changed.length !== 1) return false;
  const [mode] = changed;
  const oldExpedition = before?.expeditions[mode], expedition = next.expeditions[mode];
  if (!expedition) return false;
  const oldAttempts = oldExpedition?.attempts ?? [];
  const { attempts } = expedition;
  const oldPresentations = oldExpedition?.presentations ?? [], presentations = expedition.presentations ?? [];
  if (JSON.stringify(oldPresentations) !== JSON.stringify(presentations)) {
    const subject = presentations.at(-1);
    return mode === 'triad' && oldAttempts.at(-1)?.phase === 'delivered' && !!subject && returnSubject(subject) &&
      presentations.length === oldPresentations.length + 1 && !oldPresentations.includes(subject) &&
      oldPresentations.every((value, index) => value === presentations[index]) &&
      JSON.stringify(oldAttempts) === JSON.stringify(attempts);
  }
  const previous = oldAttempts.at(-1);
  const current = attempts.at(-1);
  if (!current) return false;
  if (attempts.length === oldAttempts.length + 1) {
    return canRetryQuatza(mode, previous) && current.input.length === 0 && current.phase === 'preparation' &&
      current.rescueRules === (mode === 'triad' ? 1 : undefined) && !current.rescue &&
      JSON.stringify(attempts.slice(0, -1)) === JSON.stringify(oldAttempts);
  }
  if (!previous || attempts.length !== oldAttempts.length ||
      JSON.stringify(attempts.slice(0, -1)) !== JSON.stringify(oldAttempts.slice(0, -1)) ||
      previous.rescueRules !== current.rescueRules) return false;
  if (current.rescue) {
    const prior = previous.rescue;
    const nextRescue = current.rescue;
    if (mode !== 'triad' || previous.phase !== 'retreated' || current.phase !== previous.phase ||
        JSON.stringify(current.input) !== JSON.stringify(previous.input) ||
        nextRescue.id !== quatzaRescueId(next.ownerCreatedAt, attempts.length)) return false;
    if (!prior) return nextRescue.phase === 'report' && nextRescue.input.length === 0 &&
      !!quatzaMissingCompanion(replayQuatzaAttempt(mode, previous.input));
    return prior.id === nextRescue.id && !quatzaRescueFinished(prior.phase) &&
      nextRescue.input.length > prior.input.length && nextRescue.input.length <= prior.input.length + 180 &&
      prior.input.every((input, index) => nextRescue.input[index] === input);
  }
  return !previous.rescue && !finished(previous.phase) && current.input.length > previous.input.length &&
    current.input.length <= previous.input.length + 180 &&
    previous.input.every((input, index) => current.input[index] === input);
}

export function commitQuatzaRij(save: SaveGame, command: QuatzaCommand): QuatzaResponse {
  const refuse = (message: string): QuatzaResponse => ({ ok: false, message });
  if (!QUATZA_MODES.includes(command.mode) || !canEnterQuatza(save, command.mode)) return refuse('Les conditions de cette chasse ne sont pas réunies.');
  const checked = inspectQuatzaRij(save.quatzaRij, save.createdAt);
  if (checked.status === 'invalid-save' || checked.status === 'future-version') return refuse('Le registre du Quatza-Rij ne peut pas être relu.');
  const state: QuatzaRijCampaign = checked.state ?? { version: 1, ownerCreatedAt: save.createdAt, expeditions: {} };
  const expedition: QuatzaExpedition = state.expeditions[command.mode] ?? { mode: command.mode, attempts: [] };
  const current = expedition.attempts.at(-1);
  if (command.type === 'begin' && expedition.attempts.length === command.expectedAttempts + 1 && current?.input.length === 0)
    return { ok: true, state, message: 'Préparation déjà enregistrée.' };
  if (expedition.attempts.length !== command.expectedAttempts) return refuse('La tentative vient de changer.');
  if (command.type === 'present-return') {
    if (expedition.mode !== 'triad' || current?.phase !== 'delivered' || !returnSubject(command.subject))
      return refuse('Rejoins les témoins avec la triade et les deux pièces avant la présentation.');
    const presented = expedition.presentations ?? [];
    if (presented.length !== command.expectedPresentations || presented.includes(command.subject))
      return refuse('La présentation vient de changer. Relis ce que les témoins ont entendu.');
    expedition.presentations = [...presented, command.subject];
    return { ok: true, state, message: command.subject === 'companions'
      ? 'Les témoins ont entendu le retour de Saar et Vek.'
      : 'Les témoins ont examiné la peau et le crâne rapportés.' };
  }
  if (command.type === 'begin-rescue' || command.type === 'advance-rescue') {
    if (expedition.mode !== 'triad' || !current || current.phase !== 'retreated')
      return refuse('Aucune absence ne permet d’ouvrir un secours.');
    const hunt = replayQuatzaAttempt('triad', current.input);
    const origin = createQuatzaRescueFrame(hunt);
    if (!origin) return refuse('Aucune absence ne permet d’ouvrir un secours.');
    const id = quatzaRescueId(save.createdAt, expedition.attempts.length);
    if (command.type === 'begin-rescue') {
      if (current.rescue) return refuse('Le secours est déjà consigné.');
      current.rescue = { id, input: [], phase: 'report' };
      return { ok: true, state, message: 'Rapporte l’absence au témoin avant le départ.' };
    }
    const rescue = current.rescue;
    if (!rescue || id !== command.id || !Number.isSafeInteger(command.expectedTick) || command.expectedTick < 0 ||
        !Array.isArray(command.input) || !command.input.length || command.input.length > 180 ||
        !Array.from(command.input).every(validRescueInput)) return refuse('Le secours vient de changer. Relis sa dernière position.');
    if (command.expectedTick + command.input.length === rescue.input.length &&
        command.input.every((code, index) => rescue.input[command.expectedTick + index] === code))
      return { ok: true, state, message: 'Progression du secours déjà enregistrée.' };
    if (quatzaRescueFinished(rescue.phase) || command.expectedTick !== rescue.input.length ||
        rescue.input.length + command.input.length > QUATZA_RESCUE_TICKS)
      return refuse('Le secours vient de changer. Relis sa dernière position.');
    const input = [...rescue.input, ...command.input];
    const next = replayQuatzaRescue(hunt, input);
    if (!next || next.tick !== input.length) return refuse('La séquence dépasse la fin du secours.');
    current.rescue = { id, input, phase: next.phase };
    return { ok: true, state, message: next.phase === 'reunited'
      ? 'Le témoin a vu revenir le chasseur secouru.' : 'Progression du secours enregistrée.' };
  }
  if (command.type === 'begin') {
    if (!canRetryQuatza(command.mode, current)) return refuse('Termine la tentative ou le secours ouvert avant de repartir.');
    if (expedition.attempts.length >= 16) return refuse('Le registre a atteint sa capacité de tentatives.');
    expedition.attempts.push({ input: [], phase: 'preparation', ...(command.mode === 'triad' ? { rescueRules: 1 } : {}) });
    state.expeditions[command.mode] = expedition;
    return { ok: true, state, message: 'Préparation ouverte au râtelier.' };
  }
  if (!current || !Array.isArray(command.input) || !command.input.length || command.input.length > 180 ||
      !command.input.every(validInput) || !Number.isSafeInteger(command.expectedTick) || command.expectedTick < 0)
    return refuse('La séquence ne suit plus le terrain enregistré.');
  if (command.expectedTick + command.input.length === current.input.length &&
      command.input.every((input, index) => current.input[command.expectedTick + index] === input))
    return { ok: true, state, message: 'Séquence déjà enregistrée.' };
  if (finished(current.phase) || current.input.length !== command.expectedTick ||
      current.input.length + command.input.length > QUATZA_TICK_LIMIT) return refuse('La séquence ne suit plus le terrain enregistré.');
  const input = [...current.input, ...command.input];
  const resulting = replayQuatzaAttempt(command.mode, input);
  if (resulting.tick !== input.length) return refuse('La séquence dépasse la fin de la chasse.');
  current.input = input; current.phase = resulting.phase;
  return { ok: true, state, message: resulting.phase === 'delivered'
    ? command.mode === 'triad' ? 'Triade, peau et crâne réunis chez les témoins.' : 'Peau et crâne présentés aux témoins.' :
    resulting.phase === 'retreated' ? 'Repli consigné. La peau et le crâne restent sur le terrain.' : 'Terrain enregistré.' };
}
