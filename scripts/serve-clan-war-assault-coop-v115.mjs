import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadWarAssaultReplayRulesV115} from './replay-clan-war-assault-v115.mjs';
import {clanWarTokenIdentitiesV127, createClanWarHttpServiceV127} from './serve-clan-war-practice-v127.mjs';

const commands = {
  deploy: 'deployAssaultUnitV115',
  cloak: 'toggleWarAssaultCloakV115',
  hold: 'orderWarAssaultHoldV136',
  withdraw: 'withdrawWarAssaultSquadV137',
};
const kinds = new Set(['ready', 'launch', 'upgrade-ap', ...Object.keys(commands)]);

function validCoopOrder(order) {
  return order && typeof order === 'object' && !Array.isArray(order) && Object.keys(order).length === 6 &&
    typeof order.id === 'string' && /^[A-Za-z0-9_-]{1,48}$/.test(order.id) &&
    Number.isSafeInteger(order.sequence) && order.sequence > 0 &&
    Number.isSafeInteger(order.revision) && order.revision >= 0 &&
    Number.isSafeInteger(order.tick) && order.tick >= 0 && kinds.has(order.kind) && order.target === null;
}

export function createWarCoopAssaultServerV115(game, {tokens, targetId, startedAt = 0, tickMs = 1500} = {}) {
  if (!Array.isArray(tokens) || tokens.length < 2 || tokens.length > 4) {
    throw new Error('Un assaut coopératif exige deux à quatre clés de soldat.');
  }
  if (!Number.isSafeInteger(tickMs) || tickMs < 250 || tickMs > 60000) {
    throw new Error('La durée d’un tick doit être comprise entre 250 et 60000 ms.');
  }
  const rules = game.DEFAULT_WAR_RULES_V6;
  let world = game.createWarOperationsV115(rules);
  const pc = team => rules.units.find(unit => unit.id === team.unitId).commandPoints;
  const teams = [...world.teams].sort((a, b) => pc(a) - pc(b)).slice(0, tokens.length);
  const teamIds = teams.map(team => team.id);
  const territory = targetId ?? rules.territories.find(site =>
    !game.warMissionEligibleV115(world, rules, site.id, teamIds))?.id;
  const eligibility = game.warMissionEligibleV115(world, rules, territory, teamIds);
  if (eligibility) throw new Error(eligibility);

  const identities = clanWarTokenIdentitiesV127(tokens.map((token, index) => ({
    token, team: teams[index], role: index === 0 ? 'commander' : 'wing',
  })));
  const ready = new Set();
  const progress = new Map(identities.map(identity => [identity, {sequence: 0, receipts: new Set()}]));
  let revision = 0;
  let field = null;
  let report = null;

  function advance(update) {
    world = update.state;
    field = update.assaultStep?.field ?? world.active ?? field;
    report = field ? world.reports.find(item => item.id === field.id) ?? null : null;
    revision++;
  }

  function deploymentBlocked() {
    return field?.assault.actors.some(actor => actor.side === 'ally' && actor.hp > 0 && actor.x <= 5) ?? false;
  }

  function view(identity) {
    const arena = field?.assault;
    const allies = arena?.actors.filter(actor => actor.side === 'ally') ?? [];
    const visible = arena?.actors.filter(actor => actor.side === 'ally' ||
      allies.some(ally => Math.abs(ally.x - actor.x) <= 7)) ?? [];
    return {
      mode: 'co-op-assault', targetId: territory, role: identity.role, teamId: identity.team.id,
      stage: report ? 'completed' : field ? 'started' : 'planning',
      revision, tick: field?.tick ?? 0, nextSequence: progress.get(identity).sequence + 1,
      roster: identities.map(player => ({id: player.team.id, unitId: player.team.unitId,
        commander: player.role === 'commander', ready: ready.has(player)})),
      requisition: {
        ap: arena?.ap ?? null, pc: teams.reduce((total, team) => total + pc(team), 0),
        rav: world.rav, deployAp: Math.max(8, Math.min(72, pc(identity.team) * 8)),
      },
      deploymentAvailable: !report && Boolean(arena) && !deploymentBlocked(),
      bastions: arena ? {ally: arena.ownBase, rival: arena.rivalBase} : null,
      fighters: visible.map(({teamId, side, x, hp, assaultCloak}) => ({
        teamId, side, x, hp, ...(assaultCloak ? {cloak: assaultCloak} : {}),
      })),
      report: report ? {id: report.id, outcome: report.outcome, tick: field.tick} : null,
    };
  }

  function submit(identity, order) {
    if (!validCoopOrder(order)) return {status: 400, error: 'invalid-order'};
    const personal = progress.get(identity);
    if (personal.receipts.has(order.id)) return {status: 409, error: 'duplicate-order'};
    if (personal.receipts.size >= 512) return {status: 422, error: 'order-limit'};
    if (order.revision !== revision || order.tick !== (field?.tick ?? 0) ||
        order.sequence !== personal.sequence + 1) {
      return {status: 409, error: 'state-changed'};
    }
    if (order.kind === 'ready' && !field && !ready.has(identity)) {
      ready.add(identity);
      revision++;
    } else {
      let update;
      if (!field && order.kind === 'launch' && ready.size === identities.length && identity.role === 'commander') {
        update = game.beginWarOperationV115(world, 'assault', territory, teamIds, rules, startedAt);
      } else if (world.active && order.kind === 'upgrade-ap' && identity.role === 'commander') {
        update = game.upgradeWarAssaultApV117(world);
      } else if (world.active && Object.hasOwn(commands, order.kind)) {
        if (order.kind === 'deploy' && deploymentBlocked()) return {status: 409, error: 'deployment-occupied'};
        update = game[commands[order.kind]](world, identity.team.id, rules);
      }
      if (!update?.accepted) return {status: 422, error: 'order-refused'};
      advance(update);
    }
    personal.sequence = order.sequence;
    personal.receipts.add(order.id);
    return {status: 200, state: view(identity)};
  }

  function tick() {
    if (!world.active) return;
    const result = game.stepAssaultV115(world, rules);
    if (result.accepted) advance(result);
  }

  return createClanWarHttpServiceV127({identities, view, submit, tick, tickMs});
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.YAUTJA_CLAN_COOP_PORT ?? 8788);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new Error('Port de salon invalide.');
  let tokens;
  try {
    tokens = JSON.parse(process.env.YAUTJA_CLAN_COOP_TOKENS ?? '[]');
  } catch {
    throw new Error('YAUTJA_CLAN_COOP_TOKENS doit contenir un tableau JSON de clés.');
  }
  const server = createWarCoopAssaultServerV115(await loadWarAssaultReplayRulesV115(), {
    tokens, targetId: process.env.YAUTJA_CLAN_COOP_TARGET,
  });
  server.on('error', error => {
    process.stderr.write('Impossible d’ouvrir le salon (' + (error.code ?? 'erreur') + ').\n');
    process.exitCode = 1;
  });
  server.listen(port, '127.0.0.1', () => {
    process.stdout.write('Assaut coopératif V115 sur http://127.0.0.1:' + port + '\n');
  });
}
