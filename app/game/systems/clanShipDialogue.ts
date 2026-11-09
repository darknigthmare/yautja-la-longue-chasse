import type { SaveGame } from '../types';
import type { ClanShipRoomId } from './clanShipDocking';
import { CLAN_SHIP_RECRUITS, clanShipContract, inspectClanShipOperations, type ClanShipNpcId } from './clanShipOperations';
import { CLAN_SHIP_SPACE_SCENARIOS } from './clanShipSpaceEncounter';
import { inspectCompanionResidence, type CompanionCampaign } from './companionResidence';
import { clanShipTrophyWitnessPost, inspectClanShipTrophyHearing, isClanShipTrophyWitnessGathered } from './clanShipTrophyHearing';

/** Original voices for this clan, not a universal Yautja code or a new ledger.
 * All lines read already-validated receipts. No dialogue grants proof, marks,
 * recruitment, quarters, rank or an operation result. */
export const CLAN_SHIP_DIALOGUE_TOPICS = [
  { id: 'greeting', label: 'Prendre des nouvelles' },
  { id: 'work', label: 'Parler de la prochaine sortie' },
  { id: 'agreement', label: 'Parler de notre accord' },
  { id: 'return', label: 'Revenir sur le dernier affrontement' },
] as const;
export type ClanShipDialogueTopic = typeof CLAN_SHIP_DIALOGUE_TOPICS[number]['id'];
export type ClanShipDialoguePhase = 'greeting' | 'work' | 'invitation' | 'agreement' | 'no-report' |
  'return-victory' | 'return-defeat' | 'return-withdrawn' | 'hearing';
interface ClanVoice {
  greeting: string; work: string; invitation: string; agreement: string; noReport: string;
  victory: string; defeat: string; withdrawn: string; hearing?: string;
}
export const CLAN_SHIP_VOICES: Readonly<Record<ClanShipNpcId, ClanVoice>> = {
  'ash-scar': {
    greeting: 'Tu regardes encore les cibles. Bien. Elles ne t’apprendront rien si tu ne te demandes pas ce qu’elles auraient fait en retour.',
    work: 'Ne prépare pas seulement le coup que tu espères porter. Prépare celui qui échoue, et la place où tu seras juste après.',
    invitation: 'Tu as étudié la chasse au lieu de compter les coups. C’est un début. Je préparerai tes prochaines sorties, si nous nous entendons sur ma place auprès de toi.',
    agreement: 'Mon accord tient. Je t’aiderai à préparer tes sorties ; je ne porterai pas tes coups à ta place.',
    noReport: 'Montre-moi d’abord un engagement de ton cercle. Sans les images, je ne peux pas te dire où tu as laissé l’adversaire reprendre l’avantage.',
    victory: 'L’objectif est atteint. Reprends pourtant le moment où la formation était la plus exposée : c’est là que tu as encore quelque chose à apprendre.',
    defeat: 'Cette fois, la formation a échoué. Regarde l’ordre qui l’a laissée exposée. Une erreur reconnue sert davantage qu’un récit arrangé.',
    withdrawn: 'Tu as ordonné le repli. Dis-toi maintenant ce qui aurait dû être prêt avant l’engagement, pas ce que tu aurais pu tuer en restant.',
    hearing: 'Tu nous as fait venir devant la prise. Montre les relevés, dans l’ordre. Je veux voir où mon nom a disparu.',
  },
  'star-watch': {
    greeting: 'L’amarrage est calme. C’est le bon moment pour regarder une route, pas quand tout le monde attend déjà le départ.',
    work: 'Garde un chemin de retour dans ton choix de route. L’approche la plus courte n’est pas toujours celle que tu pourras reprendre.',
    invitation: 'Tu n’as pas traversé la glace les yeux fermés. Ces observations me seront utiles. Je suis prête à préparer tes routes ; il reste à nous entendre.',
    agreement: 'Tu as mon accord. Préviens-moi avant de fixer le départ ; une route se prépare avant que les moteurs ne chauffent.',
    noReport: 'Je n’ai pas encore les images d’un engagement de ton cercle. Pour l’instant, occupons-nous de la route que vous allez prendre.',
    victory: 'La formation a achevé sa tâche. Conserve aussi la route suivie : la prochaine approche ne devra pas dépendre du souvenir de quelqu’un.',
    defeat: 'La formation n’a pas tenu. Reprends les changements de distance ; vouloir gagner du terrain trop tôt peut coûter tout le retour.',
    withdrawn: 'Le repli est consigné. Nous pourrons reprendre la route avec une autre approche, pas faire comme si celle-ci avait réussi.',
  },
  'iron-claw': {
    greeting: 'Regarde les marques avant de prendre une arme. Si tu ne reconnais pas son porteur, laisse-la au râtelier.',
    work: 'Choisis ce que tu sauras employer, puis garde de quoi finir. Une arme vide reste belle sur une plaque ; en chasse, elle devient un poids.',
    invitation: 'Tu as regardé les marques avant d’accuser quelqu’un. Je peux travailler avec un chasseur comme toi. Mettons-nous d’accord avant la prochaine sortie.',
    agreement: 'Je n’ai pas oublié notre accord. Ramène les armes quand elles ont servi, pas seulement quand elles ne répondent plus.',
    noReport: 'Apporte-moi les images du prochain engagement. Je regarderai ce qu’il restait dans les armes avant le dernier tir, pas seulement ce qu’il a touché.',
    victory: 'Vous avez pris le dessus. Maintenant, regarde la réserve au dernier tir. La prochaine fois, l’adversaire ne te laissera peut-être pas finir aussi vite.',
    defeat: 'L’engagement est perdu. Ne demande pas d’abord une arme plus forte. Regarde si tu pouvais encore l’alimenter au moment décisif.',
    withdrawn: 'Le repli laisse une question : manquait-il de la puissance, ou l’as-tu dépensée trop tôt ? Les ordres conservés permettront de le voir.',
  },
  'cold-trace': {
    greeting: 'Une marque seule raconte rarement toute la chasse. Approche le relevé. Regarde aussi ce qui manque autour.',
    work: 'Observe avant de décider ce que tu poursuis. Ce que tu sais déjà de la proie peut t’empêcher de voir ce qu’elle fait cette fois.',
    invitation: 'Tes images de la canopée montrent ce que tu as suivi, pas seulement ce que tu as tué. Je veux bien chercher les prochaines pistes avec toi.',
    agreement: 'Nous avons un accord. Apporte-moi les images entières, même celles qui contredisent ton premier récit.',
    noReport: 'Je n’ai pas les images d’un engagement de ton cercle. Sans elles, je ne sais pas ce que vous avez vu. Parle-moi plutôt du terrain que tu veux rejoindre.',
    victory: 'Le résultat est là. Garde l’observation qui a permis d’identifier le contact, pas seulement celle du dernier coup.',
    defeat: 'Le résultat ne nous plaît pas. C’est une mauvaise raison pour en retirer les images utiles. Reprends ce qui était visible avant le premier ordre.',
    withdrawn: 'Le repli n’efface pas ce qui a été observé. Revois l’approche avant de décider si tu veux retrouver ce contact.',
    hearing: 'Le coffre portait ma ligature. La prise portait déjà sa marque. Montrons les deux, au lieu de choisir un nom avant de regarder.',
  },
  'black-suture': {
    greeting: 'Tu peux attendre près de l’entrée, pas devant mes outils. Celui qui en aura besoin n’aura peut-être pas la force de te demander de bouger.',
    work: 'Prépare la place du retour avant celle du trophée. Je ne refuse pas tes chasses ; je refuse d’apprendre leurs blessures quand il est trop tard pour agir.',
    invitation: 'Le passage est prêt. Tu as pensé à ceux qui reviendront trop mal en point pour le dégager eux-mêmes. Je peux veiller sur ton cercle ; préviens-moi avant vos départs.',
    agreement: 'Je tiendrai mon engagement. Toi, ne me cache pas une blessure pour paraître prêt à repartir.',
    noReport: 'Je n’ai pas de retour d’engagement à examiner avec toi. Ne m’en invente pas un pour rester ici : laisse mes outils dégagés.',
    victory: 'L’objectif est atteint. Cela ne dit pas à lui seul dans quel état chacun reviendra. Le poste de soins reste libre.',
    defeat: 'L’opération a échoué. Je veux savoir ce qui peut encore revenir avant de préparer les soins. Laisse le passage libre.',
    withdrawn: 'Tu as choisi de dégager la formation. Laisse le passage libre ; le retour compte encore, même sans victoire.',
  },
  'threshold-guard': {
    greeting: 'Attends de ce côté. Je regarde les verrous avant de laisser passer quoi que ce soit du hangar aux coursives.',
    work: 'Annonce ce qui revient avec toi. Une prise silencieuse peut encore être dangereuse, et je ne devinerai pas ce que tu as enfermé.',
    invitation: 'Tu es revenu vérifier le dernier verrou. Beaucoup s’arrêtent quand le premier voyant s’allume. Je peux veiller sur tes retours ; entendons-nous là-dessus.',
    agreement: 'Notre accord tient. Il ne donne pas à ta cargaison le droit de passer sans que je la regarde.',
    noReport: 'Ton cercle n’a pas encore de retour d’engagement à me montrer. Quand ce sera le cas, annonce ce que vous ramenez avant de demander l’ouverture.',
    victory: 'Vous avez eu ce que vous cherchiez. Cela ne veut pas dire que tout ce qui vous accompagne peut entrer dans les coursives.',
    defeat: 'L’engagement a échoué. Cela ne rend pas le contrôle du retour moins nécessaire. Je garde le sas.',
    withdrawn: 'Le repli est ordonné. Que le retour soit glorieux ou non, les verrous restent les mêmes.',
  },
};
export interface ClanShipDialogue {
  npcId: ClanShipNpcId; name: string; present: boolean; phase: ClanShipDialoguePhase | null;
  line: string | null; detail: string | null; reason: string;
}
type DialogueSave = CompanionCampaign & Pick<SaveGame, 'clanShipIncidents' | 'clanShipTrophyHearing'>;

/** The enclosing native operations panel is opened only at its service point.
 * Being on a roster card is NOT physical presence. Refit rooms and the C37
 * gathering use the same location helper as the rendered native actors. */
export function clanShipDialogue(save: DialogueSave, npcId: ClanShipNpcId, roomId: ClanShipRoomId,
  topic: ClanShipDialogueTopic = 'greeting', active = true): ClanShipDialogue | null {
  const npc = CLAN_SHIP_RECRUITS.find(entry => entry.id === npcId);
  if (!npc || !CLAN_SHIP_DIALOGUE_TOPICS.some(entry => entry.id === topic)) return null;
  const silent = (reason: string): ClanShipDialogue => ({ npcId, name: npc.name, present: false, phase: null, line: null, detail: null, reason });
  if (!active) return silent('Entretien en pause.');
  const state = inspectClanShipOperations(save.clanShipOperations, save.createdAt).state;
  if (!state) return silent('Le dossier de campagne doit être récupéré avant cet entretien.');
  const residence = inspectCompanionResidence(save.companionResidence, save.createdAt);
  const hearing = inspectClanShipTrophyHearing(save.clanShipTrophyHearing, save.createdAt);
  if (!['valid', 'absent'].includes(residence.status) || !['valid', 'absent'].includes(hearing.status))
    return silent('La présence à bord ne peut pas être établie avec ces données.');
  const docking = save.clanShipDocking;
  if (docking?.ownerCreatedAt !== save.createdAt || docking.status !== 'aboard' || docking.roomId !== roomId)
    return silent('Rejoins physiquement le pont du clan pour cet entretien.');
  const gathered = isClanShipTrophyWitnessGathered(save, npcId);
  const post = clanShipTrophyWitnessPost(save, npcId);
  if (!post || (gathered ? 'trophees' : post) !== roomId)
    return silent(`${npc.name} n’est pas disponible à ce poste. La fiche ne permet pas de lui parler à distance.`);
  const voice = CLAN_SHIP_VOICES[npcId];
  const say = (phase: ClanShipDialoguePhase, line: string, detail: string | null = null): ClanShipDialogue =>
    ({ npcId, name: npc.name, present: true, phase, line, detail, reason: '' });
  if (gathered && voice.hearing) return say('hearing', voice.hearing, 'Devant le trophée C-37, les deux témoins attendent de revoir les images.');
  if (topic === 'agreement') return state.recruitedNpcIds.includes(npcId)
    ? say('agreement', voice.agreement, 'Votre accord tient toujours.')
    : say('invitation', voice.invitation, 'Propose-lui de rejoindre ton cercle.');
  if (topic === 'work') {
    const task = clanShipContract(state.activeContract?.contractId);
    return say('work', voice.work, task ? `Demande en cours : ${task.name}.` : 'Aucune nouvelle demande du clan en cours.');
  }
  if (topic === 'return') {
    const archived = [...state.completedContracts].reverse().find(receipt => receipt.proof.kind === 'space');
    const encounter = state.spaceEncounter?.status !== 'active' && state.spaceEncounter
      ? state.spaceEncounter : archived?.proof.kind === 'space' ? archived.proof.encounter : null;
    if (!encounter || encounter.status === 'active') return say('no-report', voice.noReport);
    const line = encounter.status === 'victory' ? voice.victory : encounter.status === 'defeat' ? voice.defeat : voice.withdrawn;
    return say(`return-${encounter.status}`, line, `Engagement spatial : ${CLAN_SHIP_SPACE_SCENARIOS[encounter.kind].title}.`);
  }
  return say('greeting', voice.greeting);
}
