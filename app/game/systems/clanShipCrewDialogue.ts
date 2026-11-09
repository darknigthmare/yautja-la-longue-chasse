import type { SaveGame } from '../types';
import { inspectClanShipDocking, type ClanShipRoomId } from './clanShipDocking';
import {
  clanShipContract, clanShipRecruit, evaluateClanShipAccess, evaluateClanShipOperationsCampaign,
  inspectClanShipOperations, type ClanShipContractReceipt, type ClanShipNpcId,
} from './clanShipOperations';
import {
  companionResidencePresence, companionUsesLegacyClanPost, evaluateCompanionResidenceCampaign,
  inspectCompanionResidence, type CompanionCampaign,
} from './companionResidence';
import {
  CLAN_SHIP_TROPHY_WITNESSES, clanShipTrophyHearingView, inspectClanShipTrophyHearing,
} from './clanShipTrophyHearing';
import {
  CLAN_SHIP_SPACE_MAX_ENERGY, CLAN_SHIP_SPACE_SCENARIOS,
  type ClanShipSpaceEncounter, type ClanShipSpaceOrder,
} from './clanShipSpaceEncounter';

/** OPS-B05 / operations-spec §13.1. Original dialogue for this clan, not a
 * universal doctrine. This reader owns no progression, clock or seen counter. */
export const CLAN_SHIP_CREW_DIALOGUE_CONTEXTS = [
  'missing-proof', 'recent-proof', 'agreement', 'operation-return', 'circle-confirmed',
] as const;
export type ClanShipCrewDialogueContext = typeof CLAN_SHIP_CREW_DIALOGUE_CONTEXTS[number];
export type ClanShipCrewDialogueCampaign = CompanionCampaign & Pick<SaveGame, 'clanShipTrophyHearing'>;
export interface ClanShipCrewDialogueContact {
  roomId: ClanShipRoomId;
  /** Supplied only by the physical crew interaction. ClanShipInterior checks
   * service reach before opening the panel with this focused identity. */
  focusedNpcId: ClanShipNpcId | null;
}
export interface ClanShipCrewDialogueView {
  readonly status: 'spoken' | 'route' | 'unavailable' | 'invalid-save' | 'future-version';
  readonly context: ClanShipCrewDialogueContext | null;
  readonly speakerId: ClanShipNpcId;
  readonly speakerName: string;
  readonly line: string | null;
  readonly facts: readonly string[];
  readonly targetRoomId: ClanShipRoomId | null;
  readonly reason: string;
}

const MISSING: Record<ClanShipNpcId, string> = {
  'ash-scar': 'Prépare les repères de l’exercice, puis confronte-les à la trace de la galerie. Je veux comprendre la décision que ton geste prépare.',
  'star-watch': 'Rapporte les observations de la route sous la glace. Une route proposée doit garder la trace de ce qui a été vérifié.',
  'iron-claw': 'Relève les marques du râtelier et compare-les au registre. Chaque pièce confiée doit rester identifiable.',
  'cold-trace': 'Accepte le dossier d’Oseris-IV et rapporte les observations de cette chasse. Une trace exploitable demande un retour confirmé.',
  'black-suture': 'Prépare le poste de soins et contrôle le passage depuis le hangar. Le retour se prépare avant le départ.',
  'threshold-guard': 'Compare les témoins du sas, des soins et des archives, puis reviens contrôler le circuit. Un seul témoin ne ferme pas cette chaîne.',
};
const PROVEN: Record<ClanShipNpcId, string> = {
  'ash-scar': 'Les repères préparés et la trace étudiée figurent dans ton dossier. Nous pouvons maintenant parler de préparer les sorties ensemble.',
  'star-watch': 'Le retour sous la glace et ses observations sont confirmés. Ces données donnent une base à la route que nous pourrions préparer ensemble.',
  'iron-claw': 'Le râtelier et son registre concordent dans ton audit. Tu peux me proposer de suivre la préparation des équipements de ton cercle.',
  'cold-trace': 'Le dossier d’Oseris-IV contient une extraction confirmée et ses scans. Je peux examiner avec toi une place dans ton cercle.',
  'black-suture': 'Le poste et le passage depuis le hangar ont été contrôlés. Nous pouvons convenir de préparer les prochains retours ensemble.',
  'threshold-guard': 'La chaîne des contrôles est complète dans ton dossier. Nous pouvons discuter de tenir ce seuil ensemble.',
};
const AGREED: Record<ClanShipNpcId, string> = {
  'ash-scar': 'Notre accord tient. À chaque préparation, demande-toi quelle décision l’exercice te permettra de prendre.',
  'star-watch': 'J’ai accepté de préparer les routes avec ton cercle. Gardons ensemble les observations et ce qu’il reste à vérifier.',
  'iron-claw': 'J’ai accepté de suivre la préparation du cercle. Gardons les marques des équipements avec leurs relevés.',
  'cold-trace': 'J’ai rejoint ton cercle pour y conserver des preuves exploitables. Apporte les relevés avec leur contexte.',
  'black-suture': 'Notre accord porte aussi sur le retour. Préparons le passage et le poste avant la prochaine sortie.',
  'threshold-guard': 'Notre accord demeure. Les contrôles du seuil accompagnent chaque départ et chaque retour.',
};
const CIRCLE: Record<ClanShipNpcId, string> = {
  'ash-scar': 'Le conseil a confirmé notre cercle. Gardons aux exercices leur but : préparer les décisions de la prochaine sortie.',
  'star-watch': 'Notre cercle est confirmé au conseil. Je continuerai à séparer les routes vérifiées des trajets encore proposés.',
  'iron-claw': 'Le cercle est confirmé. La préparation commune garde chaque équipement lié à ses marques et à son registre.',
  'cold-trace': 'Le conseil a confirmé le cercle. Conservons les preuves et leurs limites, même lorsque le récit nous flatte.',
  'black-suture': 'Notre cercle est confirmé. Le retour reste une responsabilité à préparer ensemble.',
  'threshold-guard': 'Le cercle est confirmé au conseil. Nous gardons les contrôles d’accès avec les relevés de chaque retour.',
};
const ORDERS: Record<ClanShipSpaceOrder, string> = {
  scan: 'analyse', manoeuvre: 'manœuvre', recharge: 'répartition d’énergie', brace: 'écran', disrupt: 'neutralisation des moteurs',
  fire: 'tir', board: 'abordage', extract: 'extraction', withdraw: 'repli',
};
const outcome = (encounter: ClanShipSpaceEncounter): string => encounter.status === 'victory' ? 'victoire'
  : encounter.status === 'withdrawn' ? 'repli' : 'défaite';
const outcomeWithArticle = (encounter: ClanShipSpaceEncounter): string => encounter.status === 'withdrawn' ? 'un repli' : `une ${outcome(encounter)}`;

function returnLine(id: ClanShipNpcId, encounter: ClanShipSpaceEncounter, hasRequiredProof: boolean): string {
  switch (id) {
    case 'ash-scar': return encounter.status === 'withdrawn'
      ? 'Tu as ordonné le repli. Relisons la situation qui a guidé ce choix pour préparer la prochaine décision.'
      : encounter.history.includes('board')
        ? `L’abordage figure dans les ordres de cette opération, close par ${outcomeWithArticle(encounter)}. Reprenons sa préparation.`
        : `L’opération se termine par ${outcomeWithArticle(encounter)}. Reprenons les décisions consignées avant le prochain exercice.`;
    case 'star-watch': return hasRequiredProof
      ? 'Comparons le relevé de glace confirmé et la suite des manœuvres réellement consignées. Chaque route garde sa propre preuve.'
      : 'Relisons la suite des manœuvres réellement consignées. Le relevé de glace reste à rapporter pour préparer cette autre route.';
    case 'iron-claw': return 'Relisons l’énergie restante et l’intégrité enregistrée de la formation. Le contrôle des équipements se fait avec leurs marques à l’arsenal.';
    case 'cold-trace': return `Le dossier tactique porte ${outcomeWithArticle(encounter)} et un niveau d’analyse de ${encounter.scanLevel} sur 2. Conservons ces limites avec les observations.`;
    case 'black-suture': return `Le relevé indique ${outcomeWithArticle(encounter)}. Reprenons la préparation de l’accueil à partir de cette issue.`;
    case 'threshold-guard': return encounter.kind === 'recovery' && encounter.status === 'victory'
      ? 'La récupération et son extraction sont confirmées dans le relevé tactique. Reprenons les contrôles d’accès avec ce dossier.'
      : `Le retour tactique porte ${outcomeWithArticle(encounter)}. Relisons cette issue avant de reprendre les contrôles du seuil.`;
  }
}

function proofFacts(receipt: ClanShipContractReceipt): string {
  const definition = clanShipContract(receipt.contractId)!;
  const proof = receipt.proof;
  if (proof.kind === 'field') {
    const completed = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', dateStyle: 'long', timeStyle: 'short' }).format(new Date(proof.completedAt));
    return `${definition.name} : score ${proof.score}/100, ${proof.scans} ${proof.scans === 1 ? 'scan' : 'scans'}, retour enregistré le ${completed} UTC.`;
  }
  if (proof.kind === 'interior' || proof.kind === 'onboarding') return `${definition.name} : ${proof.stepIds.length} étapes confirmées.`;
  return `${definition.name} : victoire tactique confirmée.`;
}

function returnFacts(encounter: ClanShipSpaceEncounter): string[] {
  const scenario = CLAN_SHIP_SPACE_SCENARIOS[encounter.kind];
  return [
    `${scenario.title} : ${outcome(encounter)}.`,
    `Intégrité de la formation : ${encounter.formationIntegrity}/100 ; ${scenario.assetLabel} : ${encounter.assetIntegrity}/100.`,
    `Énergie restante : ${encounter.energy}/${CLAN_SHIP_SPACE_MAX_ENERGY} ; analyses : ${encounter.scanLevel}/2 ; tours : ${encounter.turn}.`,
    `Ordres consignés : ${encounter.history.map(order => ORDERS[order]).join(' → ')}.`,
  ];
}

/** Priority is explicit and independent of elapsed/offline time:
 * circle > retained terminal spatial return > agreement > required receipts >
 * missing proof. Starting another contract clears the retained encounter in
 * the existing owner; we never reconstruct a newer return from old statistics.
 * Circle keeps that terminal return as secondary facts, never as its headline.
 * Identical saved facts yield identical text; reading does not record a visit. */
export function selectClanShipCrewDialogue(save: ClanShipCrewDialogueCampaign, npcId: ClanShipNpcId,
  contact: ClanShipCrewDialogueContact): ClanShipCrewDialogueView {
  const npc = clanShipRecruit(npcId);
  const closed = (status: ClanShipCrewDialogueView['status'], reason: string, targetRoomId: ClanShipRoomId | null = null): ClanShipCrewDialogueView => ({
    status, context: null, speakerId: npcId, speakerName: npc?.name ?? '', line: null, facts: [], targetRoomId, reason,
  });
  try {
    if (!npc || !save || !contact) return closed('invalid-save', 'Le dossier de cet interlocuteur ne peut pas être relu.');
    const inspected = inspectClanShipOperations(save.clanShipOperations, save.createdAt);
    if (inspected.status === 'future-version') return closed('future-version', 'Ce dossier d’opérations appartient à une version plus récente.');
    if (inspected.status === 'invalid-save') return closed('invalid-save', 'Le dossier d’opérations doit être récupéré avant cet entretien.');
    const state = inspected.state;
    if (!state) return closed('unavailable', 'Le dossier d’opérations du clan n’est pas disponible.');
    if (!evaluateClanShipOperationsCampaign(state, save).allowed) return closed('invalid-save', 'Les preuves ne correspondent pas à cette campagne.');
    if (!evaluateClanShipAccess(save).allowed) return closed('unavailable', 'L’accès aux opérations demande le rite Blooded reconnu dans la chronique.');
    const residence = inspectCompanionResidence(save.companionResidence, save.createdAt);
    if (residence.status === 'future-version') return closed('future-version', 'Le registre de présence appartient à une version plus récente.');
    if (residence.status === 'invalid-save' || residence.state && !evaluateCompanionResidenceCampaign(residence.state, save).allowed)
      return closed('invalid-save', 'Le registre de présence doit être récupéré avant cet entretien.');
    const hearing = inspectClanShipTrophyHearing(save.clanShipTrophyHearing, save.createdAt);
    if (hearing.status === 'future-version') return closed('future-version', 'Le dossier d’audience appartient à une version plus récente.');
    if (hearing.status === 'invalid-save') return closed('invalid-save', 'Le dossier d’audience doit être récupéré avant cet entretien.');
    const meeting = clanShipTrophyHearingView(hearing.state);
    if (CLAN_SHIP_TROPHY_WITNESSES.some(id => id === npcId) && meeting.gathered && !meeting.completed)
      return closed('unavailable', 'Ce témoin participe à l’audience dans la galerie des trophées.');
    const resident = companionResidencePresence(save, { kind: 'clan', shipId: 'avp-predator-mothership' })
      .find(member => member.id === npcId && member.avatarVisible && member.serviceAvailable);
    const post = companionUsesLegacyClanPost(save, npcId) ? npc.roomId : resident?.avatarRoomId;
    if (!post) return closed('unavailable', 'Ce membre n’est pas disponible à un poste du Clan Ship. Consulte son affectation.');
    const targetRoomId = post as ClanShipRoomId;
    const docking = inspectClanShipDocking(save.clanShipDocking, save.createdAt);
    if (docking.status === 'future-version') return closed('future-version', 'Le registre d’amarrage appartient à une version plus récente.');
    if (docking.status === 'invalid-save') return closed('invalid-save', 'Le registre d’amarrage doit être récupéré avant cet entretien.');
    if (docking.state?.status !== 'aboard' || docking.state.roomId !== targetRoomId || contact.roomId !== targetRoomId || contact.focusedNpcId !== npcId)
      return closed('route', `Rejoins ${npc.name} à son poste et adresse-toi à lui.`, targetRoomId);
    const receipts = npc.requiredContractIds.flatMap(id => state.completedContracts.filter(receipt => receipt.contractId === id));
    const returned = state.spaceEncounter && state.spaceEncounter.status !== 'active' ? state.spaceEncounter : null;
    const context: ClanShipCrewDialogueContext = state.circleConfirmed ? 'circle-confirmed' : returned ? 'operation-return'
      : state.recruitedNpcIds.includes(npcId) ? 'agreement' : receipts.length === npc.requiredContractIds.length ? 'recent-proof' : 'missing-proof';
    const line = context === 'circle-confirmed' ? CIRCLE[npcId] : context === 'operation-return' ? returnLine(npcId, returned!, receipts.length === npc.requiredContractIds.length)
      : context === 'agreement' ? AGREED[npcId] : context === 'recent-proof' ? PROVEN[npcId] : MISSING[npcId];
    const facts = receipts.map(proofFacts);
    if (context === 'missing-proof') facts.push(...npc.requiredContractIds.filter(id => !receipts.some(receipt => receipt.contractId === id))
      .map(id => `Preuve attendue : ${clanShipContract(id)!.name}.`));
    if (returned && (context === 'operation-return' || context === 'circle-confirmed')) facts.push(...returnFacts(returned));
    return { status: 'spoken', context, speakerId: npcId, speakerName: npc.name, line, facts, targetRoomId, reason: 'Entretien au poste disponible.' };
  } catch {
    // Reading refused/hostile data never normalizes it into a fresh success.
    return closed('invalid-save', 'Les données de cet entretien ne peuvent pas être relues.');
  }
}
