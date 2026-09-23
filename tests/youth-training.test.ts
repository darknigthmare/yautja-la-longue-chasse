import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import type { YouthState, YouthInput, YouthEnvironment, YouthReceipt } from '../app/game/systems/youthTraining';
const bundle = await build({ entryPoints: [fileURLToPath(new URL('../app/game/systems/youthTraining.ts', import.meta.url))], bundle: true, write: false, format: 'esm', platform: 'node', target: 'es2022' });
const api = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64')) as typeof import('../app/game/systems/youthTraining');
const env: YouthEnvironment = { assetsReady: true, pageVisible: true, paused: false };
const tick = (s: YouthState, i: YouthInput = {}, e = env) => api.stepYouthTraining(s, i, e).state;
const advance = (s: YouthState, n: number, i: YouthInput = {}, e = env) => { for (let k = 0; k < n; k++)
    s = tick(s, i, e); return s; };
const dir = (n: number): -1 | 0 | 1 => Math.abs(n) < 8 ? 0 : n < 0 ? -1 : 1;
/** A physical keyboard-style player: it reads public positions and telegraphs, never writes the state. */
function play(s: YouthState): YouthInput {
    if (!s.inputArmed)
        return {};
    const a = s.player, r = s.rival, o = api.getYouthObjective(s), d = o.targetX === null ? 0 : o.targetX - a.x;
    if (s.phase === 'dojo-move')
        return { move: dir(d) };
    if (s.phase === 'dojo-jump' || s.phase === 'camp-run') {
        const move = dir(d);
        const obstacles = api.getYouthObstacles(s);
        const ahead = obstacles.find(b => move === 1 ? b.x > a.x && b.x - a.x < 65 : b.x + b.width < a.x && a.x - b.x - b.width < 65);
        return { move, jump: !!ahead && a.vy === 0 && !s.previousButtons.jump };
    }
    if (s.phase === 'dojo-dodge') {
        if (r.action === 'jab' && r.actionTick >= 24 && r.actionTick < 32 && a.action === 'idle')
            return { dodge: true, move: -1 };
        return { move: Math.abs(r.x - a.x) > 68 ? dir(r.x - a.x) : 0 };
    }
    if (s.phase === 'dojo-strike' || s.phase === 'dojo-throw' || s.phase === 'camp-duel') {
        const throwMove = s.phase === 'dojo-throw', range = throwMove ? 46 : 59, move = Math.abs(r.x - a.x) > range ? dir(r.x - a.x) : a.facing !== (r.x < a.x ? -1 : 1) ? dir(r.x - a.x) : 0;
        if (a.action === 'idle' && Math.abs(r.x - a.x) <= range && a.facing === (r.x < a.x ? -1 : 1))
            return throwMove ? { throw: !s.previousButtons.throw } : { light: !s.previousButtons.light };
        return { move };
    }
    if (s.phase === 'blade-award' || s.phase === 'armory' || s.phase === 'barracks')
        return { move: Math.abs(d) > 35 ? dir(d) : 0, interact: Math.abs(d) <= 35 && !s.previousButtons.interact, choice: s.phase === 'armory' ? 'rust' : undefined };
    return {};
}
function reach(phase: YouthState['phase']) { let s = api.createYouthTraining(); const receipts: YouthReceipt[] = []; for (let i = 0; i < 20000 && s.phase !== phase; i++) {
    const out = api.stepYouthTraining(s, play(s), env);
    s = out.state;
    receipts.push(...out.receipts);
    assert.ok(api.normalizeYouthTraining(s), 'checkpoint valid at ' + s.phase + ' tick ' + s.tick);
} assert.equal(s.phase, phase, 'physical path reaches ' + phase); return { state: s, receipts }; }
test('fresh neutral input, missing assets, pause and background stop every clock and CPU', () => {
    let s = api.createYouthTraining();
    s = advance(s, 600, { move: 1 });
    assert.equal(s.tick, 0);
    s = tick(s);
    s = advance(s, 10, { move: 1 });
    const before = JSON.stringify({ player: s.player, rival: s.rival, tick: s.tick, phaseTick: s.phaseTick, progress: s.progress });
    for (const e of [{ ...env, paused: true }, { ...env, pageVisible: false }, { ...env, assetsReady: false }]) {
        const blocked = advance(s, 1000, { light: true }, e);
        assert.equal(JSON.stringify({ player: blocked.player, rival: blocked.rival, tick: blocked.tick, phaseTick: blocked.phaseTick, progress: blocked.progress }), before);
        const held = advance(blocked, 1000, { move: 1 });
        assert.equal(held.tick, s.tick);
        assert.equal(held.inputArmed, false);
        assert.equal(tick(held).tick, s.tick);
    }
});
test('ground movement cannot pass a solid hurdle; jump has a ballistic trajectory', () => {
    let s = reach('dojo-jump').state;
    s = tick(s);
    s = advance(s, 100, { move: 1 });
    assert.equal(s.player.x, 420);
    assert.equal(s.phase, 'dojo-jump');
    const y = s.player.y;
    s = tick(s, { jump: true, move: 1 });
    assert.ok(s.player.y < y);
    s = advance(s, 15, { move: 1 });
    assert.ok(s.player.y < 380);
    s = advance(s, 75, { move: 1 });
    assert.equal(s.phase, 'dojo-dodge');
});
test('practice attacks never count at a distance or automatically repeat from one held button', () => {
    let s = reach('dojo-strike').state;
    s = tick(s);
    s = advance(s, 150, { light: true });
    assert.equal(s.progress.strikes, 0);
    s = advance(s, 40, { move: 1 });
    while (Math.abs(s.player.x - s.rival.x) > 58)
        s = tick(s, { move: 1 });
    s = tick(s);
    s = advance(s, 200, { light: true });
    assert.equal(s.progress.strikes, 1);
    assert.equal(s.phase, 'dojo-strike');
});
test('dojo grant follows real movement, jump, timed dodge, three hits and airborne projection landing', () => {
    const { state: s, receipts } = reach('blade-award');
    assert.deepEqual(s.progress, { moveMarkers: 2, jumps: 1, dodges: 1, strikes: 3, throws: 1, courseMarkers: 0, courseElapsed: 0, courseAttempts: 1, duelAttempts: 1 });
    assert.equal(receipts.length, 1);
    assert.equal(receipts[0].id, 'youth-dojo-completed');
    assert.equal(s.milestones['youth-first-blade'], undefined);
    assert.equal(s.rival.y, 430);
});
test('wristblade and mask require nearby interaction, and cosmetic is explicit', () => {
    let s = reach('blade-award').state;
    s = tick(s);
    s = tick(s, { interact: true });
    assert.equal(s.milestones['youth-first-blade'], undefined);
    while (s.phase === 'blade-award')
        s = tick(s, play(s));
    assert.equal(s.phase, 'armory');
    assert.ok(s.milestones['youth-first-blade']);
    s = tick(s);
    while (s.player.x < 650)
        s = tick(s, { move: 1 });
    s = tick(s, { interact: true });
    assert.equal(s.phase, 'armory');
    assert.equal(s.cosmetic, null);
    s = tick(s, { choice: 'ash' });
    s = tick(s, { interact: true });
    assert.equal(s.phase, 'camp-run');
    assert.equal(s.cosmetic, 'ash');
});
test('course timer is active simulation only; timeout retries just that course with no reward', () => {
    let s = reach('camp-run').state;
    s = tick(s);
    s = advance(s, 300);
    const timed = s.progress.courseElapsed;
    s = advance(s, 1000, {}, { ...env, paused: true });
    assert.equal(s.progress.courseElapsed, timed);
    s = tick(s);
    s = advance(s, 2100);
    assert.equal(s.phase, 'camp-run');
    assert.equal(s.progress.courseAttempts, 2);
    assert.equal(s.milestones['youth-camp-run'], undefined);
    assert.ok(api.normalizeYouthTraining(s));
});
test('all six unique receipts require the real complete path, and completion never regenerates on restore', () => {
    const { state: s, receipts } = reach('morning');
    assert.deepEqual(receipts.map(r => r.id), api.YOUTH_MILESTONES);
    assert.equal(new Set(receipts.map(r => r.tick)).size, 6);
    assert.equal(s.progress.courseMarkers, 3);
    assert.ok(s.progress.courseElapsed < 2100);
    assert.equal(s.progress.duelAttempts, 1);
    assert.equal(api.getYouthReceipts(s).length, 6);
    const restored = api.normalizeYouthTraining(s)!;
    assert.ok(restored);
    assert.equal(restored.inputArmed, false);
    const next = api.stepYouthTraining(restored, {}, env);
    assert.deepEqual(next.receipts, []);
    assert.equal(next.state.tick, s.tick);
    assert.match(api.getYouthObjective(s).instruction, /désert reste à venir/);
});
test('defeat cannot reward a duel; fresh retry preserves course proof and restarts only combat', () => {
    let s = reach('camp-duel').state;
    s = tick(s);
    for (let n = 0; n < 15000 && s.phase === 'camp-duel'; n++)
        s = tick(s);
    assert.equal(s.phase, 'camp-defeat');
    assert.equal(s.milestones['youth-camp-duel'], undefined);
    assert.ok(api.normalizeYouthTraining(s));
    const course = s.milestones['youth-camp-run'];
    s = advance(s, 300, { retry: true });
    assert.equal(s.phase, 'camp-defeat');
    s = tick(s);
    s = tick(s, { retry: true });
    assert.equal(s.phase, 'camp-duel');
    assert.equal(s.progress.duelAttempts, 2);
    assert.equal(s.milestones['youth-camp-run'], course);
    assert.equal(s.player.composure, 100);
});
test('malformed/future checkpoints and receipt mismatch cannot forge a normal transition', () => {
    const s = reach('morning').state;
    for (const mutate of [(v: YouthState) => { v.version = 2 as 1; }, (v: YouthState) => { v.phaseTick++; }, (v: YouthState) => { v.player.x = NaN; }, (v: YouthState) => { v.milestones['youth-first-blade'] = v.tick + 1; }, (v: YouthState) => { delete v.milestones['youth-camp-run']; }, (v: YouthState) => { v.cosmetic = null; }, (v: YouthState) => { v.progress.strikes = 0; }]) {
        const changed = structuredClone(s);
        mutate(changed);
        assert.equal(api.normalizeYouthTraining(changed), null);
    }
    const receipt = api.getYouthReceipts(s)[0];
    assert.deepEqual(api.normalizeYouthReceipt(receipt, s), receipt);
    assert.equal(api.normalizeYouthReceipt({ ...receipt, tick: receipt.tick + 1 }, s), null);
    assert.equal(api.normalizeYouthReceipt({ ...receipt, sceneId: 'pit' }, s), null);
});


test('restoring checkpoints during airborne movement and attacks keeps the full route winnable', () => {
    let s = api.createYouthTraining();
    let restored = 0;
    for (let n = 0; n < 30000 && s.phase !== 'morning'; n++) {
        if (n % 37 === 0) {
            const loaded = api.normalizeYouthTraining(JSON.parse(JSON.stringify(s)));
            assert.ok(loaded);
            assert.equal(loaded.inputArmed, false);
            assert.deepEqual(loaded.player, s.player);
            assert.deepEqual(loaded.rival, s.rival);
            assert.equal(loaded.tick, s.tick);
            s = loaded;
            restored++;
        }
        s = tick(s, play(s));
    }
    assert.equal(s.phase, 'morning');
    assert.ok(restored > 50);
    assert.equal(api.getYouthReceipts(s).length, 6);
});

test('an absent milestone does not validate an undefined receipt or future practice counters', () => {
    const s = api.createYouthTraining();
    assert.equal(api.normalizeYouthReceipt({ id: 'youth-first-blade', sourceId: 'youth.training.v48', sceneId: 'unblooded-training' }, s), null);
    const futurePractice = structuredClone(s);
    futurePractice.progress.strikes = 1;
    assert.equal(api.normalizeYouthTraining(futurePractice), null);
});


test('a practice dodge must avoid a real nearby announced strike, not harmless air after retreating', () => {
    let s = reach('dojo-dodge').state;
    s = tick(s);
    for (let n = 0; n < 300 && s.rival.action !== 'jab'; n++) s = tick(s, { move: s.rival.x - s.player.x > 65 ? 1 : 0 });
    assert.equal(s.rival.action, 'jab');
    s = advance(s, 23, { move: -1 });
    assert.ok(Math.abs(s.player.x - s.rival.x) > 75);
    s = tick(s, { dodge: true, move: -1 });
    s = advance(s, 35);
    assert.equal(s.phase, 'dojo-dodge');
    assert.equal(s.progress.dodges, 0);
    for (let n = 0; n < 600 && s.phase === 'dojo-dodge'; n++) s = tick(s, play(s));
    assert.equal(s.phase, 'dojo-strike');
});


test('novice dodge cue allows an immediate response and a 250ms response, but not an unannounced premature dodge', () => {
    for (const responseTick of [1, 12, 27]) {
        let s = reach('dojo-dodge').state;
        s = tick(s);
        for (let n = 0; n < 300 && s.rival.action !== 'jab'; n++) s = tick(s, { move: s.rival.x - s.player.x > 65 ? 1 : 0 });
        while (s.rival.actionTick < responseTick) s = tick(s);
        s = tick(s, { dodge: true, move: -1 });
        s = advance(s, 40);
        assert.equal(s.phase, responseTick === 1 ? 'dojo-dodge' : 'dojo-strike');
    }
});

test('deterministic varied novice inputs keep collidable actors and restorable checkpoints within bounds', () => {
    for (const startPhase of ['dojo-jump', 'dojo-dodge', 'dojo-strike', 'camp-run', 'camp-duel'] as const) {
        let s = reach(startPhase).state;
        let seed = 417;
        for (let n = 0; n < 5000; n++) {
            seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
            const choice = seed % 31;
            const input: YouthInput = { move: choice % 3 === 0 ? -1 : choice % 3 === 1 ? 1 : 0, jump: choice === 3, light: choice === 7, blade: choice === 11, throw: choice === 13, dodge: choice === 17, retry: choice === 23 };
            s = tick(s, input, n % 101 === 0 ? { ...env, paused: true } : env);
            assert.ok(api.normalizeYouthTraining(s), startPhase + ' tick ' + s.tick);
            for (const a of [s.player, s.rival]) { assert.ok(a.x >= 70 && a.x <= 890); assert.ok(a.y <= 430 && a.y >= 150); }
            for (const wall of api.getYouthObstacles(s)) {
                const embedded = s.player.y > wall.y + .01 && s.player.x + 18 > wall.x && s.player.x - 18 < wall.x + wall.width;
                assert.equal(embedded, false, 'player cannot enter a solid obstacle');
            }
        }
    }
});


test('corrupted KO and embedded-wall checkpoints are rejected instead of loading a softlock', () => {
    const duel = reach('camp-duel').state;
    const deadButStanding = structuredClone(duel);
    deadButStanding.rival.composure = 0;
    assert.equal(api.normalizeYouthTraining(deadButStanding), null);
    const aliveButKnockedOut = structuredClone(duel);
    aliveButKnockedOut.player.action = 'ko';
    assert.equal(api.normalizeYouthTraining(aliveButKnockedOut), null);
    const jump = reach('dojo-jump').state;
    jump.player.x = 470;
    assert.equal(api.normalizeYouthTraining(jump), null);
});
