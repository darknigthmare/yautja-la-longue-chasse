/** CW130-NET-006 / CW130-NET-012 · Outer Ops authority bound to Supabase accounts.
 * Players authenticate with their Supabase access token; their campaign stocks, accepted
 * orders and signed receipts live in the `yautja_war_*` tables
 * (supabase/migrations/20261123103000_yautja_clan_war_outer_ops_v130.sql). Only this
 * server writes them, through yautja_war_commit_v130 and the service role. */
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createClanWarHttpServiceV127} from './serve-clan-war-practice-v127.mjs';
import {createWarOuterOpsLogicV115, loadWarOuterOpsRulesV115, validOrder} from './serve-clan-war-outer-ops-v115.mjs';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const jwt = /^Bearer ([A-Za-z0-9_-]{1,2048}\.[A-Za-z0-9_-]{1,2048}\.[A-Za-z0-9_-]{1,2048})$/;

/** Raised when another authority step committed first; the caller reloads and retries. */
export class WarOuterOpsConflictV130 extends Error {
  constructor(message = 'Outer Ops campaign changed') { super(message); this.name = 'WarOuterOpsConflictV130'; }
}

const assertAccount = id => { if (typeof id !== 'string' || !uuid.test(id)) throw new TypeError('Invalid account id'); };
const clone = value => structuredClone(value);
const receiptRow = ({signature, ...body}) => ({operationId: body.operationId, settledAt: body.settledAt, signature, body});

/** In-process store with the same commit contract as the Postgres function (tests, local exercise). */
export function createMemoryOuterOpsStoreV130() {
  const rows = new Map();
  return {
    async load(id) {
      assertAccount(id);
      await Promise.resolve();
      const row = rows.get(id);
      return row ? clone(row) : null;
    },
    async commit(id, expectedRevision, campaign, orders, receipts) {
      assertAccount(id);
      await Promise.resolve();
      const row = rows.get(id) ?? (expectedRevision === 0 ? {revision: 0, commandIds: [], sequences: [], receipts: []} : null);
      if (!row || row.revision !== expectedRevision || !(campaign.revision > expectedRevision)) throw new WarOuterOpsConflictV130();
      const ids = new Set(row.commandIds), sequences = new Set(row.sequences ?? []), settled = new Set(row.receipts.map(item => item.operationId));
      for (const order of orders) {
        if (ids.has(order.id) || sequences.has(order.sequence)) throw new WarOuterOpsConflictV130('duplicate order');
        ids.add(order.id); sequences.add(order.sequence);
      }
      for (const receipt of receipts) {
        if (settled.has(receipt.operationId)) throw new WarOuterOpsConflictV130('duplicate receipt');
        settled.add(receipt.operationId);
      }
      const next = {revision: campaign.revision, sequence: campaign.sequence, previousTime: campaign.previousTime,
        world: clone(campaign.world), commandIds: [...ids], receipts: [...row.receipts, ...clone(receipts)]};
      rows.set(id, next);
      Object.defineProperty(next, 'sequences', {value: [...sequences], enumerable: false});
      return next.revision;
    },
    async list() { return [...rows.keys()]; },
  };
}

function supabaseBase(url) {
  const base = new URL(url);
  if (base.protocol !== 'https:' || base.username || base.password || base.pathname !== '/') {
    throw new Error('Utilisez l’URL HTTPS racine du projet Supabase.');
  }
  return base;
}

async function json(response) {
  const text = await response.text();
  try { return text ? JSON.parse(text) : null; } catch { return null; }
}

/** PostgREST store using the server-only service role key. */
export function createSupabaseOuterOpsStoreV130({url, serviceKey, fetcher = fetch}) {
  const base = supabaseBase(url);
  if (typeof serviceKey !== 'string' || !serviceKey) throw new Error('Clé de service Supabase absente.');
  const headers = {apikey: serviceKey, Authorization: 'Bearer ' + serviceKey, 'Content-Type': 'application/json',
    'Accept-Profile': 'public', 'Content-Profile': 'public'};
  async function call(path, init = {}) {
    const response = await fetcher(new URL(path, base), {...init, headers,
      signal: AbortSignal.timeout(5000), redirect: 'error'});
    const body = await json(response);
    if (!response.ok) {
      if (['40001', '23505'].includes(body?.code)) throw new WarOuterOpsConflictV130(body.message);
      throw new Error('Supabase Outer Ops ' + response.status + (body?.code ? ' ' + body.code : ''));
    }
    return body;
  }
  return {
    async load(id) {
      assertAccount(id);
      const filter = 'user_id=eq.' + id;
      const [campaigns, orders, receipts] = await Promise.all([
        call('/rest/v1/yautja_war_campaigns?select=revision,sequence,previous_time,source_sha,world&' + filter),
        call('/rest/v1/yautja_war_orders?select=order_id&order=sequence.asc&' + filter),
        call('/rest/v1/yautja_war_receipts?select=body,signature&order=settled_at.asc,operation_id.asc&' + filter),
      ]);
      const row = campaigns?.[0];
      if (!row) return null;
      return {revision: row.revision, sequence: row.sequence, previousTime: row.previous_time, world: row.world,
        commandIds: orders.map(order => order.order_id), receipts: receipts.map(item => ({...item.body, signature: item.signature}))};
    },
    async commit(id, expectedRevision, campaign, orders, receipts) {
      assertAccount(id);
      return call('/rest/v1/rpc/yautja_war_commit_v130', {method: 'POST', body: JSON.stringify({
        p_user: id, p_expected_revision: expectedRevision, p_campaign: campaign,
        p_orders: orders, p_receipts: receipts.map(receiptRow),
      })});
    },
    async list() {
      return (await call('/rest/v1/yautja_war_campaigns?select=user_id')).map(row => row.user_id);
    },
  };
}

/** Resolve `Authorization: Bearer <Supabase access token>` to {id} through GoTrue. */
export function createSupabaseIdentityV130({url, apiKey, fetcher = fetch}) {
  const base = supabaseBase(url);
  if (typeof apiKey !== 'string' || !apiKey) throw new Error('Clé publique Supabase absente.');
  return async authorization => {
    const [, token] = jwt.exec(authorization ?? '') ?? [];
    if (!token) return undefined;
    try {
      const response = await fetcher(new URL('/auth/v1/user', base), {
        headers: {apikey: apiKey, Authorization: 'Bearer ' + token}, signal: AbortSignal.timeout(5000), redirect: 'error'});
      if (!response.ok) return undefined;
      const user = await json(response);
      return typeof user?.id === 'string' && uuid.test(user.id) ? {id: user.id} : undefined;
    } catch {
      return undefined;
    }
  };
}

function monotonicClock() {
  const epoch = Date.now();
  const counter = performance.now();
  return () => epoch + Math.floor(performance.now() - counter);
}

/** HTTP authority: GET /state and POST /order, one campaign per authenticated account. */
export function createWarOuterOpsAccountsServerV130(game, {store, authenticate, secret, clock = monotonicClock(), tickMs = 1000}) {
  if (!store || typeof authenticate !== 'function' || !Buffer.isBuffer(secret) || secret.length < 32 ||
      typeof clock !== 'function' || !Number.isSafeInteger(tickMs) || tickMs < 250 || tickMs > 60000) {
    throw new Error('Configuration Outer Ops par comptes invalide.');
  }
  const logic = createWarOuterOpsLogicV115(game, secret);

  async function withAccount(id, operation) {
    for (let attempt = 0; attempt < 6; attempt++) {
      const loaded = await store.load(id);
      const stored = loaded ?? logic.initial();
      if (!logic.compatible(stored.world)) throw new Error('Source V6 incompatible avec la campagne du compte.');
      const time = clock();
      if (!Number.isSafeInteger(time) || time < 0) throw new Error('Horloge serveur invalide.');
      const now = Math.max(time, stored.previousTime);
      const before = stored.revision;
      const receipts = logic.finishDue(stored, now, id);
      const accepted = [];
      const result = operation(stored, now, accepted);
      if (stored.revision === before) return result;
      try {
        await store.commit(id, before, {revision: stored.revision, sequence: stored.sequence, previousTime: now,
          sourceSha: stored.world.sourceSha, world: stored.world}, accepted, receipts);
        return result;
      } catch (error) {
        if (!(error instanceof WarOuterOpsConflictV130)) throw error;
      }
    }
    throw new Error('Campagne Outer Ops trop disputée.');
  }

  return createClanWarHttpServiceV127({
    authenticate,
    view: identity => withAccount(identity.id, (stored, now) => logic.snapshot(identity.id, stored, now)),
    submit: (identity, order) => validOrder(order)
      ? withAccount(identity.id, (stored, now, accepted) => {
        const result = logic.apply(identity.id, stored, order, now);
        if (result.status === 200) accepted.push({id: order.id, sequence: order.sequence, kind: order.kind, acceptedAt: now});
        return result;
      })
      : {status: 400, error: 'invalid-order'},
    tickMs,
    tick: async () => {
      for (const id of await store.list()) await withAccount(id, () => {});
    },
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.YAUTJA_CLAN_OUTER_PORT ?? 8790);
  const signing = Buffer.from(process.env.YAUTJA_CLAN_OUTER_SIGNING_SECRET ?? '', 'hex');
  try {
    if (!Number.isSafeInteger(port) || port < 1 || port > 65535 || signing.length < 32) {
      throw new Error('Renseignez un port valide et YAUTJA_CLAN_OUTER_SIGNING_SECRET (64 caractères hexadécimaux).');
    }
    const url = process.env.SUPABASE_URL;
    const server = createWarOuterOpsAccountsServerV130(await loadWarOuterOpsRulesV115(), {
      store: createSupabaseOuterOpsStoreV130({url, serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY}),
      authenticate: createSupabaseIdentityV130({url, apiKey: process.env.SUPABASE_PUBLISHABLE_KEY}),
      secret: signing,
    });
    server.on('error', error => {
      process.stderr.write('Impossible d’ouvrir le service Outer Ops (' + (error.code ?? 'erreur') + ').\n');
      process.exitCode = 1;
    });
    server.listen(port, '127.0.0.1', () => process.stdout.write('Outer Ops V130 par comptes sur http://127.0.0.1:' + port + '\n'));
  } catch (error) {
    process.stderr.write(error.message + '\n');
    process.exitCode = 1;
  }
}
