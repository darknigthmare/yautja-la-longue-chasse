import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { homeworldSceneSsrV78 } from '../../tests/helpers/homeworld-scene-ssr-v78.mjs';

// Read-only catalogue extraction. This script does not author the workbook or
// modify gameplay. Its companion builder uses only the bundled Artifact Tool.
const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, '../..');
const loader = homeworldSceneSsrV78(root);
const operations = loader.load('app/game/systems/clanShipOperations.ts');
const space = loader.load('app/game/systems/clanShipSpaceEncounter.ts');
const interior = loader.load('app/game/systems/clanShipInterior.ts');
const crewArt = loader.load('app/game/clanShipCrew.ts');
const variants = loader.load('app/game/systems/homeworldNpcVariantsV84.ts');
const missions = loader.load('app/game/data.ts').MISSION_BY_ID;
const shipArt = loader.load('app/game/shipInteriorKit.ts').SHIP_LEVEL_ART;
const shipArtV22 = loader.load('app/game/shipInteriorV22.ts').SHIP_LEVEL_ART_V22;
const ships = loader.load('app/game/shipCatalogue.ts');

const sourcePaths = [
  'app/game/systems/clanShipOperations.ts',
  'app/game/systems/clanShipSpaceEncounter.ts',
  'app/game/systems/clanShipInterior.ts',
  'app/game/systems/clanShipDocking.ts',
  'app/game/clanShipCrew.ts',
  'app/game/ClanShipOperationsPanel.tsx',
  'app/game/ClanShipOperationsPanel.module.css',
  'app/game/ClanShipSpaceEncounter.tsx',
  'app/game/ClanShipSpaceEncounter.module.css',
  'app/game/ClanShipHub.tsx',
  'app/game/ClanShipInterior.tsx',
  'app/game/ClanShipInterior.module.css',
  'app/game/GameClient.tsx',
  'app/game/save.ts',
  'app/game/types.ts',
  'app/dev/session.tsx',
  'app/game/data.ts',
  'app/game/shipInteriorKit.ts',
  'app/game/shipInteriorV22.ts',
  'app/game/shipCatalogue.ts',
  'app/game/data/homeworldNpcVariantsV84.json',
  'public/game/clan-ship/props/manifest.json',
].sort();
const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');
const sourceFiles = sourcePaths.map(file => {
  const bytes = fs.readFileSync(path.join(root, file));
  return { path: file, bytes: bytes.length, sha256: sha256(bytes) };
});
function assetRecord(src) {
  const filename = path.join(root, 'public', src.replace(/^\//, ''));
  if (!fs.existsSync(filename)) return { src, materialized: false, bytes: null, sha256: null };
  const bytes = fs.readFileSync(filename);
  return { src, materialized: true, bytes: bytes.length, sha256: sha256(bytes) };
}
const props = JSON.parse(fs.readFileSync(path.join(root, 'public/game/clan-ship/props/manifest.json'), 'utf8'));
const contracts = operations.CLAN_SHIP_CONTRACTS.map(item => ({
  ...item,
  mission: item.missionId ? {
    id: item.missionId,
    name: missions[item.missionId]?.name ?? missions[item.missionId]?.title ?? item.missionId,
    targetName: missions[item.missionId]?.targetName ?? null,
  } : null,
}));
const crew = operations.CLAN_SHIP_RECRUITS.map(item => {
  const identity = crewArt.clanShipCrewArtIdentity(item.id);
  const role = crewArt.CLAN_SHIP_CREW_ART_ROLES[item.id];
  const variant = variants.homeworldNpcVariantV84(identity, role);
  if (!variant) throw new Error(`Missing current crew drawing: ${item.id}`);
  return {
    ...item,
    tacticalEffect: space.CLAN_SHIP_SPACE_CREW_EFFECTS[item.spaceCrewRole],
    art: { identity, role, variantId: variant.id, sourceWidth: variant.sourceWidth,
      sourceHeight: variant.sourceHeight, alphaBounds: variant.alphaBounds,
      motionStatus: variant.motionStatus, ...assetRecord(variant.src) },
  };
});
const result = {
  version: 1,
  extractedAt: new Date().toISOString(),
  timezone: 'Europe/Paris',
  branch: execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim(),
  checkoutCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  sourceDigest: sha256(JSON.stringify(sourceFiles)),
  sourceFiles,
  sourceHasUncommittedChanges: execFileSync('git', ['status', '--porcelain', '--', ...sourcePaths], { cwd: root, encoding: 'utf8' }).trim().length > 0,
  contracts,
  crew,
  rooms: interior.CLAN_SHIP_INTERIOR_ROOM_ORDER.map(id => interior.CLAN_SHIP_INTERIOR_ROOMS[id]),
  geometry: interior.CLAN_SHIP_INTERIOR_METRICS,
  space: {
    maxTurns: space.CLAN_SHIP_SPACE_MAX_TURNS,
    maxEnergy: space.CLAN_SHIP_SPACE_MAX_ENERGY,
    initialEnergy: space.createClanShipSpaceEncounter('escort').energy,
    scenarios: space.CLAN_SHIP_SPACE_KINDS.map(kind => ({ id: kind, ...space.CLAN_SHIP_SPACE_SCENARIOS[kind] })),
    orders: space.CLAN_SHIP_SPACE_ORDERS.map(id => {
      const available = space.clanShipSpaceOrderAvailability(space.createClanShipSpaceEncounter('interception'), id);
      return { id, label: available.label, detail: available.detail, cost: available.cost };
    }),
  },
  backgrounds: interior.CLAN_SHIP_INTERIOR_ROOM_ORDER.map(roomId => ({
    id: `room-${roomId}`, roomId, ...assetRecord(`/game/clan-ship/interiors/${roomId}-v1.webp`),
  })),
  props: Object.entries(props.assets).map(([id, data]) => ({ id, ...data, ...assetRecord(data.src) })),
  sharedArt: [
    { id: 'shared-navigation-console', name: 'Console de navigation réemployée', use: 'archives', ...shipArt.navigationConsole },
    { id: 'shared-archive-terminal', name: 'Terminal de poste réemployé', use: 'hangar, conseil, trophées et soins', ...shipArtV22.archiveTerminal },
    { id: 'shared-armory-rack', name: 'Râtelier réemployé', use: 'entraînement', ...shipArtV22.armoryRack },
    { id: 'shared-door-frame', name: 'Cadre de porte', use: 'portes des sept salles', ...shipArt.doorFrame },
    { id: 'shared-door-leaf', name: 'Battant de porte', use: 'portes des sept salles', ...shipArt.doorLeaf },
    { id: 'shared-mothership', name: 'Vaisseau mère AVP', use: 'approche collective', src: ships.shipProfileAssetPath('avp-predator-mothership') },
    { id: 'shared-personal-classic', name: 'Coque personnelle classique', use: 'exemple de coque personnelle ; le rendu réel suit la coque possédée', src: ships.shipProfileAssetPath('classic-predator-spaceship') },
  ].map(item => ({ ...item, ...assetRecord(item.src) })),
};
if (contracts.length !== 12 || crew.length !== 6 || new Set(crew.map(item => item.art.src)).size !== 6) {
  throw new Error('The documented twelve contracts / six individual crew drawings require reconciliation.');
}
const target = path.join(directory, 'operations-catalogue.json');
fs.writeFileSync(target, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ target, contracts: contracts.length, interiorSteps: contracts.reduce((count, item) => count + item.steps.length, 0),
  crew: crew.length, sourceDigest: result.sourceDigest, missingLocalAssets: [...result.backgrounds, ...result.props, ...result.sharedArt, ...crew.map(item => item.art)].filter(item => !item.materialized).map(item => item.src) }));
