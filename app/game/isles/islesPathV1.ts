/** The Isles V1 · A* on the tile grid for humans on foot (they do not climb or swim). */
import {isWalkableV1, kindAtV1, type IslesMapV1} from "./islesMapV1";

/** Cost to enter a tile: fords and mud slow a team down. */
function tileCost(map: IslesMapV1, tx: number, tz: number): number {
  const kind = kindAtV1(map, tx, tz);
  return kind === "ford" ? 3 : kind === "mud" ? 1.2 : kind === "bush" ? 1.4 : 1;
}

/** Shortest walkable path between two tiles (8 directions, no corner cutting), or null. */
export function findPathV1(map: IslesMapV1, from: [number, number], to: [number, number], maxNodes = 20000): [number, number][] | null {
  const w = map.width, total = w * map.depth;
  const index = (x: number, z: number) => z * w + x;
  if (!isWalkableV1(map, to[0], to[1]) || !isWalkableV1(map, from[0], from[1])) return null;
  const g = new Float32Array(total).fill(Infinity);
  const came = new Int32Array(total).fill(-1);
  const closed = new Uint8Array(total);
  const heap: number[] = [], f: number[] = [];
  const push = (node: number, score: number) => {
    heap.push(node); f.push(score);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (f[parent] <= f[i]) break;
      [heap[parent], heap[i]] = [heap[i], heap[parent]]; [f[parent], f[i]] = [f[i], f[parent]]; i = parent;
    }
  };
  const pop = () => {
    const top = heap[0];
    const lastNode = heap.pop()!, lastScore = f.pop()!;
    if (heap.length) {
      heap[0] = lastNode; f[0] = lastScore;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < heap.length && f[l] < f[m]) m = l;
        if (r < heap.length && f[r] < f[m]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]]; [f[m], f[i]] = [f[i], f[m]]; i = m;
      }
    }
    return top;
  };
  const h = (x: number, z: number) => {
    const dx = Math.abs(x - to[0]), dz = Math.abs(z - to[1]);
    return Math.max(dx, dz) + 0.414 * Math.min(dx, dz);
  };
  const start = index(from[0], from[1]), goal = index(to[0], to[1]);
  g[start] = 0; push(start, h(from[0], from[1]));
  let expanded = 0;
  while (heap.length && expanded < maxNodes) {
    const node = pop();
    if (closed[node]) continue;
    closed[node] = 1; expanded++;
    if (node === goal) break;
    const x = node % w, z = (node - x) / w;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dz) continue;
      const nx = x + dx, nz = z + dz;
      if (!isWalkableV1(map, nx, nz)) continue;
      if (dx && dz && (!isWalkableV1(map, x + dx, z) || !isWalkableV1(map, x, z + dz))) continue;
      const next = index(nx, nz);
      if (closed[next]) continue;
      const cost = g[node] + (dx && dz ? 1.414 : 1) * tileCost(map, nx, nz);
      if (cost < g[next]) { g[next] = cost; came[next] = node; push(next, cost + h(nx, nz)); }
    }
  }
  if (!closed[goal]) return null;
  const path: [number, number][] = [];
  for (let node = goal; node !== -1; node = came[node]) path.push([node % w, Math.floor(node / w)]);
  return path.reverse();
}

/** Nearest walkable tile to a tile (spiral search), for goals that sit on a prop. */
export function nearestWalkableV1(map: IslesMapV1, tx: number, tz: number, radius = 6): [number, number] | null {
  for (let r = 0; r <= radius; r++) {
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
      if (isWalkableV1(map, tx + dx, tz + dz)) return [tx + dx, tz + dz];
    }
  }
  return null;
}
