import { PIT_CHRONICLE_SEEDS_V80, type PitChronicleSeedV80 } from '../data/pitChronicleSeedsV80';
import { PIT_VERSUS_FIGHTER_IDS, getPitFighterProfile, isPitVersusFighterId, type PitVersusFighterId } from './pitRosterExpansion';
import { getPitCharacterStageAssociation } from './pitCharacterStages';
import { isPitOriginalFighterIdV56 } from './pitOriginalFightersV56';
import { PIT_ARENAS, type PitArenaId } from './pitCombat';
import type { PitCharacterChronicleRouteV79, PitCharacterChroniclePanelV79 } from './pitCharacterChroniclesV79';

/** CQC's structure, not its MGS canon or assets: 3 opening panels, 8 actual
 * CPU encounters with before/challenge/after, 3 earned closing panels. */
const axes: Readonly<Record<string, readonly [string, string, string][]>> = {
  "hunt": [
    [
      "La trace brisée",
      "retrouver l'appui où la piste change de direction",
      "Tu ne me donneras pas ma piste."
    ],
    [
      "Le départ attendu",
      "rompre le rythme que la garde adverse attend",
      "Attends donc le prochain pas."
    ],
    [
      "La seconde ombre",
      "garder le vrai retour malgré la silhouette qui attire devant",
      "Je regarde aussi derrière."
    ],
    [
      "Au bord de la garde",
      "arrêter la poussée avant de perdre le dernier recul",
      "Le bord ne fera pas ton travail."
    ],
    [
      "Les pistes croisées",
      "gagner l'angle où les deux approches se séparent",
      "Choisis ta propre garde."
    ],
    [
      "La silhouette immobile",
      "faire venir le rival hors de son attente",
      "Viens gagner cette distance."
    ],
    [
      "Le retour repris",
      "tenir le flanc qui ramène à la première halte",
      "Cette voie reste ouverte."
    ],
    [
      "Le dernier chasseur",
      "atteindre le rival sans abandonner son appui arrière",
      "La piste s'arrête devant toi."
    ]
  ],
  "rescue": [
    [
      "L'appel derrière la garde",
      "gagner une place d'où l'appel peut encore être entendu",
      "Je reviens vers cet appel."
    ],
    [
      "L'issue disputée",
      "rompre la garde qui ferme la voie la plus courte",
      "Cède le passage."
    ],
    [
      "Le relais exposé",
      "tenir le ralliement malgré la pression du flanc",
      "Je reste ici."
    ],
    [
      "Revenir sous la garde",
      "reprendre le passage gagné au lieu de poursuivre aveuglément",
      "Tu ne m'éloigneras pas du retour."
    ],
    [
      "Les deux appels",
      "garder une place entre les deux voies de ralliement",
      "Il reste quelqu'un derrière."
    ],
    [
      "Le départ refusé",
      "refuser l'ouverture qui laisserait l'autre silhouette seule",
      "Je ne pars pas de ce côté."
    ],
    [
      "La sortie tenue",
      "gagner le dernier appui sans refermer l'issue",
      "Laisse le retour."
    ],
    [
      "Le dernier ralliement",
      "arrêter le rival avant qu'il gagne la voie du retour",
      "Tu ne resteras pas entre les deux."
    ]
  ],
  "custody": [
    [
      "La prise du relais",
      "arrêter la main qui vient prendre l'objet au premier départ",
      "Cette prise doit être gagnée."
    ],
    [
      "Le seuil forcé",
      "tenir la distance devant l'entrée disputée",
      "Le seuil reste sous ma garde."
    ],
    [
      "Le flanc laissé ouvert",
      "gagner le flanc que la poussée voudrait laisser vide",
      "Regarde aussi ce côté."
    ],
    [
      "La relève tardive",
      "tenir l'appui jusqu'au prochain mouvement de relève",
      "Pas avant la relève."
    ],
    [
      "Le recul feint",
      "refuser la poursuite qui abandonnerait le passage",
      "Tu peux reculer, je tiens ici."
    ],
    [
      "L'autre approche",
      "reprendre la garde depuis le côté jusqu'ici oublié",
      "Je t'attendais aussi là."
    ],
    [
      "La pièce exposée",
      "protéger le dernier retour pendant le changement d'appui",
      "La voie ne sera pas laissée vide."
    ],
    [
      "La garde finale",
      "défendre l'objet devant le rival qui veut s'en emparer",
      "Viens le reprendre."
    ]
  ],
  "repair": [
    [
      "L'appui qui cède",
      "trouver une garde qui ne livre pas la pièce au premier choc",
      "Je ne te donnerai pas cet appui."
    ],
    [
      "La course interrompue",
      "changer de direction avant l'arrêt attendu",
      "Mon départ n'est pas le tien."
    ],
    [
      "Le choc répété",
      "garder l'objet hors du heurt qui le briserait",
      "Tu frapperas ma garde d'abord."
    ],
    [
      "Le détour porteur",
      "gagner un autre flanc au lieu de forcer la voie fragile",
      "Je passe par ici."
    ],
    [
      "Le réglage imposé",
      "reprendre le rythme d'approche au rival",
      "Je choisis mon arrêt."
    ],
    [
      "L'appui du revers",
      "tenir la garde attaquée depuis l'autre côté",
      "Le revers reste couvert."
    ],
    [
      "La remise disputée",
      "reprendre la voie où la pièce peut être rendue",
      "La voie doit tenir."
    ],
    [
      "Le dernier heurt",
      "gagner le dernier appui sans écraser l'objet poursuivi",
      "Ce heurt ne prendra pas tout."
    ]
  ],
  "identity": [
    [
      "La place refusée",
      "gagner l'entrée que le premier gardien veut réserver",
      "Je prends ma place."
    ],
    [
      "La garde regardée",
      "tenir son appui malgré le regard qui attend une faiblesse",
      "Regarde ma garde."
    ],
    [
      "Le pas presque semblable",
      "rompre une approche qui imite le premier départ",
      "Mon prochain pas sera le mien."
    ],
    [
      "La faveur abandonnée",
      "gagner la voie plutôt que prendre la place offerte",
      "Je n'attends pas ta faveur."
    ],
    [
      "Au bord du choix",
      "reprendre le centre avant que la poussée décide du départ",
      "Le bord ne choisira pas."
    ],
    [
      "La réponse au contact",
      "agir avant que le rival impose son rythme",
      "Je réponds ici."
    ],
    [
      "La garde montrée",
      "défendre une entrée visible sans se cacher derrière le titre",
      "Voici mon appui."
    ],
    [
      "La place conservée",
      "tenir le choix d'entrée devant le rival final",
      "Tu gagneras cette place face à moi."
    ]
  ],
  "freedom": [
    [
      "Le seuil refermé",
      "reprendre le recul que l'entrée vient de retirer",
      "L'entrée ne garde pas mon départ."
    ],
    [
      "La sortie gardée",
      "gagner l'appui le plus proche du retour",
      "Je gagne la sortie."
    ],
    [
      "Le lien en vue",
      "rompre l'approche qui ramène vers le lien",
      "Je ne reviens pas à cette place."
    ],
    [
      "Les voies séparées",
      "garder un retour malgré la garde qui partage le passage",
      "Le retour reste à portée."
    ],
    [
      "Le heurt du seuil",
      "tenir l'espace libre sous la dernière poussée",
      "Tu ne fermes pas derrière moi."
    ],
    [
      "La fuite attendue",
      "gagner le flanc au lieu de fuir par le départ offert",
      "Je choisis où repartir."
    ],
    [
      "L'accès rouvert",
      "garder la voie gagnée pour le prochain passage",
      "L'accès reste ouvert."
    ],
    [
      "Partir face au rival",
      "défaire la garde qui prétend posséder le dernier départ",
      "Le départ sera mon choix."
    ]
  ],
  "archive": [
    [
      "L'objet dérobé",
      "atteindre la garde qui vient d'emporter l'objet",
      "Je suis venu le reprendre."
    ],
    [
      "Les deux passages",
      "gagner la voie qui n'est pas l'invitation facile",
      "Le détour ne me perdra pas."
    ],
    [
      "Le recul sans témoin",
      "refuser la poursuite qui ferait disparaître le retour",
      "Je reste près de la halte."
    ],
    [
      "La prise exposée",
      "garder un appui entre l'objet et la prochaine garde",
      "Tu gagneras la distance."
    ],
    [
      "Le repère perdu",
      "retrouver l'appui dont le heurt a effacé la trace",
      "La trace ne suffit pas à me perdre."
    ],
    [
      "Le trajet changé",
      "rompre l'attente du rival sur le départ répété",
      "Ce pas ne sera pas le même."
    ],
    [
      "Le relais du retour",
      "reprendre le flanc par lequel l'objet doit revenir",
      "La halte reste derrière moi."
    ],
    [
      "La pièce retrouvée",
      "reprendre l'objet au rival qui tient le dernier relais",
      "Rends la garde ou tiens-la."
    ]
  ],
  "rule": [
    [
      "La place des deux gardes",
      "gagner son départ sans prendre celui du rival",
      "Je prends cette entrée."
    ],
    [
      "La force au centre",
      "arrêter le heurt avant qu'il emporte les deux appuis",
      "La force devra s'arrêter ici."
    ],
    [
      "Le dernier pas de recul",
      "reprendre la distance qui permet encore de se retourner",
      "Je garde ce dernier pas."
    ],
    [
      "Le centre offert",
      "refuser l'ouverture qui ferait perdre le témoin de vue",
      "Le centre ne m'attirera pas."
    ],
    [
      "L'appui du témoin",
      "gagner la garde qui pousse le témoin hors du passage",
      "Cette place reste tenue."
    ],
    [
      "L'avantage trop facile",
      "garder le choix plutôt que suivre l'appui qui cède",
      "Viens reprendre ta garde."
    ],
    [
      "La voie de relève",
      "tenir un passage que le prochain peut encore reprendre",
      "La voie sera laissée ouverte."
    ],
    [
      "Le choix face au rival",
      "tenir l'appui choisi devant la dernière pression",
      "Le choix se gagne ici."
    ]
  ]
};

const witnesses: Readonly<Record<string, readonly PitVersusFighterId[]>> = {
  hunt: ['falconer','tracker','feral-hunter','user-scout','user-two-stripes','user-light-stepper','jungle-hunter','city-hunter','user-primal','user-big-game'],
  rescue: ['user-broken-tusk','user-kwei','user-big-mama','user-guardian','user-shorty','user-sister-midnight','machiko-noguchi','theta','user-smiley','scar'],
  custody: ['user-guardian','user-warp-gardien','wolf','user-bonegrill-avpr','user-temple-guard','enforcer','user-warp-adjutant','greyback','user-spartan','user-warp-enforcer'],
  repair: ['user-bionic-phg','user-hook','user-long-spear','user-swift-knife','user-extinction-brawler','stone-heart','scarface','user-cracked-tusk','user-spiked-tail','user-lava-planet'],
  identity: ['user-youngblood','user-captive','user-elder-avp','user-hunter-class-phg','user-avp-prologue-1904','user-samurai','machiko-noguchi','user-classic-2010','greyback','user-njohrr'],
  freedom: ['user-captive','user-classic-2010','user-exiled-phg','user-pirate-phg','user-gladiator-phg','user-warp-gardien','user-alpha','user-fugitive','user-dek','user-guardian'],
  archive: ['user-shaman','user-dark-horse-25th','user-ancient-homeworld','user-graveyard','user-skinner','user-emissary-phg','user-dark','greyback','user-scout','user-lord'],
  rule: ['user-warrior','celtic','valkyrie','user-boar','user-clan-leader','enforcer','greyback','user-youngblood','user-elder-avp','kok-warlord'],
};

/** Physical stakes are prose in a ritual story, not fabricated mechanics,
 * spawned captives, stage destruction or new weapon effects. */
const pressure: Readonly<Record<string, readonly string[]>> = {
  hunt: ["une silhouette rompt sa marche puis repart derrière le premier appui", "le rival coupe la piste et attend un départ trop rapide", "un second mouvement attire le regard loin du passage suivi", "la garde adverse ferme l'espace où la proie aurait pu revenir", "deux approches se croisent et rendent la première piste douteuse", "l'adversaire reste immobile jusqu'au dernier pas", "le retour se trouve maintenant derrière la garde adverse", "la silhouette poursuivie se retourne et attend le chasseur"],
  rescue: ["un appel se perd derrière le premier adversaire", "le gardien couvre l'issue la plus directe", "une attaque pousse le combattant loin du point de ralliement", "le chemin gagné oblige à tourner le dos au précédent appui", "un appel d'un autre côté tente de disperser l'attention", "l'adversaire offre la victoire si le passage resté derrière est abandonné", "le dernier appui libre est à portée de la garde adverse", "le rival se place entre le combattant et le retour attendu"],
  custody: ["le gardien tente de saisir la pièce avant que le porteur soit prêt", "le rival veut forcer le seuil par une approche directe", "un témoin doit reculer tandis que la garde avance", "la relève tarde et laisse le porteur seul sur son appui", "la première menace se retire pour attirer une sortie précipitée", "une seconde approche survient du côté laissé sans garde", "le prochain porteur attend derrière la ligne tenue par l'adversaire", "le rival tente de reprendre la pièce dans la dernière confrontation"],
  repair: ["le poids du premier heurt révèle un appui incertain", "la garde adverse oblige à changer de direction en pleine approche", "un choc répété menace d'emporter le repère avec sa pièce", "la voie directe offrirait l'impact décisif au prix du retour", "une pression courte tente d'imposer le réglage le plus facile", "l'adversaire attaque depuis le côté jamais encore éprouvé", "la pièce est de nouveau exposée quand son porteur change d'appui", "le rival frappe l'appui dont dépend la dernière remise"],
  identity: ["le premier gardien refuse de céder la place réservée par le nom", "l'adversaire éprouve l'appui au lieu de regarder l'ornement", "une garde presque identique tente de faire hésiter le combattant", "l'entrée doit être gagnée sans la faveur du titre", "un heurt au bord menace de remplacer le choix par un réflexe", "la garde adverse ne laisse plus le temps d'attendre une instruction", "l'espace qui reste oblige à montrer franchement son intention", "le rival avance pour imposer lui-même la dernière place"],
  freedom: ["la garde se ferme aussitôt le visiteur entré", "l'adversaire prend l'appui le plus proche de la sortie", "une approche feinte veut ramener le visiteur vers le lien", "le rival tente de séparer le passage de son retour", "un heurt ferait céder l'espace libre derrière le visiteur", "l'adversaire attend qu'une fuite remplace le choix du départ", "une dernière pression veut refermer la voie gagnée", "le rival défend l'issue comme si elle lui appartenait"],
  archive: ["un gardien tente d'emporter la pièce dès le début de l'approche", "deux mouvements presque semblables masquent le vrai passage", "le rival se retire assez pour entraîner une poursuite sans témoin", "la garde impose de passer devant le seul observateur resté en place", "un choc au centre veut faire perdre le repère d'origine", "l'adversaire change d'appui sur un trajet jusque-là toujours répété", "la pièce doit revenir par le flanc que personne n'a encore tenu", "le rival se poste au dernier relais pour garder l'objet hors de portée"],
  rule: ["la garde du premier rival occupe les deux places de départ", "un heurt frontal tente de remplacer la mesure par la force", "l'adversaire pousse jusqu'à ne laisser qu'un pas de recul", "une ouverture facile ferait quitter le cercle au témoin", "le rival couvre l'appui où le témoin voulait rester", "la garde vacille et offre un avantage qui fermerait le retrait", "une nouvelle pression éprouve la place gardée pour le retour", "le rival exige que le choix soit tenu face à lui"],
};
const resolved = [
  "La première garde cède ; le passage cesse d'être une promesse et devient un appui gagné.",
  "L'attaque menée depuis l'autre côté est arrêtée. Le détour reste ouvert après le heurt.",
  "L'adversaire recule sans emporter le repère. Un témoin peut rester près du passage.",
  "Le recul est maîtrisé avant le bord. Le trajet ne s'est pas transformé en piège fermé.",
  "La feinte n'arrache pas le combattant à son appui. L'enjeu du passage n'a pas été abandonné.",
  "La pression se brise du côté jusque-là négligé. La dernière approche peut être préparée.",
  "Le dernier gardien quitte la voie. Le rival annoncé attend maintenant sans intermédiaire.",
];
function narrativeChoice(seed: PitChronicleSeedV80): string {
  // Keep the authored decision intact, including its negative clauses.
  // Documentary caveats are separate fields, never trimmed from a scene.
  return seed.choice;
}

function sentenceStart(value: string): string { return value.charAt(0).toUpperCase() + value.slice(1); }
function precededByDe(value: string): string { return /^(?:un|une)\b/.test(value) ? `d’${value}` : `de ${value}`; }
function precededByA(value: string): string { return value.startsWith('le ') ? `au ${value.slice(3)}` : value.startsWith('les ') ? `aux ${value.slice(4)}` : `à ${value}`; }

/** Narrative roles do not rename the roster or assert a new canonical name.
 * Keep product editions and documentary uncertainty in the identity dossier. */
const narrativeNames: Readonly<Partial<Record<PitVersusFighterId, string>>> = {
  'user-ahab': 'Ahab',
  'user-bad-blood': 'Bad Blood',
  'user-dark-horse-25th': 'le chasseur de la garde sombre',
  'user-berserker-class-phg': 'le combattant massif',
  'user-hunter-class-phg': 'le chasseur de la relève',
  'user-scout-class-phg': 'l’éclaireur de la relève',
  'user-garde-clan-kok-badlands': 'le garde du clan',
  'user-mere-dek-kwei': 'la combattante du relais',
};
function narrativeName(id: PitVersusFighterId): string { return narrativeNames[id] ?? getPitFighterProfile(id).name; }

function stage(id: PitVersusFighterId): PitArenaId {
  const candidate = getPitCharacterStageAssociation(id)?.stageId;
  return candidate && Object.hasOwn(PIT_ARENAS, candidate) ? candidate as PitArenaId : 'arena-185-training';
}
function family(seed: PitChronicleSeedV80): string {
  const id = seed.fighterId, work = getPitFighterProfile(id as PitVersusFighterId).sourceWork;
  if (id === 'user-wolf-elite-bg386') return 'Wolf BG-386 / AVPR : noms communs, individus distincts';
  if (id.includes('emissary')) return 'Emissary PHG / concepts supprimés du film : dossiers distincts';
  if (id === 'user-classic-2010' || id === 'user-avp-classic-2000' || id === 'user-captive') return 'Classic / Captive : œuvres et identités distinctes';
  if (id.includes('samurai') || id.includes('samourai') || id === 'user-oni') return 'Samurai / Oni / dessin original : aucune fusion';
  if (id === 'greyback') return 'Greyback / Golden Angel : apparences de la même case conservées, Elder AVP distinct';
  if (/Lost Tribe/.test(work)) return 'Lost Tribe : scène commune, pas biographie individuelle déduite';
  if (/Kenner/.test(work)) return 'Gamme Kenner / adaptation NECA : histoire originale, pas événement de film';
  if (/Images fournies|Galerie Warp|Pack utilisateur/.test(work)) return 'Attribution utilisateur : parenté, clan et origine non établis';
  if (/Jeux/.test(work) || /Hunting Grounds/.test(work)) return 'Profil de jeu ou classe : tenue ne démontre pas une biographie personnelle';
  return 'Œuvre indiquée au roster : adversaires et fin de cette branche non canoniques';
}

/** No fallback storyline silently fills an unreviewed new roster ID. Exhaustive
 * coverage is deliberately checked against the live roster by the tests. */
export function buildPitCharacterChronicleRoutesV80(legacy: readonly PitCharacterChronicleRouteV79[]): readonly PitCharacterChronicleRouteV79[] {
  return PIT_CHRONICLE_SEEDS_V80.map(seed => {
    if (!isPitVersusFighterId(seed.fighterId) || !isPitVersusFighterId(seed.rivalId) || seed.fighterId === seed.rivalId || !axes[seed.axis]) throw Error('Référence de chronique V80 invalide : ' + seed.fighterId);
    const fighterId = seed.fighterId, rivalId = seed.rivalId, profile = getPitFighterProfile(fighterId), rival = getPitFighterProfile(rivalId);
    const fighterName = narrativeName(fighterId), rivalName = narrativeName(rivalId);
    const old = legacy.find(route => route.fighterId === fighterId);
    const association = getPitCharacterStageAssociation(fighterId), home = stage(fighterId);
    const sources = old?.biographySources ?? (association?.sourceUrls ?? []).map(url => ({title: 'Référence du cadre · ne valide pas cette intrigue', url}));
    const biography = old?.biography ?? `Dossier de ${profile.name} : ${profile.sourceWork}. L'identité et l'apparence sont celles du profil conservé ; aucune biographie individuelle supplémentaire n'est affirmée depuis le costume ou le titre.`;
    const candidates = witnesses[seed.axis].filter(id => id !== fighterId && id !== rivalId);
    const opponents = [...candidates.slice(0, 7), rivalId];
    const encounters = opponents.map((rightId, index) => {
      const [label, goal, challenge] = axes[seed.axis][index], opponentName = narrativeName(rightId);
      const arenaId = index === 1 || index === 3 || index === 5 ? stage(rightId) : home;
      return {
        id: `pit-v80-${fighterId}-${index + 1}`, title: `${label} · ${sentenceStart(opponentName)}`,
        leftId: fighterId, rightId, arenaId, continuity: 'ritual-reconstruction' as const, mode: 'cpu' as const,
        before: index === 0 ? `${seed.premise} Face ${precededByA(opponentName)}, ${pressure[seed.axis][index]}. ${sentenceStart(fighterName)} doit ${goal} sans laisser la garde adverse lui imposer un détour.`
          : index === 7 ? `${sentenceStart(rivalName)} avance : ${pressure[seed.axis][index]}. ${sentenceStart(seed.object)} reste l'enjeu du dernier passage. Pour achever « ${seed.title} », ${fighterName} doit ${goal}.`
            : `${sentenceStart(opponentName)} ferme la prochaine voie : ${pressure[seed.axis][index]}. Après les premiers heurts, ${seed.object} reste l'enjeu de « ${seed.title} ». ${sentenceStart(fighterName)} doit ${goal}.`,
        challenge,
        after: index === 7 ? narrativeChoice(seed) : `${resolved[index]} ${sentenceStart(fighterName)} conserve le passage gagné et avance vers la prochaine garde.`,
      };
    });
    const panel = (title: string, text: string, focusId: PitVersusFighterId, camera: 'wide'|'profile'|'close'): PitCharacterChroniclePanelV79 => ({
      title, text, arenaId: home, focusId, camera, illustrationKind: 'existing-stage-and-portrait',
    });
    return {
      version: 2 as const, id: `pit-character-${fighterId}-v2`, fighterId, title: seed.title, biography, biographySources: sources,
      biographyEvidence: old ? 'primary-summary' as const : isPitOriginalFighterIdV56(fighterId) ? 'project-original' as const : 'roster-attribution' as const,
      rivalId, rivalReason: `Dans cette intrigue originale, le modèle de ${rival.name} porte l'objection finale liée à ${seed.object}. Ce lien ne prouve ni rivalité publiée, ni parenté, ni meurtre canonique.`,
      familyNote: family(seed), sourceWork: profile.sourceWork,
      continuity: `Reconstitution originale de THE PIT : « ${seed.title} ». Huit modèles de duel peuvent appartenir à des œuvres ou époques différentes. Aucune rencontre, mort, survie, extraction ou modification d'événement canonique n'est affirmée.`,
      limitation: `Introduction et fin composées avec les stages et portraits natifs déjà livrés, sans six peintures dédiées ni animation cinématique complète. Cet enjeu est décrit dans le récit : aucun nouveau prop dessiné n'est annoncé. Les poses et techniques restent celles du profil runtime ; les variantes ne gagnent pas une biographie nouvelle. ${association?.stageId ? association.reason : 'Dojo original de substitution : lieu personnel non documenté, jamais annoncé canonique.'} Sauvegarde locale séparée, aucun gain de campagne ni cloud.`,
      intro: [
        panel(seed.title, `${sentenceStart(fighterName)} rejoint le premier passage à la recherche ${precededByDe(seed.object)}. ${seed.premise}`, fighterId, 'wide'),
        panel('L’objection du rival', `${sentenceStart(rivalName)} attend au dernier passage. ${sentenceStart(pressure[seed.axis][7])}. ${sentenceStart(fighterName)} doit gagner ce passage pour décider du sort ${precededByDe(seed.object)}, sans laisser les premières gardes décider de son choix.`, rivalId, 'profile'),
        panel('Huit confrontations', `La première silhouette s'avance ; les suivantes gardent le chemin jusqu'au dernier rival. Une approche directe ne suffira pas : ${pressure[seed.axis][1]}. ${sentenceStart(fighterName)} prend son premier appui.`, fighterId, 'close'),
      ],
      encounters,
      outro: [
        panel('La décision éprouvée', narrativeChoice(seed), fighterId, 'wide'),
        panel('Le dernier face-à-face', `${sentenceStart(rivalName)} reprend son souffle au dernier appui. ${sentenceStart(fighterName)} n'ajoute pas un neuvième heurt à la confrontation. Entre eux, ${seed.object} garde maintenant la trace de ce choix.`, rivalId, 'profile'),
        panel('Après les huit gardes', `Les gardes intermédiaires se retirent. Le passage reste entier derrière ${fighterName}, qui garde en mémoire un appui choisi et tenu jusqu'au dernier heurt. Le retour se rouvre ; la confrontation n'exige plus de rester sur place.`, fighterId, 'close'),
      ],
    };
  });
}

export const PIT_CHARACTER_CHRONICLE_CONTENT_IDS_V80 = PIT_CHRONICLE_SEEDS_V80.map(seed => seed.fighterId);
export const PIT_CHARACTER_CHRONICLE_EXPECTED_IDS_V80 = PIT_VERSUS_FIGHTER_IDS;
