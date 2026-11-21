import {createHash} from 'node:crypto';
import {readFile, stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {build} from 'esbuild';

const recipeSchema = 'yautja-assault-recipe-v115';
const traceSchema = 'yautja-assault-replay-v115';
const exportsByFile = {
  clanWarBibleV6: ['DEFAULT_WAR_RULES_V6'],
  clanWarOperationsV115: [
    'createWarOperationsV115', 'readWarOperationsV115', 'warMissionEligibleV115',
    'beginWarOperationV115', 'leaveWarOperationV115', 'stepAssaultV115',
    'deployAssaultUnitV115', 'toggleWarAssaultCloakV115', 'upgradeWarAssaultApV117',
    'issueWarAssaultSpecialV117', 'warAssaultWaveProfileV140',
  ],
  clanWarParallelModesV135: ['reinforceWarAssaultLineV135'],
  clanWarParallelModesV136: ['orderWarAssaultHoldV136'],
  clanWarParallelModesV137: ['withdrawWarAssaultSquadV137'],
  clanWarParallelModesV138: ['commandWarAssaultSurgeV138'],
  clanWarParallelModesV139: ['fallbackWarAssaultV139'],
  clanWarFocusV142: ['issueWarAssaultFocusV142'],
  clanWarBraceV143: ['commandWarAssaultBraceV143'],
  clanWarRegroupV144: ['commandWarAssaultRegroupV144'],
  clanWarInterposeV145: ['commandWarAssaultInterposeV145'],
  clanWarAssaultRegroupV144: ['regroupWarAssaultV144'],
  clanWarBaseScreenV144: ['commandWarAssaultBaseScreenV144'],
};
const orders = {
  tick: ['stepAssaultV115', 0],
  retreat: ['leaveWarOperationV115', 0],
  'upgrade-ap': ['upgradeWarAssaultApV117', 0],
  deploy: ['deployAssaultUnitV115', 1],
  cloak: ['toggleWarAssaultCloakV115', 1],
  special: ['issueWarAssaultSpecialV117', 1],
  reinforce: ['reinforceWarAssaultLineV135', 1],
  hold: ['orderWarAssaultHoldV136', 1],
  withdraw: ['withdrawWarAssaultSquadV137', 1],
  surge: ['commandWarAssaultSurgeV138', 1],
  fallback: ['fallbackWarAssaultV139', 1],
  focus: ['issueWarAssaultFocusV142', 2],
  brace: ['commandWarAssaultBraceV143', 1],
  'regroup-pair': ['commandWarAssaultRegroupV144', 2],
  interpose: ['commandWarAssaultInterposeV145', 2],
  'regroup-support': ['regroupWarAssaultV144', 2],
  'base-screen': ['commandWarAssaultBaseScreenV144', 1],
};

export async function loadWarAssaultReplayRulesV115() {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const contents = Object.entries(exportsByFile).map(([file, symbols]) =>
    "export {" + symbols.join(',') + "} from './app/game/systems/" + file + "';",
  ).join('\n');
  const result = await build({
    stdin: {contents, resolveDir: root}, absWorkingDir: root,
    bundle: true, write: false, format: 'esm', platform: 'node', target: 'node22',
  });
  return import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].contents).toString('base64'));
}

export function assaultReplayChecksumV115(value) {
  const text = JSON.stringify(value, (_key, entry) =>
    entry !== null && typeof entry === 'object' && !Array.isArray(entry)
      ? Object.fromEntries(Object.keys(entry).sort().map(key => [key, entry[key]]))
      : entry,
  );
  return createHash('sha256').update(text).digest('hex');
}

function readRecipe(recipe) {
  const isId = value => typeof value === 'string' && value.length > 0 && value.length <= 120;
  if (!recipe || recipe.schema !== recipeSchema || !Number.isSafeInteger(recipe.startedAt) ||
      recipe.startedAt < 0 || !isId(recipe.targetId) || !Array.isArray(recipe.teamIds) ||
      recipe.teamIds.length < 1 || recipe.teamIds.length > 16 || !recipe.teamIds.every(isId) ||
      new Set(recipe.teamIds).size !== recipe.teamIds.length || !Array.isArray(recipe.commands) ||
      recipe.commands.length > 256 || typeof recipe.finish !== 'boolean' ||
      (recipe.initial !== null && (typeof recipe.initial !== 'object' || Array.isArray(recipe.initial)))) {
    throw new Error('Recette d’assaut invalide.');
  }
  for (const command of recipe.commands) {
    if (!Array.isArray(command) || typeof command[0] !== 'string' || !Object.hasOwn(orders, command[0]) ||
        command.length !== 1 + orders[command[0]][1] || !command.slice(1).every(isId)) {
      throw new Error('Ordre de replay inconnu ou incomplet.');
    }
  }
  const {initial, startedAt, targetId, teamIds, commands, finish} = recipe;
  return {schema: recipeSchema, initial, startedAt, targetId, teamIds, commands, finish};
}

function tacticalFrame(state, mission, rules) {
  const arena = mission.assault;
  const actorIds = new Set(arena.actors.filter(actor => actor.teamId).map(actor => actor.teamId));
  const pcFor = team => rules.units.find(unit => unit.id === team.unitId).commandPoints;
  const selected = state.teams.filter(team => mission.teamIds.includes(team.id));
  return {
    clock: state.clock, tick: mission.tick, ap: arena.ap, rav: state.rav,
    pc: {
      alliedAssigned: selected.reduce((total, team) => total + pcFor(team), 0),
      alliedDeployed: selected.filter(team => actorIds.has(team.id)).reduce((total, team) => total + pcFor(team), 0),
      rivalWaveCommitted: (arena.spawnedWaves ?? []).reduce((total, wave) => total + wave.commandPoints, 0),
    },
    bastions: {allied: arena.ownBase, rival: arena.rivalBase},
    actors: arena.actors.map(actor => ({
      id: actor.id, unitId: actor.unitId, teamId: actor.teamId, side: actor.side, x: actor.x, hp: actor.hp,
      ...(actor.assaultCloak ? {cloak: actor.assaultCloak} : {}),
    })),
    fallenTeamIds: [...arena.fallen], withdrawnTeamIds: [...(arena.extractedIds ?? [])],
    waves: (arena.spawnedWaves ?? []).map(wave => wave.id),
  };
}

export function recordAssaultReplayV115(game, input) {
  const recipe = readRecipe(input);
  const rules = game.DEFAULT_WAR_RULES_V6;
  const initial = recipe.initial === null ? game.createWarOperationsV115(rules)
    : game.readWarOperationsV115(JSON.stringify(recipe.initial), rules);
  if (!initial || initial.active) throw new Error('Archive initiale V115 invalide ou mission déjà en cours.');
  const launch = game.beginWarOperationV115(initial, 'assault', recipe.targetId, recipe.teamIds, rules, recipe.startedAt);
  if (!launch.accepted) throw new Error(launch.message);
  let state = launch.state;
  let mission = state.active;
  const missionId = mission.id;
  const frames = [{
    command: ['begin'], accepted: true, message: launch.message,
    stateDigest: assaultReplayChecksumV115(state), ...tacticalFrame(state, mission, rules),
  }];
  function execute(command) {
    if (!state.active) throw new Error('La recette contient un ordre après le rapport final.');
    const [kind, ...args] = command;
    const next = game[orders[kind][0]](state, ...args, rules);
    state = next.state;
    const step = next.assaultStep;
    mission = step?.field ?? state.active ?? mission;
    frames.push({
      command, accepted: next.accepted, message: next.message,
      stateDigest: assaultReplayChecksumV115(state), ...tacticalFrame(state, mission, rules),
      ...(step ? {exchange: {shots: step.shots, defeated: step.defeated}} : {}),
    });
  }
  for (const command of recipe.commands) execute(command);
  if (recipe.finish) {
    for (let guard = 0; state.active && guard < 95; guard++) execute(['tick']);
    if (state.active) throw new Error('L’assaut a dépassé le plafond de 95 tours.');
  }
  const territory = rules.territories.find(site => site.id === recipe.targetId);
  const payload = {
    schema: traceSchema, recipe,
    seedInputs: {
      sourceSha: initial.sourceSha, initialDigest: assaultReplayChecksumV115(initial), missionId, startedAt: recipe.startedAt,
      regionalSeed: game.warAssaultWaveProfileV140(territory.id, rules).regionalSeed,
      waveTerritory: {id: territory.id, region: territory.region, column: territory.column, row: territory.row},
    },
    frames, finalStateDigest: assaultReplayChecksumV115(state),
    report: state.reports.find(report => report.id === missionId) ?? null,
  };
  return {...payload, sha256: assaultReplayChecksumV115(payload)};
}

export function verifyAssaultReplayV115(game, replay) {
  if (!replay || replay.schema !== traceSchema) throw new Error('Format de replay inconnu.');
  const {sha256, ...payload} = replay;
  if (assaultReplayChecksumV115(payload) !== sha256) throw new Error('Empreinte du replay invalide.');
  const regenerated = recordAssaultReplayV115(game, replay.recipe);
  if (regenerated.sha256 !== sha256) throw new Error('Le moteur courant ne reproduit pas le replay.');
  return {verified: true, sha256, frames: regenerated.frames.length, report: regenerated.report};
}

export function sampleAssaultReplayV115(game) {
  const rules = game.DEFAULT_WAR_RULES_V6;
  const state = game.createWarOperationsV115(rules);
  const teamIds = [state.teams[0].id];
  const target = rules.territories.find(site => site.id !== state.baseId && site.garrisonPc > 0 &&
    !game.warMissionEligibleV115(state, rules, site.id, teamIds));
  if (!target) throw new Error('Aucun passage source praticable depuis le bastion initial.');
  return {
    schema: recipeSchema, initial: null, startedAt: 0, targetId: target.id, teamIds,
    commands: [['tick'], ['tick'], ['tick'], ['tick'], ['tick'], ['tick'], ['deploy', teamIds[0]]],
    finish: true,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    const [verb, file] = args;
    if (!(verb === 'example' && args.length === 1 || ['record', 'verify'].includes(verb) && args.length === 2)) {
      throw new Error('Usage : replay-clan-war-assault-v115.mjs example | record fichier.json | verify fichier.json');
    }
    const game = await loadWarAssaultReplayRulesV115();
    let result;
    if (verb === 'example') {
      result = sampleAssaultReplayV115(game);
    } else {
      if ((await stat(file)).size > 16 * 1024 * 1024) throw new Error('Le fichier dépasse 16 Mio.');
      const input = JSON.parse(await readFile(file, 'utf8'));
      result = verb === 'record' ? recordAssaultReplayV115(game, input) : verifyAssaultReplayV115(game, input);
    }
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } catch (error) {
    process.stderr.write(error.message + '\n');
    process.exitCode = 1;
  }
}
