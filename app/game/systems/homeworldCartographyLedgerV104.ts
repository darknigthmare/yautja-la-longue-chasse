import { HOMEWORLD_CARTOGRAPHY_V104 as binding, HOMEWORLD_CARTOGRAPHY_SOURCE_V104 as source } from './homeworldCartographyDefinitionV104';

export type CartographyPhaseV104 = 'choice' | 'ready' | 'walking' | 'interrupted' | 'return' | 'completed';
export interface CartographyPointV104 { x: number; y: number }
export interface HomeworldCartographyLedgerV104 {
  version: 1; ownerCreatedAt: string; revision: number;
  receipt: null | {
    sceneId: 'D6-W-PNJ-ROLE-12'; routeId: 'port-known-lectern-v104'; sourceSha256: string; sourceCorpusSha256: string;
    phase: CartographyPhaseV104; nextWaypoint: number; walked: number; legWalked: number; last: CartographyPointV104;
    trail: CartographyPointV104[]; trailBreaks:number[]; trimmedCount:number; interruptedCount: number;
  };
}
const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const keys = (v: Record<string, unknown>, allowed: readonly string[]) => Object.keys(v).every(key => allowed.includes(key));
const integer = (v: unknown, max: number): v is number => Number.isSafeInteger(v) && (v as number) >= 0 && (v as number) <= max;
const distance = (a: CartographyPointV104, b: CartographyPointV104) => Math.hypot(a.x - b.x, a.y - b.y);
export function cartographyPointV104(v: unknown): v is CartographyPointV104 {
  const e = binding.envelope;
  return record(v) && keys(v, ['x', 'y']) && typeof v.x === 'number' && Number.isFinite(v.x) && typeof v.y === 'number' && Number.isFinite(v.y)
    && v.x >= e.left && v.x <= e.right && v.y >= e.top && v.y <= e.bottom;
}
export function defaultHomeworldCartographyV104(ownerCreatedAt: string): HomeworldCartographyLedgerV104 {
  return { version: 1, ownerCreatedAt, revision: 0, receipt: null };
}
/** Pure additive shape validation: save normalization must not import the
 * world whose construction already imports HomeworldProgress. */
export function normalizeHomeworldCartographyV104(value: unknown): HomeworldCartographyLedgerV104 | null {
  if (!record(value) || value.version !== 1 || !keys(value, ['version', 'ownerCreatedAt', 'revision', 'receipt'])
    || typeof value.ownerCreatedAt !== 'string' || value.ownerCreatedAt.length > 32 || !Number.isFinite(Date.parse(value.ownerCreatedAt))
    || new Date(value.ownerCreatedAt).toISOString() !== value.ownerCreatedAt || !integer(value.revision, 1_000_000)) return null;
  if (value.receipt === null) return value.revision === 0 ? structuredClone(value) as unknown as HomeworldCartographyLedgerV104 : null;
  const r = value.receipt;
  if (!record(r) || !keys(r, ['sceneId', 'routeId', 'sourceSha256', 'sourceCorpusSha256', 'phase', 'nextWaypoint', 'walked', 'legWalked', 'last', 'trail', 'trailBreaks', 'trimmedCount', 'interruptedCount'])
    || value.revision === 0 || r.sceneId !== binding.sceneId || r.routeId !== binding.routeId || r.sourceSha256 !== source.source.sha256 || r.sourceCorpusSha256 !== source.sourceCorpusSha256
    || !['choice', 'ready', 'walking', 'interrupted', 'return', 'completed'].includes(String(r.phase)) || !integer(r.nextWaypoint, 2)
    || typeof r.walked !== 'number' || !Number.isFinite(r.walked) || r.walked < 0 || r.walked > 1_000_000_000
    || typeof r.legWalked !== 'number' || !Number.isFinite(r.legWalked) || r.legWalked < 0 || r.legWalked > r.walked
    || !cartographyPointV104(r.last) || !integer(r.interruptedCount, 10000) || !integer(r.trimmedCount,1_000_000_000) || !Array.isArray(r.trail) || !r.trail.length || r.trail.length > 512
    || !r.trail.every(cartographyPointV104)) return null;
  const trail = r.trail as CartographyPointV104[];
  const trimmedCount = r.trimmedCount;
  if(!Array.isArray(r.trailBreaks))return null;
  const breaks=r.trailBreaks as number[];
  if(breaks.length>r.interruptedCount+trimmedCount*3||breaks.some((i,n)=>!integer(i,trail.length-1)||i===0||n>0&&i<=breaks[n-1]))return null;
  if(distance(trail[0],binding.post)>binding.radius||distance(trail[0],binding.host)>160)return null;
  const omittedLimit=Math.hypot(binding.envelope.right-binding.envelope.left,binding.envelope.bottom-binding.envelope.top);
  if (distance(trail.at(-1)!, r.last) > 32 || trail.some((p, i) => i > 0 && distance(p, trail[i - 1]) > (breaks.includes(i)?trimmedCount>0?omittedLimit:96:72))) return null;
  const measured=trail.reduce((sum,p,i)=>sum+(i&&!breaks.includes(i)?distance(p,trail[i-1]):0),0);
  if(measured>r.walked+.01)return null;
  if (['choice', 'ready'].includes(String(r.phase)) && (r.nextWaypoint !== 0 || r.walked !== 0 || trail.length !== 1)) return null;
  if (r.phase === 'walking' && r.nextWaypoint >= 2 || ['return', 'completed'].includes(String(r.phase)) && r.nextWaypoint !== 2) return null;
  if (r.phase === 'interrupted' && r.interruptedCount === 0) return null;
  // A forged count cannot substitute for the two actual recorded approaches.
  let found = 0;
  for (const p of trail) if (found < 2 && distance(p, binding.waypoints[found]) <= binding.waypointRadius + 1) found++;
  if (found < r.nextWaypoint || r.nextWaypoint > 0 && r.walked < 40) return null;
  if (r.phase === 'completed' && distance(r.last, binding.post) > binding.radius) return null;
  return structuredClone(value) as unknown as HomeworldCartographyLedgerV104;
}
