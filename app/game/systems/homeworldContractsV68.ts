import { homeworldInteriorForBuildingV64, isHomeworldInteriorWalkableV64, nearestHomeworldInteriorTargetV64 } from './homeworldInteriorsV64';
import { normalizeRegionFieldEventV68 } from './homeworldRegionsV68';
import { HOMEWORLD_CHAIN_CONTRACTS_V69, type ContractChainV69 } from './homeworldContractChainsV69';

/** Local clan commissions. This board, its marks and its regional fauna are
 * authored for this game, not a canonical bounty economy or a film prop copy. */
export const CONTRACT_REGIONS_V68 = ['ash-marches', 'glass-desert', 'pillar-jungle', 'luminous-marshes', 'storm-chain',
  'leviathan-coast', 'thermal-caves', 'cold-crown', 'first-city-ruins', 'forbidden-reserve'] as const;
export type ContractRegionIdV68 = typeof CONTRACT_REGIONS_V68[number];
export type ContractFieldActionV68 = 'survey' | 'track' | 'recover' | 'ward' | 'challenge';
export type ContractCategoryV68 = 'tracking' | 'recovery' | 'protection' | 'challenge' | 'npc';
export interface ContractObjectiveV68 { regionId: ContractRegionIdV68; action: ContractFieldActionV68; text: string }
export interface ContractDefinitionV68 {
  id: string; title: string; category: ContractCategoryV68; giverNpcId: string; giverName: string;
  pointId: string; buildingId: string; brief: string; restriction: string; rewardMarks: number;
  objectives: readonly ContractObjectiveV68[];
  /** V69 additions only. Existing V68 commissions retain their exact data and
   * parallel objectives; new circuits require ordered guide-confirmed stages. */
  chain?: ContractChainV69; prerequisites?: readonly string[]; sequential?: boolean; completionText?: string;
}
export const CONTRACT_BOARD_LOCATION_V68 = { npcId: 'market-artisan', npcName: 'Artisane du marché',
  pointId: 'market-service', buildingId: 'market-armory' } as const;
const REGION_NAMES_V68: Record<ContractRegionIdV68, string> = {
  'ash-marches': 'Marches de Cendre', 'glass-desert': 'Désert de Verre', 'pillar-jungle': 'Jungle des Piliers',
  'luminous-marshes': 'Marais Luminescents', 'storm-chain': 'Chaîne des Orages', 'leviathan-coast': 'Côte des Léviathans',
  'thermal-caves': 'Grottes Thermiques', 'cold-crown': 'Couronne Froide', 'first-city-ruins': 'Ruines de la Première Cité',
  'forbidden-reserve': 'Réserve Interdite',
};
const contract = (regionId: ContractRegionIdV68, action: ContractFieldActionV68, title: string, text: string,
  restriction: string, rewardMarks: number): ContractDefinitionV68 => ({
  id: `${regionId}-${action}`, title,
  category: action === 'track' || action === 'survey' ? 'tracking' : action === 'recover' ? 'recovery' : action === 'ward' ? 'protection' : 'challenge',
  giverNpcId: CONTRACT_BOARD_LOCATION_V68.npcId, giverName: CONTRACT_BOARD_LOCATION_V68.npcName,
  pointId: CONTRACT_BOARD_LOCATION_V68.pointId, buildingId: CONTRACT_BOARD_LOCATION_V68.buildingId,
  brief: `${REGION_NAMES_V68[regionId]} · ${text}`, restriction, rewardMarks, objectives: [{ regionId, action, text }],
});
export const HOMEWORLD_BOARD_CONTRACTS_V68: readonly ContractDefinitionV68[] = [
  contract('ash-marches', 'track', 'Sous la cuirasse de cendre', 'Relève trois pistes puis observe le brouteur cuirassé sans entrer dans sa charge.', 'Le brouteur reste vivant ; une trace ne vaut pas une prise.', 18),
  contract('ash-marches', 'challenge', 'Tenir face au cuirassé', 'Lis les pistes, évite deux charges et place trois touches pendant les reprises du cuirassé.', 'Épreuve non létale. Ne poursuis pas la créature lorsqu’elle se retire.', 30),
  contract('glass-desert', 'track', 'Le sillon sous le verre', 'Compare trois traces et observe le fouisseur pendant une accalmie.', 'Ne frappe pas le sol vitrifié près du village.', 20),
  contract('glass-desert', 'challenge', 'La riposte du fouisseur', 'Repère la proie, évite deux sorties du fouisseur et place trois touches lors de sa reprise.', 'La confrontation se termine au retrait de la proie, sans crâne attribué.', 32),
  contract('pillar-jungle', 'track', 'Les perchoirs du traqueur', 'Lis trois marques de perchoir puis observe le traqueur des piliers depuis le chemin.', 'Aucun tir à travers les abris de clan.', 22),
  contract('pillar-jungle', 'ward', 'Garder les passerelles', 'Après le relevé des pistes, protège deux balises pendant les accalmies du danger local.', 'Le passage du village compte davantage qu’une poursuite hors de la route.', 26),
  contract('luminous-marshes', 'track', 'Les rides qui reviennent', 'Suis trois rides de l’eau et observe la silhouette qui réapparaît entre les racines.', 'Respecte les zones de repos des habitants.', 22),
  contract('luminous-marshes', 'ward', 'Deux lumières sur les racines', 'Relève les traces, évite le danger et stabilise les deux balises du passage humide.', 'Reste sur la route ; aucun animal n’est une cible obligatoire.', 26),
  contract('storm-chain', 'track', 'Une ombre dans le vent', 'Lis trois traces puis observe le planeur cuirassé entre les rafales.', 'L’observation se fait depuis le chemin, sans sauter dans le ravin.', 24),
  contract('storm-chain', 'ward', 'La ligne des guetteurs', 'Repère les pistes, évite une rafale et protège les deux balises du retour.', 'Attends la fenêtre de vent avant chaque intervention.', 28),
  contract('leviathan-coast', 'track', 'Le souffle au large', 'Recoupe trois indices du rivage et observe la présence côtière depuis la terre ferme.', 'Aucune chasse en pleine mer ni prise de léviathan n’est attestée par ce relevé.', 24),
  contract('leviathan-coast', 'challenge', 'Le gardien du rivage', 'Suis les traces et affronte la proie côtière : deux charges évitées, trois touches de reprise.', 'Seule la proie territoriale proche du rivage est engagée ; ce n’est pas un léviathan tué.', 34),
  contract('thermal-caves', 'survey', 'Ce que la chaleur dissimule', 'Compare trois traces physiques malgré la vapeur et les signatures brouillées.', 'Ne prétends pas que le thermique suffit à identifier une présence.', 20),
  contract('thermal-caves', 'recover', 'La balise du conduit', 'Après les trois indices, évite une émission de vapeur puis récupère la caisse de balises.', 'Récupère le matériel pendant l’accalmie, sans toucher aux installations de clan.', 26),
  contract('cold-crown', 'track', 'La piste sans chaleur', 'Lis trois traces physiques puis observe le carnivore isolé thermiquement.', 'Les empreintes comptent ; aucune jauge de froid ne remplace la préparation.', 24),
  contract('cold-crown', 'recover', 'Les balises de l’ancienne cordée', 'Retrouve les trois indices, évite le danger de glace et rapporte la caisse de balises.', 'Ne t’attribue pas les affaires personnelles des anciennes expéditions.', 28),
  contract('first-city-ruins', 'survey', 'Les marques sous les ajouts', 'Relève trois indices du site patrimonial et distingue les traces des installations récentes.', 'Aucune archive scellée n’est ouverte par ce contrat.', 22),
  contract('first-city-ruins', 'recover', 'Le relais déplacé', 'Après le relevé, évite la sentinelle du passage et récupère la caisse de balises mobile.', 'Laisse les éléments patrimoniaux en place.', 30),
  contract('forbidden-reserve', 'survey', 'Les limites du confinement', 'Relève les trois indices autour de la station d’observation autorisée.', 'Les créatures importées ne sont pas la faune ordinaire de la planète ; aucune enceinte n’est ouverte.', 24),
  contract('forbidden-reserve', 'recover', 'Un signal à l’extérieur', 'Relève les traces, évite le danger du chemin et rapporte la caisse extérieure de balises.', 'N’entre pas dans un enclos et ne transporte aucune créature.', 32),
];
export const HOMEWORLD_NPC_CONTRACTS_V68: readonly ContractDefinitionV68[] = [
  { id: 'npc-healer-safe-footing', title: 'Des appuis pour le retour', category: 'npc', giverNpcId: 'clan-healer', giverName: 'Soigneuse des délégations',
    pointId: 'medbay-service', buildingId: 'clan-lodge', rewardMarks: 38,
    brief: 'Les délégations ont besoin de repères dans l’eau et dans la vapeur. Protège les balises du marais, puis relève les traces des grottes. Ramène les deux observations à cette maison.',
    restriction: 'Il s’agit de préparer des retours, sans soin improvisé ni promesse que toute la région est sûre.',
    objectives: [{ regionId: 'luminous-marshes', action: 'ward', text: 'Protéger les deux balises des Marais.' }, { regionId: 'thermal-caves', action: 'survey', text: 'Relever les trois indices des Grottes.' }] },
  { id: 'npc-dock-return-line', title: 'La route des guetteurs', category: 'npc', giverNpcId: 'dock-officer', giverName: 'Officier des quais',
    pointId: 'dock-officer-point', buildingId: 'dock-control', rewardMarks: 40,
    brief: 'Une escorte doit savoir ce qui bouge entre les falaises et le rivage. Protège les deux balises de la Chaîne, puis observe la présence côtière. Reviens aux quais avec les rapports des guides.',
    restriction: 'Le contrat prépare un trajet. Il ne délivre ni vaisseau personnel ni départ orbital.',
    objectives: [{ regionId: 'storm-chain', action: 'ward', text: 'Protéger les balises des Orages.' }, { regionId: 'leviathan-coast', action: 'track', text: 'Observer la présence de la Côte.' }] },
  { id: 'npc-memory-two-histories', title: 'Deux mémoires du terrain', category: 'npc', giverNpcId: 'memory-keeper', giverName: 'Conservatrice des marques',
    pointId: 'memory-register-point', buildingId: 'memory-vault', rewardMarks: 42,
    brief: 'Les vestiges ne racontent pas tous la même époque. Relève les traces des Ruines, puis récupère les balises d’expédition de la Couronne. Les guides doivent confirmer les deux retours avant ta remise ici.',
    restriction: 'Le relevé ne prouve aucune culpabilité et ne débloque aucune archive royale.',
    objectives: [{ regionId: 'first-city-ruins', action: 'survey', text: 'Relever les traces des Ruines.' }, { regionId: 'cold-crown', action: 'recover', text: 'Récupérer la caisse de la Couronne.' }] },
  { id: 'npc-forge-relay-cases', title: 'Des boîtiers sans trophée', category: 'npc', giverNpcId: 'forge-artisan', giverName: 'Maîtresse des parures',
    pointId: 'forge-service', buildingId: 'deep-forge', rewardMarks: 36,
    brief: 'Observe le cuirassé des Cendres puis le fouisseur du Verre. Leurs mouvements permettront d’implanter les futurs relais sans confondre une installation utile avec un défi inutile.',
    restriction: 'Ces observations ne donnent ni arme, ni parure gratuite, ni trophée vivant.',
    objectives: [{ regionId: 'ash-marches', action: 'track', text: 'Observer le cuirassé des Cendres.' }, { regionId: 'glass-desert', action: 'track', text: 'Observer le fouisseur du Verre.' }] },
];
export const HOMEWORLD_CONTRACTS_V68 = [...HOMEWORLD_BOARD_CONTRACTS_V68, ...HOMEWORLD_NPC_CONTRACTS_V68] as const;
export { HOMEWORLD_CHAIN_CONTRACTS_V69 };
export const HOMEWORLD_ALL_CONTRACTS_V69: readonly ContractDefinitionV68[] = [...HOMEWORLD_CONTRACTS_V68, ...HOMEWORLD_CHAIN_CONTRACTS_V69];
const contractFor = (id: unknown) => typeof id === 'string' ? HOMEWORLD_ALL_CONTRACTS_V69.find(item => item.id === id) ?? null : null;
const record = (raw: unknown): raw is Record<string, unknown> => !!raw && typeof raw === 'object' && !Array.isArray(raw);
const integer = (raw: unknown, minimum = 0, maximum = 5_184_000): raw is number => typeof raw === 'number' && Number.isSafeInteger(raw) && raw >= minimum && raw <= maximum;
const runIdValid = (raw: unknown): raw is string => typeof raw === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,99}$/.test(raw);
export interface ContractFieldEventV68 {
  version: 1; regionId: ContractRegionIdV68; runId: string; tick: number; action: ContractFieldActionV68 | 'report';
  siteId: string; targetId: string; walked: number; actor: { x: number; y: number };
  trailCount: number; evaded: number; armed: false; observedTicks?: number; touches?: number; interventions?: number;
}
export interface ContractStageV68 { regionId: ContractRegionIdV68; runId: string | null; proof: ContractFieldEventV68 | null; reportTick: number | null }
export interface ContractEntryV68 { id: string; status: 'active' | 'abandoned' | 'completed'; acceptanceSerial: number; stages: ContractStageV68[] }
export const HOMEWORLD_CONTRACT_SCHEMA_VERSION_V69 = 2 as const;
export interface HomeworldContractsV68 { version: 1 | 2; serial: number; entries: ContractEntryV68[] }
export interface ContractMeetContextV68 { eligible: boolean; interiorId: string | null; pointId: string | null;
  npcId: string | null; actor: { x: number; y: number }; suspended?: boolean }
export interface ContractLiveContextV68 { regionId: string; runId: string; suspended?: boolean }
export type ContractActionV68 = { kind: 'accept' | 'abandon' | 'resume' | 'deliver'; contractId: string };
export interface ContractResultV68 { state: HomeworldContractsV68; ok: boolean; changed: boolean; message: string; rewardMarks: number }
export const defaultHomeworldContractsV68 = (): HomeworldContractsV68 => ({ version: 1, serial: 0, entries: [] });

/** The site/target names identify real V68 village interactions. A report is
 * accepted only later in that same run, never from a historical expedition. */
export function normalizeContractFieldEventV68(raw: unknown): ContractFieldEventV68 | null {
  if (!record(raw) || raw.version !== 1 || !CONTRACT_REGIONS_V68.includes(raw.regionId as ContractRegionIdV68)
    || !runIdValid(raw.runId) || !integer(raw.tick, 1) || !integer(raw.trailCount, 0, 3) || !integer(raw.evaded, 0, 10000)
    || raw.armed !== false || typeof raw.walked !== 'number' || !Number.isFinite(raw.walked) || raw.walked < 400 || raw.walked > 5_184_000
    || !record(raw.actor) || ![raw.actor.x, raw.actor.y].every(value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 10000)) return null;
  if (!['survey', 'track', 'recover', 'ward', 'challenge', 'report'].includes(String(raw.action))) return null;
  const action = raw.action as ContractFieldEventV68['action'], regionId = raw.regionId as ContractRegionIdV68;
  const expectedSite = action === 'survey' ? `${regionId}-trail-3` : action === 'recover' ? `${regionId}-cache` : `${regionId}-${action === 'report' ? 'guide' : action}`;
  const expectedTarget = `${regionId}-${action === 'survey' ? 'trail' : action === 'report' ? 'guide' : action === 'track' || action === 'challenge' ? 'fauna' : 'relay'}`;
  if (raw.siteId !== expectedSite || raw.targetId !== expectedTarget || raw.trailCount !== 3) return null;
  if (action === 'recover' && raw.evaded < 1 || action === 'track' && !integer(raw.observedTicks, 90, 100000)
    || action === 'ward' && (!integer(raw.interventions, 2, 2) || raw.evaded < 1)
    || action === 'challenge' && (!integer(raw.touches, 3, 3) || raw.evaded < 2)) return null;
  for (const optional of ['observedTicks', 'touches', 'interventions'] as const) if (raw[optional] !== undefined && !integer(raw[optional], 0, 100000)) return null;
  // The scene's own validator checks the real ground footprint, target reach
  // and the maximum distance physically walkable by this event's tick.
  if (!normalizeRegionFieldEventV68(raw)) return null;
  return { version: 1, regionId, runId: raw.runId, tick: raw.tick, action, siteId: expectedSite, targetId: expectedTarget,
    walked: raw.walked, actor: { x: raw.actor.x as number, y: raw.actor.y as number }, trailCount: 3, evaded: raw.evaded,
    armed: false, ...(raw.observedTicks === undefined ? {} : { observedTicks: raw.observedTicks as number }),
    ...(raw.touches === undefined ? {} : { touches: raw.touches as number }), ...(raw.interventions === undefined ? {} : { interventions: raw.interventions as number }) };
}
function normalizeEntry(raw: unknown, serial: number): ContractEntryV68 | null {
  if (!record(raw)) return null;
  const definition = contractFor(raw.id);
  if (!definition || !['active', 'abandoned', 'completed'].includes(String(raw.status)) || !integer(raw.acceptanceSerial, 1, serial)
    || !Array.isArray(raw.stages) || raw.stages.length !== definition.objectives.length) return null;
  const stages: ContractStageV68[] = [];
  for (const [index, objective] of definition.objectives.entries()) {
    const stage = raw.stages[index];
    if (!record(stage) || stage.regionId !== objective.regionId || stage.runId !== null && !runIdValid(stage.runId)) return null;
    const proof = stage.proof === null ? null : normalizeContractFieldEventV68(stage.proof);
    if (stage.proof !== null && (!proof || proof.regionId !== objective.regionId || proof.action !== objective.action || proof.runId !== stage.runId)) return null;
    if (stage.reportTick !== null && (!proof || !integer(stage.reportTick, proof.tick + 1))) return null;
    stages.push({ regionId: objective.regionId, runId: stage.runId as string | null, proof, reportTick: stage.reportTick as number | null });
  }
  if (definition.sequential && stages.some((stage, index) => index > 0 && stage.runId !== null && stages[index - 1].reportTick === null)) return null;
  if (raw.status === 'completed' && !stages.every(stage => stage.proof && stage.reportTick !== null)) return null;
  return { id: definition.id, status: raw.status as ContractEntryV68['status'], acceptanceSerial: raw.acceptanceSerial, stages };
}
export function isHomeworldContractsV68(raw: unknown): raw is HomeworldContractsV68 {
  if (!record(raw) || ![1, HOMEWORLD_CONTRACT_SCHEMA_VERSION_V69].includes(raw.version as number) || !integer(raw.serial, 0, 1_000_000) || !Array.isArray(raw.entries)
    || raw.entries.length > HOMEWORLD_ALL_CONTRACTS_V69.length) return false;
  const entries = raw.entries.map(entry => normalizeEntry(entry, raw.serial as number));
  return entries.every(Boolean) && (raw.version !== 1 || entries.every(entry => !contractFor(entry!.id)!.chain))
    && new Set(entries.map(entry => entry!.id)).size === entries.length
    && new Set(entries.map(entry => entry!.acceptanceSerial)).size === entries.length
    && entries.every(entry => (contractFor(entry!.id)!.prerequisites ?? []).every(id => entries.some(prior =>
      prior?.id === id && prior.status === 'completed' && prior.acceptanceSerial < entry!.acceptanceSerial)));
}
/** Invalid/future saves are not writable through this model. Host import/load
 * guards must refuse unsupported versions before storing a normalized value. */
export function normalizeHomeworldContractsV68(raw: unknown): HomeworldContractsV68 {
  if (!isHomeworldContractsV68(raw)) return defaultHomeworldContractsV68();
  return { version: raw.version, serial: raw.serial, entries: raw.entries.map(entry => normalizeEntry(entry, raw.serial)!) };
}
export function contractMarksV68(raw: unknown): number {
  return normalizeHomeworldContractsV68(raw).entries.reduce((sum, entry) => sum + (entry.status === 'completed' ? contractFor(entry.id)!.rewardMarks : 0), 0);
}
export function canMeetContractGiverV68(definition: ContractDefinitionV68, context: ContractMeetContextV68): boolean {
  if (!context.eligible || context.suspended || context.interiorId !== definition.buildingId
    || context.pointId !== definition.pointId || context.npcId !== definition.giverNpcId) return false;
  const room = homeworldInteriorForBuildingV64(definition.buildingId);
  if (!room || !isHomeworldInteriorWalkableV64(room, context.actor)) return false;
  const target = nearestHomeworldInteriorTargetV64(room, context.actor);
  return target?.kind === 'point' && target.pointId === definition.pointId;
}
const writable = (raw: unknown) => raw === undefined || isHomeworldContractsV68(raw);
const result = (state: HomeworldContractsV68, ok: boolean, changed: boolean, message: string, rewardMarks = 0): ContractResultV68 => ({ state, ok, changed, message, rewardMarks });
/** Derived from validated durable completions. A briefing, inventory item,
 * profile rank, external flag or unsubmitted field report never unlocks a chain. */
export function contractRequirementsV69(raw: unknown, id: string) {
  const state = normalizeHomeworldContractsV68(raw), definition = contractFor(id);
  const missing = (definition?.prerequisites ?? []).filter(priorId => !state.entries.some(entry => entry.id === priorId && entry.status === 'completed'))
    .map(priorId => contractFor(priorId)!);
  return { met: !!definition && writable(raw) && missing.length === 0, missing,
    message: missing.length ? `Remets d’abord « ${missing[0].title} » auprès de ${missing[0].giverName}. Un rapport au guide seul ne débloque pas la suite.`
      : definition?.chain ? `Chapitre ${definition.chain.chapter}/${definition.chain.total} · ${definition.chain.title}` : '' };
}
export function applyHomeworldContractV68(raw: unknown, action: ContractActionV68, context: ContractMeetContextV68): ContractResultV68 {
  const state = normalizeHomeworldContractsV68(raw), definition = contractFor(action?.contractId);
  if (!writable(raw)) return result(state, false, false, 'Le registre ne peut pas être modifié depuis cette sauvegarde.');
  if (!definition || !['accept', 'abandon', 'resume', 'deliver'].includes(action?.kind)) return result(state, false, false, 'Cette demande n’existe pas.');
  if (!canMeetContractGiverV68(definition, context)) return result(state, false, false, `Rejoins ${definition.giverName} : cette remise ne se fait pas à distance.`);
  const existing = state.entries.find(entry => entry.id === definition.id);
  if (existing?.status === 'completed') return result(state, true, false, 'Cette remise est déjà inscrite. Les marques ne sont pas attribuées deux fois.');
  if (action.kind === 'accept' || action.kind === 'resume') {
    if (existing?.status === 'active') return result(state, true, false, 'Cette demande est déjà suivie. Ses observations restent conservées.');
    if (action.kind === 'resume' && !existing) return result(state, false, false, 'Aucune demande abandonnée à reprendre.');
    const requirements = contractRequirementsV69(state, definition.id);
    if (!requirements.met) return result(state, false, false, requirements.message);
    if (state.serial >= 1_000_000) return result(state, false, false, 'Le registre de demandes a atteint sa limite.');
    // Old V68 ledgers stay version 1 until a new circuit is actually accepted.
    // An older client then treats the version 2 ledger as future, not corrupt.
    if (definition.chain) state.version = HOMEWORLD_CONTRACT_SCHEMA_VERSION_V69;
    state.serial++;
    const accepted: ContractEntryV68 = { id: definition.id, status: 'active', acceptanceSerial: state.serial,
      stages: definition.objectives.map(objective => ({ regionId: objective.regionId, runId: null, proof: null, reportTick: null })) };
    if (existing) state.entries[state.entries.indexOf(existing)] = accepted; else state.entries.push(accepted);
    return result(state, true, true, 'Demande suivie. Pars maintenant vers les villages concernés ; les sorties précédentes ne comptent pas.');
  }
  if (!existing || existing.status !== 'active') return result(state, false, false, 'Cette demande n’est pas suivie.');
  if (action.kind === 'abandon') { existing.status = 'abandoned'; return result(state, true, true, 'Demande mise de côté. Une reprise demandera une nouvelle sortie.'); }
  if (!existing.stages.every(stage => stage.proof && stage.reportTick !== null)) return result(state, false, false, 'Il manque une observation et son retour au guide de village.');
  existing.status = 'completed';
  return result(state, true, true, `${definition.completionText ? definition.completionText + ' ' : ''}Rapport reçu · ${definition.rewardMarks} marques de clan gagnées.`, definition.rewardMarks);
}
/** Persist with the newly created village run before mounting that scene. A
 * reload uses the saved run without rebinding. Completed stage receipts survive. */
export function bindContractsVillageRunV68(raw: unknown, regionId: string, runId: string): ContractResultV68 {
  const state = normalizeHomeworldContractsV68(raw);
  if (!writable(raw) || !CONTRACT_REGIONS_V68.includes(regionId as ContractRegionIdV68) || !runIdValid(runId)) return result(state, false, false, 'Départ non reconnu par le carnet.');
  let changed = false;
  for (const entry of state.entries) if (entry.status === 'active') for (const [index, stage] of entry.stages.entries()) {
    const definition = contractFor(entry.id)!;
    if (definition.sequential && index > 0 && entry.stages[index - 1].reportTick === null) continue;
    if (stage.regionId !== regionId || stage.reportTick !== null || stage.runId === runId) continue;
    stage.runId = runId; stage.proof = null; stage.reportTick = null; changed = true;
  }
  return result(state, true, changed, changed ? 'Nouvelle sortie liée aux demandes suivies.' : 'Aucune demande nouvelle pour cette sortie.');
}
/** Only call from the live village reducer's successful physical interaction.
 * This validates local save receipts; it is not a multiplayer anti-cheat scheme. */
export function recordContractsFieldEventV68(raw: unknown, eventRaw: unknown, context: ContractLiveContextV68): ContractResultV68 {
  const state = normalizeHomeworldContractsV68(raw), event = normalizeContractFieldEventV68(eventRaw);
  if (!writable(raw) || !event || context.suspended || event.runId !== context.runId || event.regionId !== context.regionId) return result(state, false, false, 'Observation non valide : aucun contrat avancé.');
  let changed = false;
  for (const entry of state.entries) {
    if (entry.status !== 'active') continue;
    const definition = contractFor(entry.id)!;
    for (const [index, objective] of definition.objectives.entries()) {
      const stage = entry.stages[index];
      if (definition.sequential && index > 0 && entry.stages[index - 1].reportTick === null) continue;
      if (stage.regionId !== event.regionId || stage.runId !== event.runId || stage.reportTick !== null) continue;
      if (event.action === 'report' && stage.proof && event.tick > stage.proof.tick) { stage.reportTick = event.tick; changed = true; }
      else if (event.action === objective.action && stage.proof === null) { stage.proof = event; changed = true; }
    }
  }
  return result(state, true, changed, changed ? event.action === 'report' ? 'Retour du village confirmé. Le donneur de la demande attend la remise.' : 'Observation inscrite. Rejoins le guide de ce village avant de rentrer.' : 'Aucune demande suivie ne réclame cette observation.');
}
export function homeworldContractsJournalV68(raw: unknown) {
  const state = normalizeHomeworldContractsV68(raw);
  return { marks: contractMarksV68(state), completed: state.entries.filter(entry => entry.status === 'completed').length,
    active: state.entries.filter(entry => entry.status === 'active').map(entry => {
      const definition = contractFor(entry.id)!;
      const stageIndex = entry.stages.findIndex(stage => stage.reportTick === null), stage = entry.stages[stageIndex];
      const regionName = stage ? REGION_NAMES_V68[stage.regionId] : null;
      return { id: entry.id, title: definition.title, giverName: definition.giverName, pointId: stage ? `region-${stage.regionId}` : definition.pointId,
        ready: stageIndex === -1, completedStages: entry.stages.filter(item => item.reportTick !== null).length, totalStages: entry.stages.length,
        chain: definition.chain ?? null, relation: definition.chain?.relation ?? `Une demande confiée par ${definition.giverName}.`,
        destination: { kind: stage ? stage.proof ? 'guide' : 'region' : 'giver', label: stage ? stage.proof ? `Guide du village · ${regionName}` : regionName! : definition.giverName,
          pointId: stage ? stage.proof ? `${stage.regionId}-guide` : `region-${stage.regionId}` : definition.pointId,
          cityPointId: stage ? `region-${stage.regionId}` : definition.pointId },
        nextAction: stage ? stage.proof ? 'Faire confirmer le retour' : stage.runId ? 'Effectuer l’action de terrain' : 'Partir vers le village' : 'Remettre les rapports au commanditaire',
        route: definition.objectives.map((objective, index) => ({ regionId: objective.regionId, regionName: REGION_NAMES_V68[objective.regionId], action: objective.action,
          status: entry.stages[index].reportTick !== null ? 'confirmed' : entry.stages[index].proof ? 'report' : definition.sequential && index > stageIndex ? 'later' : 'field' })),
        objective: stage ? stage.proof ? `Reviens au guide de ${REGION_NAMES_V68[stage.regionId]} pour faire confirmer ce retour.` : definition.objectives[stageIndex].text
          : `Retourne auprès de ${definition.giverName} pour remettre les rapports.` };
    }),
    chains: ['return-line', 'hunter-measure'].map(chainId => {
      const definitions = HOMEWORLD_CHAIN_CONTRACTS_V69.filter(item => item.chain!.id === chainId);
      const completed = definitions.filter(item => state.entries.some(entry => entry.id === item.id && entry.status === 'completed')).length;
      const next = definitions.find(item => !state.entries.some(entry => entry.id === item.id && entry.status !== 'abandoned') && contractRequirementsV69(state, item.id).met);
      return { id: chainId, title: definitions[0].chain!.title, completed, total: definitions.length,
        next: next ? { id: next.id, title: next.title, giverName: next.giverName, pointId: next.pointId, relation: next.chain!.relation } : null };
    }) };
}
export const contractRegionNameV68 = (id: ContractRegionIdV68) => REGION_NAMES_V68[id];
