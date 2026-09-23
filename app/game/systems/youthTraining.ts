/** Deterministic Unblooded training. Original playable adaptation; no rank, XP or adult equipment grant. */
export const YOUTH_ARENA = { width: 960, height: 540, left: 70, right: 890, groundY: 430, actorHeight: 112, halfWidth: 20, gravity: .55, speed: 3.7 } as const;
export const YOUTH_TIMING = { tickRate: 60, courseLimitTicks: 2100, restTicks: 180, practiceWindupTicks: 32 } as const;
export const YOUTH_PHASES = ['dojo-move', 'dojo-jump', 'dojo-dodge', 'dojo-strike', 'dojo-throw', 'blade-award', 'armory', 'camp-run', 'camp-duel', 'camp-defeat', 'barracks', 'rest', 'morning'] as const;
export type YouthPhase = typeof YOUTH_PHASES[number];
export type YouthAction = 'idle' | 'jab' | 'blade' | 'throw' | 'dodge' | 'hurt' | 'thrown' | 'ko';
export type YouthCosmetic = 'ochre' | 'ash' | 'rust';
export interface YouthActor {
    x: number;
    y: number;
    vx: number;
    vy: number;
    facing: -1 | 1;
    action: YouthAction;
    actionTick: number;
    actionHitResolved: boolean;
    composure: number;
}
export interface YouthInput {
    move?: -1 | 0 | 1;
    jump?: boolean;
    light?: boolean;
    blade?: boolean;
    dodge?: boolean;
    throw?: boolean;
    interact?: boolean;
    confirm?: boolean;
    retry?: boolean;
    choice?: YouthCosmetic;
}
type Buttons = Required<Omit<YouthInput, 'move' | 'choice'>>;
export interface YouthEnvironment {
    assetsReady: boolean;
    pageVisible: boolean;
    paused: boolean;
}
export const YOUTH_MILESTONES = ['youth-dojo-completed', 'youth-first-blade', 'youth-first-biomask', 'youth-camp-run', 'youth-camp-duel', 'youth-first-rest'] as const;
export type YouthMilestone = typeof YOUTH_MILESTONES[number];
export interface YouthReceipt {
    id: YouthMilestone;
    sourceId: 'youth.training.v48';
    sceneId: 'unblooded-training';
    tick: number;
}
export interface YouthState {
    version: 1;
    phase: YouthPhase;
    tick: number;
    phaseTick: number;
    phaseStartedAt: number;
    inputArmed: boolean;
    previousButtons: Buttons;
    player: YouthActor;
    rival: YouthActor;
    rivalDecisionTicks: number;
    practiceThreatened: boolean;
    jumpCleared: boolean;
    cosmetic: YouthCosmetic | null;
    milestones: Partial<Record<YouthMilestone, number>>;
    progress: {
        moveMarkers: number;
        jumps: number;
        dodges: number;
        strikes: number;
        throws: number;
        courseMarkers: number;
        courseElapsed: number;
        courseAttempts: number;
        duelAttempts: number;
    };
}
export type YouthEvent = {
    type: 'phase';
    phase: YouthPhase;
} | {
    type: 'action';
    actor: 'player' | 'rival';
    action: YouthAction;
} | {
    type: 'hit';
    actor: 'player' | 'rival';
    action: 'jab' | 'blade' | 'throw';
    amount: number;
} | {
    type: 'milestone';
    id: YouthMilestone;
} | {
    type: 'course-retry';
} | {
    type: 'dodge-success';
};
export interface YouthStep {
    state: YouthState;
    events: YouthEvent[];
    receipts: YouthReceipt[];
}
export interface YouthObstacle {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface YouthObjective {
    id: YouthPhase;
    title: string;
    instruction: string;
    targetX: number | null;
    counter: number;
    required: number;
    timerTicks: number | null;
}
const buttonIds = ['jump', 'light', 'blade', 'dodge', 'throw', 'interact', 'confirm', 'retry'] as const;
const noButtons = (): Buttons => ({ jump: false, light: false, blade: false, dodge: false, throw: false, interact: false, confirm: false, retry: false });
const actor = (x: number, facing: -1 | 1 = 1): YouthActor => ({ x, y: YOUTH_ARENA.groundY, vx: 0, vy: 0, facing, action: 'idle', actionTick: 0, actionHitResolved: false, composure: 100 });
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const direction = (n: number): -1 | 1 => n < 0 ? -1 : 1;
const grounded = (a: YouthActor) => a.vy === 0;
const canAct = (a: YouthActor) => a.action === 'idle' && grounded(a) && a.composure > 0;
const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const integer = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max;
const finite = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const clone = (s: YouthState): YouthState => ({ ...s, previousButtons: { ...s.previousButtons }, player: { ...s.player }, rival: { ...s.rival }, milestones: { ...s.milestones }, progress: { ...s.progress } });
export function createYouthTraining(): YouthState { return { version: 1, phase: 'dojo-move', tick: 0, phaseTick: 0, phaseStartedAt: 0, inputArmed: false, previousButtons: noButtons(), player: actor(200), rival: actor(650, -1), rivalDecisionTicks: 60, practiceThreatened: false, jumpCleared: false, cosmetic: null, milestones: {}, progress: { moveMarkers: 0, jumps: 0, dodges: 0, strikes: 0, throws: 0, courseMarkers: 0, courseElapsed: 0, courseAttempts: 1, duelAttempts: 1 } }; }
export function getYouthObstacles(s: Pick<YouthState, 'phase'>): YouthObstacle[] { return s.phase === 'dojo-jump' ? [{ x: 440, y: 380, width: 90, height: 50 }] : s.phase === 'camp-run' ? [{ x: 350, y: 375, width: 70, height: 55 }, { x: 650, y: 350, width: 70, height: 80 }] : []; }
export function getYouthReceipts(s: YouthState): YouthReceipt[] { return YOUTH_MILESTONES.flatMap(id => s.milestones[id] === undefined ? [] : [{ id, sourceId: 'youth.training.v48' as const, sceneId: 'unblooded-training' as const, tick: s.milestones[id]! }]); }
export function normalizeYouthReceipt(v: unknown, s: YouthState): YouthReceipt | null { if (!record(v) || v.sourceId !== 'youth.training.v48' || v.sceneId !== 'unblooded-training' || !YOUTH_MILESTONES.includes(v.id as YouthMilestone))
    return null; const id = v.id as YouthMilestone; return integer(v.tick, 1, s.tick) && s.milestones[id] !== undefined && v.tick === s.milestones[id] ? { id, sourceId: 'youth.training.v48', sceneId: 'unblooded-training', tick: v.tick as number } : null; }
function award(s: YouthState, id: YouthMilestone, out: YouthStep) { if (s.milestones[id] !== undefined)
    return; s.milestones[id] = s.tick; out.receipts.push({ id, sourceId: 'youth.training.v48', sceneId: 'unblooded-training', tick: s.tick }); out.events.push({ type: 'milestone', id }); }
function transition(s: YouthState, phase: YouthPhase, events: YouthEvent[]) { s.phase = phase; s.phaseTick = 0; s.phaseStartedAt = s.tick; s.inputArmed = false; s.previousButtons = noButtons(); s.player.vx = 0; s.rival.vx = 0; s.practiceThreatened = false; s.rivalDecisionTicks = 60; events.push({ type: 'phase', phase }); if (['dojo-jump', 'dojo-dodge', 'dojo-strike', 'dojo-throw', 'blade-award', 'armory', 'camp-run', 'camp-duel', 'barracks'].includes(phase)) {
    s.player = actor(phase === 'camp-run' ? 140 : phase === 'dojo-dodge' ? 400 : phase === 'dojo-strike' || phase === 'dojo-throw' ? 460 : 200);
    s.rival = actor(phase === 'camp-duel' ? 720 : 650, -1);
    if (phase === 'camp-duel')
        s.rival.composure = 84;
} }
const MOVES = { jab: { startup: 8, duration: 26, reach: 67, damage: 16 }, blade: { startup: 12, duration: 33, reach: 76, damage: 20 }, throw: { startup: 14, duration: 42, reach: 52, damage: 26 }, dodge: { startup: 0, duration: 23, reach: 0, damage: 0 } } as const;
function begin(a: YouthActor, action: keyof typeof MOVES, move: -1 | 0 | 1, id: 'player' | 'rival', events: YouthEvent[]) { if (!canAct(a))
    return; a.action = action; a.actionTick = 0; a.actionHitResolved = false; a.vx = action === 'dodge' ? (move || -a.facing) * 5.2 : 0; events.push({ type: 'action', actor: id, action }); }
function advanceActor(a: YouthActor, obstacles: YouthObstacle[], isRival: boolean, phase: YouthPhase) {
    if (a.action !== 'idle')
        a.actionTick++;
    const duration = a.action === 'dodge' && !isRival && phase === 'dojo-dodge' ? 30 : a.action === 'jab' && isRival && (phase === 'dojo-dodge' || phase === 'camp-duel') ? 50 : a.action in MOVES ? MOVES[a.action as keyof typeof MOVES].duration : null;
    if (duration !== null && a.actionTick >= duration) {
        a.action = 'idle';
        a.actionTick = 0;
        a.vx = 0;
    }
    if ((a.action === 'hurt' && a.actionTick >= 18 || a.action === 'thrown' && a.actionTick >= 32) && grounded(a)) {
        a.action = 'idle';
        a.actionTick = 0;
        a.vx = 0;
    }
    const oldX = a.x, oldY = a.y;
    a.x = clamp(a.x + a.vx, YOUTH_ARENA.left, YOUTH_ARENA.right);
    // Resolve solid side walls before gravity; stepping off a platform starts falling.
    for (const o of obstacles) {
        if (a.y > o.y + .01 && a.y - YOUTH_ARENA.actorHeight < o.y + o.height && a.x + 20 > o.x && a.x - 20 < o.x + o.width) {
            if (oldX <= o.x - 20)
                a.x = o.x - 20;
            else if (oldX >= o.x + o.width + 20)
                a.x = o.x + o.width + 20;
        }
    }
    a.vy = Math.min(16, a.vy + YOUTH_ARENA.gravity);
    a.y = Math.min(YOUTH_ARENA.groundY, a.y + a.vy);
    let floor = YOUTH_ARENA.groundY as number;
    for (const o of obstacles) {
        if (a.x + 18 > o.x && a.x - 18 < o.x + o.width && oldY <= o.y + .01 && a.y >= o.y && a.vy >= 0)
            floor = Math.min(floor, o.y);
    }
    if (a.y >= floor) {
        a.y = floor;
        a.vy = 0;
    }
    if (a.action === 'hurt' || a.action === 'thrown' || a.action === 'ko')
        a.vx *= grounded(a) ? .76 : .985;
    if (Math.abs(a.vx) < .01)
        a.vx = 0;
}
function attackConnects(a: YouthActor, b: YouthActor, reach: number) { return grounded(a) && Math.abs(a.y - b.y) < 34 && Math.abs(a.x - b.x) <= reach && direction(b.x - a.x) === a.facing; }
function playerStrike(s: YouthState, out: YouthStep) {
    const a = s.player, b = s.rival;
    if (a.action !== 'jab' && a.action !== 'blade' && a.action !== 'throw')
        return;
    const m = MOVES[a.action];
    if (a.actionHitResolved || a.actionTick !== m.startup)
        return;
    a.actionHitResolved = true;
    if (!attackConnects(a, b, m.reach) || b.action === 'hurt' || b.action === 'thrown' || b.action === 'ko')
        return;
    const valid = s.phase === 'dojo-strike' && a.action === 'jab' || s.phase === 'dojo-throw' && a.action === 'throw' || s.phase === 'camp-duel';
    if (!valid)
        return;
    const move = a.action;
    if (s.phase === 'dojo-strike')
        s.progress.strikes++;
    if (s.phase === 'dojo-throw')
        s.progress.throws = 1;
    b.composure = s.phase === 'camp-duel' ? Math.max(0, b.composure - m.damage) : 100;
    b.action = b.composure === 0 ? 'ko' : move === 'throw' ? 'thrown' : 'hurt';
    b.actionTick = 0;
    b.actionHitResolved = false;
    b.vx = direction(b.x - a.x) * (move === 'throw' ? 7.8 : 1.8);
    b.vy = move === 'throw' ? -9 : -1.6;
    out.events.push({ type: 'hit', actor: 'player', action: move, amount: s.phase === 'camp-duel' ? m.damage : 0 });
}
function rivalStrike(s: YouthState, out: YouthStep) {
    const a = s.rival, b = s.player;
    if (a.action !== 'jab' || a.actionHitResolved || a.actionTick !== 32)
        return;
    a.actionHitResolved = true;
    const dodge = b.action === 'dodge' && b.actionTick >= 2 && b.actionTick <= (s.phase === 'dojo-dodge' ? 26 : 17);
    if (s.phase === 'dojo-dodge') {
        if (s.practiceThreatened && dodge) {
            s.progress.dodges = 1;
            out.events.push({ type: 'dodge-success' });
        }
        else if (attackConnects(a, b, 75)) {
            b.action = 'hurt';
            b.actionTick = 0;
            b.vx = -b.facing * 2;
            b.vy = -1.2;
            out.events.push({ type: 'hit', actor: 'rival', action: 'jab', amount: 0 });
        }
        return;
    }
    if (s.phase !== 'camp-duel' || dodge || b.action === 'hurt' || b.action === 'thrown' || !attackConnects(a, b, 75))
        return;
    b.composure = Math.max(0, b.composure - 12);
    b.action = b.composure === 0 ? 'ko' : 'hurt';
    b.actionTick = 0;
    b.vx = direction(b.x - a.x) * 3;
    b.vy = -1.7;
    out.events.push({ type: 'hit', actor: 'rival', action: 'jab', amount: 12 });
}
function chooseRival(s: YouthState, events: YouthEvent[]) { if (s.phase !== 'dojo-dodge' && s.phase !== 'camp-duel')
    return; const a = s.rival, b = s.player; s.rivalDecisionTicks = Math.max(0, s.rivalDecisionTicks - 1); if (!canAct(a))
    return; a.facing = direction(b.x - a.x); const dist = Math.abs(a.x - b.x); a.vx = s.phase === 'camp-duel' && dist > 65 ? a.facing * 1.55 : 0; if (dist <= 75 && s.rivalDecisionTicks === 0) {
    begin(a, 'jab', 0, 'rival', events);
    s.rivalDecisionTicks = 78;
    s.practiceThreatened = false;
} }
function separate(s: YouthState) { if (!['dojo-dodge', 'dojo-strike', 'dojo-throw', 'camp-duel'].includes(s.phase) || Math.abs(s.player.y - s.rival.y) > 50 || s.rival.action === 'thrown' || s.rival.action === 'ko')
    return; const diff = s.rival.x - s.player.x; if (Math.abs(diff) < 40) {
    const push = (40 - Math.abs(diff)) / 2, d = direction(diff);
    s.player.x = clamp(s.player.x - d * push, 70, 890);
    s.rival.x = clamp(s.rival.x + d * push, 70, 890);
        if (Math.abs(s.rival.x - s.player.x) < 40) {
            if (s.player.x === 70 || s.player.x === 890) s.rival.x = s.player.x + d * 40;
            else s.player.x = s.rival.x - d * 40;
        }
} }
/** Advance exactly one active simulation tick. Blocked/held-resume input never advances clocks or CPU. */
export function stepYouthTraining(previous: YouthState, input: YouthInput = {}, env: YouthEnvironment): YouthStep {
    const s = clone(previous), out: YouthStep = { state: s, events: [], receipts: [] };
    const buttons = noButtons();
    for (const k of buttonIds)
        buttons[k] = input[k] === true;
    const move = input.move === -1 ? -1 : input.move === 1 ? 1 : 0;
    if (!env.assetsReady || !env.pageVisible || env.paused) {
        s.inputArmed = false;
        s.previousButtons = noButtons();
        return out;
    }
    if (!s.inputArmed) {
        if (move === 0 && !buttonIds.some(k => buttons[k])) {
            s.inputArmed = true;
            s.previousButtons = noButtons();
        }
        return out;
    }
    const pressed = noButtons();
    for (const k of buttonIds)
        pressed[k] = buttons[k] && !s.previousButtons[k];
    s.previousButtons = buttons;
    if (s.phase === 'morning')
        return out;
    s.tick++;
    s.phaseTick++;
    if (s.phase === 'camp-defeat') {
        if (pressed.retry || pressed.confirm) {
            s.progress.duelAttempts++;
            transition(s, 'camp-duel', out.events);
        }
        return out;
    }
    if (s.phase === 'rest') {
        if (s.phaseTick >= YOUTH_TIMING.restTicks) {
            award(s, 'youth-first-rest', out);
            transition(s, 'morning', out.events);
        }
        return out;
    }
    if (s.phase === 'armory' && ['ochre', 'ash', 'rust'].includes(input.choice ?? ''))
        s.cosmetic = input.choice!;
    const a = s.player;
    if (canAct(a)) {
        a.vx = move * YOUTH_ARENA.speed;
        if (move)
            a.facing = move;
        if (pressed.dodge) {
            // A timed dodge must begin inside the announced strike's real reach.
            // Running away first and dodging harmless air never passes the lesson.
            if (s.phase === 'dojo-dodge') s.practiceThreatened = s.rival.action === 'jab' && !s.rival.actionHitResolved && attackConnects(s.rival, a, 75);
            begin(a, 'dodge', move, 'player', out.events);
        }
        else if (pressed.throw)
            begin(a, 'throw', move, 'player', out.events);
        else if (pressed.blade && s.milestones['youth-first-blade'] !== undefined)
            begin(a, 'blade', move, 'player', out.events);
        else if (pressed.light)
            begin(a, 'jab', move, 'player', out.events);
        else if (pressed.jump) {
            a.vy = -11.7;
            out.events.push({ type: 'action', actor: 'player', action: 'idle' });
        }
    }
    else if (a.action === 'idle' && !grounded(a)) {
        a.vx = move * YOUTH_ARENA.speed;
        if (move)
            a.facing = move;
    }
    chooseRival(s, out.events);
    const obstacles = getYouthObstacles(s);
    advanceActor(a, obstacles, false, s.phase);
    advanceActor(s.rival, [], true, s.phase);
    separate(s);
    playerStrike(s, out);
    rivalStrike(s, out);
    switch (s.phase) {
        case 'dojo-move': {
            const target = s.progress.moveMarkers === 0 ? 700 : 240;
            if (Math.abs(a.x - target) <= 25 && grounded(a)) {
                s.progress.moveMarkers++;
                if (s.progress.moveMarkers === 2)
                    transition(s, 'dojo-jump', out.events);
            }
            break;
        }
        case 'dojo-jump':
            if (a.x > 530 && a.y <= 380)
                s.jumpCleared = true;
            if (s.jumpCleared && a.x >= 660 && a.y === 430) {
                s.progress.jumps = 1;
                transition(s, 'dojo-dodge', out.events);
            }
            break;
        case 'dojo-dodge':
            if (s.progress.dodges === 1)
                transition(s, 'dojo-strike', out.events);
            break;
        case 'dojo-strike':
            if (s.progress.strikes >= 3)
                transition(s, 'dojo-throw', out.events);
            break;
        case 'dojo-throw':
            if (s.progress.throws === 1 && s.rival.action === 'idle' && s.rival.y === 430) {
                award(s, 'youth-dojo-completed', out);
                transition(s, 'blade-award', out.events);
            }
            break;
        case 'blade-award':
            if (pressed.interact && Math.abs(a.x - 680) <= 48 && grounded(a)) {
                award(s, 'youth-first-blade', out);
                transition(s, 'armory', out.events);
            }
            break;
        case 'armory':
            if (pressed.interact && s.cosmetic && Math.abs(a.x - 680) <= 48 && grounded(a)) {
                award(s, 'youth-first-biomask', out);
                transition(s, 'camp-run', out.events);
            }
            break;
        case 'camp-run': {
            s.progress.courseElapsed++;
            const target = s.progress.courseMarkers % 2 === 0 ? 830 : 140;
            if (Math.abs(a.x - target) <= 24 && a.y === 430) {
                s.progress.courseMarkers++;
                if (s.progress.courseMarkers === 3) {
                    award(s, 'youth-camp-run', out);
                    transition(s, 'camp-duel', out.events);
                    break;
                }
            }
            if (s.progress.courseElapsed >= YOUTH_TIMING.courseLimitTicks) {
                s.progress.courseAttempts++;
                s.progress.courseMarkers = 0;
                s.progress.courseElapsed = 0;
                transition(s, 'camp-run', out.events);
                out.events.push({ type: 'course-retry' });
            }
            break;
        }
        case 'camp-duel':
            if (a.composure === 0)
                transition(s, 'camp-defeat', out.events);
            else if (s.rival.composure === 0 && s.rival.y === 430 && s.rival.actionTick >= 60) {
                award(s, 'youth-camp-duel', out);
                transition(s, 'barracks', out.events);
            }
            break;
        case 'barracks':
            if (pressed.interact && Math.abs(a.x - 680) <= 48 && grounded(a))
                transition(s, 'rest', out.events);
            break;
    }
    return out;
}
export function getYouthObjective(s: YouthState): YouthObjective {
    const base = { id: s.phase, counter: 0, required: 1, timerTicks: null as number | null };
    switch (s.phase) {
        case 'dojo-move': return { ...base, title: 'Écouter le maître — déplacement', instruction: 'Rejoins les deux balises au sol, dans l’ordre.', targetX: s.progress.moveMarkers === 0 ? 700 : 240, counter: s.progress.moveMarkers, required: 2 };
        case 'dojo-jump': return { ...base, title: 'Franchir l’obstacle', instruction: 'Saute par-dessus la traverse puis rejoins la balise.', targetX: 680 };
        case 'dojo-dodge': return { ...base, title: 'Lire une attaque', instruction: 'Approche le maître. Attends son geste annoncé puis esquive au moment du coup.', targetX: 590 };
        case 'dojo-strike': return { ...base, title: 'Trois frappes maîtrisées', instruction: 'Approche la cible, tourne-toi vers elle et porte trois coups distincts.', targetX: s.rival.x, counter: s.progress.strikes, required: 3 };
        case 'dojo-throw': return { ...base, title: 'Une projection contrôlée', instruction: 'Approche le mannequin, projette-le et attends son retour au sol.', targetX: s.rival.x };
        case 'blade-award': return { ...base, title: 'Première lame de poignet', instruction: 'Rejoins le râtelier et interagis pour recevoir ta première lame.', targetX: 680 };
        case 'armory': return { ...base, title: 'Premier biomask', instruction: 'Choisis une teinte de lien, puis rejoins le râtelier et interagis pour recevoir ton biomask.', targetX: 680 };
        case 'camp-run': return { ...base, title: 'Parcours du camp', instruction: 'Franchis les traverses et rejoins les trois balises avant la fin du temps.', targetX: s.progress.courseMarkers % 2 === 0 ? 830 : 140, counter: s.progress.courseMarkers, required: 3, timerTicks: Math.max(0, YOUTH_TIMING.courseLimitTicks - s.progress.courseElapsed) };
        case 'camp-duel': return { ...base, title: 'Épreuve de combat', instruction: 'Remporte ce duel non létal. La lame d’entraînement et les projections sont autorisées.', targetX: s.rival.x };
        case 'camp-defeat': return { ...base, title: 'Le maître interrompt le duel', instruction: 'Reprends le combat quand tu es prêt. Le parcours réussi reste acquis.', targetX: null };
        case 'barracks': return { ...base, title: 'Repos aux baraquements', instruction: 'Rejoins ta couche et interagis pour passer la nuit.', targetX: 680 };
        case 'rest': return { ...base, title: 'La nuit passe', instruction: 'Le camp s’apaise. La formation de ce jour est terminée.', targetX: null };
        case 'morning': return { ...base, title: 'Le lendemain', instruction: 'La formation est acquise. La sortie vers le désert reste à venir.', targetX: null };
    }
}
function parseActor(v: unknown): YouthActor | null {
    if (!record(v) || !finite(v.x, 70, 890) || !finite(v.y, 150, 430) ||
        !finite(v.vx, -12, 12) || !finite(v.vy, -12, 16) || v.facing !== -1 && v.facing !== 1 ||
        !['idle', 'jab', 'blade', 'throw', 'dodge', 'hurt', 'thrown', 'ko'].includes(String(v.action)) ||
        !integer(v.actionTick, 0, 1000000000) || typeof v.actionHitResolved !== 'boolean' ||
        !integer(v.composure, 0, 100) || (v.composure === 0) !== (v.action === 'ko')) return null;
    return { x: v.x, y: v.y, vx: v.vx, vy: v.vy, facing: v.facing, action: v.action as YouthAction,
        actionTick: v.actionTick, actionHitResolved: v.actionHitResolved, composure: v.composure };
}
/** Structural/chronological validation, not a claim that a local save is tamper proof. Restored input always needs neutral release. */
export function normalizeYouthTraining(v: unknown): YouthState | null {
    if (!record(v) || v.version !== 1 || !YOUTH_PHASES.includes(v.phase as YouthPhase) || !integer(v.tick, 0, 1000000000) || !integer(v.phaseTick, 0, v.tick) || !integer(v.phaseStartedAt, 0, v.tick) || v.phaseStartedAt + v.phaseTick !== v.tick || !integer(v.rivalDecisionTicks, 0, 78) || typeof v.practiceThreatened !== 'boolean' || typeof v.jumpCleared !== 'boolean' || v.cosmetic !== null && !['ochre', 'ash', 'rust'].includes(String(v.cosmetic)) || !record(v.progress) || !record(v.milestones))
        return null;
    const player = parseActor(v.player), rival = parseActor(v.rival);
    if (!player || !rival || player.actionTick > v.tick || rival.actionTick > v.tick)
        return null;
    const p = v.progress;
    for (const [k, max] of Object.entries({ moveMarkers: 2, jumps: 1, dodges: 1, strikes: 3, throws: 1, courseMarkers: 3, courseElapsed: 2100, courseAttempts: 1000000, duelAttempts: 1000000 })) {
        if (!integer(p[k], k === 'courseAttempts' || k === 'duelAttempts' ? 1 : 0, max))
            return null;
    }
    const phase = v.phase as YouthPhase, ordinal = YOUTH_PHASES.indexOf(phase);
    if (phase === 'rest' && v.phaseTick >= YOUTH_TIMING.restTicks) return null;
    if (ordinal < 1 && v.jumpCleared || ordinal >= 2 && !v.jumpCleared) return null;
    if (getYouthObstacles({ phase }).some(wall => player.y > wall.y + .01 && player.x + 18 > wall.x && player.x - 18 < wall.x + wall.width)) return null;
    if ((ordinal >= 1) !== (p.moveMarkers === 2) || (ordinal >= 2) !== (p.jumps === 1) || (ordinal >= 3) !== (p.dodges === 1) || (ordinal >= 4) !== (p.strikes === 3) || (ordinal >= 5 && p.throws !== 1))
        return null;
    if (ordinal < 3 && p.strikes !== 0 || ordinal < 7 && p.courseAttempts !== 1 || ordinal < 8 && p.duelAttempts !== 1)
        return null;
    if (ordinal < 4 && p.throws !== 0 || ordinal < 7 && (p.courseMarkers !== 0 || p.courseElapsed !== 0) || ordinal >= 8 && p.courseMarkers !== 3 || ordinal < 6 && v.cosmetic !== null || ordinal >= 7 && v.cosmetic === null)
        return null;
    const expected = ordinal >= 12 ? 6 : ordinal >= 10 ? 5 : ordinal >= 8 ? 4 : ordinal >= 7 ? 3 : ordinal >= 6 ? 2 : ordinal >= 5 ? 1 : 0;
    const milestones: Partial<Record<YouthMilestone, number>> = {};
    let last = 0;
    if (Object.keys(v.milestones).length !== expected)
        return null;
    for (let i = 0; i < expected; i++) {
        const id = YOUTH_MILESTONES[i], t = v.milestones[id];
        if (!integer(t, last + 1, v.tick) || t > v.phaseStartedAt)
            return null;
        milestones[id] = t;
        last = t;
    }
    if (phase === 'morning' && (v.milestones['youth-first-rest'] !== v.phaseStartedAt || last - (milestones['youth-camp-duel'] ?? 0) < 180))
        return null;
    if (phase === 'camp-duel' && player.composure === 0 || phase === 'camp-defeat' && player.composure !== 0 || ordinal >= 10 && player.composure === 0)
        return null;
    return { version: 1, phase, tick: v.tick, phaseTick: v.phaseTick, phaseStartedAt: v.phaseStartedAt, inputArmed: false, previousButtons: noButtons(), player, rival, rivalDecisionTicks: v.rivalDecisionTicks, practiceThreatened: v.practiceThreatened, jumpCleared: v.jumpCleared, cosmetic: v.cosmetic as YouthCosmetic | null, milestones, progress: { moveMarkers: p.moveMarkers as number, jumps: p.jumps as number, dodges: p.dodges as number, strikes: p.strikes as number, throws: p.throws as number, courseMarkers: p.courseMarkers as number, courseElapsed: p.courseElapsed as number, courseAttempts: p.courseAttempts as number, duelAttempts: p.duelAttempts as number } };
}
