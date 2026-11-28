/** Parcours d’obtention proposés à partir des fiches du catalogue du jeu. */
import type { TrustExerciseV153 } from './mountsV153.ts';

export interface MountFieldStageV153 extends TrustExerciseV153 { position: number }
export interface MountExpeditionV153 {
  title: string;
  route: string;
  portrait: string;
  stages: readonly MountFieldStageV153[];
}

const expeditions: Readonly<Record<string, MountExpeditionV153>> = {
  forest_stalker_mount: {
    title: 'La lisière de la dominante',
    route: 'Ruine envahie · Lisière, piste haute et refuge',
    portrait: '/game/mobility/mounts/37_forest_stalker_mount__3q_left.png',
    stages: [
      {
        id: 'leave-restraints', position: 2, label: 'Lisière · déposer le filet et le plasma',
        source: 'Fiche d’acquisition du Forest Stalker : aucun filet ni plasma pendant le dressage.',
        options: [
          { id: 'leave-both', label: 'Déposer le filet et le plasma au poste', ok: true, feedback: 'Les outils restent au poste pendant l’approche.' },
          { id: 'carry-net', label: 'Armer le filet au passage', ok: false, feedback: 'Le claquement du filet fait fuir la dominante. Retour à la lisière.' },
        ],
      },
      {
        id: 'follow-dominant', position: 6, label: 'Piste haute · suivre la dominante',
        source: 'La monture suit les branches et l’infiltration verticale de sa fiche.',
        options: [
          { id: 'stay-high', label: 'Rester sur la piste haute et la laisser prendre de l’avance', ok: true, feedback: 'La dominante ralentit et garde sa piste.' },
          { id: 'fire-plasma', label: 'Saisir le plasma de secours et tirer pour l’arrêter', ok: false, feedback: 'Le tir termine l’approche. Il faut reprendre au poste sans plasma.' },
        ],
      },
      {
        id: 'accept-contact', position: 10, label: 'Refuge · attendre le contact',
        source: 'Le dressage vise la femelle dominante repérée sur la piste.',
        options: [
          { id: 'wait-contact', label: 'Poser la longe ouverte et attendre son retour', ok: true, feedback: 'Elle revient d’elle-même et accepte la longe.' },
          { id: 'close-retreat', label: 'Bloquer la sortie du refuge', ok: false, feedback: 'Elle bondit vers la cime. Reprends depuis la lisière.' },
        ],
      },
    ],
  },
  sand_mauler: {
    title: 'L’offrande de la meute',
    route: 'Mer de cendres · Terriers, dune et guet de la meute',
    portrait: '/game/mobility/mounts/38_sand_mauler__3q_left.png',
    stages: [
      {
        id: 'capture-burrower', position: 3, label: 'Terriers · récupérer un fouisseur vivant',
        source: 'La fiche d’acquisition demande une proie fouisseuse vivante.',
        options: [
          { id: 'live-cage', label: 'Attendre la sortie et fermer la cage de transport', ok: true, feedback: 'Un fouisseur vivant est dans la cage ventilée.' },
          { id: 'strike-prey', label: 'Frapper la proie avant de la ramasser', ok: false, feedback: 'Le fouisseur ne bouge plus. La meute attend une proie vivante.' },
        ],
      },
      {
        id: 'keep-burrower-alive', position: 7, label: 'Dune · maintenir le fouisseur vivant',
        source: 'Le transport se fait sur sable et garde la proie capturée vivante.',
        options: [
          { id: 'shade-prey', label: 'Vérifier l’air de la cage et la porter à l’ombre', ok: true, feedback: 'Le fouisseur remue encore. Le guet est à portée.' },
          { id: 'open-cage', label: 'Ouvrir complètement la cage dans la dune', ok: false, feedback: 'La proie s’enfouit hors de portée. Reviens aux terriers.' },
        ],
      },
      {
        id: 'present-living-prey', position: 11, label: 'Guet · présenter le fouisseur à la meute',
        source: 'La confiance de la meute se gagne en lui apportant cette proie.',
        options: [
          { id: 'release-at-guet', label: 'Libérer le fouisseur devant la meute et reculer', ok: true, feedback: 'La meute accepte la proie vivante. Un individu s’approche.' },
          { id: 'steal-young', label: 'Garder la proie et attraper le plus jeune', ok: false, feedback: 'La meute défend ses petits. Reviens aux terriers.' },
        ],
      },
    ],
  },
  stoneback: {
    title: 'Le passage du troupeau',
    route: 'Désert rocheux · Guet, défilé et refuge',
    portrait: '/game/mobility/mounts/39_stoneback__3q_left.png',
    stages: [
      {
        id: 'record-illegal-hunt', position: 3, label: 'Guet · établir la chasse illégale',
        source: 'La fiche d’acquisition demande de sauver un troupeau d’une chasse illégale.',
        options: [
          { id: 'relay-hunt-traces', label: 'Relever les filets fermés et transmettre l’alerte aux gardiens', ok: true, feedback: 'Les gardiens confirment le braconnage et protègent le guet.' },
          { id: 'rush-herd', label: 'Foncer au milieu du troupeau pour le faire déguerpir', ok: false, feedback: 'Les adultes se dispersent près des filets. Retour au guet.' },
        ],
      },
      {
        id: 'clear-herd-passage', position: 8, label: 'Défilé · dégager le passage large',
        source: 'La masse du Stoneback lui interdit les passages étroits.',
        options: [
          { id: 'open-wide-route', label: 'Décrocher la fermeture du large défilé pour les adultes', ok: true, feedback: 'Adultes et petits peuvent passer ensemble hors des filets.' },
          { id: 'choose-tight-slot', label: 'Diriger le troupeau vers la fente la plus courte', ok: false, feedback: 'Les adultes bloquent la fente. Les gardiens les ramènent en amont.' },
        ],
      },
      {
        id: 'verify-safe-herd', position: 12, label: 'Refuge · faire constater le passage',
        source: 'Le maître des bêtes confie un Stoneback après le sauvetage du troupeau.',
        options: [
          { id: 'wait-all-and-confirm', label: 'Attendre les derniers petits et appeler le maître des bêtes', ok: true, feedback: 'Le troupeau est à l’abri. Le maître des bêtes confie un Stoneback au registre.' },
          { id: 'claim-alone', label: 'Réclamer le premier adulte avant le passage des petits', ok: false, feedback: 'Le sauvetage doit couvrir tout le troupeau. Reviens au guet.' },
        ],
      },
    ],
  },
  ice_fang: {
    title: 'La piste de la nuit polaire',
    route: 'Toundra · Crépuscule, nuit profonde et première lueur',
    portrait: '/game/mobility/mounts/40_ice_fang__3q_left.png',
    stages: [
      {
        id: 'dusk-trail', position: 2, label: 'Crépuscule · relever la première trace de l’alpha',
        source: 'La fiche demande le pistage de l’alpha sans vision thermique.',
        options: [
          { id: 'snow-print', label: 'Lire l’empreinte profonde dans la neige', ok: true, feedback: 'La taille et la direction trahissent le passage de l’alpha.' },
          { id: 'thermal-dusk', label: 'Activer la vision thermique', ok: false, feedback: 'Le registre interrompt la nuit de pistage. Repars au crépuscule.' },
        ],
      },
      {
        id: 'night-trail', position: 6, label: 'Nuit profonde · retrouver la même piste',
        source: 'Le pistage couvre une nuit entière, à l’échelle du jeu.',
        options: [
          { id: 'windward-print', label: 'Suivre les empreintes à l’abri du vent', ok: true, feedback: 'Le même pas mène au dernier abri avant l’aube.' },
          { id: 'thermal-night', label: 'Basculer en thermique pour couper la piste', ok: false, feedback: 'La piste à l’œil est interrompue. Repars au crépuscule.' },
        ],
      },
      {
        id: 'dawn-trail', position: 10, label: 'Première lueur · retrouver l’alpha',
        source: 'La première lueur termine le parcours sans vision thermique.',
        options: [
          { id: 'track-to-dawn', label: 'Attendre la lueur derrière la crête, puis suivre le pas', ok: true, feedback: 'L’alpha s’arrête près de toi. La nuit de pistage est complète.' },
          { id: 'thermal-dawn', label: 'Confirmer sa position au thermique', ok: false, feedback: 'La nuit doit être entièrement suivie à l’œil. Repars au crépuscule.' },
        ],
      },
    ],
  },
};

export function mountExpeditionV153(id: string): MountExpeditionV153 | undefined {
  return Object.hasOwn(expeditions, id) ? expeditions[id] : undefined;
}

export const MOUNT_EXPEDITION_IDS_V153 = Object.freeze(Object.keys(expeditions));
