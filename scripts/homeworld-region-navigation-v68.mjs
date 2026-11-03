import assert from 'node:assert/strict';

/** QA route planner only. The game never moves its actor using this function. */
export function regionGroundRouteV68(api, id, zone, start, target, tick = 0, buildingId = null) {
  // Keep a small margin for genuine keyboard stepping and render readback tolerance at corners.
  const size = 45, walkable = p => (Math.hypot(p.x - start.x, p.y - start.y) < 12 || Math.hypot(p.x - target.x, p.y - target.y) < 12 ? [[0, 0]] : [[0, 0], [8, 0], [-8, 0], [0, 8], [0, -8]]).every(([x, y]) => api.isHomeworldRegionWalkableV68(id, zone, { x: p.x + x, y: p.y + y }, tick, buildingId));
  assert(walkable(start), 'Route begins on real floor');
  assert(walkable(target), 'Route target has a whole-body approach');
  const visible = (a, b) => { const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 12); for (let i = 1; i <= n; i++) if (!walkable({ x: a.x + (b.x - a.x) * i / n, y: a.y + (b.y - a.y) * i / n })) return false; return true; };
  if (visible(start, target)) return [start, target];
  const origin = { x: Math.round(start.x / size) * size, y: Math.round(start.y / size) * size };
  let first = origin;
  if (!walkable(first) || !visible(start, first)) {
    const alternatives = [];
    for (let x = -2; x <= 2; x++) for (let y = -2; y <= 2; y++) alternatives.push({ x: origin.x + x * size, y: origin.y + y * size });
    first = alternatives.find(p => walkable(p) && visible(start, p)); assert(first, 'A nearby navigation node reaches the player');
  }
  const heap = [], seen = new Set(), previous = new Map(), costs = new Map(), positions = new Map();
  const push = n => { heap.push(n); for (let i = heap.length - 1; i > 0;) { const p = (i - 1) >> 1; if (heap[p].f <= heap[i].f) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], tail = heap.pop(); if (heap.length) { heap[0] = tail; for (let i = 0;;) { let n = i, l = i * 2 + 1, r = l + 1; if (l < heap.length && heap[l].f < heap[n].f) n = l; if (r < heap.length && heap[r].f < heap[n].f) n = r; if (n === i) break; [heap[i], heap[n]] = [heap[n], heap[i]]; i = n; } } return top; };
  const key = p => `${p.x},${p.y}`, heuristic = p => Math.hypot(target.x - p.x, target.y - p.y);
  costs.set(key(first), 0); push({ p: first, f: heuristic(first) }); let last;
  while (heap.length && seen.size < 90000) {
    const { p } = pop(), k = key(p); if (seen.has(k)) continue; seen.add(k); positions.set(k, p);
    if (heuristic(p) < size * 2 && visible(p, target)) { last = k; break; }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
      const n = { x: p.x + dx * size, y: p.y + dy * size }, nk = key(n), cost = costs.get(k) + Math.hypot(dx, dy) * size;
      if (seen.has(nk) || !walkable(n) || !visible(p, n) || cost >= (costs.get(nk) ?? Infinity)) continue;
      previous.set(nk, k); costs.set(nk, cost); push({ p: n, f: cost + heuristic(n) });
    }
  }
  assert(last, `Physical route exists: ${id}/${zone} ${JSON.stringify(start)} -> ${JSON.stringify(target)}`);
  const points = [target]; while (last) { points.push(positions.get(last)); last = previous.get(last); } points.push(start); points.reverse();
  const simplified = [points[0]];
  for (let i = 0; i < points.length - 1;) { let n = i + 1; while (n + 1 < points.length && visible(points[i], points[n + 1])) n++; simplified.push(points[n]); i = n; }
  return simplified;
}

/** Keyboard-only navigation. It reads actual actor coordinates, and never injects position or proof. */
export function homeworldRegionNavigatorV68(page, api, { controlledClock = true } = {}) {
  const held = new Set(), routes = [];
  const tick = ms => controlledClock ? page.clock.runFor(ms) : page.waitForTimeout(ms);
  const position = () => page.locator('[data-region-player]').evaluate(e => ({ x: Number(e.dataset.x), y: Number(e.dataset.y) }));
  const release = async () => { for (const key of held) await page.keyboard.up(key); held.clear(); await tick(32); };
  const focus = async () => { await page.bringToFront(); await page.getByLabel(/^Explorer /).focus(); await tick(32); };
  const resume = async () => { const button = page.locator('[data-region-resume]'); if (await button.isVisible()) await button.click(); await tick(32); await focus(); };
  async function driveTo(target, tolerance = 8) {
    let previous = await position(), stagnant = 0;
    for (let n = 0; n < 2500; n++) {
      const p = await position(), dx = target.x - p.x, dy = target.y - p.y;
      if (Math.abs(dx) <= tolerance && Math.abs(dy) <= tolerance) { await release(); return await position(); }
      const keys = new Set([...(Math.abs(dx) > tolerance ? [dx > 0 ? 'ArrowRight' : 'ArrowLeft'] : []), ...(Math.abs(dy) > tolerance ? [dy > 0 ? 'ArrowDown' : 'ArrowUp'] : [])]);
      for (const key of held) if (!keys.has(key)) { await page.keyboard.up(key); held.delete(key); }
      for (const key of keys) if (!held.has(key)) { await page.keyboard.down(key); held.add(key); }
      await tick(32); if (Math.hypot(p.x - previous.x, p.y - previous.y) < .7) stagnant++; else stagnant = 0;
      assert(stagnant < 35, `Keyboard movement blocked: ${JSON.stringify(p)} -> ${JSON.stringify(target)}`); previous = p;
    }
    throw new Error('Keyboard route budget exceeded');
  }
  async function walkTo(target) {
    const root = page.locator('[data-homeworld-region-v68]'), id = await root.getAttribute('data-homeworld-region-v68'), zone = await root.getAttribute('data-zone'), t = Number(await root.getAttribute('data-state-tick'));
    const from = await position(), buildingId = await root.getAttribute('data-interior-building'), points = regionGroundRouteV68(api, id, zone, from, target, t, buildingId);
    // Keyboard axes have fixed unequal ground speeds. Short public-input segments
    // follow the planned line instead of silently approximating it with an L turn.
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i], count = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 24));
      for (let n = 1; n <= count; n++) await driveTo({ x: a.x + (b.x - a.x) * n / count, y: a.y + (b.y - a.y) * n / count }, 6);
    }
    routes.push({ id, zone, from, to: await position(), points }); return await position();
  }
  const interact = async () => { await release(); await page.keyboard.press('KeyE'); await tick(96); };
  async function traversePassage() {
    const root = page.locator('[data-homeworld-region-v68]'), id = await root.getAttribute('data-homeworld-region-v68'), nodes = api.HOMEWORLD_REGIONS_V68[id].route, p = await position();
    const forward = p.x < 1000;
    for (const node of forward ? nodes.slice(1) : nodes.slice(0, -1).reverse()) await walkTo(node);
    await interact(); if (forward) { await root.filter({ has: page.locator('[data-region-resident]') }).waitFor(); await focus(); }
  }
  return { position, tick, release, focus, resume, driveTo, walkTo, interact, traversePassage, routes };
}
