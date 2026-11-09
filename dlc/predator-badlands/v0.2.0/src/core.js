/* Pure, deterministic game state. No DOM, storage or network side effects. */
(() => {
  'use strict';
  const D = globalThis.BADLANDS_V2_DATA;
  const copy = v => JSON.parse(JSON.stringify(v));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const number = (v, a, b, fallback) => Number.isFinite(v) ? clamp(v, a, b) : fallback;
  const campaign = id => D.campaigns.find(c => c.id === id);
  const scene = state => campaign(state.campaign).scenes.find(s => s.id === state.scene);
  function create(cid, sid, completed = []) {
    const c = campaign(cid);
    if (!c) throw new Error('Campagne inconnue.');
    const spec = sid ? c.scenes.find(s => s.id === sid) : c.scenes[0];
    if (!spec) throw new Error('Scène inconnue.');
    const ids = new Set(c.scenes.map(s => s.id));
    const armed = spec.gear.filter(id => ['melee', 'ranged'].includes(D.weapons[id].kind));
    const gear = [...spec.gear];
    // Bare hands are a simulation fallback, never a new lore weapon.
    const state = {schema: 2, campaign: cid, scene: spec.id,
      done: [...new Set(completed.filter(id => ids.has(id)))], elapsed: 0,
      phase: 'intro', message: spec.bridge ? 'Raccord de gameplay original.' : 'Épisode hérité de la v0.1.',
      player: {x: 120, depth: 1, hp: 100, z: 0, vz: 0, facing: 1, cooldown: 0, reload: 0,
        selected: Math.max(0, gear.indexOf(armed[0])), medkits: 2},
      gear, ammo: Object.fromEntries(gear.map(id => [id, {loaded: D.weapons[id].magazine, reserve: D.weapons[id].reserve}])),
      enemies: spec.enemies.map((id, i) => ({id, x: 600 + i * 270, depth: i % 4,
        hp: D.enemies[id].hp, maxHp: D.enemies[id].hp, windup: 0, cooldown: 0.8 + i * 0.2, phase: 1})),
      nodes: Array.from({length: spec.targetCount}, (_, i) => ({x: 420 + i * 420, depth: i % 4, taken: false})),
      puzzle: 0, objectiveTimer: 0, companions: [], escortX: 100,
      event: null, shots: [], hits: [], inventoryLog: []};
    if (cid === 'predator') {
      if (spec.actors.includes('Thia') && spec.chapter >= c.scenes.find(x => x.id === 'pred_thia').chapter) state.companions.push({id: 'Thia', x: 80, depth: 1});
      if (spec.actors.includes('Bud') && spec.chapter > c.scenes.find(x => x.id === 'pred_luna').chapter) state.companions.push({id: 'Bud', x: 60, depth: 1});
    } else if (spec.actors.includes('Drones synthétiques')) state.companions.push({id: 'Unité', x: 80, depth: 1});
    if (spec.objectiveType === 'escort' && !state.companions.length) state.companions.push({id: 'Objectif escorté', x: 80, depth: 1});
    return state;
  }
  function complete(s, event) {
    if (s.phase !== 'play') return;
    s.phase = 'outcome';
    s.event = event || 'objective-complete';
    if (!s.done.includes(s.scene)) s.done.push(s.scene);
    s.message = scene(s).canonOutcome;
  }
  function confirm(s) {
    if (s.phase === 'intro') s.phase = 'play';
    else if (s.phase === 'outcome') s.phase = 'exit';
    return s;
  }
  function weapon(s) { return D.weapons[s.gear[s.player.selected]] || {name: 'Mains nues (simulation)', kind: 'melee', damage: 14, range: 100, cooldown: 0.5}; }
  function attack(s) {
    if (s.phase !== 'play') return false;
    const p = s.player, w = weapon(s);
    if (p.cooldown > 0 || p.reload > 0 || !['melee', 'ranged'].includes(w.kind)) return false;
    const ammo = s.ammo[s.gear[p.selected]];
    if (w.kind === 'ranged') {
      if (!ammo || ammo.loaded <= 0) {s.message = 'Chargeur vide : R pour recharger, V pour changer d’arme.'; return false;}
      ammo.loaded--;
    }
    p.cooldown = w.cooldown;
    const target = s.enemies.filter(e => e.hp > 0 && e.depth === p.depth && (e.x - p.x) * p.facing >= 0 && Math.abs(e.x - p.x) <= w.range)
      .sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
    s.shots.push({x: p.x, end: target ? target.x : p.x + p.facing * w.range, depth: p.depth, ttl: 0.12});
    if (target) {
      target.hp = Math.max(0, target.hp - (w.damage || 14));
      s.hits.push({x: target.x, depth: target.depth, ttl: 0.3});
      const total = target.maxHp;
      target.phase = target.hp <= total / 3 ? 3 : target.hp <= total * 2 / 3 ? 2 : 1;
      if (s.scene === 'pred_den' && target.hp <= total * 0.42) {
        target.hp = total; complete(s, 'kalisk-regenerated');
      } else if (['combat', 'boss'].includes(scene(s).objectiveType) && s.enemies.every(e => e.hp <= 0)) {
        complete(s, s.scene === 'wy_capture' ? 'cryo-capture' : s.scene === 'pred_father' ? 'kwei-intervenes' : s.scene === 'pred_crystal_cave' ? 'training-ended' : 'encounter-ended');
      }
    }
    return true;
  }
  function action(s, name) {
    if (name === 'confirm') {confirm(s); return s;}
    if (name === 'retry' && s.phase === 'dead') return create(s.campaign, s.scene, s.done);
    if (!['play', 'exit'].includes(s.phase)) return s;
    const p = s.player, spec = scene(s);
    if (name === 'depth') {p.depth = (p.depth + 1) % 4; p.z = 0; p.vz = 0;}
    if (name === 'jump' && p.z === 0) p.vz = 360;
    if (name === 'cycle' && s.gear.length) {p.selected = (p.selected + 1) % s.gear.length; p.reload = 0;}
    if (name === 'reload') {
      const a = s.ammo[s.gear[p.selected]], w = weapon(s);
      if (a && w.kind === 'ranged' && a.loaded < w.magazine && a.reserve > 0 && p.reload === 0) p.reload = 1.2;
    }
    if (name === 'heal' && p.hp < 100 && p.medkits > 0 && s.gear.some(id => D.weapons[id].kind === 'heal')) {
      p.medkits--; p.hp = Math.min(100, p.hp + 40);
    }
    if (name === 'fire') attack(s);
    if (name === 'interact') {
      if (s.phase === 'exit' && p.x >= spec.width - 170) {
        if (!spec.next.length) {s.phase = 'finished'; s.message = 'Campagne terminée.'; return s;}
        return create(s.campaign, spec.next[0], s.done);
      }
      if (s.phase === 'play' && ['collect', 'interact'].includes(spec.objectiveType)) {
        const index = s.nodes.findIndex(n => !n.taken && n.depth === p.depth && Math.abs(n.x - p.x) < 95);
        if (index >= 0) {
          if (spec.objectiveType === 'interact' && index !== s.puzzle) s.message = `Relais ${s.puzzle + 1} à activer d’abord.`;
          else {s.nodes[index].taken = true; s.puzzle++; s.inventoryLog.push(`node-${index + 1}`);
            if (s.nodes.every(n => n.taken)) complete(s, spec.objectiveType === 'interact' ? 'relays-open' : 'collection-complete');}
        }
      }
    }
    return s;
  }
  function step(s, elapsed, input = {}) {
    if (!['play', 'exit'].includes(s.phase)) return s;
    const dt = number(elapsed, 0, 0.05, 0), p = s.player, spec = scene(s);
    s.elapsed += dt;
    const move = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (move) p.facing = move;
    p.x = clamp(p.x + move * 245 * dt, 30, spec.width - 30);
    if (p.z > 0 || p.vz > 0) {p.z = Math.max(0, p.z + p.vz * dt); p.vz -= 920 * dt; if (!p.z) p.vz = 0;}
    p.cooldown = Math.max(0, p.cooldown - dt);
    if (p.reload > 0) {
      p.reload = Math.max(0, p.reload - dt);
      if (p.reload === 0) {const a = s.ammo[s.gear[p.selected]], w = weapon(s); const n = Math.min(w.magazine - a.loaded, a.reserve); a.loaded += n; a.reserve -= n;}
    }
    for (const list of [s.shots, s.hits]) {for (const item of list) item.ttl -= dt; for (let i = list.length - 1; i >= 0; i--) if (list[i].ttl <= 0) list.splice(i, 1);}
    s.companions.forEach((c, i) => {const target = p.x - 65 - i * 45; c.x = clamp(c.x + clamp(target - c.x, -180 * dt, 180 * dt), 30, spec.width - 30); c.depth = p.depth;});
    if (s.phase === 'exit') return s;
    if (input.fire) attack(s);
    if (s.phase !== 'play') return s;
    for (const e of s.enemies) {
      if (e.hp <= 0) continue;
      e.cooldown = Math.max(0, e.cooldown - dt);
      const same = e.depth === p.depth, dx = p.x - e.x;
      const fixed = /vine|pod|grass|trap/.test(e.id);
      const active = same && Math.abs(dx) < 650;
      if (active && !fixed && e.windup <= 0 && Math.abs(dx) > 55) e.x = clamp(e.x + Math.sign(dx) * (65 + e.phase * 14) * dt, 30, spec.width - 30);
      if (e.windup > 0) {
        e.windup = Math.max(0, e.windup - dt);
        if (e.windup === 0) {
          if (same && Math.abs(e.x - p.x) < 105 && p.z < 38) p.hp = Math.max(0, p.hp - D.enemies[e.id].damage * (0.65 + e.phase * 0.15));
          e.cooldown = Math.max(0.65, 1.6 - e.phase * 0.2);
        }
      } else if (active && Math.abs(dx) < 110 && e.cooldown === 0) e.windup = 0.65;
    }
    if (p.hp <= 0) {s.phase = 'dead'; s.message = 'Échec : recommencer ce point de contrôle.'; return s;}
    if (spec.objectiveType === 'survive') {
      s.objectiveTimer += dt;
      if (s.objectiveTimer >= 15 && p.x > spec.width * 0.55) complete(s, s.scene === 'pred_capture' ? 'cryo-capture' : 'survival-event');
    }
    if (spec.objectiveType === 'escort') {
      s.escortX = s.companions.length ? Math.min(...s.companions.map(c => c.x)) : p.x;
      if (p.x > spec.width - 300 && s.escortX > spec.width - 420) {s.objectiveTimer += dt; if (s.objectiveTimer >= 2) complete(s, 'escort-arrived');}
    }
    if (s.scene === 'pred_father' && s.elapsed >= 15) complete(s, 'kwei-intervenes');
    if (s.scene === 'pred_den' && s.elapsed >= 26) {const k = s.enemies.find(e => e.id === 'kalisk_boss'); if (k) k.hp = k.maxHp; complete(s, 'kalisk-regenerated');}
    return s;
  }
  function serialize(s) {return JSON.stringify(s);}
  function restore(raw) {
    const v = typeof raw === 'string' ? JSON.parse(raw) : copy(raw);
    if (!v || !campaign(v.campaign)) throw new Error('Sauvegarde invalide.');
    if (v.schema != null && v.schema !== 2) throw new Error('Version de sauvegarde non prise en charge.');
    const s = create(v.campaign, v.scene, Array.isArray(v.done) ? v.done : []);
    if (v.schema == null) {s.message = 'Progression v0.1 migrée ; la sauvegarde originale est conservée.'; return s;}
    const p = v.player || {}, spec = scene(s);
    for (const [key, min, max, fallback] of [['x', 30, spec.width - 30, 120], ['hp', 0, 100, 100], ['depth', 0, 3, 1], ['z', 0, 140, 0], ['vz', -900, 360, 0], ['cooldown', 0, 2, 0], ['reload', 0, 1.2, 0], ['selected', 0, Math.max(0, s.gear.length - 1), 0], ['medkits', 0, 2, 2]]) s.player[key] = number(p[key], min, max, fallback);
    for (const k of ['depth', 'selected', 'medkits']) s.player[k] = Math.floor(s.player[k]);
    s.player.facing = p.facing === -1 ? -1 : 1;
    s.elapsed = number(v.elapsed, 0, 86400, 0);
    s.objectiveTimer = number(v.objectiveTimer, 0, 86400, 0);
    s.puzzle = Math.floor(number(v.puzzle, 0, s.nodes.length, 0));
    s.nodes.forEach((n, i) => {n.taken = v.nodes?.[i]?.taken === true;});
    s.enemies.forEach((e, i) => {const old = v.enemies?.[i]; if (!old || old.id !== e.id) return;
      e.hp = number(old.hp, 0, e.maxHp, e.maxHp); e.x = number(old.x, 30, spec.width - 30, e.x);
      e.depth = Math.floor(number(old.depth, 0, 3, e.depth)); e.phase = e.hp <= e.maxHp / 3 ? 3 : e.hp <= e.maxHp * 2 / 3 ? 2 : 1;
      e.cooldown = number(old.cooldown, 0, 2, 0.8); e.windup = number(old.windup, 0, 0.65, 0);});
    s.companions.forEach((c, i) => {const old = v.companions?.[i]; c.x = number(old?.x, 30, spec.width - 30, c.x); c.depth = s.player.depth;});
    for (const id of s.gear) {const a = v.ammo?.[id] || {}; s.ammo[id].loaded = Math.floor(number(a.loaded, 0, D.weapons[id].magazine, D.weapons[id].magazine)); s.ammo[id].reserve = Math.floor(number(a.reserve, 0, D.weapons[id].reserve, D.weapons[id].reserve));}
    s.phase = ['intro', 'play', 'outcome', 'exit', 'dead', 'finished'].includes(v.phase) ? v.phase : 'intro';
    s.message = typeof v.message === 'string' ? v.message.slice(0, 1000) : s.message;
    s.event = typeof v.event === 'string' ? v.event.slice(0, 100) : null;
    s.inventoryLog = Array.isArray(v.inventoryLog) ? v.inventoryLog.filter(x => typeof x === 'string').slice(0, 40) : [];
    if (s.player.hp === 0) s.phase = 'dead';
    return s;
  }
  globalThis.BADLANDS_V2 = {data: D, create, scene, step, action, attack, weapon, serialize, restore};
})();
