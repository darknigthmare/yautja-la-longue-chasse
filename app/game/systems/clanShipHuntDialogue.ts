import type { SaveGame } from '../types';
import { MISSION_BY_ID } from '../data';
import { inspectClanShipDocking, type ClanShipRoomId } from './clanShipDocking';
import { evaluateClanShipOperationsCampaign, inspectClanShipOperations, type ClanShipNpcId } from './clanShipOperations';
import { clanShipDialogue } from './clanShipDialogue';
import { inspectBuriedCradleCampaign } from './buriedCradleCampaign';
import { cradleReturnChoice } from './buriedCradleReturn';

/** Authored clan conversations, not canonical quotations. Only completed,
 * owner-bound field receipts are used; totals cannot establish the latest hunt.
 * No currency, recruitment, relationship, medical state or save is written. */
export const CLAN_FIELD_STORIES = {
  'field-jungle-survey': {
    'ash-scar': 'Vey savait chercher un chasseur dissimulé. Reprenons cette chasse sans supposer que le camouflage suffisait. Où aurais-tu choisi de rompre le contact ?',
    'star-watch': 'Oseris-IV ne se réduit pas au point où tu as retrouvé Vey. Garde aussi les repères de ton approche ; je ne choisirai pas le prochain départ sur la seule image de la prise.',
    'iron-claw': 'La canopée laisse peu de place à certains gestes. Montre-moi ce que tu avais choisi de porter. Je veux savoir si tu le reprendrais, pas te vendre une arme de plus.',
    'cold-trace': 'Nous avons les observations de cette expédition. Reprenons-les avant le combat contre Vey. C’est là que nous pourrons comparer ce que tu cherchais et ce que tu avais réellement vu.',
    'black-suture': 'Tu es revenu de cette chasse. Le récit ne me dit pas si tu cachais une blessure. S’il y a quelque chose à examiner, montre-le plutôt que de me laisser le deviner.',
    'threshold-guard': 'La chasse de Vey est rapportée. Pour ce qui revient avec toi, je regarderai les contenants eux-mêmes. Les images de la canopée ne remplacent pas leurs verrous.',
  },
  'field-ice-route': {
    'ash-scar': 'Le Cryostalker ne te donnait pas la chaleur que tu attendais. Pour la prochaine chasse, dis-moi ce que tu regarderas quand ton masque ne te donnera plus cette aide.',
    'star-watch': 'Nous avons une reconnaissance de Nivalis-K, pas une promesse que la glace tiendra toujours. Je garderai cette route avec ses observations, et je la regarderai de nouveau avant un départ.',
    'iron-claw': 'Avant de repartir sur Nivalis-K, reprends ton équipement pièce par pièce. Ce qui convenait sous la canopée n’est pas forcément ce que tu veux porter sur la glace.',
    'cold-trace': 'Le froid rendait cette proie difficile à lire. Reprenons les observations de cette chasse ; ne remplissons pas les blancs avec ce que son nom nous fait imaginer.',
    'black-suture': 'Le froid peut faire oublier une douleur avant le retour. Ce n’est pas un diagnostic. Si quelque chose ne répond plus comme avant, nous l’examinerons ici.',
    'threshold-guard': 'Tu as rapporté la chasse de Nivalis-K. Garde les prises à leur place pendant que nous préparons le sas. Le froid du dehors ne les rend pas inoffensives.',
  },
  'field-bad-blood': {
    'ash-scar': 'Le conseil demandait de retrouver ce paria. Sa chute ne rend pas chacun de tes gestes juste. Nous pouvons regarder ta chasse sans lui emprunter ses excuses.',
    'star-watch': 'La piste de Cinder-12 est dans ce rapport. Avant d’y renvoyer un chasseur, je reprendrai le trajet ; en finir avec un adversaire ne dégage pas toute une planète.',
    'iron-claw': 'Les trophées volés du paria ne disent rien de la valeur de ses armes. Ce qui compte maintenant, c’est de savoir ce qui a été récupéré, et à qui cela appartenait.',
    'cold-trace': 'Le paria ne parlera plus. C’est une raison de garder les observations, pas de les arranger. Ne lui ajoutons pas de complices que nous n’avons pas trouvés.',
    'black-suture': 'Le paria est tombé dans cette chasse. Cela ne referme pas une plaie. Tu peux parler de lui sans devoir faire semblant d’être déjà prêt à repartir.',
    'threshold-guard': 'La poursuite est accomplie. Si tu rapportes de l’équipement du paria, annonce-le au sas. Je ne laisserai pas une prise décider seule de sa place à bord.',
  },
  'field-ruins-memory': {
    'ash-scar': 'Un gardien qui répond à ce que tu lui montres mérite qu’on reprenne le combat. Pas seulement le dernier coup : le moment où tu as dû changer ton approche.',
    'star-watch': 'Acheron-Sigma reste une route à préparer. Les observations ramenées nous aideront ; elles ne me disent pas que toutes les terrasses sont encore praticables.',
    'iron-claw': 'Le Gardien d’obsidienne oblige à penser au-delà de la puissance. Reprends avec moi le choix des armes. Je ne vais pas attribuer ta réussite à une pièce que tu n’as peut-être pas portée.',
    'cold-trace': 'Les relevés des ruines sont là. Comparons-les sans décider d’avance qui a bâti cette cité. Une ressemblance ne suffit pas à lui donner un nom.',
    'black-suture': 'Tu as rapporté les observations des ruines. Je ne connais pas encore tout ce qui peut s’y trouver. N’approche pas un fragment inconnu de mes outils de soin.',
    'threshold-guard': 'Les ruines ont laissé des relevés. Les objets qu’on en sort demandent autre chose qu’un récit : montre ce que tu transportes avant d’ouvrir le contenant.',
  },
} as const satisfies Record<string, Record<ClanShipNpcId, string>>;

export const CLAN_CRADLE_STORIES = {
  'retreated': {
    'ash-scar': 'La reine n’est pas tombée dans ce retour. Nous pouvons reprendre l’approche sans déguiser le repli en victoire. Où voudrais-tu changer de route ?',
    'star-watch': 'Tu as présenté les observations du repli. Je les prendrai pour ce qu’elles sont : un retour possible, pas une voie libre jusqu’à la reine.',
    'iron-claw': 'Il n’y a pas de crête à préparer pour ce retour. Nous avons quand même de quoi revoir ton équipement. Montre-moi ce que tu voudrais reprendre.',
    'cold-trace': 'Tu n’as pas effacé le repli de ton récit. Les observations restent utiles. Regardons-les sans leur faire annoncer une reine vaincue.',
    'black-suture': 'La reine n’est pas tombée. Tu n’as rien à gagner à me cacher le reste du retour. Nous parlerons de la prochaine sortie après ce qui demande des soins.',
    'threshold-guard': 'Ce retour ne ramène pas la crête. Cela ne change rien au sas : montre ce qui est entré dans la soute, même si tu n’en feras pas un trophée.',
  },
  'victory-without-crown': {
    'ash-scar': 'Tu as vaincu la reine, mais sa crête n’est pas revenue. Ce sont deux faits différents. Raconte le combat sans ajouter la prise que tu n’as pas ramenée.',
    'star-watch': 'Le rapport dit que la reine est tombée et que la crête est restée là-bas. Pour une autre approche, nous préparerons le transport autant que l’aller.',
    'iron-claw': 'Sans crête rapportée, je ne prépare pas de support. Nous pouvons revoir ce qui t’aiderait à récupérer une prise ; je ne vais pas en fabriquer une à sa place.',
    'cold-trace': 'La reine est tombée, la prise est restée là-bas. Montre les images telles qu’elles sont. Je n’effacerai ni le combat ni le départ.',
    'black-suture': 'La crête est restée sur place. Je n’en déduis pas ce qui t’a obligé à partir. Dis-moi ce que tu veux faire examiner ; le rapport ne parle pas à ta place.',
    'threshold-guard': 'Alors la crête est restée là-bas. Je regarderai quand même ce que tu ramènes. Laisse les contenants au sas.',
  },
  'crown-returned': {
    'ash-scar': 'La crête est revenue avec toi. Maintenant que tu l’as présentée, nous pouvons regarder la chasse qui l’a rendue possible. Elle n’apprend rien si nous ne parlons que de sa taille.',
    'star-watch': 'Tu as ramené la crête et présenté ton retour. Garde aussi la route suivie. Elle aura plus d’utilité au prochain départ qu’un récit de victoire seul.',
    'iron-claw': 'La crête rapportée existe, cette fois. Sa place mérite d’être préparée avec soin. Pour son état exact, il faut la regarder ; je ne le devinerai pas à distance.',
    'cold-trace': 'Tu as rapporté de quoi montrer cette chasse. Approche les images de celles de la crête ; je veux les regarder ensemble.',
    'black-suture': 'La crête est revenue. Tu peux en être fier sans me demander d’y lire ton état. S’il reste une douleur, c’est toi que je veux voir, pas le trophée.',
    'threshold-guard': 'Le retour de la crête a été présenté au clan. Cela n’accorde pas le passage à n’importe quel autre prélèvement. Chaque contenant reste au sas jusqu’à son examen.',
  },
} as const satisfies Record<string, Record<ClanShipNpcId, string>>;

export type ClanHuntReportId = keyof typeof CLAN_FIELD_STORIES | 'buried-cradle';
export interface ClanHuntReport {
  id: ClanHuntReportId; label: string; line: string; detail: string;
  /** Immutable source identity; never described as the last attempt. */
  source: { kind: 'field'; missionId: string; encounterRun: number; completedAt: string; revision: number } |
    { kind: 'cradle'; outcome: keyof typeof CLAN_CRADLE_STORIES; revision: number };
}
export interface ClanHuntDialogue {
  name: string; options: ClanHuntReport[]; selected: ClanHuntReport | null;
  status: 'ready' | 'empty' | 'unavailable' | 'inconsistent'; message: string;
}

export function clanShipHuntDialogue(save: SaveGame, npcId: ClanShipNpcId, roomId: ClanShipRoomId,
  requested: unknown = null, active = true): ClanHuntDialogue | null {
  if (inspectClanShipDocking(save.clanShipDocking, save.createdAt).status !== 'valid') return null;
  const presence = clanShipDialogue(save, npcId, roomId, 'greeting', active);
  // Hearing witnesses stay on C37. No side conversation at their vacated posts.
  if (!presence?.present || presence.phase === 'hearing') return null;
  const state = inspectClanShipOperations(save.clanShipOperations, save.createdAt).state;
  if (!state || !evaluateClanShipOperationsCampaign(state, save).allowed)
    return { name: presence.name, options: [], selected: null, status: 'inconsistent', message: 'Ces relevés ne correspondent pas aux chasses conservées. Aucun récit n’a été ajouté.' };
  const options: ClanHuntReport[] = [];
  for (const receipt of [...state.completedContracts].reverse()) {
    const proof = receipt.proof;
    if (proof.kind !== 'field' || !Object.hasOwn(CLAN_FIELD_STORIES, receipt.contractId)) continue;
    const id = receipt.contractId as keyof typeof CLAN_FIELD_STORIES, mission = MISSION_BY_ID[proof.missionId];
    options.push({ id, label: mission.title, line: CLAN_FIELD_STORIES[id][npcId],
      detail: `Chasse rapportée : ${mission.planetName} — ${mission.targetName}. Ce récit concerne cette expédition, pas nécessairement ta dernière sortie.`,
      source: { kind: 'field', missionId: proof.missionId, encounterRun: proof.encounterRun,
        completedAt: proof.completedAt, revision: receipt.completedRevision } });
  }
  const cradle = inspectBuriedCradleCampaign(save.buriedCradle, save.createdAt).state;
  if (cradle?.status === 'reported' && cradleReturnChoice(cradle.returnVisit) === 'clan' &&
      cradle.outcome !== 'unresolved' && Object.hasOwn(CLAN_CRADLE_STORIES, cradle.outcome)) {
    options.push({ id: 'buried-cradle', label: 'Le retour du Berceau', line: CLAN_CRADLE_STORIES[cradle.outcome][npcId],
      detail: 'Retour du Berceau présenté au clan. L’analyse gardée à l’atelier ne devient jamais un récit partagé sans ce choix.',
      source: { kind: 'cradle', outcome: cradle.outcome, revision: cradle.returnVisit!.revision } });
  }
  const selected = requested === null ? options[0] ?? null : options.find(option => option.id === requested) ?? null;
  return { name: presence.name, options, selected, status: selected ? 'ready' : options.length ? 'unavailable' : 'empty',
    message: selected ? '' : options.length ? 'Ce récit n’est plus disponible. Choisis une autre chasse rapportée.' :
      'Aucune chasse rapportée au clan à évoquer ici. Un ancien score ou un trophée seul ne raconte pas le retour.' };
}
