import { PIT_VERSUS_FIGHTER_IDS, getPitFighterProfile, isPitVersusFighterId, type PitVersusFighterId } from './pitRosterExpansion';
import { isPitOriginalFighterIdV56 } from './pitOriginalFightersV56';
import type { PitArenaId } from './pitCombat';
import type { PitNarrativeResultInput } from './pitNarrativeTrialsV57';
import { buildPitCharacterChronicleRoutesV80 } from './pitCharacterChronicleDataV80';

/** Character stories are a separate narrative sidecar. They never write the
 * historical Arcade/Circuit archive, campaign ranks, inventory or rewards. */
export const PIT_CHARACTER_CHRONICLE_VERSION_V79 = 1 as const;
export const PIT_CHARACTER_CHRONICLE_MAX_RESULTS_V79 = 24;
export const PIT_CHARACTER_CHRONICLE_MAX_BYTES_V79 = 32 * 1024;
export const PIT_CHARACTER_CHRONICLE_CONTINUES_V79 = 2;
export const PIT_CHARACTER_CHRONICLE_CURATED_IDS_V79 = ['greyback', 'tracker', 'machiko-noguchi', 'theta'] as const;
export type PitCharacterChronicleCuratedIdV79 = PitVersusFighterId;

export interface PitCharacterChroniclePanelV79 {
  readonly title: string;
  readonly text: string;
  readonly arenaId: PitArenaId;
  readonly focusId: PitVersusFighterId;
  /** Reuses existing stage layers and a supplied portrait; not a new painting,
   * cinematic film or a fully drawn movement animation. Do not mirror the art. */
  readonly illustrationKind: 'existing-stage-and-portrait';
  readonly camera?: 'wide' | 'profile' | 'close';
  /** Optional dedicated native scene; no atlas cell, fake crop or portrait
   * overlay. Absent for V80's current stage/portrait compositions. */
  readonly fullScene?: { readonly src: string; readonly width: number; readonly height: number;
    readonly sha256: string; readonly provenance: string; readonly alt: string };
}
export interface PitCharacterChronicleEncounterV79 {
  readonly id: string;
  readonly title: string;
  readonly leftId: PitVersusFighterId;
  readonly rightId: PitVersusFighterId;
  readonly arenaId: PitArenaId;
  readonly before: string;
  readonly challenge: string;
  readonly after: string;
  readonly continuity: 'ritual-reconstruction';
  readonly mode: 'cpu';
}
export interface PitCharacterChronicleRouteV79 {
  readonly version: 1 | 2;
  readonly id: string;
  readonly fighterId: PitCharacterChronicleCuratedIdV79;
  readonly title: string;
  readonly biography: string;
  readonly biographySources: readonly { readonly title: string; readonly url: string }[];
  readonly continuity: string;
  readonly limitation: string;
  readonly intro: readonly PitCharacterChroniclePanelV79[];
  readonly encounters: readonly PitCharacterChronicleEncounterV79[];
  readonly outro: readonly PitCharacterChroniclePanelV79[];
  readonly biographyEvidence?: 'primary-summary' | 'project-original' | 'roster-attribution';
  readonly rivalId?: PitVersusFighterId;
  readonly rivalReason?: string;
  readonly familyNote?: string;
  readonly sourceWork?: string;
}

function panel(focusId: PitVersusFighterId, arenaId: PitArenaId, title: string, text: string): PitCharacterChroniclePanelV79 {
  return { focusId, arenaId, title, text, illustrationKind: 'existing-stage-and-portrait' };
}
function encounter(leftId: PitCharacterChronicleCuratedIdV79, index: number, rightId: PitVersusFighterId,
  arenaId: PitArenaId, title: string, before: string, challenge: string, after: string): PitCharacterChronicleEncounterV79 {
  return { id: `pit-character-${leftId}-${index}`, title, leftId, rightId, arenaId, before, challenge, after,
    continuity: 'ritual-reconstruction', mode: 'cpu' };
}

const trophyShip = 'arena-106-predator-2-1990-trophy-ship' as const;
const camp = 'arena-107-predators-2010-hunting-camp' as const;
const grass = 'arena-108-predators-2010-tall-grass' as const;
const wreck = 'arena-109-predators-2010-noland-wreck' as const;
const ryushi = 'arena-138-avp-ryushi-prosperity-wells' as const;
const tundra = 'arena-141-theta-tundra-outpost' as const;
const preserve = 'arena-179-last-hunt-preserve' as const;

/** Only these four routes have authored scenes. The remaining roster entries
 * are archives, never generated biographies or advertised unfinished campaigns. */
export const PIT_CHARACTER_CHRONICLE_ROUTES_V79: readonly PitCharacterChronicleRouteV79[] = [
  {
    version: 1, id: 'pit-character-greyback-v1', fighterId: 'greyback', title: 'Ce que juge un ancien',
    biography: 'L’ancien de Predator 2 remet son pistolet à silex à Harrigan en signe de respect. Cette chronique utilise son incarnation âgée, sans la remplacer par son apparence de Golden Angel.',
    biographySources: [{ title: 'NECA — Elder et le pistolet de Predator 2', url: 'https://necaonline.com/2018/02/predator-2-7-scale-action-figure-ultimate-elder-the-golden-angel/' }],
    continuity: 'Reconstitution rituelle originale de The Pit. Ces trois épreuves entre chasseurs ne sont pas des scènes du film ; aucun adversaire ne meurt dans le récit.',
    limitation: 'Silex et canon d’épaule restent inactifs dans ce profil. Les tableaux assemblent les décors et portraits existants ; aucune nouvelle remise de trophée animée n’est annoncée.',
    intro: [
      panel('greyback', trophyShip, 'Une arme, une mémoire', 'Sous les trophées du vaisseau, Greyback laisse le silence précéder son entrée. Le silex est une mémoire, pas une réponse. Trois chasseurs occupent le cercle ; il veut éprouver ce qui reste de leur jugement lorsque la force ne suffit plus.'),
      panel('greyback', trophyShip, 'Trois mesures', 'L’ancien désigne le passage qui longe les trophées. Il devra rester ouvert après chaque duel. Boar attend près de l’accès, Shaman observe depuis la pénombre et City Hunter garde le centre. Greyback entre sans réclamer leur mort.'),
    ],
    encounters: [
      encounter('greyback', 1, 'user-boar', trophyShip, 'L’espace du retrait', 'Boar occupe toute la largeur du passage. Reculer vers les trophées enfermerait l’ancien ; avancer sans mesure enfermerait son rival. Greyback cherche l’angle qui rendra l’espace à tous deux.', 'Ouvre le passage.', 'Boar cède le passage. Greyback s’arrête à sa limite et laisse à son rival le temps de reprendre ses appuis.'),
      encounter('greyback', 2, 'user-shaman', trophyShip, 'Attendre le bon geste', 'Shaman entre sans rompre le silence. Greyback ne poursuit pas la première ouverture : il attend que son adversaire s’engage vraiment, loin des trophées qui bordent le cercle.', 'Le geste vient après le regard.', 'Shaman baisse sa garde. L’ancien pourrait poursuivre ; il laisse au contraire le silence reprendre sa place entre eux.'),
      encounter('greyback', 3, 'city-hunter', trophyShip, 'Le jugement du cercle', 'City Hunter attend au centre, trop près pour céder le passage d’un simple pas. Greyback doit lui faire sentir la limite du cercle sans lui fermer le chemin du retour.', 'Le cercle n’exige pas ta mort.', 'City Hunter ne tient plus le centre. Greyback se décale vers les trophées et lui rend le passage que Boar avait d’abord fermé.'),
    ],
    outro: [
      panel('greyback', trophyShip, 'La place rendue', 'Le centre est vide. Les trois chasseurs ont rencontré la même limite, et chacun a conservé un chemin pour s’en écarter. Greyback regarde ce passage plutôt que les trophées au-dessus de lui.'),
      panel('greyback', trophyShip, 'Ce qui demeure', 'Le silex reste près de sa main. L’ancien n’a rien à ajouter au mur des prises ; il retient les instants où un adversaire pouvait encore se retirer. Le cercle se referme sur cette mesure.'),
    ],
  },
  {
    version: 1, id: 'pit-character-tracker-v1', fighterId: 'tracker', title: 'Fermer la piste',
    biography: 'Tracker est le chasseur de Predators dont l’apparence et le hound sont reproduits par la figurine officielle Hot Toys. Son chien de chasse est distinct des Yautja.',
    biographySources: [{ title: 'Sideshow / Hot Toys — Tracker et son hound', url: 'https://www.sideshow.com/collectibles/predator-tracker-hot-toys-901303' }],
    continuity: 'Simulation de chasse originale dans les décors de Predators. Les partenaires et le chasseur captif sont des figures de duel ; cette route ne raconte pas une victoire absente du film.',
    limitation: 'Le chien utilise uniquement les poses livrées et la technique existante. Ces duels ne recrutent pas de compagnon de campagne et ne proposent ni nouvelles captures ni mise à mort scénarisée.',
    intro: [
      panel('tracker', camp, 'Lire le terrain', 'Le camp offre trois départs de piste : les herbes, l’épave et le retour vers le cercle. Tracker choisit de les lire dans cet ordre. Son chien attend à ses côtés ; partir trop vite ouvrirait une sortie derrière eux.'),
      panel('tracker', grass, 'Ne pas courir aveuglément', 'La première silhouette disparaît entre les tiges. Tracker conserve le camp dans son dos et cherche l’endroit où les herbes cessent de masquer le sol. Il veut tenir une issue avant d’en chercher une autre.'),
    ],
    encounters: [
      encounter('tracker', 1, 'falconer', grass, 'L’angle découvert', 'Falconer surveille l’approche depuis une trouée. Ses changements de distance attirent Tracker hors de l’issue choisie. Le pisteur doit gagner de l’espace sans oublier pourquoi il le tient.', 'Aucune piste ne reste ouverte.', 'Falconer cède la trouée. Tracker retrouve la ligne du camp et poursuit vers l’épave, sans courir après l’espace déjà gagné.'),
      encounter('tracker', 2, 'user-classic-2010', wreck, 'Une sortie couverte', 'Classic attend près du métal déchiré. L’épave coupe la piste en deux ; contourner trop largement abandonnerait l’issue aux herbes. Tracker garde son approche courte.', 'Je tiens cette sortie.', 'Classic ne garde plus l’accès. Tracker peut lire le chemin entre l’épave et le camp sans laisser le métal lui masquer le retour.'),
      encounter('tracker', 3, 'berserker', camp, 'Revenir au camp', 'Berserker barre le retour au cercle. La dernière mesure oblige Tracker à défendre un terrain qu’il croyait connaître, après deux approches qui ont changé son rythme.', 'La piste revient ici.', 'Berserker cède le centre. Tracker s’arrête au camp : la poursuite l’a ramené à son point de départ, avec moins d’angles morts.'),
    ],
    outro: [
      panel('tracker', camp, 'L’appel de retour', 'Les herbes et l’épave ne cachent plus une sortie oubliée. Tracker regarde d’abord son chien, puis le terrain autour du cercle. La fin d’une poursuite exige encore de savoir où l’on se tient.'),
      panel('tracker', camp, 'La piste fermée', 'Le camp retrouve son silence. Trois passages ont été éprouvés, aucun n’a été laissé derrière sans regard. Tracker garde cette carte du terrain pour l’approche suivante.'),
    ],
  },
  {
    version: 1, id: 'pit-character-machiko-noguchi-v1', fighterId: 'machiko-noguchi', title: 'La place des vivants',
    biography: 'Machiko Noguchi est une coloniste humaine des comics Aliens vs. Predator. Elle gagne le respect de Broken Tusk et rejoint sa tribu ; elle n’est pas Theta, la chasseuse des comics Marvel.',
    biographySources: [
      { title: 'NECA — Machiko et Broken Tusk', url: 'https://store.necaonline.com/blogs/news/shipping-this-week-predator-series-18-aliens-ultimate-warriors-chucky-body-knocker-and-ultimate-chucky-restock-1' },
      { title: 'Dark Horse — trilogie Machiko Noguchi', url: 'https://digital.darkhorse.com/books/9bb496a44e944fcda26662b44db247be/aliens-vs-predator-the-essential-comics-volume-1' },
    ],
    continuity: 'Branche originale reconstituée à Prosperity Wells, inspirée des lieux et identités du classeur. Les trois duels, leur ordre et leur conclusion ne remplacent pas les comics.',
    limitation: 'Les tirs du fusil et du canon de Machiko ne sont pas livrés. Tichinde et Broken Tusk conservent leurs profils de duel partagés ; les colons évacués et une sortie animée restent à produire.',
    intro: [
      panel('machiko-noguchi', ryushi, 'Un lieu à protéger', 'Machiko regarde le passage entre les bâtiments de Prosperity Wells. Trop étroit pour une fuite désordonnée, trop exposé pour l’abandonner : c’est ici qu’elle veut pouvoir revenir. Vaincre devra servir ce lieu, pas l’en éloigner.'),
      panel('machiko-noguchi', ryushi, 'Apprendre sans s’effacer', 'Broken Tusk attend devant le passage. Machiko garde les appuis qu’elle connaît au lieu d’imiter sa masse. Elle accepte l’épreuve, mais décide elle-même de l’espace qu’elle défendra.'),
    ],
    encounters: [
      encounter('machiko-noguchi', 1, 'user-broken-tusk', ryushi, 'Tenir sa position', 'Broken Tusk éprouve sa garde près du passage. Chaque recul vers les bâtiments risque de l’y enfermer. Machiko doit répondre sans quitter le chemin qu’elle a choisi de tenir.', 'Je garde ce passage.', 'Broken Tusk met fin à l’épreuve. Machiko reste près du passage ; elle a trouvé une position qu’elle peut tenir avec ses propres appuis.'),
      encounter('machiko-noguchi', 2, 'user-tichinde', ryushi, 'Le passage des colons', 'Tichinde barre maintenant le chemin. Machiko voit derrière lui la même ouverture entre les bâtiments : elle veut la rendre accessible, plutôt que gagner une poursuite au-delà du village.', 'Les vivants passent d’abord.', 'Tichinde ne tient plus le passage. Machiko s’arrête à son entrée et vérifie le chemin du retour ; le lieu compte davantage que la poursuite.'),
      encounter('machiko-noguchi', 3, 'enforcer', 'the-pit', 'Mesurer le choix', 'Le Cercle donne à Enforcer le rôle du dernier témoin. L’espace est ouvert, loin des bâtiments ; Machiko doit garder la même retenue lorsque rien ne lui rappelle physiquement le passage.', 'Mon choix tient encore.', 'Le dernier témoin cède. Machiko laisse l’espace ouvert et se tourne vers Prosperity Wells : sa décision n’avait pas besoin d’un mur dans son dos.'),
    ],
    outro: [
      panel('machiko-noguchi', ryushi, 'Le chemin du retour', 'Prosperity Wells reprend toute la place dans son regard. Le passage est disponible ; il reste à y conduire ceux qui en auront besoin. Machiko choisit d’attendre ici plutôt que repartir vers le cercle.'),
      panel('machiko-noguchi', ryushi, 'Une humaine, deux mondes', 'L’épreuve lui a demandé d’apprendre auprès des chasseurs sans leur abandonner sa décision. Elle garde le passage comme elle tient sa place : assez près pour comprendre, assez libre pour choisir.'),
    ],
  },
  {
    version: 1, id: 'pit-character-theta-v1', fighterId: 'theta', title: 'Ceux que la chasse retient',
    biography: 'Theta poursuit les Predators depuis le meurtre de ses parents. Dans The Last Hunt, elle cherche aussi à libérer des humains captifs d’une réserve de chasse.',
    biographySources: [{ title: 'Marvel — Predator: The Last Hunt', url: 'https://www.marvel.com/comics/collection/110461/' }],
    continuity: 'Reconstitution originale inspirée du thème des captifs. Les trois adversaires sont des modèles Yautja existants, pas les individus de la série Marvel ; ces rencontres ne sont pas des faits canons.',
    limitation: 'Les portraits et décors existants illustrent la lecture. Les captifs, leurs animations et une extraction jouable ne sont pas livrés ; aucun adversaire n’est présenté comme le meurtrier de ses parents.',
    intro: [
      panel('theta', tundra, 'Une piste ne suffit plus', 'À l’avant-poste de toundra, Theta retrouve une route vers une réserve. Elle est venue chercher un Predator ; le tracé laisse entrevoir un autre problème, un lieu qui retient des humains. Elle suit désormais une sortie autant qu’une trace.'),
      panel('theta', preserve, 'Les noms avant la prise', 'Le Cercle lui oppose trois figures de garde. Aucun masque ne répond à la question qu’elle porte depuis l’enfance. Theta choisit de mesurer leur capacité à fermer le passage, sans y lire trop vite une réponse à sa vengeance.'),
    ],
    encounters: [
      encounter('theta', 1, 'enforcer', tundra, 'L’entrée surveillée', 'Enforcer tient l’entrée de la projection. Theta voit un passage de chaque côté, mais une seule approche permet de garder l’avant-poste dans son regard. Elle cherche cet angle avant de s’engager.', 'Je cherche un passage.', 'Enforcer ne garde plus l’accès. Theta suit le tracé vers la réserve au lieu de revenir sur le masque du vaincu.'),
      encounter('theta', 2, 'user-bad-blood', preserve, 'Refuser la confusion', 'Bad Blood tient un passage plus étroit. Sa violence invite Theta à oublier le chemin qu’elle cherchait. Elle doit traverser cet obstacle sans lui donner toute la place dans sa chasse.', 'Ta défaite ne les délivre pas seule.', 'Bad Blood cède le passage. Theta retrouve la direction de la sortie ; gagner contre lui n’a pas répondu aux autres questions.'),
      encounter('theta', 3, 'berserker', preserve, 'La sortie gardée', 'La masse de Berserker ferme la dernière approche. Theta ne cherche pas dans son masque un coupable à reconnaître. Elle veut garder assez d’espace pour voir ce qui se trouve derrière lui.', 'Je regarde au-delà de toi.', 'Le dernier garde ne tient plus la sortie. Theta cesse de le regarder et mesure le chemin qui reste à parcourir.'),
    ],
    outro: [
      panel('theta', preserve, 'Au-delà du dernier masque', 'La sortie est ouverte dans la projection. Theta peut en lire les distances, les replis et les accès. Ce travail précède encore le moment de conduire quelqu’un dehors ; elle ne prend pas le silence du lieu pour une délivrance.'),
      panel('theta', tundra, 'Deux directions', 'De retour à l’avant-poste, elle garde deux routes en tête : celle d’un Predator à retrouver et celle de personnes à ramener. La chasse continue, mais son regard ne s’arrête plus au premier masque.'),
    ],
  },
];

/** These four v1 routes and their IDs/receipts are kept byte-for-byte in their
 * original order. New runs use v2; a legacy save always resolves against v1. */
export const PIT_CHARACTER_CHRONICLE_ROUTES_V80 = buildPitCharacterChronicleRoutesV80(PIT_CHARACTER_CHRONICLE_ROUTES_V79);
export function getPitCharacterChronicleRouteV79(fighterId: unknown, contentVersion: 1 | 2 = 2): PitCharacterChronicleRouteV79 | null {
  return (contentVersion === 1 ? PIT_CHARACTER_CHRONICLE_ROUTES_V79 : PIT_CHARACTER_CHRONICLE_ROUTES_V80).find(route => route.fighterId === fighterId) ?? null;
}
export function getPitCharacterChronicleStatusV79(fighterId: unknown, contentVersion: 1 | 2 = 2) {
  if (!isPitVersusFighterId(fighterId)) return null;
  const profile = getPitFighterProfile(fighterId), route = getPitCharacterChronicleRouteV79(fighterId, contentVersion);
  return { fighterId, name: profile.name, sourceWork: profile.sourceWork,
    status: route ? 'authored-reconstruction' as const : 'archive-only' as const,
    provenance: route?.biographyEvidence ?? (route && contentVersion === 1 ? 'primary-summary' as const : isPitOriginalFighterIdV56(fighterId) ? 'project-original' as const : 'roster-attribution' as const),
    biography: route?.biography ?? profile.arcadeIntro,
    limitation: route?.limitation ?? 'Fiche issue du profil existant. Chronique illustrée non produite ; cette archive ne certifie ni biographie canonique complète ni fidélité visuelle 1:1.',
    route };
}
export const PIT_CHARACTER_CHRONICLE_ARCHIVE_IDS_V79: readonly PitVersusFighterId[] = PIT_VERSUS_FIGHTER_IDS;

export type PitCharacterChroniclePhaseV79 = 'intro' | 'pre' | 'fight' | 'post' | 'defeat' | 'outro' | 'finished' | 'failed';
export interface PitCharacterChronicleResultV79 {
  readonly resultId: string;
  readonly encounterId: string;
  readonly leftId: string;
  readonly rightId: string;
  readonly arenaId: string;
  readonly winnerId: string | null;
}
export interface PitCharacterChronicleRunV79 {
  readonly version: 1;
  readonly contentVersion: 1 | 2;
  readonly routeId: string;
  readonly fighterId: PitCharacterChronicleCuratedIdV79;
  readonly ownerSaveCreatedAt: string;
  readonly runId: string;
  readonly phase: PitCharacterChroniclePhaseV79;
  /** Number of completed encounters; post displays encounterIndex - 1. */
  readonly encounterIndex: number;
  readonly page: number;
  readonly continuesRemaining: number;
  readonly results: readonly PitCharacterChronicleResultV79[];
}
export type PitCharacterChronicleLiveResultV79 = PitNarrativeResultInput & { readonly runId: string; readonly encounterId: string };

function record(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value); return prototype === Object.prototype || prototype === null;
}
function identifier(value: unknown): value is string { return typeof value === 'string' && /^[a-zA-Z0-9_.:-]{1,96}$/.test(value); }
function owner(value: unknown): value is string { return typeof value === 'string' && value.length <= 128 && Number.isFinite(Date.parse(value)); }
function integer(value: unknown, max: number): value is number { return Number.isSafeInteger(value) && (value as number) >= 0 && (value as number) <= max; }
function copy(run: PitCharacterChronicleRunV79): PitCharacterChronicleRunV79 { return { ...run, results: run.results.map(result => ({ ...result })) }; }
function outcome(result: PitCharacterChronicleResultV79): 'victory' | 'defeat' | 'draw' {
  return result.winnerId === result.leftId ? 'victory' : result.winnerId === result.rightId ? 'defeat' : 'draw';
}

export function pitCharacterChronicleStorageKeyV79(ownerSaveCreatedAt: string, contentVersion: 1 | 2 = 1): string {
  if (!owner(ownerSaveCreatedAt)) throw Error('Propriétaire de chronique invalide.');
  return `yautja-long-hunt.the-pit-character-chronicles.v${contentVersion}.` + encodeURIComponent(ownerSaveCreatedAt);
}
export function createPitCharacterChronicleRunV79(fighterId: PitCharacterChronicleCuratedIdV79,
  ownerSaveCreatedAt: string, runId: string, contentVersion: 1 | 2 = 2): PitCharacterChronicleRunV79 {
  const route = getPitCharacterChronicleRouteV79(fighterId, contentVersion);
  if (!route || !owner(ownerSaveCreatedAt) || !identifier(runId)) throw Error('Création de chronique refusée.');
  return { version: 1, contentVersion: route.version, routeId: route.id, fighterId, ownerSaveCreatedAt, runId,
    phase: 'intro', encounterIndex: 0, page: 0, continuesRemaining: 2, results: [] };
}

/** Replay the actual ordered duel receipts. Saved counters alone cannot unlock
 * an ending; malformed, wrong-owner and future-content snapshots are rejected. */
export function normalizePitCharacterChronicleRunV79(value: unknown, expectedOwner?: string): PitCharacterChronicleRunV79 | null {
  try {
    if (!record(value) || value.version !== 1 || value.contentVersion !== 1 && value.contentVersion !== 2 || !owner(value.ownerSaveCreatedAt)
      || expectedOwner !== undefined && value.ownerSaveCreatedAt !== expectedOwner || !identifier(value.runId)) return null;
    const route = getPitCharacterChronicleRouteV79(value.fighterId, value.contentVersion);
    if (!route || value.routeId !== route.id || !Array.isArray(value.results) || value.results.length > PIT_CHARACTER_CHRONICLE_MAX_RESULTS_V79) return null;
    const results: PitCharacterChronicleResultV79[] = [], seen = new Set<string>();
    let wins = 0, defeats = 0;
    for (const candidate of value.results) {
      const current = route.encounters[wins];
      if (!current || defeats > PIT_CHARACTER_CHRONICLE_CONTINUES_V79 || !record(candidate) || !identifier(candidate.resultId)
        || seen.has(candidate.resultId) || candidate.encounterId !== current.id || candidate.leftId !== current.leftId
        || candidate.rightId !== current.rightId || candidate.arenaId !== current.arenaId
        || candidate.winnerId !== null && candidate.winnerId !== current.leftId && candidate.winnerId !== current.rightId) return null;
      const result = { resultId: candidate.resultId, encounterId: current.id, leftId: current.leftId,
        rightId: current.rightId, arenaId: current.arenaId, winnerId: candidate.winnerId as string | null };
      seen.add(result.resultId); results.push(result);
      if (outcome(result) === 'victory') wins++; else if (outcome(result) === 'defeat') defeats++;
    }
    if (value.encounterIndex !== wins || value.continuesRemaining !== Math.max(0, 2 - defeats) || !integer(value.page, 32)) return null;
    const phase = value.phase, last = results.at(-1), complete = wins === route.encounters.length;
    if (!['intro', 'pre', 'fight', 'post', 'defeat', 'outro', 'finished', 'failed'].includes(String(phase))) return null;
    if (phase === 'intro' && (results.length || value.page >= route.intro.length)) return null;
    if ((phase === 'pre' || phase === 'fight') && (complete || defeats > 2)) return null;
    if (phase === 'post' && (!last || outcome(last) !== 'victory')) return null;
    if (phase === 'defeat' && (!last || outcome(last) !== 'defeat' || defeats > 2)) return null;
    if (phase === 'failed' && defeats !== 3) return null;
    if (phase === 'outro' && (!complete || value.page >= route.outro.length)) return null;
    if (phase === 'finished' && !complete) return null;
    if (complete && !['post', 'outro', 'finished'].includes(String(phase))) return null;
    if (defeats > 2 && phase !== 'failed') return null;
    if (phase !== 'intro' && phase !== 'outro' && value.page !== 0) return null;
    return { version: 1, contentVersion: route.version, routeId: route.id, fighterId: route.fighterId,
      ownerSaveCreatedAt: value.ownerSaveCreatedAt, runId: value.runId, phase: phase as PitCharacterChroniclePhaseV79,
      encounterIndex: wins, page: value.page, continuesRemaining: Math.max(0, 2 - defeats), results };
  } catch { return null; }
}
function required(run: PitCharacterChronicleRunV79): PitCharacterChronicleRunV79 {
  const valid = normalizePitCharacterChronicleRunV79(run); if (!valid) throw Error('État de chronique invalide.'); return valid;
}
export function getPitCharacterChronicleEncounterV79(run: PitCharacterChronicleRunV79): PitCharacterChronicleEncounterV79 | null {
  const valid = normalizePitCharacterChronicleRunV79(run);
  return valid ? getPitCharacterChronicleRouteV79(valid.fighterId, valid.contentVersion)!.encounters[valid.encounterIndex] ?? null : null;
}
export function advancePitCharacterChronicleV79(value: PitCharacterChronicleRunV79): PitCharacterChronicleRunV79 {
  const run = required(value), route = getPitCharacterChronicleRouteV79(run.fighterId, run.contentVersion)!;
  if (run.phase === 'intro') return run.page + 1 < route.intro.length ? { ...run, page: run.page + 1 } : { ...run, phase: 'pre', page: 0 };
  if (run.phase === 'pre') return { ...run, phase: 'fight' };
  if (run.phase === 'post') return { ...run, phase: run.encounterIndex === route.encounters.length ? 'outro' : 'pre', page: 0 };
  if (run.phase === 'defeat') return { ...run, phase: 'pre' };
  if (run.phase === 'outro') return run.page + 1 < route.outro.length ? { ...run, page: run.page + 1 } : { ...run, phase: 'finished', page: 0 };
  return copy(run);
}

/** A reload restarts the pending duel with neutral inputs and full combat state.
 * It does not invent a live-frame resume, spend a continue or erase an outcome. */
export function checkpointPitCharacterChronicleV79(value: PitCharacterChronicleRunV79): PitCharacterChronicleRunV79 {
  const run = required(value); return run.phase === 'fight' ? { ...run, phase: 'pre', page: 0 } : copy(run);
}
export function applyPitCharacterChronicleResultV79(value: PitCharacterChronicleRunV79,
  result: PitCharacterChronicleLiveResultV79): { readonly run: PitCharacterChronicleRunV79; readonly applied: boolean } {
  const run = required(value);
  if (result.mode !== 'cpu' || result.runId !== run.runId || !identifier(result.resultId)) throw Error('Résultat de chronique étranger.');
  const previous = run.results.find(item => item.resultId === result.resultId);
  if (previous) {
    if (previous.encounterId !== result.encounterId || previous.leftId !== result.leftId || previous.rightId !== result.rightId
      || previous.arenaId !== result.arenaId || previous.winnerId !== result.winnerId) throw Error('Identifiant de résultat contradictoire.');
    return { run: copy(run), applied: false };
  }
  const current = getPitCharacterChronicleEncounterV79(run);
  if (run.phase !== 'fight' || !current || result.encounterId !== current.id || result.leftId !== current.leftId
    || result.rightId !== current.rightId || result.arenaId !== current.arenaId
    || result.winnerId !== null && result.winnerId !== current.leftId && result.winnerId !== current.rightId
    || run.results.length >= PIT_CHARACTER_CHRONICLE_MAX_RESULTS_V79) throw Error('Duel incompatible avec le chapitre.');
  const receipt: PitCharacterChronicleResultV79 = { resultId: result.resultId, encounterId: current.id,
    leftId: current.leftId, rightId: current.rightId, arenaId: current.arenaId, winnerId: result.winnerId };
  const decision = outcome(receipt), defeatCount = run.results.filter(item => outcome(item) === 'defeat').length + (decision === 'defeat' ? 1 : 0);
  const next: PitCharacterChronicleRunV79 = { ...run, results: [...run.results, receipt],
    encounterIndex: run.encounterIndex + (decision === 'victory' ? 1 : 0),
    continuesRemaining: Math.max(0, PIT_CHARACTER_CHRONICLE_CONTINUES_V79 - defeatCount),
    phase: decision === 'victory' ? 'post' : decision === 'defeat' ? defeatCount > 2 ? 'failed' : 'defeat' : 'pre', page: 0 };
  return { run: required(next), applied: true };
}
export function serializePitCharacterChronicleRunV79(value: PitCharacterChronicleRunV79): string {
  return JSON.stringify(checkpointPitCharacterChronicleV79(value));
}
export function parsePitCharacterChronicleRunV79(serialized: unknown, expectedOwner: string): PitCharacterChronicleRunV79 | null {
  if (typeof serialized !== 'string' || serialized.length > PIT_CHARACTER_CHRONICLE_MAX_BYTES_V79) return null;
  try { const run = normalizePitCharacterChronicleRunV79(JSON.parse(serialized), expectedOwner); return run ? checkpointPitCharacterChronicleV79(run) : null; } catch { return null; }
}

/** Read-only gallery rights come from the validated checkpoint journal, never
 * a menu click or a forged encounterIndex. This is local progression, not
 * server-side anti-cheat or a campaign unlock. */
export function getPitCharacterChronicleGalleryAccessV80(value: unknown): { readonly intro: boolean; readonly outro: boolean } {
  const run = normalizePitCharacterChronicleRunV79(value);
  if (!run) return { intro: false, outro: false };
  const route = getPitCharacterChronicleRouteV79(run.fighterId, run.contentVersion)!;
  return { intro: true, outro: run.encounterIndex === route.encounters.length };
}
