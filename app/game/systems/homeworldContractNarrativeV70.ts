import { HOMEWORLD_CHAIN_CONTRACTS_V69, contractRegionNameV68, contractRequirementsV69,
  isHomeworldContractsV68, normalizeHomeworldContractsV68, type ContractFieldActionV68,
  type ContractFieldEventV68 } from './homeworldContractsV68';

/** Original dialogue for this game's existing commissions. Presentation only:
 * dialogue never submits a receipt, pays marks, changes rank or opens a gate. */
export const HOMEWORLD_CONTRACT_VOICES_V70 = {
  'v69-return-1': {
    motive: 'La Soigneuse reçoit des récits contradictoires : certains confondent la vapeur avec une présence et la cendre avec une disparition. L’Artisane veut deux lectures comparables avant de préparer les retours.',
    briefing: 'La cendre efface les contours ; la vapeur les invente. Rapporte-moi ce que tu as réellement suivi dans ces deux terrains, et fais vérifier chaque lecture sur place.',
    delivery: 'Pose les deux rapports ici. Je comparerai la piste des Cendres aux indices des Grottes avant de confier le dossier à la Soigneuse.',
    thanks: 'Tu as distingué ce qui reste au sol de ce que la chaleur suggère. Le dossier est reçu ; la Soigneuse attend maintenant ta visite à la maison des délégations.',
  },
  'v69-return-2': {
    motive: 'La Soigneuse dispose du dossier remis au marché. Elle a besoin de repères utilisables dans les racines humides et de retrouver le matériel laissé par l’ancienne cordée, avant de conseiller les départs.',
    briefing: 'J’ai reçu les lectures de l’Artisane. Dans les Marais, tiens les repères ; dans la Couronne, rapporte les balises de la cordée. Reviens avec ce que les guides auront pu confirmer.',
    delivery: 'Montre-moi les deux confirmations : les balises des Marais tenues et la caisse relevée dans la Couronne. Ce dossier préparera la demande des quais.',
    thanks: 'Les repères et le matériel sont documentés. Merci d’avoir laissé les affaires des habitants en place. L’Officier des quais peut maintenant te confier sa ligne de retour.',
  },
  'v69-return-3': {
    motive: 'Les quais doivent comparer un passage battu par les rafales à son débouché côtier. Le travail transmis par la Soigneuse permet de demander une intervention sur les repères et une observation distincte du rivage.',
    briefing: 'La Soigneuse m’a remis ton dossier. Commence par la ligne exposée au vent, puis observe le rivage depuis la terre ferme. Je veux deux retours vérifiés, pas l’annonce d’une traversée.',
    delivery: 'Dépose la confirmation des balises des Orages et celle de la présence côtière. Nous saurons quelles lectures transmettre à la Forge.',
    thanks: 'Le vent et le rivage ont chacun leur rapport. Ta ligne est consignée ; la Maîtresse des parures attend le dernier relevé des relais.',
  },
  'v69-return-4': {
    motive: 'La Forge clôt le dossier transmis entre le marché, les soins et les quais. Elle doit distinguer le matériel récupérable, les passages d’une proie et les traces patrimoniales avant toute décision d’implantation.',
    briefing: 'Un relais sert au retour ; il ne décore pas une prise. Rapporte les boîtiers des Grottes, observe le fouisseur du Verre, puis relève les Ruines sans déplacer leurs marques.',
    delivery: 'Présente les trois retours dans cet ordre : les boîtiers, le fouisseur, puis les traces des Ruines. Je réunirai les faits au dossier des relais.',
    thanks: 'Le dossier des balises du retour est clos. Merci d’avoir séparé matériel, proie et patrimoine. Les quatre remises restent inscrites ; aucune région entière n’est déclarée pacifiée.',
  },
  'v69-measure-1': {
    motive: 'Avant de proposer une confrontation à la Forge, l’Artisane veut savoir si le chasseur peut lire deux comportements sans les provoquer. La distance observée compte davantage qu’un récit de victoire.',
    briefing: 'Approche assez pour comprendre, assez peu pour laisser vivre. Observe d’abord le cuirassé des Cendres, puis le fouisseur du Verre. Chaque guide doit reconnaître ta lecture.',
    delivery: 'Remets les deux observations. Leur distance et leur contexte doivent rester distincts de ce qu’un défi pourrait ensuite prouver.',
    thanks: 'Les deux observations sont reçues. Tu as laissé les proies vivre sans leur attribuer une défaite. La Forge peut maintenant te proposer une confrontation mesurée.',
  },
  'v69-measure-2': {
    motive: 'La Forge s’appuie sur les observations remises au marché. Elle compare une réponse maîtrisée à une proie territoriale avec la lecture d’empreintes froides ; une signature brouillée ne suffit pas à conclure.',
    briefing: 'Au Verre, quitte l’axe et touche pendant l’ouverture. Laisse le fouisseur se retirer. Dans la Couronne, lis ensuite ce que le sol montre, même lorsque le thermique hésite.',
    delivery: 'Rapporte la maîtrise confirmée au Verre et l’observation de la Couronne. La Conservatrice doit pouvoir distinguer les deux faits.',
    thanks: 'La confrontation et l’observation ont leurs confirmations propres. Ta mesure est reconnue dans ce dossier ; la Conservatrice t’attend pour en préciser les limites.',
  },
  'v69-measure-3': {
    motive: 'La Conservatrice reçoit deux faits de la Forge et veut les replacer dans des lieux précis. Les traces des Ruines et le relais extérieur de la Réserve permettent de documenter sans transformer l’accès local en privilège.',
    briefing: 'Ce que tu as accompli n’ouvre pas tous les lieux. Relève les Ruines. Avant le poste extérieur de la Réserve, termine séparément l’enquête du convoi : rapport des Marches, puis journal, diversion et passage du Verre. Ses guides villageois ne remplacent pas cette enquête sensible. Reviens ensuite pour le relais ; laisse les archives et les enclos fermés.',
    delivery: 'Dépose les confirmations des Ruines et du relais extérieur. Elles attestent ces actes précis, sans réécrire l’histoire des clans.',
    thanks: 'Les limites de ton témoignage sont inscrites avec les faits. Merci d’avoir laissé les lieux scellés intacts. L’Officier des quais peut te confier le dernier circuit.',
  },
  'v69-measure-4': {
    motive: 'Les quais associent la maîtrise éprouvée à la Forge aux limites posées par la Conservatrice. La dernière sortie alterne confrontation, entretien des repères et observation pour éviter une succession de prises sans mesure.',
    briefing: 'Éprouve la proie du rivage, puis laisse-la partir. Dans la Jungle, tiens les repères. Aux Orages, termine en observant. Ramène trois faits, chacun reconnu par son guide.',
    delivery: 'Présente la confrontation côtière, les balises de la Jungle et l’observation des Orages. Nous clôturerons le circuit avec leurs trois confirmations.',
    thanks: 'Le circuit de la mesure du chasseur est clos. Merci d’avoir changé de geste lorsque le terrain le demandait. Ces quatre remises attestent tes actes ; elles ne te décernent ni rite ni rang.',
  },
} as const;

export type ContractNarrativePhaseV70 = 'locked' | 'briefing' | 'departure' | 'field' | 'guide' | 'delivery' | 'paused' | 'thanks';
const PHASE_NAMES: Record<ContractNarrativePhaseV70, string> = { locked: 'Dossier préalable attendu', briefing: 'Avant le départ',
  departure: 'Prochaine sortie', field: 'Lecture de terrain', guide: 'Retour au guide', delivery: 'Rapports à remettre', paused: 'Demande mise de côté', thanks: 'Remerciement du commanditaire' };
const EVIDENCE: Record<ContractFieldActionV68, readonly string[]> = {
  survey: ['Écouter le guide et inspecter les trois indices dans l’ordre.', 'Revenir au même guide après le relevé.'],
  track: ['Écouter le guide et inspecter les trois indices dans l’ordre.', 'Observer calmement la proie à distance puis consigner son observation.', 'Revenir au même guide ; l’animal reste vivant.'],
  ward: ['Écouter le guide et inspecter les trois indices dans l’ordre.', 'Fixer les deux balises distinctes pendant leurs avertissements.', 'Quitter physiquement la zone avant le danger, puis revenir au guide.'],
  recover: ['Écouter le guide et inspecter les trois indices dans l’ordre.', 'Entrer pendant l’avertissement et quitter physiquement la zone avant le danger.', 'Relever la caisse pendant l’accalmie, puis revenir au guide.'],
  challenge: ['Écouter le guide, inspecter les trois indices et consigner l’observation.', 'Éviter au moins deux charges et placer trois touches dans trois reprises différentes.', 'Laisser la proie se retirer vivante, puis revenir au guide.'],
};
export function contractEvidenceInstructionsV70(action: ContractFieldActionV68): readonly string[] { return EVIDENCE[action]; }
/** Correct the inherited displayed timing without rewriting a published V68
 * definition or an accepted checkpoint. The physical reducer remains authoritative. */
export function contractBriefDisplayV70(id: string, original: string): string {
  return id === 'pillar-jungle-ward' ? 'Jungle des Piliers · Après les trois relevés, fixe les deux balises pendant les avertissements du danger local. Quitte sa zone avant le déclenchement, puis reviens au guide.' : original;
}
function proofSummary(proof: ContractFieldEventV68) {
  if (proof.action === 'track') return 'Observation calme consignée après trois indices ; durée reconnue sur place.';
  if (proof.action === 'ward') return `Deux balises distinctes fixées ; ${proof.evaded} danger${proof.evaded > 1 ? 's' : ''} évité${proof.evaded > 1 ? 's' : ''}.`;
  if (proof.action === 'challenge') return `${proof.evaded} charges évitées et trois touches distinctes ; retrait vivant de la proie.`;
  if (proof.action === 'recover') return 'Caisse relevée après trois indices et un danger physiquement évité.';
  return 'Trois indices inspectés dans l’ordre, après l’entretien avec le guide.';
}

/** Derived only from the strictly validated durable ledger. Invalid or future
 * data never yields a fictional acknowledgement, thanks or unlock. */
export function contractChapterNarrativeV70(value: unknown, id: string) {
  if (value !== undefined && !isHomeworldContractsV68(value)) return null;
  const definition = HOMEWORLD_CHAIN_CONTRACTS_V69.find(item => item.id === id);
  if (!definition) return null;
  const voice = HOMEWORLD_CONTRACT_VOICES_V70[id as keyof typeof HOMEWORLD_CONTRACT_VOICES_V70];
  if (!voice) return null;
  const state = normalizeHomeworldContractsV68(value), entry = state.entries.find(item => item.id === id), requirements = contractRequirementsV69(state, id);
  const index = entry?.status === 'abandoned' ? 0 : entry?.stages.findIndex(stage => stage.reportTick === null) ?? 0;
  const stage = entry && index >= 0 ? entry.stages[index] : null;
  const phase: ContractNarrativePhaseV70 = !entry ? requirements.met ? 'briefing' : 'locked' : entry.status === 'completed' ? 'thanks'
    : entry.status === 'abandoned' ? 'paused' : index === -1 ? 'delivery' : stage?.proof ? 'guide' : stage?.runId ? 'field' : 'departure';
  const objective = definition.objectives[index >= 0 ? index : 0], region = contractRegionNameV68(objective.regionId);
  const confirmedReports = (entry?.status === 'abandoned' ? [] : entry?.stages ?? []).flatMap(item => item.reportTick !== null && item.proof
    ? [`${contractRegionNameV68(item.regionId)} : ${proofSummary(item.proof)} Retour confirmé par le guide.`] : []);
  const accessNotice = id === 'v69-measure-3' ? 'Accès sensible à la Réserve : inspecte le trophée du convoi au Contrôle d’amarrage, rapporte l’enquête complète des Marches, puis celle du Désert de Verre (journal, diversion et passage). Les seuls rapports des villages ne la remplacent pas. Ces enquêtes autonomes attendent leur autorisation adulte ; cette demande ne donne ni rang ni dérogation.' : null;
  const reply = (phase === 'thanks' ? voice.thanks : phase === 'delivery' ? voice.delivery : phase === 'locked' ? requirements.message
    : phase === 'paused' ? 'Le dossier reste dans ton carnet. Reprends cette demande ici ; ses observations demanderont de nouvelles sorties.'
    : phase === 'guide' ? `Ton observation de ${region} est inscrite. Reviens au guide de ce village avant de poursuivre le dossier.`
    : phase === 'field' ? `Tu es parti pour ${region}. ${objective.text}`
    : phase === 'departure' && index > 0 ? `Le retour précédent est confirmé. Poursuis maintenant vers ${region} : ${objective.text}` : voice.briefing)
    + (phase === 'departure' && index === 1 && accessNotice ? ` ${accessNotice}` : '');
  return { id, title: definition.title, speaker: definition.giverName, phase, phaseLabel: PHASE_NAMES[phase], reply, motive: voice.motive,
    stageIndex: index >= 0 ? index : null, requiredEvidence: index >= 0 ? EVIDENCE[objective.action]
      : definition.objectives.flatMap(item => EVIDENCE[item.action].map(line => `${contractRegionNameV68(item.regionId)} · ${line}`)), confirmedReports,
    reportIntroduction: voice.delivery, accessNotice, rewardMarks: definition.rewardMarks, pointId: definition.pointId, buildingId: definition.buildingId };
}

/** Contextual field/guide presentation. A matching accepted run is mandatory;
 * service dialogue, visiting a region or a pending uncommitted event is not a proof. */
export function contractRegionNarrativesV70(value: unknown, context: { regionId: string; runId: string; suspended?: boolean }) {
  if (!isHomeworldContractsV68(value) || context.suspended) return [];
  const state = normalizeHomeworldContractsV68(value);
  return state.entries.filter(entry => entry.status === 'active').flatMap(entry => {
    const definition = HOMEWORLD_CHAIN_CONTRACTS_V69.find(item => item.id === entry.id);
    if (!definition) return [];
    const index = entry.stages.findIndex(stage => stage.regionId === context.regionId && stage.runId === context.runId);
    if (index < 0) return [];
    const stage = entry.stages[index], objective = definition.objectives[index], narrative = contractChapterNarrativeV70(state, entry.id)!;
    const status = stage.reportTick !== null ? 'reported' : stage.proof ? 'guide' : 'field';
    return [{ id: entry.id, title: definition.title, giverName: definition.giverName, stageIndex: index, action: objective.action, status,
      instruction: status === 'reported' ? `Retour confirmé pour « ${definition.title} ». ${narrative.phase === 'delivery' ? `Rejoins ${definition.giverName} pour remettre le dossier.` : narrative.reply}`
        : status === 'guide' ? `Observation inscrite pour « ${definition.title} ». Reviens au guide de ce village ; la remise attend encore ${definition.giverName}.` : objective.text,
      requiredEvidence: EVIDENCE[objective.action], confirmedReport: stage.reportTick !== null && stage.proof ? proofSummary(stage.proof) : null,
      speakerReply: narrative.reply }];
  });
}
