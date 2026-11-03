import { PIT_FIGHTERS, type PitAttackKind } from './pitCombat';
import { PIT_FIRST_EDITION_FIGHTER_IDS, PIT_CHRONICLE_BOSS_IDS } from './pitFirstEdition';
import { PIT_ORIGINAL_FIGHTER_IDS_V56 } from './pitOriginalFightersV56';
import { PIT_USER_FIGHTER_IDS, getPitFighterVariants } from './pitUserRoster';
import { PIT_EXPANSION_FIGHTER_IDS, PIT_VERSUS_FIGHTER_IDS, getPitFighterProfile, isPitVersusFighterId, type PitVersusFighterId } from './pitRosterExpansion';

/** A work, accessory or costume citation never certifies the game's move timings. */
export interface PitFidelitySourceV91 {
  readonly title: string;
  readonly url: string;
  readonly scope: 'primary-work' | 'primary-gameplay' | 'licensed-appearance';
  readonly supports: string;
  readonly doesNotEstablish: string;
}

export const PIT_FIDELITY_SOURCES_V91 = {
  'predator-1987': {
    title: '20th Century Studios · Predator (1987)', url: 'https://www.20thcenturystudios.com/movies/predator', scope: 'primary-work',
    supports: 'Œuvre et technologie de camouflage du chasseur du film.', doesNotEstablish: 'Aucun combo, contre ou chiffre de THE PIT ; aucune certification des dessins du projet.',
  },
  'jungle-neca': {
    title: 'NECA · Ultimate Jungle Hunter', url: 'https://store.necaonline.com/products/predator-ultimate-jungle-hunter-7-scale-action-figure', scope: 'licensed-appearance',
    supports: 'Présentation sous licence du Jungle Hunter avec canon à plasma et sac amovible.', doesNotEstablish: 'Une figurine et ses accessoires ne prouvent pas une technique, sa trajectoire ou sa disponibilité dans chaque costume.',
  },
  'city-neca': {
    title: 'NECA · Ultimate City Hunter', url: 'https://store.necaonline.com/blogs/news/shipping-this-week-predator-2-ultimate-city-hunter-action-figure', scope: 'licensed-appearance',
    supports: 'Présentation de City Hunter avec disque, lance extensible, lance-filet et effet de canon.', doesNotEstablish: 'Aucun frame data, combo ou comportement de filet de THE PIT.',
  },
  'avp-2004': {
    title: '20th Century Studios · Alien vs. Predator', url: 'https://www.20thcenturystudios.com/movies/alien-vs-predator', scope: 'primary-work',
    supports: 'Œuvre de 2004 et contexte de rite de passage ; pas une biographie individuelle complète.', doesNotEstablish: 'Ni les noms de coups du projet ni des capacités ajoutées aux combattants.',
  },
  'avp-neca': {
    title: 'NECA · Celtic, Scar et Chopper, Series 14', url: 'https://necaonline.com/2015/07/closer-look-predator-series-14-alien-vs-predator-action-figures/', scope: 'licensed-appearance',
    supports: 'Incarnations nommées de 2004 et accessoires propres aux figurines.', doesNotEstablish: 'Les descriptions générales des accessoires ne valident pas chaque attaque du jeu.',
  },
  'avpr-2007': {
    title: '20th Century Studios · Aliens vs. Predator: Requiem', url: 'https://www.20thcenturystudios.com/movies/aliens-vs-predator-requiem', scope: 'primary-work',
    supports: 'Œuvre AVPR de 2007, cadre terrestre et confrontation des deux créatures.', doesNotEstablish: 'Le synopsis ne détaille pas le fouet, les canons ou des attaques individuelles de Wolf.',
  },
  'prey-2022': {
    title: '20th Century Studios · Prey', url: 'https://www.20thcenturystudios.com/movies/prey', scope: 'primary-work',
    supports: 'Œuvre de 2022 ; galerie officielle avec Predator et bouclier circulaire.', doesNotEstablish: 'Les images fixes ne certifient ni la trajectoire des carreaux ni les timings de THE PIT.',
  },
  'feral-neca': {
    title: 'NECA · ULTRAmate Feral Predator', url: 'https://store.necaonline.com/collections/featured-at-comic-con/products/prey-ultramate-feral-predator-7-inch-scale-action-figure', scope: 'licensed-appearance',
    supports: 'Présentation Feral avec bolt gun, lance séparable, bouclier repliable et gantelets à lames.', doesNotEstablish: 'Ces accessoires ne suffisent pas à certifier le fonctionnement guidé, les clips ou chaque costume du jeu.',
  },
  'celtic-net-neca': {
    title: 'NECA · Rivalry Reborn, Celtic et Grid', url: 'https://store.necaonline.com/blogs/tru-exclusives/complete-details-on-neca-s-fall-2016-toys-r-us-exclusive-action-figures', scope: 'licensed-appearance',
    supports: 'Celtic endommagé, lames et filet dans la reconstitution sous licence.', doesNotEstablish: 'Le coup moyen actuel est un contact, sans filet ; la figurine ne change pas le moteur.',
  },
  'predators-2010': {
    title: '20th Century Studios · Predators', url: 'https://www.20thcenturystudios.com/movies/predators', scope: 'primary-work',
    supports: 'Œuvre de 2010 et chasse d’humains sur une planète extraterrestre.', doesNotEstablish: 'Le synopsis ne démontre pas individuellement les commandes du chien ou du drone.',
  },
  'falconer-neca': {
    title: 'NECA · Camo Cloaked Falconer, Series 7', url: 'https://store.necaonline.com/blogs/news/closer-look-predators-series-7-camo-cloaked-falconer-predator-action-figure', scope: 'licensed-appearance',
    supports: 'Falconer nommé, effet de camouflage, accessoire oiseau et lames amovibles.', doesNotEstablish: 'Ni drone offensif ni marquage empêchant le camouflage ; les effets du duel restent une adaptation.',
  },
  'phg-weapons': {
    title: 'PlayStation · Predator: Hunting Grounds, armes et technologie', url: 'https://www.playstation.com/en-gb/games/predator-hunting-grounds/', scope: 'primary-gameplay',
    supports: 'Dans PHG : camouflage, canon à plasma, lames, combistick, disque guidé et arc yautja.', doesNotEstablish: 'L’arsenal global ne prouve pas une spécialité exclusive de chaque classe, ni un arc immobilisant.',
  },
  'phg-valkyrie': {
    title: 'IllFonic / PlayStation · Valkyrie et Norse Hammer', url: 'https://blog.playstation.com/2021/02/16/new-year-new-mode-new-content-for-predator-hunting-grounds/', scope: 'primary-gameplay',
    supports: 'Valkyrie est associée au marteau nordique à deux mains, dégâts rapprochés et frappe verticale lourde.', doesNotEstablish: 'Aucune onde magique/glaciale ; chiffres et noms de THE PIT restent des adaptations.',
  },
  'phg-witch': {
    title: 'IllFonic / PlayStation Store · Witch Predator', url: 'https://store.playstation.com/en-us/product/UP3095-PPSA24179_00-PHGDLCWITCH00001', scope: 'primary-gameplay',
    supports: 'Witch est une Scout de Bretagne ancienne, avec drones jetables de reconnaissance et repérage.', doesNotEstablish: 'Ni collet lancé par arc ni blocage de saut/camouflage ; la fiche ne certifie pas ces effets.',
  },
  'phg-samurai': {
    title: 'IllFonic / PlayStation · Samurai et Predator Katana', url: 'https://blog.playstation.com/?p=332767', scope: 'primary-gameplay',
    supports: 'Samurai de PHG et accès anticipé au katana de Predator ; identité distincte d’Oni de Killer of Killers.', doesNotEstablish: 'Aucun coup individuel ou paramètre de THE PIT.',
  },
  'scarface-neca': {
    title: 'NECA · Ultimate Scarface, Concrete Jungle', url: 'https://store.necaonline.com/blogs/behind-the-scenes/closer-look-video-game-appearance-ultimate-scarface-predator', scope: 'licensed-appearance',
    supports: 'Scarface de Concrete Jungle ; figurine fournie avec Spear Gun et Maul.', doesNotEstablish: 'Une arme présentée ne prouve ni un contre exclusif ni l’usage animé d’un glaive dans THE PIT.',
  },
  'enforcer-neca': {
    title: 'NECA · Enforcer, Predator: Bad Blood', url: 'https://store.necaonline.com/blogs/behind-the-scenes/closer-look-enforcer-predator-action-figure-from-series-12', scope: 'licensed-appearance',
    supports: 'Enforcer nommé, issu de Bad Blood, avec accessoires spécifiques non détaillés dans ce texte.', doesNotEstablish: 'Pas de pouvoir du Code ni de validation du contre ou d’une nouvelle arme par le nom Enforcer.',
  },
  'elder-neca': {
    title: 'NECA · Elder: The Golden Angel', url: 'https://store.necaonline.com/blogs/toy-fair/toy-fair-2018-day-2-reveals-action-figures-from-aliens-series-13-alien-vs-predator-arcade-more', scope: 'licensed-appearance',
    supports: 'Elder de Predator 2 remet le silex ; Golden Angel est son incarnation du comic Predator: 1718.', doesNotEstablish: 'Les armes du jeune Golden Angel ne deviennent pas automatiquement des actions de Greyback démasqué.',
  },
  'theta-marvel': {
    title: 'Marvel · Predator: The Last Hunt', url: 'https://www.marvel.com/comics/collection/110461/predator_the_last_hunt_trade_paperback', scope: 'primary-work',
    supports: 'Theta chasse les Predators ; le conflit est décrit comme humain contre Super Predator.', doesNotEstablish: 'L’armure du projet et le contre à la lame ne sont pas certifiés par ce résumé ; pas de camouflage biologique.',
  },
  'machiko-darkhorse': {
    title: 'Dark Horse · Aliens vs. Predator: The Essential Comics Vol. 1', url: 'https://digital.darkhorse.com/books/9bb496a44e944fcda26662b44db247be/aliens-vs-predator-the-essential-comics-volume-1', scope: 'primary-work',
    supports: 'Trilogie de Machiko Noguchi ; histoire décrite comme couvrant la vie d’une femme.', doesNotEstablish: 'Les coups au fusil, son apparence V28 et son équipement actif ne sont pas certifiés par la fiche.',
  },
  'kok-official': {
    title: '20th Century Studios · Predator: Killer of Killers', url: 'https://www.20thcenturystudios.com/movies/predator-killer-of-killers', scope: 'primary-work',
    supports: 'Film de 2025, trois guerriers humains et contexte d’anthologie.', doesNotEstablish: 'Le synopsis ne valide pas la vague au sol du Warlord, ses noms de coups ou les apparences générées.',
  },
  'stone-heart-neca': {
    title: 'NECA · Stone Heart, Concrete Jungle', url: 'https://store.necaonline.com/products/predator-7-scale-action-figure-concrete-jungle-stone-heart-predator', scope: 'licensed-appearance',
    supports: 'Stone Heart de Concrete Jungle, transformé en cyborg par Borgia, figurine avec lames.', doesNotEstablish: 'Ni onde magique ni attaque précise de charge ; le moteur actuel emploie un contact attaché.',
  },
  'ahab-neca': {
    title: 'NECA · Ultimate Ahab', url: 'https://store.necaonline.com/blogs/news/shipping-this-week-ultimate-ahab-ultimate-dream-sequence-jason-and-chucky-thanos-groot-head-knockers-1', scope: 'licensed-appearance',
    supports: 'Ahab des comics Dark Horse ; lance, gantelet à lames et Engineer Gun comme accessoires.', doesNotEstablish: 'Pas de profil individuel actif, cadence ou tir attestés dans THE PIT ; son contre est encore partagé.',
  },
  'avp-classic-manual': {
    title: 'Rebellion · manuel Aliens versus Predator Classic 2000', url: 'https://store.steampowered.com/manual/3730', scope: 'primary-gameplay',
    supports: 'Manuel p. 9–10 : lames, lance-projectiles, canon, pistolet, disque et contraintes du camouflage dans ce jeu.', doesNotEstablish: 'Ce kit n’est pas encore porté dans THE PIT ; ces règles ne valent pas pour tous les autres films/jeux.',
  },
  'big-red-neca': {
    title: 'NECA · Big Red et Dead End', url: 'https://store.necaonline.com/blogs/news/closer-look-predators-series-7-big-red-predator-action-figure', scope: 'licensed-appearance',
    supports: 'Big Red est présenté comme issu du fan film Dead End, avec deux katanas dans la figurine.', doesNotEstablish: 'Une figurine sous licence ne transforme pas ce fan film en continuité des longs métrages.',
  },
  'viper-neca': {
    title: 'NECA · Viper, création originale', url: 'https://store.necaonline.com/blogs/news/174238279-action-figure-update-predators-series-12-line-up-is-changing', scope: 'licensed-appearance',
    supports: 'Viper est une création NECA, pilote de Blade Fighter, avec gantelets à lames aux deux avant-bras.', doesNotEstablish: 'Pas un personnage de comic/jeu attesté par cette page, ni des techniques individuelles.',
  },
} as const satisfies Readonly<Record<string, PitFidelitySourceV91>>;

export type PitFidelitySourceIdV91 = keyof typeof PIT_FIDELITY_SOURCES_V91;
export type PitFidelityIdentityV91 = 'source-character' | 'project-original' | 'supplied-unverified';
export type PitFidelitySpeciesV91 = 'human' | 'yautja' | 'non-yautja' | 'unverified';
type References = readonly PitFidelitySourceIdV91[];
interface Dossier {
  readonly identity: PitFidelityIdentityV91;
  readonly species: PitFidelitySpeciesV91;
  readonly sources: References;
  readonly note: string;
}
const SOURCE_DOSSIERS: Readonly<Partial<Record<PitVersusFighterId, Dossier>>> = {
  'jungle-hunter': { identity: 'source-character', species: 'yautja', sources: ['predator-1987', 'jungle-neca'], note: 'Plasma du kit ; duel final sans harnais régi séparément par V57. Aucun disque ou combistick ajouté au film de 1987.' },
  'city-hunter': { identity: 'source-character', species: 'yautja', sources: ['city-neca'], note: 'Filet, disque et lance ont des références d’apparence ; leurs trajets, portées et combos du duel sont adaptés.' },
  scar: { identity: 'source-character', species: 'yautja', sources: ['avp-2004', 'avp-neca'], note: 'Le coup lourd est un contact, pas une ascension à projectile plasma. Le tir est la technique séparée.' },
  celtic: { identity: 'source-character', species: 'yautja', sources: ['avp-2004', 'celtic-net-neca'], note: 'Le filet est référencé ; le coup moyen actuel n’en crée aucun. Sa technique est un heurt physique.' },
  wolf: { identity: 'source-character', species: 'yautja', sources: ['avpr-2007'], note: 'Incarnation AVPR attribuée par le projet. Le fouet est adapté en contact ; le coup lourd n’émet pas de tir. Vérification primaire détaillée des armes encore à faire.' },
  'feral-hunter': { identity: 'source-character', species: 'yautja', sources: ['prey-2022', 'feral-neca'], note: 'Incarnation Prey attribuée par le projet ; carreaux et masque disposent des règles V58/V59. Apparence des armes référencée ; mécanismes complets et fidélité de toutes les variantes restent à vérifier.' },
  berserker: { identity: 'source-character', species: 'yautja', sources: ['predators-2010'], note: 'Heurt corporel attaché ; pas d’onde sismique. Les coups au fendoir ne sont pas certifiés par le synopsis.' },
  falconer: { identity: 'source-character', species: 'yautja', sources: ['predators-2010', 'falconer-neca'], note: 'Accessoire oiseau référencé ; drone de reconnaissance sans dégâts. Le marquage et l’interdiction de camouflage sont des règles du duel.' },
  scarface: { identity: 'source-character', species: 'yautja', sources: ['scarface-neca'], note: 'Spear Gun et Maul référencés en apparence ; le contre actuel est original au jeu. Aucun kit complet de Concrete Jungle porté.' },
  valkyrie: { identity: 'source-character', species: 'yautja', sources: ['phg-valkyrie'], note: 'Marteau rapproché et frappe lourde appuyés par le développeur ; pas d’effet magique. Timings et équilibre propres au duel.' },
  witch: { identity: 'source-character', species: 'yautja', sources: ['phg-witch', 'phg-weapons'], note: 'La source propre à Witch décrit des drones de reconnaissance. L’arc existe dans PHG, mais son collet et ses blocages du duel ne sont pas attestés.' },
  enforcer: { identity: 'source-character', species: 'yautja', sources: ['enforcer-neca'], note: 'Enforcer est documenté dans Bad Blood ; riposte, état staggered et règles du Code du duel restent des adaptations.' },
  tracker: { identity: 'source-character', species: 'yautja', sources: ['predators-2010'], note: 'Le chien appelé/rappelé est une adaptation explicitée par le kit V56. Le synopsis officiel ne certifie pas ces commandes ni toutes les variantes.' },
  greyback: { identity: 'source-character', species: 'yautja', sources: ['elder-neca'], note: 'Greyback démasqué et Golden Angel jeune restent des incarnations distinctes ; silex et canon ne tirent pas dans ce kit.' },
  theta: { identity: 'source-character', species: 'human', sources: ['theta-marvel'], note: 'Humaine ; armure et contre du projet non certifiés. Le camouflage actuellement autorisé nécessite une preuve d’équipement propre à cette incarnation.' },
  'machiko-noguchi': { identity: 'source-character', species: 'human', sources: ['machiko-darkhorse'], note: 'Humaine distincte de Theta ; fusil et canon restent inactifs. Le camouflage actuellement autorisé n’est pas une aptitude biologique et sa disponibilité doit être sourcée.' },
  'kok-warlord': { identity: 'source-character', species: 'yautja', sources: ['kok-official'], note: 'La vague au sol est une création de la Chronique, non une capacité prouvée par cette référence. Boss également admis en duel libre.' },
  'stone-heart': { identity: 'source-character', species: 'yautja', sources: ['stone-heart-neca'], note: 'Cyborg Yautja ; la technique actuelle est une charge de contact, pas une onde. Boss également admis en duel libre.' },
  'original-arid-ermit-yautja': { identity: 'project-original', species: 'yautja', sources: [], note: 'Création fournie du projet ; pas un personnage officiel ni un kit canon.' },
  'original-mutated-yautja': { identity: 'project-original', species: 'yautja', sources: [], note: 'Création fournie du projet ; aucune capacité officielle déduite de sa mutation.' },
  'guest-amengi-female': { identity: 'supplied-unverified', species: 'non-yautja', sources: [], note: 'Attribution Amengi de l’utilisateur, design non certifié ; invité non-Yautja, contact original sans camouflage.' },
  'user-ahab': { identity: 'source-character', species: 'yautja', sources: ['ahab-neca'], note: 'Apparence et accessoires d’Ahab référencés ; son moveset actif reste entièrement partagé, sans technique personnelle de lance ou Engineer Gun.' },
  'user-samurai': { identity: 'source-character', species: 'yautja', sources: ['phg-samurai'], note: 'Samurai de PHG, distinct d’Oni. Le katana est référencé mais n’est pas un kit personnalisé actif dans le duel.' },
  'user-avp-classic-2000': { identity: 'source-character', species: 'yautja', sources: ['avp-classic-manual'], note: 'Manuel du jeu d’origine disponible ; son arsenal et ses règles de camouflage ne sont pas encore portés au profil partagé du duel.' },
  'user-last-hunt-super': { identity: 'source-character', species: 'yautja', sources: ['theta-marvel'], note: 'Super Predator de The Last Hunt référencé par la source ; apparence adaptée et profil de duel partagé, pas de kit individuel.' },
  'user-big-red': { identity: 'source-character', species: 'yautja', sources: ['big-red-neca'], note: 'Origine fan film Dead End, même si la figurine est sous licence ; pas une identité des films principaux. Profil partagé.' },
  'user-viper': { identity: 'source-character', species: 'yautja', sources: ['viper-neca'], note: 'Création originale NECA sous licence ; la catégorie fournie « comics et jeux » ne prouve pas une apparition. Profil partagé.' },
};

/** Presentation corrections only. Do not mutate recipes or their historical replay codecs. */
const MOVE_LABEL_CORRECTIONS: Readonly<Partial<Record<PitVersusFighterId, Partial<Record<PitAttackKind, string>>>>> = {
  scar: { heavy: 'Frappe ascendante · adaptation de contact' },
  celtic: { medium: 'Fracas rapproché · adaptation de contact' },
  wolf: { heavy: 'Interception rapprochée · adaptation de contact' },
  witch: { heavy: 'Frappe plongeante · adaptation de contact', technique: 'Collet du duel · adaptation non attestée' },
  'kok-warlord': { technique: 'Projectile de Chronique · adaptation non attestée' },
  'stone-heart': { technique: 'Charge du colosse · adaptation de contact' },
};

export interface PitFidelityEntryV91 {
  readonly fighterId: PitVersusFighterId;
  readonly name: string;
  readonly sourceWork: string;
  readonly identity: PitFidelityIdentityV91;
  readonly species: PitFidelitySpeciesV91;
  readonly sourceIds: References;
  readonly sources: readonly PitFidelitySourceV91[];
  readonly moveset: 'shared-duel-adaptation' | 'individual-duel-adaptation';
  readonly certifiedOneToOne: false;
  readonly moveLabels: Readonly<Record<PitAttackKind, string>>;
  readonly summary: string;
  readonly note: string;
  readonly variantCount: number;
  readonly cloak: 'disabled' | 'gameplay-enabled-not-certified';
}

const SHARED_FIGHTER_IDS: ReadonlySet<string> = new Set(PIT_USER_FIGHTER_IDS);

/** Complete current roster coverage is a scope statement, not source/animation certification. */
export function getPitFidelityV91(fighterId: unknown): PitFidelityEntryV91 | null {
  if (!isPitVersusFighterId(fighterId)) return null;
  const profile = getPitFighterProfile(fighterId);
  const runtime = PIT_FIGHTERS[fighterId];
  const shared = SHARED_FIGHTER_IDS.has(fighterId);
  const dossier = SOURCE_DOSSIERS[fighterId];
  const species = dossier?.species ?? 'unverified';
  const identity = dossier?.identity ?? 'supplied-unverified';
  const sourceIds = dossier?.sources ?? [];
  const note = dossier?.note ?? 'Nom et visuel fournis ; identité, incarnation et équipement individuel non vérifiés par cet audit. Aucune capacité déduite du masque, de la figurine ou de la planche.';
  const moveLabels = Object.fromEntries((['light', 'medium', 'heavy', 'technique'] as const).map(kind => [kind,
    MOVE_LABEL_CORRECTIONS[fighterId]?.[kind] ?? runtime.attacks[kind].label,
  ])) as Record<PitAttackKind, string>;
  const summary = [species === 'human' ? 'Combattante humaine' : species === 'non-yautja' ? 'Invité non-Yautja' : identity === 'project-original' ? 'Création du projet' : identity === 'supplied-unverified' ? 'Identité fournie non vérifiée' : 'Personnage référencé',
    shared ? 'profil de duel partagé' : 'kit individuel adapté', 'fidélité 1:1 non certifiée'].join(' · ');
  return {
    fighterId, name: runtime.name, sourceWork: profile.sourceWork, identity, species, sourceIds,
    sources: sourceIds.map(id => PIT_FIDELITY_SOURCES_V91[id]), moveset: shared ? 'shared-duel-adaptation' : 'individual-duel-adaptation',
    certifiedOneToOne: false, moveLabels, summary, note, variantCount: getPitFighterVariants(fighterId).length,
    cloak: runtime.canCloak === false ? 'disabled' : 'gameplay-enabled-not-certified',
  };
}

export function pitMoveLabelV91(fighterId: unknown, kind: PitAttackKind, fallback: string): string {
  return getPitFidelityV91(fighterId)?.moveLabels[kind] ?? fallback;
}

export interface PitFidelityIssueV91 {
  readonly fighterId: PitVersusFighterId;
  readonly code: 'misleading-contact-label' | 'unattested-special' | 'shared-profile' | 'human-cloak-unverified';
  readonly field: PitAttackKind | 'moveset' | 'cloak';
  readonly detail: string;
}

export function auditPitFidelityV91() {
  const entries = PIT_VERSUS_FIGHTER_IDS.map(id => getPitFidelityV91(id)!);
  const issues: PitFidelityIssueV91[] = [];
  for (const entry of entries) {
    const recipe = PIT_FIGHTERS[entry.fighterId];
    if (entry.moveset === 'shared-duel-adaptation') issues.push({ fighterId: entry.fighterId, code: 'shared-profile', field: 'moveset', detail: 'Quatre attaques et un contre partagés ; aucun kit individuel attesté.' });
    if (entry.species === 'human' && recipe.canCloak !== false) issues.push({ fighterId: entry.fighterId, code: 'human-cloak-unverified', field: 'cloak', detail: 'Camouflage autorisé par défaut dans le duel ; disponibilité de cet équipement non sourcée pour l’incarnation.' });
    for (const kind of ['light', 'medium', 'heavy'] as const) {
      if (entry.moveLabels[kind] !== recipe.attacks[kind].label) issues.push({ fighterId: entry.fighterId, code: 'misleading-contact-label', field: kind, detail: `${recipe.attacks[kind].label} → ${entry.moveLabels[kind]} : cette attaque n’émet aucun projectile.` });
    }
    if (entry.fighterId === 'witch' || entry.fighterId === 'kok-warlord') issues.push({ fighterId: entry.fighterId, code: 'unattested-special', field: 'technique', detail: entry.note });
    if (entry.fighterId === 'stone-heart') issues.push({ fighterId: entry.fighterId, code: 'misleading-contact-label', field: 'technique', detail: 'La recette est une charge attachée au corps, pas une onde indépendante.' });
  }
  return {
    version: 91 as const, reviewedAt: '2026-10-11', counts: {
      runtime: Object.keys(PIT_FIGHTERS).length, versus: entries.length,
      firstEdition: PIT_FIRST_EDITION_FIGHTER_IDS.length, expansion: PIT_EXPANSION_FIGHTER_IDS.length,
      bosses: PIT_CHRONICLE_BOSS_IDS.length, originalsAndGuests: PIT_ORIGINAL_FIGHTER_IDS_V56.length, supplied: PIT_USER_FIGHTER_IDS.length,
      sharedProfiles: entries.filter(entry => entry.moveset === 'shared-duel-adaptation').length,
      individualAdaptations: entries.filter(entry => entry.moveset === 'individual-duel-adaptation').length,
      withScopedSources: entries.filter(entry => entry.sourceIds.length > 0).length,
      sourceIdentityDossiers: entries.filter(entry => entry.identity === 'source-character').length,
      humans: entries.filter(entry => entry.species === 'human').length,
      nonYautja: entries.filter(entry => entry.species === 'non-yautja').length,
      unverifiedSpecies: entries.filter(entry => entry.species === 'unverified').length,
      oneToOneCertified: 0,
    }, entries, issues,
    limits: 'Audit des registries et du moteur actuels ; sources à portée limitée. Pas une vérification visuelle de 201 sprites, pas 201 movesets individualisés, pas une certification canon/animation 1:1. Aucun changement de combat ou de sauvegarde.',
  };
}
